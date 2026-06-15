import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import {join} from 'node:path';
import { GoogleGenAI, Type, GenerateContentParameters, GenerateContentResponse } from "@google/genai";

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
app.use(express.json()); // Essential body-parser for incoming POST JSON payload

const angularApp = new AngularNodeAppEngine();

// Lazy-initialized Gemini Client conforming to official framework requirements
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env['GEMINI_API_KEY'];
    if (!key) {
      throw new Error('GEMINI_API_KEY environment variable is required. Please add it via Settings > Secrets panel.');
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

interface CopilotTableColumn {
  name: string;
  type: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  referenceTable?: string;
  referenceColumn?: string;
}

interface CopilotTable {
  name: string;
  columns?: CopilotTableColumn[];
}

/**
 * Resilient helper function to execute generateContent with automatic exponential backoff retries 
 * and fallback models in the event of Google API 503/429 transient service loads.
 */
async function generateContentWithFallback(
  ai: GoogleGenAI,
  params: GenerateContentParameters,
  maxRetries = 3,
  delayMs = 1500
): Promise<GenerateContentResponse> {
  const modelsToTry = [
    'gemini-3.5-flash',
    'gemini-flash-latest',
    'gemini-3.1-flash-lite'
  ];

  let lastError: Error | null = null;

  for (const model of modelsToTry) {
    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        console.log(`[DatabaseCopilot-API] Requesting GenAI with model: ${model} (attempt ${attempt + 1}/${maxRetries})`);
        
        // Always override the target model to the current candidate
        params.model = model;
        
        const response = await ai.models.generateContent(params);
        console.log(`[DatabaseCopilot-API] Success with model: ${model}`);
        return response;
      } catch (error: unknown) {
        attempt++;
        const castError = error as Error;
        lastError = castError;
        
        const errMessage = castError?.message || '';
        const errStatus = (castError as { status?: number; statusCode?: number })?.status || 
                          (castError as { status?: number; statusCode?: number })?.statusCode || 0;
        
        // Identify classic transient clusters: 503 (unavailable), 429 (rate limits), 500 (internal retryable), or high demand message cues
        const isTransient = 
          errStatus === 503 || 
          errStatus === 429 || 
          errStatus === 500 ||
          errMessage.includes('503') || 
          errMessage.includes('500') ||
          errMessage.includes('429') ||
          errMessage.includes('UNAVAILABLE') ||
          errMessage.includes('temporary') ||
          errMessage.includes('high demand') ||
          errMessage.includes('overloaded') ||
          errMessage.includes('RESOURCE_EXHAUSTED');

        if (isTransient && attempt < maxRetries) {
          const waitTime = delayMs * Math.pow(2, attempt - 1);
          console.warn(`[DatabaseCopilot-API] Transient error on '${model}' (${errMessage}). Retrying in ${waitTime}ms...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }

        // For non-transient, or if retry budget is exhausted, move to the next model in sequence
        console.error(`[DatabaseCopilot-API] Model '${model}' failed/exhausted. Error:`, errMessage);
        break;
      }
    }
  }

  // If both retry budgets and fallback list are fully exhausted, gracefully bubble up a clear humanized message
  const details = lastError?.message || 'High spikes in demand';
  throw new Error(
    `DatabaseCopilot is currently experiencing extremely high demand on all backend channels. ` +
    `Gemini has returned a temporary unavailable status (503). Reference details: ${details}`
  );
}

// DatabaseCopilot Core API endpoint
app.post('/api/copilot', async (req, res): Promise<void> => {
  try {
    const { schemaList, question, dialect = 'standard', mode = 'query', queryToFix = '', errorMsg = '' } = req.body;

    if (!schemaList || !Array.isArray(schemaList)) {
      res.status(400).json({ error: 'Database schema must be supplied as schemaList array.' });
      return;
    }

    const castedSchema = schemaList as CopilotTable[];

    // Format schema into clear human-readable structure for LLM grounding
    const formattedSchema = castedSchema.map((table: CopilotTable) => {
      const colDetails = (table.columns || []).map((col: CopilotTableColumn) => {
        let text = `${col.name} ${col.type}`;
        if (col.isPrimaryKey) text += ' (Primary Key)';
        if (col.isForeignKey) text += ` (Foreign Key referencing ${col.referenceTable}.${col.referenceColumn})`;
        return `    - ${text}`;
      }).join('\n');
      return `Table: "${table.name}"\n  Columns:\n${colDetails}`;
    }).join('\n\n');

    let promptContext = `System Ground Truth Schema:\n${formattedSchema}\n\n`;

    if (mode === 'fix') {
      promptContext += `User has submitted a failing SQL query expecting explanation and a clear fix:
- Failing Query: ${queryToFix}
- Error Message: ${errorMsg}
- Target Dialect: ${dialect}

Please locate the error (mismatching columns, syntax, or bad join) with respect to the standard grammar or dialect specification, state the root cause clearly, and output the correct rewrite.`;
    } else {
      promptContext += `User requests SQL generation:
- Natural Language Question: "${question}"
- Target Dialect: ${dialect}

Please translate this query accurately to ${dialect}. Follow expert sql optimization patterns (avoid select *, use CTEs for multi-step logic, use explicit joins). Verify you do not reference columns or tables outside of the Ground Truth Schema!`;
    }

    const ai = getGeminiClient();

    const response = await generateContentWithFallback(ai, {
      model: 'gemini-3.5-flash',
      contents: promptContext,
      config: {
        systemInstruction: `You are DatabaseCopilot, an expert SQL assistant with deep knowledge of relational database design, query optimization, and database internals across PostgreSQL, MySQL, SQLite, and SQL Server.
Respond strictly in JSON format conforming to the requested response schema. Always explain exact non-obvious choices and suggest optimal index creation statements. Do not make up tables/columns that are not defined in the schema template.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sql: {
              type: Type.STRING,
              description: "The complete, valid, beautifully formatted, executable SQL statement for the target dialect."
            },
            explanation: {
              type: Type.STRING,
              description: "A highly concise, clear, clause-by-clause explanation of the query structure, join selections, and filters."
            },
            alternatives: {
              type: Type.STRING,
              description: "Brief note of alternative approaches/trade-offs or empty string."
            },
            optimisation: {
              type: Type.OBJECT,
              properties: {
                hasTableScanWarning: {
                  type: Type.BOOLEAN,
                  description: "True if a large dataset would require a full table scan or expensive scan."
                },
                warningDetails: {
                  type: Type.STRING,
                  description: "Details describing potential table scan issues, redundant joins, distinct keyword overhead, or other bottlenecks."
                },
                indexes: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      statement: { type: Type.STRING, description: "Full executable CREATE INDEX syntax." },
                      explanation: { type: Type.STRING, description: "Why this helps performance." }
                    },
                    required: ["name", "statement", "explanation"]
                  }
                }
              },
              required: ["hasTableScanWarning", "warningDetails", "indexes"]
            },
            errorAnalysis: {
              type: Type.OBJECT,
              properties: {
                rootCause: { type: Type.STRING, description: "A detailed description of the error (schema mismatch, syntax, logic) found in the user query" },
                fixedStatus: { type: Type.STRING, description: "Clarifies how the issue was fixed." }
              }
            },
            interpretedRelationships: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "A list of inferred or explicit foreign/primary relationships in the schema, e.g., 'orders.user_id references users.id'"
            }
          },
          required: ["sql", "explanation", "optimisation", "interpretedRelationships"]
        }
      }
    });

    const parsedData = JSON.parse(response.text || '{}');
    res.json(parsedData);
    return;

  } catch (error: unknown) {
    const err = error as Error;
    console.error('DatabaseCopilot API error:', err);
    res.status(500).json({
      error: err.message || 'An unexpected error occurred during processing',
      details: err.message?.includes('GEMINI_API_KEY') 
        ? 'Please define your GEMINI_API_KEY securely in the Secrets settings (Settings > Secrets).'
        : undefined
    });
    return;
  }
});


/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
