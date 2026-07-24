import { defineStore } from 'pinia'
import { invoke } from '@tauri-apps/api/core'
import { useConnectionStore } from './connection'

export interface Column {
  name: string
  type: string
  orgName?: string
  orgTable?: string
}

export interface DbError {
  code: string
  message: string
  line?: number
  col?: number
}

export type CellValue = string | number | boolean | null

export type ResultRow = Record<string, CellValue>

export type ResultStatus = 'idle' | 'running' | 'success' | 'error'
export type ResultView = 'table' | 'json' | 'plan' | 'messages' | 'history'

export interface PagedQueryResult {
  columns: Column[]
  rows: ResultRow[]
  row_count: number
  duration_ms: number
  has_more: boolean
  offset: number
  limit: number
}

export interface SingleQueryResult {
  sql: string
  columns: Column[] | null
  rows: ResultRow[] | null
  row_count: number | null
  affected_rows: number | null
  duration_ms: number
  error: string | null
}

export interface QueryHistoryItem {
  id: string
  sql: string
  executed_at: string
  duration_ms: number
  row_count: number
  error: string | null
}

const MUTATING_KEYWORDS = new Set([
  'ALTER', 'CREATE', 'DELETE', 'DROP', 'GRANT', 'INSERT', 'LOAD', 'LOCK',
  'RENAME', 'REPLACE', 'REVOKE', 'TRUNCATE', 'UPDATE', 'CALL',
])

function hasMultipleStatements(sql: string): boolean {
  let inSingle = false
  let inDouble = false
  let inBacktick = false
  let foundStatement = false
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i]
    if (ch === '\'' && !inDouble && !inBacktick) { inSingle = !inSingle; continue }
    if (ch === '"' && !inSingle && !inBacktick) { inDouble = !inDouble; continue }
    if (ch === '`') { inBacktick = !inBacktick; continue }
    if (ch === ';' && !inSingle && !inDouble && !inBacktick) {
      foundStatement = true
    }
  }
  return foundStatement
}

function stripSqlLiterals(sql: string): string {
  return sql
    .replace(/'[^']*'/g, '')
    .replace(/"[^"]*"/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
}

function isDestructiveQuery(sql: string): boolean {
  const cleaned = stripSqlLiterals(sql).trim()
  if (!cleaned) return false
  const firstWord = cleaned.split(/\s+/)[0].toUpperCase().replace(/[();,]/g, '')
  return MUTATING_KEYWORDS.has(firstWord)
}

function fixBacktickedIdentifiers(sql: string): string {
  return sql.replace(/`([^`]+)`/g, (match, content) => {
    if (content.includes('.')) {
      return content.split('.')
        .map((part: string) => `\`${part}\``)
        .join('.')
    }
    return match
  })
}

export interface PendingWriteQuery {
  sql: string
  resolve: (confirmed: boolean) => void
}

export const useResultStore = defineStore('result', {
  state: () => ({
    rows: [] as ResultRow[],
    columns: [] as Column[],
    planColumns: [] as Column[],
    planRows: [] as ResultRow[],
    status: 'idle' as ResultStatus,
    duration: 0,
    activeView: 'table' as ResultView,
    error: null as DbError | null,
    selectedRows: new Set<string>(),
    messages: [] as string[],
    requestId: 0,
    history: [] as QueryHistoryItem[],
    pendingWriteQuery: null as PendingWriteQuery | null,
    lastSql: '',
    lastDatabase: '',
    lastAffectedRows: 0,
    pageSize: 100,
    pageOffset: 0,
    hasMore: false,
    loadingMore: false,
    totalEstimate: null as number | null,
    editingCell: null as { rowIndex: number; colName: string } | null,
    editValue: '',
    dirtyCells: {} as Record<string, Record<string, CellValue>>,
    savingEdits: false,
    cancelling: false,
    multiResults: [] as SingleQueryResult[],
    activeResultIndex: 0,
  }),

  getters: {
    rowCount: (state) => state.rows.length,
    hasSelection: (state) => state.selectedRows.size > 0,
    selectionCount: (state) => state.selectedRows.size,
    showMultiTabs: (state) => state.multiResults.length > 1,
    multiResultCount: (state) => state.multiResults.length,
    activeResult: (state) => state.multiResults.length > 0 ? state.multiResults[state.activeResultIndex] : null,
  },

  actions: {
    async cancelQuery() {
      this.cancelling = true
      try {
        await invoke('cancel_query')
        this.messages.push('Query cancelled.')
      } catch (err) {
        this.messages.push(`Cancel error: ${String(err)}`)
      }
      this.cancelling = false
    },

    async runQuery(_sql: string) {
      if (this.status === 'running') {
        this.error = { code: 'QUERY_RUNNING', message: 'Only one SQL statement can be executed at a time.' }
        this.status = 'error'
        this.messages = ['[QUERY_ERROR] Only one SQL statement can be executed at a time.']
        this.activeView = 'messages'
        return
      }
      _sql = fixBacktickedIdentifiers(_sql)
      const connStore = useConnectionStore()
      if (isDestructiveQuery(_sql)) {
        if (connStore.activeConnection?.readOnly) {
          this.error = { code: 'READ_ONLY_CONNECTION', message: 'Connection is in read-only mode. Write queries are blocked.' }
          this.status = 'error'
          this.messages = ['Error: Connection is in read-only mode. Write queries are blocked.']
          this.activeView = 'messages'
          return
        }
        const confirmed = await this.confirmDestructiveQuery(_sql)
        if (!confirmed) return
        await this.runWriteQuery(_sql)
        return
      }

      if (hasMultipleStatements(_sql)) {
        await this.runMultiQuery(_sql)
        return
      }

      // Pass the raw SQL to the backend, which now safely appends LIMIT internally

      const requestId = ++this.requestId
      this.status = 'running'
      this.error = null
      this.selectedRows = new Set()
      this.lastSql = _sql
      this.lastDatabase = connStore.activeConnection?.database ?? ''
      this.pageOffset = 0
      this.hasMore = false
      this.loadingMore = false
      this.multiResults = []
      try {
        const connId = useConnectionStore().activeId
        const result = await invoke<PagedQueryResult>('run_query_paged', {
          sql: _sql,
          limit: this.pageSize,
          offset: 0,
          id: connId,
        })
        if (requestId !== this.requestId) return
        this.rows = result.rows as ResultRow[]
        this.columns = result.columns
        this.planRows = []
        this.planColumns = []
        this.duration = (result as any).durationMs ?? result.duration_ms
        this.hasMore = result.has_more
        this.pageOffset = result.row_count
        this.status = 'success'
        const more = result.has_more ? ` (scrolled for more)` : ''
        const msgs = [`Query completed successfully. ${result.row_count} rows returned in ${this.duration}ms.${more}`]

        this.messages = msgs
        this.activeView = 'table'
      } catch (err) {
        if (requestId !== this.requestId) return
        this.error = {
          code: 'QUERY_ERROR',
          message: String(err),
        }
        this.status = 'error'
        this.messages = [`Error: ${String(err)}`]
        this.activeView = 'messages'
      }
      this.loadHistory()
    },

    async runMultiQuery(_sql: string) {
      if (this.status === 'running') {
        this.error = { code: 'QUERY_RUNNING', message: 'Only one SQL statement can be executed at a time.' }
        this.status = 'error'
        this.messages = ['[QUERY_ERROR] Only one SQL statement can be executed at a time.']
        this.activeView = 'messages'
        return
      }
      _sql = fixBacktickedIdentifiers(_sql)
      const requestId = ++this.requestId
      this.status = 'running'
      this.error = null
      this.selectedRows = new Set()
      this.multiResults = []
      this.activeResultIndex = 0
      try {
        const connId = useConnectionStore().activeId
        const results = await invoke<SingleQueryResult[]>('run_multi_query', {
          sql: _sql,
          id: connId,
        })
        if (requestId !== this.requestId) return
        this.multiResults = results
        this.activeResultIndex = 0

        const first = results[0]
        if (first && first.error) {
          this.error = { code: 'MULTI_QUERY_ERROR', message: first.error }
          this.status = 'error'
          this.messages = [`Error: ${first.error}`]
          this.activeView = 'messages'
          if (results.length === 1) {
            this.multiResults = []
          }
        } else if (first && first.columns) {
          this.rows = first.rows as ResultRow[]
          this.columns = first.columns
          this.duration = (first as any).durationMs ?? first.duration_ms
          this.status = 'success'
          const total = results.reduce((s, r) => s + (r.row_count ?? r.affected_rows ?? 0), 0)
          this.messages = results.length > 1
            ? [`Multi-query returned ${results.length} results, ${total} total rows.`]
            : [`Query completed successfully. ${first.row_count} rows returned in ${this.duration}ms.`]
          this.activeView = 'table'
        } else if (first && first.affected_rows !== null) {
          this.lastAffectedRows = first.affected_rows
          this.status = 'success'
          this.messages = [`Query executed successfully. ${first.affected_rows} rows affected in ${first.duration_ms}ms.`]
          this.activeView = 'messages'
        }
      } catch (err) {
        if (requestId !== this.requestId) return
        this.error = { code: 'MULTI_QUERY_ERROR', message: String(err) }
        this.status = 'error'
        this.messages = [`Error: ${String(err)}`]
        this.activeView = 'messages'
      }
      this.loadHistory()
    },

    selectResultTab(index: number) {
      if (index < 0 || index >= this.multiResults.length) return
      this.activeResultIndex = index
      const result = this.multiResults[index]
      if (result.error) {
        this.error = { code: 'QUERY_ERROR', message: result.error }
        this.status = 'error'
        this.activeView = 'messages'
      } else if (result.columns) {
        this.rows = result.rows as ResultRow[]
        this.columns = result.columns
        this.duration = (result as any).durationMs ?? result.duration_ms
        this.status = 'success'
        this.activeView = 'table'
      } else if (result.affected_rows !== null) {
        this.lastAffectedRows = result.affected_rows
        this.status = 'success'
        this.activeView = 'messages'
      }
    },

    confirmDestructiveQuery(sql: string): Promise<boolean> {
      return new Promise((resolve) => {
        this.pendingWriteQuery = { sql, resolve }
      })
    },

    async fetchNextPage() {
      if (!this.hasMore || this.loadingMore || !this.lastSql) return
      this.loadingMore = true
      try {
        const connId = useConnectionStore().activeId
        const result = await invoke<PagedQueryResult>('run_query_paged', {
          sql: this.lastSql,
          limit: this.pageSize,
          offset: this.pageOffset,
          id: connId,
        })
        const newRows = result.rows as ResultRow[]
        this.rows.push(...newRows)
        this.hasMore = result.has_more
        this.pageOffset += newRows.length
        this.duration += (result as any).durationMs ?? result.duration_ms
        this.messages = [
          `Query completed successfully. ${this.rows.length} rows returned.${this.hasMore ? ' (scrolled for more)' : ''}`
        ]
      } catch (err) {
        this.messages.push(`Error fetching more: ${String(err)}`)
      }
      this.loadingMore = false
    },

    setPageSize(size: number) {
      this.pageSize = Math.min(Math.max(size, 50), 500)
    },

    startEditing(rowIndex: number, colName: string) {
      this.editingCell = { rowIndex, colName }
      const val = this.rows[rowIndex]?.[colName]
      this.editValue = val === null ? '' : String(val)
    },

    cancelEditing() {
      this.editingCell = null
      this.editValue = ''
    },

    commitEdit(rowIndex: number, colName: string, value: string) {
      const row = this.rows[rowIndex]
      if (!row) return
      const key = String(rowIndex)
      if (!this.dirtyCells[key]) this.dirtyCells[key] = {}
      this.dirtyCells[key][colName] = value
      row[colName] = value
      this.editingCell = null
      this.editValue = ''
    },

    revertCell(rowIndex: number, colName: string) {
      const key = String(rowIndex)
      if (this.dirtyCells[key]) {
        delete this.dirtyCells[key][colName]
        if (Object.keys(this.dirtyCells[key]).length === 0) {
          delete this.dirtyCells[key]
        }
      }
    },

    revertAllEdits() {
      this.dirtyCells = {}
    },

    async saveEdits(tableName: string, pkColumns: string[]) {
      if (pkColumns.length === 0) {
        this.messages.push('Error: No primary key columns found for this table. Edits cannot be saved.')
        return
      }
      this.savingEdits = true
      try {
        for (const [rowKey, cells] of Object.entries(this.dirtyCells)) {
          const rowIndex = parseInt(rowKey)
          const row = this.rows[rowIndex]
          if (!row) continue
          const pks: { column: string; value: CellValue }[] = []
          for (const pk of pkColumns) {
            if (row[pk] !== undefined) {
              pks.push({ column: pk, value: row[pk] })
            }
          }
          const updates: { column: string; value: CellValue }[] = []
          for (const [col, val] of Object.entries(cells)) {
            updates.push({ column: col, value: val })
          }
          const connId = useConnectionStore().activeId
          const result = await invoke<{ affected_rows: number; duration_ms: number; warning: string | null }>('update_rows', {
            table: tableName,
            updates,
            pks,
            id: connId,
          })
          if (result.affected_rows === 0) {
            this.messages.push(`Warning: Row ${rowIndex + 1} was not updated (no matching rows).`)
          }
        }
        this.dirtyCells = {}
        this.messages.push('Edits saved successfully.')
        this.activeView = 'messages'
      } catch (err) {
        this.messages.push(`Error saving edits: ${String(err)}`)
      }
      this.savingEdits = false
    },

    async runWriteQuery(_sql: string) {
      if (this.status === 'running') {
        this.error = { code: 'QUERY_RUNNING', message: 'Only one SQL statement can be executed at a time.' }
        this.status = 'error'
        this.messages = ['[QUERY_ERROR] Only one SQL statement can be executed at a time.']
        this.activeView = 'messages'
        return
      }
      _sql = fixBacktickedIdentifiers(_sql)
      const requestId = ++this.requestId
      this.status = 'running'
      this.error = null
      this.selectedRows = new Set()
      try {
        const connId = useConnectionStore().activeId
        const result = await invoke<{ affected_rows: number, duration_ms: number, warning: string | null }>('run_write_query', { sql: _sql, id: connId })
        if (requestId !== this.requestId) return
        this.lastAffectedRows = result.affected_rows
        this.rows = []
        this.columns = []
        this.multiResults = []
        this.planRows = []
        this.planColumns = []
        this.duration = (result as any).durationMs ?? result.duration_ms
        this.status = 'success'
        const msg = `Query executed successfully. ${result.affected_rows} rows affected in ${this.duration}ms.`
        this.messages = result.warning ? [msg, `Warning: ${result.warning}`] : [msg]
        this.activeView = 'messages'
      } catch (err) {
        if (requestId !== this.requestId) return
        this.error = {
          code: 'WRITE_QUERY_ERROR',
          message: String(err),
        }
        this.status = 'error'
        this.messages = [`Error: ${String(err)}`]
        this.activeView = 'messages'
      }
      this.loadHistory()
    },
    async explainQuery(sql: string) {
      if (this.status === 'running') {
        this.error = { code: 'QUERY_RUNNING', message: 'Only one SQL statement can be executed at a time.' }
        this.status = 'error'
        this.messages = ['[QUERY_ERROR] Only one SQL statement can be executed at a time.']
        this.activeView = 'messages'
        return
      }
      sql = fixBacktickedIdentifiers(sql)
      const requestId = ++this.requestId
      this.status = 'running'
      this.error = null
      this.selectedRows = new Set()
      const cleanSql = sql.trim().replace(/;+$/, '')
      const explainSql = cleanSql.toUpperCase().startsWith('EXPLAIN') ? cleanSql : `EXPLAIN ${cleanSql}`

	      try {
	        const connId = useConnectionStore().activeId
	        const result = await invoke<{ columns: Column[], rows: ResultRow[], duration_ms: number, row_count: number }>('run_query', { sql: explainSql, id: connId })
	        if (requestId !== this.requestId) return
	        this.planRows = result.rows
        this.planColumns = result.columns
        this.duration = (result as any).durationMs ?? result.duration_ms
        this.status = 'success'
        this.messages = [`Execution plan returned ${result.row_count} rows in ${this.duration}ms.`]
        this.activeView = 'plan'
	      } catch (err) {
	        if (requestId !== this.requestId) return
	        this.error = {
          code: 'EXPLAIN_ERROR',
          message: String(err),
        }
        this.status = 'error'
        this.messages = [`Explain error: ${String(err)}`]
        this.activeView = 'messages'
      }
    },
    setActiveView(view: ResultView) {
      this.activeView = view
    },
    toggleRowSelection(rowKey: string) {
      if (this.selectedRows.has(rowKey)) {
        this.selectedRows.delete(rowKey)
      } else {
        this.selectedRows.add(rowKey)
      }
    },
    selectAllRows() {
      this.rows.forEach((_, i) => this.selectedRows.add(String(i)))
    },
    clearSelection() {
      this.selectedRows = new Set()
    },
	    async loadHistory() {
	      try {
	        this.history = await invoke<QueryHistoryItem[]>('get_history')
	      } catch (e) {
	        console.error('Failed to load history:', e)
	      }
	    },
    clearResults() {
      this.rows = []
      this.columns = []
      this.planRows = []
      this.planColumns = []
      this.status = 'idle'
      this.duration = 0
      this.error = null
      this.selectedRows = new Set()
      this.multiResults = []
      this.activeResultIndex = 0
      this.messages = []
      this.activeView = 'table'
      this.requestId++
    },

    async runProcesslist() {
      await this.runQuery('SHOW FULL PROCESSLIST;')
    },

    async killSession(threadId: number) {
      try {
        const connId = useConnectionStore().activeId
        await invoke('kill_session', { threadId, id: connId })
        this.messages.push(`Killed session ${threadId}. Refreshing processlist...`)
        await this.runProcesslist()
      } catch (err) {
        this.messages.push(`Error killing session ${threadId}: ${String(err)}`)
        this.activeView = 'messages'
      }
    },
    exportCsv() {
      const cols = this.multiResults.length > 0 ? this.multiResults[this.activeResultIndex]?.columns ?? this.columns : this.columns
      if (!cols.length) return
      const rows = this.multiResults.length > 0 ? this.multiResults[this.activeResultIndex]?.rows ?? this.rows : this.rows
      const csvEscape = (value: string) => {
        if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
        return value
      }
      const header = cols.map(c => csvEscape(c.name)).join(',')
      const body = rows.map(row =>
        cols.map(c => {
          const val = row[c.name]
          if (val === null || val === undefined) return ''
          return csvEscape(String(val))
        }).join(',')
      )
      const csv = [header, ...body].join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `query_result_${Date.now()}.csv`
      a.click()
      URL.revokeObjectURL(url)
    },
  },
})
