<template>
  <div class="result-pane flex flex-col overflow-hidden bg-background min-h-0 flex-1 font-mono text-xs select-none">
    <!-- Pinned Results & Multi-Statement Tab Bar -->
    <div
      v-if="resultStore.pinnedResults.length > 0 || (resultStore.multiResults.length > 1 && resultStore.activeResultTabId === 'current')"
      class="flex items-center h-8 bg-muted/30 border-b border-border/80 px-2 gap-1 flex-shrink-0 select-none overflow-x-auto"
    >
      <!-- Current Active Query Tab -->
      <button
        v-if="resultStore.pinnedResults.length > 0"
        class="inline-flex items-center gap-1.5 px-2.5 h-6 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent/40 rounded transition-all cursor-pointer border-none bg-transparent"
        :class="{ 'bg-background text-foreground shadow-[inset_0_-1.5px_0_0_var(--primary)] font-semibold': resultStore.activeResultTabId === 'current' }"
        @click="resultStore.activeResultTabId = 'current'"
      >
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        <span>Active Result</span>
      </button>

      <!-- Multi-Statement Sub-Tabs (e.g. Statement 1, Statement 2) -->
      <template v-if="resultStore.multiResults.length > 1 && resultStore.activeResultTabId === 'current'">
        <div v-if="resultStore.pinnedResults.length > 0" class="h-3.5 w-px bg-border/60 mx-1"></div>
        <button
          v-for="(stmt, idx) in resultStore.multiResults"
          :key="idx"
          class="inline-flex items-center gap-1 px-2 h-6 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent/40 rounded transition-all cursor-pointer border-none bg-transparent"
          :class="{ 'bg-background text-primary font-semibold shadow-[inset_0_-1.5px_0_0_var(--primary)]': resultStore.activeResultIndex === idx }"
          @click="selectMultiResult(idx)"
        >
          <span class="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[9.5px] font-bold">
            {{ idx + 1 }}
          </span>
          <span class="max-w-[120px] truncate">{{ getStatementLabel(stmt.sql) }}</span>
          <span v-if="stmt.rows" class="text-[9.5px] text-muted-foreground/70">({{ stmt.rows.length }})</span>
          <span v-else-if="stmt.error" class="w-1.5 h-1.5 rounded-full bg-red-500"></span>
        </button>
      </template>

      <!-- Pinned Tabs List -->
      <div 
        v-for="pin in resultStore.pinnedResults" 
        :key="pin.id"
        class="group inline-flex items-center gap-1.5 px-2.5 h-6 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent/40 rounded transition-all cursor-pointer relative"
        :class="{ 'bg-background text-foreground shadow-[inset_0_-1.5px_0_0_var(--primary)] font-semibold': resultStore.activeResultTabId === pin.id }"
        @click="resultStore.activeResultTabId = pin.id"
      >
        <PhPushPin class="w-3 h-3 text-primary flex-shrink-0" weight="fill" />
        <span class="max-w-[120px] truncate" :title="pin.sql">{{ getStatementLabel(pin.sql) }}</span>
        <!-- Unpin button -->
        <button
          class="inline-flex items-center justify-center w-3.5 h-3.5 rounded text-muted-foreground/50 hover:text-foreground hover:bg-accent cursor-pointer border-none bg-transparent opacity-0 group-hover:opacity-100 transition-opacity ml-0.5"
          title="Unpin Tab"
          @click.stop="resultStore.unpinResult(pin.id)"
        >
          <PhX class="w-2.5 h-2.5" />
        </button>
      </div>
    </div>

    <!-- Main View Switcher & Actions Toolbar -->
    <div class="flex items-center justify-between h-8.5 chrome-bar border-b border-border/80 px-2 flex-shrink-0 gap-2">
      <!-- Left: View Mode Pills (Table, JSON, Plan, Messages, History) -->
      <div class="flex items-center gap-1 bg-muted/40 p-0.5 rounded-md">
        <button
          v-for="v in VIEWS"
          :key="v.id"
          class="px-2.5 py-1 text-[11px] font-medium rounded-sm transition-colors border-none cursor-pointer"
          :class="resultStore.activeView === v.id ? 'bg-background text-foreground shadow-2xs font-semibold' : 'text-muted-foreground hover:text-foreground bg-transparent'"
          @click="resultStore.setActiveView(v.id as any)"
        >
          {{ v.label }}
        </button>
      </div>

      <!-- Right: Paged limits, Pinning & Quick actions -->
      <div class="flex items-center gap-1.5 flex-shrink-0">
        <!-- Page size selector -->
        <div v-if="resultStore.activeView === 'table' && currentColumns.length > 0" class="flex items-center border border-border/60 rounded bg-background h-6.5 text-[10.5px]">
          <select
            class="bg-transparent px-1.5 text-foreground outline-none font-mono cursor-pointer border-none"
            :value="resultStore.pageSize"
            @change="onPageSizeChange"
          >
            <option :value="50">50</option>
            <option :value="100">100</option>
            <option :value="250">250</option>
            <option :value="500">500</option>
            <option :value="1000">1000</option>
          </select>
        </div>

        <!-- Pin Result Button -->
        <ActionTooltip :text="isCurrentPinned ? 'Unpin Result Tab' : 'Pin Result Tab'">
          <Button
            v-if="currentStatus === 'success' && currentColumns.length > 0"
            variant="outline"
            size="sm"
            class="h-6.5 px-2 text-[11px] gap-1 rounded bg-background"
            :class="{ 'border-primary text-primary bg-primary/10': isCurrentPinned }"
            @click="togglePin"
          >
            <PhPushPin class="w-3 h-3" :weight="isCurrentPinned ? 'fill' : 'regular'" />
            <span class="hidden sm:inline">{{ isCurrentPinned ? 'Pinned' : 'Pin' }}</span>
          </Button>
        </ActionTooltip>

        <!-- Clear Results -->
        <ActionTooltip text="Clear Results">
          <Button
            variant="ghost"
            size="icon"
            class="h-6.5 w-6.5 text-muted-foreground hover:text-foreground rounded"
            @click="resultStore.clearResults()"
          >
            <PhTrash class="w-3.5 h-3.5" />
          </Button>
        </ActionTooltip>
      </div>
    </div>

    <!-- Main View Contents -->
    <div class="flex-1 min-h-0 overflow-hidden flex flex-col relative bg-background">
      <!-- Error Banner (if any) -->
      <div
        v-if="currentStatus === 'error' && currentError"
        class="m-3 p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex flex-col gap-2 select-text"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 text-red-400 font-semibold text-xs">
            <PhWarningCircle class="w-4 h-4 text-red-500 flex-shrink-0" />
            <span>Query Failed · {{ currentError.code }}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            class="h-6 px-2 text-[10.5px] gap-1 rounded bg-background border-red-500/30 text-red-300 hover:bg-red-500/20"
            @click="copyError"
          >
            <PhCopy class="w-3 h-3" />
            <span>Copy Error</span>
          </Button>
        </div>

        <pre class="text-xs text-red-300 font-mono whitespace-pre-wrap break-all bg-black/30 p-2.5 rounded border border-red-500/20 leading-relaxed">{{ currentError.message }}</pre>

        <!-- Dynamic Helpful Diagnostic Hint -->
        <div v-if="currentError.hint" class="flex items-start gap-2 text-[11.5px] text-amber-300 bg-amber-500/10 border border-amber-500/25 px-3 py-2 rounded-md font-mono">
          <PhLightbulb class="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div class="flex-1 min-w-0">
            <span class="font-semibold text-amber-300">Diagnostic Hint:</span>
            <p class="text-amber-200/90 mt-0.5 leading-relaxed">{{ currentError.hint }}</p>
          </div>
        </div>
      </div>

      <!-- TABLE VIEW: Powered by UnifiedDataGrid -->
      <template v-else-if="resultStore.activeView === 'table'">
        <UnifiedDataGrid
          :columns="currentColumns"
          :rows="currentRows"
          :table-name="editableTableName"
          :duration-ms="currentDuration"
          :loading="currentStatus === 'running'"
          @save-edits="handleBatchSaveEdits"
          @refresh="refreshActive"
        />
      </template>

      <!-- PLAN VIEW (Explain) -->
      <template v-else-if="resultStore.activeView === 'plan'">
        <div v-if="resultStore.planRows.length" class="flex-1 flex flex-col min-h-0">
          <UnifiedDataGrid
            :columns="resultStore.planColumns"
            :rows="resultStore.planRows"
            :duration-ms="resultStore.duration"
          />
        </div>
        <div v-else class="flex-1 flex items-center justify-center p-4">
          <EmptyState
            title="No execution plan"
            description="Run Explain (⌘E) on a query to inspect its execution plan and index performance."
          >
            <template #icon>
              <PhTreeStructure class="w-6 h-6 text-muted-foreground/50" />
            </template>
          </EmptyState>
        </div>
      </template>

      <!-- MESSAGES VIEW -->
      <template v-else-if="resultStore.activeView === 'messages'">
        <div class="flex-1 overflow-auto p-4 select-text font-mono text-xs space-y-1.5">
          <div
            v-for="(msg, i) in currentMessages"
            :key="i"
            class="p-2 rounded border leading-relaxed"
            :class="msg.toLowerCase().includes('error') ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-muted/20 border-border/60 text-muted-foreground'"
          >
            {{ msg }}
          </div>
          <div v-if="!currentMessages.length" class="text-muted-foreground/50 text-center py-6">
            No execution messages
          </div>
        </div>
      </template>

      <!-- HISTORY VIEW -->
      <template v-else-if="resultStore.activeView === 'history'">
        <div class="flex-1 overflow-auto p-2 font-mono text-xs select-none">
          <div
            v-for="item in resultStore.history"
            :key="item.id"
            class="group p-2.5 mb-1.5 rounded-lg border border-border/60 bg-muted/10 hover:bg-muted/30 transition-colors flex items-start justify-between gap-3 cursor-pointer"
            @click="runHistoryItem(item.sql)"
          >
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 mb-1">
                <span
                  class="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  :class="item.error ? 'bg-red-500' : 'bg-emerald-500'"
                ></span>
                <span class="text-[10px] text-muted-foreground">{{ formatHistoryTime(item.executed_at) }}</span>
                <span class="text-[10px] text-muted-foreground/70 font-mono">· {{ item.duration_ms }}ms · {{ item.row_count }} rows</span>
              </div>
              <pre class="text-[11.5px] text-foreground font-mono truncate select-text">{{ item.sql }}</pre>
            </div>

            <Button variant="ghost" size="sm" class="h-6 px-2 text-[10px] gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80" @click.stop="copyText(item.sql)">
              <PhCopy class="w-3 h-3" />
              <span>Copy</span>
            </Button>
          </div>

          <div v-if="!resultStore.history.length" class="text-muted-foreground/50 text-center py-8">
            No queries recorded in history yet
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { useResultStore, type Column, type ResultRow } from '@/stores/result'
import { useConnectionStore } from '@/stores/connection'
import { useSchemaStore } from '@/stores/schema'
import UnifiedDataGrid from './UnifiedDataGrid.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { Button } from '@/components/ui/button'
import { ActionTooltip } from '@/components/ui/tooltip'
import {
  PhPushPin, PhX, PhTreeStructure, PhCopy, PhTrash, PhWarningCircle, PhLightbulb
} from '@phosphor-icons/vue'
import { toast } from 'vue-sonner'

const resultStore = useResultStore()
const schemaStore = useSchemaStore()

const VIEWS = [
  { id: 'table', label: 'Table' },
  { id: 'plan', label: 'Execution Plan' },
  { id: 'messages', label: 'Messages' },
  { id: 'history', label: 'History' },
]

// Determine active result data (Current vs Pinned vs Multi)
const isPinnedActive = computed(() => resultStore.activeResultTabId !== 'current')
const activePinnedResult = computed(() => resultStore.pinnedResults.find(p => p.id === resultStore.activeResultTabId))

const currentColumns = computed<Column[]>(() => {
  if (isPinnedActive.value && activePinnedResult.value) {
    return activePinnedResult.value.columns
  }
  if (resultStore.multiResults.length > 0 && resultStore.activeResultTabId === 'current') {
    const multi = resultStore.multiResults[resultStore.activeResultIndex]
    return multi?.columns || []
  }
  return resultStore.columns
})

const currentRows = computed<ResultRow[]>(() => {
  if (isPinnedActive.value && activePinnedResult.value) {
    return activePinnedResult.value.rows
  }
  if (resultStore.multiResults.length > 0 && resultStore.activeResultTabId === 'current') {
    const multi = resultStore.multiResults[resultStore.activeResultIndex]
    return multi?.rows || []
  }
  return resultStore.rows
})

const currentDuration = computed<number>(() => {
  if (isPinnedActive.value && activePinnedResult.value) {
    return activePinnedResult.value.duration
  }
  if (resultStore.multiResults.length > 0 && resultStore.activeResultTabId === 'current') {
    const multi = resultStore.multiResults[resultStore.activeResultIndex]
    return multi?.duration_ms || 0
  }
  return resultStore.duration
})

const currentStatus = computed(() => {
  if (isPinnedActive.value) return 'success'
  return resultStore.status
})

const currentError = computed(() => {
  if (isPinnedActive.value && activePinnedResult.value) {
    return activePinnedResult.value.error
  }
  return resultStore.error
})

const currentMessages = computed(() => {
  if (isPinnedActive.value && activePinnedResult.value) {
    return activePinnedResult.value.messages
  }
  return resultStore.messages
})

const isCurrentPinned = computed(() => {
  if (isPinnedActive.value) return true
  return resultStore.pinnedResults.some(p => p.sql === resultStore.lastSql && resultStore.lastSql.length > 0)
})

const editableTableName = computed(() => {
  const cols = currentColumns.value
  if (!cols.length) return undefined

  const firstColWithTable = cols.find(c => c.orgTable)
  if (firstColWithTable && firstColWithTable.orgTable) {
    const tbl = firstColWithTable.orgTable
    const schema = firstColWithTable.schema
    if (schema) {
      return `${schema}.${tbl}`
    }
    return tbl
  }

  // Fallback: extract table from active SQL statement
  const sql = currentSql.value || resultStore.lastSql || ''
  const match = sql.match(/FROM\s+([`"'\w]+(?:\.[`"'\w]+)?)/i)
  if (match) {
    return match[1].replace(/[`"']/g, '')
  }
  return schemaStore.activeTable || undefined
})

function getStatementLabel(sql: string): string {
  const match = sql.match(/FROM\s+([a-zA-Z0-9_`"'\.]+)/i)
  if (match) return match[1].replace(/[`"']/g, '')
  const firstWord = sql.trim().split(/\s+/)[0].toUpperCase()
  return firstWord || 'Query'
}

function selectMultiResult(index: number) {
  resultStore.activeResultIndex = index
}

function togglePin() {
  if (isCurrentPinned.value) {
    if (activePinnedResult.value) {
      resultStore.unpinResult(activePinnedResult.value.id)
    }
  } else {
    resultStore.pinCurrentResult()
    toast.success('Pinned result tab')
  }
}

function onPageSizeChange(e: Event) {
  const val = parseInt((e.target as HTMLSelectElement).value)
  resultStore.pageSize = val
  if (resultStore.lastSql) {
    resultStore.runQuery(resultStore.lastSql)
  }
}

async function handleBatchSaveEdits(
  updates: { rowIndex: number; changes: Record<string, any> }[],
  onSuccess?: () => void
) {
  if (!editableTableName.value) {
    toast.error('Cannot determine target table for edits')
    return
  }

  const targetTable = editableTableName.value
  const connStore = useConnectionStore()
  if (connStore.activeConnection?.readOnly) {
    toast.error('Connection is in Read-Only mode. Edits are blocked.')
    return
  }

  // Ensure we have table details/PK metadata (fetching dynamically for cross-schema tables if not cached)
  let keyInfo = schemaStore.getKeyColumnsForTable(targetTable)
  if (keyInfo.columns.length === 0) {
    try {
      await schemaStore.fetchTableDetails(targetTable)
      keyInfo = schemaStore.getKeyColumnsForTable(targetTable)
    } catch {
      // Fallback
    }
  }

  try {
    resultStore.savingEdits = true
    const connId = connStore.activeId

    // Build all row updates and dispatch a single batch transaction to Rust
    const batch: { updates: { column: string; value: any }[]; pks: { column: string; value: any }[] }[] = []

    for (const update of updates) {
      const row = currentRows.value[update.rowIndex]
      if (!row) continue

      const effectiveKeys = (keyInfo.columns && keyInfo.columns.length > 0)
        ? keyInfo.columns
        : currentColumns.value.map(c => c.name)

      const pks: { column: string; value: any }[] = []
      for (const keyCol of effectiveKeys) {
        const colDef = currentColumns.value.find(c => 
          (c.orgName || c.name).toLowerCase() === keyCol.toLowerCase() ||
          c.name.toLowerCase() === keyCol.toLowerCase()
        )
        const val = colDef ? row[colDef.name] : row[keyCol]
        if (val !== undefined) {
          pks.push({ column: keyCol, value: val })
        }
      }

      if (pks.length === 0) {
        // Fallback: match all non-null columns
        for (const col of currentColumns.value) {
          const val = row[col.name]
          if (val !== undefined && val !== null) {
            pks.push({ column: col.orgName || col.name, value: val })
          }
        }
      }

      const changesList: { column: string; value: any }[] = []
      for (const [colName, val] of Object.entries(update.changes)) {
        const colDef = currentColumns.value.find(c => c.name === colName)
        const actualCol = colDef?.orgName || colName
        changesList.push({ column: actualCol, value: val })
      }

      batch.push({ updates: changesList, pks })
    }

    const res = await invoke<{ affected_rows: number; duration_ms: number; warning: string | null }>('batch_update_rows', {
      table: targetTable,
      batch,
      id: connId,
    })

    onSuccess?.()
    resultStore.dirtyCells = {}
    toast.success(`Successfully saved ${res.affected_rows} modified row(s) in ${res.duration_ms}ms`)
    refreshActive()
  } catch (err) {
    toast.error('Failed to apply edits', { description: String(err) })
  } finally {
    resultStore.savingEdits = false
  }
}

function refreshActive() {
  if (resultStore.lastSql) {
    resultStore.runQuery(resultStore.lastSql)
  }
}

function runHistoryItem(sql: string) {
  resultStore.runQuery(sql)
}

function copyError() {
  if (currentError.value) {
    navigator.clipboard.writeText(`[${currentError.value.code}] ${currentError.value.message}`)
    toast.success('Copied error to clipboard')
  }
}

function copyText(txt: string) {
  navigator.clipboard.writeText(txt)
  toast.success('Copied to clipboard')
}

function formatHistoryTime(isoStr: string): string {
  try {
    const d = new Date(isoStr)
    return d.toLocaleTimeString()
  } catch {
    return isoStr
  }
}
</script>
