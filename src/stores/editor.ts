import { defineStore } from 'pinia'
import { invoke } from '@tauri-apps/api/core'

export interface Tab {
  id: string
  name: string
  sql: string
  connectionId: string | null
  isUnsaved: boolean
  savedQueryId: string | null
  cursorLine: number
  cursorCol: number
  selectionAnchor?: number
  selectionHead?: number
  selectedTextCount?: number
}

export interface SavedQuery {
  id: string
  name: string
  sql: string
  createdAt: string
  updatedAt: string
}

const MAX_TABS = 20
const DEFAULT_SQL = ``

let tabCounter = 1

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
      },
    ] as Tab[],
    activeTabId: 'tab-1',
    splitRatio: 0.5,
    fontSize: 13,
    savedQueries: [] as SavedQuery[],
    saveDialogOpen: false,
    saveDialogTabId: null as string | null,
  }),

  getters: {
    activeTab: (state): Tab | null =>
      state.tabs.find(t => t.id === state.activeTabId) ?? null,
  },

  actions: {
    saveTabState() {
      const data = this.tabs.map(t => ({
        name: t.name, sql: t.sql, savedQueryId: t.savedQueryId,
        cursorLine: t.cursorLine, cursorCol: t.cursorCol,
        selectionAnchor: t.selectionAnchor, selectionHead: t.selectionHead,
      }))
      localStorage.setItem('tabState', JSON.stringify(data))
      localStorage.setItem('activeTabId', this.activeTabId)
      localStorage.setItem('editorFontSize', String(this.fontSize))
    },
    restoreTabState() {
      this.loadFontSize()
      const raw = localStorage.getItem('tabState')
      if (!raw) return
      try {
        const data = JSON.parse(raw) as {
          name: string
          sql: string
          savedQueryId: string | null
          cursorLine: number
          cursorCol: number
          selectionAnchor?: number
          selectionHead?: number
        }[]
        if (!data.length) return
        this.tabs = data.map((d, i) => ({
          id: `tab-${Date.now()}-${i}`,
          name: d.name,
          sql: d.sql,
          connectionId: null,
          isUnsaved: false,
          savedQueryId: d.savedQueryId,
          cursorLine: d.cursorLine || 1,
          cursorCol: d.cursorCol || 1,
          selectionAnchor: d.selectionAnchor,
          selectionHead: d.selectionHead,
          selectedTextCount: (d.selectionAnchor !== undefined && d.selectionHead !== undefined)
            ? Math.abs(d.selectionHead - d.selectionAnchor)
            : 0,
        }))
        const activeId = localStorage.getItem('activeTabId')
        if (activeId && this.tabs.some(t => t.id === activeId)) {
          this.activeTabId = activeId
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
    addTab() {
      if (this.tabs.length >= MAX_TABS) return ''
      tabCounter++
      const tab: Tab = {
        id: `tab-${Date.now()}`,
        name: `Query ${tabCounter}`,
        sql: '',
        connectionId: null,
        isUnsaved: false,
        savedQueryId: null,
        cursorLine: 1,
        cursorCol: 1,
        selectionAnchor: 0,
        selectionHead: 0,
        selectedTextCount: 0,
      }
      this.tabs.push(tab)
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
      }
    },
    updateSql(id: string, sql: string) {
      const tab = this.tabs.find(t => t.id === id)
      if (tab) {
        tab.sql = sql
        tab.isUnsaved = true
      }
    },
    saveTab(id: string) {
      const tab = this.tabs.find(t => t.id === id)
      if (!tab) return
      if (tab.savedQueryId) {
        invoke('save_query', { name: tab.name, sql: tab.sql }).then(() => {
          tab.isUnsaved = false
          this._refreshSavedQueries()
        }).catch(console.error)
      } else {
        this.saveDialogTabId = id
        this.saveDialogOpen = true
      }
    },
    async saveQueryAs(tabId: string, name: string) {
      const tab = this.tabs.find(t => t.id === tabId)
      if (!tab) return
      try {
        const saved = await invoke<SavedQuery>('save_query', { name, sql: tab.sql })
        tab.name = name
        tab.savedQueryId = saved.id
        tab.isUnsaved = false
        this.saveDialogOpen = false
        this.saveDialogTabId = null
        this.saveTabState()
        await this._refreshSavedQueries()
      } catch (e) {
        console.error('Failed to save query:', e)
      }
    },
    async dropSavedQuery(id: string) {
      try {
        await invoke('delete_query', { id })
        this.tabs.forEach(t => {
          if (t.savedQueryId === id) t.savedQueryId = null
        })
        await this._refreshSavedQueries()
      } catch (e) {
        console.error('Failed to delete query:', e)
      }
    },
    async renameSavedQuery(id: string, newName: string) {
      try {
        await invoke('rename_query', { id, newName })
        this.tabs.forEach(t => {
          if (t.savedQueryId === id) t.name = newName
        })
        await this._refreshSavedQueries()
      } catch (e) {
        console.error('Failed to rename query:', e)
      }
    },
    openSavedQuery(saved: SavedQuery) {
      const existing = this.tabs.find(t => t.savedQueryId === saved.id)
      if (existing) {
        this.activeTabId = existing.id
        return
      }
      tabCounter++
      const tab: Tab = {
        id: `tab-${Date.now()}`,
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
      }
      this.tabs.push(tab)
      this.activeTabId = tab.id
    },
    async loadSavedQueries() {
      try {
        this.savedQueries = await invoke<SavedQuery[]>('load_queries')
      } catch (e) {
        console.error('Failed to load queries:', e)
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
      if (idx > 0) this.activeTabId = this.tabs[idx - 1].id
    },
    selectNextTab() {
      const idx = this.tabs.findIndex(t => t.id === this.activeTabId)
      if (idx < this.tabs.length - 1) this.activeTabId = this.tabs[idx + 1].id
    },
  },
})
