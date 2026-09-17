import type { CompletionContext, CompletionResult } from '@codemirror/autocomplete'

/**
 * Provides Notion/Obsidian style slash commands when typing '/' at the start of a line in notebook mode.
 */
export function notebookSlashCommands(context: CompletionContext, mode: 'sql' | 'notebook'): CompletionResult | null {
  if (mode !== 'notebook') return null

  const line = context.state.doc.lineAt(context.pos)
  const textBefore = line.text.slice(0, context.pos - line.from)

  // Must match '/' at start of line (or leading whitespace followed by '/')
  const match = textBefore.match(/^\s*\/(\w*)$/)
  if (!match) return null

  const word = match[1]
  const slashPos = line.from + textBefore.lastIndexOf('/')

  const commands = [
    {
      label: '/sql',
      displayLabel: 'SQL Query Block',
      detail: 'Interactive query with Run & Copy',
      type: 'keyword',
      boost: 10,
      apply: (view: any, _completion: any, from: number, to: number) => {
        const insert = '```sql\n\n```\n'
        view.dispatch({
          changes: { from, to, insert },
          selection: { anchor: from + 7 }, // place cursor inside the fence
        })
      },
    },
    {
      label: '/query',
      displayLabel: 'SQL Query Block',
      detail: 'Interactive query with Run & Copy',
      type: 'keyword',
      boost: 9,
      apply: (view: any, _completion: any, from: number, to: number) => {
        const insert = '```sql\n\n```\n'
        view.dispatch({
          changes: { from, to, insert },
          selection: { anchor: from + 7 },
        })
      },
    },
    {
      label: '/todo',
      displayLabel: 'To-do List',
      detail: 'Track tasks with a checkbox (- [ ])',
      type: 'text',
      boost: 8,
      apply: (view: any, _completion: any, from: number, to: number) => {
        const insert = '- [ ] '
        view.dispatch({
          changes: { from, to, insert },
          selection: { anchor: from + insert.length },
        })
      },
    },
    {
      label: '/task',
      displayLabel: 'To-do List',
      detail: 'Track tasks with a checkbox (- [ ])',
      type: 'text',
      boost: 8,
      apply: (view: any, _completion: any, from: number, to: number) => {
        const insert = '- [ ] '
        view.dispatch({
          changes: { from, to, insert },
          selection: { anchor: from + insert.length },
        })
      },
    },
    {
      label: '/bullet',
      displayLabel: 'Bulleted List',
      detail: 'Create a simple bulleted list (- )',
      type: 'text',
      boost: 7,
      apply: (view: any, _completion: any, from: number, to: number) => {
        const insert = '- '
        view.dispatch({
          changes: { from, to, insert },
          selection: { anchor: from + insert.length },
        })
      },
    },
    {
      label: '/list',
      displayLabel: 'Bulleted List',
      detail: 'Create a simple bulleted list (- )',
      type: 'text',
      boost: 7,
      apply: (view: any, _completion: any, from: number, to: number) => {
        const insert = '- '
        view.dispatch({
          changes: { from, to, insert },
          selection: { anchor: from + insert.length },
        })
      },
    },
    {
      label: '/numbered',
      displayLabel: 'Numbered List',
      detail: 'Create a list with numbering (1. )',
      type: 'text',
      boost: 6,
      apply: (view: any, _completion: any, from: number, to: number) => {
        const insert = '1. '
        view.dispatch({
          changes: { from, to, insert },
          selection: { anchor: from + insert.length },
        })
      },
    },
    {
      label: '/h1',
      displayLabel: 'Heading 1',
      detail: 'Big section heading (# )',
      type: 'text',
      boost: 5,
      apply: (view: any, _completion: any, from: number, to: number) => {
        const insert = '# '
        view.dispatch({
          changes: { from, to, insert },
          selection: { anchor: from + insert.length },
        })
      },
    },
    {
      label: '/h2',
      displayLabel: 'Heading 2',
      detail: 'Medium section heading (## )',
      type: 'text',
      boost: 4,
      apply: (view: any, _completion: any, from: number, to: number) => {
        const insert = '## '
        view.dispatch({
          changes: { from, to, insert },
          selection: { anchor: from + insert.length },
        })
      },
    },
    {
      label: '/h3',
      displayLabel: 'Heading 3',
      detail: 'Small section heading (### )',
      type: 'text',
      boost: 3,
      apply: (view: any, _completion: any, from: number, to: number) => {
        const insert = '### '
        view.dispatch({
          changes: { from, to, insert },
          selection: { anchor: from + insert.length },
        })
      },
    },
    {
      label: '/quote',
      displayLabel: 'Quote',
      detail: 'Capture a quote (> )',
      type: 'text',
      boost: 2,
      apply: (view: any, _completion: any, from: number, to: number) => {
        const insert = '> '
        view.dispatch({
          changes: { from, to, insert },
          selection: { anchor: from + insert.length },
        })
      },
    },
    {
      label: '/divider',
      displayLabel: 'Divider',
      detail: 'Visually divide blocks (---)',
      type: 'text',
      boost: 1,
      apply: (view: any, _completion: any, from: number, to: number) => {
        const insert = '---\n'
        view.dispatch({
          changes: { from, to, insert },
          selection: { anchor: from + insert.length },
        })
      },
    },
  ]

  const filtered = commands.filter(c => c.label.slice(1).toLowerCase().startsWith(word.toLowerCase()))
  if (filtered.length === 0) return null

  return {
    from: slashPos,
    options: filtered,
  }
}
