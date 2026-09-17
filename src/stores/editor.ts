import { defineStore } from 'pinia'
import { invoke } from '@tauri-apps/api/core'
import {
  NOTEBOOK_STARTER,
  convertSqlToNotebook,
  convertNotebookContentToSql,
  isNotebookDocument,
  detectDocumentFormat,
} from '../lib/sqlExtract'

export interface Tab {
  id: string
  name: string
  sql: string
  connectionId: string | null
  isUnsaved: boolean
  /** Filename of the saved `.sql` file, e.g. `My Query.sql` */
  savedQueryId: string | null
  cursorLine: number
  cursorCol: number
  selectionAnchor?: number
  selectionHead?: number
  selectedTextCount?: number
  type?: 'query' | 'table' | 'schema_diagram'
  tableName?: string
  /** Editor rendering: SQL (default) or notebook. Never auto-inferred from content. */
  format?: 'sql' | 'notebook'
}

export interface SavedQuery {
  /** Filename used as stable id, e.g. `My Query.sql` */
  id: string
  name: string
  sql: string
  createdAt: string
  updatedAt: string
}

const MAX_TABS = 20
const DEFAULT_SQL = ``
const TAB_STATE_DEBOUNCE_MS = 400

let tabCounter = 1
let tabStateTimer: ReturnType<typeof setTimeout> | null = null

export const useEditorStore = defineStore('editor', {
  state: () => ({
    tabs: [
      {
        id: 'tab-1',
        name: 'Query 1',
        sql: DEFAULT_SQL,
        connectionId: 'conn-1',
        isUnsaved: false,
        savedQueryId: null,
        cursorLine: 1,
        cursorCol: 1,
        selectionAnchor: 0,
        selectionHead: 0,
        selectedTextCount: 0,
        type: 'query',
        format: 'sql',
      },
    ] as Tab[],
    activeTabId: 'tab-1',
    splitRatio: 0.5,
    fontSize: 13,
    savedQueries: [] as SavedQuery[],
    saveDialogOpen: false,
    saveDialogTabId: null as string | null,
    /** Absolute path to the on-disk queries folder */
    queriesDir: null as string | null,
    queriesDirNeedsSetup: false,
  }),

  getters: {
    activeTab: (state): Tab | null =>
      state.tabs.find(t => t.id === state.activeTabId) ?? null,
  },

  actions: {
    saveTabState() {
      const activeIndex = Math.max(0, this.tabs.findIndex(t => t.id === this.activeTabId))
      const data = this.tabs.map(t => ({
        id: t.id,
        name: t.name,
        sql: t.sql,
        savedQueryId: t.savedQueryId,
        isUnsaved: t.isUnsaved,
        cursorLine: t.cursorLine,
        cursorCol: t.cursorCol,
        selectionAnchor: t.selectionAnchor,
        selectionHead: t.selectionHead,
        type: t.type || 'query',
        tableName: t.tableName,
        format: t.format || 'sql',
      }))
      localStorage.setItem('tabState', JSON.stringify(data))
      localStorage.setItem('activeTabIndex', String(activeIndex))
      localStorage.setItem('activeTabId', this.activeTabId)
      localStorage.setItem('editorFontSize', String(this.fontSize))
    },
    /** Debounced persist so typing doesn't thrash localStorage */
    scheduleSaveTabState() {
      if (tabStateTimer) clearTimeout(tabStateTimer)
      tabStateTimer = setTimeout(() => {
        tabStateTimer = null
        this.saveTabState()
      }, TAB_STATE_DEBOUNCE_MS)
    },
    /** Flush any pending debounced tab state immediately (app close / Cmd+S). */
    flushTabState() {
      if (tabStateTimer) {
        clearTimeout(tabStateTimer)
        tabStateTimer = null
      }
      this.saveTabState()
    },
    restoreTabState() {
      this.loadFontSize()
      const raw = localStorage.getItem('tabState')
      if (!raw) return
      try {
        const data = JSON.parse(raw) as {
          id?: string
          name: string
          sql: string
          savedQueryId: string | null
          isUnsaved?: boolean
          cursorLine: number
          cursorCol: number
          selectionAnchor?: number
          selectionHead?: number
        }[]
        if (!data.length) return
        this.tabs = data.map((d, i) => ({
          id: d.id || `tab-${Date.now()}-${i}`,
          name: d.name,
          sql: d.sql,
          connectionId: null,
          isUnsaved: Boolean(d.isUnsaved),
          savedQueryId: d.savedQueryId,
          cursorLine: d.cursorLine || 1,
          cursorCol: d.cursorCol || 1,
          selectionAnchor: d.selectionAnchor,
          selectionHead: d.selectionHead,
          selectedTextCount: (d.selectionAnchor !== undefined && d.selectionHead !== undefined)
            ? Math.abs(d.selectionHead - d.selectionAnchor)
            : 0,
          type: (d as any).type || 'query',
          tableName: (d as any).tableName,
          format: (d as any).format === 'notebook' ? 'notebook' : 'sql',
        }))
        const activeId = localStorage.getItem('activeTabId')
        const activeIndexRaw = localStorage.getItem('activeTabIndex')
        const activeIndex = activeIndexRaw != null ? parseInt(activeIndexRaw, 10) : NaN
        if (activeId && this.tabs.some(t => t.id === activeId)) {
          this.activeTabId = activeId
        } else if (Number.isFinite(activeIndex) && this.tabs[activeIndex]) {
          this.activeTabId = this.tabs[activeIndex].id
        } else {
          this.activeTabId = this.tabs[0]?.id ?? this.activeTabId
        }
      } catch {}
    },
    zoomIn() {
      if (this.fontSize < 32) {
        this.fontSize += 1
        localStorage.setItem('editorFontSize', String(this.fontSize))
      }
    },
    zoomOut() {
      if (this.fontSize > 9) {
        this.fontSize -= 1
        localStorage.setItem('editorFontSize', String(this.fontSize))
      }
    },
    resetZoom() {
      this.fontSize = 13
      localStorage.setItem('editorFontSize', String(this.fontSize))
    },
    setFontSize(size: number) {
      this.fontSize = Math.max(9, Math.min(32, size))
      localStorage.setItem('editorFontSize', String(this.fontSize))
    },
    loadFontSize() {
      const saved = localStorage.getItem('editorFontSize')
      if (saved) {
        const parsed = parseInt(saved, 10)
        if (!isNaN(parsed) && parsed >= 9 && parsed <= 32) {
          this.fontSize = parsed
        }
      }
    },
    addTab(initialContent?: string, format?: 'sql' | 'notebook') {
      if (this.tabs.length >= MAX_TABS) return ''
      tabCounter++
      const initialSql = initialContent ?? ''
      const tab: Tab = {
        id: `tab-${Date.now()}-${tabCounter}`,
        name: `Query ${tabCounter}`,
        sql: initialSql,
        connectionId: null,
        isUnsaved: false,
        savedQueryId: null,
        cursorLine: 1,
        cursorCol: 1,
        selectionAnchor: 0,
        selectionHead: 0,
        selectedTextCount: 0,
        type: 'query',
        format: format ?? 'sql',
      }
      this.tabs.push(tab)
      this.activeTabId = tab.id
      this.saveTabState()
      return tab.id
    },
    addNotebookTab(initialContent?: string) {
      if (this.tabs.length >= MAX_TABS) return ''
      tabCounter++
      const tab: Tab = {
        id: `tab-${Date.now()}-${tabCounter}`,
        name: `Notes ${tabCounter}`,
        sql: initialContent ?? NOTEBOOK_STARTER,
        connectionId: null,
        isUnsaved: false,
        savedQueryId: null,
        cursorLine: 1,
        cursorCol: 1,
        selectionAnchor: 0,
        selectionHead: 0,
        selectedTextCount: 0,
        type: 'query',
        format: 'notebook',
      }
      this.tabs.push(tab)
      this.activeTabId = tab.id
      this.saveTabState()
      return tab.id
    },
    convertTabToNotebook(id: string) {
      const tab = this.tabs.find(t => t.id === id)
      if (!tab || tab.format === 'notebook') return
      tab.format = 'notebook'
      tab.sql = convertSqlToNotebook(tab.sql, tab.name)
      tab.isUnsaved = true
      this.saveTabState()
    },
    convertTabToSql(id: string) {
      const tab = this.tabs.find(t => t.id === id)
      if (!tab || tab.format === 'sql') return
      tab.format = 'sql'
      tab.sql = convertNotebookContentToSql(tab.sql)
      tab.isUnsaved = true
      this.saveTabState()
    },
    setTabFormat(id: string, format: 'sql' | 'notebook') {
      const tab = this.tabs.find(t => t.id === id)
      if (tab) {
        tab.format = format
        this.scheduleSaveTabState()
      }
    },
    addTableTab(tableName: string) {
      let tab = this.tabs.find(t => t.type === 'table' && t.tableName === tableName)
      if (!tab) {
        if (this.tabs.length >= MAX_TABS) return ''
        const escapedTable = tableName.includes('.')
          ? tableName.split('.').map(p => `\`${p.replace(/`/g, '``')}\``).join('.')
          : `\`${tableName.replace(/`/g, '``')}\``
        tabCounter++
        tab = {
          id: `tab-table-${Date.now()}-${tabCounter}`,
          name: tableName,
          sql: `SELECT * FROM ${escapedTable}`,
          connectionId: null,
          isUnsaved: false,
          savedQueryId: null,
          cursorLine: 1,
          cursorCol: 1,
          selectionAnchor: 0,
          selectionHead: 0,
          selectedTextCount: 0,
          type: 'table',
          tableName: tableName,
        }
        this.tabs.push(tab)
      }
      this.activeTabId = tab.id
      this.saveTabState()
      return tab.id
    },
    addSchemaDiagramTab(focusTable?: string) {
      const tabName = focusTable ? `Diagram: ${focusTable}` : 'Schema Diagram'
      let tab = this.tabs.find(t => t.type === 'schema_diagram' && t.tableName === focusTable)
      if (!tab) {
        if (this.tabs.length >= MAX_TABS) return ''
        tabCounter++
        tab = {
          id: `tab-schema-${Date.now()}-${tabCounter}`,
          name: tabName,
          sql: '',
          connectionId: null,
          isUnsaved: false,
          savedQueryId: null,
          cursorLine: 1,
          cursorCol: 1,
          selectionAnchor: 0,
          selectionHead: 0,
          selectedTextCount: 0,
          type: 'schema_diagram',
          tableName: focusTable,
        }
        this.tabs.push(tab)
      }
      this.activeTabId = tab.id
      this.saveTabState()
      return tab.id
    },
    closeTab(id: string) {
      const tab = this.tabs.find(t => t.id === id)
      if (!tab) return
      if (tab.isUnsaved && tab.sql.trim()) {
        const confirmed = window.confirm(`"${tab.name}" has unsaved changes. Close anyway?`)
        if (!confirmed) return
      }
      const idx = this.tabs.indexOf(tab)
      this.tabs.splice(idx, 1)
      if (this.activeTabId === id) {
        this.activeTabId = this.tabs[Math.max(0, idx - 1)]?.id ?? ''
        if (this.tabs.length === 0) this.addTab()
      }
      this.saveTabState()
    },
    selectTab(id: string) {
      if (this.tabs.find(t => t.id === id)) {
        this.activeTabId = id
        this.scheduleSaveTabState()
      }
    },
    updateSql(id: string, sql: string) {
      const tab = this.tabs.find(t => t.id === id)
      if (tab) {
        tab.sql = sql
        tab.isUnsaved = true
        this.scheduleSaveTabState()
      }
    },
    async saveTab(id: string) {
      const tab = this.tabs.find(t => t.id === id)
      if (!tab) return
      if (tab.savedQueryId) {
        try {
          const saveName = tab.format === 'notebook' && !tab.name.toLowerCase().endsWith('.md')
            ? `${tab.name}.md`
            : tab.name
          const saved = await invoke<SavedQuery>('save_query', {
            name: saveName,
            sql: tab.sql,
            id: tab.savedQueryId,
          })
          tab.name = saved.name
          tab.savedQueryId = saved.id
          tab.isUnsaved = false
          this.flushTabState()
          await this._refreshSavedQueries()
        } catch (e) {
          console.error('Failed to save query:', e)
        }
      } else {
        this.saveDialogTabId = id
        this.saveDialogOpen = true
      }
    },
    async saveQueryAs(tabId: string, name: string) {
      const tab = this.tabs.find(t => t.id === tabId)
      if (!tab) return
      try {
        const saveName = tab.format === 'notebook' && !name.toLowerCase().endsWith('.md')
          ? `${name}.md`
          : name
        const saved = await invoke<SavedQuery>('save_query', {
          name: saveName,
          sql: tab.sql,
          id: null,
        })
        tab.name = saved.name
        tab.savedQueryId = saved.id
        tab.isUnsaved = false
        this.saveDialogOpen = false
        this.saveDialogTabId = null
        this.flushTabState()
        await this._refreshSavedQueries()
      } catch (e) {
        console.error('Failed to save query:', e)
      }
    },
    async dropSavedQuery(id: string) {
      try {
        await invoke('delete_query', { id })
        this.tabs.forEach(t => {
          if (t.savedQueryId === id) {
            t.savedQueryId = null
            t.isUnsaved = true
          }
        })
        this.flushTabState()
        await this._refreshSavedQueries()
      } catch (e) {
        console.error('Failed to delete query:', e)
      }
    },
    async renameSavedQuery(id: string, newName: string) {
      try {
        const renamed = await invoke<SavedQuery>('rename_query', { id, newName })
        this.tabs.forEach(t => {
          if (t.savedQueryId === id) {
            t.name = renamed.name
            t.savedQueryId = renamed.id
          }
        })
        this.flushTabState()
        await this._refreshSavedQueries()
      } catch (e) {
        console.error('Failed to rename query:', e)
      }
    },
    openSavedQuery(saved: SavedQuery) {
      const existing = this.tabs.find(t => t.savedQueryId === saved.id)
      if (existing) {
        this.activeTabId = existing.id
        this.scheduleSaveTabState()
        return
      }
      tabCounter++
      const isNotebook = saved.id.toLowerCase().endsWith('.md') || isNotebookDocument(saved.sql)
      const tab: Tab = {
        id: `tab-${Date.now()}-${tabCounter}`,
        name: saved.name,
        sql: saved.sql,
        connectionId: null,
        isUnsaved: false,
        savedQueryId: saved.id,
        cursorLine: 1,
        cursorCol: 1,
        selectionAnchor: 0,
        selectionHead: 0,
        selectedTextCount: 0,
        type: 'query',
        format: isNotebook ? 'notebook' : 'sql',
      }
      this.tabs.push(tab)
      this.activeTabId = tab.id
      this.saveTabState()
    },
    async loadSavedQueries() {
      try {
        this.savedQueries = await invoke<SavedQuery[]>('load_queries')
        try {
          this.queriesDir = await invoke<string>('get_queries_dir')
          const customDir = await invoke<string | null>('get_custom_queries_dir')
          this.queriesDirNeedsSetup = !customDir
        } catch {
          this.queriesDir = null
          this.queriesDirNeedsSetup = false
        }
      } catch (e) {
        console.error('Failed to load queries:', e)
      }
    },
    async setQueriesDir(path: string) {
      try {
        await invoke('set_custom_queries_dir', { path })
        this.queriesDirNeedsSetup = false
        await this.loadSavedQueries()
      } catch (e) {
        console.error('Failed to set queries directory:', e)
        throw e
      }
    },
    async _refreshSavedQueries() {
      try {
        this.savedQueries = await invoke<SavedQuery[]>('load_queries')
      } catch (e) {
        console.error('Failed to refresh queries:', e)
      }
    },
    updateCursor(id: string, line: number, col: number) {
      const tab = this.tabs.find(t => t.id === id)
      if (tab) { tab.cursorLine = line; tab.cursorCol = col }
    },
    updateCursorAndSelection(id: string, line: number, col: number, anchor?: number, head?: number, selectedTextCount?: number) {
      const tab = this.tabs.find(t => t.id === id)
      if (tab) {
        tab.cursorLine = line
        tab.cursorCol = col
        if (anchor !== undefined) tab.selectionAnchor = anchor
        if (head !== undefined) tab.selectionHead = head
        tab.selectedTextCount = selectedTextCount ?? 0
        this.scheduleSaveTabState()
      }
    },
    setSplitRatio(ratio: number) {
      this.splitRatio = Math.max(0.15, Math.min(0.85, ratio))
      localStorage.setItem('splitRatio', String(this.splitRatio))
    },
    loadSplitRatio() {
      const saved = localStorage.getItem('splitRatio')
      if (saved) {
        const parsed = parseFloat(saved)
        if (Number.isFinite(parsed)) this.setSplitRatio(parsed)
      }
    },
    selectPrevTab() {
      const idx = this.tabs.findIndex(t => t.id === this.activeTabId)
      if (idx > 0) {
        this.activeTabId = this.tabs[idx - 1].id
        this.scheduleSaveTabState()
      }
    },
    selectNextTab() {
      const idx = this.tabs.findIndex(t => t.id === this.activeTabId)
      if (idx < this.tabs.length - 1) {
        this.activeTabId = this.tabs[idx + 1].id
        this.scheduleSaveTabState()
      }
    },
  },
})
