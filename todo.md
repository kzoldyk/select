# Select — Product TODO

Audit of bugs, performance gaps, security issues, and missing features needed to make Select a production-grade MySQL/MariaDB SQL client.

**Priority key:** P0 = blocks core usage · P1 = high impact · P2 = polish · P3 = nice-to-have

---

## P0 — Critical Bugs

### 1. "Visualize Relations" freezes / breaks the app — `[FIXED]`

**Problem:** Right-clicking a table → **Visualize Relations** (or opening a focused schema diagram tab) can freeze or destabilize the entire app. Root cause was a reactive feedback loop in `src/components/SchemaDiagram.vue` (`visibleTables` <-> `loadSchemaDetails`).

**Resolution:**
- Replaced `watch(visibleTables)` with watcher on `props.tableName` and connection/database.
- Added in-flight sequence token (`loadSequence`) to cancel stale/overlapping requests.
- Eliminated load-start `relations.value = []` clear; updates now swap relations atomically.
- Ensured case-insensitive matching in `visibleTables` filter.
- Added error handling with user-visible toast notifications via `vue-sonner`.

**Files:** `src/components/SchemaDiagram.vue`

---

### 2. Global schema diagram overwhelms large databases — `[FIXED]`

**Problem:** Sidebar → **Schema Diagram** (no focus table) fired `fetch_table_foreign_keys` for every table in parallel via `Promise.all`. On schemas with 100+ tables this flooded the DB connection pool and froze the UI.

**Resolution:**
- Added new backend command `fetch_all_foreign_keys` in `commands.rs` (and registered in `lib.rs`) that returns all FKs for the active database in a single query against `information_schema.key_column_usage`.
- Added concurrency-limited runner in `SchemaDiagram.vue` (`runWithConcurrency`) for batched table detail fetches and fallback queries.

**Files:** `src/components/SchemaDiagram.vue`, `src-tauri/src/commands.rs`, `src-tauri/src/lib.rs`

---

### 3. Connection pool leak on connection switch — `[FIXED]`

**Problem:** `StatusBar.vue` `switchConnection()` called `connStore.connect(id)` without disconnecting the previous pool. `connect` in `commands.rs` inserted a new pool without disconnecting the old one.

**Resolution:**
- In `src/stores/connection.ts`, `connect(id)` automatically disconnects the previous active connection before establishing a new one.
- In `src-tauri/src/commands.rs`, `connect` safely calls `disconnect().await` on any previous pool entry for the same connection ID.
- Added unit test in `src/stores/__tests__/connection.spec.ts` to verify connection disconnect on switch.

**Files:** `src/components/StatusBar.vue`, `src/stores/connection.ts`, `src-tauri/src/commands.rs`, `src/stores/__tests__/connection.spec.ts`

---

## P1 — Security

### 4. Read-only connections don't block writes on the backend

**Problem:** `readOnly` is stored in the frontend connection model and checked in `result.ts` for single destructive queries, but:
- `run_multi_query` executes mutating statements without checking connection `readOnly`
- `run_write_query` and `update_rows` have no read-only guard in Rust
- A user (or modified frontend) can bypass the UI check via IPC

**Solution:**
- Pass `readOnly: bool` in `ConnectionConfig` to the Rust backend and store it in `AppState` per connection
- In `run_multi_query`, `run_write_query`, `update_rows`: reject if connection is read-only
- Mirror the same check in `result.ts` `runMultiQuery()` for immediate UX feedback
- Add Rust unit tests for read-only bypass attempts

**Files:** `src/stores/result.ts`, `src/stores/connection.ts`, `src-tauri/src/commands.rs`

---

### 5. `update_rows` uses string escaping instead of bound parameters

**Problem:** `commands.rs` `update_rows` builds `UPDATE ... SET col = 'escaped_value'` via manual string escaping. This is fragile and risks SQL injection on edge-case values (binary data, unicode escapes, etc.).

**Solution:**
- Refactor to use `mysql_async` parameterized queries: `conn.exec("UPDATE t SET col = ? WHERE id = ?", (value, id))`
- Add Rust tests with malicious string payloads (`'; DROP TABLE--`, `\0`, etc.)

**Files:** `src-tauri/src/commands.rs`

---

### 6. `encrypt_password` / `decrypt_password` exposed to renderer

**Problem:** Both IPC commands are registered in `lib.rs` and callable from the Vue frontend. The renderer should never handle raw encryption/decryption — it increases attack surface if the webview is compromised.

**Solution:**
- Remove `decrypt_password` from the Tauri command surface entirely
- Encrypt passwords only inside Rust during `save_connections` / `load_connections`
- Frontend sends plaintext password over IPC once on save; Rust encrypts before writing to disk
- Fail closed if encryption fails (no plaintext fallback — see item 7)

**Files:** `src-tauri/src/lib.rs`, `src-tauri/src/commands.rs`, `src/stores/connection.ts`

---

### 7. Password encryption fallback stores plaintext

**Problem:** `connection.ts` `encryptConnections()` catches encryption errors and stores the password as-is (lines ~220–222). A failed encryption silently saves credentials in plaintext.

**Solution:**
- Throw and surface an error to the user: "Could not secure password. Connection not saved."
- Never write plaintext passwords to disk
- Consider OS keychain (macOS Keychain, Windows DPAPI, Linux Secret Service) for the encryption key instead of a file-based SHA256 hash

**Files:** `src/stores/connection.ts`, `src-tauri/src/commands.rs`

---

## P1 — Performance & Caching

### 8. Query history rewrites entire JSON file on every query

**Problem:** `append_history()` in `commands.rs` reads the full history file, inserts one item, truncates to 100, and writes the entire file back — synchronously — on every query execution.

**Solution:**
- Keep history in `AppState` in memory after first load
- Append in memory; debounce disk writes (e.g. 2s after last query, or on app close)
- Optionally append-only log file for durability without full rewrites

**Files:** `src-tauri/src/commands.rs`

---

### 9. Saved queries re-read all `.sql` files on every `load_queries`

**Problem:** `load_queries_from_disk` scans and reads every file in the queries directory on each invoke. With many saved queries this adds latency every time the sidebar refreshes.

**Solution:**
- Cache loaded queries in `AppState` with directory mtime invalidation
- Use Tauri file watcher (`notify` crate) to invalidate cache on file change
- Return cached list immediately; refresh in background if stale

**Files:** `src-tauri/src/commands.rs`

---

### 10. Foreign key cache duplicated across three components

**Problem:** `foreignKeysCache` is defined separately in `ResultPanel.vue`, `TableDataViewer.vue`, and `SchemaDiagram.vue`. Same table's FKs are fetched up to 3 times per session.

**Solution:**
- Move FK cache into `schema` store: `foreignKeysByTable: Record<string, FK[]>`
- Add `fetchForeignKeys(tableName)` action with cache check
- Invalidate on schema refresh / connection change
- All three components call the store action instead of direct `invoke`

**Files:** `src/stores/schema.ts`, `src/components/ResultPanel.vue`, `src/components/TableDataViewer.vue`, `src/components/SchemaDiagram.vue`

---

### 11. Schema refresh clears all cached table details

**Problem:** `refreshSchema()` in `schema.ts` wipes `detailsByTable = {}` on every refresh, forcing re-fetch of every table the user has already inspected.

**Solution:**
- Key `detailsByTable` by `{connectionId}-{database}-{tableName}`
- On refresh, diff table list: remove entries for dropped tables, keep entries for unchanged tables
- Only invalidate details for tables whose DDL may have changed (after write queries, offer "Refresh table" per table)

**Files:** `src/stores/schema.ts`

---

### 12. `schemaTablesCache` not cleared on `clearSchema()`

**Problem:** `clearSchema()` resets tables/views/etc. but leaves `schemaTablesCache` intact. After switching databases, stale cross-schema table lists can be returned.

**Solution:**
- Add `this.schemaTablesCache = {}` inside `clearSchema()`
- Or key cache entries include database name (partially done via `connectionId-schema` key — verify database is part of key)

**Files:** `src/stores/schema.ts`

---

### 13. Deep clone of query results on every fetch

**Problem:** `result.ts` uses `JSON.parse(JSON.stringify(rows))` to snapshot `originalRows` for edit tracking. On large result sets (1000+ rows) this is slow and memory-heavy.

**Solution:**
- Use `structuredClone()` (faster for plain objects) or track dirty cell indices instead of cloning all rows
- Only clone rows that are actually edited
- Consider immutable row patches: `Map<rowIndex, Map<colName, newValue>>`

**Files:** `src/stores/result.ts`

---

### 14. Paged query fallback runs full query then skips rows in memory

**Problem:** When `LIMIT`/`OFFSET` injection fails (syntax edge cases), `run_query_paged` falls back to running the full query and skipping rows in Rust memory — potentially loading millions of rows.

**Solution:**
- Detect existing `LIMIT`/`OFFSET` in SQL before appending
- If fallback is needed, wrap in a subquery: `SELECT * FROM (<original>) AS _sub LIMIT n OFFSET m`
- Hard cap fallback at `MAX_RESULT_ROWS` with a clear error message

**Files:** `src-tauri/src/commands.rs`

---

### 15. Autocomplete rebuilds column index on every keystroke

**Problem:** `QueryEditor.vue` `collectColumns()` rebuilds the full column list from `detailsByTable` on each autocomplete trigger.

**Solution:**
- Memoize column index in a computed property; invalidate only when `detailsByTable` or active database changes
- Lazy-fetch table details only when a table name is referenced in the current SQL buffer

**Files:** `src/components/QueryEditor.vue`, `src/stores/schema.ts`

---

## P1 — UX Gaps & Honesty

### 16. SSH tunnel UI exists but is not implemented

**Problem:** `ConnectionManager.vue` shows SSH tunnel fields (`sshTunnel`, `sshHost`, `sshPort`, etc.) and saves them to the connection model, but `commands.rs` `build_connection_url` / `connect` never uses them. Users think they have SSH support.

**Solution (pick one):**
- **Option A (honest):** Hide SSH fields behind a "Coming soon" badge until implemented
- **Option B (implement):** Use `ssh2` crate in Rust to establish tunnel, then connect MySQL through local forwarded port

**Files:** `src/components/ConnectionManager.vue`, `src-tauri/src/commands.rs`, `src/stores/connection.ts`

---

### 17. Unix socket path saved but ignored

**Problem:** `socketPath` is in the connection form and model but `get_connection_opts` only builds TCP URLs.

**Solution:**
- Support `mysql://user:pass@/database?socket=/path/to/mysqld.sock` in `build_connection_url`
- Or hide the socket field until supported

**Files:** `src/components/ConnectionManager.vue`, `src-tauri/src/commands.rs`

---

### 18. PostgreSQL schema selector shown but unsupported

**Problem:** `Sidebar.vue` shows a Postgres schema type selector, but the backend only supports MySQL/MariaDB (`commands.rs` validates `db_type`).

**Solution:**
- Remove Postgres option from UI until a Postgres adapter exists
- Or add a clear "MySQL & MariaDB only" label in the connection manager

**Files:** `src/components/Sidebar.vue`, `src/components/ConnectionManager.vue`

---

### 19. Schema fetch errors are silent in the sidebar

**Problem:** `schema.ts` `refreshSchema()` catches errors and only `console.error`s. The sidebar shows an empty tree with no explanation.

**Solution:**
- Set a `schemaError` state in the store
- Show an error banner in `Sidebar.vue` with retry button
- Toast the error via `sonner` (already used elsewhere in the app)

**Files:** `src/stores/schema.ts`, `src/components/Sidebar.vue`

---

### 20. No "Connect" CTA when disconnected

**Problem:** When not connected, the sidebar shows "Not connected" text but no obvious action to open the connection manager. New users don't know what to do.

**Solution:**
- Add a prominent "Connect to database" button in the sidebar empty state
- Disable Run button in the query editor with tooltip: "Connect to a database first"
- Show connection manager automatically on first launch if no saved connections exist

**Files:** `src/components/Sidebar.vue`, `src/App.vue`, `src/components/QueryEditor.vue`

---

### 21. `Tab.type` missing `schema_diagram` in TypeScript interface

**Problem:** `editor.ts` `Tab` interface types `type` as `'query' | 'table'` but runtime uses `'schema_diagram'`. TypeScript won't catch bugs in tab routing logic.

**Solution:**
- Update interface: `type?: 'query' | 'table' | 'schema_diagram'`
- Audit all `tab.type` conditionals for exhaustiveness

**Files:** `src/stores/editor.ts`, `src/components/TabBar.vue`, `src/App.vue`

---

### 22. Version mismatch in UI vs package

**Problem:** `ConnectionManager.vue` shows version "2.6.8" but `package.json` and `tauri.conf.json` say `0.1.0`.

**Solution:**
- Read version from `package.json` at build time via Vite `define` or Tauri `tauri.conf.json`
- Single source of truth; display dynamically in About section

**Files:** `src/components/ConnectionManager.vue`, `vite.config.ts`

---

## P2 — Architecture & Code Quality

### 23. Monolithic `commands.rs` (~2,600 lines)

**Problem:** All Rust IPC handlers, SQL validation, encryption, history, and query execution live in one file. Hard to navigate, test, and review.

**Solution:**
Split into modules:
```
src-tauri/src/
  commands/
    mod.rs          # re-exports all commands
    connection.rs   # connect, disconnect, test_connection, change_database
    query.rs        # run_query, run_multi_query, run_write_query, cancel
    schema.rs       # fetch_schema, fetch_table_details, fetch_foreign_keys
    storage.rs      # history, saved queries, connections persistence
    crypto.rs       # encrypt/decrypt, key management
    validation.rs   # validate_read_only_query, SQL safety
```

**Files:** `src-tauri/src/commands.rs` → split as above, update `lib.rs`

---

### 24. Components invoke IPC directly instead of through stores/services

**Problem:** `Sidebar.vue`, `TableDataViewer.vue`, `ResultPanel.vue`, and `SchemaDiagram.vue` call `invoke()` directly. This scatters DB logic, makes testing harder, and duplicates error handling.

**Solution:**
- Create `src/services/database.ts` with typed wrappers for all IPC calls
- Stores call services; components call stores
- Services are easy to mock in Vitest

**Files:** New `src/services/database.ts`, refactor components incrementally

---

### 25. Dual storage systems can diverge

**Problem:** App state is split across:
- Tauri store (`storage.ts`) for connections/settings
- `localStorage` for tab state (`editor.ts`)
- JSON files on disk for history/queries (`commands.rs`)

No documented ownership; fallback paths in `storage.ts` can write to both Tauri store and localStorage.

**Solution:**
- Document data ownership in a `docs/storage.md` (or inline in README)
- Pick Tauri store as primary for all persistent state
- Remove localStorage fallback once Tauri store is confirmed stable on all platforms

**Files:** `src/stores/storage.ts`, `src/stores/editor.ts`, `README.md`

---

### 26. Dead code: `fetchAllTableDetails()` never called

**Problem:** `schema.ts` defines `fetchAllTableDetails()` (line 233) but nothing invokes it.

**Solution:**
- Remove if not needed
- Or use it to pre-warm `detailsByTable` cache after schema load (with batching) for faster autocomplete

**Files:** `src/stores/schema.ts`

---

### 27. Two parallel theme systems

**Problem:** `ui.ts` store manages app theme (dark/light) while `theme/manager.ts` manages 40+ editor themes. They are manually bridged in `ui.ts` (lines ~92–100).

**Solution:**
- Consolidate into one theme module with two concerns: `appTheme` (light/dark shell) and `editorTheme` (syntax colors)
- Single subscription point for theme changes

**Files:** `src/stores/ui.ts`, `src/theme/manager.ts`

---

### 28. 40+ theme files may bloat bundle

**Problem:** `src/theme/themes/` has 40+ theme definition files. If eagerly imported, they increase bundle size.

**Solution:**
- Verify themes are lazy-loaded via dynamic `import()` in `theme/manager.ts`
- If not, convert to dynamic imports keyed by theme name
- Tree-shake unused themes in production build

**Files:** `src/theme/manager.ts`, `src/theme/index.ts`

---

## P2 — Testing

### 29. No component tests for critical UI flows

**Problem:** Vitest config only covers `stores/**` and `composables/**`. Zero tests for `QueryEditor`, `ResultPanel`, `Sidebar`, `ConnectionManager`, `TableDataViewer`, or `SchemaDiagram`.

**Solution:**
- Add `@vue/test-utils` component tests for:
  - Connect → run query → see results
  - Read-only connection blocks write
  - Schema diagram renders without infinite loop (mock store)
  - Tab open/close/switch persistence
- Expand `vitest.config.ts` include paths

**Files:** `vitest.config.ts`, new `src/components/__tests__/`

---

### 30. No Rust integration tests for IPC commands

**Problem:** Rust has unit tests for SQL validation and URL building, but no integration tests for connect/disconnect lifecycle, pool management, or query execution.

**Solution:**
- Add `#[cfg(test)]` integration module using a test MySQL instance (Docker in CI)
- Test: connect → query → disconnect → verify pool cleaned up
- Test: read-only connection rejects UPDATE

**Files:** `src-tauri/src/commands.rs` or new `src-tauri/tests/`

---

### 31. Ad-hoc test scripts not in test suite

**Problem:** Root-level `test.js`, `test2.js`, `test_multi.js`, `test_multi_smart.js`, `test_regex.js`, `test_split.js`, `test_fetch_table.js` are manual scripts, not part of CI.

**Solution:**
- Port useful cases into Vitest/Rust tests
- Delete the ad-hoc scripts
- Add `npm test` and `cargo test` to CI pipeline

**Files:** Root `test*.js` files, CI config

---

## P2 — Product Completeness (Perfect App Checklist)

### 32. README is still the default Tauri template

**Problem:** `README.md` says "Tauri + Vue + TypeScript" with no product description, features list, screenshots, or setup instructions for Select.

**Solution:**
Write a proper README with:
- What Select is (local-first MySQL/MariaDB SQL client)
- Features (query editor, schema browser, ER diagram, data grid editing, saved queries, history)
- Screenshots
- Build/run instructions
- Supported platforms
- Roadmap link to this `todo.md`

**Files:** `README.md`

---

### 33. No export/import for connections

**Problem:** Connections are stored locally but there's no way to export them (for backup or team sharing) or import from another machine.

**Solution:**
- Add "Export connections" → JSON file (passwords encrypted)
- Add "Import connections" → merge or replace
- Warn user that exported file contains encrypted credentials

**Files:** `src/components/ConnectionManager.vue`, `src-tauri/src/commands.rs`

---

### 34. No query execution plan visualizer

**Problem:** `EXPLAIN` results render as a plain table. No visual plan tree, no cost highlighting, no index usage warnings.

**Solution:**
- Detect `EXPLAIN` / `EXPLAIN ANALYZE` output format
- Render as an indented tree view with cost badges
- Highlight full table scans in red, index usage in green

**Files:** `src/components/ResultPanel.vue` (new `ExplainView` component)

---

### 35. No keyboard shortcut reference

**Problem:** `useKeyboardShortcuts.ts` defines shortcuts but there's no in-app way to discover them.

**Solution:**
- Add `Cmd+?` / `Ctrl+?` to open a shortcuts cheat sheet dialog
- List: Run query, New tab, Close tab, Format SQL, Toggle sidebar, etc.

**Files:** `src/composables/useKeyboardShortcuts.ts`, new `ShortcutsDialog.vue`

---

### 36. Pinned query results lost on restart

**Problem:** `result.ts` pinned results are session-only. Users who pin a result for reference lose it when the app restarts.

**Solution:**
- Persist pins to Tauri store (limit to last 10, store SQL + snapshot metadata)
- Restore on startup with a "Re-run to refresh" action

**Files:** `src/stores/result.ts`, `src/stores/storage.ts`

---

### 37. No SQL formatter built in

**Problem:** Users expect a SQL client to format/beautify queries. No format action exists.

**Solution:**
- Add "Format SQL" button and `Cmd+Shift+F` shortcut
- Use a lightweight formatter (e.g. `sql-formatter` package) in the renderer
- Format only the selected text or entire buffer

**Files:** `src/components/QueryEditor.vue`

---

### 38. No dark/light mode for the app shell (only editor themes)

**Problem:** The app shell uses CSS variables but there's no user-facing toggle for light mode. Editor has 40+ themes but the surrounding UI is always dark.

**Solution:**
- Add light/dark/system toggle in settings or status bar
- Ensure all shadcn components respect the theme class on `<html>`

**Files:** `src/stores/ui.ts`, `src/App.vue`

---

### 39. No undo for data grid cell edits

**Problem:** `TableDataViewer.vue` allows inline cell editing but there's no undo/redo stack. A mistaken edit is immediately committed or hard to revert.

**Solution:**
- Track edit history per cell: `[{row, col, oldValue, newValue}]`
- `Cmd+Z` undoes last edit before commit
- Show dirty indicator on modified cells (may already exist — verify and wire undo)

**Files:** `src/components/TableDataViewer.vue`

---

### 40. No connection health indicator / auto-reconnect

**Problem:** If the MySQL server drops the connection (timeout, restart), the app shows a generic error on the next query. No proactive health check or reconnect flow.

**Solution:**
- Periodic `SELECT 1` ping (every 60s when idle)
- On failure: show banner "Connection lost" with "Reconnect" button
- Auto-reconnect once on query failure before showing error

**Files:** `src/stores/connection.ts`, `src/components/StatusBar.vue`

---

## Suggested Fix Order

| Phase | Items | Status | Goal |
|-------|-------|--------|------|
| **Week 1** | 1, 2, 3 | **Completed** | Stop app-breaking bugs |
| **Week 2** | 4, 5, 6, 7 | Pending | Close security holes |
| **Week 3** | 8, 9, 10, 11, 12 | Pending | Performance & caching |
| **Week 4** | 16, 17, 18, 19, 20, 21 | Pending | UX honesty & error states |
| **Week 5** | 23, 24, 29, 30 | Pending | Architecture & tests |
| **Ongoing** | 32–40 | Pending | Product completeness |

---

*Generated from codebase audit on 2026-08-15. Re-audit after major refactors.*
