import { defineStore } from 'pinia'

export interface Tab {
  id: string
  name: string
  sql: string
  connectionId: string | null
  isUnsaved: boolean
  cursorLine: number
  cursorCol: number
}

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
        cursorLine: 1,
        cursorCol: 1,
      },
    ] as Tab[],
    activeTabId: 'tab-1',
    splitRatio: 0.5,
  }),

  getters: {
    activeTab: (state): Tab | null =>
      state.tabs.find(t => t.id === state.activeTabId) ?? null,
  },

  actions: {
    addTab() {
      tabCounter++
      const tab: Tab = {
        id: `tab-${Date.now()}`,
        name: `Query ${tabCounter}`,
        sql: '',
        connectionId: null,
        isUnsaved: false,
        cursorLine: 1,
        cursorCol: 1,
      }
      this.tabs.push(tab)
      this.activeTabId = tab.id
      return tab.id
    },
    closeTab(id: string) {
      const idx = this.tabs.findIndex(t => t.id === id)
      if (idx === -1) return
      this.tabs.splice(idx, 1)
      if (this.activeTabId === id) {
        this.activeTabId = this.tabs[Math.max(0, idx - 1)]?.id ?? ''
        if (this.tabs.length === 0) this.addTab()
      }
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
      if (tab) tab.isUnsaved = false
    },
    updateCursor(id: string, line: number, col: number) {
      const tab = this.tabs.find(t => t.id === id)
      if (tab) { tab.cursorLine = line; tab.cursorCol = col }
    },
    setSplitRatio(ratio: number) {
      this.splitRatio = Math.max(0.15, Math.min(0.85, ratio))
      localStorage.setItem('splitRatio', String(this.splitRatio))
    },
    loadSplitRatio() {
      const saved = localStorage.getItem('splitRatio')
      if (saved) this.splitRatio = parseFloat(saved)
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
