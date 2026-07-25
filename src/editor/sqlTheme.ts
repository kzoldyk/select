import { HighlightStyle } from '@codemirror/language'
import { EditorView } from '@codemirror/view'
import { tags as t } from '@lezer/highlight'

// Dynamic highlighting style using CSS Variables from active theme
export const dynamicHighlight = HighlightStyle.define([
  { tag: t.keyword,           color: 'var(--syn-keyword)' },
  { tag: t.controlKeyword,    color: 'var(--syn-keyword)' },
  { tag: t.operatorKeyword,   color: 'var(--syn-keyword)' },
  { tag: t.definitionKeyword, color: 'var(--syn-keyword)' },
  { tag: t.moduleKeyword,     color: 'var(--syn-keyword)' },

  { tag: t.function(t.name),  color: 'var(--syn-fn)' },
  { tag: t.function(t.variableName), color: 'var(--syn-fn)' },

  { tag: t.string,            color: 'var(--syn-string)' },
  { tag: t.special(t.string), color: 'var(--syn-string)' },

  { tag: t.number,            color: 'var(--syn-number)' },
  { tag: t.integer,           color: 'var(--syn-number)' },
  { tag: t.float,             color: 'var(--syn-number)' },

  { tag: t.operator,          color: 'var(--syn-op)' },
  { tag: t.punctuation,       color: 'var(--syn-op)' },
  { tag: t.separator,         color: 'var(--syn-op)' },

  { tag: t.comment,           color: 'var(--syn-comment)', fontStyle: 'italic' },
  { tag: t.blockComment,      color: 'var(--syn-comment)', fontStyle: 'italic' },
  { tag: t.lineComment,       color: 'var(--syn-comment)', fontStyle: 'italic' },

  { tag: t.typeName,          color: 'var(--syn-type)' },
  { tag: t.null,              color: 'var(--syn-type)' },

  { tag: t.name,              color: 'var(--syn-ident)' },
  { tag: t.variableName,      color: 'var(--syn-ident)' },
  { tag: t.propertyName,      color: 'var(--syn-ident)' },
  { tag: t.definition(t.name), color: 'var(--syn-ident)' },

  { tag: t.namespace,         color: 'var(--syn-schema)' },
  { tag: t.className,         color: 'var(--syn-schema)' },

  { tag: t.bool,              color: 'var(--syn-fn)' },

  { tag: t.special(t.variableName), color: 'var(--syn-op)' },
])

// Dynamic theme configuration using CSS Variables from active theme
export const dynamicTheme = EditorView.theme({
  '&': {
    backgroundColor: 'var(--background)',
    color: 'var(--foreground)',
    height: '100%',
    fontSize: '12px',
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  },
  '.cm-scroller': {
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    lineHeight: '18px',
    overflow: 'auto',
  },
  '.cm-content': {
    caretColor: 'var(--foreground)',
    padding: '10px 0',
  },
  '.cm-cursor': {
    borderLeftColor: 'var(--foreground)',
    borderLeftWidth: '2px',
  },
  '.cm-activeLine': {
    backgroundColor: 'var(--accent)',
    borderLeft: '2px solid var(--ring)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'var(--accent)',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--background)',
    borderRight: '1px solid var(--border)',
    color: 'var(--muted-foreground)',
    minWidth: '36px',
  },
  '.cm-lineNumbers': {
    color: 'var(--muted-foreground)',
    minWidth: '36px',
  },
  '.cm-lineNumbers .cm-gutterElement': {
    padding: '0 4px 0 0',
    textAlign: 'right',
    fontSize: '11px',
    lineHeight: '18px',
    color: 'var(--muted-foreground)',
  },
  '.cm-selectionBackground': {
    backgroundColor: 'var(--selection) !important',
    opacity: '0.3',
  },
  '&.cm-focused .cm-selectionBackground': {
    backgroundColor: 'var(--selection)',
    opacity: '0.45',
  },
  '.cm-selectionMatch': {
    backgroundColor: 'var(--accent)',
  },
  '.cm-matchingBracket': {
    backgroundColor: 'var(--muted)',
    color: 'var(--foreground) !important',
    borderRadius: '2px',
  },
  '.cm-tooltip': {
    backgroundColor: 'var(--popover)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow-medium)',
    color: 'var(--popover-foreground)',
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    fontSize: '11px',
  },
  '.cm-tooltip-autocomplete': {
    backgroundColor: 'var(--popover)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
  },
  '.cm-tooltip-autocomplete ul': {
    maxHeight: '180px',
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    fontSize: '11px',
  },
  '.cm-tooltip-autocomplete ul li': {
    padding: '3px 10px',
    color: 'var(--muted-foreground)',
  },
  '.cm-tooltip-autocomplete ul li[aria-selected]': {
    backgroundColor: 'var(--accent)',
    color: 'var(--accent-foreground)',
  },
  '.cm-completionIcon': {
    display: 'none',
  },
  '.cm-completionLabel': {
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  },
  '.cm-completionDetail': {
    color: 'var(--muted-foreground)',
    fontStyle: 'italic',
    marginLeft: '8px',
  },
  '.cm-foldPlaceholder': {
    backgroundColor: 'var(--accent)',
    border: '1px solid var(--border)',
    color: 'var(--muted-foreground)',
    borderRadius: '3px',
    padding: '0 4px',
  },
  '.cm-panels': {
    backgroundColor: 'var(--muted)',
    borderTop: '1px solid var(--border)',
  },
  '.cm-searchMatch': {
    backgroundColor: 'rgba(225, 29, 72, 0.25)',
    borderRadius: '2px',
  },
  '.cm-searchMatch.cm-searchMatch-selected': {
    backgroundColor: 'var(--primary)',
    color: 'var(--primary-foreground)',
  },
  '.cm-search': {
    backgroundColor: 'var(--muted)',
    padding: '6px 10px',
  },
  '.cm-search input': {
    backgroundColor: 'var(--background)',
    border: '1px solid var(--border)',
    color: 'var(--foreground)',
    borderRadius: 'var(--radius)',
    padding: '2px 6px',
    fontFamily: "'Inter', sans-serif",
    fontSize: '11px',
  },
  '.cm-search button': {
    backgroundColor: 'var(--primary)',
    color: 'var(--primary-foreground)',
    border: 'none',
    borderRadius: 'var(--radius)',
    padding: '2px 8px',
    marginLeft: '4px',
    fontSize: '11px',
    cursor: 'pointer',
  },
})

// Keep backward compatibility exports
export const darkHighlight = dynamicHighlight
export const lightHighlight = dynamicHighlight
export const darkTheme = dynamicTheme
export const lightTheme = dynamicTheme
