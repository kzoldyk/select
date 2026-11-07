import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import QueryEditor from '../QueryEditor.vue'
import { useEditorStore } from '../../stores/editor'
import { ensureSyntaxTree } from '@codemirror/language'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

describe('QueryEditor.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('mounts in SQL mode by default', async () => {
    const editorStore = useEditorStore()
    const wrapper = mount(QueryEditor)

    await wrapper.vm.$nextTick()
    const cmEditor = wrapper.find('.cm-editor')
    expect(cmEditor.exists()).toBe(true)
    expect(cmEditor.classes()).not.toContain('cm-notebook-mode')

    editorStore.updateSql(editorStore.activeTabId, 'SELECT 1;')
    await wrapper.vm.$nextTick()
    const exposed = wrapper.vm as any
    // extractRunnableSql extracts the statement at cursor (without trailing semicolon)
    expect(exposed.getCurrentSql()).toBe('SELECT 1')
  })

  it('switches to notebook mode with cm-notebook-mode class and extracts SQL when cursor in fence', async () => {
    const editorStore = useEditorStore()
    const content = '# Test Notes\n\n```sql\nSELECT 99;\n```'
    const sqlPos = content.indexOf('SELECT 99')
    const tabId = editorStore.addNotebookTab(content)
    editorStore.selectTab(tabId)
    editorStore.updateCursorAndSelection(tabId, 4, 1, sqlPos, sqlPos)

    const wrapper = mount(QueryEditor)
    await wrapper.vm.$nextTick()

    const cmEditor = wrapper.find('.cm-editor')
    expect(cmEditor.exists()).toBe(true)
    expect(cmEditor.classes()).toContain('cm-notebook-mode')

    const exposed = wrapper.vm as any
    // Cursor is inside SQL fence -> extracts runnable SQL
    expect(exposed.getCurrentSql()).toBe('SELECT 99')
  })

  it('activates notebook format when tab is converted to notebook', async () => {
    const editorStore = useEditorStore()
    const wrapper = mount(QueryEditor)
    await wrapper.vm.$nextTick()

    const cmEditor = wrapper.find('.cm-editor')
    expect(cmEditor.classes()).not.toContain('cm-notebook-mode')

    // Tab is converted to notebook mode
    const content = '# Analysis Notes\n- [ ] Check index\nSELECT 42;'
    editorStore.updateSql(editorStore.activeTabId, content)
    editorStore.convertTabToNotebook(editorStore.activeTabId)
    await wrapper.vm.$nextTick()

    // Query tab activates notebook mode!
    expect(cmEditor.classes()).toContain('cm-notebook-mode')
    expect(editorStore.activeTab?.format).toBe('notebook')

    // And SQL statement can still be extracted and run when cursor is on it
    const exposed = wrapper.vm as any
    const sqlPos = content.indexOf('SELECT 42')
    const cmView = (wrapper.vm as any).$.setupState.view
    cmView.dispatch({ selection: { anchor: sqlPos, head: sqlPos } })

    expect(exposed.getCurrentSql()).toContain('SELECT 42')
  })

  it('preserves SQL mode when user writes multi-line queries with MySQL # comments', async () => {
    const editorStore = useEditorStore()
    const wrapper = mount(QueryEditor)
    await wrapper.vm.$nextTick()

    const cmEditor = wrapper.find('.cm-editor')
    expect(cmEditor.classes()).not.toContain('cm-notebook-mode')

    // Multi-line query ending with # comment (exact user scenario)
    const sqlDoc = `SELECT
  u.id,
  u.name,
  w.name
FROM users u
LEFT JOIN warehouses w ON w.id = u.warehouse_id
WHERE u.active = 1
ORDER BY u.id DESC
LIMIT 10;
#`
    editorStore.updateSql(editorStore.activeTabId, sqlDoc)
    await wrapper.vm.$nextTick()

    // Must NOT flip to notebook mode!
    expect(cmEditor.classes()).not.toContain('cm-notebook-mode')
    expect(editorStore.activeTab?.format).toBe('sql')

    const exposed = wrapper.vm as any
    expect(exposed.getCurrentSql()).toContain('SELECT')
  })

  it('always renders line numbers gutter across all modes', async () => {
    const editorStore = useEditorStore()
    const wrapper = mount(QueryEditor)
    await wrapper.vm.$nextTick()

    // In SQL mode
    expect(wrapper.find('.cm-lineNumbers').exists()).toBe(true)

    // In Notebook mode
    const tabId = editorStore.addNotebookTab('# Notes\n```sql\nSELECT 1;\n```')
    editorStore.selectTab(tabId)
    await wrapper.vm.$nextTick()

    // Line numbers must still be present!
    expect(wrapper.find('.cm-lineNumbers').exists()).toBe(true)
  })

  it('parses raw SQL blocks inside notebook mode using native SQL parser via parseMixed', async () => {
    const editorStore = useEditorStore()
    const tabId = editorStore.addNotebookTab('# Analysis Notes\n\nSELECT id, name FROM users WHERE active = 1;\n\n- [ ] Follow up')
    editorStore.selectTab(tabId)

    const wrapper = mount(QueryEditor)
    await wrapper.vm.$nextTick()

    const cmView = (wrapper.vm as any).$.setupState.view
    const tree = ensureSyntaxTree(cmView.state, cmView.state.doc.length, 2000) || cmView.state.tree

    const nodeNames: string[] = []
    tree.iterate({
      enter(node: any) {
        nodeNames.push(node.name)
      }
    })

    // Contains both Markdown nodes and native SQL AST nodes without any triple backticks!
    expect(nodeNames).toContain('ATXHeading1')
    expect(nodeNames).toContain('Keyword')
    expect(nodeNames).toContain('Identifier')
    expect(nodeNames).toContain('Task')
  })

  it('guards against ghost shift-click on mousedown so single click places cursor without extending selection', async () => {
    const editorStore = useEditorStore()
    const content = 'SELECT 1;\nSELECT 2;\nSELECT 3;\n'
    editorStore.updateSql(editorStore.activeTabId, content)

    const wrapper = mount(QueryEditor)
    await wrapper.vm.$nextTick()

    const cmView = (wrapper.vm as any).$.setupState.view
    // Start with cursor at position 0
    cmView.dispatch({ selection: { anchor: 0, head: 0 } })
    vi.spyOn(cmView, 'posAtCoords').mockReturnValue(10)

    // Simulate ghost shift click (shiftKey true in event, but Shift key was never physically held down)
    const contentDOM = cmView.contentDOM
    const event = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      button: 0,
      detail: 1,
      shiftKey: true,
      clientX: 50,
      clientY: 30,
    })

    contentDOM.dispatchEvent(event)
    await wrapper.vm.$nextTick()

    // Selection must remain collapsed (a single point), not a massive range selection
    expect(cmView.state.selection.main.empty).toBe(true)
    expect(cmView.state.selection.main.head).toBe(10)
  })
})
