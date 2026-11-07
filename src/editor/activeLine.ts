import { ViewPlugin, Decoration, type DecorationSet, type EditorView, type ViewUpdate } from '@codemirror/view'
import { gutterLineClass, GutterMarker } from '@codemirror/view'
import { RangeSet } from '@codemirror/state'

const activeLineDeco = Decoration.line({ class: 'cm-activeLine' })

const activeLineGutterMarker = new (class extends GutterMarker {
  elementClass = 'cm-activeLineGutter'
})()

/**
 * Creative, single-line active highlighter for the query editor.
 * 1. Only highlights when selection is empty (collapsed cursor) — avoids conflicting double-highlights when text is selected.
 * 2. Only highlights exactly one line (the main cursor) — prevents stray multi-cursor highlights.
 * 3. Uses state.doc.lineAt(sel.head) instead of lineBlockAt to ensure rock-solid document line positions.
 */
export const singleActiveLine = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = this.getDeco(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet || update.viewportChanged || update.focusChanged) {
        this.decorations = this.getDeco(update.view)
      }
    }

    getDeco(view: EditorView): DecorationSet {
      const sel = view.state.selection.main
      // When a selection range exists, suppress active line to prevent visual collision
      if (!sel.empty) {
        return Decoration.none
      }
      const line = view.state.doc.lineAt(sel.head)
      return Decoration.set([activeLineDeco.range(line.from)])
    }
  },
  {
    decorations: (v) => v.decorations,
  }
)

export const singleActiveLineGutter = gutterLineClass.compute(['selection'], (state) => {
  const sel = state.selection.main
  if (!sel.empty) {
    return RangeSet.empty
  }
  const line = state.doc.lineAt(sel.head)
  return RangeSet.of([activeLineGutterMarker.range(line.from)])
})
