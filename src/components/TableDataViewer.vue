<template>
  <div class="flex flex-col flex-1 h-full bg-background overflow-hidden select-none animate-in fade-in duration-150">
    <!-- Toolbar -->
    <div class="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/20 flex-shrink-0 text-xs">
      <!-- Left Side: Insert, Refresh, Filter, Sort, Export -->
      <div class="flex items-center gap-2">
        <Button 
          variant="default" 
          size="sm" 
          class="h-7 px-2.5 gap-1.5 text-[11px] font-medium shadow-xs" 
          @click="insertRow"
        >
          <PhPlus class="w-3.5 h-3.5" />
          <span>Insert</span>
        </Button>

        <Button 
          variant="outline" 
          size="sm" 
          class="h-7 px-2.5 gap-1.5 text-[11px] font-medium bg-background" 
          @click="loadData"
        >
          <PhArrowClockwise class="w-3.5 h-3.5" :class="{ 'animate-spin': loading }" />
          <span>Refresh</span>
        </Button>

        <Button 
          variant="outline" 
          size="sm" 
          class="h-7 px-2.5 gap-1.5 text-[11px] font-medium bg-background" 
          :class="{ 'border-primary/50 text-primary bg-primary/5': showFilterBar }"
          @click="toggleFilterBar"
        >
          <PhFunnel class="w-3.5 h-3.5" />
          <span>Filter</span>
          <Badge v-if="activeFilters.length > 0" variant="secondary" class="h-4 px-1 text-[9px] min-w-4 flex items-center justify-center">{{ activeFilters.length }}</Badge>
        </Button>

        <Button 
          variant="outline" 
          size="sm" 
          class="h-7 px-2.5 gap-1.5 text-[11px] font-medium bg-background"
          :class="{ 'border-primary/50 text-primary bg-primary/5': sortColumn }"
          @click="clearSort"
        >
          <PhSortAscending class="w-3.5 h-3.5" />
          <span>{{ sortColumn ? `Sorted by ${sortColumn}` : 'Sorted by 1 rule' }}</span>
        </Button>

        <div class="relative">
          <Button 
            variant="outline" 
            size="sm" 
            class="h-7 px-2.5 gap-1.5 text-[11px] font-medium bg-background"
            @click="showExportDropdown = !showExportDropdown"
          >
            <PhDownload class="w-3.5 h-3.5" />
            <span>Export</span>
            <PhCaretDown class="w-2.5 h-2.5 opacity-60" />
          </Button>

          <!-- Export Dropdown -->
          <div 
            v-if="showExportDropdown" 
            class="absolute left-0 mt-1 w-36 bg-popover border border-border rounded-md shadow-lg py-1 z-50 text-[11px]"
            @mouseleave="showExportDropdown = false"
          >
            <button class="w-full text-left px-3 py-1.5 hover:bg-accent transition-colors cursor-pointer" @click="exportData('csv')">Export as CSV</button>
            <button class="w-full text-left px-3 py-1.5 hover:bg-accent transition-colors cursor-pointer" @click="exportData('json')">Export as JSON</button>
            <button class="w-full text-left px-3 py-1.5 hover:bg-accent transition-colors cursor-pointer" @click="copyAllTsv">Copy all as TSV</button>
          </div>
        </div>

        <!-- Dirty changes actions -->
        <div v-if="hasChanges" class="flex items-center gap-1.5 ml-2 border-l border-border pl-3">
          <Badge class="bg-amber-500/10 text-amber-500 hover:bg-amber-500/15 border-amber-500/30 text-[10px] h-6 px-2 gap-1 font-semibold rounded-sm select-none">
            <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            Changes: {{ changesCount }}
          </Badge>
          <Button 
            variant="default" 
            size="sm" 
            class="bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-2 text-[10px] font-semibold gap-1"
            :disabled="saving"
            @click="saveEdits"
          >
            <PhCheck class="w-3 h-3" />
            Save
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            class="h-7 px-2 text-[10px] font-semibold gap-1 bg-background"
            :disabled="saving"
            @click="discardEdits"
          >
            <PhArrowCounterClockwise class="w-3 h-3" />
            Revert
          </Button>
        </div>
      </div>

      <!-- Right Side: Selection, Grid type, Pagination, Limit -->
      <div class="flex items-center gap-3">
        <span class="text-muted-foreground text-[10px] select-none font-medium">
          {{ selectionText }}
        </span>

        <div class="h-4 w-px bg-border/60"></div>

        <PhGridNine class="w-4 h-4 text-muted-foreground opacity-60" />

        <div class="flex items-center gap-1.5">
          <Button 
            variant="outline" 
            size="icon" 
            class="h-6 w-6 rounded bg-background"
            :disabled="page <= 1"
            @click="prevPage"
          >
            <PhCaretLeft class="w-3.5 h-3.5" />
          </Button>
          <span class="text-[11px] text-muted-foreground font-mono select-none px-1">
            {{ page }} of {{ totalPages || 1 }}
          </span>
          <Button 
            variant="outline" 
            size="icon" 
            class="h-6 w-6 rounded bg-background"
            :disabled="page >= totalPages"
            @click="nextPage"
          >
            <PhCaretRight class="w-3.5 h-3.5" />
          </Button>
        </div>

        <div class="h-4 w-px bg-border/60"></div>

        <div class="flex items-center gap-1">
          <span class="text-[10px] text-muted-foreground">Limit:</span>
          <select 
            :value="limit" 
            @change="onLimitChange"
            class="h-6 rounded border border-border bg-background px-1 text-[11px] font-mono outline-none focus:border-primary cursor-pointer select-none"
          >
            <option :value="50">50</option>
            <option :value="100">100</option>
            <option :value="250">250</option>
            <option :value="500">500</option>
          </select>
        </div>

        <span class="text-[10px] text-muted-foreground/80 font-mono bg-muted/40 px-1.5 py-0.5 rounded border border-border/40 select-none">
          Total: {{ totalRows }}
        </span>
      </div>
    </div>

    <!-- Filter Bar (Collapsible) -->
    <div v-if="showFilterBar" class="flex flex-col gap-2 p-3 border-b border-border bg-muted/10 text-xs flex-shrink-0">
      <div class="flex items-center justify-between mb-1">
        <span class="font-bold text-muted-foreground tracking-wide uppercase text-[9.5px]">Filter Rules</span>
        <Button variant="ghost" size="sm" class="text-[10px] h-5 px-2.5 text-muted-foreground hover:text-foreground" @click="addFilterRule">
          + Add Rule
        </Button>
      </div>

      <div class="space-y-2 max-h-36 overflow-y-auto">
        <div 
          v-for="(filter, idx) in activeFilters" 
          :key="idx"
          class="flex items-center gap-2"
        >
          <select 
            v-model="filter.column"
            class="h-7 rounded border border-border bg-background px-2 text-[11px] outline-none min-w-[120px]"
          >
            <option value="">Select column</option>
            <option v-for="c in columns" :key="c.name" :value="c.name">{{ c.name }}</option>
          </select>

          <select 
            v-model="filter.operator"
            class="h-7 rounded border border-border bg-background px-2 text-[11px] outline-none w-[110px]"
          >
            <option value="=">=</option>
            <option value="!=">!=</option>
            <option value="LIKE">contains (LIKE)</option>
            <option value=">">&gt;</option>
            <option value=">=">&gt;=</option>
            <option value="<">&lt;</option>
            <option value="<=">&lt;=</option>
            <option value="IS NULL">is NULL</option>
            <option value="IS NOT NULL">is not NULL</option>
          </select>

          <Input 
            v-if="filter.operator !== 'IS NULL' && filter.operator !== 'IS NOT NULL'"
            v-model="filter.value"
            placeholder="Value..."
            class="h-7 text-[11px] flex-1 bg-background"
            @keydown.enter="applyFilters"
          />
          <div v-else class="flex-1"></div>

          <Button 
            variant="ghost" 
            size="icon" 
            class="h-7 w-7 text-muted-foreground hover:text-destructive"
            @click="removeFilterRule(idx)"
          >
            <PhX class="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div class="flex items-center gap-2 mt-1 pt-2 border-t border-border/30">
        <Button variant="default" size="sm" class="h-6 px-3 text-[10px]" @click="applyFilters">Apply Filters</Button>
        <Button variant="ghost" size="sm" class="h-6 px-3 text-[10px]" @click="clearFilters">Clear All</Button>
      </div>
    </div>

    <!-- Data Grid Scroll Area -->
    <ScrollArea class="flex-1 min-h-0 bg-background" ref="scrollAreaRef">
      <div v-if="loading && rows.length === 0" class="h-48 flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <svg class="w-6 h-6 animate-spin text-primary opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        <span class="text-xs font-medium">Loading table data...</span>
      </div>

      <table 
        v-else-if="rows.length > 0"
        id="table-viewer-grid"
        class="relative w-full text-left border-collapse focus:outline-none focus:ring-1 focus:ring-primary/40 rounded-sm transition-shadow"
        tabindex="0"
        @keydown="handleGridKeydown"
      >
        <thead class="sticky top-0 z-10 bg-muted shadow-[0_1px_0_0_var(--border)]">
          <tr class="hover:bg-transparent border-none">
            <!-- Row selection column -->
            <th class="w-[32px] text-center p-0 border-r border-border/50 bg-muted/80 backdrop-blur-md">
              <div class="flex items-center justify-center w-full h-full">
                <input
                  type="checkbox"
                  :checked="allSelected"
                  @change="toggleSelectAll"
                  aria-label="Select all rows"
                  class="accent-primary cursor-pointer w-3 h-3 rounded-sm border-input"
                />
              </div>
            </th>

            <th class="w-[36px] text-center text-[9px] font-bold uppercase tracking-tight text-muted-foreground bg-muted/80 backdrop-blur-md border-r border-border/20 select-none py-1 px-2">#</th>

            <th 
              v-for="col in columns" 
              :key="col.name"
              class="text-[10.5px] font-bold tracking-tight text-muted-foreground cursor-pointer hover:text-foreground whitespace-nowrap py-1.5 px-3 border-r border-border/20 last:border-r-0 bg-muted/80 backdrop-blur-md transition-colors select-none"
              :class="{ 'text-right': isNumericColumn(col) }"
              @click="toggleSortColumn(col.name)"
            >
              <div class="inline-flex items-center gap-1.5" :class="{ 'flex-row-reverse': isNumericColumn(col) }">
                <component 
                  :is="getColumnIcon(col)" 
                  class="w-3 h-3 text-muted-foreground/60 flex-shrink-0"
                  :title="col.type"
                />
                <span>{{ col.name }}</span>
                <span v-if="sortColumn === col.name" class="text-[9.5px] text-primary">
                  {{ sortDirection === 'ASC' ? '↑' : '↓' }}
                </span>
              </div>
            </th>
          </tr>
        </thead>

        <tbody>
          <tr 
            v-for="(row, rowIndex) in rows" 
            :key="row._tempId || rowIndex"
            class="text-[11px] font-sans group transition-colors border-b border-border/40"
            :class="[
              rowIndex % 2 === 0 ? 'bg-transparent' : 'bg-muted/10',
              selectedRowKeys.has(row._tempId || String(rowIndex)) ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/15',
              row._tempId ? 'bg-amber-500/5 hover:bg-amber-500/10' : ''
            ]"
          >
            <!-- Checkbox cell -->
            <td class="text-center p-0 w-[32px] border-r border-border/20 relative">
              <div v-if="selectedRowKeys.has(row._tempId || String(rowIndex))" class="absolute left-0 top-0 bottom-0 w-[2px] bg-primary"></div>
              <div class="flex items-center justify-center w-full h-full">
                <input
                  type="checkbox"
                  :checked="selectedRowKeys.has(row._tempId || String(rowIndex))"
                  @change="toggleRowSelection(row._tempId || String(rowIndex))"
                  class="accent-primary cursor-pointer w-3 h-3 rounded-sm border-input opacity-0 group-hover:opacity-100 transition-opacity"
                  :class="{ 'opacity-100': selectedRowKeys.has(row._tempId || String(rowIndex)) }"
                />
              </div>
            </td>

            <!-- Serial index cell -->
            <td class="text-center py-1 px-2 w-[36px] border-r border-border/20 text-[9.5px] text-muted-foreground/60 select-none tabular-nums font-mono">
              {{ row._tempId ? '*' : rowIndex + 1 + (page - 1) * limit }}
            </td>

            <!-- Grid data cells -->
            <td
              v-for="(col, colIndex) in columns"
              :key="col.name"
              class="py-1 px-3 max-w-[280px] overflow-hidden text-ellipsis whitespace-nowrap border-r border-border/20 last:border-r-0 cursor-cell select-none transition-all duration-75 font-sans"
              :class="[
                getCellClass(row[col.name], col, rowIndex),
                isNumericColumn(col) ? 'text-right tabular-nums font-mono text-[10px]' : '',
                getCellSelectionClass(rowIndex, colIndex)
              ]"
              @mousedown="onCellMouseDown(rowIndex, col.name, $event)"
              @mouseenter="onCellMouseEnter(rowIndex, col.name, $event)"
              @dblclick="startEditingCell(rowIndex, col.name, $event)"
            >
              <!-- Editing cell view -->
              <template v-if="editingCell?.rowIndex === rowIndex && editingCell?.colName === col.name">
                <input
                  ref="editInputRef"
                  v-model="editValue"
                  class="w-full h-full bg-background border border-primary rounded px-1 py-0.5 text-[11px] font-sans outline-none shadow-sm focus:ring-1 focus:ring-primary/25"
                  @keydown.enter="commitEditingCell(rowIndex, col.name)"
                  @keydown.escape="cancelEditingCell"
                  @blur="commitEditingCell(rowIndex, col.name)"
                  @click.stop
                />
              </template>

              <!-- Display cell values -->
              <template v-else-if="row[col.name] === null">
                <span class="text-[9.5px] italic text-muted-foreground/45 select-none">NULL</span>
              </template>
              <template v-else-if="col.name === 'status'">
                <Badge variant="outline" class="text-[9.5px] px-1.5 py-0 font-sans tracking-wide" :class="statusBadgeClass(String(row[col.name]))">{{ row[col.name] }}</Badge>
              </template>
              <template v-else-if="col.type === 'boolean'">
                <span class="inline-flex items-center px-1 py-0.2 rounded-full text-[9.5px] font-semibold font-sans" :class="row[col.name] ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'">{{ row[col.name] ? 'TRUE' : 'FALSE' }}</span>
              </template>
              <template v-else>
                <div class="flex items-center justify-between gap-1 w-full">
                  <span :title="String(row[col.name]).length > 50 ? String(row[col.name]) : undefined" class="truncate">
                    {{ formatCell(row[col.name], col) }}
                  </span>
                  <!-- Link preview helper if it has a foreign key -->
                  <button 
                    v-if="getColumnForeignKey(col)"
                    class="text-primary/80 hover:text-primary cursor-pointer p-0.5 hover:bg-primary/10 rounded transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 flex-shrink-0"
                    title="Preview referenced record"
                    @click.stop="(e) => showFkPreview(e, col, rowIndex, row[col.name])"
                  >
                    <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
                  </button>
                </div>
              </template>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-else class="py-12 text-center text-xs text-muted-foreground">
        No records found.
      </div>
    </ScrollArea>

    <!-- Context / FK Popover preview (using teleport) -->
    <Teleport to="body">
      <div 
        v-if="activeFkPreview" 
        id="fk-viewer-popover"
        class="fixed z-[1000] w-85 bg-popover text-popover-foreground border border-border rounded-lg shadow-xl p-4 text-[12px] font-sans pointer-events-auto transition-all"
        :style="{ left: `${activeFkPreview.x}px`, top: `${activeFkPreview.y + 4}px` }"
        @click.stop
      >
        <div class="flex items-center justify-between border-b border-border pb-2 mb-2">
          <span class="font-semibold text-muted-foreground">Referenced Row Preview</span>
          <span class="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px] text-foreground select-all">
            {{ activeFkPreview.referencedTable }}
          </span>
        </div>

        <div v-if="activeFkPreview.loading" class="flex flex-col gap-2 py-2">
          <div class="h-3 bg-muted/60 rounded w-3/4 animate-pulse"></div>
          <div class="h-3 bg-muted/60 rounded w-5/6 animate-pulse"></div>
        </div>
        
        <div v-else-if="activeFkPreview.error" class="text-destructive font-mono text-[10px] py-2">
          Error: {{ activeFkPreview.error }}
        </div>

        <div v-else-if="!activeFkPreview.data" class="text-muted-foreground italic py-2">
          Referenced record not found.
        </div>

        <div v-else class="max-h-52 overflow-y-auto space-y-1.5 pr-1 font-mono text-[11px]">
          <div v-for="(val, key) in activeFkPreview.data" :key="key" class="flex border-b border-border/30 pb-1 last:border-0 last:pb-0">
            <span class="font-semibold text-muted-foreground w-1/3 truncate" :title="key">{{ key }}</span>
            <span class="text-foreground w-2/3 break-all pl-2 border-l border-border/20">
              <span v-if="val === null" class="italic text-muted-foreground/60">NULL</span>
              <span v-else>{{ val }}</span>
            </span>
          </div>
        </div>

        <div class="text-[9px] text-muted-foreground/60 text-right mt-3 pt-2 border-t border-border/30">
          Click outside or press Escape to close
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { useConnectionStore } from '../stores/connection'
import { useSchemaStore } from '../stores/schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'vue-sonner'
import {
  PhPlus, PhArrowClockwise, PhFunnel, PhSortAscending, PhDownload, 
  PhCaretLeft, PhCaretRight, PhKey, PhLink, PhCalendar, PhHash, 
  PhTextT, PhCheck, PhArrowCounterClockwise, PhGridNine, PhCaretDown, PhX
} from '@phosphor-icons/vue'
import type { Column, CellValue, ResultRow, PagedQueryResult } from '../stores/result'

const props = defineProps<{
  tableName: string
}>()

const connStore = useConnectionStore()
const schemaStore = useSchemaStore()

// State
const columns = ref<Column[]>([])
const rows = ref<ResultRow[]>([])
const loading = ref(false)
const totalRows = ref(0)
const page = ref(1)
const limit = ref(100)

const showFilterBar = ref(false)
const showExportDropdown = ref(false)
const activeFilters = ref<{ column: string; operator: string; value: string }[]>([])
const sortColumn = ref('')
const sortDirection = ref<'ASC' | 'DESC'>('ASC')

// Selection state
const anchorCell = ref<{ rowIndex: number; colIndex: number } | null>(null)
const focusCell = ref<{ rowIndex: number; colIndex: number } | null>(null)
const isMouseDown = ref(false)
const selectedRowKeys = ref<Set<string>>(new Set())

// Editing state
const editingCell = ref<{ rowIndex: number; colName: string } | null>(null)
const editValue = ref('')
const dirtyCells = ref<Record<string, Record<string, CellValue>>>({}) // rowIndex -> colName -> value
const newRows = ref<Set<string>>(new Set()) // tempIds of inserted rows
const saving = ref(false)

const editInputRef = ref<HTMLInputElement | null>(null)
const scrollAreaRef = ref<InstanceType<typeof ScrollArea> | null>(null)

// Computed
const totalPages = computed(() => Math.ceil(totalRows.value / limit.value))
const allSelected = computed(() => {
  return rows.value.length > 0 && rows.value.every((_, idx) => selectedRowKeys.value.has(String(idx)))
})

const hasChanges = computed(() => {
  return Object.keys(dirtyCells.value).length > 0 || newRows.value.size > 0
})

const changesCount = computed(() => {
  let count = 0
  for (const rowIdx of Object.keys(dirtyCells.value)) {
    count += Object.keys(dirtyCells.value[rowIdx]).length
  }
  count += newRows.value.size
  return count
})

const selectionText = computed(() => {
  if (!anchorCell.value || !focusCell.value) return 'No selection'
  const minRow = Math.min(anchorCell.value.rowIndex, focusCell.value.rowIndex)
  const maxRow = Math.max(anchorCell.value.rowIndex, focusCell.value.rowIndex)
  const minCol = Math.min(anchorCell.value.colIndex, focusCell.value.colIndex)
  const maxCol = Math.max(anchorCell.value.colIndex, focusCell.value.colIndex)
  const rowsCount = maxRow - minRow + 1
  const colsCount = maxCol - minCol + 1
  if (rowsCount === 1 && colsCount === 1) return '1 cell selected'
  return `${rowsCount}x${colsCount} cells selected`
})

// Methods
function focusGrid() {
  const gridEl = document.getElementById('table-viewer-grid')
  gridEl?.focus()
}

async function loadData() {
  if (!connStore.activeId) return
  loading.value = true
  try {
    const escapedTable = escapeId(props.tableName)
    let sql = `SELECT * FROM ${escapedTable}`

    // Append filters
    const filterClauses: string[] = []
    for (const rule of activeFilters.value) {
      if (rule.column && rule.operator) {
        if (rule.operator === 'IS NULL' || rule.operator === 'IS NOT NULL') {
          filterClauses.push(`${escapeId(rule.column)} ${rule.operator}`)
        } else {
          const escapedVal = escapeVal(rule.value)
          filterClauses.push(`${escapeId(rule.column)} ${rule.operator} ${escapedVal}`)
        }
      }
    }

    if (filterClauses.length > 0) {
      sql += ` WHERE ${filterClauses.join(' AND ')}`
    }

    // Append Sorting
    if (sortColumn.value) {
      sql += ` ORDER BY ${escapeId(sortColumn.value)} ${sortDirection.value}`
    }

    // Fetch count & data
    const countSql = `SELECT COUNT(*) as cnt FROM ${escapedTable} ${filterClauses.length > 0 ? ' WHERE ' + filterClauses.join(' AND ') : ''}`

    const [dataResult, countResult] = await Promise.all([
      invoke<PagedQueryResult>('run_query_paged', {
        sql,
        limit: limit.value,
        offset: (page.value - 1) * limit.value,
        id: connStore.activeId,
      }),
      invoke<PagedQueryResult>('run_query_paged', {
        sql: countSql,
        limit: 1,
        offset: 0,
        id: connStore.activeId,
      }).catch(() => null)
    ])

    // Load columns and rows
    columns.value = dataResult.columns
    rows.value = dataResult.rows as ResultRow[]

    // Restore count
    if (countResult && countResult.rows && countResult.rows.length > 0) {
      const row = countResult.rows[0]
      totalRows.value = Number(row.cnt ?? row['COUNT(*)'] ?? 0)
    } else {
      totalRows.value = dataResult.row_count
    }

    // Load Foreign Keys caching
    await loadForeignKeys()

  } catch (e) {
    console.error('Failed to load table data:', e)
    toast.error('Failed to load table data', { description: String(e) })
  } finally {
    loading.value = false
  }
}

// Columns helpers
function isNumericColumn(col: Column): boolean {
  const type = (col.type || '').toLowerCase()
  return ['integer', 'numeric', 'decimal', 'bigint', 'int', 'float', 'double', 'real', 'number'].some(t => type.includes(t))
}

function isDateColumn(col: Column): boolean {
  const type = (col.type || '').toLowerCase()
  return ['timestamp', 'datetime', 'date', 'time'].some(t => type.includes(t))
}

function getColumnIcon(col: Column) {
  const pkCols = pkColumns.value
  if (pkCols.includes(col.name)) return PhKey
  if (getColumnForeignKey(col)) return PhLink
  if (isNumericColumn(col)) return PhHash
  if (isDateColumn(col)) return PhCalendar
  return PhTextT
}

function getCellClass(val: CellValue, col: Column, rowIndex: number): string {
  let c = ''
  if (val === null) return c
  if (isNumericColumn(col)) c += 'text-syn-number '
  if (isDateColumn(col)) c += 'text-syn-string font-medium '
  
  // Highlight dirty cells
  if (dirtyCells.value[rowIndex]?.[col.name] !== undefined) {
    c += 'bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 '
  }
  return c.trim()
}

function statusBadgeClass(val: string): string {
  const v = val.toLowerCase()
  if (v === 'active') return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
  if (v === 'inactive') return 'bg-muted text-muted-foreground border-border'
  return ''
}

function formatCell(val: CellValue, _col: Column): string {
  if (val === null) return 'NULL'
  const s = String(val)
  if (s.length > 50) return s.slice(0, 50) + '…'
  return s
}

// Primary Keys
const pkColumns = computed<string[]>(() => {
  const tableKey = Object.keys(schemaStore.detailsByTable).find(k => k.toLowerCase() === props.tableName.toLowerCase())
  if (!tableKey) return []
  const details = schemaStore.detailsByTable[tableKey]
  if (!details) return []
  return details.columns.filter(c => c.pk).map(c => c.name)
})

// Cell Selection & Drag
function onGlobalMouseUp() {
  isMouseDown.value = false
}

function onCellMouseDown(rowIndex: number, colName: string, event: MouseEvent) {
  if (event.button !== 0) return // Left click only
  isMouseDown.value = true
  const colIndex = columns.value.findIndex(c => c.name === colName)
  
  if (event.shiftKey && anchorCell.value) {
    focusCell.value = { rowIndex, colIndex }
  } else {
    anchorCell.value = { rowIndex, colIndex }
    focusCell.value = { rowIndex, colIndex }
  }
  focusGrid()
  event.preventDefault()
}

function onCellMouseEnter(rowIndex: number, colName: string, _event: MouseEvent) {
  if (!isMouseDown.value) return
  const colIndex = columns.value.findIndex(c => c.name === colName)
  focusCell.value = { rowIndex, colIndex }
}

function selectCell(rowIndex: number, colName: string) {
  const colIndex = columns.value.findIndex(c => c.name === colName)
  anchorCell.value = { rowIndex, colIndex }
  focusCell.value = { rowIndex, colIndex }
  focusGrid()
}

function getCellSelectionClass(rowIndex: number, colIndex: number) {
  if (!anchorCell.value || !focusCell.value) return ''
  
  const minRow = Math.min(anchorCell.value.rowIndex, focusCell.value.rowIndex)
  const maxRow = Math.max(anchorCell.value.rowIndex, focusCell.value.rowIndex)
  const minCol = Math.min(anchorCell.value.colIndex, focusCell.value.colIndex)
  const maxCol = Math.max(anchorCell.value.colIndex, focusCell.value.colIndex)
  
  const inRange = rowIndex >= minRow && rowIndex <= maxRow && colIndex >= minCol && colIndex <= maxCol
  if (!inRange) return ''
  
  if (focusCell.value.rowIndex === rowIndex && focusCell.value.colIndex === colIndex) {
    return 'ring-2 ring-primary ring-inset bg-primary/15'
  }
  return 'bg-primary/10'
}

// Keyboard navigation & copying
function handleGridKeydown(e: KeyboardEvent) {
  if (editingCell.value) return

  const meta = navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? e.metaKey : e.ctrlKey
  
  // Copy selection as TSV
  if (meta && e.key.toLowerCase() === 'c') {
    if (anchorCell.value && focusCell.value) {
      e.preventDefault()
      copySelectedRange()
    }
    return
  }

  if (focusCell.value && anchorCell.value) {
    const { rowIndex, colIndex } = focusCell.value
    const shift = e.shiftKey
    
    let nextRow = rowIndex
    let nextCol = colIndex
    
    if (e.key === 'ArrowUp') {
      if (rowIndex > 0) { e.preventDefault(); nextRow = rowIndex - 1 }
    } else if (e.key === 'ArrowDown') {
      if (rowIndex < rows.value.length - 1) { e.preventDefault(); nextRow = rowIndex + 1 }
    } else if (e.key === 'ArrowLeft') {
      if (colIndex > 0) { e.preventDefault(); nextCol = colIndex - 1 }
    } else if (e.key === 'ArrowRight') {
      if (colIndex < columns.value.length - 1) { e.preventDefault(); nextCol = colIndex + 1 }
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const colName = columns.value[colIndex].name
      startEditingCell(rowIndex, colName, e)
      return
    } else {
      return
    }
    
    focusCell.value = { rowIndex: nextRow, colIndex: nextCol }
    if (!shift) {
      anchorCell.value = { rowIndex: nextRow, colIndex: nextCol }
    }
    scrollToActiveCell()
  }
}

function scrollToActiveCell() {
  nextTick(() => {
    const activeEl = document.querySelector('#table-viewer-grid .ring-primary')
    activeEl?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  })
}

function copySelectedRange() {
  if (!anchorCell.value || !focusCell.value) return
  
  const minRow = Math.min(anchorCell.value.rowIndex, focusCell.value.rowIndex)
  const maxRow = Math.max(anchorCell.value.rowIndex, focusCell.value.rowIndex)
  const minCol = Math.min(anchorCell.value.colIndex, focusCell.value.colIndex)
  const maxCol = Math.max(anchorCell.value.colIndex, focusCell.value.colIndex)
  
  const lines: string[] = []
  for (let r = minRow; r <= maxRow; r++) {
    const row = rows.value[r]
    const rowValues: string[] = []
    for (let c = minCol; c <= maxCol; c++) {
      const colName = columns.value[c].name
      const val = dirtyCells.value[r]?.[colName] !== undefined ? dirtyCells.value[r][colName] : row?.[colName]
      rowValues.push(val === null || val === undefined ? '' : String(val))
    }
    lines.push(rowValues.join('\t'))
  }
  
  const text = lines.join('\n')
  navigator.clipboard.writeText(text)
  toast.success(`Copied selection (${maxRow - minRow + 1}x${maxCol - minCol + 1}) to clipboard`)
}

// Inserting & editing cells
function insertRow() {
  const newRow: ResultRow = {}
  columns.value.forEach(col => {
    newRow[col.name] = null
  })
  
  const tempId = `new-row-${Date.now()}`
  rows.value.push({ ...newRow, _tempId: tempId })
  newRows.value.add(tempId)
  
  const newRowIndex = rows.value.length - 1
  selectCell(newRowIndex, columns.value[0]?.name)
  toast.success('Inserted row. Double click cells to edit.')
}

async function startEditingCell(rowIndex: number, colName: string, _e: Event) {
  const pks = pkColumns.value
  const isNew = Boolean(rows.value[rowIndex]?._tempId)
  
  if (pks.length === 0 && !isNew) {
    toast.error('Cannot edit row', { description: 'The table must have at least one primary key to modify records.' })
    return
  }
  
  editingCell.value = { rowIndex, colName }
  const row = rows.value[rowIndex]
  const currentVal = dirtyCells.value[rowIndex]?.[colName] !== undefined 
    ? dirtyCells.value[rowIndex][colName] 
    : row?.[colName]
  editValue.value = currentVal === null ? '' : String(currentVal)
  
  nextTick(() => {
    editInputRef.value?.focus()
  })
}

function commitEditingCell(rowIndex: number, colName: string) {
  if (editingCell.value?.rowIndex !== rowIndex || editingCell.value?.colName !== colName) return
  
  const row = rows.value[rowIndex]
  if (!row) return
  
  const originalValue = row[colName]
  const val = editValue.value === '' && originalValue !== '' ? null : editValue.value
  
  if (String(originalValue ?? '') !== String(val ?? '')) {
    if (!dirtyCells.value[rowIndex]) {
      dirtyCells.value[rowIndex] = {}
    }
    dirtyCells.value[rowIndex][colName] = val
  } else {
    // If reverted to original value
    if (dirtyCells.value[rowIndex]) {
      delete dirtyCells.value[rowIndex][colName]
      if (Object.keys(dirtyCells.value[rowIndex]).length === 0) {
        delete dirtyCells.value[rowIndex]
      }
    }
  }
  cancelEditingCell()
}

function cancelEditingCell() {
  editingCell.value = null
}

function discardEdits() {
  dirtyCells.value = {}
  newRows.value.clear()
  loadData()
  toast.success('Discarded all pending edits')
}

async function saveEdits() {
  if (!connStore.activeId) return
  saving.value = true
  
  const tableName = props.tableName
  const pks = pkColumns.value
  const statements: string[] = []

  // 1. Process modified cells of existing rows
  for (const [rowKey, cells] of Object.entries(dirtyCells.value)) {
    const rowIndex = parseInt(rowKey)
    const row = rows.value[rowIndex]
    if (!row || row._tempId) continue // Handles new rows separately
    
    const setClauses: string[] = []
    for (const [colName, val] of Object.entries(cells)) {
      const colDef = columns.value.find(c => c.name === colName)
      const type = colDef ? colDef.type : 'string'
      const escapedVal = val === null ? 'NULL' : escapeVal(String(val), type)
      setClauses.push(`${escapeId(colName)} = ${escapedVal}`)
    }
    
    if (setClauses.length === 0) continue
    
    const whereClauses: string[] = []
    for (const pk of pks) {
      const colDef = columns.value.find(c => c.name === pk)
      const pkType = colDef ? colDef.type : 'string'
      const pkVal = row[pk]
      if (pkVal === null || pkVal === undefined) {
        whereClauses.push(`${escapeId(pk)} IS NULL`)
      } else {
        whereClauses.push(`${escapeId(pk)} = ${escapeVal(String(pkVal), pkType)}`)
      }
    }
    
    statements.push(`UPDATE ${escapeId(tableName)} SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')};`)
  }

  // 2. Process inserted/new rows
  for (const tempId of newRows.value) {
    const rowIndex = rows.value.findIndex(r => r._tempId === tempId)
    if (rowIndex === -1) continue
    const row = rows.value[rowIndex]
    const cells = dirtyCells.value[rowIndex] || {}
    
    const fields: string[] = []
    const values: string[] = []
    
    columns.value.forEach(col => {
      const val = cells[col.name] !== undefined ? cells[col.name] : row[col.name]
      if (val !== null && val !== undefined) {
        fields.push(escapeId(col.name))
        values.push(escapeVal(String(val), col.type))
      }
    })
    
    if (fields.length > 0) {
      statements.push(`INSERT INTO ${escapeId(tableName)} (${fields.join(', ')}) VALUES (${values.join(', ')});`)
    }
  }

  if (statements.length === 0) {
    toast.info('No changes to save')
    saving.value = false
    return
  }

  try {
    const singleSql = statements.join('\n')
    await invoke('run_multi_query', {
      sql: singleSql,
      id: connStore.activeId,
    })
    
    toast.success('Saved changes successfully')
    dirtyCells.value = {}
    newRows.value.clear()
    await loadData()
  } catch (e) {
    console.error('Failed to save grid modifications:', e)
    toast.error('Failed to save changes', { description: String(e) })
  } finally {
    saving.value = false
  }
}

// SQL escape helpers
function escapeId(id: string): string {
  if (id.includes('.')) {
    return id.split('.')
      .map(part => '`' + part.replace(/`/g, '``') + '`')
      .join('.')
  }
  return '`' + id.replace(/`/g, '``') + '`'
}

function escapeVal(val: string, colType?: string): string {
  if (val === '') return "''"
  if (colType) {
    const lowerType = colType.toLowerCase()
    if (lowerType === 'integer' || lowerType === 'numeric' || lowerType === 'bigint' || lowerType === 'decimal') {
      const num = Number(val)
      if (!isNaN(num)) return String(num)
    }
  }
  return "'" + val.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"
}

// Sorting
function toggleSortColumn(colName: string) {
  if (sortColumn.value === colName) {
    sortDirection.value = sortDirection.value === 'ASC' ? 'DESC' : 'ASC'
  } else {
    sortColumn.value = colName
    sortDirection.value = 'ASC'
  }
  page.value = 1
  loadData()
}

// Filter clear & sorting helpers
function clearSort() {
  sortColumn.value = ''
  sortDirection.value = 'ASC'
  loadData()
}

// Pagination & Limit
function prevPage() {
  if (page.value > 1) {
    page.value--
    loadData()
  }
}

function nextPage() {
  if (page.value < totalPages.value) {
    page.value++
    loadData()
  }
}

function onLimitChange(e: Event) {
  limit.value = parseInt((e.target as HTMLSelectElement).value)
  page.value = 1
  loadData()
}

// Selection Checkbox
function toggleRowSelection(rowKey: string) {
  if (selectedRowKeys.value.has(rowKey)) {
    selectedRowKeys.value.delete(rowKey)
  } else {
    selectedRowKeys.value.add(rowKey)
  }
}

function toggleSelectAll() {
  if (allSelected.value) {
    selectedRowKeys.value.clear()
  } else {
    rows.value.forEach((_, idx) => {
      selectedRowKeys.value.add(String(idx))
    })
  }
}

// Filters
function toggleFilterBar() {
  showFilterBar.value = !showFilterBar.value
  if (showFilterBar.value && activeFilters.value.length === 0) {
    addFilterRule()
  }
}

function addFilterRule() {
  activeFilters.value.push({ column: '', operator: '=', value: '' })
}

function removeFilterRule(idx: number) {
  activeFilters.value.splice(idx, 1)
}

function clearFilters() {
  activeFilters.value = []
  page.value = 1
  loadData()
}

function applyFilters() {
  page.value = 1
  loadData()
}

// Exports
function exportData(formatType: 'csv' | 'json') {
  showExportDropdown.value = false
  if (formatType === 'json') {
    const text = JSON.stringify(rows.value, null, 2)
    navigator.clipboard.writeText(text)
    toast.success('Copied all page records to clipboard as JSON')
  } else {
    const headers = columns.value.map(c => `"${c.name.replace(/"/g, '""')}"`).join(',')
    const csvRows = rows.value.map(row => {
      return columns.value.map(c => {
        const val = row[c.name]
        if (val === null || val === undefined) return ''
        return `"${String(val).replace(/"/g, '""')}"`
      }).join(',')
    })
    const text = [headers, ...csvRows].join('\n')
    navigator.clipboard.writeText(text)
    toast.success('Copied all page records to clipboard as CSV')
  }
}

function copyAllTsv() {
  showExportDropdown.value = false
  const headers = columns.value.map(c => c.name).join('\t')
  const csvRows = rows.value.map(row => {
    return columns.value.map(c => {
      const val = row[c.name]
      return val === null || val === undefined ? '' : String(val)
    }).join('\t')
  })
  const text = [headers, ...csvRows].join('\n')
  navigator.clipboard.writeText(text)
  toast.success('Copied all page records as TSV (Excel friendly)')
}

// Foreign Key Support
const foreignKeysCache = ref<Record<string, { column_name: string; referenced_table: string; referenced_column: string }[]>>({})

async function loadForeignKeys() {
  if (foreignKeysCache.value[props.tableName]) return
  try {
    const fks = await invoke<any[]>('fetch_table_foreign_keys', {
      table: props.tableName,
      id: connStore.activeId,
      database: connStore.activeConnection?.database || null
    })
    foreignKeysCache.value[props.tableName] = fks
  } catch (e) {
    console.error(`Failed to load foreign keys for table ${props.tableName}:`, e)
    foreignKeysCache.value[props.tableName] = []
  }
}

function getColumnForeignKey(col: Column) {
  const fks = foreignKeysCache.value[props.tableName]
  if (!fks) return null
  return fks.find(fk => fk.column_name.toLowerCase() === col.name.toLowerCase()) || null
}

const activeFkPreview = ref<{
  rowIndex: number
  colName: string
  colValue: string
  referencedTable: string
  referencedColumn: string
  loading: boolean
  data: any | null
  error: string | null
  x: number
  y: number
} | null>(null)

async function showFkPreview(event: MouseEvent, col: Column, rowIndex: number, cellValue: CellValue) {
  if (cellValue === null || cellValue === undefined) return
  const fk = getColumnForeignKey(col)
  if (!fk) return

  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  
  activeFkPreview.value = {
    rowIndex,
    colName: col.name,
    colValue: String(cellValue),
    referencedTable: fk.referenced_table,
    referencedColumn: fk.referenced_column,
    loading: true,
    data: null,
    error: null,
    x: rect.left,
    y: rect.bottom + window.scrollY,
  }

  try {
    const data = await invoke<any>('fetch_referenced_row', {
      table: fk.referenced_table,
      column: fk.referenced_column,
      value: String(cellValue),
      id: connStore.activeId,
      database: connStore.activeConnection?.database || null
    })
    if (activeFkPreview.value && activeFkPreview.value.rowIndex === rowIndex && activeFkPreview.value.colName === col.name) {
      activeFkPreview.value.data = data
      activeFkPreview.value.loading = false
    }
  } catch (e) {
    if (activeFkPreview.value && activeFkPreview.value.rowIndex === rowIndex && activeFkPreview.value.colName === col.name) {
      activeFkPreview.value.error = String(e)
      activeFkPreview.value.loading = false
    }
  }
}

function closeFkPreview() {
  activeFkPreview.value = null
}

function handleGlobalFkClick(e: MouseEvent) {
  if (!activeFkPreview.value) return
  const popover = document.getElementById('fk-viewer-popover')
  if (popover && !popover.contains(e.target as Node) && !(e.target as HTMLElement).closest('button[title="Preview referenced record"]')) {
    closeFkPreview()
  }
}

function handleGlobalFkKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    closeFkPreview()
  }
}

// Lifecycle Hooks
onMounted(() => {
  window.addEventListener('mouseup', onGlobalMouseUp)
  document.addEventListener('click', handleGlobalFkClick)
  document.addEventListener('keydown', handleGlobalFkKeydown)
  
  schemaStore.fetchTableDetails(props.tableName).then(() => {
    loadData()
  })
})

onUnmounted(() => {
  window.removeEventListener('mouseup', onGlobalMouseUp)
  document.removeEventListener('click', handleGlobalFkClick)
  document.removeEventListener('keydown', handleGlobalFkKeydown)
})

watch(() => props.tableName, () => {
  columns.value = []
  rows.value = []
  page.value = 1
  dirtyCells.value = {}
  newRows.value.clear()
  schemaStore.fetchTableDetails(props.tableName).then(() => {
    loadData()
  })
})
</script>

<style scoped>
/* Spreadsheet outline selection border */
#table-viewer-grid :deep(.ring-primary) {
  box-shadow: inset 0 0 0 2px var(--primary);
  outline: none;
}
</style>
