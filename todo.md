# Select — Master TODO & Bug Tracker

All items verified against the live codebase. Priority tiers reflect real user impact.

---

## P0 — App-Breaking & Crash Bugs

### 1. "Visualize Relations" causes infinite loop / app freeze `[FIXED]`

**Problem:** Clicking "Visualize Relations" or switching tabs to an active table triggered an infinite recursive loop in `SchemaDiagram.vue`. The load sequence was wiping `relations.value = []`, which shrunk `visibleTables`, triggering `watch(visibleTables)` to fire `loadSchemaDetails()` again indefinitely.

**Resolution:**
- Replaced `watch(visibleTables)` with targeted watcher on `[() => props.tableName, () => connStore.activeId, () => connStore.activeConnection?.database]`.
- Implemented load sequence tokens (`loadSequence`) to discard stale responses from aborted runs.
- Prevented wiping of `relations.value` at load start; relations are swapped atomically once resolved.
- Made `visibleTables` matching case-insensitive.
- Wrapped error states in `toast.error` from `vue-sonner`.

**Files:** `src/components/SchemaDiagram.vue`

---

### 2. Global schema diagram overwhelms connection pool on large databases `[FIXED]`

**Problem:** When opening the Schema Diagram without a selected table on databases with many tables, `SchemaDiagram.vue` fired `fetch_table_foreign_keys` for every table concurrently via `Promise.all` with no throttling, exhausting connection pools.

**Resolution:**
- Implemented `fetch_all_foreign_keys` Tauri command in Rust backend (`commands.rs`) that queries `information_schema.key_column_usage` in a single query.
- Registered command in `lib.rs`.
- Added `runWithConcurrency` batching helper in `SchemaDiagram.vue` for table column details and fallback FK fetches.

**Files:** `src/components/SchemaDiagram.vue`, `src-tauri/src/commands.rs`, `src-tauri/src/lib.rs`

---

### 3. Connection pool leak on connection switch `[FIXED]`

**Problem:** Switching active connections in the status bar or calling `connStore.connect(id)` replaced the active connection ID without disconnecting previous connection pools. In Rust, `connect` overwrote the pool map entry without disconnecting.

**Resolution:**
- Added automatic disconnect of `activeId` in `src/stores/connection.ts` when switching to a different ID.
- In `src-tauri/src/commands.rs`, `connect` now gracefully disconnects and removes any preexisting pool entry.
- Added comprehensive unit test in `src/stores/__tests__/connection.spec.ts`.

**Files:** `src/stores/connection.ts`, `src-tauri/src/commands.rs`, `src/stores/__tests__/connection.spec.ts`

---

## P1 — Security

### 4. Read-only connections don't block writes on the backend `[FIXED]`

**Problem:** `readOnly` was only checked on the frontend; mutating queries in `run_multi_query`, `run_write_query`, and `update_rows` were not blocked in Rust.

**Resolution:**
- Added `read_only: Option<bool>` to `ConnectionConfig` in Rust backend.
- Added `read_only_connections: Arc<Mutex<HashMap<String, bool>>>` in `AppState`.
- Enforced read-only checks across `run_multi_query`, `run_write_query`, and `update_rows`.
- Added frontend guard in `runMultiQuery()` in `src/stores/result.ts`.
- Added unit tests for read-only validation.

**Files:** `src-tauri/src/lib.rs`, `src-tauri/src/commands.rs`, `src/stores/result.ts`

---

### 5. `update_rows` uses string escaping instead of bound parameters `[FIXED]`

**Problem:** `commands.rs` `update_rows` manually escaped strings, creating SQL injection risks with complex data types.

**Resolution:**
- Refactored `update_rows` to use `mysql_async` parameterized execution (`exec_iter`) with positional bound parameters (`?`) and `mysql_async::Value` mapping.
- Quoted table and column identifiers with backticks.

**Files:** `src-tauri/src/commands.rs`

---

### 6. `encrypt_password` / `decrypt_password` exposed to renderer `[FIXED]`

**Problem:** Renderer called encryption and decryption commands directly.

**Resolution:**
- Removed `encrypt_password` / `decrypt_password` from the public IPC surface.
- Added `seal_connections_for_storage` and `unseal_connections_from_storage` batch commands in `commands/crypto.rs`.
- Frontend uses seal/unseal only during save/load; decryption never exposed as a per-password IPC.

**Files:** `src-tauri/src/commands/crypto.rs`, `src-tauri/src/lib.rs`, `src/stores/connection.ts`

---

### 7. Password encryption fallback stores plaintext `[FIXED]`

**Problem:** When password encryption failed, plaintext was stored silently.

**Resolution:**
- Removed plaintext fallback in `encryptConnections()`; errors propagate and block save.
- Load path surfaces decrypt failures via `lastError` instead of silently using ciphertext.

**Files:** `src/stores/connection.ts`

---

## P1 — Performance & Caching

### 8. Query history rewrites entire JSON file on every query `[FIXED]`

**Problem:** History file read/write cycle on every single execution.

**Resolution:**
- `HistoryCacheState` in `AppState` loads history once; `append_history` updates memory then persists.
- `get_history` reads from the in-memory cache.

**Files:** `src-tauri/src/commands/cache.rs`, `src-tauri/src/commands/db.rs`, `src-tauri/src/lib.rs`

---

### 9. Saved queries re-read all `.sql` files on every `load_queries` `[FIXED]`

**Problem:** Scanned files on every load call.

**Resolution:**
- `SavedQueriesCacheState` caches query list keyed by directory mtime.
- Cache invalidated on save, rename, delete, and custom directory change.

**Files:** `src-tauri/src/commands/db.rs`, `src-tauri/src/lib.rs`

---

### 10. Foreign key cache duplicated across three components `[FIXED]`

**Problem:** `ResultPanel.vue`, `TableDataViewer.vue`, and `SchemaDiagram.vue` maintained isolated local caches.

**Resolution:**
- Centralized FK caching into `schemaStore.foreignKeysByTable` and `schemaStore.fetchForeignKeys(tableName)`.
- Updated `ResultPanel.vue` and `TableDataViewer.vue` to use the unified cache.

**Files:** `src/stores/schema.ts`, `src/components/ResultPanel.vue`, `src/components/TableDataViewer.vue`

---

### 11. Schema refresh clears all cached table details `[FIXED]`

**Problem:** `refreshSchema()` in `schema.ts` wiped `detailsByTable = {}`, forcing re-fetch of every table.

**Resolution:**
- Diffed tables on refresh and preserved cached `TableDetails` for existing tables.

**Files:** `src/stores/schema.ts`

---

### 12. `schemaTablesCache` not cleared on `clearSchema()` `[FIXED]`

**Problem:** `clearSchema()` left `schemaTablesCache` intact.

**Resolution:**
- Added `this.schemaTablesCache = {}` and `this.foreignKeysByTable = {}` inside `clearSchema()`.

**Files:** `src/stores/schema.ts`

---

### 13. Deep clone of query results on every fetch `[FIXED]`

**Problem:** `JSON.parse(JSON.stringify(rows))` on every fetch slowed down large result sets.

**Resolution:**
- Replaced with `structuredClone` for fast native object cloning.

**Files:** `src/stores/result.ts`

---

### 14. Paged query fallback runs full query then skips rows in memory `[FIXED]`

**Problem:** Paged query fallback ran unbounded queries and discarded rows in memory.

**Resolution:**
- Wrapped query in subquery `SELECT * FROM (query) AS _sub LIMIT n OFFSET m` before falling back.

**Files:** `src-tauri/src/commands.rs`

---

### 15. Autocomplete rebuilds column index on every keystroke `[FIXED]`

**Problem:** `collectColumns()` re-iterated every column in `detailsByTable` on every single keystroke.

**Resolution:**
- Replaced with `computed(() => ...)` memoized `cachedColumns`.

**Files:** `src/components/QueryEditor.vue`

---

## P1 — UX Gaps & Honesty

### 16. SSH tunnel UI exists but is not implemented `[FIXED]`

**Problem:** SSH fields saved to model without backend tunnel support.

**Resolution:**
- Added transparent "Coming Soon" badge and disabled toggle with explanatory note.

**Files:** `src/components/ConnectionManager.vue`

---

### 17. Unix socket path saved but ignored `[FIXED]`

**Problem:** Unix socket option was ignored in connection builder.

**Resolution:**
- Added `socket_path` support to `get_connection_opts` in Rust backend.

**Files:** `src-tauri/src/commands.rs`

---

### 18. PostgreSQL schema selector shown but unsupported `[FIXED]`

**Problem:** Showed Postgres schema selector for MySQL connection.

**Resolution:**
- Cleaned up Sidebar header to focus exclusively on database selector and refresh controls.

**Files:** `src/components/Sidebar.vue`

---

### 19. Schema fetch errors are silent in the sidebar `[FIXED]`

**Problem:** `refreshSchema()` caught errors silently with empty tree.

**Resolution:**
- Added `schemaStore.schemaError` and rendered inline error banner with Retry action.

**Files:** `src/stores/schema.ts`, `src/components/Sidebar.vue`

---

### 20. No "Connect" CTA when disconnected `[FIXED]`

**Problem:** Sidebar empty state had no actionable button.

**Resolution:**
- Added prominent "Connect to Database" CTA button opening `ConnectionManager`.

**Files:** `src/components/Sidebar.vue`

---

### 21. `Tab.type` missing `schema_diagram` in TypeScript interface `[FIXED]`

**Problem:** `Tab` interface lacked `'schema_diagram'` union member.

**Resolution:**
- Updated `Tab` interface in `src/stores/editor.ts` to `type?: 'query' | 'table' | 'schema_diagram'`.

**Files:** `src/stores/editor.ts`

---

### 22. Version mismatch in UI vs package `[FIXED]`

**Problem:** Showed "Version 2.6.8" while package was `0.1.0`.

**Resolution:**
- Corrected version string in `ConnectionManager.vue` to `v0.1.0`.

**Files:** `src/components/ConnectionManager.vue`

---

## P2 — Architecture & Code Quality

### 23. Monolithic `commands.rs` structure `[FIXED]`

**Problem:** Command logic lived in single file.

**Resolution:**
- Split into `commands/mod.rs`, `commands/db.rs`, `commands/cache.rs`, and `commands/crypto.rs`.

**Files:** `src-tauri/src/commands/`

---

### 24. Centralized store invocation `[FIXED]`

**Problem:** Scattered direct IPC calls.

**Resolution:**
- Centralized foreign keys, schema caching, and table queries through Pinia stores.

**Files:** `src/stores/schema.ts`, `src/stores/connection.ts`

---

### 25. Storage synchronization documented `[FIXED]`

**Problem:** Storage ownership between Tauri store and localStorage.

**Resolution:**
- Documented data flow and storage architecture in `README.md`.

**Files:** `README.md`

---

### 26. Dead code: `fetchAllTableDetails()` `[FIXED]`

**Problem:** Unused method in `schema.ts`.

**Resolution:**
- Called automatically after successful `refreshSchema()` with batched concurrency (4 tables at a time).

**Files:** `src/stores/schema.ts`

---

### 27 & 28. Theme system consolidation `[FIXED]`

**Problem:** Dual theme systems and theme asset management.

**Resolution:**
- Integrated app-shell theme toggle in `StatusBar.vue` with CodeMirror editor theme registry.

**Files:** `src/components/StatusBar.vue`, `src/theme/manager.ts`

---

## P2 — Testing & Completeness

### 29. Component tests for critical UI flows `[FIXED]`

**Problem:** No component unit tests.

**Resolution:**
- Created `src/components/__tests__/Sidebar.spec.ts` and `src/components/__tests__/StatusBar.spec.ts`.

**Files:** `src/components/__tests__/Sidebar.spec.ts`, `src/components/__tests__/StatusBar.spec.ts`

---

### 30. Rust unit tests for IPC commands `[FIXED]`

**Problem:** Missing tests for unix sockets, read-only safety, and URL generation.

**Resolution:**
- Added 19 comprehensive unit tests in `src-tauri/src/commands.rs`.

**Files:** `src-tauri/src/commands.rs`

---

### 31. Ad-hoc test scripts cleaned up `[FIXED]`

**Problem:** Loose root test scripts (`test.js`, etc.).

**Resolution:**
- Cleaned up obsolete scripts; all tests now run via `npm test` and `cargo test`.

---

### 32. README is production-ready `[FIXED]`

**Problem:** Default template.

**Resolution:**
- Wrote full production README with features, architecture diagram, tech stack, and setup guide.

**Files:** `README.md`

---

### 33. Connection export/import polish `[FIXED]`

**Problem:** Connection backup/restore.

**Resolution:**
- Verified JSON export and import in `ConnectionManager.vue`.

**Files:** `src/components/ConnectionManager.vue`

---

### 34. Query execution plan visualizer `[FIXED]`

**Problem:** Basic EXPLAIN rendering.

**Resolution:**
- Polished plan rendering with duration, rows affected, and formatted execution plan.

**Files:** `src/stores/result.ts`, `src/components/ResultPanel.vue`

---

### 35. Keyboard shortcut reference `[FIXED]`

**Problem:** Shortcut discoverability.

**Resolution:**
- Available in status bar and via dialog (`KeyboardShortcuts.vue`).

**Files:** `src/components/KeyboardShortcuts.vue`

---

### 36. Pinned query results persistence `[FIXED]`

**Problem:** Pins lost on app reload.

**Resolution:**
- Persisted up to 10 pinned results in local storage with automatic recovery on init.

**Files:** `src/stores/result.ts`

---

### 37. SQL Formatter built in `[FIXED]`

**Problem:** Formatting queries.

**Resolution:**
- Built into `QueryEditor.vue` via `sql-formatter` with `Cmd+Shift+F`.

**Files:** `src/components/QueryEditor.vue`

---

### 38. Dark/light app shell theme toggle `[FIXED]`

**Problem:** App shell theme toggle.

**Resolution:**
- Built into `StatusBar.vue` (`toggleTheme`).

**Files:** `src/components/StatusBar.vue`

---

### 39. Undo for data grid cell edits `[FIXED]`

**Problem:** No undo for inline edits.

**Resolution:**
- Added undo stack and `Undo` button in `TableDataViewer.vue`.

**Files:** `src/components/TableDataViewer.vue`

---

### 40. Connection health indicator / ping `[FIXED]`

**Problem:** No proactive health check.

**Resolution:**
- `ping()` runs `SELECT 1` in `connection.ts`.
- Status bar polls every 60s when connected; dot turns red when connection is lost.

**Files:** `src/stores/connection.ts`, `src/components/StatusBar.vue`

---

## Suggested Fix Order

| Phase | Items | Status | Goal |
|-------|-------|--------|------|
| **Week 1** | 1, 2, 3 | **Completed** | Stop app-breaking bugs |
| **Week 2** | 4, 5, 6, 7 | **Completed** | Close security holes |
| **Week 3** | 8, 9, 10, 11, 12 | **Completed** | Performance & caching |
| **Week 4** | 16, 17, 18, 19, 20, 21 | **Completed** | UX honesty & error states |
| **Week 5** | 23, 24, 29, 30 | **Completed** | Architecture & tests |
| **Ongoing** | 32–40 | **Completed** | Product completeness |

---

*Generated from codebase audit on 2026-08-15.*
