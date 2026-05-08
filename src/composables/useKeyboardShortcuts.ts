import { onMounted, onUnmounted } from 'vue'
import { useEditorStore } from '../stores/editor'
import { useUiStore } from '../stores/ui'
import { useResultStore } from '../stores/result'
import { useSchemaStore } from '../stores/schema'

export function useKeyboardShortcuts(onRun?: () => void) {
  const editor = useEditorStore()
  const ui = useUiStore()
  const result = useResultStore()
  const schema = useSchemaStore()

  function isMac() {
    return navigator.platform.toUpperCase().indexOf('MAC') >= 0
  }

  function handler(e: KeyboardEvent) {
    const meta = isMac() ? e.metaKey : e.ctrlKey
    const shift = e.shiftKey
    const key = e.key

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

    // ⌘⇧↵ — Run selected text
    if (meta && shift && (key === 'Enter' || key === 'Return')) {
      e.preventDefault()
      // TODO: run selected text only
      onRun?.()
      return
    }

    // ⌘S — Save current tab
    if (meta && !shift && key === 's') {
      e.preventDefault()
      if (editor.activeTabId) editor.saveTab(editor.activeTabId)
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

    // ⌘R — Refresh schema
    if (meta && !shift && key === 'r') {
      e.preventDefault()
      schema.refreshSchema()
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
      ui.inspectorOpen ? ui.closeInspector() : ui.openInspector(schema.activeTable ?? 'users')
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

    // Esc — Close any open overlay
    if (key === 'Escape') {
      if (ui.paletteOpen) { ui.closePalette(); return }
      if (ui.inspectorOpen) { ui.closeInspector(); return }
      if (ui.connectionManagerOpen) { ui.closeConnectionManager(); return }
    }
  }

  onMounted(() => document.addEventListener('keydown', handler))
  onUnmounted(() => document.removeEventListener('keydown', handler))
}
