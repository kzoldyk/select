import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { EditorView } from '@codemirror/view'
import { tags as t } from '@lezer/highlight'

export const sqlHighlight = HighlightStyle.define([
  { tag: t.keyword,           color: '#93C5FD' },
  { tag: t.controlKeyword,    color: '#93C5FD' },
  { tag: t.operatorKeyword,   color: '#93C5FD' },
  { tag: t.definitionKeyword, color: '#93C5FD' },
  { tag: t.moduleKeyword,     color: '#93C5FD' },

  { tag: t.function(t.name),  color: '#34D399' },
  { tag: t.function(t.variableName), color: '#34D399' },

  { tag: t.string,            color: '#FCD34D' },
  { tag: t.special(t.string), color: '#FCD34D' },

  { tag: t.number,            color: '#FCA5A5' },
  { tag: t.integer,           color: '#FCA5A5' },
  { tag: t.float,             color: '#FCA5A5' },

  { tag: t.operator,          color: '#F9A8D4' },
  { tag: t.punctuation,       color: '#F9A8D4' },
  { tag: t.separator,         color: '#F9A8D4' },

  { tag: t.comment,           color: '#4B5563', fontStyle: 'italic' },
  { tag: t.blockComment,      color: '#4B5563', fontStyle: 'italic' },
  { tag: t.lineComment,       color: '#4B5563', fontStyle: 'italic' },

  { tag: t.typeName,          color: '#C4B5FD' },
  { tag: t.null,              color: '#C4B5FD' },

  { tag: t.name,              color: '#E5E7EB' },
  { tag: t.variableName,      color: '#E5E7EB' },
  { tag: t.propertyName,      color: '#E5E7EB' },
  { tag: t.definition(t.name), color: '#E5E7EB' },

  { tag: t.namespace,         color: '#67E8F9' },
  { tag: t.className,         color: '#67E8F9' },

  { tag: t.bool,              color: '#34D399' },

  { tag: t.special(t.variableName), color: '#F9A8D4' },
])

export const sqlSyntaxHighlighting = syntaxHighlighting(sqlHighlight)

export const darkTheme = EditorView.theme({
  '&': {
    backgroundColor: 'hsl(var(--background))',
    color: 'hsl(var(--foreground))',
    height: '100%',
    fontSize: '12px',
    fontFamily: "'JetBrains Mono', monospace",
  },
  '.cm-scroller': {
    fontFamily: "'JetBrains Mono', monospace",
    lineHeight: '18px',
    overflow: 'auto',
  },
  '.cm-content': {
    caretColor: 'hsl(var(--foreground))',
    padding: '10px 0',
  },
  '.cm-cursor': {
    borderLeftColor: 'hsl(var(--foreground))',
    borderLeftWidth: '2px',
  },
  '.cm-activeLine': {
    backgroundColor: 'hsl(var(--accent))',
    borderLeft: '2px solid hsl(var(--ring))',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'hsl(var(--accent))',
  },
  '.cm-gutters': {
    backgroundColor: 'hsl(var(--background))',
    borderRight: '1px solid hsl(var(--border))',
    color: 'hsl(var(--muted-foreground))',
    minWidth: '36px',
  },
  '.cm-lineNumbers': {
    color: 'hsl(var(--muted-foreground))',
    minWidth: '36px',
  },
  '.cm-lineNumbers .cm-gutterElement': {
    padding: '0 4px 0 0',
    textAlign: 'right',
    fontSize: '11px',
    lineHeight: '18px',
    color: 'hsl(var(--muted-foreground))',
  },
  '.cm-selectionBackground': {
    backgroundColor: 'hsl(var(--muted)) !important',
  },
  '&.cm-focused .cm-selectionBackground': {
    backgroundColor: 'hsl(var(--accent))',
  },
  '.cm-selectionMatch': {
    backgroundColor: 'hsl(var(--accent))',
  },
  '.cm-matchingBracket': {
    backgroundColor: 'hsl(var(--muted))',
    color: 'hsl(var(--foreground)) !important',
    borderRadius: '2px',
  },
  '.cm-tooltip': {
    backgroundColor: 'hsl(var(--popover))',
    border: '1px solid hsl(var(--border))',
    borderRadius: 'var(--radius)',
    boxShadow: '0 4px 12px rgba(0,0,0,.4)',
    color: 'hsl(var(--popover-foreground))',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '11px',
  },
  '.cm-tooltip-autocomplete': {
    backgroundColor: 'hsl(var(--popover))',
    border: '1px solid hsl(var(--border))',
    borderRadius: 'var(--radius)',
  },
  '.cm-tooltip-autocomplete ul': {
    maxHeight: '180px',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '11px',
  },
  '.cm-tooltip-autocomplete ul li': {
    padding: '3px 10px',
    color: 'hsl(var(--muted-foreground))',
  },
  '.cm-tooltip-autocomplete ul li[aria-selected]': {
    backgroundColor: 'hsl(var(--accent))',
    color: 'hsl(var(--accent-foreground))',
  },
  '.cm-completionIcon': {
    display: 'none',
  },
  '.cm-completionLabel': {
    fontFamily: "'JetBrains Mono', monospace",
  },
  '.cm-completionDetail': {
    color: 'hsl(var(--muted-foreground))',
    fontStyle: 'italic',
    marginLeft: '8px',
  },
  '.cm-foldPlaceholder': {
    backgroundColor: 'hsl(var(--accent))',
    border: '1px solid hsl(var(--border))',
    color: 'hsl(var(--muted-foreground))',
    borderRadius: '3px',
    padding: '0 4px',
  },
  '.cm-panels': {
    backgroundColor: 'hsl(var(--muted))',
    borderTop: '1px solid hsl(var(--border))',
  },
  '.cm-searchMatch': {
    backgroundColor: 'hsl(var(--primary) / 0.2)',
    borderRadius: '2px',
  },
  '.cm-searchMatch.cm-searchMatch-selected': {
    backgroundColor: 'hsl(var(--primary))',
    color: 'hsl(var(--primary-foreground))',
  },
  '.cm-search': {
    backgroundColor: 'hsl(var(--muted))',
    padding: '6px 10px',
  },
  '.cm-search input': {
    backgroundColor: 'hsl(var(--background))',
    border: '1px solid hsl(var(--border))',
    color: 'hsl(var(--foreground))',
    borderRadius: 'var(--radius)',
    padding: '2px 6px',
    fontFamily: "'Inter', sans-serif",
    fontSize: '11px',
  },
  '.cm-search button': {
    backgroundColor: 'hsl(var(--primary))',
    color: 'hsl(var(--primary-foreground))',
    border: 'none',
    borderRadius: 'var(--radius)',
    padding: '2px 8px',
    marginLeft: '4px',
    fontSize: '11px',
    cursor: 'pointer',
  },
}, { dark: true })
