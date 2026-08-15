import { describe, it, expect } from 'vitest'
import { extractInScopeTables, analyzeSqlScope, sanitizeSql } from '../sqlScope'

describe('sqlScope analyzer', () => {
  it('extracts simple FROM table', () => {
    const sql = 'SELECT * FROM users WHERE id = 1'
    const tables = extractInScopeTables(sql)
    expect(tables).toEqual([{ table: 'users', schema: undefined, alias: undefined }])
  })

  it('extracts FROM table with alias (both implicit and AS)', () => {
    const sql1 = 'SELECT u.id FROM users u WHERE u.id = 1'
    expect(extractInScopeTables(sql1)).toEqual([{ table: 'users', schema: undefined, alias: 'u' }])

    const sql2 = 'SELECT u.id FROM users AS u WHERE u.id = 1'
    expect(extractInScopeTables(sql2)).toEqual([{ table: 'users', schema: undefined, alias: 'u' }])
  })

  it('extracts schema-qualified table with alias', () => {
    const sql = 'SELECT u.id FROM shop.users AS u WHERE u.id = 1'
    expect(extractInScopeTables(sql)).toEqual([{ table: 'users', schema: 'shop', alias: 'u' }])
  })

  it('extracts multiple JOIN tables with aliases', () => {
    const sql = `
      SELECT o.id, u.name, i.item_name
      FROM orders o
      INNER JOIN users u ON o.user_id = u.id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      JOIN inventory.items i ON i.id = oi.item_id
      WHERE o.status = 'active'
    `
    const tables = extractInScopeTables(sql)
    expect(tables).toEqual([
      { table: 'orders', schema: undefined, alias: 'o' },
      { table: 'users', schema: undefined, alias: 'u' },
      { table: 'order_items', schema: undefined, alias: 'oi' },
      { table: 'items', schema: 'inventory', alias: 'i' },
    ])
  })

  it('extracts comma-separated tables', () => {
    const sql = 'SELECT * FROM orders o, users u, items i WHERE o.user_id = u.id'
    const tables = extractInScopeTables(sql)
    expect(tables).toEqual([
      { table: 'orders', schema: undefined, alias: 'o' },
      { table: 'users', schema: undefined, alias: 'u' },
      { table: 'items', schema: undefined, alias: 'i' },
    ])
  })

  it('detects dot completion trigger for alias', () => {
    const sql = 'SELECT * FROM users u WHERE u.'
    const ctx = analyzeSqlScope(sql, sql.length)
    expect(ctx.isAfterDot).toBe(true)
    expect(ctx.dotPrefix).toBe('u')
    expect(ctx.inScopeTables).toEqual([{ table: 'users', schema: undefined, alias: 'u' }])
  })

  it('detects JOIN ... ON context', () => {
    const sql = 'SELECT * FROM orders o JOIN users u ON '
    const ctx = analyzeSqlScope(sql, sql.length)
    expect(ctx.isAfterOn).toBe(true)
    expect(ctx.clause).toBe('ON')
    expect(ctx.currentJoinTable).toEqual({ table: 'users', schema: undefined, alias: 'u' })
    expect(ctx.inScopeTables).toEqual([
      { table: 'orders', schema: undefined, alias: 'o' },
      { table: 'users', schema: undefined, alias: 'u' },
    ])
  })

  it('ignores keywords in SQL string literals and comments', () => {
    const sql = `
      -- FROM fake_table
      /* JOIN fake_table2 */
      SELECT 'FROM fake_table3' AS txt FROM real_table rt
    `
    const tables = extractInScopeTables(sql)
    expect(tables).toEqual([{ table: 'real_table', schema: undefined, alias: 'rt' }])
  })
})
