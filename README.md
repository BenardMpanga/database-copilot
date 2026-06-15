# Database Copilot 🚀

Welcome to **Database Copilot**! I designed and built this application as an active, intelligent assistant for SQL generation, database schema modeling, and diagnostic query rewrites. 

This is a modern, responsive, full-stack application featuring a highly polished web-based schema editor on the frontend (built with Angular and Tailwind CSS) and an intelligent query translation proxy on the backend (powered by the Gemini API).

---

## 🌟 Core Features I Built

### 1. Robust Dataset & Schema Sandbox
* **Visual Modeler:** I created a visual schema editor where users can define database tables, configure column lists (names, types), specify primary keys, and link tables together with foreign keys.
* **Instant Dialect Switching:** Users can choose their target database dialect—whether it is PostgreSQL, MySQL, SQLite, or Oracle. The Copilot automatically adapts its reasoning and syntax to the specified database environment.
* **Add & Remove Datasets:** I implemented a complete dataset management module. You can spin up fresh, custom-themed datasets (represented by neat icons) or delete them safely with built-in data retention warnings.
* **Editable Prompt Chests:** Each dataset contains its own saved library of pre-written sample requests. I built options to dynamically add and remove prompts, allowing developers to craft tailored developer playgrounds.

### 2. Dual-Engine AI Copilot (Powered by Gemini)
* **SQL Optimizer:** Input standard, conversational questions (e.g., *"Find customers who placed an order in the last 30 days but haven't paid"*), and my backend generator constructs clean, high-performance, and syntactically correct queries accompanied by step-by-step logic explanations.
* **SQL Diagnoser:** When manual SQL queries break, my system steps in. Paste the failing SQL statement alongside table column lists, and the Copilot diagnoses mismatched structures, points out syntax errors, and writes perfect, corrected SQL.

### 3. Graceful Controls & Safety Mechanisms
* **Instant Generation Cancel (Halt Button):** I integrated custom `AbortController` pipelines. If you click "Generate" but immediately change your mind, hit **Stop Generation** to instantly terminate the active API streaming and reset the interface.
* **Visual Safety Checks:** To prevent accidental data loss, I built multi-stage delete flow confirmation prompts for both complete datasets and schemas. This guarantees you will never lose hand-crafted table layouts by an accidental click.
* **API Failover Engine:** Under the hood, I designed a resilient exponential backoff retry handler that traverses through several models (`gemini-3.5-flash`, `gemini-flash-latest`, and `gemini-3.1-flash-lite`) if the primary API endpoints experience transient service spikes (like 503 Overloaded errors).

---

## 🛠️ Architecture and Stack

Here is the tech-stack I selected to build this developer tool:

* **Frontend Framework:** Angular (v21.0+, Zoneless execution for high-state performance)
* **UI Controls:** Tailwind CSS (Modern v4 layout systems with customized deep-space dark layouts)
* **Iconography:** Angular Material Icons (`@angular/material/icon`)
* **State Management:** Reactive Signals (`signal`, `computed`) for frictionless data flow and zero visual rendering delay
* **Backend Shell:** Express Server running in Node.js handles secure, server-side Gemini interactions keeping key variables safe
* **Natural Intelligence API:** Google GenAI SDK (`@google/genai`)

---

## 🚦 Getting Started Locally

Getting my app up and running is straightforward. Follow these steps:

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Your Environment Keys
Create a `.env` file at the root of the project (or copy `.env.example`) and add your Gemini API Key securely:
```env
# .env
GEMINI_API_KEY=your_gemini_api_key_goes_here
```

### 3. Run Development Server
Spin up the local Angular server and the Express backend handler concurrently:
```bash
npm run dev
```

The application will be accessible at: `http://localhost:3000`

---

## 📂 Project Structure Overview

I structured the workspace to keep a rigid, clear separation of concerns:

* `src/app/` — All of my reactive UI layouts, styles, and core Angular Signal state files.
  * `app.ts` — The controller handling the state for active datasets, custom prompts, mock table mutations, and abort controllers.
  * `app.html` — The main structural view featuring the beautiful dual-pane workspace, sidebar loaders, and safe action modal warning systems.
* `src/server.ts` — The server runtime. Houses API proxy interfaces, schema formats to query-system mappings, model retries, and high-demand failover loops.
* `public/` — Static assets and favicon configurations.

---

## 🛡️ Key Safety Implementations

### Active Cancel Pipeline
I implemented the cancel pipeline in the frontend to gracefully close requests without crashing the backend thread:

```typescript
// From my app.ts component
haltCopilot() {
  if (this.currentAbortController) {
    this.currentAbortController.abort();
    this.currentAbortController = null;
    this.isLoading.set(false);
    this.apiError.set('Request cancelled. Generation was stopped successfully.');
  }
}
```

### Server Fallback Matrix
To combat Gemini overload spikes and high demand service periods, I wrapped content requests in a retry loop:

```typescript
// From my server.ts handler
async function generateContentWithFallback(
  ai: GoogleGenAI,
  params: GenerateContentParameters,
  maxRetries = 3,
  delayMs = 1500
): Promise<GenerateContentResponse> {
  const modelsToTry = ['gemini-3.5-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
  // Loop tries, handles 503, 429, and RESOURCE_EXHAUSTED codes with exponential backoff delays.
}
```

---

*Enjoy generating and modeling robust database query pipelines with Database Copilot!* 💻✨
