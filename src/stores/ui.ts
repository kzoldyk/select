import { defineStore } from 'pinia'

export type Theme = 'dark' | 'light' | 'system'

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
    theme: ((typeof window !== 'undefined' && localStorage.getItem('theme')) as Theme) || 'system',
    systemIsDark: false,
  }),

  getters: {
    isDark(state): boolean {
      if (state.theme === 'system') {
        return state.systemIsDark
      }
      return state.theme === 'dark'
    },
  },

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
    openSettings() {
      this.settingsOpen = true
    },
    closeSettings() {
      this.settingsOpen = false
    },
    setTheme(theme: Theme) {
      this.theme = theme
      if (typeof window !== 'undefined') {
        localStorage.setItem('theme', theme)
      }
      this.applyTheme()
    },
    toggleTheme() {
      const cycle: Record<Theme, Theme> = {
        'system': 'light',
        'light': 'dark',
        'dark': 'system',
      }
      this.setTheme(cycle[this.theme])
    },
    updateSystemTheme(isDark: boolean) {
      this.systemIsDark = isDark
      this.applyTheme()
    },
    applyTheme() {
      if (typeof window !== 'undefined') {
        document.documentElement.classList.toggle('dark', this.isDark)
      }
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
