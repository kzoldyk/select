import { loadThemeState, setTheme, themeState } from './manager'

export function initThemeSystem() {
  if (typeof window === 'undefined') return

  // Load saved theme configuration
  loadThemeState()

  // Track system preference
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

  const handleSystemChange = (e: MediaQueryListEvent | MediaQueryList) => {
    if (themeState.activeThemeId === 'system' || themeState.activeThemeId === 'default-dark' || themeState.activeThemeId === 'one-light') {
      if (e.matches) {
        setTheme('default-dark')
      } else {
        setTheme('one-light')
      }
    }
  }

  // If the active theme was set to system, apply the correct one
  if (themeState.activeThemeId === 'system') {
    if (mediaQuery.matches) {
      setTheme('default-dark')
    } else {
      setTheme('one-light')
    }
  }

  // Listen for preference updates
  try {
    mediaQuery.addEventListener('change', handleSystemChange)
  } catch {
    // Fallback for older browsers / webviews
    mediaQuery.addListener(handleSystemChange)
  }
}
