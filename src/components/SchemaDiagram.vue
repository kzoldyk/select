<template>
  <div 
    class="flex flex-col flex-1 h-full bg-background overflow-hidden relative select-none animate-in fade-in duration-200"
    @mousemove="onMouseMove"
    @mouseup="onMouseUp"
  >
    <!-- Diagram Toolbar -->
    <div class="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/20 flex-shrink-0 text-xs z-20">
      <div class="flex items-center gap-2">
        <span class="font-semibold text-muted-foreground">Schema Diagram:</span>
        <span v-if="props.tableName" class="font-mono bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded text-[10px]">
          {{ props.tableName }} relations
        </span>
        <span v-else class="text-muted-foreground text-[10px]">All tables</span>
      </div>

      <div class="flex items-center gap-2">
        <!-- Zoom Controls -->
        <div class="flex items-center gap-1 bg-background border border-border/80 rounded-md px-1 py-0.5 shadow-sm mr-1.5">
          <ActionTooltip text="Zoom Out">
            <Button 
              variant="ghost" 
              size="icon" 
              class="h-5 w-5 text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Zoom Out"
              @click="zoomOut"
            >
              <PhMagnifyingGlassMinus class="w-3.5 h-3.5" />
            </Button>
          </ActionTooltip>
          <span class="text-[10px] text-muted-foreground font-mono w-9 text-center select-none">
            {{ Math.round(zoom * 100) }}%
          </span>
          <ActionTooltip text="Zoom In">
            <Button 
              variant="ghost" 
              size="icon" 
              class="h-5 w-5 text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Zoom In"
              @click="zoomIn"
            >
              <PhMagnifyingGlassPlus class="w-3.5 h-3.5" />
            </Button>
          </ActionTooltip>
          <ActionTooltip text="Reset Zoom">
            <Button 
              variant="ghost" 
              size="icon" 
              class="h-5 w-5 text-muted-foreground hover:text-foreground border-l border-border/30 rounded-none pl-1 cursor-pointer"
              aria-label="Reset Zoom"
              @click="resetZoom"
            >
              <PhMagnifyingGlass class="w-3.5 h-3.5" />
            </Button>
          </ActionTooltip>
        </div>

        <ActionTooltip text="Auto-arrange table layout">
          <Button 
            variant="outline" 
            size="sm" 
            class="h-6.5 px-2.5 text-[10.5px] bg-background font-medium gap-1 cursor-pointer"
            @click="resetLayout"
          >
            <PhArrowsOut class="w-3.5 h-3.5" />
            <span>Reset Layout</span>
          </Button>
        </ActionTooltip>

        <ActionTooltip text="Recenter diagram view">
          <Button 
            variant="outline" 
            size="sm" 
            class="h-6.5 px-2.5 text-[10.5px] bg-background font-medium gap-1 cursor-pointer"
            @click="recenterView"
          >
            <PhCornersOut class="w-3.5 h-3.5" />
            <span>Recenter View</span>
          </Button>
        </ActionTooltip>
      </div>
    </div>

    <!-- Canvas Workspace -->
    <div 
      class="flex-1 min-h-0 w-full relative cursor-grab active:cursor-grabbing overflow-hidden"
      id="diagram-canvas"
      @mousedown="startPan"
      @wheel.prevent.stop="onWheel"
      @click="selectedTable = null"
    >
      <!-- Loading Overlay -->
      <div 
        v-if="loading" 
        class="absolute inset-0 bg-background/60 backdrop-blur-[2px] z-30 flex flex-col items-center justify-center gap-3 transition-all duration-300 animate-in fade-in"
      >
        <div class="flex items-center justify-center p-3 rounded-full bg-muted border border-border/80 shadow-md">
          <svg class="w-7 h-7 animate-spin text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
        </div>
        <div class="flex flex-col items-center gap-1 text-center animate-pulse">
          <span class="text-xs font-semibold text-foreground">Mapping Database Relations</span>
          <span class="text-[10px] text-muted-foreground">Fetching columns, keys, and constraint mappings...</span>
        </div>
      </div>

      <!-- Dotted Background Grid -->
      <div 
        class="absolute inset-0 pointer-events-none"
        :style="{
          backgroundImage: 'radial-gradient(circle, var(--border) 1px, transparent 1px)',
          backgroundSize: '16px 16px',
          backgroundPosition: `${pan.x}px ${pan.y}px`
        }"
      ></div>

      <!-- Translated parent container for cards & SVG lines -->
      <div 
        class="absolute inset-0 pointer-events-auto canvas-wrapper"
        :style="{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0'
        }"
      >
        <!-- SVG Connector Lines -->
        <svg class="absolute inset-0 w-[5000px] h-[5000px] pointer-events-none z-0">
          <defs>
            <!-- White dashed arrow marker -->
            <marker 
              id="arrow-dashed" 
              viewBox="0 0 10 10" 
              refX="6" 
              refY="5" 
              markerWidth="6" 
              markerHeight="6" 
              orient="auto-start-reverse"
            >
              <path d="M 0 2 L 6 5 L 0 8 z" fill="#f8fafc" />
            </marker>
            <!-- Gray solid arrow marker -->
            <marker 
              id="arrow-solid" 
              viewBox="0 0 10 10" 
              refX="6" 
              refY="5" 
              markerWidth="6" 
              markerHeight="6" 
              orient="auto-start-reverse"
            >
              <path d="M 0 2 L 6 5 L 0 8 z" fill="var(--muted-foreground)" />
            </marker>
            <!-- Active primary arrow marker -->
            <marker 
              id="arrow-active" 
              viewBox="0 0 10 10" 
              refX="6" 
              refY="5" 
              markerWidth="6" 
              markerHeight="6" 
              orient="auto-start-reverse"
            >
              <path d="M 0 2 L 6 5 L 0 8 z" fill="var(--primary)" />
            </marker>
            <!-- Dimmed arrow marker -->
            <marker 
              id="arrow-dimmed" 
              viewBox="0 0 10 10" 
              refX="6" 
              refY="5" 
              markerWidth="6" 
              markerHeight="6" 
              orient="auto-start-reverse"
            >
              <path d="M 0 2 L 6 5 L 0 8 z" fill="var(--border)" opacity="0.4" />
            </marker>
          </defs>

          <!-- Draw Relation Lines -->
          <g v-for="(rel, rIdx) in relationsList" :key="rIdx">
            <path
              :d="computeOrthogonalPath(rel)"
              :stroke="getLineStroke(rel)"
              :stroke-width="getLineStrokeWidth(rel)"
              :stroke-dasharray="getLineDashArray(rel)"
              :opacity="getLineOpacity(rel)"
              fill="none"
              :marker-end="getLineMarker(rel)"
              class="transition-all duration-200 cursor-pointer"
              :class="{ 'relation-line-active': isLineHighlighted(rel) }"
            >
              <title>{{ formatRelationTooltip(rel) }}</title>
            </path>
          </g>
        </svg>

        <!-- Table Cards -->
        <div
          v-for="table in visibleTables"
          :key="table.name"
          class="absolute w-[230px] rounded-lg border bg-background/95 shadow-lg select-none z-10 hover:shadow-xl transition-all duration-250 cursor-default"
          :class="[
            selectedTable === table.name ? 'border-primary ring-2 ring-primary/20 shadow-[0_0_15px_var(--primary)] z-20 scale-[1.02]' : 'border-border/80',
            selectedTable && !isConnectedTable(table.name) ? 'opacity-30 blur-[0.5px] scale-[0.98]' : ''
          ]"
          :style="{
            left: `${positions[table.name]?.x ?? 100}px`,
            top: `${positions[table.name]?.y ?? 100}px`
          }"
          @click.stop="selectedTable = table.name"
        >
          <!-- Card Header (Draggable) -->
          <div 
            class="px-3 py-2 border-b border-border/80 bg-muted/30 font-semibold text-xs tracking-wide text-foreground rounded-t-lg cursor-grab active:cursor-grabbing flex items-center justify-between"
            @mousedown.stop="startDragTable(table.name, $event)"
          >
            <div class="flex items-center gap-1.5 truncate">
              <Table class="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
              <span class="truncate font-semibold tracking-tight" :title="table.schema ? `${table.schema}.${table.name}` : table.name">
                {{ table.name }}
              </span>
              <Badge 
                v-if="table.schema && table.schema !== (connStore.activeConnection?.database || '')"
                variant="outline" 
                class="text-[9px] px-1 py-0 border-sky-500/40 text-sky-400 bg-sky-500/10 font-mono shrink-0"
                :title="`Database: ${table.schema}`"
              >
                {{ table.schema }}
              </Badge>
            </div>
            <Badge variant="outline" class="text-[9px] px-1.5 py-0 border-border/60 text-muted-foreground/80 font-normal">
              {{ schemaStore.detailsByTable[table.name]?.columns.length ?? schemaStore.detailsByTable[table.name.toLowerCase()]?.columns.length ?? '?' }}
            </Badge>
          </div>

          <!-- Card Columns List -->
          <div class="py-1 divide-y divide-border/20 text-[11px] font-sans">
            <div 
              v-for="col in schemaStore.detailsByTable[table.name]?.columns || []" 
              :key="col.name"
              class="flex items-center justify-between px-3 py-1 hover:bg-muted/10 group/row"
            >
              <div class="flex items-center gap-1.5 truncate">
                <!-- Column Type Icon -->
                <Key 
                  v-if="col.pk" 
                  class="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 animate-in zoom-in-50 duration-200" 
                  title="Primary Key"
                />
                <Link 
                  v-else-if="col.fk" 
                  class="w-3.5 h-3.5 text-amber-500 flex-shrink-0 animate-in zoom-in-50 duration-200" 
                  title="Foreign Key"
                />
                <div v-else class="w-3.5 h-3.5 flex-shrink-0"></div>

                <span class="truncate font-medium text-foreground" :class="{ 'font-semibold text-emerald-400/90': col.pk }">
                  {{ col.name }}
                </span>
              </div>

              <span class="text-[9.5px] font-mono text-muted-foreground/60 uppercase tracking-tight pl-2">
                {{ col.columnType }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, watch } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { toast } from 'vue-sonner'
import { useConnectionStore } from '../stores/connection'
import { useSchemaStore } from '../stores/schema'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ActionTooltip } from '@/components/ui/tooltip'
import { Table, Key, Link } from '@lucide/vue'
import { 
  PhArrowsOut, 
  PhCornersOut, 
  PhMagnifyingGlass, 
  PhMagnifyingGlassPlus, 
  PhMagnifyingGlassMinus 
} from '@phosphor-icons/vue'

const props = defineProps<{
  tableName?: string // Target table to show relations for (optional)
}>()

const connStore = useConnectionStore()
const schemaStore = useSchemaStore()

// State
const pan = reactive({ x: 80, y: 80 })
const zoom = ref(1.0)
const loading = ref(false)
const selectedTable = ref<string | null>(null)
const isPanning = ref(false)
const dragStart = reactive({ x: 0, y: 0 })
const panStart = reactive({ x: 0, y: 0 })

const positions = ref<Record<string, { x: number; y: number }>>({})
const draggedTable = ref<string | null>(null)
const tableDragStart = reactive({ x: 0, y: 0 })

// Foreign Key Relations schema data
export interface DiagramTable {
  name: string
  type: 'table' | 'view'
  schema?: string
}

export interface FKRelation {
  sourceSchema?: string
  sourceTable: string
  sourceColumn: string
  targetSchema?: string
  targetTable: string
  targetColumn: string
  isFocus: boolean
}
const relations = ref<FKRelation[]>([])

// Visible tables in this diagram (supports local & cross-schema tables)
const visibleTables = computed<DiagramTable[]>(() => {
  const currentDb = connStore.activeConnection?.database || ''

  if (!props.tableName) {
    // Global mode: include all schemaStore.tables, plus any cross-schema related tables
    const map = new Map<string, DiagramTable>()
    schemaStore.tables.forEach(t => {
      map.set(t.name.toLowerCase(), { name: t.name, type: t.type, schema: currentDb })
    })

    relations.value.forEach(r => {
      const srcKey = r.sourceTable.toLowerCase()
      if (!map.has(srcKey)) {
        map.set(srcKey, { name: r.sourceTable, type: 'table', schema: r.sourceSchema || currentDb })
      }
      const tgtKey = r.targetTable.toLowerCase()
      if (!map.has(tgtKey)) {
        map.set(tgtKey, { name: r.targetTable, type: 'table', schema: r.targetSchema || currentDb })
      }
    })

    return Array.from(map.values())
  }
  
  // Focused mode: show focus table + all related (both outbound and inbound, including cross-schema)
  const target = props.tableName.toLowerCase()
  const bareTarget = target.includes('.') ? target.split('.').pop()! : target
  const map = new Map<string, DiagramTable>()
  
  // Add focus table
  const focusTableObj = schemaStore.tables.find(t => t.name.toLowerCase() === bareTarget)
  map.set(bareTarget, {
    name: focusTableObj?.name || bareTarget,
    type: focusTableObj?.type || 'table',
    schema: target.includes('.') ? target.split('.')[0] : currentDb
  })
  
  relations.value.forEach(r => {
    const srcLower = r.sourceTable.toLowerCase()
    const tgtLower = r.targetTable.toLowerCase()
    
    if (srcLower === bareTarget || srcLower === target) {
      if (!map.has(tgtLower)) {
        const found = schemaStore.tables.find(t => t.name.toLowerCase() === tgtLower)
        map.set(tgtLower, {
          name: found?.name || r.targetTable,
          type: found?.type || 'table',
          schema: r.targetSchema || currentDb
        })
      }
    }
    if (tgtLower === bareTarget || tgtLower === target) {
      if (!map.has(srcLower)) {
        const found = schemaStore.tables.find(t => t.name.toLowerCase() === srcLower)
        map.set(srcLower, {
          name: found?.name || r.sourceTable,
          type: found?.type || 'table',
          schema: r.sourceSchema || currentDb
        })
      }
    }
  })
  
  return Array.from(map.values())
})

// Build final computed list of relations for drawing lines
const relationsList = computed(() => {
  const result: FKRelation[] = []
  const visibleNames = new Set(visibleTables.value.map(t => t.name.toLowerCase()))

  relations.value.forEach(rel => {
    if (visibleNames.has(rel.sourceTable.toLowerCase()) && visibleNames.has(rel.targetTable.toLowerCase())) {
      const isFocus = props.tableName 
        ? (rel.sourceTable.toLowerCase() === props.tableName.toLowerCase() || 
           rel.targetTable.toLowerCase() === props.tableName.toLowerCase() ||
           rel.sourceTable.toLowerCase() === props.tableName.split('.').pop()?.toLowerCase() ||
           rel.targetTable.toLowerCase() === props.tableName.split('.').pop()?.toLowerCase())
        : true
      result.push({
        ...rel,
        isFocus
      })
    }
  })
  return result
})

// Estimated height of a card based on columns count
function getEstimatedCardHeight(tableName: string): number {
  const cols = schemaStore.detailsByTable[tableName]?.columns || []
  const count = cols.length || 8 // Default to 8 columns spacing if metadata is still fetching
  return 34 + count * 25 + 12 // header + rows + margins
}

// Reset Layout using waterfall column packing (prevents overlaps)
function resetLayout(force = false) {
  const list = visibleTables.value
  if (list.length === 0) return

  if (force) {
    positions.value = {}
  }

  const cardWidth = 230
  const gapX = 90
  const gapY = 50
  
  if (props.tableName) {
    // Localized radial/relations layout
    const focusName = props.tableName
    const leftX = 60
    const centerX = 380
    const rightX = 700
    
    positions.value[focusName] = { x: centerX, y: 120 }
    const focusHeight = getEstimatedCardHeight(focusName)
    
    // Split other related tables into left (referenced) and right (referencing) stacks
    const leftStack: string[] = []
    const rightStack: string[] = []
    
    relations.value.forEach(r => {
      if (r.sourceTable.toLowerCase() === focusName.toLowerCase()) {
        if (!leftStack.includes(r.targetTable)) leftStack.push(r.targetTable)
      }
      if (r.targetTable.toLowerCase() === focusName.toLowerCase()) {
        if (!rightStack.includes(r.sourceTable)) rightStack.push(r.sourceTable)
      }
    })
    
    let leftBottom = 60
    leftStack.forEach(name => {
      if (!positions.value[name]) {
        positions.value[name] = { x: leftX, y: leftBottom }
      }
      leftBottom = positions.value[name].y + getEstimatedCardHeight(name) + gapY
    })
    
    let rightBottom = 60
    rightStack.forEach(name => {
      if (!positions.value[name]) {
        positions.value[name] = { x: 700, y: rightBottom }
      }
      rightBottom = positions.value[name].y + getEstimatedCardHeight(name) + gapY
    })
    
    // Stash isolated tables lower down in the center
    let centerBottom = positions.value[focusName].y + focusHeight + gapY
    list.forEach(t => {
      if (!positions.value[t.name]) {
        positions.value[t.name] = { x: 380, y: centerBottom }
      }
      if (t.name !== focusName && !leftStack.includes(t.name) && !rightStack.includes(t.name)) {
        centerBottom = positions.value[t.name].y + getEstimatedCardHeight(t.name) + gapY
      }
    })
  } else {
    // Global waterfall layout to prevent overlaps
    const columnsCount = 3
    const columnBottoms = Array(columnsCount).fill(60)
    
    // First, map column heights for already-placed tables to avoid visual jumps
    list.forEach((table) => {
      const pos = positions.value[table.name]
      if (pos) {
        let colIdx = 0
        if (pos.x > 500) colIdx = 2
        else if (pos.x > 220) colIdx = 1
        
        const bottom = pos.y + getEstimatedCardHeight(table.name) + gapY
        if (bottom > columnBottoms[colIdx]) {
          columnBottoms[colIdx] = bottom
        }
      }
    })
    
    // Position newly visible tables in the shortest column
    list.forEach((table) => {
      if (!positions.value[table.name]) {
        let minColIdx = 0
        let minBottom = columnBottoms[0]
        for (let c = 1; c < columnsCount; c++) {
          if (columnBottoms[c] < minBottom) {
            minBottom = columnBottoms[c]
            minColIdx = c
          }
        }
        
        const x = 60 + minColIdx * (cardWidth + gapX)
        const y = minBottom
        
        positions.value[table.name] = { x, y }
        columnBottoms[minColIdx] = y + getEstimatedCardHeight(table.name) + gapY
      }
    })
  }
}

function recenterView() {
  pan.x = 80
  pan.y = 80
  zoom.value = 1.0
}

function zoomIn() {
  zoom.value = Math.min(2.0, zoom.value * 1.15)
}

function zoomOut() {
  zoom.value = Math.max(0.4, zoom.value / 1.15)
}

function resetZoom() {
  zoom.value = 1.0
}

// Wheel panning & trackpad gestures
function onWheel(e: WheelEvent) {
  // 1. Zoom with Ctrl + Scroll or Pinch gesture
  if (e.ctrlKey || e.metaKey) {
    const zoomFactor = 1.08
    const oldZoom = zoom.value
    let newZoom = oldZoom
    if (e.deltaY < 0) {
      newZoom = Math.min(2.0, oldZoom * zoomFactor)
    } else {
      newZoom = Math.max(0.4, oldZoom / zoomFactor)
    }
    
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const mouseX = e.clientX - rect.left - pan.x
    const mouseY = e.clientY - rect.top - pan.y
    
    pan.x = pan.x - mouseX * (newZoom / oldZoom - 1)
    pan.y = pan.y - mouseY * (newZoom / oldZoom - 1)
    zoom.value = newZoom
  } else {
    // 2. Trackpad / Scroll Wheel Panning
    pan.x -= e.deltaX
    pan.y -= e.deltaY
  }
}

let loadSequence = 0

// Helper to batch async operations with concurrency limit
async function runWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = []
  const executing: Promise<void>[] = []
  for (const item of items) {
    const p = Promise.resolve().then(() => fn(item)).then(res => {
      results.push(res)
    })
    const e: Promise<void> = p.then(() => {
      executing.splice(executing.indexOf(e), 1)
    })
    executing.push(e)
    if (executing.length >= limit) {
      await Promise.race(executing)
    }
  }
  await Promise.all(executing)
  return results
}

// Fetch schema data & foreign keys
async function loadSchemaDetails() {
  if (!connStore.activeId) return
  
  const currentSeq = ++loadSequence
  loading.value = true
  
  try {
    const activeConnId = connStore.activeId
    const activeDb = connStore.activeConnection?.database || null
    const collectedRelations: FKRelation[] = []

    if (props.tableName) {
      // Focused mode: fetch FKs for target table (both outbound & inbound)
      try {
        const fks = await invoke<any[]>('fetch_table_foreign_keys', {
          table: props.tableName,
          id: activeConnId,
          database: activeDb
        })
        if (currentSeq !== loadSequence) return

        fks.forEach(fk => {
          const srcTbl = fk.tableName || fk.table_name || props.tableName!
          const srcCol = fk.columnName || fk.column_name
          const tgtTbl = fk.referencedTable || fk.referenced_table
          const tgtCol = fk.referencedColumn || fk.referenced_column
          const srcSchema = fk.tableSchema || fk.table_schema || activeDb || undefined
          const tgtSchema = fk.referencedTableSchema || fk.referenced_table_schema || activeDb || undefined

          collectedRelations.push({
            sourceSchema: srcSchema,
            sourceTable: srcTbl,
            sourceColumn: srcCol,
            targetSchema: tgtSchema,
            targetTable: tgtTbl,
            targetColumn: tgtCol,
            isFocus: true
          })
        })
      } catch (e) {
        console.error(`Failed to load foreign keys for ${props.tableName}:`, e)
      }
    } else {
      // Global mode: fetch all foreign keys in one query
      try {
        const allFks = await invoke<any[]>('fetch_all_foreign_keys', {
          id: activeConnId,
          database: activeDb
        })
        if (currentSeq !== loadSequence) return

        allFks.forEach(fk => {
          const srcTbl = fk.tableName || fk.table_name
          const srcCol = fk.columnName || fk.column_name
          const tgtTbl = fk.referencedTable || fk.referenced_table
          const tgtCol = fk.referencedColumn || fk.referenced_column
          const srcSchema = fk.tableSchema || fk.table_schema || activeDb || undefined
          const tgtSchema = fk.referencedTableSchema || fk.referenced_table_schema || activeDb || undefined

          collectedRelations.push({
            sourceSchema: srcSchema,
            sourceTable: srcTbl,
            sourceColumn: srcCol,
            targetSchema: tgtSchema,
            targetTable: tgtTbl,
            targetColumn: tgtCol,
            isFocus: false
          })
        })
      } catch (e) {
        console.warn('fetch_all_foreign_keys failed, falling back to batched fetch:', e)
        await runWithConcurrency(schemaStore.tables, 5, async (table) => {
          if (currentSeq !== loadSequence) return
          try {
            const fks = await invoke<any[]>('fetch_table_foreign_keys', {
              table: table.name,
              id: activeConnId,
              database: activeDb
            })
            fks.forEach(fk => {
              collectedRelations.push({
                sourceSchema: fk.tableSchema || fk.table_schema || activeDb || undefined,
                sourceTable: fk.tableName || fk.table_name || table.name,
                sourceColumn: fk.columnName || fk.column_name,
                targetSchema: fk.referencedTableSchema || fk.referenced_table_schema || activeDb || undefined,
                targetTable: fk.referencedTable || fk.referenced_table,
                targetColumn: fk.referencedColumn || fk.referenced_column,
                isFocus: false
              })
            })
          } catch (err) {
            console.error(`Failed to load foreign keys for ${table.name}:`, err)
          }
        })
      }
    }

    if (currentSeq !== loadSequence) return

    // Deduplicate relations
    const uniqueRelations: FKRelation[] = []
    const relKeySet = new Set<string>()
    for (const r of collectedRelations) {
      const key = `${r.sourceSchema || ''}.${r.sourceTable.toLowerCase()}.${r.sourceColumn.toLowerCase()}->${r.targetSchema || ''}.${r.targetTable.toLowerCase()}.${r.targetColumn.toLowerCase()}`
      if (!relKeySet.has(key)) {
        relKeySet.add(key)
        uniqueRelations.push(r)
      }
    }

    // Atomically update relations without intermediate clearing
    relations.value = uniqueRelations

    // Fetch column details for visible tables (batched, max 6 concurrent)
    const tablesToFetch = visibleTables.value.filter(t => !schemaStore.detailsByTable[t.name.toLowerCase()])
    await runWithConcurrency(tablesToFetch, 6, async (table) => {
      if (currentSeq !== loadSequence) return
      const qualifiedName = table.schema ? `${table.schema}.${table.name}` : table.name
      await schemaStore.fetchTableDetails(qualifiedName).catch(() => null)
    })

    if (currentSeq !== loadSequence) return

    // Update fk indicators on columns
    for (const rel of uniqueRelations) {
      const srcDetails = schemaStore.detailsByTable[rel.sourceTable] || schemaStore.detailsByTable[rel.sourceTable.toLowerCase()]
      if (srcDetails) {
        const srcCol = srcDetails.columns.find(c => c.name.toLowerCase() === rel.sourceColumn.toLowerCase())
        if (srcCol) srcCol.fk = true
      }
    }

    resetLayout()
  } catch (err) {
    if (currentSeq === loadSequence) {
      console.error('Error loading schema diagram:', err)
      toast.error('Failed to load schema diagram: ' + (err instanceof Error ? err.message : String(err)))
    }
  } finally {
    if (currentSeq === loadSequence) {
      setTimeout(() => {
        if (currentSeq === loadSequence) {
          loading.value = false
        }
      }, 150)
    }
  }
}

// Drag & Pan Actions
function startPan(e: MouseEvent) {
  const target = e.target as HTMLElement
  // Start panning if clicking the grid container, the SVG line canvas, or the outer translated wrapper
  if (
    target.id === 'diagram-canvas' || 
    target.tagName.toLowerCase() === 'svg' || 
    target.classList.contains('canvas-wrapper')
  ) {
    isPanning.value = true
    dragStart.x = e.clientX
    dragStart.y = e.clientY
    panStart.x = pan.x
    panStart.y = pan.y
  }
}

// Mouse dragging table cards
function startDragTable(tableName: string, e: MouseEvent) {
  if (e.button !== 0) return // Left click only
  selectedTable.value = tableName // Instantly select card on drag/click
  draggedTable.value = tableName
  dragStart.x = e.clientX
  dragStart.y = e.clientY
  
  const currentPos = positions.value[tableName] || { x: 100, y: 100 }
  tableDragStart.x = currentPos.x
  tableDragStart.y = currentPos.y
}

function onMouseMove(e: MouseEvent) {
  if (isPanning.value) {
    const dx = e.clientX - dragStart.x
    const dy = e.clientY - dragStart.y
    pan.x = panStart.x + dx
    pan.y = panStart.y + dy
  } else if (draggedTable.value) {
    // Adjust mouse movement delta by current zoom factor
    const dx = (e.clientX - dragStart.x) / zoom.value
    const dy = (e.clientY - dragStart.y) / zoom.value
    
    positions.value[draggedTable.value] = {
      x: tableDragStart.x + dx,
      y: tableDragStart.y + dy
    }
  }
}

function onMouseUp() {
  isPanning.value = false
  draggedTable.value = null
}

// Connector Path Calculator
function computeOrthogonalPath(rel: FKRelation): string {
  const sName = rel.sourceTable
  const tName = rel.targetTable
  const sPos = positions.value[sName] || positions.value[sName.toLowerCase()]
  const tPos = positions.value[tName] || positions.value[tName.toLowerCase()]
  if (!sPos || !tPos) return ''

  const srcDetails = schemaStore.detailsByTable[sName] || schemaStore.detailsByTable[sName.toLowerCase()] || (rel.sourceSchema ? schemaStore.detailsByTable[`${rel.sourceSchema}.${sName}`.toLowerCase()] : null)
  const tgtDetails = schemaStore.detailsByTable[tName] || schemaStore.detailsByTable[tName.toLowerCase()] || (rel.targetSchema ? schemaStore.detailsByTable[`${rel.targetSchema}.${tName}`.toLowerCase()] : null)

  const srcCols = srcDetails?.columns || []
  const tgtCols = tgtDetails?.columns || []
  
  const sColIdx = srcCols.findIndex(c => c.name.toLowerCase() === rel.sourceColumn.toLowerCase())
  const tColIdx = tgtCols.findIndex(c => c.name.toLowerCase() === rel.targetColumn.toLowerCase())
  
  if (sColIdx === -1 || tColIdx === -1) return ''

  const cardWidth = 230
  const headerHeight = 33
  const rowHeight = 25
  
  const sY = sPos.y + headerHeight + sColIdx * rowHeight + (rowHeight / 2)
  const tY = tPos.y + headerHeight + tColIdx * rowHeight + (rowHeight / 2)

  let x1 = 0
  let y1 = sY
  let x2 = 0
  let y2 = tY

  if (sPos.x + cardWidth + 20 < tPos.x) {
    x1 = sPos.x + cardWidth
    x2 = tPos.x
  } else if (tPos.x + cardWidth + 20 < sPos.x) {
    x1 = sPos.x
    x2 = tPos.x + cardWidth
  } else {
    if (sPos.x < tPos.x) {
      x1 = sPos.x + cardWidth
      x2 = tPos.x
    } else {
      x1 = sPos.x
      x2 = tPos.x + cardWidth
    }
  }

  const midX = (x1 + x2) / 2
  return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`
}

function isConnectedTable(tableName: string): boolean {
  if (!selectedTable.value) return true
  const sel = selectedTable.value.toLowerCase()
  const target = tableName.toLowerCase()
  if (sel === target) return true
  
  return relations.value.some(r => 
    (r.sourceTable.toLowerCase() === sel && r.targetTable.toLowerCase() === target) ||
    (r.targetTable.toLowerCase() === sel && r.sourceTable.toLowerCase() === target)
  )
}

function isLineHighlighted(rel: FKRelation): boolean {
  if (!selectedTable.value) return false
  const sel = selectedTable.value.toLowerCase()
  return rel.sourceTable.toLowerCase() === sel || rel.targetTable.toLowerCase() === sel
}

function formatRelationTooltip(rel: FKRelation): string {
  const src = `${rel.sourceSchema ? rel.sourceSchema + '.' : ''}${rel.sourceTable}.${rel.sourceColumn}`
  const tgt = `${rel.targetSchema ? rel.targetSchema + '.' : ''}${rel.targetTable}.${rel.targetColumn}`
  return `${src} → ${tgt}`
}

function getLineStroke(rel: FKRelation): string {
  if (!selectedTable.value) {
    return rel.isFocus ? '#38bdf8' : 'var(--border)'
  }
  return isLineHighlighted(rel) ? 'var(--primary)' : 'var(--border)'
}

function getLineStrokeWidth(rel: FKRelation): number {
  if (!selectedTable.value) {
    return rel.isFocus ? 1.75 : 1.2
  }
  return isLineHighlighted(rel) ? 2.5 : 0.8
}

function getLineOpacity(rel: FKRelation): number {
  if (!selectedTable.value) return 1.0
  return isLineHighlighted(rel) ? 1.0 : 0.12
}

function getLineDashArray(rel: FKRelation): string | undefined {
  if (!selectedTable.value) {
    return rel.isFocus ? '4 3' : undefined
  }
  return undefined
}

function getLineMarker(rel: FKRelation): string {
  if (!selectedTable.value) {
    return rel.isFocus ? 'url(#arrow-dashed)' : 'url(#arrow-solid)'
  }
  return isLineHighlighted(rel) ? 'url(#arrow-active)' : 'url(#arrow-dimmed)'
}

onMounted(() => {
  loadSchemaDetails()
})

// Watch props, active connection/database, and schemaStore.tables to eliminate mount race conditions
watch(
  [() => props.tableName, () => connStore.activeId, () => connStore.activeConnection?.database, () => schemaStore.tables.length],
  () => {
    loadSchemaDetails()
  }
)

// Auto-recalculate layout only when new unpositioned tables arrive
watch(() => schemaStore.detailsByTable, () => {
  const hasUnpositioned = visibleTables.value.some(t => !positions.value[t.name])
  if (hasUnpositioned) {
    resetLayout(false)
  }
}, { deep: true })
</script>

<style scoped>
.cursor-grab { cursor: grab; }
.cursor-grabbing { cursor: grabbing; }

@keyframes dash {
  to {
    stroke-dashoffset: -20;
  }
}
.relation-line-active {
  stroke-dasharray: 6 4;
  animation: dash 1s linear infinite;
}
</style>
