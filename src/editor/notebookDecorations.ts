import { syntaxTree } from '@codemirror/language'
import { EditorView, Decoration, WidgetType, type DecorationSet } from '@codemirror/view'
import { RangeSetBuilder, StateField, StateEffect, type EditorState } from '@codemirror/state'
import { findSqlFences } from '../lib/sqlExtract'

export const notebookModeEffect = StateEffect.define<'sql' | 'notebook'>()

const HEADER_MARK = Decoration.mark({ class: 'cm-nb-header-mark' })

class BulletWidget extends WidgetType {
  toDOM() {
    const el = document.createElement('span')
    el.className = 'cm-nb-bullet'
    el.setAttribute('aria-hidden', 'true')
    return el
  }
}

class DividerWidget extends WidgetType {
  toDOM() {
    const hr = document.createElement('hr')
    hr.className = 'cm-nb-divider'
    return hr
  }
}

class SqlBlockHeaderWidget extends WidgetType {
  constructor(readonly sql: string, readonly onRun?: (sql: string) => void) {
    super()
  }

  eq(other: SqlBlockHeaderWidget) {
    return other.sql === this.sql
  }

  toDOM() {
    const container = document.createElement('div')
    container.className = 'cm-nb-code-header-bar'

    const right = document.createElement('div')
    right.className = 'cm-nb-header-right'

    const copyBtn = document.createElement('button')
    copyBtn.type = 'button'
    copyBtn.className = 'cm-nb-action-btn cm-nb-copy-btn'
    copyBtn.setAttribute('aria-label', 'Copy SQL')
    copyBtn.title = 'Copy SQL'
    copyBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 256 256" fill="currentColor">
        <path d="M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208Z"/>
      </svg>
    `
    copyBtn.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation() })
    copyBtn.addEventListener('click', async (e) => {
      e.preventDefault()
      e.stopPropagation()
      try {
        await navigator.clipboard.writeText(this.sql)
        copyBtn.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 256 256" fill="currentColor" style="color:var(--primary)">
            <path d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34A8,8,0,0,1,229.66,77.66Z"/>
          </svg>
        `
        copyBtn.title = 'Copied!'
        setTimeout(() => {
          copyBtn.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 256 256" fill="currentColor">
              <path d="M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208Z"/>
            </svg>
          `
          copyBtn.title = 'Copy SQL'
        }, 1500)
      } catch (err) {
        console.error('Failed to copy SQL:', err)
      }
    })
    right.appendChild(copyBtn)

    const runBtn = document.createElement('button')
    runBtn.type = 'button'
    runBtn.className = 'cm-nb-action-btn cm-nb-run-btn'
    runBtn.setAttribute('aria-label', 'Run query')
    runBtn.title = 'Run query (⌘↵)'
    runBtn.innerHTML = `
      <svg width="8" height="8" viewBox="0 0 256 256" fill="currentColor">
        <path d="M240,128a15.74,15.74,0,0,1-7.6,13.51L88.32,229.65a16,16,0,0,1-16.2.3A15.86,15.86,0,0,1,64,216.13V39.87a15.86,15.86,0,0,1,8.12-13.82,16,16,0,0,1,16.2.3L232.4,114.49A15.74,15.74,0,0,1,240,128Z"/>
      </svg>
      <span>Run</span>
    `
    runBtn.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation() })
    runBtn.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      if (this.onRun && this.sql.trim()) {
        this.onRun(this.sql.trim())
      }
    })
    right.appendChild(runBtn)

    container.appendChild(right)
    return container
  }

  ignoreEvent() { return false }
}

class SqlBlockFooterWidget extends WidgetType {
  toDOM() {
    const el = document.createElement('div')
    el.className = 'cm-nb-code-footer-bar'
    return el
  }

  ignoreEvent() { return false }
}

class TaskCheckboxWidget extends WidgetType {
  constructor(readonly checked: boolean, readonly markerFrom: number) {
    super()
  }

  eq(other: TaskCheckboxWidget) {
    return other.checked === this.checked && other.markerFrom === this.markerFrom
  }

  toDOM(view: EditorView) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = `cm-nb-task-checkbox${this.checked ? ' cm-nb-task-checkbox--checked' : ''}`
    btn.setAttribute('aria-label', this.checked ? 'Mark incomplete' : 'Mark complete')
    btn.setAttribute('aria-pressed', String(this.checked))
    btn.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation() })
    btn.addEventListener('click', (e) => {
      e.preventDefault()
      let pos = this.markerFrom
      try {
        const domPos = view.posAtDOM(btn)
        if (domPos !== null && domPos >= 0 && domPos <= view.state.doc.length) {
          pos = domPos
        }
      } catch {}
      const line = view.state.doc.lineAt(pos)
      const match = line.text.match(/^(\s*[-*+]\s+)\[([ xX])\]/)
      if (!match) return
      const markerStart = line.from + match[1].length + 1
      view.dispatch({
        changes: { from: markerStart, to: markerStart + 1, insert: this.checked ? ' ' : 'x' },
      })
      view.focus()
    })
    return btn
  }

  ignoreEvent() { return false }
}

type PendingDeco = { from: number; to: number; deco: Decoration; side?: number }

function addPending(list: PendingDeco[], from: number, to: number, deco: Decoration, side = 0) {
  list.push({ from, to, deco, side })
}

function flushPending(builder: RangeSetBuilder<Decoration>, list: PendingDeco[]) {
  list.sort((a, b) => a.from - b.from || a.side - b.side)
  for (const item of list) {
    builder.add(item.from, item.to, item.deco, item.side)
  }
}

function buildDecorations(state: EditorState, mode: 'sql' | 'notebook', onRun?: (sql: string) => void): DecorationSet {
  if (mode !== 'notebook') return Decoration.none

  const pending: PendingDeco[] = []
  const doc = state.doc.toString()
  const tree = syntaxTree(state)
  const cursorHead = state.selection.main.head

  // ── Syntax-tree markers (hide raw markdown when not active line) ──────────
  tree.iterate({
    enter(node) {
      const { name, from, to } = node

      if (name === 'HeaderMark') {
        const line = state.doc.lineAt(from)
        addPending(pending, from, to, HEADER_MARK)
        const level = state.doc.sliceString(from, to).length
        addPending(pending, line.from, line.from, Decoration.line({
          class: `cm-nb-heading-line cm-nb-heading-${Math.min(level, 6)}`,
        }), -1)
        return
      }

      if (name === 'CodeMark' || name === 'CodeInfo') {
        // Fences are handled directly below
        return
      }

      if (name === 'TaskMarker') {
        const line = state.doc.lineAt(from)
        const checked = state.doc.sliceString(from + 1, from + 2).toLowerCase() === 'x'
        const listItem = node.node.parent?.parent
        const listMark = listItem?.getChild('ListMark')
        const replaceFrom = listMark?.from ?? from
        addPending(pending, replaceFrom, to, Decoration.replace({
          widget: new TaskCheckboxWidget(checked, from),
        }))
        addPending(pending, line.from, line.from, Decoration.line({
          class: `cm-nb-task-line${checked ? ' cm-nb-task-line--done' : ''}`,
        }), -1)
        return
      }

      if (name === 'ListMark') {
        const hasTask = node.node.parent?.getChild('Task')
        if (!hasTask) {
          addPending(pending, from, to, Decoration.replace({ widget: new BulletWidget() }))
        }
        return
      }

      if (name === 'HorizontalRule') {
        addPending(pending, from, to, Decoration.replace({ widget: new DividerWidget() }))
        return
      }
    },
  })

  // ── SQL fenced code blocks (card header with Run button, code lines, footer) ───
  const fences = findSqlFences(doc)

  for (const fence of fences) {
    const openLine = state.doc.lineAt(fence.fenceStart)
    const closeLine = state.doc.lineAt(fence.fenceEnd)
    const isSingleLine = openLine.number === closeLine.number

    // 1. Opening header line
    const headerClass = isSingleLine ? 'cm-nb-code-header cm-nb-code-single-line' : 'cm-nb-code-header'
    addPending(pending, openLine.from, openLine.from, Decoration.line({ class: headerClass }), -1)
    addPending(pending, openLine.from, openLine.to, Decoration.replace({
      widget: new SqlBlockHeaderWidget(fence.sql, onRun),
    }))

    // 2. Content lines inside fence
    let lineNo = openLine.number + 1
    while (lineNo < closeLine.number) {
      const line = state.doc.line(lineNo)
      addPending(pending, line.from, line.from, Decoration.line({ class: 'cm-nb-code-line' }), -1)
      lineNo++
    }

    // 3. Closing footer line
    if (!isSingleLine) {
      addPending(pending, closeLine.from, closeLine.from, Decoration.line({ class: 'cm-nb-code-footer' }), -1)
      addPending(pending, closeLine.from, closeLine.to, Decoration.replace({
        widget: new SqlBlockFooterWidget(),
      }))
    }
  }

  const builder = new RangeSetBuilder<Decoration>()
  flushPending(builder, pending)
  return builder.finish()
}

export function notebookDecorationsField(
  getMode: () => 'sql' | 'notebook',
  onRun?: (sql: string) => void
) {
  return StateField.define<DecorationSet>({
    create(state) {
      return buildDecorations(state, getMode(), onRun)
    },
    update(deco, tr) {
      const modeEffect = tr.effects.find(e => e.is(notebookModeEffect))
      if (tr.docChanged || tr.selection || modeEffect) {
        const mode = modeEffect ? modeEffect.value : getMode()
        return buildDecorations(tr.state, mode, onRun)
      }
      return deco.map(tr.changes)
    },
    provide: (f) => EditorView.decorations.from(f),
  })
}
