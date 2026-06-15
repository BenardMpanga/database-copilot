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

export interface Dataset {
  id: string;
  label: string;
  icon: string;
  tables: Table[];
  questions: string[];
  isCustom?: boolean;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  // Load from localStorage or use defaults
  private getInitialDatasets(): Dataset[] {
    try {
      const saved = localStorage.getItem('db_copilot_datasets');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load datasets from localStorage', e);
    }

    return [
      {
        id: 'ecommerce',
        label: 'E-Shop',
        icon: 'shopping_cart',
        tables: JSON.parse(JSON.stringify(PRESET_SCHEMAS['ecommerce'])),
        questions: [...PRESET_QUESTIONS['ecommerce']]
      },
      {
        id: 'saas',
        label: 'SaaS app',
        icon: 'business',
        tables: JSON.parse(JSON.stringify(PRESET_SCHEMAS['saas'])),
        questions: [...PRESET_QUESTIONS['saas']]
      },
      {
        id: 'fitness',
        label: 'Fitness',
        icon: 'favorite',
        tables: JSON.parse(JSON.stringify(PRESET_SCHEMAS['fitness'])),
        questions: [...PRESET_QUESTIONS['fitness']]
      }
    ];
  }

  // Application Modes & Tab management
  datasets = signal<Dataset[]>(this.getInitialDatasets());
  activePreset = signal<string>(this.getInitialDatasets()[0].id);
  currentMode = signal<'query' | 'fix'>('query');
  schemaList = signal<Table[]>(JSON.parse(JSON.stringify(this.getInitialDatasets()[0].tables)));
  
  // Abort controller for cancellation
  private currentAbortController: AbortController | null = null;
  
  // Dialog/Adding form states
  selectedTableIndex = signal<number>(0);
  showAddTableModal = signal<boolean>(false);
  showAddColumnModal = signal<boolean>(false);
  showAddDatasetModal = signal<boolean>(false);
  showAddQuestionInput = signal<boolean>(false);
  datasetPendingDelete = signal<Dataset | null>(null);
  datasetRemoveWarning = signal<string | null>(null);
  tablePendingDelete = signal<number | null>(null);
  tableRemoveWarning = signal<string | null>(null);
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

  // Adding table, column & dataset Forms
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

  newDatasetForm = new FormGroup({
    datasetName: new FormControl('', [Validators.required, Validators.minLength(3), Validators.pattern('^[a-zA-Z0-9 _-]+$')]),
    datasetIcon: new FormControl('database', [Validators.required])
  });

  newQuestionForm = new FormGroup({
    questionText: new FormControl('', [Validators.required, Validators.minLength(5)])
  });

  // Computed presets questions
  questionsForPreset = computed(() => {
    const ds = this.datasets().find(d => d.id === this.activePreset());
    return ds?.questions || [];
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
    // Initialise question box with first active preset question
    const activeId = this.activePreset();
    const ds = this.datasets().find(d => d.id === activeId);
    const defaultQ = ds?.questions?.[0] || '';
    this.queryForm.patchValue({ question: defaultQ });
  }

  // Persists the current state of datasets to localStorage
  saveDatasetsToStorage(list: Dataset[]) {
    try {
      localStorage.setItem('db_copilot_datasets', JSON.stringify(list));
    } catch (e) {
      console.error('Failed to save datasets to localStorage', e);
    }
  }

  // Update the tables list of the currently active dataset
  updateActiveDatasetTables(tables: Table[]) {
    this.schemaList.set(tables);
    const activeId = this.activePreset();
    const updatedDatasets = this.datasets().map(ds => {
      if (ds.id === activeId) {
        return { ...ds, tables: JSON.parse(JSON.stringify(tables)) };
      }
      return ds;
    });
    this.datasets.set(updatedDatasets);
    this.saveDatasetsToStorage(updatedDatasets);
  }

  // Add a fully custom user-defined dataset
  addCustomDataset() {
    if (this.newDatasetForm.invalid) return;
    const name = this.newDatasetForm.value.datasetName?.trim();
    const icon = this.newDatasetForm.value.datasetIcon || 'database';
    if (!name) return;

    // Unique dataset id
    const id = 'custom_' + Date.now();
    
    // Initialise dataset with dummy users table so it starts with solid queryable content
    const newDataset: Dataset = {
      id,
      label: name,
      icon,
      isCustom: true,
      tables: [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'INT', isPrimaryKey: true, isForeignKey: false },
            { name: 'username', type: 'VARCHAR(100)', isPrimaryKey: false, isForeignKey: false },
            { name: 'created_at', type: 'TIMESTAMP', isPrimaryKey: false, isForeignKey: false }
          ]
        }
      ],
      questions: [
        `Select all columns from users table where username is not empty.`,
        `Retrieve list of total users count.`
      ]
    };

    const updated = [...this.datasets(), newDataset];
    this.datasets.set(updated);
    this.saveDatasetsToStorage(updated);
    
    // Switch to newly created dataset
    this.onPresetChange(id);
    
    this.showAddDatasetModal.set(false);
    this.newDatasetForm.reset({
      datasetName: '',
      datasetIcon: 'database'
    });
  }

  // Remove a dataset (either custom, or standard if other ones exist)
  removeDataset(id: string, event?: Event) {
    if (event) {
      event.stopPropagation();
    }

    const list = this.datasets();
    if (list.length <= 1) {
      this.datasetRemoveWarning.set('You must have at least one active dataset to keep using the Database Copilot.');
      return;
    }

    const targetDataset = list.find(d => d.id === id);
    if (targetDataset) {
      this.datasetPendingDelete.set(targetDataset);
      this.datasetRemoveWarning.set(null);
    }
  }

  // Handle actual confirm delete database action
  confirmRemoveDataset() {
    const target = this.datasetPendingDelete();
    if (!target) return;

    const list = this.datasets();
    if (list.length <= 1) {
      this.datasetRemoveWarning.set('You must have at least one active dataset.');
      this.datasetPendingDelete.set(null);
      return;
    }

    const updated = list.filter(d => d.id !== target.id);
    this.datasets.set(updated);
    this.saveDatasetsToStorage(updated);

    // If active preset has been deleted, switch to the first remaining one
    if (this.activePreset() === target.id) {
      this.onPresetChange(updated[0].id);
    }

    this.datasetPendingDelete.set(null);
    this.datasetRemoveWarning.set(null);
  }

  // Handle cancel database delete action
  cancelRemoveDataset() {
    this.datasetPendingDelete.set(null);
    this.datasetRemoveWarning.set(null);
  }

  // Add custom template question inside the actively selected dataset
  addCustomQuestion() {
    if (this.newQuestionForm.invalid) return;
    const qText = this.newQuestionForm.value.questionText?.trim();
    if (!qText) return;

    const activeId = this.activePreset();
    const updated = this.datasets().map(ds => {
      if (ds.id === activeId) {
        return {
          ...ds,
          questions: [...ds.questions, qText]
        };
      }
      return ds;
    });

    this.datasets.set(updated);
    this.saveDatasetsToStorage(updated);
    this.showAddQuestionInput.set(false);
    this.newQuestionForm.reset();
  }

  // Delete matching sample prompt in active preset
  deleteQuestion(qIdx: number, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    
    const activeId = this.activePreset();
    const updated = this.datasets().map(ds => {
      if (ds.id === activeId) {
        const questionsCopy = [...ds.questions];
        questionsCopy.splice(qIdx, 1);
        return {
          ...ds,
          questions: questionsCopy
        };
      }
      return ds;
    });

    this.datasets.set(updated);
    this.saveDatasetsToStorage(updated);
  }

  // Handle Preset Switching
  onPresetChange(newPreset: string) {
    this.activePreset.set(newPreset);
    const ds = this.datasets().find(d => d.id === newPreset);
    if (ds) {
      this.schemaList.set(JSON.parse(JSON.stringify(ds.tables)));
    }
    this.selectedTableIndex.set(0);
    this.copilotResponse.set(null);
    this.apiError.set(null);

    // Auto-fill active preset question
    const defaultQ = ds?.questions?.[0] || '';
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
    this.updateActiveDatasetTables(updated);
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
    this.updateActiveDatasetTables([...list]);
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
    this.updateActiveDatasetTables([...list]);
  }

  // Schema Modifier: Initiate Delete Table
  initiateDeleteTable(tableIndex: number) {
    this.tablePendingDelete.set(null);
    this.tableRemoveWarning.set(null);

    const list = this.schemaList();
    if (list.length <= 1) {
      this.tableRemoveWarning.set('You must retain at least one table in your schema.');
      return;
    }

    this.tablePendingDelete.set(tableIndex);
  }

  confirmDeleteTable() {
    const idx = this.tablePendingDelete();
    if (idx === null) return;

    const list = this.schemaList();
    if (list.length <= 1) {
      this.tableRemoveWarning.set('You must retain at least one table in your schema.');
      this.tablePendingDelete.set(null);
      return;
    }

    const updated = list.filter((_, i) => i !== idx);
    this.updateActiveDatasetTables(updated);
    this.selectedTableIndex.set(0);

    this.tablePendingDelete.set(null);
    this.tableRemoveWarning.set(null);
  }

  cancelDeleteTable() {
    this.tablePendingDelete.set(null);
    this.tableRemoveWarning.set(null);
  }

  // Main Copilot action trigger
  async executeCopilot() {
    if (this.isLoading()) return;
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

    // Cancel any ongoing compilation request
    if (this.currentAbortController) {
      this.currentAbortController.abort();
    }
    this.currentAbortController = new AbortController();

    try {
      const response = await fetch('/api/copilot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyPayload),
        signal: this.currentAbortController.signal
      });

      const data = await response.json();

      if (!response.ok) {
        const errObj = data as { error?: string };
        throw new Error(errObj.error || 'Server error occurred during prompt evaluation');
      }

      this.copilotResponse.set(data as CopilotResponse);

    } catch (err: unknown) {
      const errorObj = err as Error;
      if (errorObj.name === 'AbortError') {
        console.log('Remote copilot execution cancelled by user.');
        this.apiError.set('Request cancelled. Generation was stopped successfully.');
        return;
      }
      console.error('Remote copilot failed:', errorObj);
      this.apiError.set(errorObj.message || 'Connecting to Gemini Copilot service failed. Please check your network and API credentials.');
    } finally {
      this.isLoading.set(false);
      this.currentAbortController = null;
    }
  }

  // Method to stop ongoing request when user changes their mind
  haltCopilot() {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
      this.isLoading.set(false);
      this.apiError.set('Request cancelled. Generation was stopped successfully.');
    }
  }
}
