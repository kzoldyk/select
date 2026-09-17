import type { EditorState } from '@codemirror/state'
import { getStatementAtPosition, splitSqlStatements } from './sqlScope'

/**
 * Heuristic: does content look like an intentional notebook (not plain SQL)?
 * Used only for explicit opt-in validation — never auto-switches editor mode.
 * MySQL `# comments` and lone `#` must NOT trigger notebook mode.
 */
export function isNotebookDocument(doc: string): boolean {
  if (!doc.trim()) return false
  // Require fenced SQL blocks — the hallmark of our notebook format
  if (!/```(?:sql)?\s*\n[\s\S]*?```/.test(doc)) return false
  // And at least one prose marker (heading or task), not just fences
  return /^(#{1,6}\s.|- \[[ xX]\])/m.test(doc) || /\n(#{1,6}\s.|- \[[ xX]\])/m.test(doc)
}

/**
 * Does the document contain runnable SQL queries?
 * Checks for standard SQL statement starters (at start of line, document, or after semicolon).
 */
export function hasSqlQueries(doc: string): boolean {
  return /(?:^|[\r\n;])\s*(SELECT|WITH|INSERT\s+INTO|INSERT|UPDATE|DELETE\s+FROM|DELETE|CREATE\s+TABLE|CREATE\s+VIEW|CREATE\s+INDEX|CREATE\s+DATABASE|CREATE|ALTER\s+TABLE|ALTER|DROP\s+TABLE|DROP|SHOW\s+TABLES|SHOW\s+DATABASES|SHOW|DESCRIBE\s+\w+|DESC\s+\w+|EXPLAIN\s+|USE\s+\w+|SET\s+|CALL\s+|TRUNCATE|REPLACE|GRANT|REVOKE|BEGIN|COMMIT|ROLLBACK)\b/im.test(doc)
}

/**
 * Heuristically detect whether document is hybrid markdown notes & SQL or pure SQL.
 * - Detects markdown headers (#, ##, ###), checkboxes (- [ ], - [x]), code fences (```sql),
 *   bullet lists (- item), or dividers (---).
 * - Pure SQL scripts (using standard SQL comments like -- or /*) remain in 'sql' mode.
 */
export function detectDocumentFormat(doc: string): 'sql' | 'notebook' {
  const trimmed = doc.trim()
  if (!trimmed) return 'sql'

  // 1. Fenced blocks (```sql or ```) are 100% notebook
  if (/```(?:sql)?\s*\n[\s\S]*?```/.test(doc)) {
    return 'notebook'
  }

  // 2. Interactive task checkboxes (- [ ] or - [x] or * [ ]) are 100% notebook
  if (/^(\s*[-*+]\s+\[[ xX]\])/m.test(doc)) {
    return 'notebook'
  }

  // 3. Bullet lists (- item, not SQL -- comments and not SQL * asterisk)
  const hasBullets = /^\s*-(?!--)\s+\S/m.test(doc)

  // 4. Horizontal dividers (--- on its own line)
  const hasDividers = /^\s*---\s*$/m.test(doc)

  // 5. Blockquotes (> quote)
  const hasBlockquotes = /^\s*>\s+\S/m.test(doc)

  // Rich markdown prose elements make it a notebook even if SQL queries exist
  if (hasBullets || hasDividers || hasBlockquotes) {
    return 'notebook'
  }

  // 6. Markdown headings (# Heading, ## Heading)
  const hasHeadings = /^#{1,6}\s+\S/m.test(doc)

  // If there are headings and NO SQL queries, it is a markdown notes document
  if (hasHeadings && !hasSqlQueries(doc)) {
    return 'notebook'
  }

  // If document contains SQL queries and only # lines (common MySQL dump/script comments),
  // stay in pure SQL mode unless a tab format or rich markdown was set.
  return 'sql'
}

export interface SqlFenceBlock {
  fenceStart: number
  fenceEnd: number
  contentStart: number
  contentEnd: number
  lang: string
  sql: string
}

/** Find all fenced code blocks (```lang ... ```) in a document. */
export function findSqlFences(doc: string): SqlFenceBlock[] {
  const blocks: SqlFenceBlock[] = []
  const re = /```(\S*)\s*\n([\s\S]*?)```/g
  let match: RegExpExecArray | null
  while ((match = re.exec(doc)) !== null) {
    const lang = (match[1] || 'sql').toLowerCase()
    if (lang !== 'sql' && lang !== '') continue
    const fenceStart = match.index
    const fenceEnd = match.index + match[0].length
    const openLineEnd = doc.indexOf('\n', fenceStart)
    const contentStart = openLineEnd + 1
    const contentEnd = fenceEnd - 3
    blocks.push({
      fenceStart,
      fenceEnd,
      contentStart,
      contentEnd,
      lang,
      sql: match[2].replace(/\n$/, ''),
    })
  }
  return blocks
}

/** Return the SQL fence block containing `pos`, if any. */
export function getSqlFenceAtPos(doc: string, pos: number): SqlFenceBlock | null {
  for (const block of findSqlFences(doc)) {
    if (pos >= block.contentStart && pos <= block.contentEnd) return block
  }
  return null
}

/**
 * Extract a raw SQL statement around pos in a document that may contain markdown notes.
 * Scans backwards to find statement start and forwards to find semicolon or markdown boundary.
 */
export function extractRawSqlAtPos(doc: string, pos: number): string | null {
  const lines = doc.split('\n')
  let curOffset = 0
  let targetLineIdx = -1

  for (let i = 0; i < lines.length; i++) {
    const lineLen = lines[i].length + 1 // +1 for \n
    if (pos >= curOffset && pos <= curOffset + lines[i].length) {
      targetLineIdx = i
      break
    }
    curOffset += lineLen
  }

  if (targetLineIdx === -1) return null

  const isMarkdownLine = (l: string) => /^(#{1,6}\s|[-*+]\s+\[[ xX]\]|[-*+]\s+|```|>|---)/.test(l.trim())
  if (isMarkdownLine(lines[targetLineIdx])) return null

  // Scan backwards for start of SQL query
  let startIdx = targetLineIdx
  while (startIdx > 0) {
    const prev = lines[startIdx - 1].trim()
    if (!prev || isMarkdownLine(prev) || prev.endsWith(';')) break
    startIdx--
  }

  // Scan forwards for end of SQL query
  let endIdx = targetLineIdx
  while (endIdx < lines.length - 1) {
    const cur = lines[endIdx].trim()
    if (cur.endsWith(';')) break
    const next = lines[endIdx + 1].trim()
    if (!next || isMarkdownLine(next)) break
    endIdx++
  }

  const candidate = lines.slice(startIdx, endIdx + 1).join('\n').trim()
  if (!candidate || !isLikelySql(candidate)) return null

  return candidate
}

/** Heuristic: does text look like SQL rather than markdown prose? */
export function isLikelySql(text: string): boolean {
  const t = text.trim()
  if (!t) return false
  if (/^(#{1,6}\s|[-*+]\s+\[[ xX]\]|[-*+]\s+|```|>|---)/.test(t)) return false
  return /^(SELECT|WITH|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|SHOW|DESCRIBE|DESC|EXPLAIN|USE|SET|CALL|TRUNCATE|REPLACE|GRANT|REVOKE|BEGIN|COMMIT|ROLLBACK)\b/i.test(t)
    || /;\s*$/.test(t)
    || /\bFROM\b/i.test(t)
}

/** Whether the cursor is in a runnable SQL context (plain SQL, inside a fence, or on a raw SQL statement). */
export function isInSqlContext(doc: string, pos: number, mode: 'sql' | 'notebook'): boolean {
  if (mode === 'sql') return true
  if (getSqlFenceAtPos(doc, pos) !== null) return true
  return extractRawSqlAtPos(doc, pos) !== null
}

/**
 * Extract SQL to run from the editor.
 * Priority: selection → fence at cursor → raw SQL at cursor → closest fence (notebook) → statement at cursor (sql mode).
 */
export function extractRunnableSql(state: EditorState, mode: 'sql' | 'notebook'): string | null {
  const doc = state.doc.toString()
  const selection = state.selection.main

  if (!selection.empty) {
    const selected = state.sliceDoc(selection.from, selection.to).trim()
    if (!selected) return null
    if (mode === 'notebook') {
      const fence = getSqlFenceAtPos(doc, selection.from)
      if (fence && selection.from >= fence.contentStart && selection.to <= fence.contentEnd) {
        const relFrom = selection.from - fence.contentStart
        const relTo = selection.to - fence.contentStart
        return fence.sql.slice(relFrom, relTo).trim() || fence.sql.trim()
      }
      if (!isLikelySql(selected)) return null
    }
    return selected
  }

  const pos = selection.head

  if (mode === 'notebook') {
    const fence = getSqlFenceAtPos(doc, pos)
    if (fence) {
      const relPos = pos - fence.contentStart
      const stmt = getStatementAtPosition(fence.sql, relPos)
      return (stmt || fence.sql).trim()
    }
    const rawSql = extractRawSqlAtPos(doc, pos)
    if (rawSql) {
      return rawSql.replace(/;\s*$/, '').trim()
    }

    // Fallback: find the closest SQL fence in the document
    const fences = findSqlFences(doc)
    if (fences.length > 0) {
      let closest = fences[0]
      let minDistance = Math.abs(pos - closest.contentStart)
      for (let i = 1; i < fences.length; i++) {
        const dist = Math.abs(pos - fences[i].contentStart)
        if (dist < minDistance) {
          minDistance = dist
          closest = fences[i]
        }
      }
      return closest.sql.trim()
    }

    // Fallback: if cursor is on a note or heading, find the closest SQL statement in the doc
    const lines = doc.split('\n')
    let lineOffset = 0
    let closestSql: string | null = null
    let minDistance = Infinity

    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i].trim()
      if (/^\s*(SELECT|WITH|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|SHOW|DESCRIBE|DESC|EXPLAIN|USE)\b/i.test(lineText)) {
        const stmt = extractRawSqlAtPos(doc, lineOffset + 1)
        if (stmt) {
          const dist = Math.abs(pos - lineOffset)
          if (dist < minDistance) {
            minDistance = dist
            closestSql = stmt.replace(/;\s*$/, '').trim()
          }
        }
      }
      lineOffset += lines[i].length + 1
    }
    return closestSql
  }

  const stmt = getStatementAtPosition(doc, pos)
  return (stmt || doc).trim() || null
}

/** SQL string inside the fence at cursor or statement in SQL mode, for formatting. */
export function getFormattableSql(state: EditorState, mode: 'sql' | 'notebook'): { sql: string; replaceFrom: number; replaceTo: number } | null {
  const doc = state.doc.toString()
  const pos = state.selection.main.head

  if (mode === 'notebook') {
    const fence = getSqlFenceAtPos(doc, pos)
    if (fence && fence.sql.trim()) {
      const relPos = pos - fence.contentStart
      const statements = splitSqlStatements(fence.sql)
      const s = statements.find(st => relPos >= st.start && relPos <= st.end) || statements[0]
      if (s) {
        return {
          sql: s.executableSql || s.text,
          replaceFrom: fence.contentStart + s.start,
          replaceTo: fence.contentStart + s.end,
        }
      }
      return {
        sql: fence.sql,
        replaceFrom: fence.contentStart,
        replaceTo: fence.contentEnd,
      }
    }
    const rawSql = extractRawSqlAtPos(doc, pos)
    if (rawSql) {
      const start = doc.indexOf(rawSql)
      if (start !== -1) {
        return { sql: rawSql, replaceFrom: start, replaceTo: start + rawSql.length }
      }
    }
    return null
  }

  const statements = splitSqlStatements(doc)
  if (statements.length === 0) return null
  const s = statements.find(st => pos >= st.start && pos <= st.end) || statements[0]
  if (!s) return null
  return {
    sql: s.executableSql || s.text,
    replaceFrom: s.start,
    replaceTo: s.end,
  }
}

export const NOTEBOOK_STARTER = `# Query notes

- [ ] Describe what you're checking

\`\`\`sql
SELECT 1;
\`\`\`
`

/** Convert raw SQL into notebook markdown */
export function convertSqlToNotebook(sql: string, title = 'Query notes'): string {
  const trimmed = sql.trim()
  if (!trimmed) return NOTEBOOK_STARTER
  return `# ${title}\n\n\`\`\`sql\n${trimmed}\n\`\`\`\n`
}

/** Convert notebook markdown to SQL without losing documentation (prose is preserved as comments) */
export function convertNotebookContentToSql(doc: string): string {
  const trimmed = doc.trim()
  if (!trimmed) return ''
  const fences = findSqlFences(doc)
  const sanitizeComment = (t: string) => t.replace(/\*\//g, '* /')

  if (fences.length === 0) {
    return `/*\n${sanitizeComment(trimmed)}\n*/\n`
  }

  let out = ''
  let lastIndex = 0
  for (const fence of fences) {
    const prose = doc.slice(lastIndex, fence.fenceStart).trim()
    if (prose) {
      out += `/*\n${sanitizeComment(prose)}\n*/\n\n`
    }
    out += `${fence.sql.trim()}\n\n`
    lastIndex = fence.fenceEnd
  }

  const trailing = doc.slice(lastIndex).trim()
  if (trailing) {
    out += `/*\n${sanitizeComment(trailing)}\n*/\n`
  }

  return out.trimEnd() + '\n'
}
