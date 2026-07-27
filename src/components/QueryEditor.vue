<template>
  <div class="flex flex-col overflow-hidden bg-background min-h-0 flex-1">
    <TabBar @format="formatSql" @explain="$emit('explain')" />

    <div
      class="flex-1 overflow-hidden"
      ref="editorContainer"
      :style="{ '--editor-font-size': `${editorStore.fontSize}px` }"
      @wheel="onWheel"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, shallowRef, nextTick } from 'vue'
import {
  EditorView, keymap, lineNumbers, highlightActiveLine,
  drawSelection, dropCursor, rectangularSelection
} from '@codemirror/view'
import { EditorState, EditorSelection } from '@codemirror/state'
import { sql, MySQL, StandardSQL } from '@codemirror/lang-sql'
import { defaultKeymap, historyKeymap, history, indentWithTab, toggleComment } from '@codemirror/commands'
import { syntaxHighlighting } from '@codemirror/language'
import { autocompletion, closeBrackets, startCompletion } from '@codemirror/autocomplete'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { bracketMatching, indentOnInput } from '@codemirror/language'
import { dynamicTheme, dynamicHighlight } from '../editor/sqlTheme'
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

const tabStates = new Map<string, EditorState>()
const currentActiveTabId = ref<string | null>(null)

function onWheel(e: WheelEvent) {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault()
    if (e.deltaY < 0) {
      editorStore.zoomIn()
    } else if (e.deltaY > 0) {
      editorStore.zoomOut()
    }
  }
}

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
      async (context) => {
        const word = context.matchBefore(/\w*/)
        const isAfterDot = context.matchBefore(/\.\w*/) !== null
        if (!word || (word.from === word.to && !context.explicit && !isAfterDot)) return null
        const q = word.text.toLowerCase()

        const doc = context.state.doc.toString()
        const ctx = getContext(doc, word.from)

        if (ctx.afterDot) {
          const lowerPrefix = ctx.dotPrefix.toLowerCase()
          const isDatabase = schemaStore.databases.some(d => d.toLowerCase() === lowerPrefix)

          if (isDatabase) {
            const tables = await schemaStore.fetchTablesForSchema(ctx.dotPrefix)
            let matched = tables.filter(t => t.toLowerCase().startsWith(q))
            return {
              from: word.from,
              options: matched.map(t => ({
                label: t,
                type: 'type',
                detail: `table  ·  ${ctx.dotPrefix}`,
              })).slice(0, 20),
            }
          }

          const allCols = collectColumns()
          let matched: { name: string; table: string; type: string }[] = []
          for (const col of allCols) {
            if (col.table.toLowerCase() === lowerPrefix) {
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

        const options: { label: string; type: string; detail: string; apply?: string | ((view: EditorView, completion: any, from: number, to: number) => void) }[] = []

        options.push(...schemaStore.databases.filter(d => d.toLowerCase().startsWith(q)).map(d => ({
          label: d,
          type: 'namespace',
          detail: 'schema',
          apply: (view: EditorView, completion: any, from: number, to: number) => {
            view.dispatch({
              changes: { from, to, insert: `${d}.` },
            })
            setTimeout(() => startCompletion(view), 10)
          }
        })))

        if (ctx.afterFrom || ctx.afterJoin) {
          options.push(...tables.filter(t => t.toLowerCase().startsWith(q)).map(t => ({
            label: t, type: 'type', detail: 'table'
          })))
        } else {
          options.push(...tables.filter(t => t.toLowerCase().startsWith(q)).map(t => ({
            label: t, type: 'type', detail: 'table'
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

function getStatementAtCursor(sql: string, cursorPos: number): string {
  let inSingle = false
  let inDouble = false
  let inBacktick = false
  let inLineComment = false
  let inBlockComment = false

  let lastSemi = 0
  const statements: { start: number, end: number, text: string }[] = []

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i]
    const nextCh = sql[i + 1] || ''

    if (inLineComment) {
      if (ch === '\n') inLineComment = false
      continue
    }
    if (inBlockComment) {
      if (ch === '*' && nextCh === '/') {
        inBlockComment = false
        i++
      }
      continue
    }
    if (ch === '-' && nextCh === '-' && !inSingle && !inDouble && !inBacktick) {
      inLineComment = true
      i++
      continue
    }
    if (ch === '/' && nextCh === '*' && !inSingle && !inDouble && !inBacktick) {
      inBlockComment = true
      i++
      continue
    }
    if (ch === '\'' && !inDouble && !inBacktick) inSingle = !inSingle
    else if (ch === '"' && !inSingle && !inBacktick) inDouble = !inDouble
    else if (ch === '`') inBacktick = !inBacktick
    else if (ch === ';' && !inSingle && !inDouble && !inBacktick) {
      statements.push({ start: lastSemi, end: i + 1, text: sql.substring(lastSemi, i + 1) })
      lastSemi = i + 1
    }
  }

  if (lastSemi < sql.length) {
    statements.push({ start: lastSemi, end: sql.length, text: sql.substring(lastSemi) })
  }

  const cleaned: { start: number, end: number, text: string }[] = []
  for (const s of statements) {
    const match = s.text.match(/^(\s*)([\s\S]*?)(\s*)$/)
    if (!match || !match[2]) continue
    cleaned.push({
      start: s.start + match[1].length,
      end: s.end - match[3].length,
      text: match[2]
    })
  }

  if (cleaned.length === 0) return ''

  for (let i = 0; i < cleaned.length; i++) {
    const s = cleaned[i]
    if (cursorPos >= s.start && cursorPos <= s.end) {
      return s.text
    }
    if (i < cleaned.length - 1) {
      const nextS = cleaned[i + 1]
      if (cursorPos > s.end && cursorPos < nextS.start) {
        const whitespaceBeforeCursor = sql.substring(s.end, cursorPos)
        if (!whitespaceBeforeCursor.includes('\n')) {
          return s.text
        }
        return nextS.text
      }
    }
  }

  if (cursorPos >= cleaned[cleaned.length - 1].end) {
    return cleaned[cleaned.length - 1].text
  }
  if (cursorPos <= cleaned[0].start) {
    return cleaned[0].text
  }

  return ''
}

function selectedSql(editorView: EditorView): string {
  const selection = editorView.state.selection.main
  if (selection.empty) {
    const doc = editorView.state.doc.toString()
    const stmt = getStatementAtCursor(doc, selection.head)
    return stmt || doc
  }
  return editorView.state.sliceDoc(selection.from, selection.to)
}

function buildExtensions(onUpdate: (sql: string) => void, onRun: (sql?: string) => void) {
  const activeConn = connStore.activeConnection
  const dialect = activeConn?.dbType === 'mysql' || activeConn?.dbType === 'mariadb'
    ? MySQL
    : StandardSQL

  return [
    history(),
    drawSelection(),
    dropCursor(),
    rectangularSelection(),
    sql({ dialect }),
    syntaxHighlighting(dynamicHighlight),
    dynamicTheme,
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
      { key: 'Mod-/', run: toggleComment },
      { key: 'Mod-=', run: () => { editorStore.zoomIn(); return true } },
      { key: 'Mod-+', run: () => { editorStore.zoomIn(); return true } },
      { key: 'Mod--', run: () => { editorStore.zoomOut(); return true } },
      { key: 'Mod-0', run: () => { editorStore.resetZoom(); return true } },
      { key: 'Mod-s', run: () => { if (editorStore.activeTabId) { editorStore.saveTab(editorStore.activeTabId); return true } return false } },
    ]),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) { onUpdate(update.state.doc.toString()) }
      if (update.selectionSet || update.docChanged) {
        const mainSel = update.state.selection.main
        const sel = mainSel.head
        const line = update.state.doc.lineAt(sel)
        const selectedLen = Math.abs(mainSel.to - mainSel.from)
        if (editorStore.activeTabId) {
          editorStore.updateCursorAndSelection(
            editorStore.activeTabId,
            line.number,
            sel - line.from + 1,
            mainSel.anchor,
            mainSel.head,
            selectedLen
          )
        }
      }
    }),
  ]
}

function createTabState(sqlContent: string, anchor?: number, head?: number): EditorState {
  let selection: EditorSelection | undefined
  if (anchor !== undefined && head !== undefined && anchor <= sqlContent.length && head <= sqlContent.length) {
    selection = EditorSelection.single(anchor, head)
  }

  return EditorState.create({
    doc: sqlContent,
    selection,
    extensions: buildExtensions(
      (sql) => { if (editorStore.activeTabId) editorStore.updateSql(editorStore.activeTabId, sql) },
      (sql?: string) => emit('run', sql)
    ),
  })
}

function syncEditorState() {
  if (!editorContainer.value) return

  const activeTabId = editorStore.activeTabId
  const activeTab = editorStore.activeTab
  if (!activeTab || !activeTabId) return

  // Save state of current active tab before switching
  if (view.value && currentActiveTabId.value && currentActiveTabId.value !== activeTabId) {
    tabStates.set(currentActiveTabId.value, view.value.state)
  }

  if (!view.value) {
    let state = tabStates.get(activeTabId)
    if (!state) {
      state = createTabState(activeTab.sql, activeTab.selectionAnchor, activeTab.selectionHead)
      tabStates.set(activeTabId, state)
    }
    view.value = new EditorView({ state, parent: editorContainer.value })
    currentActiveTabId.value = activeTabId
    return
  }

  if (currentActiveTabId.value !== activeTabId) {
    currentActiveTabId.value = activeTabId
    let targetState = tabStates.get(activeTabId)
    if (!targetState) {
      targetState = createTabState(activeTab.sql, activeTab.selectionAnchor, activeTab.selectionHead)
      tabStates.set(activeTabId, targetState)
    }
    view.value.setState(targetState)
    view.value.focus()
  } else {
    // Check if doc was modified externally
    const docStr = view.value.state.doc.toString()
    if (docStr !== activeTab.sql) {
      view.value.dispatch({
        changes: { from: 0, to: docStr.length, insert: activeTab.sql }
      })
    }
  }
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

function getCurrentSql(): string {
  if (view.value) {
    return selectedSql(view.value)
  }
  return editorStore.activeTab?.sql ?? ''
}

watch(() => editorStore.activeTabId, () => {
  nextTick(syncEditorState)
})

watch(() => editorStore.tabs.map(t => t.id), (validIds) => {
  const validSet = new Set(validIds)
  for (const id of tabStates.keys()) {
    if (!validSet.has(id)) {
      tabStates.delete(id)
    }
  }
})

onMounted(() => {
  editorStore.loadFontSize()
  syncEditorState()
})

onUnmounted(() => {
  if (view.value && currentActiveTabId.value) {
    tabStates.set(currentActiveTabId.value, view.value.state)
  }
  view.value?.destroy()
  view.value = null
})

defineExpose({ formatSql, getCurrentSql })
</script>

<style scoped>
:deep(.cm-editor) { height: 100%; font-size: var(--editor-font-size, 13px); }
:deep(.cm-scroller) { height: 100%; overflow: auto; }
:deep(.cm-content) { font-family: 'JetBrains Mono', monospace; }
</style>
