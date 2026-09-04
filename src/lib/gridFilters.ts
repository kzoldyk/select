export type FilterKind = 'string' | 'number' | 'date' | 'boolean'

export type FilterOp =
  | 'contains'
  | 'eq'
  | 'neq'
  | 'starts'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'is_null'
  | 'not_null'
  | 'is_true'
  | 'is_false'

export interface ColumnFilter {
  id: string
  column: string
  op: FilterOp
  value: string
}

export interface FilterOpOption {
  op: FilterOp
  label: string
}

const STRING_OPS: FilterOpOption[] = [
  { op: 'contains', label: 'contains' },
  { op: 'eq', label: '=' },
  { op: 'neq', label: '!=' },
  { op: 'starts', label: 'starts with' },
  { op: 'is_null', label: 'is null' },
  { op: 'not_null', label: 'is not null' },
]

const NUMBER_OPS: FilterOpOption[] = [
  { op: 'eq', label: '=' },
  { op: 'neq', label: '!=' },
  { op: 'gt', label: '>' },
  { op: 'gte', label: '>=' },
  { op: 'lt', label: '<' },
  { op: 'lte', label: '<=' },
  { op: 'is_null', label: 'is null' },
  { op: 'not_null', label: 'is not null' },
]

const DATE_OPS: FilterOpOption[] = [
  { op: 'eq', label: 'on' },
  { op: 'gt', label: 'after' },
  { op: 'lt', label: 'before' },
  { op: 'gte', label: 'on or after' },
  { op: 'lte', label: 'on or before' },
  { op: 'is_null', label: 'is null' },
  { op: 'not_null', label: 'is not null' },
]

const BOOLEAN_OPS: FilterOpOption[] = [
  { op: 'is_true', label: 'is true' },
  { op: 'is_false', label: 'is false' },
  { op: 'is_null', label: 'is null' },
  { op: 'not_null', label: 'is not null' },
]

export function inferFilterKind(sqlType: string | undefined): FilterKind {
  const t = (sqlType || '').toLowerCase()
  if (t === 'boolean' || t === 'bool' || t === 'tinyint(1)') return 'boolean'
  if (['int', 'bigint', 'decimal', 'float', 'double', 'numeric', 'number', 'tinyint', 'smallint', 'mediumint'].some(k => t.includes(k))) {
    return 'number'
  }
  if (t.includes('date') || t.includes('time') || t.includes('year')) return 'date'
  return 'string'
}

export function operatorsForKind(kind: FilterKind): FilterOpOption[] {
  if (kind === 'number') return NUMBER_OPS
  if (kind === 'date') return DATE_OPS
  if (kind === 'boolean') return BOOLEAN_OPS
  return STRING_OPS
}

export function defaultOpForKind(kind: FilterKind): FilterOp {
  if (kind === 'boolean') return 'is_true'
  if (kind === 'number' || kind === 'date') return 'eq'
  return 'contains'
}

export function opNeedsValue(op: FilterOp): boolean {
  return op !== 'is_null' && op !== 'not_null' && op !== 'is_true' && op !== 'is_false'
}

function opLabel(op: FilterOp): string {
  const all = [...STRING_OPS, ...NUMBER_OPS, ...DATE_OPS, ...BOOLEAN_OPS]
  return all.find(o => o.op === op)?.label ?? op
}

export function formatFilterChip(filter: ColumnFilter): string {
  if (!opNeedsValue(filter.op)) return `${filter.column} ${opLabel(filter.op)}`
  const value = filter.value === '' ? '…' : filter.value
  return `${filter.column} ${opLabel(filter.op)} ${value}`
}

function coerceNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'boolean') return value ? 1 : 0
  if (value === null || value === undefined) return null
  const n = Number(String(value).trim())
  return Number.isFinite(n) ? n : null
}

function isNullish(value: unknown): boolean {
  return value === null || value === undefined
}

function isTruthyCell(value: unknown): boolean {
  if (value === true || value === 1) return true
  if (typeof value === 'string') {
    const s = value.trim().toLowerCase()
    return s === '1' || s === 'true' || s === 'yes'
  }
  return false
}

function isFalsyCell(value: unknown): boolean {
  if (isNullish(value)) return false
  if (value === false || value === 0) return true
  if (typeof value === 'string') {
    const s = value.trim().toLowerCase()
    return s === '0' || s === 'false' || s === 'no'
  }
  return false
}

export function rowMatchesFilter(cellValue: unknown, filter: ColumnFilter): boolean {
  if (filter.op === 'is_null') return isNullish(cellValue)
  if (filter.op === 'not_null') return !isNullish(cellValue)
  if (filter.op === 'is_true') return isTruthyCell(cellValue)
  if (filter.op === 'is_false') return isFalsyCell(cellValue)

  if (isNullish(cellValue)) return false

  const needle = filter.value
  if (opNeedsValue(filter.op) && needle.trim() === '') return true

  if (filter.op === 'contains') {
    return String(cellValue).toLowerCase().includes(needle.toLowerCase())
  }
  if (filter.op === 'starts') {
    return String(cellValue).toLowerCase().startsWith(needle.toLowerCase())
  }

  if (filter.op === 'eq' || filter.op === 'neq') {
    const leftNum = coerceNumber(cellValue)
    const rightNum = coerceNumber(needle)
    let equal: boolean
    if (leftNum !== null && rightNum !== null && String(cellValue).trim() !== '' && needle.trim() !== '') {
      equal = leftNum === rightNum
    } else {
      equal = String(cellValue).toLowerCase() === needle.toLowerCase()
    }
    return filter.op === 'eq' ? equal : !equal
  }

  const left = coerceNumber(cellValue)
  const right = coerceNumber(needle)
  if (left !== null && right !== null) {
    if (filter.op === 'gt') return left > right
    if (filter.op === 'gte') return left >= right
    if (filter.op === 'lt') return left < right
    if (filter.op === 'lte') return left <= right
  }

  const cmp = String(cellValue).localeCompare(needle, undefined, { numeric: true, sensitivity: 'base' })
  if (filter.op === 'gt') return cmp > 0
  if (filter.op === 'gte') return cmp >= 0
  if (filter.op === 'lt') return cmp < 0
  if (filter.op === 'lte') return cmp <= 0
  return true
}

export function quoteIdent(name: string): string {
  return `\`${name.replace(/`/g, '``')}\``
}

export function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value === 'boolean') return value ? '1' : '0'
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`
}

export function filterToSql(filter: ColumnFilter): string {
  const col = quoteIdent(filter.column)
  if (filter.op === 'is_null') return `${col} IS NULL`
  if (filter.op === 'not_null') return `${col} IS NOT NULL`
  if (filter.op === 'is_true') return `${col} = 1`
  if (filter.op === 'is_false') return `${col} = 0`
  if (filter.op === 'contains') return `${col} LIKE ${sqlLiteral(`%${filter.value}%`)}`
  if (filter.op === 'starts') return `${col} LIKE ${sqlLiteral(`${filter.value}%`)}`
  if (filter.op === 'eq') return `${col} = ${sqlLiteral(filter.value)}`
  if (filter.op === 'neq') return `${col} <> ${sqlLiteral(filter.value)}`
  if (filter.op === 'gt') return `${col} > ${sqlLiteral(filter.value)}`
  if (filter.op === 'gte') return `${col} >= ${sqlLiteral(filter.value)}`
  if (filter.op === 'lt') return `${col} < ${sqlLiteral(filter.value)}`
  if (filter.op === 'lte') return `${col} <= ${sqlLiteral(filter.value)}`
  return `${col} = ${sqlLiteral(filter.value)}`
}

export function filtersToSql(filters: ColumnFilter[]): string {
  return filters
    .filter(f => !opNeedsValue(f.op) || f.value.trim() !== '')
    .map(filterToSql)
    .join(' AND ')
}

const TRAILING_CLAUSE = /\b(group\s+by|order\s+by|limit|having|offset)\b/i

export function injectWhereClause(sql: string, predicate: string): string {
  const trimmed = sql.trim().replace(/;+\s*$/, '')
  if (!predicate.trim()) return sql
  if (/\bwhere\b/i.test(trimmed)) {
    return `${trimmed}\n  AND (${predicate})`
  }
  const match = trimmed.match(TRAILING_CLAUSE)
  if (match && match.index !== undefined) {
    const before = trimmed.slice(0, match.index).trimEnd()
    const after = trimmed.slice(match.index)
    return `${before}\nWHERE ${predicate}\n${after}`
  }
  return `${trimmed}\nWHERE ${predicate}`
}

export interface DistinctValue {
  key: string
  label: string
  count: number
  raw: unknown
}

export function distinctValues(rows: Record<string, unknown>[], column: string, limit = 40): DistinctValue[] {
  const counts = new Map<string, { count: number; raw: unknown }>()
  for (const row of rows) {
    const raw = row?.[column]
    const key = raw === null || raw === undefined ? '__null__' : String(raw)
    const prev = counts.get(key)
    if (prev) prev.count += 1
    else counts.set(key, { count: 1, raw })
  }
  return [...counts.entries()]
    .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([key, info]) => ({
      key,
      label: info.raw === null || info.raw === undefined ? 'NULL' : String(info.raw),
      count: info.count,
      raw: info.raw,
    }))
}
