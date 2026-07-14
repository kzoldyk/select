import { defineStore } from 'pinia'

export const useUiStore = defineStore('ui', {
  state: () => ({
    sidebarOpen: true,
	    paletteOpen: false,
	    inspectorOpen: false,
	    connectionManagerOpen: false,
	    activeInspectorTable: null as string | null,
	    settingsOpen: false,
	    shortcutsOpen: false,
	    exportOpen: false,
	    theme: 'dark' as 'dark' | 'light',
  }),

  actions: {
    toggleSidebar() {
      this.sidebarOpen = !this.sidebarOpen
    },
    openPalette() {
      this.paletteOpen = true
    },
    closePalette() {
      this.paletteOpen = false
    },
    togglePalette() {
      this.paletteOpen = !this.paletteOpen
    },
    openInspector(tableName: string) {
      this.activeInspectorTable = tableName
      this.inspectorOpen = true
    },
    closeInspector() {
      this.inspectorOpen = false
      this.activeInspectorTable = null
    },
    openConnectionManager() {
      this.connectionManagerOpen = true
    },
    closeConnectionManager() {
      this.connectionManagerOpen = false
    },
    openShortcuts() {
      this.shortcutsOpen = true
    },
    closeShortcuts() {
      this.shortcutsOpen = false
    },
    openExport() {
      this.exportOpen = true
    },
    closeExport() {
      this.exportOpen = false
    },
    toggleTheme() {
      this.theme = this.theme === 'dark' ? 'light' : 'dark'
      document.documentElement.classList.toggle('dark', this.theme === 'dark')
    },
    closeAll() {
	      this.paletteOpen = false
	      this.inspectorOpen = false
	      this.connectionManagerOpen = false
	      this.settingsOpen = false
	      this.shortcutsOpen = false
	      this.exportOpen = false
	    },
  },
})
