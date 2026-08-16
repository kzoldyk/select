import { defineStore } from 'pinia'
import { setTheme as setThemeFromSystem } from '../theme/manager'
import { syncSoundsEnabled } from '../lib/cuelume'

export type Theme = 'dark' | 'light' | 'system'

function readSoundsEnabled(): boolean {
  if (typeof window === 'undefined') return true
  const stored = localStorage.getItem('soundsEnabled')
  return stored !== 'false'
}

export const useUiStore = defineStore('ui', {
  state: () => ({
    sidebarOpen: true,
    paletteOpen: false,
    inspectorOpen: false,
    connectionManagerOpen: false,
    connectionEditSheetOpen: false,
    editingConnectionId: null as string | null,
    activeInspectorTable: null as string | null,
    settingsOpen: false,
    shortcutsOpen: false,
    exportOpen: false,
    themeGalleryOpen: false,
    virtualKeyDialogOpen: false,
    virtualKeyTable: null as string | null,
    theme: ((typeof window !== 'undefined' && localStorage.getItem('theme')) as Theme) || 'system',
    systemIsDark: false,
    resultPanelOpen: typeof window !== 'undefined' ? localStorage.getItem('resultPanelOpen') !== 'false' : true,
    soundsEnabled: readSoundsEnabled(),
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
    openConnectionEditSheet(id?: string | null) {
      this.editingConnectionId = id ?? null
      this.connectionEditSheetOpen = true
    },
    closeConnectionEditSheet() {
      this.connectionEditSheetOpen = false
      this.editingConnectionId = null
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
    openVirtualKeyDialog(tableName: string) {
      this.virtualKeyTable = tableName
      this.virtualKeyDialogOpen = true
    },
    closeVirtualKeyDialog() {
      this.virtualKeyDialogOpen = false
      this.virtualKeyTable = null
    },
    closeAll() {
      this.paletteOpen = false
      this.inspectorOpen = false
      this.connectionManagerOpen = false
      this.connectionEditSheetOpen = false
      this.editingConnectionId = null
      this.settingsOpen = false
      this.shortcutsOpen = false
      this.exportOpen = false
      this.themeGalleryOpen = false
      this.virtualKeyDialogOpen = false
      this.activeInspectorTable = null
      this.virtualKeyTable = null
    },
    setTheme(theme: Theme) {
      this.theme = theme
      if (typeof window !== 'undefined') {
        localStorage.setItem('theme', theme)
      }
      this.applyTheme()

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

      if (this.theme === 'system') {
        setThemeFromSystem(isDark ? 'default-dark' : 'one-light')
      }
    },
    applyTheme() {
      if (typeof window !== 'undefined') {
        document.documentElement.classList.toggle('dark', this.isDark)
      }
    },
    toggleSounds() {
      this.setSoundsEnabled(!this.soundsEnabled)
    },
    setSoundsEnabled(enabled: boolean) {
      this.soundsEnabled = enabled
      if (typeof window !== 'undefined') {
        localStorage.setItem('soundsEnabled', String(enabled))
      }
      syncSoundsEnabled(enabled)
    },
    setResultPanelOpen(open: boolean) {
      this.resultPanelOpen = open
      if (typeof window !== 'undefined') {
        localStorage.setItem('resultPanelOpen', String(open))
      }
    },
    toggleResultPanel() {
      this.setResultPanelOpen(!this.resultPanelOpen)
    },
  },
})
