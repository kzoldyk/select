<template>
  <div class="flex flex-col overflow-hidden bg-background min-h-0 flex-1">
    <Tabs v-model="resultStore.activeView" class="flex-1 flex flex-col overflow-hidden min-h-0">
      <div class="flex items-center h-10 bg-background border-b border-border flex-shrink-0 overflow-hidden px-2 justify-between">
        <TabsList class="h-8 bg-muted/40 p-0.5 rounded-md gap-0.5">
          <TabsTrigger
            v-for="view in VIEWS"
            :key="view.id"
            :value="view.id"
            class="inline-flex items-center px-3 h-full text-[11px] font-medium text-muted-foreground data-[state=active]:text-foreground data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-sm transition-all"
          >{{ view.label }}</TabsTrigger>
        </TabsList>

        <div class="flex items-center gap-2">
          <template v-if="hasDirtyEdits">
            <Button
              variant="ghost"
              size="sm"
              class="text-[11px] h-7 px-3 gap-1.5 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10 rounded-md transition-colors"
              :disabled="resultStore.savingEdits"
              @click="resultStore.revertAllEdits()"
            >Revert</Button>
            <Button
              size="sm"
              class="text-[11px] h-7 px-3 gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md shadow-sm transition-colors"
              :disabled="resultStore.savingEdits || !editableTableName"
              @click="saveEdits"
            >
              <template v-if="resultStore.savingEdits">Saving&hellip;</template>
              <template v-else>Save</template>
            </Button>
          </template>

          <div class="flex items-center px-2 py-1 rounded bg-muted/30 border border-border/50 text-[10px] text-muted-foreground gap-3 shadow-inner">
            <span v-if="resultStore.status === 'success'" class="whitespace-nowrap font-medium font-mono tabular-nums">
              {{ resultStore.rowCount }} rows
            </span>
            <span v-if="resultStore.status === 'success'" class="whitespace-nowrap font-medium font-mono tabular-nums text-muted-foreground/70">
              {{ resultStore.duration }}ms
            </span>
            <span v-else-if="resultStore.status === 'running'" class="text-amber-500 flex items-center gap-2 font-medium">
              Running&hellip;
              <button
                class="px-1.5 py-0.5 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors cursor-pointer"
                :disabled="resultStore.cancelling"
                @click="resultStore.cancelQuery()"
              >{{ resultStore.cancelling ? 'Cancelling...' : 'Cancel' }}</button>
            </span>
          </div>

          <div class="flex items-center border border-border rounded-md bg-background overflow-hidden shadow-sm">
            <select
              v-if="resultStore.columns.length"
              class="h-7 w-[68px] bg-transparent px-2 text-[11px] font-medium text-foreground outline-none border-r border-border hover:bg-muted/30 transition-colors cursor-pointer"
              :value="resultStore.pageSize"
              @change="onPageSizeChange"
              aria-label="Page size"
            >
              <option :value="50">50</option>
              <option :value="100">100</option>
              <option :value="250">250</option>
              <option :value="500">500</option>
            </select>
            <button
              class="inline-flex items-center justify-center h-7 px-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              :disabled="!resultStore.columns.length"
              @click="uiStore.openExport()"
              title="Export"
            >
              <Download class="w-3.5 h-3.5" />
            </button>
            <div class="w-px h-4 bg-border"></div>
            <button
              class="inline-flex items-center justify-center h-7 px-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              :class="{ 'text-primary bg-primary/10': showFilters }"
              :disabled="!detectedTable"
              @click="showFilters = !showFilters"
              title="Filter"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
            </button>
            <div class="w-px h-4 bg-border"></div>
            <button
              class="inline-flex items-center justify-center h-7 px-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              @click="resultStore.runProcesslist()"
              title="Sessions"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            </button>
          </div>
        </div>
      </div>

      <TabsContent value="table" class="flex-1 flex flex-col overflow-hidden min-h-0 p-0 m-0">
        <div class="flex items-center h-7 px-2 bg-muted/20 border-b border-border gap-1.5 flex-shrink-0">
          <template v-if="resultStore.showMultiTabs">
            <button
              v-for="(r, i) in resultStore.multiResults"
              :key="i"
              class="text-[10px] h-5 px-2 rounded border cursor-pointer whitespace-nowrap"
              :class="i === resultStore.activeResultIndex
                ? 'bg-primary/10 text-primary border-primary/30 font-medium'
                : 'bg-background text-muted-foreground border-border hover:bg-accent'"
              @click="resultStore.selectResultTab(i)"
            >
              Result {{ i + 1 }}
              <span v-if="r.row_count !== null" class="ml-1 opacity-60">({{ r.row_count }})</span>
              <span v-else-if="r.affected_rows !== null" class="ml-1 opacity-60">({{ r.affected_rows }})</span>
              <span v-if="r.error" class="ml-1 text-destructive" title="Error">&#x26A0;</span>
            </button>
          </template>
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

        <div v-if="showFilters && detectedTable" class="flex items-center gap-1.5 px-2 py-1 bg-muted/10 border-b border-border flex-wrap">
          <template v-for="col in resultStore.columns" :key="col.name">
            <div class="flex items-center gap-1">
              <label class="text-[9px] text-muted-foreground whitespace-nowrap">{{ col.name }}</label>
              <input
                v-model="filters[col.name]"
                :placeholder="col.type"
                class="h-6 w-[120px] rounded border border-input bg-background px-1.5 text-[10px] font-mono outline-none focus:border-primary"
                @keydown.enter="applyFilters"
              />
            </div>
          </template>
          <Button variant="outline" size="sm" class="text-[10px] h-6 px-2" @click="applyFilters">Apply</Button>
          <Button variant="ghost" size="sm" class="text-[10px] h-6 px-2" @click="clearFilters">Clear</Button>
        </div>

        <ScrollArea class="flex-1 min-h-0 bg-background" ref="scrollAreaRef">
          <Table class="relative w-full text-left border-collapse">
            <TableHeader class="sticky top-0 z-10 bg-muted shadow-[0_1px_0_0_hsl(var(--border))]">
              <TableRow class="hover:bg-transparent border-none">
                <TableHead class="w-[36px] text-center p-0 border-r border-border/50 bg-muted/80 backdrop-blur-md">
                  <div class="flex items-center justify-center w-full h-full">
                    <input
                      type="checkbox"
                      :checked="allSelected"
                      @change="toggleAll"
                      aria-label="Select all rows"
                      class="accent-primary cursor-pointer w-3.5 h-3.5 rounded-sm border-input"
                    />
                  </div>
                </TableHead>
                <TableHead class="w-[48px] text-center text-[10px] font-semibold text-muted-foreground bg-muted/80 backdrop-blur-md border-r border-border/50 select-none">#</TableHead>
                <TableHead
                  v-for="col in resultStore.columns"
                  :key="col.name"
                  class="text-[11px] font-semibold text-muted-foreground cursor-pointer hover:text-foreground whitespace-nowrap p-1.5 px-3 border-r border-border/50 last:border-r-0 bg-muted/80 backdrop-blur-md transition-colors select-none"
                  :class="{ 'text-right': col.type === 'integer' || col.type === 'numeric' || col.type === 'decimal' || col.type === 'bigint' }"
                  :aria-sort="getSortAria(col.name)"
                  @click="sortBy(col.name)"
                >
                  <div class="inline-flex items-center gap-1.5" :class="{ 'flex-row-reverse': col.type === 'integer' || col.type === 'numeric' || col.type === 'decimal' || col.type === 'bigint' }">
                    {{ col.name }}
                    <span v-if="sortCol === col.name" class="text-[10px] text-primary">
                      {{ sortDir === 'asc' ? '\u2191' : '\u2193' }}
                    </span>
                  </div>
                </TableHead>
                <TableHead v-if="isProcesslist" class="w-[70px] text-center text-[11px] font-semibold text-muted-foreground bg-muted/80 backdrop-blur-md">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="item in filteredRows"
                :key="item.key"
                class="text-[12px] font-mono group transition-colors border-b border-border/40"
                :class="[
                  item.index % 2 === 0 ? 'bg-transparent' : 'bg-muted/10',
                  resultStore.selectedRows.has(item.key) ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/40'
                ]"
              >
                <TableCell class="text-center p-0 w-[36px] border-r border-border/50 relative">
                  <div v-if="resultStore.selectedRows.has(item.key)" class="absolute left-0 top-0 bottom-0 w-[2px] bg-primary"></div>
                  <div class="flex items-center justify-center w-full h-full">
                    <input
                      type="checkbox"
                      :checked="resultStore.selectedRows.has(item.key)"
                      @change="resultStore.toggleRowSelection(item.key)"
                      :aria-label="`Select row ${item.index + 1}`"
                      class="accent-primary cursor-pointer w-3.5 h-3.5 rounded-sm border-input opacity-0 group-hover:opacity-100 transition-opacity"
                      :class="{ 'opacity-100': resultStore.selectedRows.has(item.key) }"
                    />
                  </div>
                </TableCell>
                <TableCell class="text-center p-1.5 px-2 w-[48px] border-r border-border/50 text-[10px] text-muted-foreground/60 select-none tabular-nums font-mono">{{ item.index + 1 }}</TableCell>
                <TableCell
                  v-for="col in resultStore.columns"
                  :key="col.name"
                  class="p-1.5 px-3 max-w-[240px] overflow-hidden text-ellipsis whitespace-nowrap border-r border-border/50 last:border-r-0 cursor-cell hover:bg-muted/50"
                  :class="[
                    getCellClass(item.row[col.name], col),
                    (col.type === 'integer' || col.type === 'numeric' || col.type === 'decimal' || col.type === 'bigint') ? 'text-right tabular-nums' : ''
                  ]"
                  @dblclick="startEditCell(item.index, col.name, $event)"
                  @contextmenu.prevent="showContextMenu($event, item.row, item.index, col.name)"
                >
                  <template v-if="resultStore.editingCell?.rowIndex === item.index && resultStore.editingCell?.colName === col.name">
                    <input
                      ref="editInputRef"
                      v-model="resultStore.editValue"
                      class="w-full h-full bg-background border-2 border-primary rounded px-1 text-[12px] font-mono outline-none shadow-sm focus:ring-2 focus:ring-primary/20"
                      @keydown.enter="commitEditCell(item.index, col.name)"
                      @keydown.escape="resultStore.cancelEditing()"
                      @blur="commitEditCell(item.index, col.name)"
                      @click.stop
                    />
                  </template>
                  <template v-else-if="item.row[col.name] === null">
                    <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-muted text-muted-foreground/60 border border-border/50">NULL</span>
                  </template>
                  <template v-else-if="col.name === 'status'">
                    <Badge variant="outline" class="text-[10px] px-1.5 py-0 font-sans tracking-wide" :class="statusBadgeClass(String(item.row[col.name]))">{{ item.row[col.name] }}</Badge>
                  </template>
                  <template v-else-if="col.type === 'boolean'">
                    <span class="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold" :class="item.row[col.name] ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'">{{ item.row[col.name] ? 'TRUE' : 'FALSE' }}</span>
                  </template>
                  <template v-else>
                    <span :title="String(item.row[col.name]).length > 50 ? String(item.row[col.name]) : undefined">{{ formatCell(item.row[col.name], col) }}</span>
                  </template>
                </TableCell>
                <TableCell v-if="isProcesslist" class="text-center p-1 border-l border-border/50">
                  <Button
                    variant="ghost"
                    size="sm"
                    class="text-[10px] h-5 px-2 text-destructive hover:text-white hover:bg-destructive rounded"
                    @click="resultStore.killSession(Number(item.row['Id']))"
                  >KILL</Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <div v-if="resultStore.hasMore && resultStore.status === 'success' && !searchQuery.value" ref="sentinelRef" class="flex items-center justify-center py-3 text-xs text-muted-foreground">
            <template v-if="resultStore.loadingMore">
              <span class="animate-pulse">Loading more&hellip;</span>
            </template>
            <template v-else>
              <span>Scroll for more rows</span>
            </template>
          </div>
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
          <div class="flex items-center gap-2">
            <span>[{{ resultStore.error.code }}] {{ truncateError(resultStore.error.message) }}</span>
            <button
              v-if="resultStore.error.message.length > 80"
              class="text-[10px] text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer underline"
              @click="showFullError = !showFullError"
            >{{ showFullError ? 'Less' : 'More' }}</button>
          </div>
          <div v-if="showFullError" class="mt-2 p-2 rounded bg-muted/50 border border-border text-[10px] leading-relaxed text-foreground whitespace-pre-wrap break-all">
            {{ resultStore.error.message }}
          </div>
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

    <Teleport to="body">
      <div
        v-if="contextMenu.visible"
        class="fixed z-50 bg-popover border border-border rounded-md shadow-lg py-1 w-[180px] text-xs"
        :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
        @click.stop
        @contextmenu.prevent
      >
        <button class="w-full text-left px-3 py-1.5 hover:bg-accent transition-colors" @click="copyCellValue">Copy Cell Value</button>
        <button class="w-full text-left px-3 py-1.5 hover:bg-accent transition-colors" @click="copyRowJson">Copy Row as JSON</button>
        <button class="w-full text-left px-3 py-1.5 hover:bg-accent transition-colors" @click="copyRowInsert">Copy Row as INSERT</button>
        <div class="h-px bg-border my-1"></div>
        <button class="w-full text-left px-3 py-1.5 hover:bg-accent transition-colors" @click="copyAllJson">Copy All as JSON</button>
        <button class="w-full text-left px-3 py-1.5 hover:bg-accent transition-colors" @click="copySelectedJson">Copy Selected as JSON</button>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, onUnmounted, watch, nextTick } from 'vue'
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
import { useSchemaStore } from '../stores/schema'
import { useUiStore } from '../stores/ui'

const resultStore = useResultStore()
const schemaStore = useSchemaStore()
const uiStore = useUiStore()

const scrollAreaRef = ref<InstanceType<typeof ScrollArea> | null>(null)
const sentinelRef = ref<HTMLDivElement | null>(null)
const editInputRef = ref<HTMLInputElement | null>(null)
const showFullError = ref(false)
const showFilters = ref(false)
const filters = reactive<Record<string, string>>({})
let observer: IntersectionObserver | null = null

const detectedTable = computed(() => detectTableFromSql(resultStore.lastSql))
const isProcesslist = computed(() => {
  const cols = resultStore.columns.map(c => c.name)
  return cols.includes('Id') && cols.includes('Command') && cols.includes('Info')
})

function detectTableFromSql(sql: string): string | null {
  if (!sql) return null
  const clean = sql.trim().replace(/;+$/, '').toUpperCase()
  if (clean.startsWith('SELECT')) {
    const fromMatch = clean.match(/\bFROM\s+`?(\w+)`?/i)
    return fromMatch ? fromMatch[1] : null
  }
  return null
}

const editableTableName = computed(() => {
  return detectTableFromSql(resultStore.lastSql)
})

const pkColumns = computed<string[]>(() => {
  const tableName = editableTableName.value
  if (!tableName) return []
  const details = schemaStore.detailsByTable[tableName]
  if (!details) return []
  return details.columns.filter(c => c.pk).map(c => c.name)
})

const hasDirtyEdits = computed(() => Object.keys(resultStore.dirtyCells).length > 0)

function startEditCell(rowIndex: number, colName: string, _e: MouseEvent) {
  const pkCols = pkColumns.value
  if (pkCols.length === 0) return
  resultStore.startEditing(rowIndex, colName)
  nextTick(() => editInputRef.value?.focus())
}

function commitEditCell(rowIndex: number, colName: string) {
  resultStore.commitEdit(rowIndex, colName, resultStore.editValue)
}

async function saveEdits() {
  const tableName = editableTableName.value
  if (!tableName) return
  await resultStore.saveEdits(tableName, pkColumns.value)
}

function escapeId(id: string): string {
  return '`' + id.replace(/`/g, '``') + '`'
}

function escapeVal(val: string, colType: string): string {
  if (val === '') return "''"
  if (colType === 'integer' || colType === 'numeric' || colType === 'bigint' || colType === 'decimal') {
    const num = Number(val)
    if (!isNaN(num)) return String(num)
  }
  return "'" + val.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"
}

async function applyFilters() {
  const table = detectedTable.value
  if (!table) return

  const clauses: string[] = []
  for (const col of resultStore.columns) {
    const val = filters[col.name]
    if (val !== undefined && val !== '') {
      clauses.push(`${escapeId(col.name)} = ${escapeVal(val, col.type)}`)
    }
  }
  if (clauses.length === 0) return

  const sql = `SELECT * FROM ${escapeId(table)} WHERE ${clauses.join(' AND ')} LIMIT ${resultStore.pageSize};`
  await resultStore.runQuery(sql)
}

function clearFilters() {
  for (const key of Object.keys(filters)) {
    delete filters[key]
  }
  showFilters.value = false
}

const contextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  row: null as ResultRow | null,
  rowIndex: -1,
  colName: '',
})

function showContextMenu(e: MouseEvent, row: ResultRow, rowIndex: number, colName: string) {
  contextMenu.visible = true
  contextMenu.x = e.clientX
  contextMenu.y = e.clientY
  contextMenu.row = row
  contextMenu.rowIndex = rowIndex
  contextMenu.colName = colName
}

function hideContextMenu() {
  contextMenu.visible = false
}

function copyCellValue() {
  const val = contextMenu.row?.[contextMenu.colName]
  if (val !== undefined && val !== null) {
    navigator.clipboard.writeText(String(val))
  }
  hideContextMenu()
}

function copyRowJson() {
  if (contextMenu.row) {
    navigator.clipboard.writeText(JSON.stringify(contextMenu.row, null, 2))
  }
  hideContextMenu()
}

function copyRowInsert() {
  const row = contextMenu.row
  if (!row) { hideContextMenu(); return }
  const cols = resultStore.columns
  const names = cols.map(c => `\`${c.name}\``).join(', ')
  const vals = cols.map(c => {
    const v = row[c.name]
    if (v === null || v === undefined) return 'NULL'
    if (typeof v === 'number') return String(v)
    return `'${String(v).replace(/'/g, "\\'")}'`
  }).join(', ')
  const insert = `INSERT INTO \`${editableTableName.value ?? 'table'}\` (${names}) VALUES (${vals});`
  navigator.clipboard.writeText(insert)
  hideContextMenu()
}

function copyAllJson() {
  navigator.clipboard.writeText(JSON.stringify(resultStore.rows, null, 2))
  hideContextMenu()
}

function copySelectedJson() {
  const selected = resultStore.rows.filter((_, i) => resultStore.selectedRows.has(String(i)))
  navigator.clipboard.writeText(JSON.stringify(selected.length ? selected : resultStore.rows, null, 2))
  hideContextMenu()
}

onMounted(() => {
  document.addEventListener('click', hideContextMenu)
  resultStore.loadHistory()
})

onUnmounted(() => {
  document.removeEventListener('click', hideContextMenu)
  if (observer) observer.disconnect()
  if (searchTimer) clearTimeout(searchTimer)
})

function setupSentinel() {
  nextTick(() => {
    if (observer) observer.disconnect()
    if (!sentinelRef.value) return
    observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && resultStore.hasMore && !resultStore.loadingMore) {
          resultStore.fetchNextPage()
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(sentinelRef.value)
  })
}

watch(() => resultStore.hasMore, (val) => {
  if (val) setupSentinel()
})

onUnmounted(() => {
  if (observer) observer.disconnect()
})

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

function truncateError(msg: string): string {
  if (msg.length <= 80) return msg
  return msg.slice(0, 80) + '\u2026'
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

function onPageSizeChange(e: Event) {
  const val = parseInt((e.target as HTMLSelectElement).value)
  resultStore.setPageSize(val)
}

function restoreHistorySql(sql: string) {
  const editorStore = useEditorStore()
  if (editorStore.activeTabId) {
    editorStore.updateSql(editorStore.activeTabId, sql)
  }
}
</script>
