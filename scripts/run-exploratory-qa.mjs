import { chromium } from 'playwright';
import { createServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const evidenceDir = path.resolve(rootDir, 'qa-evidence');

if (!fs.existsSync(evidenceDir)) {
  fs.mkdirSync(evidenceDir, { recursive: true });
}

async function runQA() {
  console.log('🛡️  [QA AGENT] Initializing End-to-End Autonomous QA Suite...');
  const port = 5195;
  const server = await createServer({
    root: rootDir,
    server: { port },
  });
  await server.listen();
  const serverUrl = `http://localhost:${port}`;
  console.log(`🌐 [QA AGENT] Vite Test Environment running at ${serverUrl}`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  const consoleLogs = [];
  const consoleErrors = [];
  page.on('console', (msg) => {
    const text = msg.text();
    consoleLogs.push({ type: msg.type(), text });
    if (msg.type() === 'error') {
      consoleErrors.push(text);
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(`[PAGE ERROR] ${err.message}\n${err.stack}`);
  });

  // Mock comprehensive test data (Pure Dummy / Isolated Test Environment)
  const mockConnStaging = {
    id: 'conn-qa-staging',
    name: 'QA Staging Cluster (Isolated)',
    host: '127.0.0.1',
    port: 3306,
    database: 'qa_sandbox_db',
    username: 'qa_tester',
    password: 'enc:v1:dummyEncryptedPassword123456789==',
    dbType: 'mysql',
    ssl: true,
    readOnly: true,
    sshTunnel: false,
    color: '#E11D48',
    environment: 'staging',
    createdAt: new Date().toISOString(),
  };

  const mockConnDev = {
    id: 'conn-qa-dev',
    name: 'Dev Local DB (Read/Write)',
    host: '127.0.0.1',
    port: 3306,
    database: 'dev_mock_store',
    username: 'dev_admin',
    password: '',
    dbType: 'mysql',
    ssl: false,
    readOnly: false,
    sshTunnel: false,
    color: '#10B981',
    environment: 'local',
    createdAt: new Date().toISOString(),
  };

  const mockTables = [
    { name: 'customers', type: 'table', rowCount: 15420 },
    { name: 'orders', type: 'table', rowCount: 98400 },
    { name: 'order_items', type: 'table', rowCount: 312000 },
    { name: 'inventory_lots', type: 'table', rowCount: 840 },
    { name: 'audit_logs', type: 'table', rowCount: 520000 },
    { name: 'security_events', type: 'table', rowCount: 2100 },
    { name: 'v_daily_sales', type: 'view', rowCount: 365 },
  ];

  // 100 realistic dummy rows with various edge-case types
  const dummyRows = [];
  for (let i = 1; i <= 60; i++) {
    dummyRows.push({
      id: i,
      order_number: `ORD-2026-${String(i).padStart(5, '0')}`,
      customer_id: (i % 20) + 1,
      status: i % 4 === 0 ? 'cancelled' : i % 3 === 0 ? 'shipped' : 'delivered',
      total_amount: (i * 19.99 + 4.5).toFixed(2),
      notes: i === 1 ? 'Test with <script>alert("xss")</script> & unicode 🚀' : i % 5 === 0 ? null : `Customer note #${i}`,
      raw_payload: JSON.stringify({
        source: 'web_checkout',
        items_count: (i % 3) + 1,
        flags: { expedited: i % 2 === 0, fraud_score: (i * 0.012).toFixed(3) },
        ip: `192.168.1.${10 + i}`,
      }),
      created_at: `2026-11-0${(i % 9) + 1} 14:22:00`,
    });
  }

  const dummyColumns = [
    { name: 'id', type: 'int', key: 'id' },
    { name: 'order_number', type: 'varchar', key: 'order_number' },
    { name: 'customer_id', type: 'int', key: 'customer_id' },
    { name: 'status', type: 'varchar', key: 'status' },
    { name: 'total_amount', type: 'decimal', key: 'total_amount' },
    { name: 'notes', type: 'text', key: 'notes' },
    { name: 'raw_payload', type: 'json', key: 'raw_payload' },
    { name: 'created_at', type: 'datetime', key: 'created_at' },
  ];

  await page.addInitScript(({ mockConnStaging, mockConnDev, mockTables, dummyRows, dummyColumns }) => {
    window.__TAURI_INTERNALS__ = {
      invoke: async (cmd, args) => {
        // Mock DB connection & schemas
        if (cmd === 'fetch_databases') {
          return ['qa_sandbox_db', 'dev_mock_store', 'analytics_lake', 'auth_service'];
        }
        if (cmd === 'fetch_tables' || cmd === 'fetch_schema_tables') {
          return mockTables.map(t => t.name);
        }
        if (cmd === 'fetch_schema') {
          return {
            database: 'qa_sandbox_db',
            tables: mockTables,
          };
        }
        if (cmd === 'load_connections' || cmd === 'plugin:store|load') {
          return [mockConnStaging, mockConnDev];
        }
        if (cmd === 'test_connection') {
          return 42; // ping ms
        }
        if (cmd === 'connect') {
          return { success: true };
        }
        if (cmd === 'fetch_table_details') {
          return {
            columns: [
              { name: 'id', column_type: 'int unsigned', nullable: false, default: null, pk: true, extra: 'auto_increment' },
              { name: 'order_number', column_type: 'varchar(64)', nullable: false, default: null, pk: false, extra: '' },
              { name: 'customer_id', column_type: 'int unsigned', nullable: false, default: null, pk: false, extra: '' },
              { name: 'status', column_type: 'varchar(32)', nullable: false, default: "'pending'", pk: false, extra: '' },
              { name: 'total_amount', column_type: 'decimal(10,2)', nullable: false, default: "'0.00'", pk: false, extra: '' },
              { name: 'notes', column_type: 'text', nullable: true, default: null, pk: false, extra: '' },
              { name: 'raw_payload', column_type: 'json', nullable: true, default: null, pk: false, extra: '' },
              { name: 'created_at', column_type: 'datetime', nullable: false, default: 'CURRENT_TIMESTAMP', pk: false, extra: '' },
            ],
            indexes: [
              { name: 'PRIMARY', columns: 'id', unique: true },
              { name: 'idx_order_number', columns: 'order_number', unique: true },
              { name: 'idx_customer_id', columns: 'customer_id', unique: false },
            ],
            constraints: [
              { name: 'fk_orders_customer', type: 'FOREIGN KEY', definition: 'FOREIGN KEY (customer_id) REFERENCES customers(id)' }
            ],
            ddl: `CREATE TABLE \`orders\` (
  \`id\` int unsigned NOT NULL AUTO_INCREMENT,
  \`order_number\` varchar(64) NOT NULL,
  \`customer_id\` int unsigned NOT NULL,
  \`status\` varchar(32) NOT NULL DEFAULT 'pending',
  \`total_amount\` decimal(10,2) NOT NULL DEFAULT '0.00',
  \`notes\` text,
  \`raw_payload\` json,
  \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`idx_order_number\` (\`order_number\`),
  KEY \`idx_customer_id\` (\`customer_id\`),
  CONSTRAINT \`fk_orders_customer\` FOREIGN KEY (\`customer_id\`) REFERENCES \`customers\` (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
          };
        }
        if (cmd === 'fetch_all_foreign_keys' || cmd === 'fetch_table_foreign_keys') {
          return [
            {
              tableSchema: 'qa_sandbox_db',
              tableName: 'orders',
              columnName: 'customer_id',
              referencedTableSchema: 'qa_sandbox_db',
              referencedTable: 'customers',
              referencedColumn: 'id',
            },
            {
              tableSchema: 'qa_sandbox_db',
              tableName: 'order_items',
              columnName: 'order_id',
              referencedTableSchema: 'qa_sandbox_db',
              referencedTable: 'orders',
              referencedColumn: 'id',
            }
          ];
        }
        if (cmd === 'run_query' || cmd === 'run_query_paged') {
          return {
            columns: dummyColumns,
            rows: dummyRows,
            totalRows: dummyRows.length,
            durationMs: 18,
            hasMore: false,
            offset: 0,
            limit: 50,
          };
        }
        if (cmd === 'run_write_query' || cmd === 'batch_update_rows' || cmd === 'update_rows') {
          return {
            affected_rows: 1,
            duration_ms: 12,
            warning: null,
          };
        }
        if (cmd === 'get_queries_dir') {
          return '/tmp/select-qa-queries';
        }
        if (cmd === 'get_custom_queries_dir') {
          return '/tmp/select-qa-queries';
        }
        if (cmd === 'load_queries') {
          return [
            { id: 'q-1', name: 'Active Orders Today', sql: 'SELECT * FROM orders WHERE status = "pending" LIMIT 50;', folder: null },
            { id: 'q-2', name: 'High Value Customers', sql: 'SELECT customer_id, SUM(total_amount) as total FROM orders GROUP BY customer_id ORDER BY total DESC;', folder: 'Analytics' },
          ];
        }
        if (cmd === 'load_query_folders') {
          return ['Analytics', 'Maintenance', 'Billing'];
        }
        if (cmd === 'get_history') {
          return [
            { id: 'h-1', sql: 'SELECT * FROM orders LIMIT 50;', executed_at: new Date().toISOString(), duration_ms: 18, row_count: 50, error: null },
            { id: 'h-2', sql: 'UPDATE orders SET status = "shipped" WHERE id = 42;', executed_at: new Date().toISOString(), duration_ms: 12, row_count: 1, error: null }
          ];
        }
        if (cmd === 'unseal_connections_from_storage') {
          return {
            connections: [mockConnStaging, mockConnDev],
            failedConnectionNames: []
          };
        }
        if (cmd === 'seal_connections_for_storage') {
          return args.connections;
        }
        return null;
      }
    };

    localStorage.setItem('select_connections', JSON.stringify([mockConnStaging, mockConnDev]));
    localStorage.setItem('select_active_connection_id', 'conn-qa-staging');
    localStorage.setItem('select_theme', 'dark');
    localStorage.setItem('select_last_seen_version', '0.2.8');
    localStorage.setItem('select_dismissed_update_version', '0.2.8');
  }, { mockConnStaging, mockConnDev, mockTables, dummyRows, dummyColumns });

  console.log('🧪 [TEST 1] Launching Application & Rendering Main Workspace...');
  await page.goto(serverUrl);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Ensure any dialogs like WhatsNew are closed
  await page.evaluate(() => {
    const pinia = window.$pinia;
    const uiStore = pinia && pinia._s && pinia._s.get('ui');
    if (uiStore) {
      uiStore.whatsNewOpen = false;
      uiStore.connectionManagerOpen = false;
      uiStore.themeGalleryOpen = false;
      uiStore.exportDialogOpen = false;
    }
  });
  await page.waitForTimeout(300);

  // Capture Base Main Screen
  await page.screenshot({ path: path.join(evidenceDir, '01_main_workspace.png'), fullPage: true });
  console.log('📸 Saved 01_main_workspace.png');

  // TEST 2: Schema Inspector
  console.log('🧪 [TEST 2] Testing Schema Inspector & Table Details...');
  await page.evaluate(() => {
    const pinia = window.$pinia;
    const schemaStore = pinia && pinia._s && pinia._s.get('schema');
    const uiStore = pinia && pinia._s && pinia._s.get('ui');
    if (schemaStore) {
      schemaStore.activeTable = 'orders';
    }
    if (uiStore) {
      uiStore.openInspector('orders');
    }
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(evidenceDir, '02_schema_inspector.png') });
  console.log('📸 Saved 02_schema_inspector.png');

  // Close Schema Inspector Sheet
  await page.evaluate(() => {
    const pinia = window.$pinia;
    const uiStore = pinia && pinia._s && pinia._s.get('ui');
    if (uiStore) {
      uiStore.closeInspector();
    }
  });
  await page.waitForTimeout(400);

  // TEST 3: Visualizing Relations (Schema Diagram)
  console.log('🧪 [TEST 3] Testing Schema Diagram & Visual Relations...');
  await page.evaluate(() => {
    const pinia = window.$pinia;
    const editorStore = pinia && pinia._s && pinia._s.get('editor');
    if (editorStore) {
      editorStore.addSchemaDiagramTab('orders');
    }
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(evidenceDir, '03_schema_diagram.png') });
  console.log('📸 Saved 03_schema_diagram.png');

  // TEST 4: Unified Data Grid & Inline Editing
  console.log('🧪 [TEST 4] Testing Unified Data Grid & Cell Editing...');
  await page.evaluate(({ dummyColumns, dummyRows }) => {
    const pinia = window.$pinia;
    const resultStore = pinia && pinia._s && pinia._s.get('result');
    const editorStore = pinia && pinia._s && pinia._s.get('editor');
    if (editorStore && editorStore.tabs && editorStore.tabs.length > 0) {
      editorStore.activeTabId = editorStore.tabs[0].id;
    }
    if (resultStore) {
      resultStore.columns = dummyColumns;
      resultStore.rows = dummyRows;
      resultStore.totalRows = dummyRows.length;
      resultStore.isTableMode = true;
      resultStore.currentTable = 'orders';
      // Simulate an uncommitted edit on cell row 1, col notes
      resultStore.stagedUpdates = [
        {
          table: 'orders',
          rowKey: '1',
          column: 'notes',
          oldValue: 'Customer note #1',
          newValue: 'MODIFIED BY QA: test unicode 🚀 & null guard'
        }
      ];
    }
  }, { dummyColumns, dummyRows });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(evidenceDir, '04_data_grid_editing.png') });
  console.log('📸 Saved 04_data_grid_editing.png');

  // TEST 5: Value Inspector with JSON Formatting & XSS Probe
  console.log('🧪 [TEST 5] Testing Value Inspector...');
  const jsonCell = page.locator('.grid-data-cell').filter({ hasText: 'web_checkout' }).first();
  if (await jsonCell.isVisible()) {
    await jsonCell.click();
    await page.keyboard.press('Space');
    await page.waitForTimeout(600);
  }
  await page.screenshot({ path: path.join(evidenceDir, '05_value_inspector_probe.png') });
  console.log('📸 Saved 05_value_inspector_probe.png');

  // Close Value Inspector
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // TEST 6: Connection Manager
  console.log('🧪 [TEST 6] Testing Connection Manager...');
  await page.evaluate(({ mockConnStaging, mockConnDev }) => {
    const pinia = window.$pinia;
    const uiStore = pinia && pinia._s && pinia._s.get('ui');
    const connStore = pinia && pinia._s && pinia._s.get('connection');
    if (connStore) {
      connStore.connections = [mockConnStaging, mockConnDev];
    }
    if (uiStore) {
      uiStore.connectionManagerOpen = true;
    }
  }, { mockConnStaging, mockConnDev });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(evidenceDir, '06_connection_manager.png') });
  console.log('📸 Saved 06_connection_manager.png');

  // Close Connection Manager
  await page.evaluate(() => {
    const pinia = window.$pinia;
    const uiStore = pinia && pinia._s && pinia._s.get('ui');
    if (uiStore) {
      uiStore.connectionManagerOpen = false;
    }
  });
  await page.waitForTimeout(300);

  // TEST 7: Theme Gallery
  console.log('🧪 [TEST 7] Testing Theme Gallery in Gruvbox Dark...');
  await page.evaluate(() => {
    const pinia = window.$pinia;
    const uiStore = pinia && pinia._s && pinia._s.get('ui');
    if (uiStore) {
      uiStore.themeGalleryOpen = true;
    }
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(evidenceDir, '07_theme_gallery.png') });
  console.log('📸 Saved 07_theme_gallery.png');

  // Close Theme Gallery
  await page.evaluate(() => {
    const pinia = window.$pinia;
    const uiStore = pinia && pinia._s && pinia._s.get('ui');
    if (uiStore) {
      uiStore.themeGalleryOpen = false;
    }
  });
  await page.waitForTimeout(300);

  // TEST 8: Export Dialog
  console.log('🧪 [TEST 8] Testing Export Query Dialog...');
  await page.evaluate(() => {
    const pinia = window.$pinia;
    const uiStore = pinia && pinia._s && pinia._s.get('ui');
    if (uiStore) {
      uiStore.openExport();
    }
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(evidenceDir, '08_export_dialog.png') });
  console.log('📸 Saved 08_export_dialog.png');

  // Close Export Dialog
  await page.evaluate(() => {
    const pinia = window.$pinia;
    const uiStore = pinia && pinia._s && pinia._s.get('ui');
    if (uiStore) {
      uiStore.closeExport();
    }
  });
  await page.waitForTimeout(300);

  // TEST 9: Light Theme Visual Audit
  console.log('🧪 [TEST 9] Testing Light Theme Workspace...');
  await page.evaluate(() => {
    const pinia = window.$pinia;
    const themeStore = pinia && pinia._s && pinia._s.get('theme');
    if (themeStore && themeStore.setTheme) {
      themeStore.setTheme('github-light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(evidenceDir, '09_light_theme_workspace.png'), fullPage: true });
  console.log('📸 Saved 09_light_theme_workspace.png');

  // TEST 10: Custom Select Query Loader Verification
  console.log('🧪 [TEST 10] Testing Bespoke SelectQueryLoader in Dark Theme...');
  await page.evaluate(() => {
    const pinia = window.$pinia;
    const themeStore = pinia && pinia._s && pinia._s.get('theme');
    if (themeStore && themeStore.setTheme) {
      themeStore.setTheme('tokyo-night');
    }
    const resultStore = pinia && pinia._s && pinia._s.get('result');
    if (resultStore) {
      resultStore.status = 'running';
      resultStore.lastSql = 'SELECT o.id, o.order_number, c.name, o.total_amount FROM orders o JOIN customers c ON o.customer_id = c.id WHERE o.total_amount > 500.00 ORDER BY o.created_at DESC;';
    }
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(evidenceDir, '10_custom_query_loader.png') });
  console.log('📸 Saved 10_custom_query_loader.png');

  await browser.close();
  await server.close();

  console.log('\n🏁 [QA AGENT] Exploratory Audit Run Finished!');
  console.log(`📊 Console Logs Captured: ${consoleLogs.length}`);
  console.log(`⚠️  Console Errors Captured: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    console.log('🚨 Logged Errors:', consoleErrors);
  }
}

runQA().catch((err) => {
  console.error('QA Script Execution Failed:', err);
  process.exit(1);
});
