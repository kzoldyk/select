<template>
  <div class="result-panel">
    <!-- Result tab bar -->
    <div class="result-tabs" role="tablist">
      <button
        v-for="view in VIEWS"
        :key="view.id"
        class="result-tab"
        :class="{ active: resultStore.activeView === view.id }"
        role="tab"
        :aria-selected="resultStore.activeView === view.id"
        @click="resultStore.setActiveView(view.id as ResultView)"
      >{{ view.label }}</button>

      <div class="result-tabs-right">
        <span class="result-meta" v-if="resultStore.status === 'success'">
          {{ resultStore.rowCount }} rows · {{ resultStore.duration }}ms
        </span>
        <span class="result-meta running" v-else-if="resultStore.status === 'running'">Running…</span>
        <button
          id="export-csv-btn"
          class="ghost-btn"
          style="font-size:10px; padding: 2px 7px;"
          aria-label="Export results as CSV (⌘E)"
          @click="resultStore.exportCsv()"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export CSV
        </button>
      </div>
    </div>

    <!-- Filter bar (table view only) -->
    <div v-if="resultStore.activeView === 'table'" class="filter-bar">
      <input
        id="result-search"
        class="input-base filter-input"
        type="text"
        placeholder="Search results…"
        aria-label="Search results"
        v-model="rawSearch"
        @input="onSearch"
      />
      <select
        id="col-filter"
        class="input-base col-filter"
        aria-label="Filter by column"
        v-model="filterCol"
      >
        <option value="">All columns</option>
        <option v-for="col in resultStore.columns" :key="col.name" :value="col.name">
          {{ col.name }}
        </option>
      </select>
      <div class="filter-right">
        <button
          id="new-row-btn"
          class="ghost-btn"
          style="font-size:11px;"
          aria-label="Add new row"
        >+ New row</button>
        <button
          v-if="resultStore.hasSelection"
          id="delete-selected-btn"
          class="danger-btn"
          :aria-label="`Delete ${resultStore.selectionCount} selected rows`"
          @click="resultStore.deleteSelected()"
        >Delete {{ resultStore.selectionCount }} rows</button>
      </div>
    </div>

    <!-- TABLE VIEW -->
    <div v-if="resultStore.activeView === 'table'" class="table-wrapper" role="region" aria-label="Query results">
      <table class="result-table">
        <thead>
          <tr>
            <th class="checkbox-col" scope="col">
              <input
                type="checkbox"
                :checked="allSelected"
                @change="toggleAll"
                aria-label="Select all rows"
              />
            </th>
            <th
              v-for="col in resultStore.columns"
              :key="col.name"
              scope="col"
              class="sortable"
              :aria-sort="getSortAria(col.name)"
              @click="sortBy(col.name)"
            >
              <div class="th-inner">
                {{ col.name }}
                <span class="sort-arrow" v-if="sortCol === col.name">
                  {{ sortDir === 'asc' ? '↑' : '↓' }}
                </span>
              </div>
            </th>
            <th class="actions-col" scope="col"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, i) in filteredRows"
            :key="i"
            class="result-row"
            :class="{ selected: resultStore.selectedRows.has(String(i)) }"
          >
            <td class="checkbox-col">
              <input
                type="checkbox"
                :checked="resultStore.selectedRows.has(String(i))"
                @change="resultStore.toggleRowSelection(String(i))"
                :aria-label="`Select row ${i + 1}`"
              />
            </td>
            <td
              v-for="col in resultStore.columns"
              :key="col.name"
              :class="getCellClass(row[col.name], col)"
            >
              <template v-if="row[col.name] === null">
                <span class="null-val">NULL</span>
              </template>
              <template v-else-if="col.name === 'status'">
                <span class="status-badge" :class="String(row[col.name]).toLowerCase()">
                  {{ row[col.name] }}
                </span>
              </template>
              <template v-else-if="col.type === 'boolean'">
                <span :class="row[col.name] ? 'bool-true' : 'bool-false'">
                  {{ row[col.name] ? 'true' : 'false' }}
                </span>
              </template>
              <template v-else>
                <span
                  class="cell-content"
                  :title="String(row[col.name]).length > 50 ? String(row[col.name]) : undefined"
                >{{ formatCell(row[col.name], col) }}</span>
              </template>
            </td>
            <td class="actions-col">
              <div class="row-actions">
                <button class="row-action edit" aria-label="Edit row">Edit</button>
                <button class="row-action del" aria-label="Delete row">Del</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="filteredRows.length === 0" class="empty-state">
        No results match your filter.
      </div>
    </div>

    <!-- JSON VIEW -->
    <div v-else-if="resultStore.activeView === 'json'" class="json-view">
      <div class="json-toolbar">
        <span class="text-dim text-10">JSON</span>
        <button class="ghost-btn" style="font-size:10px; padding:2px 7px;" @click="copyJson" aria-label="Copy JSON">Copy</button>
      </div>
      <pre class="json-content" v-html="highlightedJson"></pre>
    </div>

    <!-- EXECUTION PLAN VIEW -->
    <div v-else-if="resultStore.activeView === 'plan'" class="plan-view">
      <div class="plan-nodes">
        <div class="plan-node hash-join">
          <div class="plan-node-header">
            <span class="plan-op">Hash Join</span>
            <span class="cost-badge expensive">cost: 4821.3</span>
          </div>
          <div class="plan-detail">Rows: 50 · Actual: 47ms</div>
          <div class="plan-children">
            <div class="plan-connector"></div>
            <div class="plan-children-row">
              <div class="plan-node seq-scan">
                <div class="plan-node-header">
                  <span class="plan-op">Seq Scan</span>
                  <span class="cost-badge fast">cost: 0.00</span>
                </div>
                <div class="plan-detail">on users · Rows: 42000</div>
              </div>
              <div class="plan-node idx-scan">
                <div class="plan-node-header">
                  <span class="plan-op">Index Scan</span>
                  <span class="cost-badge fast">cost: 8.41</span>
                </div>
                <div class="plan-detail">idx_orders_user_id · Rows: 50</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MESSAGES VIEW -->
    <div v-else-if="resultStore.activeView === 'messages'" class="messages-view">
      <div
        v-for="(msg, i) in resultStore.messages"
        :key="i"
        class="message-line"
        :class="{ error: resultStore.status === 'error' }"
      >{{ msg }}</div>
      <div v-if="resultStore.error" class="message-line error">
        [{{ resultStore.error.code }}] {{ resultStore.error.message }}
      </div>
      <div v-if="!resultStore.messages.length && !resultStore.error" class="message-line info">
        No messages.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useResultStore, type ResultView, type Column, type CellValue, type ResultRow } from '../stores/result'

const resultStore = useResultStore()

const VIEWS = [
  { id: 'table',    label: 'Table' },
  { id: 'json',     label: 'JSON' },
  { id: 'plan',     label: 'Execution Plan' },
  { id: 'messages', label: 'Messages' },
] as const

// Filter
const rawSearch = ref('')
const filterCol = ref('')
let searchTimer: ReturnType<typeof setTimeout> | null = null
const searchQuery = ref('')

function onSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { searchQuery.value = rawSearch.value }, 150)
}

// Sort
const sortCol = ref('')
const sortDir = ref<'asc' | 'desc' | ''>('')

function sortBy(col: string) {
  if (sortCol.value === col) {
    sortDir.value = sortDir.value === '' ? 'asc' : sortDir.value === 'asc' ? 'desc' : ''
    if (sortDir.value === '') sortCol.value = ''
  } else {
    sortCol.value = col
    sortDir.value = 'asc'
  }
}

function getSortAria(col: string) {
  if (sortCol.value !== col) return 'none'
  return sortDir.value === 'asc' ? 'ascending' : 'descending'
}

const filteredRows = computed<ResultRow[]>(() => {
  let rows = [...resultStore.rows]

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    rows = rows.filter(row => {
      const cols = filterCol.value
        ? [filterCol.value]
        : resultStore.columns.map(c => c.name)
      return cols.some(c => String(row[c] ?? '').toLowerCase().includes(q))
    })
  }

  if (sortCol.value && sortDir.value) {
    const col = sortCol.value
    const dir = sortDir.value
    rows.sort((a, b) => {
      const av = a[col]; const bv = b[col]
      if (av === null) return 1; if (bv === null) return -1
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return dir === 'asc' ? cmp : -cmp
    })
  }

  return rows
})

// Select all
const allSelected = computed(() =>
  filteredRows.value.length > 0 &&
  filteredRows.value.every((_, i) => resultStore.selectedRows.has(String(i)))
)

function toggleAll() {
  if (allSelected.value) {
    resultStore.clearSelection()
  } else {
    resultStore.selectAllRows()
  }
}

// Cell formatting
function getCellClass(val: CellValue, col: Column): string {
  if (val === null) return 'td-null'
  if (col.type === 'integer' || col.type === 'numeric') return 'td-number'
  if (col.type === 'timestamp') return 'td-timestamp'
  if (col.type === 'boolean') return ''
  return ''
}

function formatCell(val: CellValue, _col: Column): string {
  if (val === null) return 'NULL'
  const s = String(val)
  if (s.length > 50) return s.slice(0, 50) + '…'
  return s
}

// JSON view
const highlightedJson = computed(() => {
  const json = JSON.stringify(resultStore.rows, null, 2)
  return json
    .replace(/(".*?")(: )/g, '<span class="jk">$1</span>$2')
    .replace(/: (".*?")/g, ': <span class="js">$1</span>')
    .replace(/: (\d+\.?\d*)/g, ': <span class="jn">$1</span>')
    .replace(/: (true|false)/g, ': <span class="jb $1">$1</span>')
    .replace(/: (null)/g, ': <span class="jnull">$1</span>')
})

function copyJson() {
  navigator.clipboard.writeText(JSON.stringify(resultStore.rows, null, 2))
}
</script>

<style scoped>
.result-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg);
  min-height: 0;
}

/* Result tabs */
.result-tabs {
  display: flex;
  align-items: stretch;
  height: 30px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  overflow: hidden;
}
.result-tab {
  display: flex;
  align-items: center;
  padding: 0 12px;
  background: transparent;
  border: none;
  border-right: 1px solid var(--border);
  color: var(--text-muted);
  font-size: 11px;
  font-family: 'Inter', sans-serif;
  cursor: pointer;
  position: relative;
  white-space: nowrap;
  transition: color 0.1s;
}
.result-tab:hover { color: var(--text); }
.result-tab.active {
  color: var(--text);
  background: var(--bg);
}
.result-tab.active::after {
  content: '';
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 2px;
  background: var(--green);
}
.result-tabs-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 8px;
  border-left: 1px solid var(--border);
}
.result-meta {
  font-size: 10px;
  color: var(--text-dim);
  font-family: 'Inter', sans-serif;
  white-space: nowrap;
}
.result-meta.running { color: var(--amber); }

/* Filter bar */
.filter-bar {
  display: flex;
  align-items: center;
  height: 30px;
  padding: 0 8px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  gap: 6px;
  flex-shrink: 0;
}
.filter-input { width: 180px; }
.col-filter { width: 120px; }
.filter-right { margin-left: auto; display: flex; gap: 6px; align-items: center; }

/* Table */
.table-wrapper {
  flex: 1;
  overflow: auto;
  min-height: 0;
}
.result-table {
  width: 100%;
  border-collapse: collapse;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
}
thead th {
  background: var(--surface);
  color: var(--text-muted);
  font-weight: 500;
  font-size: 11px;
  padding: 4px 10px;
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 1;
  user-select: none;
  white-space: nowrap;
}
thead th.sortable { cursor: pointer; }
thead th.sortable:hover { color: var(--text); }
.th-inner { display: flex; align-items: center; gap: 4px; }
.sort-arrow { color: var(--blue); font-size: 10px; }

.checkbox-col { width: 30px; text-align: center; padding: 4px 6px !important; }
input[type="checkbox"] { accent-color: var(--blue); cursor: pointer; }

.actions-col { width: 80px; }
tbody tr {
  background: var(--bg);
  border-bottom: 1px solid var(--border);
}
tbody tr:hover { background: var(--row-hover); }
tbody tr:hover .row-actions { opacity: 1; }
tbody tr.selected {
  background: #1D2A3A;
  border-left: 1px solid var(--blue);
}
tbody td { padding: 4px 10px; color: var(--text); }

/* Cell types */
.td-number { color: #93C5FD; }
.td-timestamp { color: #FCD34D; }
.td-null .null-val { color: var(--text-dim); font-style: italic; }
.bool-true { color: var(--green); }
.bool-false { color: var(--red); }
.cell-content { display: block; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.status-badge {
  font-size: 9px;
  padding: 1px 5px;
  border-radius: 3px;
  font-family: 'Inter', sans-serif;
  font-weight: 500;
}
.status-badge.active { background: #14532D; color: #86EFAC; }
.status-badge.inactive { background: #1A1A2E; color: var(--text-muted); }

.row-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  justify-content: flex-end;
  transition: opacity 0.1s;
}
.row-action {
  background: transparent;
  border: 1px solid var(--border-2);
  color: var(--text-muted);
  padding: 2px 5px;
  border-radius: 3px;
  font-size: 10px;
  font-family: 'Inter', sans-serif;
  cursor: pointer;
}
.row-action.edit:hover { border-color: var(--blue); color: var(--blue); }
.row-action.del:hover  { border-color: var(--red);  color: var(--red);  }

.empty-state {
  padding: 20px;
  text-align: center;
  color: var(--text-dim);
  font-size: 11px;
  font-family: 'Inter', sans-serif;
}

/* JSON view */
.json-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg);
}
.json-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  flex-shrink: 0;
}
.json-content {
  flex: 1;
  overflow: auto;
  padding: 12px 16px;
  margin: 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  line-height: 18px;
  color: var(--text);
  white-space: pre;
}

.json-content :deep(.jk) { color: #93C5FD; }
.json-content :deep(.js) { color: #FCD34D; }
.json-content :deep(.jn) { color: #FCA5A5; }
.json-content :deep(.jb) { }
.json-content :deep(.jb.true)  { color: #22C55E; }
.json-content :deep(.jb.false) { color: #EF4444; }
.json-content :deep(.jnull) { color: var(--text-dim); font-style: italic; }

/* Plan view */
.plan-view {
  flex: 1;
  overflow: auto;
  padding: 16px;
}
.plan-nodes { display: flex; flex-direction: column; align-items: center; }
.plan-node {
  border: 1px solid var(--border-2);
  border-radius: 4px;
  padding: 8px 12px;
  min-width: 220px;
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
}
.plan-node.seq-scan  { background: #1D2939; }
.plan-node.idx-scan  { background: #1E2A3A; }
.plan-node.hash-join { background: #1E2933; }
.plan-node-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.plan-op { color: var(--text); font-weight: 500; font-size: 11px; }
.cost-badge {
  font-size: 9px;
  padding: 1px 5px;
  border-radius: 3px;
  font-family: 'Inter', sans-serif;
}
.cost-badge.expensive { background: rgba(245,158,11,0.15); color: var(--amber); border: 1px solid rgba(245,158,11,0.3); }
.cost-badge.fast      { background: rgba(34,197,94,0.1);  color: var(--green);  border: 1px solid rgba(34,197,94,0.2); }
.plan-detail { color: var(--text-muted); font-size: 10px; }
.plan-children { display: flex; flex-direction: column; align-items: center; margin-top: 4px; }
.plan-connector { width: 1px; height: 20px; background: var(--border-2); }
.plan-children-row { display: flex; gap: 24px; }

/* Messages view */
.messages-view {
  flex: 1;
  overflow: auto;
  padding: 12px 16px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  line-height: 18px;
}
.message-line { color: var(--text-muted); margin-bottom: 4px; }
.message-line.error { color: var(--red); }
.message-line.info  { color: var(--text-dim); }
</style>
