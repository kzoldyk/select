<template>
  <div class="flex flex-col overflow-hidden bg-background min-h-0 flex-1 relative">
    <!-- Editor Action / Formatting Toolbar (Markdown Note mode only) -->
    <div
      v-if="editorMode === 'notebook'"
      class="flex items-center justify-between px-3 h-6 border-b border-border/50 bg-background text-[11px] select-none flex-shrink-0 z-10"
      role="toolbar"
      aria-label="Editor formatting tools"
    >
      <div class="flex items-center gap-0.5">
        <!-- Task Checkbox / Tick mark -->
        <button
          type="button"
          class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors text-[11px] cursor-pointer"
          title="Insert / Toggle Task Checkbox (- [ ])"
          aria-label="Insert task checkbox"
          @click="toggleTaskCheckbox"
        >
          <PhCheckSquare class="w-3.5 h-3.5 text-primary/80" />
          <span>Task</span>
        </button>

        <!-- Heading 1 -->
        <button
          type="button"
          class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors text-[11px] cursor-pointer"
          title="Insert / Toggle Heading 1 (#)"
          aria-label="Insert Heading 1"
          @click="toggleHeading(1)"
        >
          <span class="font-bold text-[11px] font-mono leading-none">H1</span>
          <span>Heading 1</span>
        </button>

        <!-- Heading 2 -->
        <button
          type="button"
          class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors text-[11px] cursor-pointer"
          title="Insert / Toggle Heading 2 (##)"
          aria-label="Insert Heading 2"
          @click="toggleHeading(2)"
        >
          <span class="font-bold text-[11px] font-mono leading-none">H2</span>
          <span>Heading 2</span>
        </button>

        <!-- Bullet list -->
        <button
          type="button"
          class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors text-[11px] cursor-pointer"
          title="Insert / Toggle Bullet List (-)"
          aria-label="Insert bullet list"
          @click="toggleBulletList"
        >
          <PhListBullets class="w-3.5 h-3.5" />
          <span>List</span>
        </button>

        <div class="h-3 w-px bg-border/60 mx-1"></div>

        <!-- SQL Query Block template -->
        <button
          type="button"
          class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors text-[11px] cursor-pointer font-mono"
          title="Insert SQL Query Block"
          aria-label="Insert SQL query block"
          @click="insertSqlBlock"
        >
          <PhCodeBlock class="w-3.5 h-3.5 text-primary" />
          <span>SQL Block</span>
        </button>

        <!-- Divider -->
        <button
          type="button"
          class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors text-[11px] cursor-pointer"
          title="Insert Horizontal Divider (---)"
          aria-label="Insert horizontal divider"
          @click="insertDivider"
        >
          <PhMinus class="w-3.5 h-3.5" />
          <span>Divider</span>
        </button>
      </div>

      <!-- Right: Document Format Badge / Toggle -->
      <div class="flex items-center gap-2 pr-1 shrink-0">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-border/60 hover:bg-accent/60 transition-colors text-[11px] cursor-pointer"
          :title="editorMode === 'notebook' ? 'Switch to pure SQL mode' : 'Switch to Notes & SQL mode'"
          aria-label="Toggle editor format"
          @click="toggleEditorMode"
        >
          <span
            class="w-1.5 h-1.5 rounded-full"
            :class="editorMode === 'notebook' ? 'bg-amber-400' : 'bg-primary/80'"
          ></span>
          <span :class="editorMode === 'notebook' ? 'text-amber-400 font-medium' : 'text-muted-foreground'">
            {{ editorMode === 'notebook' ? 'Notes & SQL' : 'SQL' }}
          </span>
        </button>
      </div>
    </div>

    <!-- CodeMirror editor canvas -->
    <div
      class="flex-1 overflow-hidden"
      ref="editorContainer"
      :style="{ '--editor-font-size': `${editorStore.fontSize}px` }"
      @wheel="onWheel"
      @dragover.prevent
      @drop.prevent="onDrop"
    ></div>
    <div
      v-if="showEmptyHint"
      class="absolute inset-0 pointer-events-none flex items-start justify-center pt-10 px-6"
    >
      <div class="pointer-events-auto w-full max-w-[480px] rounded-lg border border-border/70 bg-background/95 shadow-lg p-4 space-y-4">
        <div>
          <p class="text-[13px] font-semibold text-foreground">Query & Notes</p>
          <p class="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
            Write SQL directly, or type notes with <span class="font-mono text-foreground/80">#</span> headings,
            <span class="font-mono text-foreground/80">- [ ]</span> tasks, and
            <span class="font-mono text-foreground/80">```sql</span> blocks.
          </p>
        </div>
        <div class="flex flex-wrap gap-1.5">
          <button
            type="button"
            class="px-2 py-1 rounded-md border border-border/70 bg-muted/30 hover:bg-accent text-[11px] cursor-pointer"
            @click="insertNotebookStarter"
          >
            + Notes template
          </button>
        </div>
        <div v-if="recentHistory.length">
          <p class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Recent</p>
          <div class="flex flex-col gap-0.5">
            <button
              v-for="item in recentHistory"
              :key="item.id"
              type="button"
              class="w-full text-left px-2 py-1.5 rounded-md hover:bg-accent text-[11px] font-mono truncate border-none bg-transparent cursor-pointer"
              @click="insertSql(item.sql)"
            >
              {{ item.sql }}
            </button>
          </div>
        </div>
        <div v-if="topTables.length">
          <p class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Tables</p>
          <div class="flex flex-wrap gap-1">
            <button
              v-for="table in topTables"
              :key="table.name"
              type="button"
              class="px-2 py-1 rounded-md border border-border/70 bg-muted/30 hover:bg-accent text-[11px] font-mono cursor-pointer"
              @click="insertTableSelect(table.name)"
            >
              {{ table.name }}
            </button>
          </div>
        </div>
        <p v-if="!recentHistory.length && !topTables.length" class="text-[11px] text-muted-foreground">
          ⌘↵ runs SQL at cursor. ⌘E explains it.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, shallowRef, nextTick } from 'vue'
import {
  EditorView, keymap, lineNumbers, highlightActiveLine,
  drawSelection, dropCursor, rectangularSelection
} from '@codemirror/view'
import { EditorState, EditorSelection, Compartment } from '@codemirror/state'
import { sql, MySQL, StandardSQL } from '@codemirror/lang-sql'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { parseMixed } from '@lezer/common'
import { defaultKeymap, historyKeymap, history, indentWithTab, toggleComment } from '@codemirror/commands'
import { syntaxHighlighting } from '@codemirror/language'
import { autocompletion, closeBrackets } from '@codemirror/autocomplete'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { bracketMatching, indentOnInput } from '@codemirror/language'
import { dynamicTheme, dynamicHighlight } from '../editor/sqlTheme'
import { notebookEditorTheme, notebookProseHighlight } from '../editor/notebookTheme'
import { notebookDecorationsField, notebookModeEffect } from '../editor/notebookDecorations'
import { format } from 'sql-formatter'
import { useEditorStore } from '../stores/editor'
import { useConnectionStore } from '../stores/connection'
import { useSchemaStore } from '../stores/schema'
import { useResultStore } from '../stores/result'
import { getSqlCompletionOptions, getBacktickContext } from '../lib/sqlAutocomplete'
import { extractTableIdentifierAt } from '../lib/sqlScope'
import {
  extractRunnableSql,
  getFormattableSql,
  isInSqlContext,
  getSqlFenceAtPos,
  detectDocumentFormat,
  NOTEBOOK_STARTER,
} from '../lib/sqlExtract'
import { notebookSlashCommands } from '../editor/notebookCommands'
import {
  PhCheckSquare, PhTextHOne, PhTextHTwo,
  PhListBullets, PhCodeBlock, PhMinus
} from '@phosphor-icons/vue'

const emit = defineEmits<{ explain: []; run: [sql?: string] }>()

const editorStore = useEditorStore()
const connStore = useConnectionStore()
const schemaStore = useSchemaStore()
const resultStore = useResultStore()
const editorContainer = ref<HTMLDivElement | null>(null)
const view = shallowRef<EditorView | null>(null)

const tabStates = new Map<string, EditorState>()
const currentActiveTabId = ref<string | null>(null)
const languageCompartment = new Compartment()
const gutterCompartment = new Compartment()
const highlightCompartment = new Compartment()
const editorMode = ref<'sql' | 'notebook'>('sql')

const showEmptyHint = computed(() => {
  const tab = editorStore.activeTab
  if (!tab || tab.type === 'schema_diagram') return false
  return !tab.sql.trim()
})

const recentHistory = computed(() => resultStore.history?.slice(0, 6) ?? [])

const topTables = computed(() => {
  return [...(schemaStore.tables ?? [])]
    .sort((a, b) => (b.rowCount ?? 0) - (a.rowCount ?? 0))
    .slice(0, 8)
})

function getActiveFormat(): 'sql' | 'notebook' {
  const tab = editorStore.activeTab
  if (!tab) return 'sql'
  return tab.format === 'notebook' ? 'notebook' : 'sql'
}

function getSqlDialect() {
  const activeConn = connStore.activeConnection
  return activeConn?.dbType === 'mysql' || activeConn?.dbType === 'mariadb'
    ? MySQL
    : StandardSQL
}

function buildLanguageExtension(mode: 'sql' | 'notebook') {
  const dialect = getSqlDialect()
  if (mode === 'notebook') {
    const sqlLang = sql({ dialect }).language
    const sqlClauseRegex = /^\s*(SELECT|WITH|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|SHOW|DESCRIBE|DESC|EXPLAIN|USE|SET|CALL|TRUNCATE|REPLACE|GRANT|REVOKE|BEGIN|COMMIT|ROLLBACK|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|GROUP|ORDER|HAVING|LIMIT)\b/i
    return markdown({
      base: markdownLanguage,
      codeLanguages: (info) => {
        const lang = info.toLowerCase()
        if (lang === 'sql' || lang === '') return sqlLang
        return null
      },
      extensions: [
        {
          wrap: parseMixed((node, input) => {
            if (node.type.name === 'Paragraph') {
              const text = input.read(node.from, node.to)
              if (sqlClauseRegex.test(text)) {
                return { parser: sqlLang.parser }
              }
            }
            return null
          }),
        },
      ],
      addKeymap: true,
    })
  }
  return sql({ dialect })
}

function insertSql(sqlText: string) {
  if (!editorStore.activeTabId) return
  editorStore.updateSql(editorStore.activeTabId, sqlText)
}

function insertNotebookStarter() {
  if (!editorStore.activeTabId) return
  editorStore.setTabFormat(editorStore.activeTabId, 'notebook')
  editorStore.updateSql(editorStore.activeTabId, NOTEBOOK_STARTER)
  editorMode.value = 'notebook'
  if (view.value) {
    const len = view.value.state.doc.length
    view.value.dispatch({
      changes: { from: 0, to: len, insert: NOTEBOOK_STARTER },
      selection: { anchor: NOTEBOOK_STARTER.length },
    })
    reconfigureEditorMode(view.value, 'notebook')
  }
}

function reconfigureEditorMode(editorView: EditorView, mode: 'sql' | 'notebook') {
  editorView.dom.classList.toggle('cm-notebook-mode', mode === 'notebook')
  editorView.dispatch({
    effects: [
      languageCompartment.reconfigure(buildLanguageExtension(mode)),
      gutterCompartment.reconfigure(buildGutterExtensions(mode)),
      highlightCompartment.reconfigure(buildHighlightExtensions(mode)),
      notebookModeEffect.of(mode),
    ],
  })
  editorView.dom.classList.toggle('cm-notebook-mode', mode === 'notebook')
}

function insertTableSelect(name: string) {
  const quoted = `\`${name.replace(/`/g, '``')}\``
  insertSql(`SELECT *\nFROM ${quoted}\nLIMIT 100;`)
}

function ensureNotebookMode() {
  if (editorMode.value !== 'notebook') {
    editorMode.value = 'notebook'
    if (editorStore.activeTabId) {
      editorStore.setTabFormat(editorStore.activeTabId, 'notebook')
    }
    if (view.value) {
      reconfigureEditorMode(view.value, 'notebook')
    }
  }
}

function toggleEditorMode() {
  const nextMode = editorMode.value === 'notebook' ? 'sql' : 'notebook'
  editorMode.value = nextMode
  if (editorStore.activeTabId) {
    editorStore.setTabFormat(editorStore.activeTabId, nextMode)
  }
  if (view.value) {
    reconfigureEditorMode(view.value, nextMode)
    view.value.focus()
  }
}

function toggleTaskCheckbox() {
  ensureNotebookMode()
  if (!view.value) return
  const state = view.value.state
  const head = state.selection.main.head
  const line = state.doc.lineAt(head)
  const text = line.text

  // Match existing task checkbox: "- [ ] " or "- [x] "
  const taskMatch = text.match(/^(\s*[-*+]\s+)\[([ xX])\]\s*/)
  if (taskMatch) {
    const removeLen = taskMatch[0].length
    view.value.dispatch({
      changes: { from: line.from, to: line.from + removeLen, insert: '' },
      selection: { anchor: Math.max(line.from, head - removeLen) },
    })
  } else {
    // Match existing bullet: "- " or "* "
    const bulletMatch = text.match(/^(\s*[-*+]\s+)/)
    if (bulletMatch) {
      view.value.dispatch({
        changes: { from: line.from, to: line.from + bulletMatch[0].length, insert: '- [ ] ' },
        selection: { anchor: line.from + 6 },
      })
    } else {
      const indentMatch = text.match(/^(\s*)/)
      const indent = indentMatch ? indentMatch[0] : ''
      const content = text.slice(indent.length)
      const insertText = `${indent}- [ ] `
      view.value.dispatch({
        changes: { from: line.from + indent.length, to: line.from + indent.length, insert: '- [ ] ' },
        selection: { anchor: line.from + insertText.length + content.length },
      })
    }
  }
  view.value.focus()
}

function toggleHeading(level: 1 | 2 | 3 = 1) {
  ensureNotebookMode()
  if (!view.value) return
  const state = view.value.state
  const head = state.selection.main.head
  const line = state.doc.lineAt(head)
  const text = line.text

  const prefix = '#'.repeat(level) + ' '
  const headingMatch = text.match(/^(#{1,6})\s*/)

  if (headingMatch) {
    const curLevel = headingMatch[1].length
    if (curLevel === level) {
      view.value.dispatch({
        changes: { from: line.from, to: line.from + headingMatch[0].length, insert: '' },
        selection: { anchor: line.from },
      })
    } else {
      view.value.dispatch({
        changes: { from: line.from, to: line.from + headingMatch[0].length, insert: prefix },
        selection: { anchor: line.from + prefix.length },
      })
    }
  } else {
    view.value.dispatch({
      changes: { from: line.from, to: line.from, insert: prefix },
      selection: { anchor: line.from + prefix.length },
    })
  }
  view.value.focus()
}

function toggleBulletList() {
  ensureNotebookMode()
  if (!view.value) return
  const state = view.value.state
  const head = state.selection.main.head
  const line = state.doc.lineAt(head)
  const text = line.text

  const bulletMatch = text.match(/^(\s*[-*+]\s+)/)
  if (bulletMatch) {
    view.value.dispatch({
      changes: { from: line.from, to: line.from + bulletMatch[0].length, insert: '' },
      selection: { anchor: line.from },
    })
  } else {
    view.value.dispatch({
      changes: { from: line.from, to: line.from, insert: '- ' },
      selection: { anchor: line.from + 2 },
    })
  }
  view.value.focus()
}

function insertSqlBlock() {
  ensureNotebookMode()
  if (!view.value) return
  const state = view.value.state
  const head = state.selection.main.head
  const line = state.doc.lineAt(head)
  const text = line.text

  const fenceTemplate = '```sql\nSELECT * FROM \nLIMIT 10;\n```\n'
  let insertText = fenceTemplate
  let insertFrom = line.from
  let insertTo = line.to

  if (text.trim()) {
    insertText = `\n\n${fenceTemplate}`
    insertFrom = line.to
    insertTo = line.to
  }

  view.value.dispatch({
    changes: { from: insertFrom, to: insertTo, insert: insertText },
    selection: { anchor: insertFrom + (text.trim() ? 2 : 0) + 21 },
  })
  view.value.focus()
}

function insertDivider() {
  ensureNotebookMode()
  if (!view.value) return
  const state = view.value.state
  const head = state.selection.main.head
  const line = state.doc.lineAt(head)

  const insertText = line.text.trim() ? '\n\n---\n\n' : '---\n\n'
  view.value.dispatch({
    changes: { from: line.to, to: line.to, insert: insertText },
    selection: { anchor: line.to + insertText.length },
  })
  view.value.focus()
}

function buildGutterExtensions(_mode: 'sql' | 'notebook') {
  return [lineNumbers(), highlightActiveLine()]
}

function buildHighlightExtensions(mode: 'sql' | 'notebook') {
  if (mode === 'notebook') {
    return [
      syntaxHighlighting(dynamicHighlight),
      syntaxHighlighting(notebookProseHighlight),
    ]
  }
  return [syntaxHighlighting(dynamicHighlight)]
}


watch(showEmptyHint, (empty) => {
  if (empty && !(resultStore.history?.length)) resultStore.loadHistory()
}, { immediate: true })

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

function onDrop(e: DragEvent) {
  const text = e.dataTransfer?.getData('text/plain')
  if (!text || !view.value) return
  const pos = view.value.posAtCoords({ x: e.clientX, y: e.clientY })
  const insertPos = pos ?? view.value.state.selection.main.head
  view.value.dispatch({
    changes: { from: insertPos, to: insertPos, insert: text },
    selection: { anchor: insertPos + text.length },
  })
  view.value.focus()
}

function getSqlAutocomplete() {
  return autocompletion({
    override: [
      async (context) => {
        const fullDoc = context.state.doc.toString()
        if (editorMode.value === 'notebook' && !isInSqlContext(fullDoc, context.pos, 'notebook')) {
          return notebookSlashCommands(context, editorMode.value)
        }
        if (!isInSqlContext(fullDoc, context.pos, editorMode.value)) return null

        const fence = editorMode.value === 'notebook' ? getSqlFenceAtPos(fullDoc, context.pos) : null
        const doc = fence ? fence.sql : fullDoc
        const pos = fence ? context.pos - fence.contentStart : context.pos
        const offset = fence ? fence.contentStart : 0

        const bt = getBacktickContext(doc, pos)
        const word = context.matchBefore(/\w*/)
        const isAfterDot = context.matchBefore(/[\w`"\]]+\.\s*\w*/) !== null
        const isAfterOn = context.matchBefore(/\bON\s+\w*/) !== null
        const justOpenedTick = bt.insideBacktick && pos === bt.tokenStart
        if (
          !word ||
          (word.from === word.to && !context.explicit && !isAfterDot && !isAfterOn && !justOpenedTick)
        ) {
          return null
        }
        const q = word.text

        const options = await getSqlCompletionOptions(doc, pos, q, schemaStore, {
          insideBacktick: bt.insideBacktick,
        })

        if (options.length === 0) return null

        return {
          from: bt.insideBacktick ? Math.max(word.from, bt.tokenStart + offset) : word.from,
          options: options.slice(0, 30),
        }
      },
    ],
    activateOnTyping: true,
    maxRenderedOptions: 30,
  })
}

async function openTableFromEditor(target: { full: string; schema?: string; table: string }) {
  const schemaStore = useSchemaStore()
  const editorStore = useEditorStore()

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

  const schemaName = target.schema
  const tableName = target.table

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

  const isKnownDb = schemaStore.databases?.some(
    d => d.toLowerCase() === schemaName.toLowerCase()
  )
  if (isKnownDb) {
    editorStore.addTableTab(`${schemaName}.${tableName}`)
    return true
  }

  return false
}

function buildExtensions(
  mode: 'sql' | 'notebook',
  onUpdate: (sql: string) => void,
  onRun: (sql?: string) => void,
) {
  return [
    history(),
    drawSelection(),
    dropCursor(),
    rectangularSelection(),
    languageCompartment.of(buildLanguageExtension(mode)),
    gutterCompartment.of(buildGutterExtensions(mode)),
    highlightCompartment.of(buildHighlightExtensions(mode)),
    dynamicTheme,
    notebookEditorTheme,
    notebookDecorationsField(() => editorMode.value, onRun),
    EditorView.editorAttributes.of(() => ({
      class: editorMode.value === 'notebook' ? 'cm-notebook-mode' : '',
    })),
    bracketMatching(),
    closeBrackets(),
    indentOnInput(),
    highlightSelectionMatches(),
    getSqlAutocomplete(),
    keymap.of([
      {
        key: 'Mod-Enter',
        run: (v) => {
          const sqlToRun = extractRunnableSql(v.state, editorMode.value)
          if (sqlToRun) onRun(sqlToRun)
          return true
        },
      },
      {
        key: 'Mod-Shift-Enter',
        run: (v) => {
          const sqlToRun = extractRunnableSql(v.state, editorMode.value)
          if (sqlToRun) onRun(sqlToRun)
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
          const doc = view.state.doc.toString()
          const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
          if (pos !== null && !isInSqlContext(doc, pos, editorMode.value)) return false

          if (pos !== null) {
            const target = extractTableIdentifierAt(doc, pos)
            if (target) {
              const schemaStore = useSchemaStore()
              const editorStore = useEditorStore()

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
      if (update.docChanged) {
        onUpdate(update.state.doc.toString())
      }
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

function createTabState(sqlContent: string, format: 'sql' | 'notebook', anchor?: number, head?: number): EditorState {
  const mode = format
  let selection: EditorSelection | undefined
  if (anchor !== undefined && head !== undefined && anchor <= sqlContent.length && head <= sqlContent.length) {
    selection = EditorSelection.single(anchor, head)
  }

  return EditorState.create({
    doc: sqlContent,
    selection,
    extensions: buildExtensions(
      mode,
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

  if (view.value && currentActiveTabId.value && currentActiveTabId.value !== activeTabId) {
    tabStates.set(currentActiveTabId.value, view.value.state)
  }

  if (!view.value) {
    const format = getActiveFormat()
    editorMode.value = format
    let state = tabStates.get(activeTabId)
    if (!state) {
      state = createTabState(activeTab.sql, format, activeTab.selectionAnchor, activeTab.selectionHead)
      tabStates.set(activeTabId, state)
    }
    view.value = new EditorView({ state, parent: editorContainer.value })
    view.value.dom.classList.toggle('cm-notebook-mode', format === 'notebook')
    currentActiveTabId.value = activeTabId
    return
  }

  if (currentActiveTabId.value !== activeTabId) {
    currentActiveTabId.value = activeTabId
    const format = getActiveFormat()
    editorMode.value = format
    let targetState = tabStates.get(activeTabId)
    if (!targetState) {
      targetState = createTabState(activeTab.sql, format, activeTab.selectionAnchor, activeTab.selectionHead)
      tabStates.set(activeTabId, targetState)
    }
    view.value.setState(targetState)
    reconfigureEditorMode(view.value, format)
    view.value.focus()
  } else {
    const format = getActiveFormat()
    if (editorMode.value !== format) {
      editorMode.value = format
      reconfigureEditorMode(view.value, format)
    }
    const docStr = view.value.state.doc.toString()
    if (docStr !== activeTab.sql) {
      view.value.dispatch({
        changes: { from: 0, to: docStr.length, insert: activeTab.sql }
      })
    }
  }
}

function formatSql() {
  if (!view.value) return
  const target = getFormattableSql(view.value.state, editorMode.value)
  if (!target || !target.sql.trim()) return
  try {
    const formatted = format(target.sql, {
      language: 'mysql',
      tabWidth: 2,
      keywordCase: 'upper',
      linesBetweenQueries: 0,
    }).trimEnd()

    if (target.sql === formatted) return

    view.value.dispatch({
      changes: { from: target.replaceFrom, to: target.replaceTo, insert: formatted },
      selection: { anchor: view.value.state.selection.main.head },
    })
  } catch {
    // fallback: no formatting
  }
}

function getCurrentSql(): string {
  if (view.value) {
    return extractRunnableSql(view.value.state, editorMode.value) ?? ''
  }
  return editorStore.activeTab?.sql ?? ''
}

watch(() => editorStore.activeTabId, () => {
  nextTick(syncEditorState)
})

watch(() => editorStore.activeTab?.sql, (sql) => {
  if (!view.value || sql === undefined) return
  if (currentActiveTabId.value !== editorStore.activeTabId) return
  const current = view.value.state.doc.toString()
  if (current === sql) return
  view.value.dispatch({
    changes: { from: 0, to: current.length, insert: sql },
  })
  const format = getActiveFormat()
  if (editorMode.value !== format) {
    editorMode.value = format
    reconfigureEditorMode(view.value, format)
  }
})

watch(() => editorStore.activeTab?.format, (newFormat) => {
  if (!view.value || !newFormat) return
  const format = newFormat === 'notebook' ? 'notebook' : 'sql'
  if (editorMode.value !== format) {
    editorMode.value = format
    reconfigureEditorMode(view.value, format)
  }
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

defineExpose({
  formatSql,
  getCurrentSql,
  toggleTaskCheckbox,
  toggleHeading,
  toggleBulletList,
  insertSqlBlock,
  insertDivider,
  toggleEditorMode,
})
</script>

<style scoped>
:deep(.cm-editor) {
  height: 100%;
  font-size: var(--editor-font-size, 13px);
}
:deep(.cm-scroller) {
  height: 100%;
  overflow: auto;
}
:deep(.cm-editor .cm-content),
:deep(.cm-editor .cm-scroller) {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
}

/* Notion-grade typography & layout for Markdown Notebook mode */
:deep(.cm-editor.cm-notebook-mode .cm-scroller),
:deep(.cm-editor.cm-notebook-mode .cm-content) {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
  font-size: 15px;
  line-height: 1.7;
  color: var(--foreground);
}

:deep(.cm-editor.cm-notebook-mode .cm-content) {
  max-width: 860px;
  margin: 0 auto;
  padding: 32px 48px 160px 48px;
}

:deep(.cm-editor.cm-notebook-mode .cm-line) {
  line-height: 1.7;
  padding: 2px 0;
}

/* Notion-style clean document view without gutter distractions */
:deep(.cm-editor.cm-notebook-mode .cm-gutters) {
  display: none !important;
}

/* Monospace strictly preserved for code blocks, headers, inline code */
:deep(.cm-editor.cm-notebook-mode .cm-nb-code-line),
:deep(.cm-editor.cm-notebook-mode .cm-nb-code-header),
:deep(.cm-editor.cm-notebook-mode .cm-nb-code-footer),
:deep(.cm-editor.cm-notebook-mode .cm-nb-inline-code) {
  font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace !important;
  font-size: 13px !important;
}
</style>

<!-- Global (non-scoped) overrides: guarantee notebook-mode styles win regardless of CM specificity -->
<style>
/* ACTIVE LINE: nuke the red band everywhere in notebook prose areas */
.cm-editor.cm-notebook-mode .cm-activeLine {
  background-color: transparent !important;
  border-left: none !important;
}
.cm-editor.cm-notebook-mode .cm-activeLineGutter {
  background-color: transparent !important;
}
/* Keep subtle active highlight only within SQL code block lines */
.cm-editor.cm-notebook-mode .cm-nb-code-line.cm-activeLine {
  background-color: color-mix(in srgb, var(--nb-code-bg, #1e1e2e) 92%, white) !important;
}

/* GUTTER: hide line numbers in notebook/prose mode */
.cm-editor.cm-notebook-mode .cm-gutters {
  display: none !important;
}

/* PROSE FONT: enforce sans-serif in notebook scroller & content */
.cm-editor.cm-notebook-mode .cm-scroller,
.cm-editor.cm-notebook-mode .cm-content {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
  font-size: 15px !important;
  line-height: 1.75 !important;
}

/* Keep monospace inside code block lines */
.cm-editor.cm-notebook-mode .cm-nb-code-line,
.cm-editor.cm-notebook-mode .cm-nb-code-header,
.cm-editor.cm-notebook-mode .cm-nb-code-footer {
  font-family: 'JetBrains Mono', ui-monospace, monospace !important;
  font-size: 13px !important;
}

/* HEADER MARK: # symbol hidden on non-cursor lines */
.cm-editor.cm-notebook-mode .cm-nb-header-mark {
  opacity: 0 !important;
}

/* CONTENT AREA: centered, readable width, Notion-style padding */
.cm-editor.cm-notebook-mode .cm-content {
  max-width: 860px !important;
  margin: 0 auto !important;
  padding: 40px 48px 160px 48px !important;
}
</style>
