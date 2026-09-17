import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { EditorState } from '@codemirror/state'
import { CompletionContext } from '@codemirror/autocomplete'
import QueryEditor from '../QueryEditor.vue'
import { useEditorStore } from '../../stores/editor'
import { notebookSlashCommands } from '../../editor/notebookCommands'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

describe('QueryEditor Toolbar & Formatting (Small to Complex)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  // ─────────────────────────────────────────────────────────────
  // 1. SMALL TESTS: Toolbar Rendering & Individual Actions
  // ─────────────────────────────────────────────────────────────
  describe('Small Tests: Toolbar Rendering & Individual Actions', () => {
    it('hides toolbar on pure SQL tab and shows formatting toolbar on notebook tab', async () => {
      const editorStore = useEditorStore()
      const wrapper = mount(QueryEditor)
      await wrapper.vm.$nextTick()

      // 1. Pure SQL tab: Toolbar must NOT exist
      expect(wrapper.find('[role="toolbar"]').exists()).toBe(false)

      // 2. Add and switch to a Notebook tab: Toolbar MUST exist
      const noteTabId = editorStore.addNotebookTab('# Notes')
      editorStore.selectTab(noteTabId)
      await wrapper.vm.$nextTick()

      const toolbar = wrapper.find('[role="toolbar"]')
      expect(toolbar.exists()).toBe(true)

      // Verify all buttons exist with accessible aria-labels
      expect(wrapper.find('button[aria-label="Insert task checkbox"]').exists()).toBe(true)
      expect(wrapper.find('button[aria-label="Insert Heading 1"]').exists()).toBe(true)
      expect(wrapper.find('button[aria-label="Insert Heading 2"]').exists()).toBe(true)
      expect(wrapper.find('button[aria-label="Insert bullet list"]').exists()).toBe(true)
      expect(wrapper.find('button[aria-label="Insert SQL query block"]').exists()).toBe(true)
      expect(wrapper.find('button[aria-label="Insert horizontal divider"]').exists()).toBe(true)

      // Notebook mode indicator should show "Notes & SQL"
      expect(toolbar.text()).toContain('Notes & SQL')
    })

    it('toggleTaskCheckbox inserts, prepends, converts from bullet, and toggles off', async () => {
      const wrapper = mount(QueryEditor)
      await wrapper.vm.$nextTick()
      const exposed = wrapper.vm as any
      const cmView = (wrapper.vm as any).$.setupState.view

      // 1. Insert on empty document
      exposed.toggleTaskCheckbox()
      expect(cmView.state.doc.toString()).toBe('- [ ] ')

      // 2. Clear doc and test prepending to plain text
      cmView.dispatch({ changes: { from: 0, to: cmView.state.doc.length, insert: 'Review audit logs' } })
      cmView.dispatch({ selection: { anchor: 5, head: 5 } })
      exposed.toggleTaskCheckbox()
      expect(cmView.state.doc.toString()).toBe('- [ ] Review audit logs')

      // 3. Toggling when already a task checkbox removes it
      exposed.toggleTaskCheckbox()
      expect(cmView.state.doc.toString()).toBe('Review audit logs')

      // 4. Converting a bullet "- item" into a task checkbox
      cmView.dispatch({ changes: { from: 0, to: cmView.state.doc.length, insert: '- Quick note' } })
      cmView.dispatch({ selection: { anchor: 4, head: 4 } })
      exposed.toggleTaskCheckbox()
      expect(cmView.state.doc.toString()).toBe('- [ ] Quick note')
    })

    it('toggleHeading inserts H1/H2, updates level, and toggles off', async () => {
      const wrapper = mount(QueryEditor)
      await wrapper.vm.$nextTick()
      const exposed = wrapper.vm as any
      const cmView = (wrapper.vm as any).$.setupState.view

      // 1. Insert H1 on empty doc
      exposed.toggleHeading(1)
      expect(cmView.state.doc.toString()).toBe('# ')

      // 2. Clicking H1 again toggles it off
      exposed.toggleHeading(1)
      expect(cmView.state.doc.toString()).toBe('')

      // 3. Prepend H1 to existing text
      cmView.dispatch({ changes: { from: 0, to: 0, insert: 'Database Overview' } })
      exposed.toggleHeading(1)
      expect(cmView.state.doc.toString()).toBe('# Database Overview')

      // 4. Change level from H1 to H2
      exposed.toggleHeading(2)
      expect(cmView.state.doc.toString()).toBe('## Database Overview')

      // 5. Clicking H2 again toggles it off
      exposed.toggleHeading(2)
      expect(cmView.state.doc.toString()).toBe('Database Overview')
    })

    it('toggleBulletList inserts bullet and toggles off', async () => {
      const wrapper = mount(QueryEditor)
      await wrapper.vm.$nextTick()
      const exposed = wrapper.vm as any
      const cmView = (wrapper.vm as any).$.setupState.view

      exposed.toggleBulletList()
      expect(cmView.state.doc.toString()).toBe('- ')

      exposed.toggleBulletList()
      expect(cmView.state.doc.toString()).toBe('')

      cmView.dispatch({ changes: { from: 0, to: 0, insert: 'First item' } })
      exposed.toggleBulletList()
      expect(cmView.state.doc.toString()).toBe('- First item')
    })

    it('insertSqlBlock inserts runnable SQL template', async () => {
      const wrapper = mount(QueryEditor)
      await wrapper.vm.$nextTick()
      const exposed = wrapper.vm as any
      const cmView = (wrapper.vm as any).$.setupState.view

      exposed.insertSqlBlock()
      const text = cmView.state.doc.toString()
      expect(text).toContain('SELECT *')
      expect(text).toContain('FROM')
      expect(text).toContain('LIMIT 10;')
    })

    it('insertDivider inserts horizontal divider markdown', async () => {
      const wrapper = mount(QueryEditor)
      await wrapper.vm.$nextTick()
      const exposed = wrapper.vm as any
      const cmView = (wrapper.vm as any).$.setupState.view

      exposed.insertDivider()
      expect(cmView.state.doc.toString()).toContain('---')
    })
  })

  // ─────────────────────────────────────────────────────────────
  // 2. MEDIUM TESTS: UI Click Interactions & Mode Auto-Switching
  // ─────────────────────────────────────────────────────────────
  describe('Medium Tests: UI Button Clicks & Mode Adaptation', () => {
    it('clicking Task button in UI updates document and activates Notes & SQL badge', async () => {
      const editorStore = useEditorStore()
      const tabId = editorStore.addNotebookTab('')
      editorStore.selectTab(tabId)

      const wrapper = mount(QueryEditor)
      await wrapper.vm.$nextTick()

      const taskBtn = wrapper.find('button[aria-label="Insert task checkbox"]')
      await taskBtn.trigger('click')
      await wrapper.vm.$nextTick()

      const cmView = (wrapper.vm as any).$.setupState.view
      expect(cmView.state.doc.toString()).toBe('- [ ] ')

      const toolbar = wrapper.find('[role="toolbar"]')
      expect(toolbar.text()).toContain('Notes & SQL')
    })

    it('clicking Heading 1 button in UI formats heading on text line', async () => {
      const editorStore = useEditorStore()
      const tabId = editorStore.addNotebookTab('System Status')
      editorStore.selectTab(tabId)

      const wrapper = mount(QueryEditor)
      await wrapper.vm.$nextTick()

      const h1Btn = wrapper.find('button[aria-label="Insert Heading 1"]')
      await h1Btn.trigger('click')
      await wrapper.vm.$nextTick()

      const cmView = (wrapper.vm as any).$.setupState.view
      expect(cmView.state.doc.toString()).toBe('# System Status')
    })

    it('clicking SQL Block button appends runnable query block below text', async () => {
      const editorStore = useEditorStore()
      const tabId = editorStore.addNotebookTab('# Notes')
      editorStore.selectTab(tabId)

      const wrapper = mount(QueryEditor)
      await wrapper.vm.$nextTick()

      const sqlBtn = wrapper.find('button[aria-label="Insert SQL query block"]')
      await sqlBtn.trigger('click')
      await wrapper.vm.$nextTick()

      const cmView = (wrapper.vm as any).$.setupState.view
      const text = cmView.state.doc.toString()
      expect(text).toContain('# Notes')
      expect(text).toContain('SELECT *')
      expect(text).toContain('FROM')
    })

    it('interactive task checkbox click in DOM toggles between [ ] and [x]', async () => {
      const editorStore = useEditorStore()
      const tabId = editorStore.addNotebookTab('- [ ] Run table backup')
      editorStore.selectTab(tabId)

      const wrapper = mount(QueryEditor)
      await wrapper.vm.$nextTick()

      const checkbox = wrapper.find('.cm-nb-task-checkbox')
      expect(checkbox.exists()).toBe(true)
      expect(checkbox.classes()).not.toContain('cm-nb-task-checkbox--checked')

      // Click to toggle checked
      await checkbox.trigger('click')
      await wrapper.vm.$nextTick()

      const cmView = (wrapper.vm as any).$.setupState.view
      expect(cmView.state.doc.toString()).toBe('- [x] Run table backup')

      // Click again to uncheck
      const checkedCheckbox = wrapper.find('.cm-nb-task-checkbox')
      await checkedCheckbox.trigger('click')
      await wrapper.vm.$nextTick()

      expect(cmView.state.doc.toString()).toBe('- [ ] Run table backup')
    })
  })

  // ─────────────────────────────────────────────────────────────
  // 3. BIG & COMPLEX TESTS: Full Workflows, Multi-blocks & Execution
  // ─────────────────────────────────────────────────────────────
  describe('Big & Complex Tests: Full Workflows, Formats & SQL Execution', () => {
    it('handles complex mixed notebook with headings, tasks, CTE query, and extracts runnable SQL', async () => {
      const editorStore = useEditorStore()
      const complexDoc = `# Performance Investigation 2026

- [ ] Check active connections
- [x] Verified replicas are in sync

WITH active_users AS (
  SELECT id, email, warehouse_id
  FROM users
  WHERE active = 1
)
SELECT
  w.id AS warehouse_id,
  w.name AS warehouse_name,
  count(u.id) AS total_active_users
FROM warehouses w
LEFT JOIN active_users u ON u.warehouse_id = w.id
GROUP BY w.id, w.name
ORDER BY total_active_users DESC
LIMIT 20;

## Follow-up Action
- Schedule index creation on \`users(active, warehouse_id)\`

SELECT * FROM audit_logs ORDER BY id DESC LIMIT 5;`

      const tabId = editorStore.addNotebookTab(complexDoc)
      editorStore.selectTab(tabId)

      const wrapper = mount(QueryEditor)
      await wrapper.vm.$nextTick()
      const exposed = wrapper.vm as any
      const cmView = (wrapper.vm as any).$.setupState.view

      // 1. AST Verification: Lezer SQL parses CTE and SQL without fences
      const nodeNames: string[] = []
      cmView.state.tree.iterate({
        enter(node: any) {
          nodeNames.push(node.name)
        }
      })
      expect(nodeNames).toContain('ATXHeading1')
      expect(nodeNames).toContain('ATXHeading2')
      expect(nodeNames).toContain('Task')
      expect(nodeNames).toContain('Keyword')
      expect(nodeNames).toContain('Identifier')

      // 2. Cursor in CTE query extracts the full CTE statement
      const ctePos = complexDoc.indexOf('active_users AS')
      cmView.dispatch({ selection: { anchor: ctePos, head: ctePos } })
      const extractedCte = exposed.getCurrentSql()
      expect(extractedCte).toContain('WITH active_users AS')
      expect(extractedCte).toContain('LIMIT 20')

      // 3. Cursor on second query extracts the second query
      const secondPos = complexDoc.indexOf('audit_logs')
      cmView.dispatch({ selection: { anchor: secondPos, head: secondPos } })
      const extractedSecond = exposed.getCurrentSql()
      expect(extractedSecond).toBe('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 5')

      // 4. Cursor on a heading gracefully extracts the nearest runnable SQL statement
      const headingPos = complexDoc.indexOf('Performance Investigation')
      cmView.dispatch({ selection: { anchor: headingPos, head: headingPos } })
      const extractedNearHeading = exposed.getCurrentSql()
      expect(extractedNearHeading).toBeTruthy()
      expect(extractedNearHeading).toContain('SELECT')
    })

    it('formatSql formats target SQL query without corrupting markdown notes around it', async () => {
      const editorStore = useEditorStore()
      const docWithUnformattedSql = `# Daily Report Notes
- [ ] Check revenue

select id,name,amount from orders where status='paid' and amount>100 order by id desc limit 10;

## Next Steps
Note down findings.`

      const tabId = editorStore.addNotebookTab(docWithUnformattedSql)
      editorStore.selectTab(tabId)

      const wrapper = mount(QueryEditor)
      await wrapper.vm.$nextTick()
      const exposed = wrapper.vm as any
      const cmView = (wrapper.vm as any).$.setupState.view

      // Place cursor inside the unformatted SQL
      const sqlPos = docWithUnformattedSql.indexOf('select id,name')
      cmView.dispatch({ selection: { anchor: sqlPos, head: sqlPos } })

      // Run formatSql
      exposed.formatSql()
      await wrapper.vm.$nextTick()

      const formattedDoc = cmView.state.doc.toString()

      // Headings and tasks must be 100% intact
      expect(formattedDoc).toContain('# Daily Report Notes')
      expect(formattedDoc).toContain('- [ ] Check revenue')
      expect(formattedDoc).toContain('## Next Steps')

      // SQL query is cleanly formatted with uppercase keywords
      expect(formattedDoc).toContain('SELECT')
      expect(formattedDoc).toContain('FROM')
      expect(formattedDoc).toContain('WHERE')
      expect(formattedDoc).toContain('ORDER BY')
    })

    it('switching between pure SQL tab and hybrid Notes tab preserves isolated states', async () => {
      const editorStore = useEditorStore()

      // Tab 1: Pure SQL with MySQL # comment
      const sqlTabId = editorStore.addTab('SELECT 100;\n# Pure SQL comment\nSELECT 200;')
      // Tab 2: Hybrid Notebook tab
      const noteTabId = editorStore.addNotebookTab('# Notes\n- [ ] Task 1\nSELECT 300;')

      editorStore.selectTab(sqlTabId)
      const wrapper = mount(QueryEditor)
      await wrapper.vm.$nextTick()

      const cmEditor = wrapper.find('.cm-editor')
      expect(cmEditor.classes()).not.toContain('cm-notebook-mode')
      // Pure SQL tab has NO formatting toolbar
      expect(wrapper.find('[role="toolbar"]').exists()).toBe(false)

      // Switch to Notebook tab
      editorStore.selectTab(noteTabId)
      await wrapper.vm.$nextTick()
      await new Promise(r => setTimeout(r, 20))
      await wrapper.vm.$nextTick()

      expect(cmEditor.classes()).toContain('cm-notebook-mode')
      expect(wrapper.find('[role="toolbar"]').text()).toContain('Notes & SQL')

      // Switch back to SQL tab
      editorStore.selectTab(sqlTabId)
      await wrapper.vm.$nextTick()
      await new Promise(r => setTimeout(r, 20))
      await wrapper.vm.$nextTick()

      expect(cmEditor.classes()).not.toContain('cm-notebook-mode')
      expect(wrapper.find('[role="toolbar"]').exists()).toBe(false)
    })
  })

  // ─────────────────────────────────────────────────────────────
  // 4. NOTION-STYLE SLASH COMMANDS TESTS
  // ─────────────────────────────────────────────────────────────
  describe('Notion-style Slash Commands (/sql, /task, /list, etc.)', () => {
    function createContext(doc: string, pos?: number): CompletionContext {
      const state = EditorState.create({ doc })
      const cursorPos = pos ?? doc.length
      return new CompletionContext(state, cursorPos, false)
    }

    it('returns null in pure SQL mode', () => {
      const context = createContext('/sql')
      expect(notebookSlashCommands(context, 'sql')).toBeNull()
    })

    it('returns null when slash is not at start of line', () => {
      const context = createContext('Check this out /sql')
      expect(notebookSlashCommands(context, 'notebook')).toBeNull()
    })

    it('lists all Notion commands when typing / on empty line', () => {
      const context = createContext('/')
      const res = notebookSlashCommands(context, 'notebook')
      expect(res).not.toBeNull()
      const labels = res!.options.map(o => o.label)
      expect(labels).toContain('/sql')
      expect(labels).toContain('/query')
      expect(labels).toContain('/todo')
      expect(labels).toContain('/task')
      expect(labels).toContain('/bullet')
      expect(labels).toContain('/list')
      expect(labels).toContain('/numbered')
      expect(labels).toContain('/h1')
      expect(labels).toContain('/h2')
      expect(labels).toContain('/h3')
      expect(labels).toContain('/quote')
      expect(labels).toContain('/divider')
    })

    it('filters commands as user types search prefix', () => {
      const context = createContext('/sq')
      const res = notebookSlashCommands(context, 'notebook')
      expect(res).not.toBeNull()
      const labels = res!.options.map(o => o.label)
      expect(labels).toContain('/sql')
      expect(labels).not.toContain('/todo')
    })

    it('executes /sql insertion with cursor placed inside the fenced block', () => {
      const context = createContext('/sql')
      const res = notebookSlashCommands(context, 'notebook')
      const sqlOption = res!.options.find(o => o.label === '/sql')!

      let changes: any = null
      let selection: any = null
      const fakeView = {
        dispatch: (opts: any) => {
          changes = opts.changes
          selection = opts.selection
        },
      }

      sqlOption.apply(fakeView, null, 0, 4)
      expect(changes.insert).toBe('```sql\n\n```\n')
      expect(selection.anchor).toBe(7)
    })
  })
})
