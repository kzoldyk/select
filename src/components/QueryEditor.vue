<template>
  <div class="flex flex-col overflow-hidden bg-background min-h-0 flex-1">
    <TabBar />

    <div class="flex items-center justify-between h-9 px-3 bg-background border-b border-border flex-shrink-0">
      <div class="flex gap-1">
        <Button variant="ghost" size="sm" class="text-[11px] h-6 px-2.5 gap-1.5 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors" @click="formatSql">
          <FileText class="w-3.5 h-3.5 opacity-70" /> Format
        </Button>
        <Button variant="ghost" size="sm" class="text-[11px] h-6 px-2.5 gap-1.5 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors" @click="$emit('explain')">
          <Search class="w-3.5 h-3.5 opacity-70" /> Explain
        </Button>
      </div>
      <div class="flex items-center gap-4 opacity-50">
        <div class="flex items-center gap-1">
          <Kbd class="text-[9px] bg-transparent border-none shadow-none px-0.5">⌘↵</Kbd>
          <span class="text-[10px] font-medium text-muted-foreground">Run</span>
        </div>
        <div class="flex items-center gap-1">
          <Kbd class="text-[9px] bg-transparent border-none shadow-none px-0.5">⌘S</Kbd>
          <span class="text-[10px] font-medium text-muted-foreground">Save</span>
        </div>
        <div class="flex items-center gap-1">
          <Kbd class="text-[9px] bg-transparent border-none shadow-none px-0.5">⌘/</Kbd>
          <span class="text-[10px] font-medium text-muted-foreground">Comment</span>
        </div>
        <div class="flex items-center gap-1">
          <Kbd class="text-[9px] bg-transparent border-none shadow-none px-0.5">⇧⌘F</Kbd>
          <span class="text-[10px] font-medium text-muted-foreground">Format</span>
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-hidden" ref="editorContainer"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, shallowRef, nextTick } from 'vue'
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
import { format } from 'sql-formatter'
import { useEditorStore } from '../stores/editor'
import { useConnectionStore } from '../stores/connection'
import { useSchemaStore } from '../stores/schema'
import { useUiStore } from '../stores/ui'
import TabBar from './TabBar.vue'

const emit = defineEmits<{ explain: []; run: [sql?: string] }>()

const editorStore = useEditorStore()
const connStore = useConnectionStore()
const schemaStore = useSchemaStore()
const uiStore = useUiStore()
const editorContainer = ref<HTMLDivElement | null>(null)
const view = shallowRef<EditorView | null>(null)

function collectColumns(): { name: string; table: string; type: string }[] {
  const result: { name: string; table: string; type: string }[] = []
  for (const [tableName, details] of Object.entries(schemaStore.detailsByTable)) {
    for (const col of details.columns) {
      result.push({ name: col.name, table: tableName, type: col.columnType })
    }
  }
  return result
}

function getContext(sql: string, pos: number): { afterFrom: boolean; afterJoin: boolean; afterDot: boolean; dotPrefix: string } {
  const before = sql.slice(0, pos)
  const words = before.split(/[\s\n\r,()]+/).filter(Boolean)
  const lastWord = words[words.length - 1]?.toUpperCase() ?? ''
  const secondLast = words[words.length - 2]?.toUpperCase() ?? ''

  const afterFrom = ['FROM', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'CROSS', 'FULL', 'NATURAL', 'COMMA'].includes(lastWord)
  const afterJoin = lastWord === 'ON' || lastWord === 'USING'

  const delimiter = lastWord.endsWith('.')
  const dotPrefix = delimiter ? lastWord.slice(0, -1) : ''

  return { afterFrom, afterJoin, afterDot: delimiter, dotPrefix }
}

function getSqlAutocomplete() {
  const keywords = ['SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT JOIN', 'INNER JOIN', 'RIGHT JOIN', 'FULL JOIN', 'CROSS JOIN', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET', 'SHOW', 'DESCRIBE', 'EXPLAIN', 'WITH', 'COUNT', 'SUM', 'MAX', 'MIN', 'AVG', 'COALESCE', 'DISTINCT', 'AS', 'ON', 'AND', 'OR', 'NOT', 'IN', 'IS NULL', 'IS NOT NULL', 'LIKE', 'BETWEEN', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'TABLE', 'CREATE', 'ALTER', 'DROP', 'INDEX', 'KEY', 'PRIMARY', 'FOREIGN', 'REFERENCES', 'CASCADE', 'UNIQUE', 'CHECK', 'DEFAULT', 'NULL', 'NOT NULL', 'AUTO_INCREMENT', 'ENGINE']

  return autocompletion({
    override: [
      (context) => {
        const word = context.matchBefore(/\w+/)
        if (!word || (word.from === word.to && !context.explicit)) return null
        const q = word.text.toLowerCase()

        const doc = context.state.doc.toString()
        const ctx = getContext(doc, context.pos)

        if (ctx.afterDot) {
          const allCols = collectColumns()
          let matched: { name: string; table: string; type: string }[] = []
          for (const col of allCols) {
            if (col.table.toLowerCase() === ctx.dotPrefix.toLowerCase() || col.table.toLowerCase() === ctx.dotPrefix.toLowerCase()) {
              matched.push(col)
            }
          }
          if (matched.length === 0) {
            matched = allCols.filter(c => c.name.toLowerCase().startsWith(q))
          }
          return {
            from: word.from,
            options: matched.map(col => ({
              label: col.name,
              type: 'property',
              detail: `${col.type}  ·  ${col.table}`,
            })).slice(0, 20),
          }
        }

        const allCols = collectColumns()
        const tables = [...schemaStore.tables, ...schemaStore.views].map(item => item.name)

        const options: { label: string; type: string; detail: string; apply?: string }[] = []

        if (ctx.afterFrom || ctx.afterJoin) {
          options.push(...tables.filter(t => t.toLowerCase().startsWith(q)).map(t => ({
            label: t, type: 'type', detail: 'table', apply: `${t} `,
          })))
        } else {
          options.push(...tables.filter(t => t.toLowerCase().startsWith(q)).map(t => ({
            label: t, type: 'type', detail: 'table', apply: `${t} `,
          })))

          const seen = new Set<string>()
          for (const col of allCols) {
            if (col.name.toLowerCase().startsWith(q) && !seen.has(col.name)) {
              seen.add(col.name)
              options.push({ label: col.name, type: 'property', detail: `${col.type}  ·  ${col.table}` })
            }
          }
        }

        options.push(...keywords.filter(k => k.toLowerCase().startsWith(q)).map(k => ({
          label: k, type: 'keyword', apply: `${k} `,
        })))

        return { from: word.from, options: options.slice(0, 20) }
      },
    ],
    activateOnTyping: true,
    maxRenderedOptions: 20,
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
    uiStore.theme === 'dark' ? darkTheme : [],
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

function mountEditor() {
  if (!editorContainer.value) return
  view.value?.destroy()
  const activeTab = editorStore.activeTab
  const initialSql = activeTab?.sql ?? ''

  const state = EditorState.create({
    doc: initialSql,
    extensions: buildExtensions(
      (sql) => { if (editorStore.activeTabId) editorStore.updateSql(editorStore.activeTabId, sql) },
      (sql?: string) => emit('run', sql)
    ),
  })
  view.value = new EditorView({ state, parent: editorContainer.value })
}

function formatSql() {
  const current = view.value?.state.doc.toString() ?? ''
  if (!current.trim()) return
  try {
    const formatted = format(current, {
      language: 'mysql',
      tabWidth: 2,
      keywordCase: 'upper',
      linesBetweenQueries: 2,
    })
    if (view.value) {
      view.value.dispatch({ changes: { from: 0, to: view.value.state.doc.length, insert: formatted } })
    }
  } catch {
    // fallback: no formatting
  }
}

watch(() => editorStore.activeTabId, () => {
  nextTick(mountEditor)
})

watch(() => uiStore.theme, () => {
  nextTick(mountEditor)
})

onMounted(mountEditor)
onUnmounted(() => view.value?.destroy())

defineExpose({ formatSql })
</script>

<style scoped>
:deep(.cm-editor) { height: 100%; }
:deep(.cm-scroller) { height: 100%; overflow: auto; }
:deep(.cm-content) { font-size: 12px; font-family: 'JetBrains Mono', monospace; }
</style>
