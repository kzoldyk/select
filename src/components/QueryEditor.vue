<template>
  <div class="flex flex-col overflow-hidden bg-background min-h-0 flex-1">
    <TabBar />

    <div class="flex items-center justify-between h-7 px-2 bg-muted/30 border-b border-border flex-shrink-0">
      <div class="flex gap-1">
        <Button variant="ghost" size="sm" class="text-[10px] h-5 px-2 gap-1" @click="formatSql">
          <FileText class="w-3 h-3" /> Format
        </Button>
        <Button variant="ghost" size="sm" class="text-[10px] h-5 px-2 gap-1" @click="$emit('explain')">
          <Search class="w-3 h-3" /> Explain
        </Button>
      </div>
      <div class="flex items-center gap-1.5">
        <Kbd class="text-[9px]">&#8984;&#8629;</Kbd>
        <span class="text-[9px] text-muted-foreground">Run</span>
        <Kbd class="text-[9px]">&#8984;S</Kbd>
        <span class="text-[9px] text-muted-foreground">Save</span>
        <Kbd class="text-[9px]">&#8984;/</Kbd>
        <span class="text-[9px] text-muted-foreground">Comment</span>
        <Kbd class="text-[9px]">&#8984;&#8679;F</Kbd>
        <span class="text-[9px] text-muted-foreground">Format</span>
      </div>
    </div>

    <div class="flex-1 overflow-hidden" ref="editorContainer"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, shallowRef } from 'vue'
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { sql, MySQL, StandardSQL } from '@codemirror/lang-sql'
import { defaultKeymap, historyKeymap, history, indentWithTab } from '@codemirror/commands'
import { syntaxHighlighting } from '@codemirror/language'
import { autocompletion, closeBrackets } from '@codemirror/autocomplete'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { bracketMatching, indentOnInput } from '@codemirror/language'
import { darkTheme, sqlHighlight } from '../editor/sqlTheme'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { FileText, Search } from '@lucide/vue'
import { useEditorStore } from '../stores/editor'
import { useConnectionStore } from '../stores/connection'
import { useSchemaStore } from '../stores/schema'
import TabBar from './TabBar.vue'

const emit = defineEmits<{ explain: []; run: [sql?: string] }>()

const editorStore = useEditorStore()
const connStore = useConnectionStore()
const schemaStore = useSchemaStore()
const editorContainer = ref<HTMLDivElement | null>(null)
const view = shallowRef<EditorView | null>(null)

function getSqlAutocomplete() {
  const keywords = ['SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT JOIN', 'INNER JOIN', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET', 'SHOW', 'DESCRIBE', 'EXPLAIN', 'WITH', 'COUNT', 'SUM', 'MAX', 'MIN', 'AVG', 'COALESCE', 'DISTINCT', 'AS', 'ON', 'AND', 'OR', 'NOT', 'IN', 'IS NULL', 'IS NOT NULL', 'LIKE', 'BETWEEN', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END']

  return autocompletion({
    override: [
      (context) => {
        const word = context.matchBefore(/\w+/)
        if (!word || (word.from === word.to && !context.explicit)) return null
        const q = word.text.toLowerCase()
        const tables = [...schemaStore.tables, ...schemaStore.views].map(item => item.name)
        const columns = schemaStore.tableDetails?.columns.map(col => col.name) ?? []
        const options = [
          ...tables.filter(t => t.toLowerCase().startsWith(q)).map(t => ({ label: t, type: 'type', detail: 'table' })),
          ...columns.filter(c => c.toLowerCase().startsWith(q)).map(c => ({ label: c, type: 'property', detail: 'column' })),
          ...keywords.filter(k => k.toLowerCase().startsWith(q)).map(k => ({ label: k, type: 'keyword', apply: `${k} ` })),
        ]
        return { from: word.from, options: options.slice(0, 8) }
      },
    ],
    activateOnTyping: true,
  })
}

function selectedSql(editorView: EditorView): string {
  const selection = editorView.state.selection.main
  if (selection.empty) return editorView.state.doc.toString()
  return editorView.state.sliceDoc(selection.from, selection.to)
}

function buildExtensions(onUpdate: (sql: string) => void, onRun: (sql?: string) => void) {
  const activeConn = connStore.activeConnection
	  const dialect = activeConn?.dbType === 'mysql' || activeConn?.dbType === 'mariadb'
	    ? MySQL
	    : StandardSQL

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
	      { key: 'Mod-Shift-Enter', run: (editorView) => { onRun(selectedSql(editorView)); return true } },
	      { key: 'Mod-Enter', run: () => { onRun(); return true } },
      { key: 'Mod-s', run: () => { if (editorStore.activeTabId) { editorStore.saveTab(editorStore.activeTabId); return true } return false } },
    ]),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) { onUpdate(update.state.doc.toString()) }
      if (update.selectionSet) {
        const sel = update.state.selection.main.head
        const line = update.state.doc.lineAt(sel)
        editorStore.updateCursor(editorStore.activeTabId, line.number, sel - line.from + 1)
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
  const current = view.value?.state.doc.toString() ?? ''
  const keywords = ['SELECT', 'FROM', 'LEFT JOIN', 'INNER JOIN', 'RIGHT JOIN', 'JOIN', 'WHERE', 'GROUP BY', 'HAVING', 'ORDER BY', 'LIMIT', 'OFFSET', 'AND', 'OR']
  let formatted = current
  keywords.forEach(kw => { formatted = formatted.replace(new RegExp(`\\b${kw}\\b`, 'gi'), `\n${kw}`) })
  formatted = formatted.trim()
  if (view.value) {
    view.value.dispatch({ changes: { from: 0, to: view.value.state.doc.length, insert: formatted } })
  }
}

watch(() => editorStore.activeTabId, (newId) => {
  const tab = editorStore.tabs.find(t => t.id === newId)
  if (!tab || !view.value) return
  const currentDoc = view.value.state.doc.toString()
  if (currentDoc !== tab.sql) {
    view.value.dispatch({ changes: { from: 0, to: view.value.state.doc.length, insert: tab.sql } })
  }
})

onMounted(initEditor)
onUnmounted(() => view.value?.destroy())

defineExpose({ formatSql })
</script>

<style scoped>
:deep(.cm-editor) { height: 100%; }
:deep(.cm-scroller) { height: 100%; overflow: auto; }
:deep(.cm-content) { font-size: 12px; font-family: 'JetBrains Mono', monospace; }
</style>
