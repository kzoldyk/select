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
export type ResultView = 'table' | 'json' | 'plan' | 'messages'

const SAMPLE_COLUMNS: Column[] = []
const SAMPLE_ROWS: ResultRow[] = []

export const useResultStore = defineStore('result', {
  state: () => ({
    rows: [] as ResultRow[],
    columns: [] as Column[],
    status: 'idle' as ResultStatus,
    duration: 0,
    activeView: 'table' as ResultView,
    error: null as DbError | null,
    selectedRows: new Set<string>(),
    messages: [] as string[],
  }),

  getters: {
    rowCount: (state) => state.rows.length,
    hasSelection: (state) => state.selectedRows.size > 0,
    selectionCount: (state) => state.selectedRows.size,
  },

  actions: {
    async runQuery(_sql: string) {
      this.status = 'running'
      this.error = null
      this.selectedRows = new Set()
      try {
        const result = await invoke<{ columns: Column[], rows: ResultRow[], duration_ms: number, row_count: number }>('run_query', { sql: _sql })
        this.rows = result.rows
        this.columns = result.columns
        this.duration = result.duration_ms
        this.status = 'success'
        this.messages = [`Query completed successfully. ${result.row_count} rows returned in ${this.duration}ms.`]
        this.activeView = 'table'
      } catch (err) {
        this.error = {
          code: 'QUERY_ERROR',
          message: String(err),
        }
        this.status = 'error'
        this.messages = [`Error: ${String(err)}`]
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
    deleteSelected() {
      const indices = Array.from(this.selectedRows).map(Number)
      this.rows = this.rows.filter((_, i) => !indices.includes(i))
      this.selectedRows = new Set()
    },
    exportCsv() {
      const header = this.columns.map(c => c.name).join(',')
      const rows = this.rows.map(row =>
        this.columns.map(c => {
          const val = row[c.name]
          if (val === null || val === undefined) return ''
          if (typeof val === 'string' && val.includes(',')) return `"${val}"`
          return String(val)
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
