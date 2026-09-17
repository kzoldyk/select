import { chromium } from 'playwright';
import { createServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const homepagePublicDir = '/Users/hiteshbhai.prajapati/Desktop/code/Github/select-homepage/public';

async function run() {
  console.log('🚀 Starting Vite dev server for comprehensive screen capture...');
  const port = 5192;
  const server = await createServer({
    root: rootDir,
    server: { port },
  });
  await server.listen();
  const serverUrl = `http://localhost:${port}`;
  console.log(`🌐 Server running at ${serverUrl}`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  const mockConn = {
    id: 'conn-staging-1',
    name: 'QA Staging Cluster',
    host: '10.0.4.12',
    port: 3306,
    database: 'courier_mesh',
    username: 'app_readonly',
    password: '',
    dbType: 'mysql',
    ssl: true,
    readOnly: true,
    sshTunnel: false,
    color: '#cf4f36',
    environment: 'staging',
    createdAt: new Date().toISOString(),
  };

  const mockConnProd = {
    id: 'conn-prod-1',
    name: 'AWS RDS Aurora Production',
    host: 'aurora-prod.internal.aws',
    port: 3306,
    database: 'production_main',
    username: 'root_guard',
    password: '',
    dbType: 'mysql',
    ssl: true,
    readOnly: true,
    sshTunnel: true,
    color: '#E11D48',
    environment: 'production',
    createdAt: new Date().toISOString(),
  };

  const mockConnLocal = {
    id: 'conn-local-1',
    name: 'Local Docker MySQL 8.4',
    host: '127.0.0.1',
    port: 3306,
    database: 'dev_sandbox',
    username: 'root',
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
    { name: 'orders', type: 'table', rowCount: 1420500 },
    { name: 'order_items', type: 'table', rowCount: 4890200 },
    { name: 'users', type: 'table', rowCount: 520000 },
    { name: 'shipments', type: 'table', rowCount: 920400 },
    { name: 'fulfillment_centers', type: 'table', rowCount: 48 },
    { name: 'carrier_manifests', type: 'table', rowCount: 18450 },
    { name: 'payment_transactions', type: 'table', rowCount: 2190000 },
    { name: 'webhook_events', type: 'table', rowCount: 8400000 },
  ];

  await page.addInitScript(({ mockConn, mockConnProd, mockConnLocal, mockTables }) => {
    window.__TAURI_INTERNALS__ = {
      invoke: async (cmd, args) => {
        if (cmd === 'fetch_databases') {
          return ['courier_mesh', 'production_main', 'auth_service', 'inventory_warehouse'];
        }
        if (cmd === 'fetch_tables') {
          return mockTables;
        }
        if (cmd === 'load_connections' || cmd === 'plugin:store|load') {
          return [mockConn, mockConnProd, mockConnLocal];
        }
        if (cmd === 'test_connection' || cmd === 'connect') {
          return { success: true };
        }
        if (cmd === 'fetch_table_foreign_keys' || cmd === 'fetch_all_foreign_keys') {
          return [
            {
              tableSchema: 'courier_mesh',
              tableName: 'orders',
              columnName: 'user_id',
              referencedTableSchema: 'courier_mesh',
              referencedTable: 'users',
              referencedColumn: 'id',
            },
            {
              tableSchema: 'courier_mesh',
              tableName: 'order_items',
              columnName: 'order_id',
              referencedTableSchema: 'courier_mesh',
              referencedTable: 'orders',
              referencedColumn: 'id',
            },
            {
              tableSchema: 'courier_mesh',
              tableName: 'shipments',
              columnName: 'order_id',
              referencedTableSchema: 'courier_mesh',
              referencedTable: 'orders',
              referencedColumn: 'id',
            },
            {
              tableSchema: 'courier_mesh',
              tableName: 'shipments',
              columnName: 'manifest_id',
              referencedTableSchema: 'courier_mesh',
              referencedTable: 'carrier_manifests',
              referencedColumn: 'id',
            }
          ];
        }
        if (cmd === 'fetch_table_details') {
          return {
            columns: [
              { name: 'id', columnType: 'bigint unsigned', nullable: false, default: null, pk: true, extra: 'auto_increment' },
              { name: 'order_number', columnType: 'varchar(64)', nullable: false, default: null, pk: false, extra: '' },
              { name: 'user_id', columnType: 'bigint unsigned', nullable: false, default: null, pk: false, extra: '' },
              { name: 'status', columnType: "enum('PENDING','PROCESSING','SHIPPED','DELIVERED')", nullable: false, default: 'PENDING', pk: false, extra: '' },
              { name: 'total_usd', columnType: 'decimal(10,2)', nullable: false, default: '0.00', pk: false, extra: '' },
              { name: 'metadata_json', columnType: 'json', nullable: true, default: null, pk: false, extra: '' },
              { name: 'created_at', columnType: 'timestamp', nullable: false, default: 'CURRENT_TIMESTAMP', pk: false, extra: '' },
            ],
            indexes: [
              { name: 'PRIMARY', columns: 'id', unique: true },
              { name: 'idx_order_user', columns: 'user_id', unique: false },
              { name: 'idx_created_at', columns: 'created_at', unique: false },
            ],
            constraints: [],
            ddl: 'CREATE TABLE `orders` (...)',
          };
        }
        return [];
      },
    };
  }, { mockConn, mockConnProd, mockConnLocal, mockTables });

  await page.goto(serverUrl);
  await page.waitForLoadState('networkidle');

  const setupMainData = async (themeName = 'gruvbox-dark', grainEnabled = true) => {
    await page.evaluate(({ mockConn, mockTables, themeName, grainEnabled }) => {
      const pinia = window.$pinia;
      if (!pinia || !pinia._s) return;
      const connStore = pinia._s.get('connection');
      const schemaStore = pinia._s.get('schema');
      const editorStore = pinia._s.get('editor');
      const resultStore = pinia._s.get('result');
      const uiStore = pinia._s.get('ui');

      if (window.$theme && typeof window.$theme.setTheme === 'function') {
        window.$theme.setTheme(themeName);
      }
      if (uiStore) {
        uiStore.setFilmGrainEnabled(grainEnabled);
        if (grainEnabled) {
          uiStore.setGrainIntensity('subtle');
        }
        uiStore.sidebarOpen = true;
        uiStore.themeGalleryOpen = false;
        uiStore.connectionManagerOpen = false;
        uiStore.inspectorOpen = false;
      }

      if (connStore) {
        connStore.connections = [mockConn];
        connStore.activeId = mockConn.id;
        connStore.status = 'connected';
        connStore.latency = 12;
        connStore.loaded = true;
        connStore.lastError = null;
      }

      if (schemaStore) {
        schemaStore.databases = ['courier_mesh', 'production_main', 'auth_service', 'inventory_warehouse'];
        schemaStore.selectedDatabase = 'courier_mesh';
        schemaStore.tables = mockTables;
        schemaStore.activeTable = 'orders';
        schemaStore.isLoading = false;
      }

      if (editorStore) {
        if (editorStore.tabs && editorStore.tabs.length > 0) {
          editorStore.tabs[0].title = 'courier_mesh.orders · Active Query';
          editorStore.tabs[0].sql = `-- Select v1.0 Rust Engine: 1.4M rows indexed
SELECT 
  o.id,
  o.order_number,
  o.status,
  o.total_usd,
  u.email AS customer_email,
  JSON_PRETTY(o.metadata_json) AS payload,
  o.created_at
FROM courier_mesh.orders o
JOIN courier_mesh.users u ON u.id = o.user_id
WHERE o.status IN ('PROCESSING', 'SHIPPED')
  AND o.created_at >= NOW() - INTERVAL 24 HOUR
ORDER BY o.id DESC
LIMIT 10;`;
        }
      }

      if (resultStore) {
        resultStore.columns = [
          { name: 'id', columnType: 'bigint', key: 'id' },
          { name: 'order_number', columnType: 'varchar(64)', key: 'order_number' },
          { name: 'status', columnType: 'varchar(32)', key: 'status' },
          { name: 'total_usd', columnType: 'decimal(10,2)', key: 'total_usd' },
          { name: 'customer_email', columnType: 'varchar(128)', key: 'customer_email' },
          { name: 'payload', columnType: 'json', key: 'payload' },
          { name: 'created_at', columnType: 'datetime', key: 'created_at' },
        ];
        resultStore.rows = [
          { id: 981240, order_number: 'ORD-2026-98124', status: 'SHIPPED', total_usd: '$489.50', customer_email: 'sarah.c@stripe.dev', payload: '{"carrier":"DHL_EXPRESS","sla":"next_day","hub":"FRA-01"}', created_at: '2026-09-17 16:42:10' },
          { id: 981239, order_number: 'ORD-2026-98123', status: 'PROCESSING', total_usd: '$1,290.00', customer_email: 'alex.m@github.com', payload: '{"carrier":"FEDEX_PRIORITY","sla":"2_day","hub":"LHR-03"}', created_at: '2026-09-17 16:38:05' },
          { id: 981238, order_number: 'ORD-2026-98122', status: 'DELIVERED', total_usd: '$74.20', customer_email: 'elena.r@vercel.app', payload: '{"carrier":"BLUEDART","signature":"verified"}', created_at: '2026-09-17 16:30:19' },
          { id: 981237, order_number: 'ORD-2026-98121', status: 'SHIPPED', total_usd: '$320.00', customer_email: 'marcus.v@datadog.io', payload: '{"carrier":"UPS_SAVER","insurance":true}', created_at: '2026-09-17 16:21:44' },
          { id: 981236, order_number: 'ORD-2026-98120', status: 'PROCESSING', total_usd: '$2,450.80', customer_email: 'chen.w@cloudflare.com', payload: '{"carrier":"DHL_EXPRESS","priority":"high"}', created_at: '2026-09-17 16:15:00' },
        ];
        resultStore.rowCount = 5;
        resultStore.executionTimeMs = 12;
        resultStore.isExecuting = false;
        resultStore.lastError = null;
      }
    }, { mockConn, mockTables, themeName });
  };

  const saveToBoth = (filename, sourceBuffer) => {
    const localDest = path.join(rootDir, filename);
    fs.writeFileSync(localDest, sourceBuffer);
    if (fs.existsSync(homepagePublicDir)) {
      fs.writeFileSync(path.join(homepagePublicDir, filename), sourceBuffer);
    }
    const homepageDistDir = path.resolve(homepagePublicDir, '../dist');
    if (fs.existsSync(homepageDistDir)) {
      fs.writeFileSync(path.join(homepageDistDir, filename), sourceBuffer);
    }
    console.log(`📸 Saved ${filename}`);
  };

  // 1. Gruvbox Dark Main Editor Screen (primary product & feature visual)
  console.log('🪵 Capturing Gruvbox Dark Editor screen with subtle film grain...');
  await setupMainData('gruvbox-dark', true);
  await page.waitForTimeout(800);
  const gruvboxBuf = await page.screenshot();
  saveToBoth('screen-editor-dark.png', gruvboxBuf);
  saveToBoth('screen-editor-gruvbox.png', gruvboxBuf);

  // 2. Light Main Editor Screen (Clean GitHub Light)
  console.log('☀️ Capturing Light Editor screen (github-light)...');
  await setupMainData('github-light', false);
  await page.waitForTimeout(800);
  const lightBuf = await page.screenshot();
  saveToBoth('screen-editor-light.png', lightBuf);

  // 3. Schema ER Diagram Screen in Gruvbox Dark
  console.log('📊 Capturing Schema Diagram canvas in Gruvbox Dark...');
  await setupMainData('gruvbox-dark', true);
  await page.evaluate(() => {
    const pinia = window.$pinia;
    const editorStore = pinia && pinia._s && pinia._s.get('editor');
    if (editorStore) {
      editorStore.addSchemaDiagramTab('orders');
    }
  });
  await page.waitForTimeout(1000);
  const diagramDarkBuf = await page.screenshot();
  saveToBoth('screen-schema-diagram.png', diagramDarkBuf);

  // 4. Schema ER Diagram Screen in Light
  console.log('📊 Capturing Schema Diagram canvas in Light mode...');
  await setupMainData('github-light', false);
  await page.evaluate(() => {
    const pinia = window.$pinia;
    const editorStore = pinia && pinia._s && pinia._s.get('editor');
    if (editorStore) {
      editorStore.addSchemaDiagramTab('orders');
    }
  });
  await page.waitForTimeout(1000);
  const diagramLightBuf = await page.screenshot();
  saveToBoth('screen-schema-light.png', diagramLightBuf);

  // 5. Theme Gallery Dialog Screen in Gruvbox Dark
  console.log('🎨 Capturing Theme Gallery Dialog in Gruvbox Dark...');
  await setupMainData('gruvbox-dark', true);
  await page.evaluate(() => {
    const pinia = window.$pinia;
    const uiStore = pinia && pinia._s && pinia._s.get('ui');
    if (uiStore) {
      uiStore.themeGalleryOpen = true;
    }
  });
  await page.waitForTimeout(800);
  const themeBuf = await page.screenshot();
  saveToBoth('screen-theme-gallery.png', themeBuf);

  // 6. Connection Manager Screen in Gruvbox Dark
  console.log('🛡️ Capturing Connection Manager in Gruvbox Dark...');
  await setupMainData('gruvbox-dark', true);
  await page.evaluate(({ mockConn, mockConnProd, mockConnLocal }) => {
    const pinia = window.$pinia;
    const uiStore = pinia && pinia._s && pinia._s.get('ui');
    const connStore = pinia && pinia._s && pinia._s.get('connection');
    if (connStore) {
      connStore.connections = [mockConn, mockConnProd, mockConnLocal];
    }
    if (uiStore) {
      uiStore.themeGalleryOpen = false;
      uiStore.connectionManagerOpen = true;
    }
  }, { mockConn, mockConnProd, mockConnLocal });
  await page.waitForTimeout(800);
  const connDarkBuf = await page.screenshot();
  saveToBoth('screen-connection-manager.png', connDarkBuf);

  // 7. Connection Manager Screen in Light
  console.log('🛡️ Capturing Connection Manager in Light mode...');
  await setupMainData('github-light', false);
  await page.evaluate(({ mockConn, mockConnProd, mockConnLocal }) => {
    const pinia = window.$pinia;
    const uiStore = pinia && pinia._s && pinia._s.get('ui');
    const connStore = pinia && pinia._s && pinia._s.get('connection');
    if (connStore) {
      connStore.connections = [mockConn, mockConnProd, mockConnLocal];
    }
    if (uiStore) {
      uiStore.themeGalleryOpen = false;
      uiStore.connectionManagerOpen = true;
    }
  }, { mockConn, mockConnProd, mockConnLocal });
  await page.waitForTimeout(800);
  const connLightBuf = await page.screenshot();
  saveToBoth('screen-connection-light.png', connLightBuf);

  await browser.close();
  await server.close();
  console.log('✨ All screenshots captured and synced to homepage public directory!');
}

run().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
