import { describe, expect, it } from 'vitest'
import { addColumnToOrderBy, addColumnToSelect, addColumnToWhere } from '../sqlEdit'

describe('sqlEdit', () => {
  it('replaces SELECT * and injects WHERE / ORDER BY', () => {
    expect(addColumnToSelect('SELECT * FROM users LIMIT 50', 'email')).toBe('SELECT `email` FROM users LIMIT 50')
    expect(addColumnToWhere('SELECT * FROM users LIMIT 50', 'id')).toContain('WHERE `id` = ')
    expect(addColumnToOrderBy('SELECT * FROM users LIMIT 50', 'created_at')).toContain('ORDER BY `created_at`')
  })
})
