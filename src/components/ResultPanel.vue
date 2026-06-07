<template>
  <div class="flex flex-col overflow-hidden bg-background min-h-0 flex-1">
    <Tabs v-model="resultStore.activeView" class="flex-1 flex flex-col overflow-hidden min-h-0">
      <div class="flex items-stretch h-7 bg-muted/30 border-b border-border flex-shrink-0 overflow-hidden">
        <TabsList class="h-full bg-transparent p-0 rounded-none">
          <TabsTrigger
            v-for="view in VIEWS"
            :key="view.id"
            :value="view.id"
            class="inline-flex items-center px-3 h-full text-[11px] text-muted-foreground data-[state=active]:text-foreground data-[state=active]:bg-background data-[state=active]:shadow-[inset_0_-2px_0_0_hsl(var(--primary))] rounded-none border-r border-border"
          >{{ view.label }}</TabsTrigger>
        </TabsList>
        <div class="ml-auto flex items-center gap-2 px-2 border-l border-border">
          <span v-if="resultStore.status === 'success'" class="text-[10px] text-muted-foreground whitespace-nowrap">
            {{ resultStore.rowCount }} rows &middot; {{ resultStore.duration }}ms
          </span>
          <span v-else-if="resultStore.status === 'running'" class="text-[10px] text-amber-500">Running&hellip;</span>
	          <Button
	            variant="ghost"
	            size="sm"
	            class="text-[10px] h-6 px-2 gap-1"
	            :disabled="!resultStore.columns.length"
	            @click="resultStore.exportCsv()"
	          >
            <Download class="w-3 h-3" /> CSV
          </Button>
        </div>
      </div>

      <TabsContent value="table" class="flex-1 flex flex-col overflow-hidden min-h-0 p-0 m-0">
        <div class="flex items-center h-7 px-2 bg-muted/20 border-b border-border gap-1.5 flex-shrink-0">
          <Input
            class="h-6 w-[180px] text-[11px]"
            placeholder="Search results&hellip;"
            aria-label="Search results"
            v-model="rawSearch"
            @input="onSearch"
          />
          <select
            class="h-6 w-[120px] rounded-md border border-input bg-background px-2 text-[11px] ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Filter by column"
            v-model="filterCol"
          >
            <option value="">All columns</option>
            <option v-for="col in resultStore.columns" :key="col.name" :value="col.name">{{ col.name }}</option>
          </select>
        </div>

        <ScrollArea class="flex-1 min-h-0">
          <Table>
            <TableHeader>
              <TableRow class="hover:bg-transparent">
                <TableHead class="w-[30px] text-center text-[10px]">
                  <input
                    type="checkbox"
                    :checked="allSelected"
                    @change="toggleAll"
                    aria-label="Select all rows"
                    class="accent-primary cursor-pointer"
                  />
                </TableHead>
                <TableHead
                  v-for="col in resultStore.columns"
                  :key="col.name"
                  class="text-[10px] font-medium text-muted-foreground cursor-pointer hover:text-foreground whitespace-nowrap"
                  :aria-sort="getSortAria(col.name)"
                  @click="sortBy(col.name)"
                >
                  <div class="inline-flex items-center gap-1">
                    {{ col.name }}
                    <span v-if="sortCol === col.name" class="text-[9px] text-primary">
                      {{ sortDir === 'asc' ? '\u2191' : '\u2193' }}
                    </span>
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="item in filteredRows"
                :key="item.key"
                class="text-[11px] font-mono"
                :class="{ 'bg-accent/30 border-l-2 border-l-primary': resultStore.selectedRows.has(item.key) }"
              >
                <TableCell class="text-center p-1">
                  <input
                    type="checkbox"
                    :checked="resultStore.selectedRows.has(item.key)"
                    @change="resultStore.toggleRowSelection(item.key)"
                    :aria-label="`Select row ${item.index + 1}`"
                    class="accent-primary cursor-pointer"
                  />
                </TableCell>
                <TableCell
                  v-for="col in resultStore.columns"
                  :key="col.name"
                  class="p-1.5 px-2 max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap"
                  :class="getCellClass(item.row[col.name], col)"
                >
                  <template v-if="item.row[col.name] === null">
                    <span class="italic text-muted-foreground">NULL</span>
                  </template>
                  <template v-else-if="col.name === 'status'">
                    <Badge variant="outline" class="text-[9px] px-1.5 py-0 font-mono" :class="statusBadgeClass(String(item.row[col.name]))">{{ item.row[col.name] }}</Badge>
                  </template>
                  <template v-else-if="col.type === 'boolean'">
                    <span :class="item.row[col.name] ? 'text-emerald-500' : 'text-red-500'">{{ item.row[col.name] ? 'true' : 'false' }}</span>
                  </template>
                  <template v-else>
                    <span :title="String(item.row[col.name]).length > 50 ? String(item.row[col.name]) : undefined">{{ formatCell(item.row[col.name], col) }}</span>
                  </template>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <div v-if="filteredRows.length === 0" class="py-6 text-center text-xs text-muted-foreground">
            No results match your filter.
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="json" class="flex-1 flex flex-col overflow-hidden min-h-0 p-0 m-0">
        <div class="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/20 flex-shrink-0">
          <span class="text-[10px] text-muted-foreground">JSON</span>
          <Button variant="ghost" size="sm" class="text-[10px] h-6 px-2" @click="copyJson">Copy</Button>
        </div>
        <ScrollArea class="flex-1 min-h-0">
          <pre class="p-4 text-xs font-mono leading-relaxed text-foreground whitespace-pre" v-html="highlightedJson"></pre>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="plan" class="flex-1 flex flex-col overflow-hidden min-h-0 p-0 m-0">
        <ScrollArea class="h-full">
          <Table v-if="resultStore.planRows.length">
            <TableHeader>
              <TableRow class="hover:bg-transparent">
                <TableHead
                  v-for="col in resultStore.planColumns"
                  :key="col.name"
                  class="text-[10px] font-medium text-muted-foreground whitespace-nowrap"
                >
                  {{ col.name }}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="(row, i) in resultStore.planRows" :key="i" class="text-[11px] font-mono">
                <TableCell
                  v-for="col in resultStore.planColumns"
                  :key="col.name"
                  class="p-1.5 px-2 max-w-[260px] overflow-hidden text-ellipsis whitespace-nowrap"
                  :title="row[col.name] === null ? undefined : String(row[col.name])"
                >
                  <span v-if="row[col.name] === null" class="italic text-muted-foreground">NULL</span>
                  <span v-else>{{ row[col.name] }}</span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <div v-else class="py-8 text-center text-xs text-muted-foreground">
            Run Explain to view the query plan.
          </div>
        </ScrollArea>
      </TabsContent>

      <TabsContent value="messages" class="flex-1 overflow-auto min-h-0 p-4 m-0">
        <div
          v-for="(msg, i) in resultStore.messages"
          :key="i"
          class="text-xs font-mono mb-1"
          :class="resultStore.status === 'error' ? 'text-red-500' : 'text-muted-foreground'"
        >{{ msg }}</div>
        <div v-if="resultStore.error" class="text-xs font-mono text-red-500 mb-1">
          [{{ resultStore.error.code }}] {{ resultStore.error.message }}
        </div>
        <div v-if="!resultStore.messages.length && !resultStore.error" class="text-xs font-mono text-muted-foreground">
          No messages.
        </div>
      </TabsContent>

      <TabsContent value="history" class="flex-1 flex flex-col overflow-hidden min-h-0 p-0 m-0">
        <div class="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/20 flex-shrink-0">
          <span class="text-[10px] text-muted-foreground">Recent queries</span>
          <Button
            variant="ghost"
            size="sm"
            class="text-[10px] h-6 px-2"
            @click="resultStore.loadHistory()"
          >Refresh</Button>
        </div>
        <ScrollArea class="flex-1 min-h-0">
          <div v-if="resultStore.history.length === 0" class="py-8 text-center text-xs text-muted-foreground">
            No query history yet.
          </div>
          <div
            v-for="item in resultStore.history"
            :key="item.id"
            class="flex items-start gap-2 px-3 py-2 border-b border-border hover:bg-accent/30 cursor-pointer transition-colors"
            @click="restoreHistorySql(item.sql)"
          >
            <span
              class="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
              :class="item.error ? 'bg-red-500' : 'bg-emerald-500'"
            ></span>
            <div class="flex-1 min-w-0">
              <div class="text-[11px] font-mono text-foreground truncate" :title="item.sql">{{ item.sql }}</div>
              <div class="flex items-center gap-2 text-[9px] text-muted-foreground mt-0.5">
                <span>{{ formatTime(item.executed_at) }}</span>
                <span>&middot;</span>
                <span>{{ item.duration_ms }}ms</span>
                <span v-if="item.row_count > 0">&middot; {{ item.row_count }} rows</span>
                <span v-if="item.error" class="text-red-400 truncate" :title="item.error">Error</span>
              </div>
            </div>
          </div>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Download } from '@lucide/vue'
import { useResultStore, type ResultView, type Column, type CellValue, type ResultRow } from '../stores/result'
import { useEditorStore } from '../stores/editor'

const resultStore = useResultStore()

const VIEWS = [
  { id: 'table',    label: 'Table' },
  { id: 'json',     label: 'JSON' },
  { id: 'plan',     label: 'Execution Plan' },
  { id: 'messages', label: 'Messages' },
  { id: 'history',  label: 'History' },
] as const

const rawSearch = ref('')
const filterCol = ref('')
let searchTimer: ReturnType<typeof setTimeout> | null = null
const searchQuery = ref('')

function onSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { searchQuery.value = rawSearch.value }, 150)
}

onMounted(() => resultStore.loadHistory())

onUnmounted(() => {
  if (searchTimer) clearTimeout(searchTimer)
})

const sortCol = ref('')
const sortDir = ref<'asc' | 'desc' | ''>('')
type FilteredRow = {
  key: string
  index: number
  row: ResultRow
}

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

const filteredRows = computed<FilteredRow[]>(() => {
  let rows = resultStore.rows.map((row, index) => ({ row, index, key: String(index) }))
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    rows = rows.filter(item => {
      const cols = filterCol.value ? [filterCol.value] : resultStore.columns.map(c => c.name)
      return cols.some(c => String(item.row[c] ?? '').toLowerCase().includes(q))
    })
  }
  if (sortCol.value && sortDir.value) {
    const col = sortCol.value
    const dir = sortDir.value
    rows.sort((a, b) => {
      const av = a.row[col]; const bv = b.row[col]
      if (av === null) return 1; if (bv === null) return -1
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return dir === 'asc' ? cmp : -cmp
    })
  }
  return rows
})

const allSelected = computed(() =>
  filteredRows.value.length > 0 &&
  filteredRows.value.every(item => resultStore.selectedRows.has(item.key))
)

function toggleAll() {
  if (allSelected.value) resultStore.clearSelection()
  else filteredRows.value.forEach(item => resultStore.selectedRows.add(item.key))
}

function getCellClass(val: CellValue, col: Column): string {
  if (val === null) return ''
  if (col.type === 'integer' || col.type === 'numeric') return 'text-blue-400'
  if (col.type === 'timestamp') return 'text-yellow-500'
  return ''
}

function formatCell(val: CellValue, _col: Column): string {
  if (val === null) return 'NULL'
  const s = String(val)
  if (s.length > 50) return s.slice(0, 50) + '\u2026'
  return s
}

function statusBadgeClass(val: string): string {
  const v = val.toLowerCase()
  if (v === 'active') return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
  if (v === 'inactive') return 'bg-muted text-muted-foreground border-border'
  return ''
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const highlightedJson = computed(() => {
  const json = JSON.stringify(resultStore.rows, null, 2)
  const escaped = escapeHtml(json)
  return escaped
    .replace(/(&quot;.*?&quot;)(: )/g, '<span class="text-blue-400">$1</span>$2')
    .replace(/: (&quot;.*?&quot;)/g, ': <span class="text-yellow-500">$1</span>')
    .replace(/: (\d+\.?\d*)/g, ': <span class="text-red-400">$1</span>')
    .replace(/: (true|false)/g, ': <span class="text-emerald-500">$1</span>')
    .replace(/: (null)/g, ': <span class="italic text-muted-foreground">$1</span>')
})

function copyJson() {
  navigator.clipboard.writeText(JSON.stringify(resultStore.rows, null, 2))
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch { return iso }
}

function restoreHistorySql(sql: string) {
  const editorStore = useEditorStore()
  if (editorStore.activeTabId) {
    editorStore.updateSql(editorStore.activeTabId, sql)
  }
}
</script>
