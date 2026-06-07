import { defineStore } from 'pinia'
import { invoke } from '@tauri-apps/api/core'

export interface Column {
  name: string
  type: string
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

export interface QueryHistoryItem {
  id: string
  sql: string
  executed_at: string
  duration_ms: number
  row_count: number
  error: string | null
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
	  }),

  getters: {
    rowCount: (state) => state.rows.length,
    hasSelection: (state) => state.selectedRows.size > 0,
    selectionCount: (state) => state.selectedRows.size,
  },

  actions: {
	    async runQuery(_sql: string) {
	      const requestId = ++this.requestId
	      this.status = 'running'
	      this.error = null
	      this.selectedRows = new Set()
	      try {
	        const result = await invoke<{ columns: Column[], rows: ResultRow[], duration_ms: number, row_count: number }>('run_query', { sql: _sql })
	        if (requestId !== this.requestId) return
	        this.rows = result.rows
        this.columns = result.columns
        this.planRows = []
        this.planColumns = []
        this.duration = result.duration_ms
        this.status = 'success'
        this.messages = [`Query completed successfully. ${result.row_count} rows returned in ${this.duration}ms.`]
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
	    async explainQuery(sql: string) {
	      const requestId = ++this.requestId
	      this.status = 'running'
      this.error = null
      this.selectedRows = new Set()
      const cleanSql = sql.trim().replace(/;+$/, '')
      const explainSql = cleanSql.toUpperCase().startsWith('EXPLAIN') ? cleanSql : `EXPLAIN ${cleanSql}`

	      try {
	        const result = await invoke<{ columns: Column[], rows: ResultRow[], duration_ms: number, row_count: number }>('run_query', { sql: explainSql })
	        if (requestId !== this.requestId) return
	        this.planRows = result.rows
        this.planColumns = result.columns
        this.duration = result.duration_ms
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
	      this.messages = []
	      this.activeView = 'table'
	      this.requestId++
	    },
	    exportCsv() {
	      if (!this.columns.length) return
	      const csvEscape = (value: string) => {
        if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
        return value
      }
      const header = this.columns.map(c => csvEscape(c.name)).join(',')
      const rows = this.rows.map(row =>
        this.columns.map(c => {
          const val = row[c.name]
          if (val === null || val === undefined) return ''
          return csvEscape(String(val))
        }).join(',')
      )
      const csv = [header, ...rows].join('\n')
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
