import { defineStore } from 'pinia'
import { setTheme as setThemeFromSystem } from '../theme/manager'
import { syncSoundsEnabled } from '../lib/cuelume'

export type Theme = 'dark' | 'light' | 'system'
export type GrainIntensity = 'subtle' | 'medium' | 'high'

function readSoundsEnabled(): boolean {
  if (typeof window === 'undefined') return true
  const stored = localStorage.getItem('soundsEnabled')
  return stored !== 'false'
}

function readFilmGrainEnabled(): boolean {
  if (typeof window === 'undefined') return true
  const stored = localStorage.getItem('filmGrainEnabled')
  return stored !== 'false'
}

function readGrainIntensity(): GrainIntensity {
  if (typeof window === 'undefined') return 'subtle'
  const stored = localStorage.getItem('grainIntensity')
  if (stored === 'subtle' || stored === 'medium' || stored === 'high') return stored
  return 'subtle'
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
    historyOpen: false,
    virtualKeyDialogOpen: false,
    virtualKeyTable: null as string | null,
    theme: ((typeof window !== 'undefined' && localStorage.getItem('theme')) as Theme) || 'system',
    systemIsDark: false,
    resultPanelOpen: typeof window !== 'undefined' ? localStorage.getItem('resultPanelOpen') !== 'false' : true,
    soundsEnabled: readSoundsEnabled(),
    filmGrainEnabled: readFilmGrainEnabled(),
    grainIntensity: readGrainIntensity(),
  }),

  getters: {
    isDark(state): boolean {
      if (state.theme === 'system') {
        return state.systemIsDark
      }
      return state.theme === 'dark'
    },
    currentGrainLevel(state): 'off' | 'subtle' | 'medium' | 'high' {
      if (!state.filmGrainEnabled) return 'off'
      return state.grainIntensity
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
    openHistory() {
      this.historyOpen = true
    },
    closeHistory() {
      this.historyOpen = false
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
      this.historyOpen = false
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
        document.documentElement.setAttribute('data-grain-intensity', this.grainIntensity)
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
    toggleFilmGrain() {
      this.setFilmGrainEnabled(!this.filmGrainEnabled)
    },
    setFilmGrainEnabled(enabled: boolean) {
      this.filmGrainEnabled = enabled
      if (typeof window !== 'undefined') {
        localStorage.setItem('filmGrainEnabled', String(enabled))
      }
    },
    setGrainIntensity(intensity: GrainIntensity) {
      this.grainIntensity = intensity
      if (typeof window !== 'undefined') {
        localStorage.setItem('grainIntensity', intensity)
        document.documentElement.setAttribute('data-grain-intensity', intensity)
      }
    },
    setGrainLevel(level: 'off' | 'subtle' | 'medium' | 'high') {
      if (level === 'off') {
        this.setFilmGrainEnabled(false)
      } else {
        this.setFilmGrainEnabled(true)
        this.setGrainIntensity(level)
      }
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
