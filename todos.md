# Select — Product Backlog

**Legend:** `[x]` = done, `[ ]` = pending

---

## Phase 1 — Make V1 real

### [P0] TODO 1: Restrict to MySQL/MariaDB only
- [x] Backend validates dbType
- [x] UI shows only MySQL/MariaDB in connection type dropdown
- [x] README says "V1 supports MySQL/MariaDB"
- [x] User cannot create fake Postgres/Mongo connection

### [P0] TODO 2: Paged result fetching with infinite scroll
- [x] Backend: paged queries accept `limit`, `offset`
- [x] Backend returns `hasMore`, `offset`, `limit`
- [x] Frontend default page size with infinite scroll near bottom
- [x] Limit dropdown: 50 / 100 / 200 / 500
- [x] Show "Rows: N returned" counter
- [x] Don't double-append LIMIT if query already has one (top-level LIMIT detection)
- [ ] Fetch Next / Fetch All buttons in result toolbar (Fetch All + confirmation for large sets)
- [ ] Custom page size entry (up to 5000 / No limit)

### [P0] TODO 3: Editable result grid with primary key safety
- [x] Detect single-table queries via column metadata (`orgTable`)
- [x] Double-click cell to edit
- [x] Track dirty cells with indicator + amber review bar
- [x] Save / Revert actions (`batch_update_rows`, revert all)
- [x] Block editing on read-only connections
- [x] Virtual unique keys for PK-less tables
- [x] Deterministic UPDATE (`ORDER BY pk … LIMIT 1`)
- [ ] Confirmation dialog before applying changes
- [ ] Copy UPDATE SQL without executing
- [ ] Hard-block editing when no PK/unique/virtual key (currently falls back to all-columns match)

### [P0] TODO 4: Proper copy system (cell/row/range)
- [x] Right-click: Copy cell, row as JSON, row as INSERT, selected as TSV
- [x] Cmd+C = copy selection as TSV
- [x] Backend-formatted CSV/TSV/JSON export with JS fallback

### [P0] TODO 5: Schema-aware autocomplete
- [x] Context-aware (FROM → tables, alias → columns, dot-triggers)
- [x] FK-aware JOIN condition proposals
- [x] Suggestions show type info + row counts
- [x] Auto-alias suggestions (`order_items oi`)
- [x] Backtick-aware completion (quote-preserving insertion, no broken aliases inside `` ` ``)

### [P0] TODO 6: Schema explorer upgrade
- [x] Sections: Tables / Views / Functions / Procs / Indexes / Saved Queries
- [x] Row estimates, schema inspector (columns, PKs, indexes, constraints, DDL)
- [x] Right-click: Open data, Copy name, View DDL, Visualize Relations
- [x] ER diagram canvas (global + focused, pan/zoom/drag)
- [ ] Column right-click: Add to SELECT/WHERE/ORDER BY

### [P0] TODO 7: Destructive query detection
- [x] Detect mutating statements outside literals/comments
- [x] Confirmation dialog before dangerous queries
- [x] Stronger warning for DELETE/UPDATE without WHERE
- [x] Connection-level read-only mode enforced at 3 layers
- [x] Validator understands keyword-named identifiers (`SELECT * FROM load` ≡ `` FROM `load` ``)
- [x] Blocked: reserved verbs everywhere, non-reserved only outside identifier positions
- [x] `INTO OUTFILE/DUMPFILE` blocked
- [ ] Per-connection "block DROP/TRUNCATE" toggle
- [ ] Auto-rollback option

---

## Phase 2 — Make it powerful

### [P1] Done
- [x] Virtualized unified grid (rows, sticky header, resizable + auto-fit columns persisted)
- [x] Tri-state sort, quick search, per-column filters
- [x] Keyboard navigation + anchor/range selection
- [x] NULL styling, boolean pills, color swatches, status chips, binary placeholders
- [x] Large Value Inspector (JSON pretty-print/edit, wrap, size, apply-back)
- [x] Multi-statement execution with per-statement result tabs
- [x] EXPLAIN plan view
- [x] Messages + query history views (click-to-rerun, capped at 100)
- [x] Pinned result snapshots (max 10, persisted)
- [x] Query tabs with session restore (max 20, per-tab editor state)
- [x] Saved queries as .sql files (custom dir picker, rename/delete, legacy JSON migration)
- [x] Connection profiles: SSL modes, read-only, URI import, env colors, recents, import/export
- [x] Passwords sealed with AES-256-GCM; **key stored in OS keychain** (legacy files migrated automatically; file fallback for headless Linux)
- [x] FK peek popover in data grid (referenced record preview)
- [x] Command palette (~100 commands) + shortcuts cheat sheet
- [x] 44-theme gallery (live preview, favorites, custom/import/export)
- [x] Sound feedback (cuelume) with mute
- [x] Processlist view + KILL session

---

## Phase 3 — Make it serious

- [x] Stop/cancel running query (`KILL QUERY` via tracked thread IDs)
- [x] 600s query timeout, 10k row safety cap (with proper connection draining)
- [x] Global Esc overlay priority, focus pane shortcuts
- [ ] Global search across connections/tables/columns/history/snippets
- [ ] Snippets/templates with {{variable}} support

---

## Security & Robustness Hardening (session: 2026-08)

- [x] CSP enabled (strict, `'self'` + inline styles + Google Fonts hosts); dev CSP allows HMR websocket
- [x] Credential redaction in query history (`PASSWORD`, `IDENTIFIED`, `SECRET`, `TOKEN`, `CREDENTIAL` statements get literals masked before disk write)
- [x] Result-set drain fix — hitting row/page caps no longer poisons pooled connections
- [x] `select_folder` native dialog moved off async workers (`spawn_blocking`)
- [x] Read-only validator: dot-aware tokenizer, two-tier keyword classification, identifier-context exemptions (security-reviewed)
- [x] `fixBacktickedIdentifiers` only rewrites strict identifier parts (won't mangle special-char dotted names)
- [x] `isInCommentOrString` tracks backticks so quotes inside `` `it's` `` don't break ctrl-click navigation
- [x] Removed dead code: TableDataViewer (1.3k lines), SchemaSection, ShaderGradient, ConnectionSwitcherPopover, `has_single_statement`
- [x] StatusBar shows real dbType (MariaDB no longer labeled MySQL); dead transaction banner removed
- [x] Command palette "Save Query to Snippets" crash fixed
- [x] Regression tests: validator contexts, top-level LIMIT detection, history redaction, UPDATE builder, backtick completion, sqlScope scanner

### Remaining hardening ideas
- [ ] Self-host Inter/JetBrains Mono fonts (drop Google Fonts dependency entirely; then remove the two font hosts from CSP)
- [ ] E2E smoke suite (playwright is installed, zero specs exist)
- [ ] Component tests: QueryEditor, CommandPalette, ConnectionManager, ResultPanel internals
- [ ] Optional: per-query "exclude from history" privacy toggle
