export type ThemeCategory =
  | 'Dark'
  | 'Light'
  | 'OLED'
  | 'Retro'
  | 'High Contrast'
  | 'Pastel'
  | 'Nature'
  | 'Synthwave'
  | 'Minimal'
  | 'Terminal'
  | 'Cyberpunk'
  | 'Community'

export interface ThemeColors {
  background: string
  backgroundSecondary: string
  backgroundElevated: string

  surface: string
  surfaceHover: string
  surfaceActive: string

  border: string
  borderLight: string

  text: string
  textMuted: string
  textDisabled: string

  primary: string
  primaryForeground: string
  secondary: string
  secondaryForeground: string
  accent: string
  accentForeground: string

  success: string
  warning: string
  danger: string
  destructiveForeground: string
  info: string

  selection: string

  scrollbar: string
  scrollbarHover: string

  shadow: string
  shadowSoft?: string
  shadowMedium?: string
  shadowHeavy?: string
  shadowGlow?: string

  focusRing: string

  link: string

  tooltipBackground: string
  tooltipText: string

  // Syntax colors for CodeMirror / Monaco
  syntaxKeyword: string
  syntaxFunction: string
  syntaxString: string
  syntaxNumber: string
  syntaxOperator: string
  syntaxComment: string
  syntaxType: string
  syntaxSchema: string
  syntaxIdentifier: string
}

export interface Theme {
  id: string
  name: string
  author: string
  version: string
  category: ThemeCategory
  description: string
  preview: {
    primary: string
    secondary: string
    accent: string
    background: string
  }
  colors: ThemeColors
}
