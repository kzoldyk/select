<template>
  <div class="flex flex-col overflow-hidden bg-background min-h-0 flex-1">
    <div
      class="flex-1 overflow-hidden"
      ref="editorContainer"
      :style="{ '--editor-font-size': `${editorStore.fontSize}px` }"
      @wheel="onWheel"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, shallowRef, nextTick } from 'vue'
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
import { getSqlCompletionOptions } from '../lib/sqlAutocomplete'
import { extractTableIdentifierAt, getStatementAtPosition } from '../lib/sqlScope'


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

function getSqlAutocomplete() {
  return autocompletion({
    override: [
      async (context) => {
        const word = context.matchBefore(/\w*/)
        const isAfterDot = context.matchBefore(/[\w`"\]]+\.\s*\w*/) !== null
        const isAfterOn = context.matchBefore(/\bON\s+\w*/) !== null
        if (!word || (word.from === word.to && !context.explicit && !isAfterDot && !isAfterOn)) return null
        const q = word.text

        const doc = context.state.doc.toString()
        const options = await getSqlCompletionOptions(doc, context.pos, q, schemaStore)

        if (options.length === 0) return null

        return {
          from: word.from,
          options: options.slice(0, 30),
        }
      },
    ],
    activateOnTyping: true,
    maxRenderedOptions: 30,
  })
}

function selectedSql(editorView: EditorView): string {
  const selection = editorView.state.selection.main
  if (selection.empty) {
    const doc = editorView.state.doc.toString()
    const stmt = getStatementAtPosition(doc, selection.head)
    return stmt || doc
  }
  return editorView.state.sliceDoc(selection.from, selection.to)
}

async function openTableFromEditor(target: { full: string; schema?: string; table: string }) {
  const schemaStore = useSchemaStore()
  const editorStore = useEditorStore()

  // 1. Unqualified table (e.g. `users`)
  if (!target.schema) {
    const tableName = target.table.toLowerCase()
    const currentTable = [...schemaStore.tables, ...schemaStore.views].find(
      t => t.name.toLowerCase() === tableName
    )
    if (currentTable) {
      editorStore.addTableTab(currentTable.name)
      return true
    }

    try {
      const details = await schemaStore.fetchTableDetails(target.table)
      if (details && details.columns && details.columns.length > 0) {
        editorStore.addTableTab(target.table)
        return true
      }
    } catch {
      // not a table
    }
    return false
  }

  // 2. Schema-qualified table (e.g. `other_schema.users`)
  const schemaName = target.schema
  const tableName = target.table

  // A. Check if tables for schemaName are cached or can be fetched
  try {
    const schemaTables = await schemaStore.fetchTablesForSchema(schemaName)
    if (schemaTables && schemaTables.length > 0) {
      const matched = schemaTables.find(t => t.toLowerCase() === tableName.toLowerCase())
      if (matched) {
        editorStore.addTableTab(`${schemaName}.${matched}`)
        return true
      }
    }
  } catch {
    // ignore
  }

  // B. Fallback: try fetching table details for `${schemaName}.${tableName}`
  try {
    const qualified = `${schemaName}.${tableName}`
    const details = await schemaStore.fetchTableDetails(qualified)
    if (details && details.columns && details.columns.length > 0) {
      editorStore.addTableTab(qualified)
      return true
    }
  } catch {
    // not a table
  }

  // C. Check if schemaStore.databases contains this schema/database
  const isKnownDb = schemaStore.databases?.some(
    d => d.toLowerCase() === schemaName.toLowerCase()
  )
  if (isKnownDb) {
    editorStore.addTableTab(`${schemaName}.${tableName}`)
    return true
  }

  return false
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
      {
        key: 'Mod-Enter',
        run: (v) => {
          onRun(selectedSql(v))
          return true
        },
      },
      {
        key: 'Mod-Shift-Enter',
        run: (v) => {
          onRun(selectedSql(v))
          return true
        },
      },
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
    EditorView.domEventHandlers({
      click(event, view) {
        if (event.ctrlKey || event.metaKey) {
          const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
          if (pos !== null) {
            const target = extractTableIdentifierAt(view.state.doc.toString(), pos)
            if (target) {
              const schemaStore = useSchemaStore()
              const editorStore = useEditorStore()

              // Fast synchronous path: unqualified table in current schema
              if (!target.schema) {
                const currentTable = [...schemaStore.tables, ...schemaStore.views].find(
                  t => t.name.toLowerCase() === target.table.toLowerCase()
                )
                if (currentTable) {
                  editorStore.addTableTab(currentTable.name)
                  event.preventDefault()
                  return true
                }
              }

              // Fast synchronous path: qualified table in cached schema tables
              if (target.schema) {
                const connStore = useConnectionStore()
                const cacheKey = `${connStore.activeId}-${target.schema}`
                const cachedTables = schemaStore.schemaTablesCache[cacheKey]
                if (cachedTables) {
                  const matched = cachedTables.find(t => t.toLowerCase() === target.table.toLowerCase())
                  if (matched) {
                    editorStore.addTableTab(`${target.schema}.${matched}`)
                    event.preventDefault()
                    return true
                  }
                }
              }

              // Asynchronous lookup and navigation
              void openTableFromEditor(target)
              event.preventDefault()
              return true
            }
          }
        }
        return false
      }
    }),
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
