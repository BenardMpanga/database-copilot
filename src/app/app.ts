import { ChangeDetectionStrategy, Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

export interface Column {
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  referenceTable?: string;
  referenceColumn?: string;
}

export interface Table {
  name: string;
  columns: Column[];
}

export interface CopilotIndex {
  name: string;
  statement: string;
  explanation: string;
}

export interface CopilotOptimisation {
  hasTableScanWarning: boolean;
  warningDetails: string;
  indexes: CopilotIndex[];
}

export interface CopilotErrorAnalysis {
  rootCause: string;
  fixedStatus: string;
}

export interface CopilotResponse {
  sql: string;
  explanation: string;
  alternatives?: string;
  optimisation: CopilotOptimisation;
  errorAnalysis?: CopilotErrorAnalysis;
  interpretedRelationships?: string[];
}

const PRESET_SCHEMAS: Record<string, Table[]> = {
  ecommerce: [
    {
      name: 'users',
      columns: [
        { name: 'id', type: 'INT', isPrimaryKey: true, isForeignKey: false },
        { name: 'email', type: 'VARCHAR(150)', isPrimaryKey: false, isForeignKey: false },
        { name: 'country', type: 'VARCHAR(60)', isPrimaryKey: false, isForeignKey: false },
        { name: 'registered_at', type: 'TIMESTAMP', isPrimaryKey: false, isForeignKey: false }
      ]
    },
    {
      name: 'products',
      columns: [
        { name: 'id', type: 'INT', isPrimaryKey: true, isForeignKey: false },
        { name: 'title', type: 'VARCHAR(200)', isPrimaryKey: false, isForeignKey: false },
        { name: 'category', type: 'VARCHAR(100)', isPrimaryKey: false, isForeignKey: false },
        { name: 'price', type: 'DECIMAL(10,2)', isPrimaryKey: false, isForeignKey: false },
        { name: 'stock', type: 'INT', isPrimaryKey: false, isForeignKey: false }
      ]
    },
    {
      name: 'orders',
      columns: [
        { name: 'id', type: 'INT', isPrimaryKey: true, isForeignKey: false },
        { name: 'user_id', type: 'INT', isPrimaryKey: false, isForeignKey: true, referenceTable: 'users', referenceColumn: 'id' },
        { name: 'total_amount', type: 'DECIMAL(10,2)', isPrimaryKey: false, isForeignKey: false },
        { name: 'status', type: 'VARCHAR(50)', isPrimaryKey: false, isForeignKey: false },
        { name: 'ordered_at', type: 'TIMESTAMP', isPrimaryKey: false, isForeignKey: false }
      ]
    },
    {
      name: 'order_items',
      columns: [
        { name: 'id', type: 'INT', isPrimaryKey: true, isForeignKey: false },
        { name: 'order_id', type: 'INT', isPrimaryKey: false, isForeignKey: true, referenceTable: 'orders', referenceColumn: 'id' },
        { name: 'product_id', type: 'INT', isPrimaryKey: false, isForeignKey: true, referenceTable: 'products', referenceColumn: 'id' },
        { name: 'quantity', type: 'INT', isPrimaryKey: false, isForeignKey: false },
        { name: 'price', type: 'DECIMAL(10,2)', isPrimaryKey: false, isForeignKey: false }
      ]
    }
  ],
  saas: [
    {
      name: 'companies',
      columns: [
        { name: 'id', type: 'INT', isPrimaryKey: true, isForeignKey: false },
        { name: 'name', type: 'VARCHAR(255)', isPrimaryKey: false, isForeignKey: false },
        { name: 'created_at', type: 'TIMESTAMP', isPrimaryKey: false, isForeignKey: false }
      ]
    },
    {
      name: 'users',
      columns: [
        { name: 'id', type: 'INT', isPrimaryKey: true, isForeignKey: false },
        { name: 'company_id', type: 'INT', isPrimaryKey: false, isForeignKey: true, referenceTable: 'companies', referenceColumn: 'id' },
        { name: 'name', type: 'VARCHAR(200)', isPrimaryKey: false, isForeignKey: false },
        { name: 'email', type: 'VARCHAR(255)', isPrimaryKey: false, isForeignKey: false },
        { name: 'role', type: 'VARCHAR(50)', isPrimaryKey: false, isForeignKey: false }
      ]
    },
    {
      name: 'subscriptions',
      columns: [
        { name: 'id', type: 'INT', isPrimaryKey: true, isForeignKey: false },
        { name: 'company_id', type: 'INT', isPrimaryKey: false, isForeignKey: true, referenceTable: 'companies', referenceColumn: 'id' },
        { name: 'plan_name', type: 'VARCHAR(100)', isPrimaryKey: false, isForeignKey: false },
        { name: 'status', type: 'VARCHAR(50)', isPrimaryKey: false, isForeignKey: false },
        { name: 'monthly_price', type: 'DECIMAL(10,2)', isPrimaryKey: false, isForeignKey: false },
        { name: 'start_date', type: 'DATE', isPrimaryKey: false, isForeignKey: false },
        { name: 'end_date', type: 'DATE', isPrimaryKey: false, isForeignKey: false }
      ]
    },
    {
      name: 'usage_logs',
      columns: [
        { name: 'id', type: 'INT', isPrimaryKey: true, isForeignKey: false },
        { name: 'user_id', type: 'INT', isPrimaryKey: false, isForeignKey: true, referenceTable: 'users', referenceColumn: 'id' },
        { name: 'feature_name', type: 'VARCHAR(100)', isPrimaryKey: false, isForeignKey: false },
        { name: 'accessed_at', type: 'TIMESTAMP', isPrimaryKey: false, isForeignKey: false },
        { name: 'duration_seconds', type: 'INT', isPrimaryKey: false, isForeignKey: false }
      ]
    }
  ],
  fitness: [
    {
      name: 'athletes',
      columns: [
        { name: 'id', type: 'INT', isPrimaryKey: true, isForeignKey: false },
        { name: 'name', type: 'VARCHAR(150)', isPrimaryKey: false, isForeignKey: false },
        { name: 'date_of_birth', type: 'DATE', isPrimaryKey: false, isForeignKey: false },
        { name: 'gender', type: 'VARCHAR(20)', isPrimaryKey: false, isForeignKey: false }
      ]
    },
    {
      name: 'activities',
      columns: [
        { name: 'id', type: 'INT', isPrimaryKey: true, isForeignKey: false },
        { name: 'athlete_id', type: 'INT', isPrimaryKey: false, isForeignKey: true, referenceTable: 'athletes', referenceColumn: 'id' },
        { name: 'type', type: 'VARCHAR(50)', isPrimaryKey: false, isForeignKey: false },
        { name: 'distance_meters', type: 'DECIMAL(12,2)', isPrimaryKey: false, isForeignKey: false },
        { name: 'duration_seconds', type: 'INT', isPrimaryKey: false, isForeignKey: false },
        { name: 'start_time', type: 'TIMESTAMP', isPrimaryKey: false, isForeignKey: false }
      ]
    },
    {
      name: 'heart_rate_logs',
      columns: [
        { name: 'id', type: 'INT', isPrimaryKey: true, isForeignKey: false },
        { name: 'activity_id', type: 'INT', isPrimaryKey: false, isForeignKey: true, referenceTable: 'activities', referenceColumn: 'id' },
        { name: 'recorded_at', type: 'TIMESTAMP', isPrimaryKey: false, isForeignKey: false },
        { name: 'heart_rate', type: 'INT', isPrimaryKey: false, isForeignKey: false }
      ]
    }
  ]
};

const PRESET_QUESTIONS: Record<string, string[]> = {
  ecommerce: [
    'Find our top 5 users based on aggregate spending in finalized orders placed since last month, including their purchase count.',
    'Calculate the average order value grouped by the users country, sorted from highest to lowest average.',
    'List products of category "Electronics" that have less than 10 stock, and aggregate how many order items they appeared in.'
  ],
  saas: [
    'Retrieve all companies on premium plans whose users have registered active features totaling more than 5,000 seconds.',
    'Calculate active user subscriptions rate grouped by plan_name showing average recurring monthly price.',
    'Show a list of roles and the total duration_seconds of usage_logs registered by each role this quarter.'
  ],
  fitness: [
    'Get peak heart rates recorded during distance activities exceeding 10,000 meters, grouped by athlete names.',
    'List all athletes who have registered running or cycling activities last month, showing sum totals of distance.',
    'Show a detailed log count of heart rates registered for activities starting before noon, sorted chronological.'
  ]
};

const PRESET_DIAGNOSTICS = [
  {
    name: 'Bad Join / Missing Column',
    dialect: 'postgresql',
    sql: 'SELECT email, order_value FROM users JOIN orders ON users.id = orders.id',
    error: 'ERROR: column "order_value" does not exist in relation "orders"'
  },
  {
    name: 'Invalid Type Comparison',
    dialect: 'mysql',
    sql: 'SELECT title FROM products WHERE price > "twenty dollars"',
    error: 'Error Code: 1292. Truncated incorrect DOUBLE value: "twenty dollars"'
  },
  {
    name: 'Implicit Comma Join Warning',
    dialect: 'standard',
    sql: 'SELECT * FROM users u, orders o WHERE u.id = o.user_id',
    error: 'Linter rule: implicit comma JOIN found. Avoid implicit JOIN syntax.'
  }
];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  // Application Modes & Tab management
  activePreset = signal<string>('ecommerce');
  currentMode = signal<'query' | 'fix'>('query');
  schemaList = signal<Table[]>(JSON.parse(JSON.stringify(PRESET_SCHEMAS['ecommerce'])));
  
  // Dialog/Adding form states
  selectedTableIndex = signal<number>(0);
  showAddTableModal = signal<boolean>(false);
  showAddColumnModal = signal<boolean>(false);
  copySuccess = signal<string | null>(null);

  // Dynamic UI variables
  isLoading = signal<boolean>(false);
  copilotResponse = signal<CopilotResponse | null>(null);
  apiError = signal<string | null>(null);

  // Reactive Forms (strictly avoiding ngModel)
  queryForm = new FormGroup({
    question: new FormControl('', [Validators.required, Validators.minLength(5)]),
    dialect: new FormControl('postgresql')
  });

  fixForm = new FormGroup({
    queryToFix: new FormControl('', [Validators.required, Validators.minLength(5)]),
    errorMsg: new FormControl('', [Validators.required, Validators.minLength(2)]),
    dialect: new FormControl('postgresql')
  });

  // Adding table & column Forms
  newTableForm = new FormGroup({
    tableName: new FormControl('', [Validators.required, Validators.pattern('^[a-zA-Z_][a-zA-Z0-9_]*$')])
  });

  newColumnForm = new FormGroup({
    colName: new FormControl('', [Validators.required, Validators.pattern('^[a-zA-Z_][a-zA-Z0-9_]*$')]),
    colType: new FormControl('INT', [Validators.required]),
    isPK: new FormControl(false),
    isFK: new FormControl(false),
    refTable: new FormControl(''),
    refColumn: new FormControl('')
  });

  // Computed presets questions
  questionsForPreset = computed(() => {
    return PRESET_QUESTIONS[this.activePreset()] || [];
  });

  // Get active selected table
  selectedTable = computed(() => {
    const list = this.schemaList();
    const idx = this.selectedTableIndex();
    if (idx >= 0 && idx < list.length) {
      return list[idx];
    }
    return null;
  });

  // Diagnostics presets helper
  diagnosticTemplates = PRESET_DIAGNOSTICS;

  constructor() {
    // Initialise question box with first preset question
    const defaultQ = PRESET_QUESTIONS['ecommerce'][0];
    this.queryForm.patchValue({ question: defaultQ });
  }

  // Handle Preset Switching
  onPresetChange(newPreset: string) {
    this.activePreset.set(newPreset);
    this.schemaList.set(JSON.parse(JSON.stringify(PRESET_SCHEMAS[newPreset])));
    this.selectedTableIndex.set(0);
    this.copilotResponse.set(null);
    this.apiError.set(null);

    // Auto-fill active preset question
    const defaultQ = PRESET_QUESTIONS[newPreset]?.[0] || '';
    this.queryForm.patchValue({ question: defaultQ });
  }

  // Tab mode toggle
  switchTab(tab: 'query' | 'fix') {
    this.currentMode.set(tab);
    this.apiError.set(null);
  }

  // Copy helpers
  copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text).then(() => {
      this.copySuccess.set(id);
      setTimeout(() => {
        if (this.copySuccess() === id) {
          this.copySuccess.set(null);
        }
      }, 2000);
    });
  }

  // Auto-set natural language question helper
  useQuestion(q: string) {
    this.queryForm.patchValue({ question: q });
  }

  // Trigger auto diagnostics configuration
  useDiagnosticTemplate(tmpl: typeof PRESET_DIAGNOSTICS[0]) {
    this.fixForm.patchValue({
      queryToFix: tmpl.sql,
      errorMsg: tmpl.error,
      dialect: tmpl.dialect
    });
  }

  // Schema Modifier: Add custom Table
  addCustomTable() {
    if (this.newTableForm.invalid) return;
    const name = this.newTableForm.value.tableName?.trim().toLowerCase();
    if (!name) return;

    // Check if table already exists
    const exists = this.schemaList().some(t => t.name === name);
    if (exists) {
      alert(`Table named "${name}" already exists.`);
      return;
    }

    const newTable: Table = {
      name,
      columns: [
        { name: 'id', type: 'INT', isPrimaryKey: true, isForeignKey: false }
      ]
    };

    const updated = [...this.schemaList(), newTable];
    this.schemaList.set(updated);
    this.selectedTableIndex.set(updated.length - 1);
    this.showAddTableModal.set(false);
    this.newTableForm.reset();
  }

  // Schema Modifier: Add custom Column
  addCustomColumn() {
    if (this.newColumnForm.invalid) return;
    const name = this.newColumnForm.value.colName?.trim().toLowerCase();
    const type = this.newColumnForm.value.colType || 'VARCHAR(255)';
    const isPK = !!this.newColumnForm.value.isPK;
    const isFK = !!this.newColumnForm.value.isFK;
    const refTable = this.newColumnForm.value.refTable || undefined;
    const refColumn = this.newColumnForm.value.refColumn || undefined;

    if (!name) return;

    const list = this.schemaList();
    const tableIdx = this.selectedTableIndex();
    if (tableIdx < 0 || tableIdx >= list.length) return;

    const targetTable = list[tableIdx];
    const existsCol = targetTable.columns.some(c => c.name === name);
    if (existsCol) {
      alert(`Column "${name}" already exists in table "${targetTable.name}".`);
      return;
    }

    const newCol: Column = {
      name,
      type,
      isPrimaryKey: isPK,
      isForeignKey: isFK,
      referenceTable: isFK ? refTable : undefined,
      referenceColumn: isFK ? refColumn : undefined
    };

    targetTable.columns.push(newCol);
    this.schemaList.set([...list]);
    this.showAddColumnModal.set(false);
    this.newColumnForm.reset({
      colName: '',
      colType: 'INT',
      isPK: false,
      isFK: false,
      refTable: '',
      refColumn: ''
    });
  }

  // Schema Modifier: Delete Column
  deleteColumn(colIndex: number) {
    const list = this.schemaList();
    const tableIdx = this.selectedTableIndex();
    if (tableIdx < 0 || tableIdx >= list.length) return;
    
    const table = list[tableIdx];
    if (table.columns.length <= 1) {
      alert('A table must retain at least one column.');
      return;
    }

    table.columns.splice(colIndex, 1);
    this.schemaList.set([...list]);
  }

  // Schema Modifier: Delete Table
  deleteTable(tableIndex: number) {
    const list = this.schemaList();
    if (list.length <= 1) {
      alert('You must have at least one table in the schema.');
      return;
    }
    
    const updated = list.filter((_, i) => i !== tableIndex);
    this.schemaList.set(updated);
    this.selectedTableIndex.set(0);
  }

  // Main Copilot action trigger
  async executeCopilot() {
    this.copilotResponse.set(null);
    this.apiError.set(null);

    const mode = this.currentMode();
    const bodyPayload: {
      schemaList: Table[];
      mode: 'query' | 'fix';
      question?: string | null;
      dialect?: string | null;
      queryToFix?: string | null;
      errorMsg?: string | null;
    } = {
      schemaList: this.schemaList(),
      mode
    };

    if (mode === 'query') {
      if (this.queryForm.invalid) {
        this.apiError.set('Please fill out the query generation box (at least 5 characters).');
        return;
      }
      bodyPayload.question = this.queryForm.value.question;
      bodyPayload.dialect = this.queryForm.value.dialect;
    } else {
      if (this.fixForm.invalid) {
        this.apiError.set('Please fill in both the failing query and its associated error message.');
        return;
      }
      bodyPayload.queryToFix = this.fixForm.value.queryToFix;
      bodyPayload.errorMsg = this.fixForm.value.errorMsg;
      bodyPayload.dialect = this.fixForm.value.dialect;
    }

    this.isLoading.set(true);

    try {
      const response = await fetch('/api/copilot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyPayload)
      });

      const data = await response.json();

      if (!response.ok) {
        const errObj = data as { error?: string };
        throw new Error(errObj.error || 'Server error occurred during prompt evaluation');
      }

      this.copilotResponse.set(data as CopilotResponse);

    } catch (err: unknown) {
      const errorObj = err as Error;
      console.error('Remote copilot failed:', errorObj);
      this.apiError.set(errorObj.message || 'Connecting to Gemini Copilot service failed. Please check your network and API credentials.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
