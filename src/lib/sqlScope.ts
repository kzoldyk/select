/**
 * Lightweight SQL Scope & Lexical AST Analyzer for smart SQL autocompletion.
 * Supports DBeaver-style alias resolution, in-scope column filtering,
 * FK-based JOIN ON condition proposals, and schema dereferencing.
 */

export interface InScopeTable {
  table: string
  schema?: string
  alias?: string
}

export type SqlClause = 
  | 'SELECT' 
  | 'FROM' 
  | 'JOIN' 
  | 'ON' 
  | 'WHERE' 
  | 'GROUP_BY' 
  | 'ORDER_BY' 
  | 'HAVING' 
  | 'SET' 
  | 'INSERT_INTO' 
  | 'UNKNOWN'

export interface SqlScopeContext {
  statement: string
  clause: SqlClause
  inScopeTables: InScopeTable[]
  isAfterDot: boolean
  dotPrefix: string
  isAfterOn: boolean
  currentJoinTable?: InScopeTable
  isAsterisk: boolean
}

/**
 * Strips SQL comments (both line -- and block /* * /) and string literals
 * to simplify lexical analysis without breaking on keyword occurrences inside literals.
 */
export function sanitizeSql(sql: string): string {
  let inSingle = false
  let inDouble = false
  let inBacktick = false
  let inLineComment = false
  let inBlockComment = false
  let result = ''

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i]
    const nextCh = sql[i + 1] || ''

    if (inLineComment) {
      if (ch === '\n') {
        inLineComment = false
        result += '\n'
      } else {
        result += ' '
      }
      continue
    }

    if (inBlockComment) {
      if (ch === '*' && nextCh === '/') {
        inBlockComment = false
        result += '  '
        i++
      } else {
        result += ch === '\n' ? '\n' : ' '
      }
      continue
    }

    if (ch === '-' && nextCh === '-' && !inSingle && !inDouble && !inBacktick) {
      inLineComment = true
      result += '  '
      i++
      continue
    }

    if (ch === '/' && nextCh === '*' && !inSingle && !inDouble && !inBacktick) {
      inBlockComment = true
      result += '  '
      i++
      continue
    }

    if (ch === '\'' && !inDouble && !inBacktick) {
      inSingle = !inSingle
      result += '\''
      continue
    }

    if (ch === '"' && !inSingle && !inBacktick) {
      inDouble = !inDouble
      result += '"'
      continue
    }

    if (ch === '`') {
      inBacktick = !inBacktick
      result += '`'
      continue
    }

    if (inSingle || inDouble) {
      result += ch === '\n' ? '\n' : ' '
      continue
    }

    result += ch
  }

  return result
}

/**
 * Cleans an identifier (strips quotes, backticks, brackets).
 */
export function cleanIdentifier(ident: string): string {
  return ident.trim().replace(/^[`"\[]|[`"\]]$/g, '')
}

/**
 * Extracts table and alias declarations from a SQL statement.
 * Supports:
 * - FROM table
 * - FROM schema.table
 * - FROM table alias / FROM table AS alias
 * - FROM schema.table alias / FROM schema.table AS alias
 * - JOIN table alias ON ...
 * - UPDATE table alias SET ...
 * - INSERT INTO table
 * - Multiple comma-separated tables: FROM table1 t1, table2 t2
 */
export function extractInScopeTables(statement: string): InScopeTable[] {
  const sanitized = sanitizeSql(statement)
  const tables: InScopeTable[] = []
  const seenKeys = new Set<string>()

  function addTable(tbl: string, schema?: string, alias?: string) {
    const cleanTbl = cleanIdentifier(tbl)
    const cleanSchema = schema ? cleanIdentifier(schema) : undefined
    const cleanAlias = alias ? cleanIdentifier(alias) : undefined

    if (!cleanTbl) return
    // Ignore keywords accidentally captured as table names
    const reserved = new Set([
      'SELECT', 'WHERE', 'ORDER', 'GROUP', 'BY', 'HAVING', 'LIMIT', 'OFFSET',
      'UNION', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'CROSS', 'ON', 'USING',
      'SET', 'VALUES', 'INTO', 'AS', 'AND', 'OR', 'NOT', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END'
    ])
    if (reserved.has(cleanTbl.toUpperCase())) return

    const key = `${cleanSchema || ''}.${cleanTbl}.${cleanAlias || ''}`.toLowerCase()
    if (!seenKeys.has(key)) {
      seenKeys.add(key)
      tables.push({
        table: cleanTbl,
        schema: cleanSchema,
        alias: cleanAlias,
      })
    }
  }

  // 1. Match CTEs: WITH cte_name AS (...)
  const cteRegex = /\bWITH\s+([`\w]+)\s+AS\s*\(/gi
  let cteMatch: RegExpExecArray | null
  while ((cteMatch = cteRegex.exec(sanitized)) !== null) {
    addTable(cteMatch[1])
  }

  // 2. Match FROM clauses (including comma-separated tables up to WHERE/JOIN/GROUP/ORDER/LIMIT/HAVING/UNION/;)
  const fromClauseRegex = /\bFROM\s+([^;\b]+?)(?=\bWHERE\b|\bJOIN\b|\bLEFT\b|\bRIGHT\b|\bINNER\b|\bCROSS\b|\bFULL\b|\bGROUP\b|\bORDER\b|\bHAVING\b|\bLIMIT\b|\bUNION\b|;|$)/gi
  let fromMatch: RegExpExecArray | null
  while ((fromMatch = fromClauseRegex.exec(sanitized)) !== null) {
    const items = fromMatch[1].split(',')
    for (const rawItem of items) {
      const item = rawItem.trim()
      // Skip subquery FROM (SELECT ...) alias
      if (item.startsWith('(')) {
        const subAliasMatch = item.match(/\)\s*(?:AS\s+)?([`\w]+)/i)
        if (subAliasMatch) {
          addTable(subAliasMatch[1], undefined, subAliasMatch[1])
        }
        continue
      }
      parseTableReference(item, addTable)
    }
  }

  // 3. Match JOIN clauses: [LEFT|RIGHT|INNER|FULL|CROSS] JOIN <table_ref> [ON ...]
  const joinClauseRegex = /\b(?:LEFT\s+|RIGHT\s+|INNER\s+|FULL\s+|CROSS\s+)?JOIN\s+([^;\s,()]+(?:\s+(?:AS\s+)?\w+)?)/gi
  let joinMatch: RegExpExecArray | null
  while ((joinMatch = joinClauseRegex.exec(sanitized)) !== null) {
    parseTableReference(joinMatch[1], addTable)
  }

  // 4. Match UPDATE statements: UPDATE <table_ref> SET ...
  const updateMatch = sanitized.match(/\bUPDATE\s+([^;\s,()]+(?:\s+(?:AS\s+)?\w+)?)/i)
  if (updateMatch) {
    parseTableReference(updateMatch[1], addTable)
  }

  // 5. Match INSERT INTO statements: INSERT INTO <table_ref>
  const insertMatch = sanitized.match(/\bINSERT\s+INTO\s+([^;\s,()]+)/i)
  if (insertMatch) {
    parseTableReference(insertMatch[1], addTable)
  }

  // 6. Match DELETE FROM statements: DELETE FROM <table_ref>
  const deleteMatch = sanitized.match(/\bDELETE\s+FROM\s+([^;\s,()]+(?:\s+(?:AS\s+)?\w+)?)/i)
  if (deleteMatch) {
    parseTableReference(deleteMatch[1], addTable)
  }

  return tables
}

function parseTableReference(
  rawItem: string, 
  callback: (tbl: string, schema?: string, alias?: string) => void
) {
  const parts = rawItem.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return

  const fullTable = parts[0]
  let schema: string | undefined
  let table = fullTable

  if (fullTable.includes('.')) {
    const dotIdx = fullTable.indexOf('.')
    schema = fullTable.substring(0, dotIdx)
    table = fullTable.substring(dotIdx + 1)
  }

  let alias: string | undefined
  if (parts.length === 2) {
    if (parts[1].toUpperCase() !== 'AS') {
      alias = parts[1]
    }
  } else if (parts.length >= 3) {
    if (parts[1].toUpperCase() === 'AS') {
      alias = parts[2]
    } else {
      alias = parts[1]
    }
  }

  callback(table, schema, alias)
}

/**
 * Analyzes the current cursor position within a SQL script and returns scope context.
 */
export function analyzeSqlScope(fullSql: string, cursorPos: number): SqlScopeContext {
  const sanitized = sanitizeSql(fullSql)
  const statement = getStatementAtPosition(fullSql, cursorPos)
  const inScopeTables = extractInScopeTables(statement)

  const beforeCursor = fullSql.substring(0, cursorPos)
  const sanitizedBefore = sanitized.substring(0, cursorPos)

  // 1. Check dot completion trigger
  const dotMatch = beforeCursor.match(/([`"\w]+)\.\s*$/)
  const isAfterDot = dotMatch !== null
  const dotPrefix = isAfterDot ? cleanIdentifier(dotMatch[1]) : ''

  // 2. Check asterisk
  const isAsterisk = /\*\s*$/.test(beforeCursor)

  // 3. Determine active clause before cursor
  const clause = detectActiveClause(sanitizedBefore)

  // 4. Check if immediately after ON in a JOIN clause
  const onMatch = sanitizedBefore.match(/\bJOIN\s+([`"\w.]+)(?:\s+(?:AS\s+)?([`"\w]+))?\s+ON\s+([^;]*)$/i)
  const isAfterOn = onMatch !== null
  let currentJoinTable: InScopeTable | undefined

  if (isAfterOn && onMatch) {
    const rawJoinTbl = onMatch[1]
    const rawJoinAlias = onMatch[2]
    let schema: string | undefined
    let table = rawJoinTbl
    if (rawJoinTbl.includes('.')) {
      const dotIdx = rawJoinTbl.indexOf('.')
      schema = rawJoinTbl.substring(0, dotIdx)
      table = rawJoinTbl.substring(dotIdx + 1)
    }
    currentJoinTable = {
      table: cleanIdentifier(table),
      schema: schema ? cleanIdentifier(schema) : undefined,
      alias: rawJoinAlias ? cleanIdentifier(rawJoinAlias) : undefined,
    }
  }

  return {
    statement,
    clause,
    inScopeTables,
    isAfterDot,
    dotPrefix,
    isAfterOn,
    currentJoinTable,
    isAsterisk,
  }
}

/**
 * Detects the active SQL clause in the text preceding the cursor.
 */
function detectActiveClause(textBefore: string): SqlClause {
  const tokens = textBefore.split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return 'UNKNOWN'

  // Look backwards for the most recent major keyword
  for (let i = tokens.length - 1; i >= 0; i--) {
    const token = tokens[i].toUpperCase()
    if (token === 'ON') return 'ON'
    if (token === 'WHERE') return 'WHERE'
    if (token === 'HAVING') return 'HAVING'
    if (token === 'SET') return 'SET'
    if (token === 'SELECT') return 'SELECT'
    if (token === 'FROM') return 'FROM'
    if (token === 'JOIN' || token === 'INNER' || token === 'LEFT' || token === 'RIGHT' || token === 'CROSS' || token === 'FULL') return 'JOIN'
    if (token === 'BY' && i > 0) {
      const prev = tokens[i - 1].toUpperCase()
      if (prev === 'GROUP') return 'GROUP_BY'
      if (prev === 'ORDER') return 'ORDER_BY'
    }
    if (token === 'INTO' && i > 0 && tokens[i - 1].toUpperCase() === 'INSERT') return 'INSERT_INTO'
  }

  return 'UNKNOWN'
}

/**
 * Finds the SQL statement encompassing the cursor position.
 */
export function getStatementAtPosition(sql: string, cursorPos: number): string {
  let inSingle = false
  let inDouble = false
  let inBacktick = false
  let inLineComment = false
  let inBlockComment = false

  let lastSemi = 0
  const statements: { start: number; end: number; text: string }[] = []

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i]
    const nextCh = sql[i + 1] || ''

    if (inLineComment) {
      if (ch === '\n') inLineComment = false
      continue
    }
    if (inBlockComment) {
      if (ch === '*' && nextCh === '/') {
        inBlockComment = false
        i++
      }
      continue
    }
    if (ch === '-' && nextCh === '-' && !inSingle && !inDouble && !inBacktick) {
      inLineComment = true
      i++
      continue
    }
    if (ch === '/' && nextCh === '*' && !inSingle && !inDouble && !inBacktick) {
      inBlockComment = true
      i++
      continue
    }
    if (ch === '\'' && !inDouble && !inBacktick) inSingle = !inSingle
    else if (ch === '"' && !inSingle && !inBacktick) inDouble = !inDouble
    else if (ch === '`') inBacktick = !inBacktick
    else if (ch === ';' && !inSingle && !inDouble && !inBacktick) {
      statements.push({ start: lastSemi, end: i + 1, text: sql.substring(lastSemi, i + 1) })
      lastSemi = i + 1
    }
  }

  if (lastSemi < sql.length) {
    statements.push({ start: lastSemi, end: sql.length, text: sql.substring(lastSemi) })
  }

  for (const s of statements) {
    if (cursorPos >= s.start && cursorPos <= s.end) {
      return s.text
    }
  }

  return statements[statements.length - 1]?.text || sql
}

export interface TableIdentifierMatch {
  raw: string
  full: string
  schema?: string
  table: string
  from: number
  to: number
}

export const RESERVED_SQL_KEYWORDS = new Set([
  'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'CROSS', 'FULL',
  'GROUP', 'ORDER', 'BY', 'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'ALL', 'DISTINCT',
  'ON', 'USING', 'SET', 'VALUES', 'INTO', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER',
  'DROP', 'TABLE', 'VIEW', 'DATABASE', 'SCHEMA', 'INDEX', 'AS', 'AND', 'OR', 'NOT',
  'IN', 'IS', 'NULL', 'LIKE', 'BETWEEN', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'EXISTS',
  'ASC', 'DESC', 'SHOW', 'DESCRIBE', 'EXPLAIN', 'WITH', 'PRIMARY', 'KEY', 'FOREIGN',
  'REFERENCES', 'CASCADE', 'UNIQUE', 'CHECK', 'DEFAULT'
])

export function isInCommentOrString(sql: string, pos: number): boolean {
  if (pos <= 0) return false
  let inSingle = false
  let inDouble = false
  let inLineComment = false
  let inBlockComment = false

  for (let i = 0; i < pos && i < sql.length; i++) {
    const ch = sql[i]
    const nextCh = sql[i + 1] || ''

    if (inLineComment) {
      if (ch === '\n') inLineComment = false
      continue
    }
    if (inBlockComment) {
      if (ch === '*' && nextCh === '/') {
        inBlockComment = false
        i++
      }
      continue
    }
    if (ch === '-' && nextCh === '-' && !inSingle && !inDouble) {
      inLineComment = true
      i++
      continue
    }
    if (ch === '/' && nextCh === '*' && !inSingle && !inDouble) {
      inBlockComment = true
      i++
      continue
    }
    if (ch === '\'' && !inLineComment && !inBlockComment) {
      if (inSingle && nextCh === '\'') {
        i++
        continue
      }
      inSingle = !inSingle
      continue
    }
  }

  return inSingle || inLineComment || inBlockComment
}

/**
 * Extracts the SQL table identifier (e.g. `users`, `other_schema.users`, `\`db\`.\`tbl\``)
 * encompassing or adjacent to the given character position.
 */
export function extractTableIdentifierAt(doc: string, pos: number): TableIdentifierMatch | null {
  if (!doc || pos < 0 || pos > doc.length) return null
  if (isInCommentOrString(doc, pos)) return null

  // Find boundaries of the current line
  let lineStart = pos
  while (lineStart > 0 && doc[lineStart - 1] !== '\n') {
    lineStart--
  }
  let lineEnd = pos
  while (lineEnd < doc.length && doc[lineEnd] !== '\n') {
    lineEnd++
  }
  const lineText = doc.substring(lineStart, lineEnd)
  const relPos = pos - lineStart

  const partPattern = '`[^`\\r\\n]+`|"[^"\\r\\n]+"|\\[[^\\]\\r\\n]+\\]|[a-zA-Z0-9_$]+'
  const compoundPattern = `(?:${partPattern})(?:\\s*\\.\\s*(?:${partPattern}))*`
  const compoundRegex = new RegExp(compoundPattern, 'g')

  let match: RegExpExecArray | null
  while ((match = compoundRegex.exec(lineText)) !== null) {
    const matchStart = match.index
    const matchEnd = match.index + match[0].length

    if (relPos >= matchStart && relPos <= matchEnd) {
      const raw = match[0]
      const partRegex = new RegExp(partPattern, 'g')
      const rawParts: string[] = []
      let pMatch: RegExpExecArray | null
      while ((pMatch = partRegex.exec(raw)) !== null) {
        rawParts.push(pMatch[0])
      }

      if (rawParts.length === 0) return null

      const cleanParts = rawParts.map(p => cleanIdentifier(p)).filter(Boolean)
      if (cleanParts.length === 0) return null

      // Ignore pure numbers
      if (cleanParts.length === 1 && /^\d+$/.test(cleanParts[0])) {
        return null
      }

      // Ignore isolated SQL keywords
      if (cleanParts.length === 1 && RESERVED_SQL_KEYWORDS.has(cleanParts[0].toUpperCase())) {
        return null
      }

      let schema: string | undefined
      let table = cleanParts[cleanParts.length - 1]
      let full = cleanParts.join('.')

      if (cleanParts.length >= 2) {
        schema = cleanParts.slice(0, -1).join('.')
        table = cleanParts[cleanParts.length - 1]
      }

      return {
        raw,
        full,
        schema,
        table,
        from: lineStart + matchStart,
        to: lineStart + matchEnd,
      }
    }
  }

  return null
}
