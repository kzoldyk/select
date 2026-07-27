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
    fontSize: 'var(--editor-font-size, 13px)',
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  },
  '.cm-scroller': {
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    lineHeight: '1.5',
    overflow: 'auto',
  },
  '.cm-content': {
    caretColor: 'var(--editor-cursor, var(--primary, var(--foreground)))',
    padding: '10px 0',
  },
  '.cm-line': {
    lineHeight: '1.5',
  },
  '.cm-cursor': {
    borderLeftColor: 'var(--editor-cursor, var(--primary, var(--foreground)))',
    borderLeftWidth: '2px',
  },
  '.cm-activeLine': {
    backgroundColor: 'var(--editor-active-line, var(--accent))',
    borderLeft: '2px solid var(--ring)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'var(--editor-active-line, var(--accent))',
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
    padding: '0 8px 0 0',
    textAlign: 'right',
    fontSize: '0.85em',
    lineHeight: '1.5',
    color: 'var(--muted-foreground)',
  },
  '.cm-selectionBackground': {
    backgroundColor: 'var(--editor-selection, var(--selection)) !important',
  },
  '&.cm-focused .cm-selectionBackground': {
    backgroundColor: 'var(--editor-selection, var(--selection)) !important',
  },
  '::selection': {
    backgroundColor: 'var(--editor-selection, var(--selection)) !important',
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
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: 'var(--muted)',
    position: 'relative',
    paddingRight: '36px',
  },
  '.cm-button': {
    background: 'var(--background) !important',
    backgroundImage: 'none !important',
    color: 'var(--foreground) !important',
    border: '1px solid var(--border) !important',
    borderRadius: 'var(--radius) !important',
    padding: '0 10px !important',
    fontSize: '11px !important',
    fontWeight: '500 !important',
    cursor: 'pointer !important',
    height: '26px !important',
    display: 'inline-flex !important',
    alignItems: 'center !important',
    justifyContent: 'center !important',
    transition: 'all 150ms ease !important',
    boxShadow: 'none !important',
  },
  '.cm-button:hover': {
    background: 'var(--accent) !important',
    color: 'var(--accent-foreground) !important',
    borderColor: 'var(--border) !important',
  },
  '.cm-button:active': {
    transform: 'scale(0.97) !important',
  },
  '.cm-textfield': {
    background: 'var(--background) !important',
    backgroundImage: 'none !important',
    color: 'var(--foreground) !important',
    border: '1px solid var(--border) !important',
    borderRadius: 'var(--radius) !important',
    padding: '4px 8px !important',
    fontFamily: 'inherit !important',
    fontSize: '12px !important',
    outline: 'none !important',
    minWidth: '160px !important',
    height: '28px !important',
    boxSizing: 'border-box !important',
    transition: 'border-color 150ms ease, box-shadow 150ms ease !important',
  },
  '.cm-textfield:focus': {
    borderColor: 'var(--ring) !important',
    boxShadow: '0 0 0 1px var(--ring) !important',
  },
  '.cm-search label': {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    color: 'var(--muted-foreground)',
    cursor: 'pointer',
    userSelect: 'none',
    marginLeft: '6px',
    marginRight: '6px',
  },
  '.cm-search label input[type="checkbox"]': {
    cursor: 'pointer',
    accentColor: 'var(--primary)',
    margin: '0',
    width: '13px',
    height: '13px',
  },
  '.cm-search button[name="close"]': {
    position: 'absolute',
    right: '12px',
    top: '8px',
    backgroundColor: 'transparent !important',
    backgroundImage: 'none !important',
    border: 'none !important',
    color: 'var(--muted-foreground) !important',
    fontSize: '14px !important',
    width: '24px !important',
    height: '24px !important',
    padding: '0 !important',
    cursor: 'pointer !important',
    display: 'inline-flex !important',
    alignItems: 'center !important',
    justifyContent: 'center !important',
    borderRadius: 'var(--radius) !important',
    boxShadow: 'none !important',
  },
  '.cm-search button[name="close"]:hover': {
    backgroundColor: 'var(--accent) !important',
    color: 'var(--foreground) !important',
  },
})

// Keep backward compatibility exports
export const darkHighlight = dynamicHighlight
export const lightHighlight = dynamicHighlight
export const darkTheme = dynamicTheme
export const lightTheme = dynamicTheme
