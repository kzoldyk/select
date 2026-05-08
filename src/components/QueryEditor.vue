<template>
  <div class="editor-panel">
    <!-- Tab bar -->
    <TabBar />

    <!-- Action bar -->
    <div class="action-bar">
      <div class="action-left">
        <button class="ghost-btn action-btn" aria-label="Format SQL (⌘⇧F)" @click="formatSql">Format</button>
        <button class="ghost-btn action-btn" aria-label="Explain query" @click="$emit('explain')">Explain</button>
        <button class="ghost-btn action-btn" aria-label="Beautify SQL" @click="formatSql">Beautify</button>
      </div>
      <div class="action-right">
        <span class="kb-pill">⌘↵ Run</span>
        <span class="kb-pill">⌘S Save</span>
        <span class="kb-pill">⌘/ Comment</span>
        <span class="kb-pill">⌘Z Undo</span>
        <span class="kb-pill">⌘⇧F Format</span>
      </div>
    </div>

    <!-- CodeMirror editor -->
    <div class="editor-area" ref="editorContainer"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, shallowRef } from 'vue'
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { sql, PostgreSQL, MySQL, StandardSQL } from '@codemirror/lang-sql'
import { defaultKeymap, historyKeymap, history, indentWithTab } from '@codemirror/commands'
import { syntaxHighlighting } from '@codemirror/language'
import { autocompletion, closeBrackets } from '@codemirror/autocomplete'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { bracketMatching, indentOnInput } from '@codemirror/language'
import { darkTheme, sqlHighlight } from '../editor/sqlTheme'
import { useEditorStore } from '../stores/editor'
import { useConnectionStore } from '../stores/connection'
import TabBar from './TabBar.vue'

const emit = defineEmits<{ explain: []; run: [] }>()

const editorStore = useEditorStore()
const connStore = useConnectionStore()
const editorContainer = ref<HTMLDivElement | null>(null)
const view = shallowRef<EditorView | null>(null)

function getSqlAutocomplete() {
  const tables = ['users', 'orders', 'products', 'order_items', 'categories', 'payments', 'shipping', 'reviews']
  const columns = ['id', 'email', 'created_at', 'updated_at', 'status', 'user_id', 'order_id', 'total_amount', 'name', 'description']
  const keywords = ['SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT JOIN', 'INNER JOIN', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET', 'INSERT INTO', 'UPDATE', 'DELETE', 'CREATE TABLE', 'DROP TABLE', 'ALTER TABLE', 'COUNT', 'SUM', 'MAX', 'MIN', 'AVG', 'COALESCE', 'DISTINCT', 'AS', 'ON', 'AND', 'OR', 'NOT', 'IN', 'IS NULL', 'IS NOT NULL', 'LIKE', 'BETWEEN', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END']

  return autocompletion({
    override: [
      (context) => {
        const word = context.matchBefore(/\w+/)
        if (!word || (word.from === word.to && !context.explicit)) return null
        const q = word.text.toLowerCase()

        const options = [
          ...tables.filter(t => t.startsWith(q)).map(t => ({ label: t, type: 'type', detail: 'table' })),
          ...columns.filter(c => c.startsWith(q)).map(c => ({ label: c, type: 'property', detail: 'column' })),
          ...keywords.filter(k => k.toLowerCase().startsWith(q)).map(k => ({ label: k, type: 'keyword' })),
        ]

        return { from: word.from, options: options.slice(0, 8) }
      },
    ],
    activateOnTyping: true,
  })
}

function buildExtensions(onUpdate: (sql: string) => void, onRun: () => void) {
  const activeConn = connStore.activeConnection
  const dialect = activeConn?.dbType === 'mysql' ? MySQL :
                  activeConn?.dbType === 'postgres' ? PostgreSQL :
                  StandardSQL;

  return [
    history(),
    sql({ dialect }),
    syntaxHighlighting(sqlHighlight),
    darkTheme,
    lineNumbers(),
    highlightActiveLine(),
    bracketMatching(),
    closeBrackets(),
    indentOnInput(),
    highlightSelectionMatches(),
    getSqlAutocomplete(),
    keymap.of([
      ...defaultKeymap,
      ...historyKeymap,
      ...searchKeymap,
      indentWithTab,
      {
        key: 'Mod-Enter',
        run: () => { onRun(); return true },
      },
      {
        key: 'Mod-s',
        run: () => {
          if (editorStore.activeTabId) editorStore.saveTab(editorStore.activeTabId)
          return true
        },
      },
    ]),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onUpdate(update.state.doc.toString())
      }
      if (update.selectionSet) {
        const sel = update.state.selection.main.head
        const line = update.state.doc.lineAt(sel)
        editorStore.updateCursor(
          editorStore.activeTabId,
          line.number,
          sel - line.from + 1
        )
      }
    }),
  ]
}

function initEditor() {
  if (!editorContainer.value) return

  const activeTab = editorStore.activeTab
  const initialSql = activeTab?.sql ?? ''

  const state = EditorState.create({
    doc: initialSql,
    extensions: buildExtensions(
      (sql) => { if (editorStore.activeTabId) editorStore.updateSql(editorStore.activeTabId, sql) },
      () => emit('run')
    ),
  })

  view.value = new EditorView({ state, parent: editorContainer.value })
}

function formatSql() {
  // Basic SQL formatter stub
  const current = view.value?.state.doc.toString() ?? ''
  const keywords = ['SELECT', 'FROM', 'LEFT JOIN', 'INNER JOIN', 'RIGHT JOIN', 'JOIN', 'WHERE', 'GROUP BY', 'HAVING', 'ORDER BY', 'LIMIT', 'OFFSET', 'AND', 'OR']
  let formatted = current
  keywords.forEach(kw => {
    formatted = formatted.replace(new RegExp(`\\b${kw}\\b`, 'gi'), `\n${kw}`)
  })
  formatted = formatted.trim()
  if (view.value) {
    view.value.dispatch({
      changes: { from: 0, to: view.value.state.doc.length, insert: formatted },
    })
  }
}

// Watch active tab and reload editor content
watch(() => editorStore.activeTabId, (newId) => {
  const tab = editorStore.tabs.find(t => t.id === newId)
  if (!tab || !view.value) return
  const currentDoc = view.value.state.doc.toString()
  if (currentDoc !== tab.sql) {
    view.value.dispatch({
      changes: { from: 0, to: view.value.state.doc.length, insert: tab.sql },
    })
  }
})

onMounted(initEditor)
onUnmounted(() => view.value?.destroy())

// Expose for parent to trigger run
defineExpose({ formatSql })
</script>

<style scoped>
.editor-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg);
  min-height: 0;
}

.action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 28px;
  padding: 0 8px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  gap: 4px;
}
.action-left { display: flex; gap: 4px; }
.action-right { display: flex; align-items: center; gap: 4px; }
.action-btn { font-size: 10px; padding: 2px 7px; }

.editor-area {
  flex: 1;
  overflow: hidden;
  background: var(--bg);
  min-height: 0;
}

/* Override CodeMirror to fill container */
.editor-area :deep(.cm-editor) {
  height: 100%;
}
.editor-area :deep(.cm-scroller) {
  height: 100%;
  overflow: auto;
}
</style>
