import { onMounted, onUnmounted } from 'vue'
import { useEditorStore } from '../stores/editor'
import { useUiStore } from '../stores/ui'
import { useResultStore } from '../stores/result'
import { useSchemaStore } from '../stores/schema'
import { useConnectionStore } from '../stores/connection'

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
    const key = e.key
    const target = e.target as HTMLElement | null
    const isTyping =
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      target?.isContentEditable

    if (isTyping && key !== 'Escape') return

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

    // ⌘R — Refresh schema
    if (meta && !shift && key === 'r') {
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

    // Esc — Close the topmost open overlay
    if (key === 'Escape') {
      if (editor.saveDialogOpen) { editor.saveDialogOpen = false; return }
      if (ui.connectionManagerOpen) { ui.closeConnectionManager(); return }
      if (ui.inspectorOpen) { ui.closeInspector(); return }
      if (ui.paletteOpen) { ui.closePalette(); return }
    }
  }

  onMounted(() => document.addEventListener('keydown', handler))
  onUnmounted(() => document.removeEventListener('keydown', handler))
}
