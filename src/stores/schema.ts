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
export interface ForeignKey {
  tableSchema?: string
  tableName?: string
  columnName?: string
  column_name?: string
  referencedTableSchema?: string
  referencedTable?: string
  referenced_table?: string
  referencedColumn?: string
  referenced_column?: string
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

function loadVirtualKeys(): Record<string, string[]> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem('select_virtual_keys')
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveVirtualKeys(keys: Record<string, string[]>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem('select_virtual_keys', JSON.stringify(keys))
  } catch {}
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
    schemaTablesCache: {} as Record<string, string[]>,
    foreignKeysByTable: {} as Record<string, ForeignKey[]>,
    virtualKeys: loadVirtualKeys() as Record<string, string[]>,
    isLoading: false,
    isDetailsLoading: false,
    searchQuery: '',
    activeTable: null as string | null,
    tableDetails: null as TableDetails | null,
    detailsByTable: {} as Record<string, TableDetails>,
    detailsError: null as string | null,
    schemaError: null as string | null,
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
    clearSchema(keepDatabases = false) {
      this.tables = []
      this.views = []
      this.functions = []
      this.indexes = []
      this.triggers = []
      this.procs = []
      if (!keepDatabases) {
        this.databases = []
      }
      this.activeTable = null
      this.tableDetails = null
      this.detailsByTable = {}
      this.foreignKeysByTable = {}
      this.schemaTablesCache = {}
      this.detailsError = null
      this.schemaError = null
    },
    async fetchDatabases(connectionId?: string) {
      try {
        const dbs = await invoke<string[]>('fetch_databases', { id: connectionId ?? null })
        this.databases = dbs
      } catch (e) {
        console.error("Failed to fetch databases", e)
      }
    },
    async fetchTablesForSchema(schema: string): Promise<string[]> {
      const connStore = useConnectionStore()
      const connectionId = connStore.activeId
      
      const cacheKey = `${connectionId}-${schema}`
      if (this.schemaTablesCache[cacheKey]) {
        return this.schemaTablesCache[cacheKey]
      }
      
      try {
        const tables = await invoke<string[]>('fetch_schema_tables', { schema, id: connectionId ?? null })
        this.schemaTablesCache[cacheKey] = tables
        return tables
      } catch (e) {
        console.error(`Failed to fetch tables for schema ${schema}`, e)
        return []
      }
    },
    async refreshSchema(connectionId?: string) {
      this.isLoading = true
      this.schemaError = null
      try {
        const connStore = useConnectionStore()
        if (!this.databases.length) {
          await this.fetchDatabases(connectionId)
        }
        const dbName = connStore.activeConnection?.database ?? null
        const data = await invoke<any>('fetch_schema', { id: connectionId ?? 'default', database: dbName })
        
        const newTables: SchemaTable[] = data.tables
          ? data.tables.map((t: string | { name: string; rowCount?: number }) => ({
              name: objectName(t),
              rowCount: typeof t === 'string' ? 0 : t.rowCount ?? 0,
              type: 'table' as const,
            }))
          : []
        this.tables = newTables

        // Preserve cached details for tables that still exist
        const newTableNames = new Set(newTables.map(t => t.name.toLowerCase()))
        const preservedDetails: Record<string, TableDetails> = {}
        for (const [k, v] of Object.entries(this.detailsByTable)) {
          if (newTableNames.has(k.toLowerCase())) {
            preservedDetails[k] = v
          }
        }
        this.detailsByTable = preservedDetails

        this.views = data.views
          ? data.views.map((v: string | { name: string; type?: string }) => ({
              name: objectName(v),
              type: objectType(v, 'view'),
            }))
          : []

        this.functions = data.functions
          ? data.functions.map((f: string | { name: string; type?: string }) => ({
              name: objectName(f),
              type: objectType(f, 'function'),
            }))
          : []

        this.indexes = data.indexes
          ? data.indexes.map((i: string | { name: string; type?: string }) => ({
              name: objectName(i),
              type: objectType(i, 'index'),
            }))
          : []

        this.triggers = data.triggers
          ? data.triggers.map((t: string | { name: string; type?: string }) => ({
              name: objectName(t),
              type: objectType(t, 'trigger'),
            }))
          : []

        this.procs = data.procs
          ? data.procs.map((p: string | { name: string; type?: string }) => ({
              name: objectName(p),
              type: objectType(p, 'proc'),
            }))
          : []
      } catch (e) {
        const err = e instanceof Error ? e.message : String(e)
        this.schemaError = err
        console.error("Failed to fetch schema", e)
      } finally {
        this.isLoading = false
        if (this.tables.length > 0 && !this.schemaError) {
          void this.fetchAllTableDetails()
        }
      }
    },
    async fetchAllTableDetails() {
      const batchSize = 12
      for (let i = 0; i < this.tables.length; i += batchSize) {
        const batch = this.tables.slice(i, i + batchSize)
        await Promise.all(
          batch
            .filter(t => !this.detailsByTable[t.name])
            .map(t => Promise.all([
              this.fetchTableDetails(t.name).catch(() => null),
              this.fetchForeignKeys(t.name).catch(() => []),
            ]))
        )
      }
    },
    async fetchForeignKeys(tableName: string, force = false): Promise<ForeignKey[]> {
      if (!force && this.foreignKeysByTable[tableName]) {
        return this.foreignKeysByTable[tableName]
      }
      try {
        const connStore = useConnectionStore()
        const fks = await invoke<ForeignKey[]>('fetch_table_foreign_keys', {
          table: tableName,
          id: connStore.activeId,
          database: connStore.activeConnection?.database || null,
        })
        this.foreignKeysByTable[tableName] = fks || []
        return this.foreignKeysByTable[tableName]
      } catch (e) {
        console.error(`Failed to fetch foreign keys for ${tableName}`, e)
        return []
      }
    },
    async fetchTableDetails(tableName: string, force = false) {
      const rawName = tableName.toLowerCase()
      const bareName = tableName.includes('.') ? tableName.split('.').pop()!.replace(/[`"\[\]']/g, '').toLowerCase() : rawName

      if (!force) {
        if (this.detailsByTable[rawName]) {
          this.tableDetails = this.detailsByTable[rawName]
          return this.tableDetails
        }
        if (this.detailsByTable[bareName]) {
          this.tableDetails = this.detailsByTable[bareName]
          return this.tableDetails
        }
      }

      this.isDetailsLoading = true
      this.detailsError = null
      try {
        const connStore = useConnectionStore()
        const connId = connStore.activeId
        let dbName = connStore.activeConnection?.database ?? null
        let pureTable = tableName.replace(/[`"\[\]']/g, '')
        if (pureTable.includes('.')) {
          const parts = pureTable.split('.')
          dbName = parts[0]
          pureTable = parts[parts.length - 1]
        }
        const details = await invoke<TableDetails>('fetch_table_details', { table: pureTable, id: connId, database: dbName })
        this.detailsByTable[rawName] = details
        this.detailsByTable[bareName] = details
        if (dbName) {
          this.detailsByTable[`${dbName}.${pureTable}`.toLowerCase()] = details
        }
        if (this.activeTable === tableName || this.activeTable === pureTable || this.activeTable === bareName) {
          this.tableDetails = details
        }
        return details
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        if (this.activeTable === tableName || this.activeTable === bareName) {
          this.detailsError = message
          this.tableDetails = EMPTY_TABLE_DETAILS
        }
        console.error("Failed to fetch table details", e)
        return this.tableDetails
      } finally {
        this.isDetailsLoading = false
      }
    },
    setVirtualKey(tableName: string, columns: string[]) {
      const rawName = tableName.toLowerCase()
      this.virtualKeys[rawName] = columns
      saveVirtualKeys(this.virtualKeys)
    },
    removeVirtualKey(tableName: string) {
      const rawName = tableName.toLowerCase()
      delete this.virtualKeys[rawName]
      saveVirtualKeys(this.virtualKeys)
    },
    getKeyColumnsForTable(tableName: string): { columns: string[]; keyType: 'primary' | 'unique' | 'virtual' | 'all_columns' } {
      if (!tableName) return { columns: [], keyType: 'all_columns' }
      const rawName = tableName.toLowerCase()
      const bareName = tableName.includes('.') ? tableName.split('.').pop()!.replace(/[`"\[\]']/g, '').toLowerCase() : rawName

      const tableKey = Object.keys(this.detailsByTable).find(k => {
        const lk = k.toLowerCase()
        return lk === rawName || lk === bareName || lk.endsWith(`.${bareName}`)
      })
      const details = tableKey ? this.detailsByTable[tableKey] : null
      if (details) {
        const pks = details.columns.filter(c => c.pk).map(c => c.name)
        if (pks.length > 0) {
          return { columns: pks, keyType: 'primary' }
        }
        if (details.indexes) {
          const uniqueIdx = details.indexes.find(idx => idx.unique)
          if (uniqueIdx) {
            const uCols = uniqueIdx.columns.split(',').map(s => s.trim().replace(/[`"']/g, ''))
            return { columns: uCols, keyType: 'unique' }
          }
        }
      }
      if (this.virtualKeys[rawName] && this.virtualKeys[rawName].length > 0) {
        return { columns: this.virtualKeys[rawName], keyType: 'virtual' }
      }
      if (this.virtualKeys[bareName] && this.virtualKeys[bareName].length > 0) {
        return { columns: this.virtualKeys[bareName], keyType: 'virtual' }
      }
      return { columns: [], keyType: 'all_columns' }
    },
  },
})
