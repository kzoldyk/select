import { chromium } from 'playwright';
import { createServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function run() {
  console.log('🚀 Starting Vite dev server for screenshot capture...');
  const port = 5190;
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
    name: 'QA Staging',
    host: '10.0.4.12',
    port: 3306,
    database: 'courier',
    username: 'app_readonly',
    password: '',
    dbType: 'mysql',
    ssl: false,
    readOnly: true,
    sshTunnel: false,
    color: '#E11D48',
    environment: 'staging',
    createdAt: new Date().toISOString(),
  };

  const mockTables = [
    { name: 'clickpost_best_shipper_config', type: 'table', rowCount: 8 },
    { name: 'clickpost_couriercompany', type: 'table', rowCount: 24 },
    { name: 'clickpost_delayed_delivery', type: 'table', rowCount: 392 },
    { name: 'consignment', type: 'table', rowCount: 61000 },
    { name: 'consignment_batch', type: 'table', rowCount: 3000 },
    { name: 'customer_suspicious_return_matrix', type: 'table', rowCount: 0 },
    { name: 'delhivery_pickup_locations', type: 'table', rowCount: 28 },
    { name: 'ekart_awb', type: 'table', rowCount: 1300000 },
    { name: 'return_order_tracking_details', type: 'table', rowCount: 884 },
  ];

  await page.addInitScript(({ mockConn, mockTables }) => {
    window.__TAURI_INTERNALS__ = {
      invoke: async (cmd, args) => {
        if (cmd === 'fetch_databases') {
          return ['courier', 'warehouses', 'auth', 'inventory'];
        }
        if (cmd === 'fetch_tables') {
          return mockTables;
        }
        if (cmd === 'load_connections' || cmd === 'plugin:store|load') {
          return [mockConn];
        }
        if (cmd === 'test_connection' || cmd === 'connect') {
          return { success: true };
        }
        return [];
      },
    };
  }, { mockConn, mockTables });

  await page.goto(serverUrl);
  await page.waitForLoadState('networkidle');

  const setupAppState = async (themeName = 'dark') => {
    await page.evaluate(({ mockConn, mockTables, themeName }) => {
      const pinia = window.$pinia;
      if (!pinia || !pinia._s) return;
      const connStore = pinia._s.get('connection');
      const schemaStore = pinia._s.get('schema');
      const editorStore = pinia._s.get('editor');
      const resultStore = pinia._s.get('result');
      const uiStore = pinia._s.get('ui');

      if (uiStore) {
        uiStore.setTheme(themeName);
        uiStore.setFilmGrainEnabled(true);
      }

      if (connStore) {
        connStore.connections = [mockConn];
        connStore.activeId = mockConn.id;
        connStore.status = 'connected';
        connStore.latency = 18;
        connStore.loaded = true;
        connStore.lastError = null;
      }

      if (schemaStore) {
        schemaStore.databases = ['courier', 'warehouses', 'auth', 'inventory'];
        schemaStore.selectedDatabase = 'courier';
        schemaStore.tables = mockTables;
        schemaStore.activeTable = 'return_order_tracking_details';
        schemaStore.isLoading = false;
      }

      if (editorStore) {
        if (editorStore.tabs && editorStore.tabs.length > 0) {
          editorStore.tabs[0].title = 'courier.return_order_tracking_details';
          editorStore.tabs[0].sql = `SELECT * FROM courier.return_order_tracking_details\nWHERE status IN ('IN_TRANSIT', 'OUT_FOR_DELIVERY')\nORDER BY id DESC\nLIMIT 5;`;
        }
      }

      if (resultStore) {
        resultStore.columns = [
          { name: 'id', columnType: 'bigint', key: 'id' },
          { name: 'c_cp_id', columnType: 'varchar(64)', key: 'c_cp_id' },
          { name: 'tracking_number', columnType: 'varchar(128)', key: 'tracking_number' },
          { name: 'status', columnType: 'varchar(50)', key: 'status' },
          { name: 'remark', columnType: 'text', key: 'remark' },
          { name: 'created_at', columnType: 'datetime', key: 'created_at' },
        ];
        resultStore.rows = [
          { id: 10842, c_cp_id: 'CP_DELHIVERY_EXP', tracking_number: '5918710029293', status: 'IN_TRANSIT', remark: 'Arrived at Mumbai hub', created_at: '2026-09-04 13:42:10' },
          { id: 10841, c_cp_id: 'CP_BLUEDART_AIR', tracking_number: '8827104928172', status: 'OUT_FOR_DELIVERY', remark: 'Courier out with delivery agent', created_at: '2026-09-04 13:30:05' },
          { id: 10840, c_cp_id: 'CP_EKART_SURFACE', tracking_number: '3918204918201', status: 'DELIVERED', remark: 'OTP verified by consignee', created_at: '2026-09-04 12:15:22' },
          { id: 10839, c_cp_id: 'CP_SHADOWFAX_LOC', tracking_number: '7728193049182', status: 'RTO_INITIATED', remark: 'Customer refused delivery', created_at: '2026-09-04 11:50:40' },
          { id: 10838, c_cp_id: 'CP_DELHIVERY_EXP', tracking_number: '5918710029288', status: 'IN_TRANSIT', remark: 'Dispatched from Gurgaon Sort Center', created_at: '2026-09-04 11:20:18' },
        ];
        resultStore.rowCount = 5;
        resultStore.executionTimeMs = 18;
        resultStore.isExecuting = false;
        resultStore.lastError = null;
      }
    }, { mockConn, mockTables, themeName });
  };

  const brainDir = '/Users/hiteshbhai.prajapati/.gemini/antigravity/brain/c13ddc75-7727-4e77-9e94-c4d058d9acdb';

  // 1. Capture Dark Theme
  console.log('🌑 Capturing Dark Theme screenshot...');
  await setupAppState('dark');
  await page.waitForTimeout(600);
  const darkPath = path.join(rootDir, 'select_app_dark.png');
  await page.screenshot({ path: darkPath });
  if (fs.existsSync(brainDir)) {
    fs.copyFileSync(darkPath, path.join(brainDir, 'select_app_dark.png'));
  }

  // 2. Capture Light Theme
  console.log('☀️ Capturing Light Theme screenshot...');
  await setupAppState('light');
  await page.waitForTimeout(600);
  const lightPath = path.join(rootDir, 'select_app_light.png');
  await page.screenshot({ path: lightPath });
  if (fs.existsSync(brainDir)) {
    fs.copyFileSync(lightPath, path.join(brainDir, 'select_app_light.png'));
  }

  await browser.close();
  await server.close();
  console.log('🎉 Verification screenshots captured successfully!');
}

run().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
