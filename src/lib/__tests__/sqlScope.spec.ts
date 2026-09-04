import { describe, it, expect } from 'vitest'
import {
  extractInScopeTables,
  analyzeSqlScope,
  sanitizeSql,
  extractTableIdentifierAt,
  splitSqlStatements,
  getStatementAtPosition,
  isInCommentOrString
} from '../sqlScope'

describe('isInCommentOrString', () => {
  it('ignores quotes inside backtick identifiers', () => {
    const sql = "SELECT `it's fine`, name FROM users"
    const pos = sql.indexOf('name')
    expect(isInCommentOrString(sql, pos)).toBe(false)
  })

  it('still flags real string contents', () => {
    const sql = "SELECT 'a string', name FROM users"
    const pos = sql.indexOf('name')
    expect(isInCommentOrString(sql, pos)).toBe(false)
    const insideStr = sql.indexOf('string')
    expect(isInCommentOrString(sql, insideStr)).toBe(true)
  })

  it('flags content after an unterminated quote', () => {
    const sql = "SELECT 'unterminated AND name FROM users"
    const pos = sql.indexOf('name')
    expect(isInCommentOrString(sql, pos)).toBe(true)
  })
})

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

describe('extractTableIdentifierAt', () => {
  it('extracts simple unqualified table identifier', () => {
    const sql = 'SELECT * FROM users WHERE id = 1'
    const match = extractTableIdentifierAt(sql, sql.indexOf('users') + 2)
    expect(match).not.toBeNull()
    expect(match?.table).toBe('users')
    expect(match?.schema).toBeUndefined()
    expect(match?.full).toBe('users')
  })

  it('extracts schema-qualified table identifier when clicking schema, dot, or table', () => {
    const sql = 'SELECT * FROM other_schema.users WHERE id = 1'
    const schemaPos = sql.indexOf('other_schema') + 2
    const dotPos = sql.indexOf('.')
    const tablePos = sql.indexOf('users') + 2

    const matchSchema = extractTableIdentifierAt(sql, schemaPos)
    expect(matchSchema).toEqual({
      raw: 'other_schema.users',
      full: 'other_schema.users',
      schema: 'other_schema',
      table: 'users',
      from: sql.indexOf('other_schema'),
      to: sql.indexOf('other_schema') + 'other_schema.users'.length,
    })

    const matchDot = extractTableIdentifierAt(sql, dotPos)
    expect(matchDot?.full).toBe('other_schema.users')
    expect(matchDot?.schema).toBe('other_schema')
    expect(matchDot?.table).toBe('users')

    const matchTable = extractTableIdentifierAt(sql, tablePos)
    expect(matchTable?.full).toBe('other_schema.users')
    expect(matchTable?.schema).toBe('other_schema')
    expect(matchTable?.table).toBe('users')
  })

  it('extracts backtick quoted schema and table', () => {
    const sql = 'SELECT * FROM `other_schema`.`users` WHERE id = 1'
    const match = extractTableIdentifierAt(sql, sql.indexOf('users'))
    expect(match?.full).toBe('other_schema.users')
    expect(match?.schema).toBe('other_schema')
    expect(match?.table).toBe('users')
  })

  it('extracts double quoted schema and table', () => {
    const sql = 'SELECT * FROM "other_schema"."users" WHERE id = 1'
    const match = extractTableIdentifierAt(sql, sql.indexOf('other_schema'))
    expect(match?.full).toBe('other_schema.users')
    expect(match?.schema).toBe('other_schema')
    expect(match?.table).toBe('users')
  })

  it('extracts bracket quoted schema and table', () => {
    const sql = 'SELECT * FROM [other_schema].[users] WHERE id = 1'
    const match = extractTableIdentifierAt(sql, sql.indexOf('users'))
    expect(match?.full).toBe('other_schema.users')
    expect(match?.schema).toBe('other_schema')
    expect(match?.table).toBe('users')
  })

  it('extracts mixed quoted schema.table with spaces', () => {
    const sql = 'SELECT * FROM `other_schema` . users WHERE id = 1'
    const match = extractTableIdentifierAt(sql, sql.indexOf('.'))
    expect(match?.full).toBe('other_schema.users')
    expect(match?.schema).toBe('other_schema')
    expect(match?.table).toBe('users')
  })

  it('ignores SQL keywords when clicked standalone', () => {
    const sql = 'SELECT * FROM other_schema.users WHERE id = 1'
    expect(extractTableIdentifierAt(sql, sql.indexOf('SELECT'))).toBeNull()
    expect(extractTableIdentifierAt(sql, sql.indexOf('FROM'))).toBeNull()
    expect(extractTableIdentifierAt(sql, sql.indexOf('WHERE'))).toBeNull()
  })

  it('ignores comments and string literals', () => {
    const sql = `
      -- SELECT * FROM other_schema.users
      SELECT 'other_schema.users' FROM dual
    `
    const commentPos = sql.indexOf('other_schema')
    expect(extractTableIdentifierAt(sql, commentPos)).toBeNull()

    const stringPos = sql.lastIndexOf('other_schema')
    expect(extractTableIdentifierAt(sql, stringPos)).toBeNull()
  })

  it('ignores numbers', () => {
    const sql = 'SELECT * FROM users WHERE id = 12345'
    expect(extractTableIdentifierAt(sql, sql.indexOf('12345'))).toBeNull()
  })
})

describe('splitSqlStatements and getStatementAtPosition', () => {
  const userMultiSql = `SELECT id, skid_tag_number, picking_quantity_old, picking_quantity_new, 
       statuscode_old, statuscode_new, create_date, user, host_name
FROM history.productunit_log
WHERE skid_tag_number = '+846369661';
  -- AND create_date BETWEEN '2026-07-17' AND '2026-07-21'
-- ORDER BY create_date;

select max(id) as id, skid  from thirdparty.b2b_order_sku_skid_mapping where skid in ('+846369661') group by skid;`

  it('correctly splits multi-statement SQL with trailing comments and semicolons in comments', () => {
    const statements = splitSqlStatements(userMultiSql)
    expect(statements).toHaveLength(2)
    expect(statements[0].executableSql).toContain('history.productunit_log')
    expect(statements[0].executableSql).not.toContain('thirdparty.b2b_order_sku_skid_mapping')
    expect(statements[1].executableSql).toContain('thirdparty.b2b_order_sku_skid_mapping')
    expect(statements[1].executableSql).not.toContain('history.productunit_log')
  })

  it('selects correct statement based on cursor position', () => {
    // Cursor in statement 1
    const pos1 = userMultiSql.indexOf('history.productunit_log')
    const stmt1 = getStatementAtPosition(userMultiSql, pos1)
    expect(stmt1).toContain('history.productunit_log')
    expect(stmt1).not.toContain('thirdparty.b2b_order_sku_skid_mapping')

    // Cursor in commented lines trailing statement 1
    const posComment = userMultiSql.indexOf('-- ORDER BY')
    const stmtComment = getStatementAtPosition(userMultiSql, posComment)
    expect(stmtComment).toContain('history.productunit_log')
    expect(stmtComment).not.toContain('thirdparty.b2b_order_sku_skid_mapping')

    // Cursor in statement 2
    const pos2 = userMultiSql.indexOf('thirdparty.b2b_order_sku_skid_mapping')
    const stmt2 = getStatementAtPosition(userMultiSql, pos2)
    expect(stmt2).toContain('thirdparty.b2b_order_sku_skid_mapping')
    expect(stmt2).not.toContain('history.productunit_log')
  })

  it('splits queries on double newlines when preceding query has no semicolon', () => {
    const unSemicolonedSql = `select * from courier.wms_courier_partner_daily_cutoff -- for cutoff time logic

select * from courier.clickpost_delayed_delivery_orders;`

    const stmts = splitSqlStatements(unSemicolonedSql)
    expect(stmts).toHaveLength(2)
    expect(stmts[0].executableSql).toBe('select * from courier.wms_courier_partner_daily_cutoff -- for cutoff time logic')
    expect(stmts[1].executableSql).toBe('select * from courier.clickpost_delayed_delivery_orders')

    const posTarget = unSemicolonedSql.indexOf('clickpost_delayed_delivery_orders')
    const extracted = getStatementAtPosition(unSemicolonedSql, posTarget)
    expect(extracted).toBe('select * from courier.clickpost_delayed_delivery_orders')
  })

  it('selects exact query when cursor is at column 0 of any query in multi-query script', () => {
    const script = `select * from courier.wms_courier_partner_daily_cutoff order by id desc limit 100;

select * from courier.wms_courier_partner_daily_cutoff_pincode order by id desc limit 100;

select * from orders.order_time_log limit 100;`

    const q1Start = 0
    const q2Start = script.indexOf('select * from courier.wms_courier_partner_daily_cutoff_pincode')
    const q3Start = script.indexOf('select * from orders.order_time_log')

    expect(getStatementAtPosition(script, q1Start)).toBe('select * from courier.wms_courier_partner_daily_cutoff order by id desc limit 100')
    expect(getStatementAtPosition(script, q2Start)).toBe('select * from courier.wms_courier_partner_daily_cutoff_pincode order by id desc limit 100')
    expect(getStatementAtPosition(script, q3Start)).toBe('select * from orders.order_time_log limit 100')
  })
})

