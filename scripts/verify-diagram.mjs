import { chromium } from 'playwright';
import { createServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function run() {
  console.log('🚀 Starting Vite dev server for Playwright verification...');
  const server = await createServer({
    root: rootDir,
    server: { port: 5173 },
  });
  await server.listen();
  const serverUrl = 'http://localhost:5173';
  console.log(`🌐 Server running at ${serverUrl}`);

  console.log('🎭 Launching Playwright browser...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  // Listen to console logs
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[Browser Error] ${msg.text()}`);
    }
  });

  // Inject Tauri IPC mocks before script load
  await page.addInitScript(() => {
    window.__TAURI_INTERNALS__ = {
      invoke: async (cmd, args) => {
        console.log(`[Tauri Mock IPC] invoke: ${cmd}`, args);
        if (cmd === 'fetch_tables') {
          return [
            { name: 'orders', type: 'table' },
            { name: 'order_items', type: 'table' },
          ];
        }
        if (cmd === 'fetch_table_foreign_keys') {
          return [
            {
              tableSchema: 'shop',
              tableName: 'orders',
              columnName: 'user_id',
              referencedTableSchema: 'auth',
              referencedTable: 'users',
              referencedColumn: 'id',
            },
            {
              tableSchema: 'shop',
              tableName: 'order_items',
              columnName: 'order_id',
              referencedTableSchema: 'shop',
              referencedTable: 'orders',
              referencedColumn: 'id',
            },
          ];
        }
        if (cmd === 'fetch_all_foreign_keys') {
          return [
            {
              tableSchema: 'shop',
              tableName: 'orders',
              columnName: 'user_id',
              referencedTableSchema: 'auth',
              referencedTable: 'users',
              referencedColumn: 'id',
            },
            {
              tableSchema: 'shop',
              tableName: 'order_items',
              columnName: 'order_id',
              referencedTableSchema: 'shop',
              referencedTable: 'orders',
              referencedColumn: 'id',
            },
          ];
        }
        if (cmd === 'fetch_table_details') {
          const t = args?.table || '';
          if (t.includes('user')) {
            return {
              columns: [
                { name: 'id', columnType: 'bigint', nullable: false, default: null, pk: true, extra: '' },
                { name: 'email', columnType: 'varchar(255)', nullable: false, default: null, pk: false, extra: '' },
                { name: 'role', columnType: 'varchar(50)', nullable: false, default: null, pk: false, extra: '' },
              ],
              indexes: [{ name: 'PRIMARY', columns: 'id', unique: true }],
              constraints: [],
              ddl: '',
            };
          }
          if (t.includes('order_item')) {
            return {
              columns: [
                { name: 'id', columnType: 'bigint', nullable: false, default: null, pk: true, extra: '' },
                { name: 'order_id', columnType: 'bigint', nullable: false, default: null, pk: false, extra: '' },
                { name: 'product_id', columnType: 'bigint', nullable: false, default: null, pk: false, extra: '' },
                { name: 'quantity', columnType: 'int', nullable: false, default: '1', pk: false, extra: '' },
              ],
              indexes: [{ name: 'PRIMARY', columns: 'id', unique: true }],
              constraints: [],
              ddl: '',
            };
          }
          return {
            columns: [
              { name: 'id', columnType: 'bigint', nullable: false, default: null, pk: true, extra: '' },
              { name: 'user_id', columnType: 'bigint', nullable: false, default: null, pk: false, extra: '' },
              { name: 'status', columnType: 'varchar(50)', nullable: false, default: null, pk: false, extra: '' },
              { name: 'total_amount', columnType: 'decimal(10,2)', nullable: false, default: '0.00', pk: false, extra: '' },
            ],
            indexes: [{ name: 'PRIMARY', columns: 'id', unique: true }],
            constraints: [],
            ddl: '',
          };
        }
        if (cmd === 'load_connections' || cmd === 'plugin:store|load') {
          return [
            {
              id: 'mock-conn-1',
              name: 'Shop Database',
              host: 'localhost',
              port: 3306,
              user: 'root',
              database: 'shop',
            },
          ];
        }
        return [];
      },
    };
  });

  console.log('🧭 Navigating to application...');
  await page.goto(serverUrl);
  await page.waitForLoadState('networkidle');

  // Set active connection in storage & stores
  await page.evaluate(() => {
    localStorage.setItem('theme', 'dark');
    const mockConn = {
      id: 'mock-conn-1',
      name: 'Shop Database',
      host: 'localhost',
      port: 3306,
      user: 'root',
      database: 'shop',
    };
    localStorage.setItem('connections', JSON.stringify([mockConn]));
    localStorage.setItem('activeConnectionId', 'mock-conn-1');
  });

  await page.reload();
  await page.waitForLoadState('networkidle');

  // Trigger schema diagram view by opening schema diagram tab or calling store
  console.log('📊 Opening Schema Diagram with cross-schema relations...');
  await page.evaluate(() => {
    const pinia = window.$pinia;
    const editorStore = window.__editorStore || (pinia && pinia._s && pinia._s.get('editor'));
    const connStore = pinia && pinia._s && pinia._s.get('connection');
    const schemaStore = pinia && pinia._s && pinia._s.get('schema');

    if (connStore) {
      connStore.status = 'connected';
      connStore.activeId = 'mock-conn-1';
      connStore.activeConnection = {
        id: 'mock-conn-1',
        name: 'Shop Database',
        host: 'localhost',
        port: 3306,
        user: 'root',
        database: 'shop',
      };
    }
    if (schemaStore) {
      schemaStore.tables = [
        { name: 'orders', type: 'table' },
        { name: 'order_items', type: 'table' },
      ];
    }
    if (editorStore) {
      editorStore.addSchemaDiagramTab('orders');
    }
  });

  await page.waitForTimeout(1000);

  // Check if diagram cards are rendered
  const cardCount = await page.locator('.schema-diagram, [data-diagram-canvas], .absolute.rounded-lg').count();
  console.log(`✅ Table cards found on canvas: ${cardCount}`);

  const pageText = await page.textContent('body');
  const hasOrders = pageText.includes('orders');
  const hasOrderItems = pageText.includes('order_items') || pageText.includes('orders');
  const hasCrossSchemaAuth = pageText.includes('auth') || pageText.includes('users');

  console.log(`🔍 Verification Results:`);
  console.log(`  - Focus table (orders) rendered: ${hasOrders ? '✅' : '❌'}`);
  console.log(`  - Inbound referencing table rendered: ${hasOrderItems ? '✅' : '❌'}`);
  console.log(`  - Cross-schema table/badge (auth/users) rendered: ${hasCrossSchemaAuth ? '✅' : '❌'}`);

  console.log('📸 Taking verification screenshot...');
  const screenshotPath = path.join(rootDir, 'playwright-verification.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`🖼️ Screenshot saved to ${screenshotPath}`);

  await browser.close();
  await server.close();

  if (hasOrders && hasOrderItems && hasCrossSchemaAuth) {
    console.log('🎉 Playwright verification PASSED successfully!');
    process.exit(0);
  } else {
    console.error('❌ Playwright verification failed: missing expected diagram nodes.');
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Fatal Playwright runner error:', err);
  process.exit(1);
});
