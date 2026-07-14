# Select — Product Backlog

**Legend:** `[x]` = done, `[ ]` = pending

---

## Phase 1 — Make V1 real

### [P0] TODO 1: Restrict to MySQL/MariaDB only
- [x] Backend validates dbType
- [ ] UI shows only MySQL/MariaDB in connection type dropdown
- [ ] README says "V1 supports MySQL/MariaDB"
- [ ] User cannot create fake Postgres/Mongo connection

### [P0] TODO 2: Paged result fetching with infinite scroll
- [ ] Backend: `run_query` accepts `limit`, `offset`, `mode`, `autoLimit`
- [ ] Backend returns `hasMore`, `totalFetched`, `appliedLimit`, `warning`
- [ ] Frontend: default row limit 200
- [ ] Infinite scroll: fetch next page when near bottom
- [ ] Limit dropdown: 100 / 200 / 500 / 1000 / 5000 / No limit / Custom
- [ ] Fetch Next / Fetch All buttons in result toolbar
- [ ] Show "Rows: 1-200 fetched" counter
- [ ] Don't double-append LIMIT if query already has one
- [ ] Fetch All shows confirmation warning for large sets
- [ ] Stop/cancel in-flight fetch

### [P0] TODO 3: Editable result grid with primary key safety
- [ ] Detect single-table, PK-present, non-aggregate queries
- [ ] Double-click cell to edit
- [ ] Track dirty cells with rose corner indicator
- [ ] Save / Revert buttons in toolbar
- [ ] Generate UPDATE SQL from pending changes
- [ ] Confirmation dialog before applying changes
- [ ] Copy UPDATE SQL without executing
- [ ] Block editing when no PK/unique key

### [P0] TODO 4: Proper copy system (cell/row/range)
- [ ] Right-click: Copy cell, Copy row as TSV/JSON, Copy selected as CSV/INSERT/UPDATE
- [ ] Cmd+C = copy selected as TSV
- [ ] Copy formats escape strings/nulls/dates correctly
- [ ] Copy pastes cleanly into Excel/Sheets

### [P0] TODO 5: Schema-aware autocomplete
- [ ] Level 1: keywords + table/column/schema names
- [ ] Level 2: context-aware (after FROM → tables, after SELECT → columns, after alias → that table's columns)
- [ ] Level 3: smart snippets (SELECT * FROM x LIMIT 200)
- [ ] Suggestions show icons + type info
- [ ] FK-aware JOIN suggestions
- [ ] Fast for large schemas

### [P0] TODO 6: Schema explorer upgrade
- [ ] Tree: Connection → Database → Tables/Views/Procedures/Functions/Events
- [ ] Per-table: columns, PKs, unique keys, indexes, FKs, triggers, row estimate, engine, collation
- [ ] Right-click: Open data, Generate SELECT/INSERT/UPDATE/DELETE, Copy name, Show DDL
- [ ] Column right-click: Copy name, Add to SELECT/WHERE/ORDER BY

### [P0] TODO 7: Destructive query detection
- [ ] Detect UPDATE/DELETE/DROP/TRUNCATE/ALTER/CREATE/INSERT/REPLACE
- [ ] Confirmation dialog before dangerous queries
- [ ] Stronger warning for DELETE/UPDATE without WHERE
- [ ] Connection-level read-only mode ON/OFF
- [ ] Block DROP/TRUNCATE option
- [ ] Auto rollback option

---

## Phase 2 — Make it powerful

### [P1] TODO 8: Professional grid behavior
- [ ] Virtualized rows + columns
- [ ] Sticky header, resizable/reorderable columns
- [ ] Hide/show columns
- [ ] Sort by column (server-side for tables, client-side fallback)
- [ ] Filter by column
- [ ] Search inside result
- [ ] Keyboard navigation (arrow keys, tab, enter)
- [ ] NULL styling, binary/blob placeholder, JSON viewer
- [ ] Long text: ellipsis + double-click full value panel

### [P1] TODO 9: Filter builder
- [ ] Column / Operator / Value UI
- [ ] Operators: =, !=, contains, starts with, >, <, IS NULL, IN, BETWEEN
- [ ] Client-side filter first, server-side when safe

### [P1] TODO 10: Column sort
- [ ] Click header: ASC → DESC → none
- [ ] Server-side ORDER BY for table queries
- [ ] Client-side sort fallback

### [P1] TODO 11: Query tabs with session restore
- [ ] Multiple editor tabs
- [ ] Rename, close, dirty indicator, duplicate, pin
- [ ] Restore tabs on app reopen
- [ ] Each tab tied to connection + database

### [P1] TODO 12: Query history
- [ ] Store every executed query (connection, database, duration, status, error, timestamp)
- [ ] History panel with search
- [ ] Re-run, copy, pin, delete
- [ ] Failed queries also stored
- [ ] Privacy setting to exclude sensitive queries

### [P1] TODO 13: SQL snippets/templates
- [ ] Built-in snippets: COUNT, recent rows, date range
- [ ] Custom snippets with {{variable}} support
- [ ] Insert via Command Palette or /snippet

### [P1] TODO 14: Generate SQL from schema/result
- [ ] From table: Generate SELECT/INSERT/UPDATE/DELETE/COUNT/DDL
- [ ] From row: Copy as INSERT/UPDATE/DELETE
- [ ] From edits: Copy pending UPDATE SQL

### [P1] TODO 15: Connection profiles
- [ ] Fields: Name, Type, Host, Port, Username, Password, Database, SSL, Read-only, Color, Environment
- [ ] Production: red badge, stronger confirmations, block destructive
- [ ] Secure password storage (OS keychain)

### [P1] TODO 16: Export result data
- [ ] Formats: CSV, TSV, JSON, SQL INSERT, Markdown table
- [ ] Scope: selected cells, selected rows, fetched rows, all rows
- [ ] CSV escaping: commas, quotes, newlines, nulls, dates
- [ ] Large export streaming

### [P1] TODO 17: Cell value viewer/editor
- [ ] Value panel: Raw, Formatted, JSON, Text, Binary
- [ ] JSON: pretty-print, collapse/expand, copy path
- [ ] Long text: full editor modal, word wrap, search

### [P1] TODO 18: Foreign key navigation
- [ ] Detect FK relationships from schema
- [ ] Cell context menu: View related records
- [ ] Opens related data in new tab

---

## Phase 3 — Make it serious

### [P2] TODO 19: Multiple statements
- [ ] Detect multi-statement queries
- [ ] Show multiple result tabs per statement

### [P2] TODO 20: Stop/cancel query
- [ ] Run | Stop UI with running timer
- [ ] Backend query cancellation

### [P2] TODO 21: Query timeout
- [ ] Connection-level timeout setting
- [ ] Default: 30s

### [P2] TODO 22: Execution plan
- [ ] EXPLAIN integration
- [ ] Visual plan display

### [P2] TODO 23: Command palette
- [ ] All actions accessible via Cmd+K
- [ ] Search, execute, show shortcuts

### [P2] TODO 24: Global search
- [ ] Search across connections, databases, tables, columns, history, snippets

### [P2] TODO 25: UI/UX polish
- [ ] Resizable panels, collapsible sidebar
- [ ] Status bar with connection/db/rows/time/read-only info
- [ ] Loading skeletons, empty states, error toasts
- [ ] Dark mode, rose accent, keyboard-first

---

## Completed (previous sessions)

### Security
- [x] SQL injection prevention via `sql_tokens_outside_literals`
- [x] Password redaction from error paths
- [x] Read-only SQL validator (SELECT, SHOW, DESCRIBE, EXPLAIN, WITH, TABLE, VALUES)
- [x] Blocked keywords: ALTER, ANALYZE, BEGIN, CALL, CHECK, COMMIT, CREATE, DEALLOCATE, DELETE, DROP, EXECUTE, FLUSH, GRANT, IMPORT, INSERT, INSTALL, KILL, LOAD, LOCK, MERGE, OPTIMIZE, PREPARE, PURGE, RENAME, REPAIR, REPLACE, RESET, REVOKE, ROLLBACK, SAVEPOINT, SET, START, STOP, TRUNCATE, UNINSTALL, UPDATE
- [x] Passwords encrypted at rest (AES-256-GCM)
- [x] Query timeout (30s)
- [x] 10K max result row cap
- [x] Multi-pool connection state with id tracking

### Core features
- [x] MySQL/MariaDB Rust backend (connect, query, schema, history, save/load queries, CSV export)
- [x] Connection manager (CRUD, test, connect, disconnect, change database)
- [x] Tabbed CodeMirror 6 SQL editor with per-tab EditorView isolation
- [x] Dark theme + SQL syntax highlighting
- [x] Custom autocomplete (tables, views, columns, keywords)
- [x] Format SQL, Explain, Run (Cmd+Enter, Cmd+Shift+Enter)
- [x] Save/rename/delete queries with UUID IDs
- [x] Unsaved changes confirmation
- [x] Cap max open tabs at 20

### Result panel
- [x] Tabular result view with sort, filter, column type colors
- [x] JSON view with syntax highlighting
- [x] Execution Plan tab
- [x] Messages tab
- [x] History tab with auto-refresh, click-to-restore SQL
- [x] CSV export with UTF-8 BOM
- [x] Column search/filter
- [x] NULL styling, boolean colors, status badges

### Schema
- [x] Sidebar tree: Tables, Views, Functions, Indexes, Saved Queries
- [x] Schema inspector sheet (columns, indexes, constraints, DDL)
- [x] Database selector
- [x] Search/filter tables
- [x] Right-click: Open tab, Copy name, View DDL
- [x] Row count display

### UI/UX
- [x] shadcn-vue / reka-ui / Tailwind CSS v4
- [x] Dark mode
- [x] Command palette (Cmd+K)
- [x] Keyboard shortcuts (~15 commands)
- [x] Status bar (connection, query status, cursor position)
- [x] Esc overlay prioritization fix
- [x] Resize handle pointer capture fix
- [x] Connection error toast on failed auto-connect
- [x] Sidebar collapse with transition

### Infrastructure
- [x] Pinia stores (connection, editor, result, schema, ui)
- [x] tauri-plugin-store persistence with localStorage fallback
- [x] shadcn-vue UI components library
- [x] Rust tests: 11 passing (validation, encryption, URL encoding)
