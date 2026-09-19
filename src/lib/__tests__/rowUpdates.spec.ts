import { describe, it, expect } from 'vitest'
import { buildUpdateSql } from '../rowUpdates'

describe('buildUpdateSql', () => {
  it('builds valid UPDATE SQL with primary key predicate', () => {
    const sql = buildUpdateSql('warehouses.orderticket', [
      {
        updates: [{ column: 'estimated_delivery_date', value: '2026-09-17 19:59:22' }],
        pks: [{ column: 'id', value: 42 }],
      },
    ])
    expect(sql).toBe(
      "UPDATE `warehouses`.`orderticket` SET `estimated_delivery_date` = '2026-09-17 19:59:22' WHERE `id` = 42 LIMIT 1;"
    )
  })

  it('throws an error if pks array is empty to prevent invalid WHERE LIMIT 1 SQL', () => {
    expect(() =>
      buildUpdateSql('warehouses.orderticket', [
        {
          updates: [{ column: 'estimated_delivery_date', value: '2026-09-17 19:59:22' }],
          pks: [],
        },
      ])
    ).toThrowError(/missing key predicate/)
  })
})
