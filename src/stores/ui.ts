import { defineStore } from 'pinia'
import { setTheme as setThemeFromSystem } from '../theme/manager'

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
    themeGalleryOpen: false,
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
    openThemeGallery() {
      this.themeGalleryOpen = true
    },
    closeThemeGallery() {
      this.themeGalleryOpen = false
    },
    toggleThemeGallery() {
      this.themeGalleryOpen = !this.themeGalleryOpen
    },
    setTheme(theme: Theme) {
      this.theme = theme
      if (typeof window !== 'undefined') {
        localStorage.setItem('theme', theme)
      }
      this.applyTheme()

      // Bridge to the new theme system
      if (theme === 'dark') {
        setThemeFromSystem('default-dark')
      } else if (theme === 'light') {
        setThemeFromSystem('one-light')
      } else if (theme === 'system') {
        const isDark = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : false
        setThemeFromSystem(isDark ? 'default-dark' : 'one-light')
      }
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

      // Keep dynamic theme synced if on system
      if (this.theme === 'system') {
        setThemeFromSystem(isDark ? 'default-dark' : 'one-light')
      }
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
      this.themeGalleryOpen = false
    },
  },
})
