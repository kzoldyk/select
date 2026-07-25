import { reactive, computed, watch } from 'vue'
import { Theme, ThemeCategory, ThemeColors } from './types'
import { defineTheme } from './constants'

// Import all built-in themes to build the list
import defaultDark from './themes/default-dark'
import dracula from './themes/dracula'
import nord from './themes/nord'
import gruvboxDark from './themes/gruvbox-dark'
import oneDarkPro from './themes/one-dark-pro'
import tokyoNight from './themes/tokyo-night'
import tokyoNightStorm from './themes/tokyo-night-storm'
import catppuccinMocha from './themes/catppuccin-mocha'
import catppuccinMacchiato from './themes/catppuccin-macchiato'
import catppuccinFrappe from './themes/catppuccin-frappe'
import everforest from './themes/everforest'
import kanagawa from './themes/kanagawa'
import rosePine from './themes/rose-pine'
import rosePineMoon from './themes/rose-pine-moon'
import ayuMirage from './themes/ayu-mirage'
import materialDark from './themes/material-dark'
import monokai from './themes/monokai'
import nightOwl from './themes/night-owl'
import carbon from './themes/carbon'
import githubDark from './themes/github-dark'
import vitesseDark from './themes/vitesse-dark'
import solarizedDark from './themes/solarized-dark'

import githubLight from './themes/github-light'
import oneLight from './themes/one-light'
import catppuccinLatte from './themes/catppuccin-latte'
import solarizedLight from './themes/solarized-light'
import paper from './themes/paper'
import minimal from './themes/minimal'
import everforestLight from './themes/everforest-light'

import pitchBlack from './themes/pitch-black'
import oledBlack from './themes/oled-black'
import midnight from './themes/midnight'

import matrix from './themes/matrix'
import amber from './themes/amber'
import greenTerminal from './themes/green-terminal'
import ibmDos from './themes/ibm-dos'
import crt from './themes/crt'

import neon from './themes/neon'
import cyberpunk from './themes/cyberpunk'
import lavender from './themes/lavender'
import sakura from './themes/sakura'
import forest from './themes/forest'
import ocean from './themes/ocean'
import sunset from './themes/sunset'
import coffee from './themes/coffee'
import iceberg from './themes/iceberg'

export const BUILTIN_THEMES: Theme[] = [
  defaultDark,
  dracula,
  nord,
  gruvboxDark,
  oneDarkPro,
  tokyoNight,
  tokyoNightStorm,
  catppuccinMocha,
  catppuccinMacchiato,
  catppuccinFrappe,
  everforest,
  kanagawa,
  rosePine,
  rosePineMoon,
  ayuMirage,
  materialDark,
  monokai,
  nightOwl,
  carbon,
  githubDark,
  vitesseDark,
  solarizedDark,

  githubLight,
  oneLight,
  catppuccinLatte,
  solarizedLight,
  paper,
  minimal,
  everforestLight,

  pitchBlack,
  oledBlack,
  midnight,

  matrix,
  amber,
  greenTerminal,
  ibmDos,
  crt,

  neon,
  cyberpunk,
  lavender,
  sakura,
  forest,
  ocean,
  sunset,
  coffee,
  iceberg,
]

const LOCAL_STORAGE_KEY = 'select-theme-system-state'

interface SavedState {
  activeThemeId: string
  favorites: string[]
  history: string[]
  customThemes: Record<string, Theme>
}

// Reactive state
export const themeState = reactive({
  activeThemeId: 'default-dark',
  previewThemeId: null as string | null,
  favorites: [] as string[],
  history: [] as string[],
  customThemes: {} as Record<string, Theme>,

  // Gallery filters
  searchQuery: '',
  selectedCategory: 'All' as ThemeCategory | 'All' | 'Favorites' | 'Recent',
  sortBy: 'alphabetical' as 'alphabetical' | 'newest' | 'favorites' | 'recent',
})

// Get all themes merged
export const allThemes = computed<Theme[]>(() => {
  const customList = Object.values(themeState.customThemes)
  return [...BUILTIN_THEMES, ...customList]
})

// Current resolved active theme
export const activeTheme = computed<Theme>(() => {
  const targetId = themeState.previewThemeId || themeState.activeThemeId
  const theme = allThemes.value.find((t) => t.id === targetId)
  return theme || defaultDark
})

// Apply CSS variables to :root
export function applyThemeVariables(theme: Theme) {
  if (typeof window === 'undefined') return

  const root = document.documentElement

  // Theme Category Meta
  const isDarkCategory = [
    'Dark',
    'OLED',
    'Retro',
    'Synthwave',
    'Cyberpunk',
    'Terminal',
  ].includes(theme.category)
  root.classList.toggle('dark', isDarkCategory)
  root.setAttribute('data-theme-category', theme.category)
  root.setAttribute('data-theme-id', theme.id)

  // Direct CSS mapping
  for (const [key, value] of Object.entries(theme.colors)) {
    if (value) {
      const cssKey = '--' + key.replace(/([A-Z])/g, '-$1').toLowerCase()
      root.style.setProperty(cssKey, value)
    }
  }

  // Map shadow helpers specifically
  if (theme.colors.shadowSoft) root.style.setProperty('--shadow-soft', theme.colors.shadowSoft)
  if (theme.colors.shadowMedium) root.style.setProperty('--shadow-medium', theme.colors.shadowMedium)
  if (theme.colors.shadowHeavy) root.style.setProperty('--shadow-heavy', theme.colors.shadowHeavy)
  if (theme.colors.shadowGlow) root.style.setProperty('--shadow-glow', theme.colors.shadowGlow)

  // Map editor CodeMirror/Monaco specific elements
  const syntaxMap: Record<string, string> = {
    syntaxKeyword: '--syn-keyword',
    syntaxFunction: '--syn-fn',
    syntaxString: '--syn-string',
    syntaxNumber: '--syn-number',
    syntaxOperator: '--syn-op',
    syntaxComment: '--syn-comment',
    syntaxType: '--syn-type',
    syntaxSchema: '--syn-schema',
    syntaxIdentifier: '--syn-ident',
  }

  for (const [key, cssVar] of Object.entries(syntaxMap)) {
    const val = (theme.colors as any)[key]
    if (val) {
      root.style.setProperty(cssVar, val)
    }
  }

  // Backward compatibility maps for tailwind / shadcn component classes
  root.style.setProperty('--foreground', theme.colors.text)
  root.style.setProperty('--card', theme.colors.backgroundSecondary)
  root.style.setProperty('--card-foreground', theme.colors.text)
  root.style.setProperty('--popover', theme.colors.backgroundElevated)
  root.style.setProperty('--popover-foreground', theme.colors.text)
  root.style.setProperty('--muted', theme.colors.surface)
  root.style.setProperty('--muted-foreground', theme.colors.textMuted)
  root.style.setProperty('--accent', theme.colors.surfaceHover)
  root.style.setProperty('--accent-foreground', theme.colors.text)
  root.style.setProperty('--destructive', theme.colors.danger)
  root.style.setProperty('--destructive-foreground', theme.colors.destructiveForeground)
  root.style.setProperty('--border', theme.colors.border)
  root.style.setProperty('--input', theme.colors.border)
  root.style.setProperty('--ring', theme.colors.focusRing)
}

// Watch activeTheme changes and apply automatically
watch(activeTheme, (newTheme) => {
  if (newTheme) {
    applyThemeVariables(newTheme)
  }
}, { immediate: true })

// Persistence
export function saveThemeState() {
  const state: SavedState = {
    activeThemeId: themeState.activeThemeId,
    favorites: themeState.favorites,
    history: themeState.history,
    customThemes: themeState.customThemes,
  }
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state))
}

export function loadThemeState() {
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
  if (!raw) {
    // Default fallback
    applyThemeVariables(activeTheme.value)
    return
  }
  try {
    const parsed = JSON.parse(raw) as SavedState
    if (parsed.activeThemeId) themeState.activeThemeId = parsed.activeThemeId
    if (parsed.favorites) themeState.favorites = parsed.favorites
    if (parsed.history) themeState.history = parsed.history
    if (parsed.customThemes) themeState.customThemes = parsed.customThemes
  } catch (error) {
    console.warn('Failed to parse theme system state:', error)
  }
  applyThemeVariables(activeTheme.value)
}

// Theme Operations
export function setTheme(themeId: string) {
  const theme = allThemes.value.find((t) => t.id === themeId)
  if (!theme) return

  themeState.activeThemeId = themeId
  themeState.previewThemeId = null // clear preview

  // Add to history
  themeState.history = [
    themeId,
    ...themeState.history.filter((id) => id !== themeId),
  ].slice(0, 10)

  saveThemeState()
}

export function previewTheme(themeId: string | null) {
  themeState.previewThemeId = themeId
}

export function toggleFavorite(themeId: string) {
  const isFav = themeState.favorites.includes(themeId)
  if (isFav) {
    themeState.favorites = themeState.favorites.filter((id) => id !== themeId)
  } else {
    themeState.favorites.push(themeId)
  }
  saveThemeState()
}

export function randomTheme() {
  const list = allThemes.value
  if (!list.length) return
  const rand = list[Math.floor(Math.random() * list.length)]
  setTheme(rand.id)
  return rand
}

export function nextTheme() {
  const list = allThemes.value
  if (!list.length) return
  const currIndex = list.findIndex((t) => t.id === themeState.activeThemeId)
  const nextIndex = (currIndex + 1) % list.length
  setTheme(list[nextIndex].id)
}

export function prevTheme() {
  const list = allThemes.value
  if (!list.length) return
  const currIndex = list.findIndex((t) => t.id === themeState.activeThemeId)
  const prevIndex = (currIndex - 1 + list.length) % list.length
  setTheme(list[prevIndex].id)
}

export function duplicateTheme(themeId: string): Theme | null {
  const source = allThemes.value.find((t) => t.id === themeId)
  if (!source) return null

  const newId = `${source.id}-copy-${Date.now()}`
  const newTheme = defineTheme({
    id: newId,
    name: `${source.name} (Copy)`,
    author: 'You',
    category: source.category,
    description: `Copy of ${source.name}`,
    colors: { ...source.colors },
  })

  themeState.customThemes[newId] = newTheme
  saveThemeState()
  setTheme(newId)
  return newTheme
}

export function deleteTheme(themeId: string) {
  if (themeState.customThemes[themeId]) {
    delete themeState.customThemes[themeId]
    themeState.favorites = themeState.favorites.filter((id) => id !== themeId)
    themeState.history = themeState.history.filter((id) => id !== themeId)

    if (themeState.activeThemeId === themeId) {
      themeState.activeThemeId = 'default-dark'
    }

    saveThemeState()
  }
}

export function updateCustomTheme(themeId: string, updatedColors: Partial<ThemeColors>) {
  const existing = themeState.customThemes[themeId]
  if (!existing) return

  themeState.customThemes[themeId] = {
    ...existing,
    colors: {
      ...existing.colors,
      ...updatedColors,
    },
  }
  saveThemeState()
  // Force reactivity
  if (themeState.activeThemeId === themeId || themeState.previewThemeId === themeId) {
    applyThemeVariables(themeState.customThemes[themeId])
  }
}

export function createNewTheme(name: string, category: ThemeCategory, baseColors: Partial<ThemeColors> = {}): Theme {
  const id = `custom-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`
  const newTheme = defineTheme({
    id,
    name,
    author: 'You',
    category,
    description: `A custom user-defined ${category.toLowerCase()} theme.`,
    colors: {
      background: baseColors.background || '#121212',
      text: baseColors.text || '#ffffff',
      primary: baseColors.primary || '#e11d48',
      secondary: baseColors.secondary || '#1e1e1e',
      accent: baseColors.accent || '#3b82f6',
      ...baseColors,
    },
  })

  themeState.customThemes[id] = newTheme
  saveThemeState()
  setTheme(id)
  return newTheme
}

export function importTheme(jsonStr: string): Theme | null {
  try {
    const raw = JSON.parse(jsonStr)
    if (!raw.name || !raw.category || !raw.colors || !raw.colors.background) {
      throw new Error('Missing required theme fields')
    }

    const id = raw.id || `imported-${raw.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`
    const imported = defineTheme({
      id,
      name: raw.name,
      author: raw.author || 'Imported',
      category: raw.category,
      description: raw.description || 'Imported theme.',
      colors: raw.colors,
    })

    themeState.customThemes[id] = imported
    saveThemeState()
    setTheme(id)
    return imported
  } catch (error) {
    console.error('Failed to import theme:', error)
    return null
  }
}

export function exportTheme(themeId: string) {
  const theme = allThemes.value.find((t) => t.id === themeId)
  if (!theme) return

  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(theme, null, 2))
  const downloadAnchor = document.createElement('a')
  downloadAnchor.setAttribute('href', dataStr)
  downloadAnchor.setAttribute('download', `${theme.id}.json`)
  document.body.appendChild(downloadAnchor)
  downloadAnchor.click()
  downloadAnchor.remove()
}

export function resetThemeSystem() {
  themeState.customThemes = {}
  themeState.favorites = []
  themeState.history = []
  themeState.activeThemeId = 'default-dark'
  saveThemeState()
  applyThemeVariables(defaultDark)
}
