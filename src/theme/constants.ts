import { Theme, ThemeColors, ThemeCategory } from './types'

export const DEFAULT_DARK_SYNTAX = {
  syntaxKeyword: '#93C5FD',
  syntaxFunction: '#34D399',
  syntaxString: '#FCD34D',
  syntaxNumber: '#FCA5A5',
  syntaxOperator: '#F9A8D4',
  syntaxComment: '#6B7280',
  syntaxType: '#C4B5FD',
  syntaxSchema: '#67E8F9',
  syntaxIdentifier: '#E5E7EB',
}

export const DEFAULT_LIGHT_SYNTAX = {
  syntaxKeyword: '#2563EB',
  syntaxFunction: '#7C3AED',
  syntaxString: '#D97706',
  syntaxNumber: '#DC2626',
  syntaxOperator: '#4B5563',
  syntaxComment: '#9CA3AF',
  syntaxType: '#0D9488',
  syntaxSchema: '#0284C7',
  syntaxIdentifier: '#111827',
}

export function defineTheme(options: {
  id: string
  name: string
  author?: string
  version?: string
  category: ThemeCategory
  description?: string
  preview?: {
    primary: string
    secondary: string
    accent: string
    background: string
  }
  colors: Partial<ThemeColors> & {
    background: string
    text: string
    primary: string
    secondary: string
    accent: string
  }
}): Theme {
  const isDarkCategory = [
    'Dark',
    'OLED',
    'Retro',
    'Synthwave',
    'Cyberpunk',
    'Terminal',
  ].includes(options.category)

  const defaultSyntax = isDarkCategory ? DEFAULT_DARK_SYNTAX : DEFAULT_LIGHT_SYNTAX

  const colors: ThemeColors = {
    // Basic backgrounds
    background: options.colors.background,
    backgroundSecondary: options.colors.backgroundSecondary ?? (isDarkCategory ? '#111113' : '#F4F4F5'),
    backgroundElevated: options.colors.backgroundElevated ?? (isDarkCategory ? '#1E1E22' : '#FFFFFF'),

    // Surfaces
    surface: options.colors.surface ?? (isDarkCategory ? '#151517' : '#FFFFFF'),
    surfaceHover: options.colors.surfaceHover ?? (isDarkCategory ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'),
    surfaceActive: options.colors.surfaceActive ?? (isDarkCategory ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),

    // Borders
    border: options.colors.border ?? (isDarkCategory ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'),
    borderLight: options.colors.borderLight ?? options.colors.border ?? (isDarkCategory ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'),

    // Texts
    text: options.colors.text,
    textMuted: options.colors.textMuted ?? (isDarkCategory ? '#71717A' : '#71717A'),
    textDisabled: options.colors.textDisabled ?? (isDarkCategory ? '#3F3F46' : '#D4D4D8'),

    // Branding / Accent
    primary: options.colors.primary,
    primaryForeground: options.colors.primaryForeground ?? (isDarkCategory ? '#FAFAFA' : '#FAFAFA'),
    secondary: options.colors.secondary,
    secondaryForeground: options.colors.secondaryForeground ?? (isDarkCategory ? '#FAFAFA' : '#0B0B0C'),
    accent: options.colors.accent,
    accentForeground: options.colors.accentForeground ?? (isDarkCategory ? '#FAFAFA' : '#0B0B0C'),

    // Statuses
    success: options.colors.success ?? '#10B981',
    warning: options.colors.warning ?? '#F59E0B',
    danger: options.colors.danger ?? '#EF4444',
    destructiveForeground: options.colors.destructiveForeground ?? '#FAFAFA',
    info: options.colors.info ?? '#3B82F6',

    // Selection
    selection: options.colors.selection ?? `${options.colors.primary}35`,

    // Scrollbars
    scrollbar: options.colors.scrollbar ?? (isDarkCategory ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'),
    scrollbarHover: options.colors.scrollbarHover ?? (isDarkCategory ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)'),

    // Shadows
    shadow: options.colors.shadow ?? (isDarkCategory ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.05)'),
    shadowSoft: options.colors.shadowSoft ?? (isDarkCategory ? '0 2px 8px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.04)'),
    shadowMedium: options.colors.shadowMedium ?? (isDarkCategory ? '0 4px 16px rgba(0,0,0,0.5)' : '0 4px 16px rgba(0,0,0,0.08)'),
    shadowHeavy: options.colors.shadowHeavy ?? (isDarkCategory ? '0 8px 32px rgba(0,0,0,0.6)' : '0 8px 32px rgba(0,0,0,0.12)'),
    shadowGlow: options.colors.shadowGlow ?? `0 0 12px ${options.colors.primary}40`,

    // Interactive
    focusRing: options.colors.focusRing ?? `${options.colors.primary}50`,
    link: options.colors.link ?? options.colors.primary,

    // Tooltips
    tooltipBackground: options.colors.tooltipBackground ?? (isDarkCategory ? '#1E1E22' : '#111827'),
    tooltipText: options.colors.tooltipText ?? (isDarkCategory ? '#FAFAFA' : '#FAFAFA'),

    // Editor Syntax Highlight Defaults
    syntaxKeyword: options.colors.syntaxKeyword ?? defaultSyntax.syntaxKeyword,
    syntaxFunction: options.colors.syntaxFunction ?? defaultSyntax.syntaxFunction,
    syntaxString: options.colors.syntaxString ?? defaultSyntax.syntaxString,
    syntaxNumber: options.colors.syntaxNumber ?? defaultSyntax.syntaxNumber,
    syntaxOperator: options.colors.syntaxOperator ?? defaultSyntax.syntaxOperator,
    syntaxComment: options.colors.syntaxComment ?? defaultSyntax.syntaxComment,
    syntaxType: options.colors.syntaxType ?? defaultSyntax.syntaxType,
    syntaxSchema: options.colors.syntaxSchema ?? defaultSyntax.syntaxSchema,
    syntaxIdentifier: options.colors.syntaxIdentifier ?? defaultSyntax.syntaxIdentifier,
  }

  // Set editor colors if missing (so they match background/foreground automatically)
  colors.editorBackground = options.colors.editorBackground ?? colors.background
  colors.editorForeground = options.colors.editorForeground ?? colors.text
  colors.editorSelection = options.colors.editorSelection ?? colors.selection
  colors.editorLineNumber = options.colors.editorLineNumber ?? colors.textMuted
  colors.editorLineNumberActive = options.colors.editorLineNumberActive ?? colors.text
  colors.editorActiveLine = options.colors.editorActiveLine ?? colors.surfaceHover
  colors.editorCursor = options.colors.editorCursor ?? colors.primary
  colors.editorBracketMatching = options.colors.editorBracketMatching ?? colors.surfaceActive
  colors.editorIndentGuide = options.colors.editorIndentGuide ?? colors.border
  colors.editorWhitespace = options.colors.editorWhitespace ?? colors.borderLight

  // Auto-build preview if not provided
  const preview = options.preview ?? {
    primary: colors.primary,
    secondary: colors.secondary,
    accent: colors.accent,
    background: colors.background,
  }

  return {
    id: options.id,
    name: options.name,
    author: options.author ?? 'Select Team',
    version: options.version ?? '1.0.0',
    category: options.category,
    description: options.description ?? `A premium ${options.category.toLowerCase()} theme.`,
    preview,
    colors,
  }
}
