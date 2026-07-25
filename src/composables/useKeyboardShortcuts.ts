import { onMounted, onUnmounted } from 'vue'
import { useEditorStore } from '../stores/editor'
import { useUiStore } from '../stores/ui'
import { useResultStore } from '../stores/result'
import { useSchemaStore } from '../stores/schema'
import { useConnectionStore } from '../stores/connection'
import { toast } from 'vue-sonner'
import { activeTheme, themeState, randomTheme, nextTheme, prevTheme, toggleFavorite } from '../theme'

export function useKeyboardShortcuts(onRun?: () => void) {
  const editor = useEditorStore()
  const ui = useUiStore()
  const result = useResultStore()
  const schema = useSchemaStore()
  const conn = useConnectionStore()

  function isMac() {
    return navigator.platform.toUpperCase().indexOf('MAC') >= 0
  }

  function handler(e: KeyboardEvent) {
    const meta = isMac() ? e.metaKey : e.ctrlKey
    const shift = e.shiftKey
    const alt = e.altKey
    const key = e.key
    const target = e.target as HTMLElement | null
    const isTyping =
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      (target?.isContentEditable && !target?.closest('.cm-editor'))

    const isFocusShortcut = meta && !shift && !alt && (key === '1' || key === '2' || key === '3')
    if (isTyping && key !== 'Escape' && !isFocusShortcut) return

    // ⌘⌥T — Toggle theme gallery
    if (meta && alt && (key === 't' || key === 'T')) {
      e.preventDefault()
      ui.toggleThemeGallery()
      return
    }

    // ⌘⌥R — Random theme
    if (meta && alt && (key === 'r' || key === 'R')) {
      e.preventDefault()
      const t = randomTheme()
      if (t) toast.success(`Applied random theme: "${t.name}"`)
      return
    }

    // ⌘⌥F — Favorite active theme
    if (meta && alt && (key === 'f' || key === 'F')) {
      e.preventDefault()
      toggleFavorite(activeTheme.value.id)
      const isFav = activeTheme.value.id ? themeState.favorites.includes(activeTheme.value.id) : false
      toast.success(isFav ? `Added "${activeTheme.value.name}" to favorites` : `Removed "${activeTheme.value.name}" from favorites`)
      return
    }

    // ⌘⌥→ — Next theme
    if (meta && alt && key === 'ArrowRight') {
      e.preventDefault()
      nextTheme()
      toast.success(`Theme: "${activeTheme.value.name}"`)
      return
    }

    // ⌘⌥← — Previous theme
    if (meta && alt && key === 'ArrowLeft') {
      e.preventDefault()
      prevTheme()
      toast.success(`Theme: "${activeTheme.value.name}"`)
      return
    }

    // ⌘1 — Focus Sidebar Search Input
    if (meta && !shift && !alt && key === '1') {
      e.preventDefault()
      if (!ui.sidebarOpen) {
        ui.toggleSidebar()
      }
      setTimeout(() => {
        const el = document.getElementById('sidebar-search-input') as HTMLElement | null
        el?.focus()
      }, 50)
      return
    }

    // ⌘2 — Focus SQL Editor
    if (meta && !shift && !alt && key === '2') {
      e.preventDefault()
      const el = document.querySelector('.cm-content') as HTMLElement | null
      el?.focus()
      return
    }

    // ⌘3 — Focus Results Grid
    if (meta && !shift && !alt && key === '3') {
      e.preventDefault()
      const el = document.getElementById('result-grid-table') as HTMLElement | null
      el?.focus()
      return
    }

    // ⌘K — Toggle command palette
    if (meta && !shift && key === 'k') {
      e.preventDefault()
      ui.togglePalette()
      return
    }

    // ⌘↵ — Run query
    if (meta && !shift && (key === 'Enter' || key === 'Return')) {
      e.preventDefault()
      onRun?.()
      return
    }

    // ⌘⇧↵ — Run query outside the editor. CodeMirror handles selected text.
    if (meta && shift && (key === 'Enter' || key === 'Return')) {
      e.preventDefault()
      onRun?.()
      return
    }

    // ⌘S — Save current tab
    if (meta && !shift && key === 's') {
      e.preventDefault()
      if (editor.activeTabId) editor.saveTab(editor.activeTabId)
      return
    }

    // ⌘⇧S — Save query as (always show dialog)
    if (meta && shift && key === 'S') {
      e.preventDefault()
      if (editor.activeTabId) {
        editor.saveDialogTabId = editor.activeTabId
        editor.saveDialogOpen = true
      }
      return
    }

    // ⌘T — New tab
    if (meta && !shift && key === 't') {
      e.preventDefault()
      editor.addTab()
      return
    }

    // ⌘W — Close current tab
    if (meta && !shift && key === 'w') {
      e.preventDefault()
      if (editor.activeTabId) editor.closeTab(editor.activeTabId)
      return
    }

    // ⌘[ — Previous tab
    if (meta && !shift && key === '[') {
      e.preventDefault()
      editor.selectPrevTab()
      return
    }

    // ⌘] — Next tab
    if (meta && !shift && key === ']') {
      e.preventDefault()
      editor.selectNextTab()
      return
    }

    // ⌘B — Toggle sidebar
    if (meta && !shift && key === 'b') {
      e.preventDefault()
      ui.toggleSidebar()
      return
    }

    // ⌘R — Run query
    if (meta && !shift && key === 'r') {
      e.preventDefault()
      onRun?.()
      return
    }

    // ⌘⇧R — Refresh schema
    if (meta && shift && key === 'R') {
      e.preventDefault()
      schema.refreshSchema(conn.activeId ?? undefined)
      return
    }

    // ⌘E — Export CSV
    if (meta && !shift && key === 'e') {
      e.preventDefault()
      result.exportCsv()
      return
    }

    // ⌘I — Schema inspector
    if (meta && !shift && key === 'i') {
      e.preventDefault()
      const tableName = schema.activeTable ?? schema.tables[0]?.name
      if (ui.inspectorOpen) ui.closeInspector()
      else if (tableName) ui.openInspector(tableName)
      return
    }

    // ⌘⇧E — Export dialog
    if (meta && shift && key === 'E') {
      e.preventDefault()
      if (result.columns.length) ui.openExport()
      return
    }

    // ⌘⇧C — Connection manager
    if (meta && shift && key === 'C') {
      e.preventDefault()
      ui.openConnectionManager()
      return
    }

    // ⌘D — Switch database (open connection manager)
    if (meta && !shift && key === 'd') {
      e.preventDefault()
      ui.openConnectionManager()
      return
    }

    // ⌘⇧/ — Keyboard shortcuts
    if (meta && shift && key === '/') {
      e.preventDefault()
      ui.openShortcuts()
      return
    }

    // Esc — Close the topmost open overlay
    if (key === 'Escape') {
      if (ui.themeGalleryOpen) { ui.closeThemeGallery(); return }
      if (editor.saveDialogOpen) { editor.saveDialogOpen = false; return }
      if (ui.shortcutsOpen) { ui.closeShortcuts(); return }
      if (ui.connectionManagerOpen) { ui.closeConnectionManager(); return }
      if (ui.inspectorOpen) { ui.closeInspector(); return }
      if (ui.paletteOpen) { ui.closePalette(); return }
    }
  }

  onMounted(() => document.addEventListener('keydown', handler))
  onUnmounted(() => document.removeEventListener('keydown', handler))
}
