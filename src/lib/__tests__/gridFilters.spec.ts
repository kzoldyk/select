import { describe, expect, it } from 'vitest'
import {
  defaultOpForKind,
  distinctValues,
  filterToSql,
  filtersToSql,
  formatFilterChip,
  inferFilterKind,
  injectWhereClause,
  operatorsForKind,
  rowMatchesFilter,
  type ColumnFilter,
} from '../gridFilters'

function f(partial: Partial<ColumnFilter> & Pick<ColumnFilter, 'op'>): ColumnFilter {
  return { id: '1', column: 'name', value: '', ...partial }
}

describe('gridFilters', () => {
  it('infers kinds from SQL types', () => {
    expect(inferFilterKind('varchar(255)')).toBe('string')
    expect(inferFilterKind('int')).toBe('number')
    expect(inferFilterKind('tinyint(1)')).toBe('boolean')
    expect(inferFilterKind('datetime')).toBe('date')
  })

  it('defaults operators by kind', () => {
    expect(defaultOpForKind('string')).toBe('contains')
    expect(defaultOpForKind('number')).toBe('eq')
    expect(defaultOpForKind('boolean')).toBe('is_true')
    expect(operatorsForKind('boolean').map(o => o.op)).toContain('is_false')
  })

  it('matches contains, null, and numeric compare', () => {
    expect(rowMatchesFilter('Alice', f({ op: 'contains', value: 'ali' }))).toBe(true)
    expect(rowMatchesFilter('Bob', f({ op: 'contains', value: 'ali' }))).toBe(false)
    expect(rowMatchesFilter(null, f({ op: 'is_null' }))).toBe(true)
    expect(rowMatchesFilter(0, f({ op: 'is_null' }))).toBe(false)
    expect(rowMatchesFilter(12, f({ column: 'amount', op: 'gt', value: '10' }))).toBe(true)
    expect(rowMatchesFilter(5, f({ column: 'amount', op: 'gt', value: '10' }))).toBe(false)
    expect(rowMatchesFilter(true, f({ column: 'active', op: 'is_true' }))).toBe(true)
    expect(rowMatchesFilter(0, f({ column: 'active', op: 'is_false' }))).toBe(true)
  })

  it('formats chips and SQL', () => {
    expect(formatFilterChip(f({ column: 'email', op: 'contains', value: '@acme' }))).toBe('email contains @acme')
    expect(filterToSql(f({ column: 'status', op: 'eq', value: 'active' }))).toBe("`status` = 'active'")
    expect(filtersToSql([
      f({ column: 'status', op: 'eq', value: 'active' }),
      f({ column: 'amount', op: 'gt', value: '10' }),
    ])).toBe("`status` = 'active' AND `amount` > '10'")
  })

  it('injects WHERE before LIMIT and ANDs when WHERE exists', () => {
    expect(injectWhereClause('SELECT * FROM users LIMIT 50', "`status` = 'active'")).toBe(
      "SELECT * FROM users\nWHERE `status` = 'active'\nLIMIT 50",
    )
    expect(injectWhereClause("SELECT * FROM users WHERE id > 1", "`status` = 'active'")).toBe(
      "SELECT * FROM users WHERE id > 1\n  AND (`status` = 'active')",
    )
  })

  it('ranks distinct values by count', () => {
    const values = distinctValues(
      [{ s: 'a' }, { s: 'b' }, { s: 'a' }, { s: null }],
      's',
    )
    expect(values[0]).toMatchObject({ label: 'a', count: 2 })
    expect(values.some(v => v.label === 'NULL' && v.count === 1)).toBe(true)
  })
})
