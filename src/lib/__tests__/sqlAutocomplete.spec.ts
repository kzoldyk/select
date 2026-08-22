import { describe, it, expect, vi } from 'vitest'
import { getSqlCompletionOptions, generateAutoAlias, getBacktickContext } from '../sqlAutocomplete'

describe('sqlAutocomplete proposals', () => {
  const mockSchemaStore = {
    databases: ['courier', 'shop', 'auth'],
    tables: [
      { name: 'orders', type: 'table' },
      { name: 'order_items', type: 'table' },
      { name: 'users', type: 'table' },
    ],
    views: [],
    detailsByTable: {
      users: {
        columns: [
          { name: 'id', columnType: 'bigint', pk: true },
          { name: 'email', columnType: 'varchar(255)', pk: false },
        ],
      },
      orders: {
        columns: [
          { name: 'id', columnType: 'bigint', pk: true },
          { name: 'user_id', columnType: 'bigint', pk: false },
          { name: 'total_amount', columnType: 'decimal(10,2)', pk: false },
        ],
      },
      order_items: {
        columns: [
          { name: 'id', columnType: 'bigint', pk: true },
          { name: 'order_id', columnType: 'bigint', pk: false },
          { name: 'quantity', columnType: 'int', pk: false },
        ],
      },
    },
    foreignKeysByTable: {
      orders: [
        {
          tableName: 'orders',
          columnName: 'user_id',
          referencedTable: 'users',
          referencedColumn: 'id',
        },
      ],
      order_items: [
        {
          tableName: 'order_items',
          columnName: 'order_id',
          referencedTable: 'orders',
          referencedColumn: 'id',
        },
      ],
    },
    fetchTableDetails: vi.fn(async (tbl: string) => {
      if (tbl.includes('return_order_tracking_details')) {
        return {
          columns: [
            { name: 'id', columnType: 'bigint', pk: true },
            { name: 'order_id', columnType: 'bigint', pk: false },
            { name: 'tracking_number', columnType: 'varchar(100)', pk: false },
            { name: 'courier_status', columnType: 'varchar(50)', pk: false },
            { name: 'delivery_payload', columnType: 'json', pk: false },
          ],
        }
      }
      return null
    }),
    fetchTablesForSchema: vi.fn(async (schema: string) => {
      if (schema === 'courier') {
        return ['return_order_tracking_details', 'shipments', 'delivery_logs']
      }
      return []
    }),
  }

  it('generates auto-aliases properly', () => {
    expect(generateAutoAlias('order_items')).toBe('oi')
    expect(generateAutoAlias('return_order_tracking_details')).toBe('rotd')
    expect(generateAutoAlias('users')).toBe('u')
  })

  it('resolves table aliases upon dot completion (u. -> users columns)', async () => {
    const sql = 'SELECT * FROM users u WHERE u.'
    const options = await getSqlCompletionOptions(sql, sql.length, '', mockSchemaStore)

    const labels = options.map(o => o.label)
    expect(labels).toContain('id')
    expect(labels).toContain('email')
    expect(labels).not.toContain('order_id')
    expect(options.find(o => o.label === 'id')?.detail).toContain('users (u)')
  })

  it('proposes foreign key join conditions after ON', async () => {
    const sql = 'SELECT * FROM orders o JOIN order_items oi ON '
    const options = await getSqlCompletionOptions(sql, sql.length, '', mockSchemaStore)

    const labels = options.map(o => o.label)
    expect(labels).toContain('oi.order_id = o.id')
  })

  it('fetches uncached table columns on-demand in WHERE clause (courier.return_order_tracking_details)', async () => {
    const sql = 'SELECT * FROM courier.return_order_tracking_details WHERE '
    const options = await getSqlCompletionOptions(sql, sql.length, '', mockSchemaStore)

    const labels = options.map(o => o.label)
    expect(mockSchemaStore.fetchTableDetails).toHaveBeenCalledWith('courier.return_order_tracking_details')
    expect(labels).toContain('tracking_number')
    expect(labels).toContain('courier_status')
    expect(labels).toContain('delivery_payload')
    // Verify columns have top boost (100)
    const trackingOpt = options.find(o => o.label === 'tracking_number')
    expect(trackingOpt?.boost).toBe(100)
  })

  it('recommends tables after schema dot (courier. -> schema tables)', async () => {
    const sql = 'SELECT * FROM courier.'
    const options = await getSqlCompletionOptions(sql, sql.length, '', mockSchemaStore)

    const labels = options.map(o => o.label)
    expect(mockSchemaStore.fetchTablesForSchema).toHaveBeenCalledWith('courier')
    expect(labels).toContain('return_order_tracking_details')
    expect(labels).toContain('shipments')
    expect(labels).toContain('delivery_logs')
  })

  it('filters columns to in-scope tables in SELECT and WHERE', async () => {
    const sql = 'SELECT  FROM orders o WHERE '
    const options = await getSqlCompletionOptions(sql, sql.length, '', mockSchemaStore)

    const labels = options.map(o => o.label)
    expect(labels).toContain('user_id')
    expect(labels).toContain('total_amount')
  })

  it('suggests tables with auto-aliases in FROM clause', async () => {
    const sql = 'SELECT * FROM '
    const options = await getSqlCompletionOptions(sql, sql.length, 'ord', mockSchemaStore)

    const labels = options.map(o => o.label)
    expect(labels).toContain('orders')
    expect(labels).toContain('order_items')
    expect(labels).toContain('order_items oi')
  })
})

describe('backtick-aware completion', () => {
  const mockSchemaStore = {
    databases: ['courier', 'shop'],
    tables: [
      { name: 'users', type: 'table' },
      { name: 'orders', type: 'table' },
    ],
    views: [],
    detailsByTable: {
      users: {
        columns: [
          { name: 'id', columnType: 'bigint', pk: true },
          { name: 'email', columnType: 'varchar(255)', pk: false },
        ],
      },
      orders: {
        columns: [
          { name: 'id', columnType: 'bigint', pk: true },
          { name: 'total_amount', columnType: 'decimal(10,2)', pk: false },
        ],
      },
    },
    foreignKeysByTable: {},
  }

  it('detects cursor inside an open backtick identifier', () => {
    const sql = 'SELECT * FROM `use'
    expect(getBacktickContext(sql, sql.length)).toEqual({ insideBacktick: true, tokenStart: 15 })
  })

  it('detects closed backticks as outside', () => {
    const sql = 'SELECT * FROM `users`'
    expect(getBacktickContext(sql, sql.length).insideBacktick).toBe(false)
  })

  it('ignores backtick-shaped content inside string literals', () => {
    const sql = "SELECT '`' FROM users WHERE x = 'a`b' AND y = `col"
    // The last tick opens a real identifier despite earlier ticks inside strings
    const ctx = getBacktickContext(sql, sql.length)
    expect(ctx.insideBacktick).toBe(true)
    expect(sql.slice(ctx.tokenStart)).toBe('col')
  })

  it('offers tables without alias variants inside backticks (FROM `ord)', async () => {
    const sql = 'SELECT * FROM `ord'
    const options = await getSqlCompletionOptions(
      sql, sql.length, 'ord', mockSchemaStore, { insideBacktick: true }
    )
    const labels = options.map(o => o.label)
    expect(labels).toContain('orders')
    expect(labels).not.toContain('orders o')
    // No keywords/functions leak into identifier context
    expect(labels.every(l => ['users', 'orders', 'courier', 'shop'].includes(l))).toBe(true)
  })

  it('offers columns with quote-preserving apply inside backticks (WHERE `em)', async () => {
    const sql = 'SELECT * FROM users WHERE `em'
    const options = await getSqlCompletionOptions(
      sql, sql.length, 'em', mockSchemaStore, { insideBacktick: true }
    )
    const email = options.find(o => o.label === 'email')
    expect(email).toBeDefined()
    expect(typeof email?.apply).toBe('function')
    // Keywords must not appear
    expect(options.map(o => o.label)).not.toContain('ELSE')
  })

  it('behaves the same unquoted: alias variants still offered without backticks', async () => {
    const sql = 'SELECT * FROM ord'
    const options = await getSqlCompletionOptions(sql, sql.length, 'ord', mockSchemaStore)
    const labels = options.map(o => o.label)
    expect(labels).toContain('orders')
    expect(labels).toContain('orders o')
  })
})
