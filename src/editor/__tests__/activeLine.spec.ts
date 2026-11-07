import { describe, it, expect } from 'vitest'
import { EditorState, EditorSelection } from '@codemirror/state'
import { EditorView, lineNumbers } from '@codemirror/view'
import { singleActiveLine, singleActiveLineGutter } from '../activeLine'

describe('singleActiveLine and singleActiveLineGutter extensions', () => {
  it('highlights active line when selection is collapsed (cursor only)', () => {
    const parent = document.createElement('div')
    const state = EditorState.create({
      doc: 'SELECT 1;\nSELECT 2;\nSELECT 3;',
      selection: EditorSelection.cursor(12), // line 2 ('SELECT 2;')
      extensions: [lineNumbers(), singleActiveLineGutter, singleActiveLine],
    })
    const view = new EditorView({ state, parent })

    const activeLines = parent.querySelectorAll('.cm-activeLine')
    expect(activeLines.length).toBe(1)
    expect(activeLines[0].textContent).toContain('SELECT 2')

    const activeGutters = parent.querySelectorAll('.cm-activeLineGutter')
    expect(activeGutters.length).toBe(1)
    expect(activeGutters[0].textContent).toBe('2')
    view.destroy()
  })

  it('suppresses active line and gutter highlight when a range is selected', () => {
    const parent = document.createElement('div')
    const state = EditorState.create({
      doc: 'SELECT 1;\nSELECT 2;\nSELECT 3;',
      selection: EditorSelection.range(0, 15), // multi-line range selection
      extensions: [lineNumbers(), singleActiveLineGutter, singleActiveLine],
    })
    const view = new EditorView({ state, parent })

    const activeLines = parent.querySelectorAll('.cm-activeLine')
    expect(activeLines.length).toBe(0)

    const activeGutters = parent.querySelectorAll('.cm-activeLineGutter')
    expect(activeGutters.length).toBe(0)
    view.destroy()
  })

  it('updates highlighted line and gutter when cursor moves', () => {
    const parent = document.createElement('div')
    const state = EditorState.create({
      doc: 'line 1\nline 2\nline 3',
      selection: EditorSelection.cursor(0), // line 1
      extensions: [lineNumbers(), singleActiveLineGutter, singleActiveLine],
    })
    const view = new EditorView({ state, parent })

    let activeLines = parent.querySelectorAll('.cm-activeLine')
    expect(activeLines.length).toBe(1)
    expect(activeLines[0].textContent).toContain('line 1')
    let activeGutters = parent.querySelectorAll('.cm-activeLineGutter')
    expect(activeGutters.length).toBe(1)
    expect(activeGutters[0].textContent).toBe('1')

    // Move cursor to line 3
    view.dispatch({ selection: EditorSelection.cursor(15) })
    activeLines = parent.querySelectorAll('.cm-activeLine')
    expect(activeLines.length).toBe(1)
    expect(activeLines[0].textContent).toContain('line 3')
    activeGutters = parent.querySelectorAll('.cm-activeLineGutter')
    expect(activeGutters.length).toBe(1)
    expect(activeGutters[0].textContent).toBe('3')
    view.destroy()
  })
})
