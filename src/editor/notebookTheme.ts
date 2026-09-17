import { HighlightStyle } from '@codemirror/language'
import { EditorView } from '@codemirror/view'
import { tags as t } from '@lezer/highlight'

/** Markdown prose highlighting — Obsidian-style, theme-aware. */
export const notebookProseHighlight = HighlightStyle.define([
  { tag: t.heading, color: 'var(--nb-heading, var(--foreground))', fontWeight: '600' },
  { tag: t.heading1, fontSize: '2em', fontWeight: '700', lineHeight: '1.2' },
  { tag: t.heading2, fontSize: '1.5em', fontWeight: '600', lineHeight: '1.25' },
  { tag: t.heading3, fontSize: '1.25em', fontWeight: '600', lineHeight: '1.3' },
  { tag: t.heading4, fontSize: '1.1em', fontWeight: '600' },
  { tag: t.heading5, fontSize: '1.0em', fontWeight: '600', color: 'var(--nb-muted)' },
  { tag: t.heading6, fontSize: '0.9em', fontWeight: '600', color: 'var(--nb-muted)' },
  { tag: t.emphasis, fontStyle: 'italic', color: 'var(--nb-prose)' },
  { tag: t.strong, fontWeight: '700', color: 'var(--nb-prose)' },
  { tag: t.strikethrough, textDecoration: 'line-through', color: 'var(--nb-muted)' },
  { tag: t.link, color: 'var(--link)', textDecoration: 'underline' },
  { tag: t.url, color: 'var(--link)', fontSize: '0.92em' },
  {
    tag: t.monospace,
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    fontSize: '0.88em',
    color: 'var(--syn-keyword)',
    backgroundColor: 'var(--nb-inline-code-bg)',
    borderRadius: '3px',
    padding: '2px 5px',
  },
  { tag: t.quote, color: 'var(--nb-muted)', fontStyle: 'italic' },
  { tag: t.content, color: 'var(--nb-prose)' },
  /* Hide raw markdown formatting chars (**, *, ~~, `) when not active */
  { tag: t.processingInstruction, fontSize: '0' },
])

/** Obsidian-style editor chrome for notebook mode. */
export const notebookEditorTheme = EditorView.theme({

  /* ── Global editor layout ── */
  '&.cm-notebook-mode .cm-content': {
    caretColor: 'var(--editor-cursor, var(--foreground))',
    maxWidth: '750px',
    margin: '0 auto',
    paddingTop: '32px',
    paddingBottom: '60px',
    paddingLeft: '48px',
    paddingRight: '48px',
    boxSizing: 'border-box',
    fontFamily: "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif",
  },
  '&.cm-notebook-mode .cm-scroller': {
    overflowX: 'hidden',
  },
  '&.cm-notebook-mode .cm-line': {
    lineHeight: '1.7',
    padding: '1px 0',
    fontSize: '15px',
  },
  '&.cm-notebook-mode .cm-gutters': {
    display: 'none !important',
  },
  /* Kill active-line band in prose */
  '&.cm-notebook-mode .cm-activeLine': {
    backgroundColor: 'transparent !important',
    borderLeft: 'none !important',
  },
  '&.cm-notebook-mode .cm-activeLineGutter': {
    backgroundColor: 'transparent !important',
  },
  /* Subtle highlight inside active SQL code block line */
  '&.cm-notebook-mode .cm-nb-code-line.cm-activeLine': {
    backgroundColor: 'color-mix(in srgb, var(--nb-code-bg) 80%, var(--foreground)) !important',
  },
  /* Selection color */
  '&.cm-notebook-mode .cm-selectionBackground': {
    backgroundColor: 'var(--editor-selection, color-mix(in srgb, var(--primary) 18%, transparent)) !important',
  },

  /* ── Heading marks — hidden ── */
  '.cm-nb-header-mark': {
    fontSize: '0 !important',
    width: '0',
    overflow: 'hidden',
    opacity: '0',
    userSelect: 'none',
    pointerEvents: 'none',
  },

  /* ── SQL Block ── */
  '.cm-nb-code-header': {
    fontFamily: "'JetBrains Mono', ui-monospace, monospace !important",
    fontSize: '1px !important',
    lineHeight: '0 !important',
    backgroundColor: 'var(--nb-code-bg)',
    borderTopLeftRadius: '8px',
    borderTopRightRadius: '8px',
    borderTop: '1px solid color-mix(in srgb, var(--border) 70%, transparent)',
    borderLeft: '1px solid color-mix(in srgb, var(--border) 70%, transparent)',
    borderRight: '1px solid color-mix(in srgb, var(--border) 70%, transparent)',
    borderBottom: 'none',
    padding: '6px 12px 0 12px !important',
    marginTop: '12px !important',
    color: 'var(--nb-muted)',
    boxSizing: 'border-box',
  },
  '.cm-nb-code-single-line': {
    borderBottomLeftRadius: '8px !important',
    borderBottomRightRadius: '8px !important',
    borderBottom: '1px solid color-mix(in srgb, var(--border) 70%, transparent) !important',
    marginBottom: '12px !important',
  },
  '.cm-nb-code-line': {
    fontFamily: "'JetBrains Mono', ui-monospace, monospace !important",
    fontSize: '13px !important',
    lineHeight: '1.7 !important',
    backgroundColor: 'var(--nb-code-bg)',
    borderLeft: '1px solid color-mix(in srgb, var(--border) 70%, transparent)',
    borderRight: '1px solid color-mix(in srgb, var(--border) 70%, transparent)',
    paddingLeft: '16px !important',
    paddingRight: '16px !important',
    paddingTop: '1px !important',
    paddingBottom: '1px !important',
    boxSizing: 'border-box',
  },
  '.cm-nb-code-footer': {
    backgroundColor: 'var(--nb-code-bg)',
    borderBottomLeftRadius: '8px',
    borderBottomRightRadius: '8px',
    borderBottom: '1px solid color-mix(in srgb, var(--border) 70%, transparent)',
    borderLeft: '1px solid color-mix(in srgb, var(--border) 70%, transparent)',
    borderRight: '1px solid color-mix(in srgb, var(--border) 70%, transparent)',
    padding: '0 12px !important',
    marginBottom: '12px !important',
    height: '8px !important',
    lineHeight: '0 !important',
    fontSize: '0 !important',
    boxSizing: 'border-box',
  },

  /* SQL block header bar — buttons only, top-right */
  '.cm-nb-code-header-bar': {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: '100%',
    padding: '0',
    gap: '2px',
  },
  '.cm-nb-header-right': {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  },
  '.cm-nb-action-btn': {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    border: '1px solid transparent',
    backgroundColor: 'transparent',
    color: 'var(--muted-foreground)',
    cursor: 'pointer',
    transition: 'all 120ms ease',
    padding: '3px 6px',
    fontSize: '10px',
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    lineHeight: '1',
  },
  '.cm-nb-copy-btn': {
    padding: '3px 6px',
    opacity: '0.6',
  },
  '.cm-nb-copy-btn:hover': {
    backgroundColor: 'color-mix(in srgb, var(--foreground) 8%, transparent)',
    color: 'var(--foreground)',
    opacity: '1',
  },
  '.cm-nb-run-btn': {
    backgroundColor: 'var(--primary)',
    color: 'var(--primary-foreground)',
    fontWeight: '600',
    gap: '4px',
    padding: '3px 10px',
    border: 'none',
    fontSize: '10px',
    borderRadius: '4px',
    opacity: '0.9',
  },
  '.cm-nb-run-btn:hover': {
    opacity: '1',
  },
  '.cm-nb-run-btn:active': {
    transform: 'scale(0.97)',
  },
  '.cm-nb-code-footer-bar': {
    height: '0',
    width: '100%',
  },

  /* ── Task list ── */
  '.cm-nb-task-line': {
    paddingLeft: '2px',
  },
  '.cm-nb-task-line--done': {
    color: 'var(--nb-muted)',
    textDecoration: 'line-through',
    textDecorationColor: 'color-mix(in srgb, var(--nb-muted) 50%, transparent)',
    opacity: '0.7',
  },

  /* ── Bullet points ── */
  '.cm-nb-bullet': {
    display: 'inline-block',
    width: '5px',
    height: '5px',
    borderRadius: '50%',
    backgroundColor: 'var(--nb-bullet)',
    marginRight: '10px',
    verticalAlign: 'middle',
    flexShrink: '0',
  },

  /* ── Task checkboxes (Obsidian style) ── */
  '.cm-nb-task-checkbox': {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '16px',
    height: '16px',
    marginRight: '8px',
    verticalAlign: 'middle',
    border: '1.5px solid var(--nb-checkbox-border)',
    borderRadius: '3px',
    background: 'transparent',
    cursor: 'pointer',
    padding: '0',
    flexShrink: '0',
    transition: 'all 120ms ease',
  },
  '.cm-nb-task-checkbox:hover': {
    borderColor: 'var(--primary)',
    background: 'color-mix(in srgb, var(--primary) 10%, transparent)',
  },
  '.cm-nb-task-checkbox:active': {
    transform: 'scale(0.9)',
  },
  '.cm-nb-task-checkbox--checked': {
    background: 'var(--primary)',
    borderColor: 'var(--primary)',
  },
  '.cm-nb-task-checkbox--checked::after': {
    content: '""',
    display: 'block',
    width: '4px',
    height: '8px',
    border: 'solid var(--primary-foreground)',
    borderWidth: '0 2px 2px 0',
    transform: 'rotate(45deg) translate(-1px, -1px)',
  },

  /* ── Headings (Obsidian sizing) ── */
  '.cm-nb-heading-line': {
    color: 'var(--nb-heading, var(--foreground))',
  },
  '.cm-nb-heading-line.cm-nb-heading-1': {
    fontSize: '2em !important',
    fontWeight: '700 !important',
    letterSpacing: '-0.025em',
    lineHeight: '1.2 !important',
    marginTop: '28px !important',
    marginBottom: '4px !important',
    paddingBottom: '8px !important',
    borderBottom: '1px solid color-mix(in srgb, var(--border) 40%, transparent)',
  },
  '.cm-nb-heading-line.cm-nb-heading-2': {
    fontSize: '1.5em !important',
    fontWeight: '600 !important',
    letterSpacing: '-0.015em',
    lineHeight: '1.25 !important',
    marginTop: '24px !important',
    marginBottom: '4px !important',
  },
  '.cm-nb-heading-line.cm-nb-heading-3': {
    fontSize: '1.25em !important',
    fontWeight: '600 !important',
    lineHeight: '1.3 !important',
    marginTop: '20px !important',
    marginBottom: '2px !important',
  },
  '.cm-nb-heading-line.cm-nb-heading-4': {
    fontSize: '1.1em !important',
    fontWeight: '600 !important',
    lineHeight: '1.35 !important',
    marginTop: '16px !important',
    marginBottom: '2px !important',
  },
  '.cm-nb-heading-line.cm-nb-heading-5': {
    fontSize: '1.0em !important',
    fontWeight: '600 !important',
    marginTop: '14px !important',
    color: 'var(--nb-muted)',
  },
  '.cm-nb-heading-line.cm-nb-heading-6': {
    fontSize: '0.9em !important',
    fontWeight: '600 !important',
    marginTop: '12px !important',
    color: 'var(--nb-muted)',
  },

  /* ── Blockquote ── */
  '.cm-nb-blockquote': {
    borderLeft: '3px solid var(--primary)',
    paddingLeft: '14px !important',
    color: 'var(--nb-muted)',
    fontStyle: 'italic',
  },

  /* ── Horizontal divider ── */
  '.cm-nb-divider': {
    border: 'none',
    borderTop: '1px solid color-mix(in srgb, var(--border) 50%, transparent)',
    margin: '20px 0',
    display: 'block',
    width: '100%',
  },
  '.cm-nb-paragraph-gap': {
    minHeight: '0.3em',
  },

  /* ── Emphasis mark hiding (**, *, ~~) ── */
  '.cm-nb-em-mark': {
    fontSize: '0 !important',
    width: '0',
    display: 'inline',
    overflow: 'hidden',
    color: 'transparent',
  },

  /* ── Slash Command Menu ── */
  '&.cm-notebook-mode .cm-tooltip-autocomplete': {
    backgroundColor: 'var(--popover)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.3)',
    padding: '4px',
    minWidth: '260px',
  },
  '&.cm-notebook-mode .cm-tooltip-autocomplete ul': {
    maxHeight: '260px',
  },
  '&.cm-notebook-mode .cm-tooltip-autocomplete ul li': {
    padding: '6px 10px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    transition: 'background-color 80ms ease',
  },
  '&.cm-notebook-mode .cm-tooltip-autocomplete ul li[aria-selected]': {
    backgroundColor: 'var(--accent)',
    color: 'var(--accent-foreground)',
  },
  '&.cm-notebook-mode .cm-completionLabel': {
    fontWeight: '600',
    fontSize: '12px',
  },
  '&.cm-notebook-mode .cm-completionDetail': {
    fontSize: '11px',
    color: 'var(--muted-foreground)',
    fontStyle: 'normal',
    marginLeft: 'auto',
  },

  /* ── Dead CSS cleanup (no longer used but kept for safety) ── */
  '.cm-nb-header-left': { display: 'none' },
  '.cm-nb-code-icon': { display: 'none' },
  '.cm-nb-sql-label': { display: 'none' },
})
