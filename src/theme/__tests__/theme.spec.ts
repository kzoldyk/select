import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  themeState,
  allThemes,
  activeTheme,
  setTheme,
  previewTheme,
  toggleFavorite,
  randomTheme,
  duplicateTheme,
  deleteTheme,
  updateCustomTheme,
  createNewTheme,
  importTheme,
  resetThemeSystem,
} from '../index'

describe('Theme System Manager', () => {
  beforeEach(() => {
    localStorage.clear()
    resetThemeSystem()
    // Reset state values
    themeState.activeThemeId = 'default-dark'
    themeState.previewThemeId = null
    themeState.favorites = []
    themeState.history = []
    themeState.searchQuery = ''
    themeState.selectedCategory = 'All'
    themeState.sortBy = 'alphabetical'
  })

  it('initializes with default dark theme', () => {
    expect(activeTheme.value.id).toBe('default-dark')
    expect(activeTheme.value.name).toBe('Default Dark')
    expect(activeTheme.value.category).toBe('Dark')
  })

  it('switches themes and registers in history', () => {
    setTheme('dracula')
    expect(themeState.activeThemeId).toBe('dracula')
    expect(activeTheme.value.id).toBe('dracula')
    expect(themeState.history[0]).toBe('dracula')
  })

  it('previews theme without changing activeThemeId permanent state', () => {
    previewTheme('nord')
    expect(activeTheme.value.id).toBe('nord')
    expect(themeState.activeThemeId).toBe('default-dark') // keeps old active state

    previewTheme(null)
    expect(activeTheme.value.id).toBe('default-dark') // restores
  })

  it('manages favorites correctly', () => {
    expect(themeState.favorites.includes('dracula')).toBe(false)
    toggleFavorite('dracula')
    expect(themeState.favorites.includes('dracula')).toBe(true)

    toggleFavorite('dracula')
    expect(themeState.favorites.includes('dracula')).toBe(false)
  })

  it('cycles through next/previous/random themes', () => {
    const initial = activeTheme.value.id
    const rand = randomTheme()
    expect(rand).toBeDefined()
    expect(activeTheme.value.id).toBe(rand?.id)
  })

  it('supports creating custom themes, editing colors, and duplicating them', () => {
    const custom = createNewTheme('My Custom Theme', 'Minimal', {
      background: '#ffffff',
      text: '#000000',
    })

    expect(custom.id).toContain('custom-my-custom-theme')
    expect(activeTheme.value.id).toBe(custom.id)
    expect(activeTheme.value.colors.background).toBe('#ffffff')

    // Edit color
    updateCustomTheme(custom.id, { background: '#f0f0f0' })
    expect(activeTheme.value.colors.background).toBe('#f0f0f0')

    // Duplicate
    const dup = duplicateTheme(custom.id)
    expect(dup).not.toBeNull()
    expect(dup?.name).toBe('My Custom Theme (Copy)')
    expect(activeTheme.value.id).toBe(dup?.id)

    // Delete
    const customId = custom.id
    deleteTheme(customId)
    expect(themeState.customThemes[customId]).toBeUndefined()
  })

  it('imports valid JSON themes successfully', () => {
    const rawThemeJson = JSON.stringify({
      name: 'Dracula community copy',
      category: 'Dark',
      colors: {
        background: '#282a36',
        text: '#f8f8f2',
        primary: '#ff79c6',
        secondary: '#bd93f9',
        accent: '#8be9fd',
      },
    })

    const imported = importTheme(rawThemeJson)
    expect(imported).not.toBeNull()
    expect(imported?.name).toBe('Dracula community copy')
    expect(activeTheme.value.id).toBe(imported?.id)
    expect(activeTheme.value.colors.background).toBe('#282a36')
  })
})
