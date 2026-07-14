import { defineStore } from 'pinia'
import { invoke } from '@tauri-apps/api/core'
import { useConnectionStore } from './connection'

export interface SchemaTable {
  name: string
  rowCount: number
  type: 'table'
}
export interface SchemaView {
  name: string
  type: 'view'
}
export interface SchemaFunction {
  name: string
  type: 'function'
}
export interface SchemaIndex {
  name: string
  type: 'index'
}
export interface SchemaTrigger {
  name: string
  type: 'trigger'
}
export interface SchemaProc {
  name: string
  type: 'proc'
}
export interface TableColumnDetail {
  name: string
  columnType: string
  nullable: boolean
  default: string | null
  pk: boolean
  extra: string
}
export interface TableIndexDetail {
  name: string
  columns: string
  unique: boolean
}
export interface TableConstraintDetail {
  name: string
  type: string
  definition: string
}
export interface TableDetails {
  columns: TableColumnDetail[]
  indexes: TableIndexDetail[]
  constraints: TableConstraintDetail[]
  ddl: string
}

const EMPTY_TABLE_DETAILS: TableDetails = {
  columns: [],
  indexes: [],
  constraints: [],
  ddl: '',
}

function objectName(item: string | { name: string }) {
  return typeof item === 'string' ? item : item.name
}

function objectType<T extends string>(item: string | { type?: string }, fallback: T) {
  return (typeof item === 'string' ? fallback : item.type ?? fallback) as T
}

export const useSchemaStore = defineStore('schema', {
  state: () => ({
    tables: [] as SchemaTable[],
    views: [] as SchemaView[],
    functions: [] as SchemaFunction[],
    indexes: [] as SchemaIndex[],
    triggers: [] as SchemaTrigger[],
    procs: [] as SchemaProc[],
    databases: [] as string[],
    isLoading: false,
    isDetailsLoading: false,
    searchQuery: '',
    activeTable: null as string | null,
    tableDetails: null as TableDetails | null,
    detailsByTable: {} as Record<string, TableDetails>,
    detailsError: null as string | null,
  }),

  getters: {
    filteredTables: (state) => {
      if (!state.searchQuery) return state.tables
      const q = state.searchQuery.toLowerCase()
      return state.tables.filter(t => t.name.toLowerCase().includes(q))
    },
    filteredViews: (state) => {
      if (!state.searchQuery) return state.views
      const q = state.searchQuery.toLowerCase()
      return state.views.filter(v => v.name.toLowerCase().includes(q))
    },
    filteredFunctions: (state) => {
      if (!state.searchQuery) return state.functions
      const q = state.searchQuery.toLowerCase()
      return state.functions.filter(f => f.name.toLowerCase().includes(q))
    },
    filteredIndexes: (state) => {
      if (!state.searchQuery) return state.indexes
      const q = state.searchQuery.toLowerCase()
      return state.indexes.filter(i => i.name.toLowerCase().includes(q))
    },
    filteredTriggers: (state) => {
      if (!state.searchQuery) return state.triggers
      const q = state.searchQuery.toLowerCase()
      return state.triggers.filter(t => t.name.toLowerCase().includes(q))
    },
    filteredProcs: (state) => {
      if (!state.searchQuery) return state.procs
      const q = state.searchQuery.toLowerCase()
      return state.procs.filter(p => p.name.toLowerCase().includes(q))
    },
  },

  actions: {
    setSearchQuery(q: string) {
      this.searchQuery = q
    },
    setActiveTable(name: string | null) {
      this.activeTable = name
      this.tableDetails = name ? this.detailsByTable[name] ?? null : null
    },
    clearSchema() {
      this.tables = []
      this.views = []
      this.functions = []
      this.indexes = []
      this.triggers = []
      this.procs = []
      this.databases = []
      this.activeTable = null
      this.tableDetails = null
      this.detailsByTable = {}
      this.detailsError = null
    },
    async fetchDatabases(connectionId?: string) {
      try {
        const dbs = await invoke<string[]>('fetch_databases', { id: connectionId ?? null })
        this.databases = dbs
      } catch (e) {
        console.error("Failed to fetch databases", e)
      }
    },
	    async refreshSchema(connectionId?: string) {
	      this.isLoading = true
	      this.tables = []
	      this.views = []
	      this.functions = []
	      this.indexes = []
	      this.triggers = []
	      this.procs = []
	      this.activeTable = null
	      this.tableDetails = null
	      this.detailsByTable = {}
	      this.detailsError = null
	      try {
	        const data = await invoke<any>('fetch_schema', { id: connectionId ?? 'default' })
        if (data.tables) {
          this.tables = data.tables.map((t: string | { name: string; rowCount?: number }) => ({
            name: objectName(t),
            rowCount: typeof t === 'string' ? 0 : t.rowCount ?? 0,
            type: 'table',
          }))
        }
        if (data.views) {
          this.views = data.views.map((v: string | { name: string; type?: string }) => ({
            name: objectName(v),
            type: objectType(v, 'view'),
          }))
        }
        if (data.functions) {
          this.functions = data.functions.map((f: string | { name: string; type?: string }) => ({
            name: objectName(f),
            type: objectType(f, 'function'),
          }))
        }
        if (data.indexes) {
          this.indexes = data.indexes.map((i: string | { name: string; type?: string }) => ({
            name: objectName(i),
            type: objectType(i, 'index'),
          }))
        }
        if (data.triggers) {
          this.triggers = data.triggers.map((t: string | { name: string; type?: string }) => ({
            name: objectName(t),
            type: objectType(t, 'trigger'),
          }))
        }
        if (data.procs) {
          this.procs = data.procs.map((p: string | { name: string; type?: string }) => ({
            name: objectName(p),
            type: objectType(p, 'proc'),
          }))
        }
      } catch (e) {
        console.error("Failed to fetch schema", e)
      } finally {
        this.isLoading = false
      }
    },
    async fetchAllTableDetails() {
      this.tables.forEach(t => {
        if (!this.detailsByTable[t.name]) {
          this.fetchTableDetails(t.name)
        }
      })
    },

    async fetchTableDetails(tableName: string, force = false) {
      if (!force && this.detailsByTable[tableName]) {
        this.tableDetails = this.detailsByTable[tableName]
        return this.tableDetails
      }

      this.isDetailsLoading = true
      this.detailsError = null
      try {
        const connId = useConnectionStore().activeId
        const details = await invoke<TableDetails>('fetch_table_details', { table: tableName, id: connId })
        this.detailsByTable[tableName] = details
        if (this.activeTable === tableName) this.tableDetails = details
        return details
	      } catch (e) {
	        const message = e instanceof Error ? e.message : String(e)
	        if (this.activeTable === tableName) {
	          this.detailsError = message
	          this.tableDetails = EMPTY_TABLE_DETAILS
	        }
	        console.error("Failed to fetch table details", e)
	        return this.tableDetails
	      } finally {
        this.isDetailsLoading = false
      }
    },
  },
})
