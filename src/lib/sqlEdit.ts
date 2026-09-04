import { injectWhereClause, quoteIdent } from './gridFilters'

export function addColumnToSelect(sql: string, column: string, tableName?: string): string {
  const ident = quoteIdent(column)
  const trimmed = sql.trim()
  if (!trimmed) {
    const table = tableName ? quoteIdent(tableName) : '`table`'
    return `SELECT ${ident}\nFROM ${table}\nLIMIT 100;`
  }
  if (/^\s*SELECT\s+\*/i.test(trimmed)) {
    return trimmed.replace(/^\s*SELECT\s+\*/i, `SELECT ${ident}`)
  }
  const from = trimmed.match(/\bFROM\b/i)
  if (from && from.index !== undefined) {
    const before = trimmed.slice(0, from.index).trimEnd()
    const after = trimmed.slice(from.index)
    return `${before}, ${ident}\n${after}`
  }
  return `${trimmed.replace(/;+\s*$/, '')},\n${ident}`
}

export function addColumnToWhere(sql: string, column: string, tableName?: string): string {
  const pred = `${quoteIdent(column)} = `
  const trimmed = sql.trim()
  if (!trimmed) {
    const table = tableName ? quoteIdent(tableName) : '`table`'
    return `SELECT *\nFROM ${table}\nWHERE ${pred}`
  }
  return injectWhereClause(trimmed, pred)
}

export function addColumnToOrderBy(sql: string, column: string, tableName?: string): string {
  const ident = quoteIdent(column)
  const trimmed = sql.trim()
  if (!trimmed) {
    const table = tableName ? quoteIdent(tableName) : '`table`'
    return `SELECT *\nFROM ${table}\nORDER BY ${ident}\nLIMIT 100;`
  }
  const body = trimmed.replace(/;+\s*$/, '')
  if (/\border\s+by\b/i.test(body)) {
    return `${body}, ${ident}`
  }
  const limit = body.match(/\blimit\b/i)
  if (limit && limit.index !== undefined) {
    return `${body.slice(0, limit.index).trimEnd()}\nORDER BY ${ident}\n${body.slice(limit.index)}`
  }
  return `${body}\nORDER BY ${ident}`
}
