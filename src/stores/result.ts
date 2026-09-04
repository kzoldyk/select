import { defineStore } from 'pinia'
import { markRaw } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { useConnectionStore } from './connection'
import { useUiStore } from './ui'
import { playSound } from '../lib/cuelume'

function cloneSnapshot<T>(value: T): T {
  try {
    return JSON.parse(JSON.stringify(value)) as T
  } catch {
    return value
  }
}

export interface Column {
  name: string
  type: string
  key?: string
  orgName?: string
  orgTable?: string
  schema?: string
}

export interface DbError {
  code: string
  message: string
  line?: number
  col?: number
  near?: string
  hint?: string
}

export function parseDatabaseError(err: unknown, sql?: string): DbError {
  const errMsg = typeof err === 'string' ? err : (err && typeof err === 'object' && 'message' in err) ? String((err as any).message) : String(err)
  const isInterrupted = errMsg.toLowerCase().includes('interrupted') || errMsg.toLowerCase().includes('cancelled') || errMsg.toLowerCase().includes('kill')

  if (isInterrupted) {
    return {
      code: 'QUERY_CANCELLED',
      message: 'Query execution was cancelled or interrupted.',
    }
  }

  let code = 'QUERY_ERROR'
  let line: number | undefined
  let col: number | undefined
  let near: string | undefined
  let hint: string | undefined

  const mysqlCodeMatch = errMsg.match(/(?:ERROR\s+\d+\s*\(\s*(\w+)\s*\)|ERROR\s+(\d+))/i)
  if (mysqlCodeMatch) {
    code = `MYSQL_${mysqlCodeMatch[1] || mysqlCodeMatch[2]}`
  } else if (errMsg.includes('1064')) {
    code = 'MYSQL_1064 (Syntax Error)'
  }

  const lineMatch = errMsg.match(/\bat\s+line\s+(\d+)\b/i) || errMsg.match(/\bline\s+(\d+)\b/i) || errMsg.match(/LINE\s+(\d+):/i)
  if (lineMatch) {
    line = parseInt(lineMatch[1], 10)
  }

  const colMatch = errMsg.match(/\b(?:position|column|character)\s+(\d+)\b/i)
  if (colMatch) {
    col = parseInt(colMatch[1], 10)
  }

  const nearMatch = errMsg.match(/near\s+'([^']+)'/i) || errMsg.match(/near\s+"([^"]+)"/i)
  if (nearMatch) {
    near = nearMatch[1]
  }

  if (errMsg.toLowerCase().includes('syntax error') || errMsg.toLowerCase().includes('1064') || code.includes('1064')) {
    if (line !== undefined) {
      hint = `Syntax error around Line ${line}${near ? ` near '${near}'` : ''}. Check if a preceding statement is missing a semicolon ';'.`
    } else if (near) {
      hint = `Syntax error near '${near}'. Check your SQL syntax and ensure preceding queries end with a semicolon ';'.`
    } else {
      hint = `Check your SQL syntax and ensure statements are properly terminated with semicolons ';'.`
    }
  }

  return {
    code,
    message: errMsg,
    line,
    col,
    near,
    hint,
  }
}

export type CellValue = string | number | boolean | null

export type ResultRow = Record<string, CellValue>

export type ResultStatus = 'idle' | 'running' | 'success' | 'error'
export type ResultView = 'table' | 'plan' | 'messages'

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

export interface PinnedResult {
  id: string
  sql: string
  columns: Column[]
  rows: ResultRow[]
  duration: number
  error: DbError | null
  messages: string[]
  lastDatabase: string
  pinnedAt: string
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
  let statementCount = 0
  const trimmed = sql.trim()
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i]
    if (ch === '\'' && !inDouble && !inBacktick) { inSingle = !inSingle; continue }
    if (ch === '"' && !inSingle && !inBacktick) { inDouble = !inDouble; continue }
    if (ch === '`') { inBacktick = !inBacktick; continue }
    if (ch === ';' && !inSingle && !inDouble && !inBacktick) {
      // Only count if there is non-whitespace content after this semicolon
      const rest = trimmed.slice(i + 1).trim()
      if (rest.length > 0) {
        statementCount++
      }
    }
  }
  return statementCount >= 1
}

function stripSqlLiterals(sql: string): string {
  return sql
    .replace(/'(?:[^'\\]|\\.|'')*'/g, "''")
    .replace(/"(?:[^"\\]|\\.|"")*"/g, '""')
    .replace(/`[^`]*`/g, '``')
    .replace(/--[^\n]*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/#[^\n]*$/gm, '')
}

function isDestructiveQuery(sql: string): boolean {
  // Literals/comments are stripped first, so splitting on ';' is safe.
  const cleaned = stripSqlLiterals(sql)
  const statements = cleaned.split(';').map(s => s.trim()).filter(Boolean)
  return statements.some(stmt => isDestructiveStatement(stmt))
}

const CTE_MUTATING_RE = /\b(DELETE|UPDATE|INSERT|REPLACE|MERGE)\b/

function isDestructiveStatement(stmt: string): boolean {
  const words = stmt.split(/\s+/)
  if (!words.length) return false
  const firstWord = (words[0] ?? '').toUpperCase().replace(/[();,]/g, '')
  if (MUTATING_KEYWORDS.has(firstWord)) return true
  // MySQL 8: WITH cte AS (...) DELETE/UPDATE/INSERT ...
  if (firstWord === 'WITH') return CTE_MUTATING_RE.test(stmt.toUpperCase())
  return false
}

function fixBacktickedIdentifiers(sql: string): string {
  return sql.replace(/`([^`]+)`/g, (match, content) => {
    // Only rewrite when every dot-separated part is a plain identifier
    // (`db.users` -> `db`.`users`). Names containing spaces or special
    // characters may be legitimately dotted single identifiers — leave them.
    const parts = content.split('.')
    if (parts.length > 1 && parts.every(p => /^[\w$]+$/.test(p))) {
      return parts.map((p: string) => `\`${p}\``)
        .join('.')
    }
    return match
  })
}

export interface PendingWriteQuery {
  sql: string
  resolve: (confirmed: boolean) => void
}

function loadStoredPins(): PinnedResult[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem('select_pinned_results')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveStoredPins(pins: PinnedResult[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem('select_pinned_results', JSON.stringify(pins.slice(0, 10)))
  } catch {}
}

export const useResultStore = defineStore('result', {
  state: () => ({
    rows: [] as ResultRow[],
    originalRows: [] as ResultRow[],
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
    pinnedResults: loadStoredPins() as PinnedResult[],
    activeResultTabId: 'current' as string,
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
      if (this.status !== 'running') return
      this.cancelling = true
      // Invalidate current execution token immediately so any delayed responses are discarded
      ++this.requestId
      const connId = useConnectionStore().activeId
      try {
        await invoke('cancel_query', { id: connId })
        this.messages.push('Query execution cancelled.')
      } catch (err) {
        this.messages.push(`Cancellation signal: ${String(err)}`)
      } finally {
        this.cancelling = false
        this.status = 'idle'
        this.error = {
          code: 'QUERY_CANCELLED',
          message: 'Query execution was cancelled by user.',
        }
        this.rows = []
        this.originalRows = []
        this.columns = []
        playSound('error')
        this.messages.push('[QUERY_CANCELLED] Execution stopped.')
        this.activeView = 'messages'
      }
    },

    async runQuery(_sql: string) {
      useUiStore().setResultPanelOpen(true)
      this.activeResultTabId = 'current'
      if (this.status === 'running') {
        return
      }
      _sql = fixBacktickedIdentifiers(_sql)
      const connStore = useConnectionStore()
      if (isDestructiveQuery(_sql)) {
        if (connStore.activeConnection?.readOnly) {
          this.error = { code: 'READ_ONLY_CONNECTION', message: 'Connection is in read-only mode. Write queries are blocked.' }
          this.status = 'error'
          this.rows = []
          this.columns = []
          this.originalRows = []
          playSound('error')
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
      playSound('loading')
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
        this.rows = markRaw(result.rows as ResultRow[])
        this.originalRows = markRaw((result.rows as ResultRow[]).map(r => ({ ...r })))
        this.columns = result.columns
        this.planRows = []
        this.planColumns = []
        this.duration = (result as any).durationMs ?? result.duration_ms
        this.hasMore = result.has_more
        this.pageOffset = result.row_count
        this.status = 'success'
        playSound('success')
        const more = result.has_more ? ' More rows available on the server.' : ''
        const msgs = [`Query completed successfully. ${result.row_count} rows returned in ${this.duration}ms.${more}`]

        this.messages = msgs
        this.activeView = 'table'
      } catch (err) {
        if (requestId !== this.requestId) return
        const parsedErr = parseDatabaseError(err, _sql)
        this.error = parsedErr
        this.status = parsedErr.code === 'QUERY_CANCELLED' ? 'idle' : 'error'
        this.rows = []
        this.columns = []
        this.originalRows = []
        playSound('error')
        this.messages = [parsedErr.hint ? `[${parsedErr.code}] ${parsedErr.message}\nHint: ${parsedErr.hint}` : `Error: ${parsedErr.message}`]
        this.activeView = 'messages'
      }
      this.loadHistory()
    },

    async runMultiQuery(_sql: string) {
      if (this.status === 'running') {
        return
      }
      _sql = fixBacktickedIdentifiers(_sql)
      const connStore = useConnectionStore()

      if (connStore.activeConnection?.readOnly && isDestructiveQuery(_sql)) {
        this.error = { code: 'READ_ONLY_CONNECTION', message: 'Connection is in read-only mode. Write queries are blocked.' }
        this.status = 'error'
        this.rows = []
        this.columns = []
        this.originalRows = []
        playSound('error')
        this.messages = ['Error: Connection is in read-only mode. Write queries are blocked.']
        this.activeView = 'messages'
        return
      }

      const requestId = ++this.requestId
      this.status = 'running'
      playSound('loading')
      this.error = null
      this.selectedRows = new Set()
      this.lastSql = _sql
      this.lastDatabase = connStore.activeConnection?.database ?? ''
      this.multiResults = []
      this.activeResultIndex = 0
      try {
        const connId = connStore.activeId
        const results = await invoke<SingleQueryResult[]>('run_multi_query', {
          sql: _sql,
          id: connId,
        })
        if (requestId !== this.requestId) return
        this.multiResults = results
        this.activeResultIndex = 0

        const first = results[0]
        if (first && first.error) {
          const parsedErr = parseDatabaseError(first.error, _sql)
          this.error = parsedErr
          this.status = 'error'
          this.rows = []
          this.columns = []
          this.originalRows = []
          playSound('error')
          this.messages = [parsedErr.hint ? `[${parsedErr.code}] ${parsedErr.message}\nHint: ${parsedErr.hint}` : `Error: ${parsedErr.message}`]
          this.activeView = 'messages'
          if (results.length === 1) {
            this.multiResults = []
          }
        } else if (first && first.columns) {
          const rows = (first.rows || []) as ResultRow[]
          this.rows = markRaw(rows)
          this.originalRows = markRaw(rows.map(r => ({ ...r })))
          this.columns = first.columns
          this.duration = (first as any).durationMs ?? first.duration_ms
          this.status = 'success'
          playSound('success')
          const total = results.reduce((s, r) => s + (r.row_count ?? r.affected_rows ?? 0), 0)
          this.messages = results.length > 1
            ? [`Multi-query returned ${results.length} results, ${total} total rows.`]
            : [`Query completed successfully. ${first.row_count} rows returned in ${this.duration}ms.`]
          this.activeView = 'table'
        } else if (first && first.affected_rows !== null) {
          this.lastAffectedRows = first.affected_rows
          this.status = 'success'
          playSound('success')
          this.messages = [`Query executed successfully. ${first.affected_rows} rows affected in ${first.duration_ms}ms.`]
          this.activeView = 'messages'
        }
      } catch (err) {
        if (requestId !== this.requestId) return
        const parsedErr = parseDatabaseError(err, _sql)
        this.error = parsedErr
        this.status = parsedErr.code === 'QUERY_CANCELLED' ? 'idle' : 'error'
        this.rows = []
        this.columns = []
        this.originalRows = []
        this.multiResults = []
        playSound('error')
        this.messages = [parsedErr.hint ? `[${parsedErr.code}] ${parsedErr.message}\nHint: ${parsedErr.hint}` : `Error: ${parsedErr.message}`]
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
        this.rows = []
        this.columns = []
        this.originalRows = []
        this.activeView = 'messages'
      } else if (result.columns) {
        const rows = (result.rows || []) as ResultRow[]
        this.rows = markRaw(rows)
        this.originalRows = markRaw(rows.map(r => ({ ...r })))
        this.columns = result.columns
        this.duration = (result as any).durationMs ?? result.duration_ms
        this.error = null
        this.status = 'success'
        this.activeView = 'table'
      } else if (result.affected_rows !== null) {
        this.lastAffectedRows = result.affected_rows
        this.status = 'success'
        this.error = null
        this.rows = []
        this.columns = []
        this.originalRows = []
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
        const combined = [...this.rows, ...newRows]
        this.rows = markRaw(combined)
        this.originalRows = markRaw([...this.originalRows, ...newRows.map(r => ({ ...r }))])
        this.hasMore = result.has_more
        this.pageOffset += newRows.length
        this.duration += (result as any).durationMs ?? result.duration_ms
        this.messages = [
          `Query completed successfully. ${this.rows.length} rows returned.${this.hasMore ? ' More rows available on the server.' : ''}`
        ]
      } catch (err) {
        this.messages.push(`Error fetching more: ${String(err)}`)
      }
      this.loadingMore = false
    },

    setPageSize(size: number) {
      this.pageSize = Math.min(Math.max(size, 50), 1000)
    },

    async fetchAllPages() {
      const cap = 10_000
      while (this.hasMore && this.rows.length < cap) {
        const before = this.rows.length
        await this.fetchNextPage()
        if (this.rows.length === before) break
      }
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
      const originalRow = this.originalRows[rowIndex]
      const currentRow = this.rows[rowIndex]
      if (originalRow && currentRow) {
        currentRow[colName] = originalRow[colName]
      }
    },

    revertAllEdits() {
      this.rows = markRaw(this.originalRows.map(r => ({ ...r })))
      this.dirtyCells = {}
    },

    async saveEdits(tableName: string, keyColumns?: string[]): Promise<boolean> {
      this.savingEdits = true
      let success = true
      try {
        const effectiveKeys = (keyColumns && keyColumns.length > 0)
          ? keyColumns
          : this.columns.map(c => c.name)

        for (const [rowKey, cells] of Object.entries(this.dirtyCells)) {
          const rowIndex = parseInt(rowKey)
          const originalRow = this.originalRows[rowIndex] ?? this.rows[rowIndex]
          if (!originalRow) continue

          const pks: { column: string; value: CellValue }[] = []
          for (const keyCol of effectiveKeys) {
            if (originalRow[keyCol] !== undefined) {
              pks.push({ column: keyCol, value: originalRow[keyCol] })
            }
          }

          if (pks.length === 0) {
            this.messages.push(`Warning: Row ${rowIndex + 1} has no matchable column values.`)
            continue
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
        this.originalRows = markRaw(this.rows.map(r => ({ ...r })))
        this.messages.push('Edits saved successfully.')
      } catch (err) {
        this.messages.push(`Error saving edits: ${String(err)}`)
        success = false
      }
      this.savingEdits = false
      return success
    },

    async runWriteQuery(_sql: string) {
      this.activeResultTabId = 'current'
      if (this.status === 'running') {
        return
      }
      _sql = fixBacktickedIdentifiers(_sql)
      const connStore = useConnectionStore()
      if (connStore.activeConnection?.readOnly) {
        this.error = { code: 'READ_ONLY_CONNECTION', message: 'Connection is in read-only mode. Write queries are blocked.' }
        this.status = 'error'
        playSound('error')
        this.messages = ['Error: Connection is in read-only mode. Write queries are blocked.']
        this.activeView = 'messages'
        return
      }
      const requestId = ++this.requestId
      this.status = 'running'
      playSound('loading')
      this.error = null
      this.selectedRows = new Set()
      this.lastSql = _sql
      this.lastDatabase = connStore.activeConnection?.database ?? ''
      this.multiResults = []
      try {
        const connId = connStore.activeId
        const result = await invoke<{ affected_rows: number; duration_ms: number; warning: string | null }>('run_write_query', {
          sql: _sql,
          id: connId,
        })
        if (requestId !== this.requestId) return
        this.lastAffectedRows = result.affected_rows
        this.duration = result.duration_ms
        this.status = 'success'
        playSound('success')
        const msgs = [`Query OK, ${result.affected_rows} rows affected in ${result.duration_ms}ms.`]
        if (result.warning) {
          msgs.push(`Warning: ${result.warning}`)
        }
        this.messages = msgs
        this.activeView = 'messages'
      } catch (err) {
        if (requestId !== this.requestId) return
        const parsedErr = parseDatabaseError(err, _sql)
        this.error = parsedErr
        this.status = 'error'
        playSound('error')
        this.messages = [parsedErr.hint ? `[${parsedErr.code}] ${parsedErr.message}\nHint: ${parsedErr.hint}` : `Error: ${parsedErr.message}`]
        this.activeView = 'messages'
      }
      this.loadHistory()
    },

    async explainQuery(sql: string) {
      useUiStore().setResultPanelOpen(true)
      this.activeResultTabId = 'current'
      if (this.status === 'running') {
        return
      }
      sql = fixBacktickedIdentifiers(sql)
      const requestId = ++this.requestId
      this.status = 'running'
      playSound('loading')
      this.error = null
      this.selectedRows = new Set()
      const cleanSql = sql.trim().replace(/;+$/, '')
      const explainSql = cleanSql.toUpperCase().startsWith('EXPLAIN') ? cleanSql : `EXPLAIN ${cleanSql}`

      try {
        const connId = useConnectionStore().activeId
        const result = await invoke<{ columns: Column[]; rows: ResultRow[]; duration_ms: number; row_count: number }>('run_query', { sql: explainSql, id: connId })
        if (requestId !== this.requestId) return
        this.planRows = result.rows
        this.planColumns = result.columns
        this.duration = (result as any).durationMs ?? result.duration_ms
        this.status = 'success'
        playSound('success')
        this.messages = [`Execution plan returned ${result.row_count} rows in ${this.duration}ms.`]
        this.activeView = 'plan'
      } catch (err) {
        if (requestId !== this.requestId) return
        const parsedErr = parseDatabaseError(err, sql)
        this.error = parsedErr
        this.status = 'error'
        playSound('error')
        this.messages = [parsedErr.hint ? `[${parsedErr.code}] ${parsedErr.message}\nHint: ${parsedErr.hint}` : `Explain error: ${parsedErr.message}`]
        this.activeView = 'messages'
      }
    },

    setActiveView(view: ResultView) {
      this.activeView = view
    },
    toggleRowSelection(rowId: string) {
      if (this.selectedRows.has(rowId)) {
        this.selectedRows.delete(rowId)
      } else {
        this.selectedRows.add(rowId)
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
      this.originalRows = []
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

    pinCurrentResult() {
      if (this.status !== 'success' || !this.columns.length) return
      const id = `pin-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
      const pinned: PinnedResult = {
        id,
        sql: this.lastSql,
        columns: cloneSnapshot(this.columns),
        rows: cloneSnapshot(this.rows),
        duration: this.duration,
        error: this.error ? cloneSnapshot(this.error) : null,
        messages: [...this.messages],
        lastDatabase: this.lastDatabase,
        pinnedAt: new Date().toISOString(),
      }
      this.pinnedResults.push(pinned)
      saveStoredPins(this.pinnedResults)
      this.activeResultTabId = id
    },

    unpinResult(id: string) {
      const idx = this.pinnedResults.findIndex(p => p.id === id)
      if (idx >= 0) {
        this.pinnedResults.splice(idx, 1)
        saveStoredPins(this.pinnedResults)
        if (this.activeResultTabId === id) {
          this.activeResultTabId = 'current'
        }
      }
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
      let cols = this.columns
      let rows = this.rows
      if (this.activeResultTabId !== 'current') {
        const pin = this.pinnedResults.find(p => p.id === this.activeResultTabId)
        if (pin) {
          cols = pin.columns
          rows = pin.rows
        }
      } else if (this.multiResults.length > 0) {
        cols = this.multiResults[this.activeResultIndex]?.columns ?? this.columns
        rows = this.multiResults[this.activeResultIndex]?.rows ?? this.rows
      }

      if (!cols.length) return
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
