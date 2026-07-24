import { HighlightStyle } from '@codemirror/language'
import { EditorView } from '@codemirror/view'
import { tags as t } from '@lezer/highlight'

// Syntax colors for Dark Mode
export const darkHighlight = HighlightStyle.define([
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

  { tag: t.comment,           color: '#6B7280', fontStyle: 'italic' },
  { tag: t.blockComment,      color: '#6B7280', fontStyle: 'italic' },
  { tag: t.lineComment,       color: '#6B7280', fontStyle: 'italic' },

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

// Syntax colors for Light Mode
export const lightHighlight = HighlightStyle.define([
  { tag: t.keyword,           color: '#2563EB' },
  { tag: t.controlKeyword,    color: '#2563EB' },
  { tag: t.operatorKeyword,   color: '#2563EB' },
  { tag: t.definitionKeyword, color: '#2563EB' },
  { tag: t.moduleKeyword,     color: '#2563EB' },

  { tag: t.function(t.name),  color: '#7C3AED' },
  { tag: t.function(t.variableName), color: '#7C3AED' },

  { tag: t.string,            color: '#D97706' },
  { tag: t.special(t.string), color: '#D97706' },

  { tag: t.number,            color: '#DC2626' },
  { tag: t.integer,           color: '#DC2626' },
  { tag: t.float,             color: '#DC2626' },

  { tag: t.operator,          color: '#4B5563' },
  { tag: t.punctuation,       color: '#4B5563' },
  { tag: t.separator,         color: '#4B5563' },

  { tag: t.comment,           color: '#9CA3AF', fontStyle: 'italic' },
  { tag: t.blockComment,      color: '#9CA3AF', fontStyle: 'italic' },
  { tag: t.lineComment,       color: '#9CA3AF', fontStyle: 'italic' },

  { tag: t.typeName,          color: '#0D9488' },
  { tag: t.null,              color: '#0D9488' },

  { tag: t.name,              color: '#111827' },
  { tag: t.variableName,      color: '#111827' },
  { tag: t.propertyName,      color: '#111827' },
  { tag: t.definition(t.name), color: '#111827' },

  { tag: t.namespace,         color: '#0284C7' },
  { tag: t.className,         color: '#0284C7' },

  { tag: t.bool,              color: '#10B981' },

  { tag: t.special(t.variableName), color: '#DB2777' },
])

// Editor theme configuration (dark mode)
export const darkTheme = EditorView.theme({
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
    backgroundColor: 'rgba(255, 255, 255, 0.08) !important',
  },
  '&.cm-focused .cm-selectionBackground': {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
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
    boxShadow: '0 4px 12px rgba(0,0,0,.4)',
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
}, { dark: true })

// Editor theme configuration (light mode)
export const lightTheme = EditorView.theme({
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
    backgroundColor: 'rgba(0, 0, 0, 0.08) !important',
  },
  '&.cm-focused .cm-selectionBackground': {
    backgroundColor: 'rgba(225, 29, 72, 0.12)',
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
    boxShadow: '0 4px 12px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04)',
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
    backgroundColor: 'rgba(225, 29, 72, 0.15)',
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
}, { dark: false })
