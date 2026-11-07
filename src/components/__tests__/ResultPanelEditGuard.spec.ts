import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ResultPanel from '../ResultPanel.vue'
import { useResultStore } from '../../stores/result'
import { useSchemaStore } from '../../stores/schema'

const mockInvoke = vi.fn()
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}))

describe('ResultPanel Edit Guard', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    mockInvoke.mockReset()
  })

  it('blocks editing on multi-table JOIN results', async () => {
    const resultStore = useResultStore()
    const schemaStore = useSchemaStore()
    schemaStore.detailsByTable['users'] = {
      primaryKeys: ['id'],
      columns: [],
      indexes: [],
      foreignKeys: [],
    }

    resultStore.status = 'success'
    resultStore.columns = [
      { name: 'id', type: 'int', orgTable: 'users' },
      { name: 'order_id', type: 'int', orgTable: 'orders' },
    ]
    resultStore.rows = [{ id: 1, order_id: 10 }]
    resultStore.lastSql = 'SELECT users.id, orders.order_id FROM users JOIN orders ON users.id = orders.user_id'

    const wrapper = mount(ResultPanel, {
      global: {
        stubs: {
          UnifiedDataGrid: {
            props: ['canEdit', 'tableName'],
            template: '<div class="grid-stub" :data-can-edit="canEdit" :data-table="tableName"></div>',
          },
          EmptyState: true,
          EditReviewDialog: true,
        },
      },
    })
    await wrapper.vm.$nextTick()

    const grid = wrapper.find('.grid-stub')
    expect(grid.attributes('data-can-edit')).toBe('false')
    expect(grid.attributes('data-table')).toBeUndefined()
  })

  it('blocks editing when SQL fallback contains JOIN', async () => {
    const resultStore = useResultStore()
    resultStore.status = 'success'
    resultStore.columns = [
      { name: 'id', type: 'int' },
      { name: 'order_id', type: 'int' },
    ]
    resultStore.rows = [{ id: 1, order_id: 10 }]
    resultStore.lastSql = 'SELECT id, order_id FROM users JOIN orders ON users.id = orders.user_id'

    const wrapper = mount(ResultPanel, {
      global: {
        stubs: {
          UnifiedDataGrid: {
            props: ['canEdit', 'tableName'],
            template: '<div class="grid-stub" :data-can-edit="canEdit" :data-table="tableName"></div>',
          },
          EmptyState: true,
          EditReviewDialog: true,
        },
      },
    })
    await wrapper.vm.$nextTick()

    const grid = wrapper.find('.grid-stub')
    expect(grid.attributes('data-can-edit')).toBe('false')
    expect(grid.attributes('data-table')).toBeUndefined()
  })

  it('allows editing on single-table results with primary keys', async () => {
    const resultStore = useResultStore()
    const schemaStore = useSchemaStore()
    schemaStore.detailsByTable['users'] = {
      primaryKeys: ['id'],
      columns: [{ name: 'id', type: 'int', nullable: false, pk: true, default: null, extra: '', comment: '' }],
      indexes: [],
      foreignKeys: [],
    }

    resultStore.status = 'success'
    resultStore.columns = [
      { name: 'id', type: 'int', orgTable: 'users' },
      { name: 'name', type: 'varchar', orgTable: 'users' },
    ]
    resultStore.rows = [{ id: 1, name: 'Alice' }]
    resultStore.lastSql = 'SELECT id, name FROM users'

    const wrapper = mount(ResultPanel, {
      global: {
        stubs: {
          UnifiedDataGrid: {
            props: ['canEdit', 'tableName'],
            template: '<div class="grid-stub" :data-can-edit="canEdit" :data-table="tableName"></div>',
          },
          EmptyState: true,
          EditReviewDialog: true,
        },
      },
    })
    await wrapper.vm.$nextTick()

    const grid = wrapper.find('.grid-stub')
    expect(grid.attributes('data-can-edit')).toBe('true')
    expect(grid.attributes('data-table')).toBe('users')
  })

  it('allows editing when table has no physical PK but has a virtual key configured', async () => {
    const resultStore = useResultStore()
    const schemaStore = useSchemaStore()
    schemaStore.detailsByTable['orders.orderitems'] = {
      primaryKeys: [],
      columns: [
        { name: 'id', type: 'int', nullable: false, pk: false, default: null, extra: '', comment: '' },
        { name: 'discount', type: 'decimal', nullable: true, pk: false, default: null, extra: '', comment: '' },
      ],
      indexes: [],
      foreignKeys: [],
    }

    schemaStore.setVirtualKey('orders.orderitems', ['id'])

    resultStore.status = 'success'
    resultStore.columns = [
      { name: 'id', type: 'int', orgTable: 'orderitems', schema: 'orders' },
      { name: 'discount', type: 'decimal', orgTable: 'orderitems', schema: 'orders' },
    ]
    resultStore.rows = [{ id: 1, discount: 5.0 }]
    resultStore.lastSql = 'SELECT id, discount FROM orders.orderitems'

    const wrapper = mount(ResultPanel, {
      global: {
        stubs: {
          UnifiedDataGrid: {
            props: ['canEdit', 'tableName'],
            template: '<div class="grid-stub" :data-can-edit="canEdit" :data-table="tableName"></div>',
          },
          EmptyState: true,
          EditReviewDialog: true,
        },
      },
    })
    await wrapper.vm.$nextTick()

    const grid = wrapper.find('.grid-stub')
    expect(grid.attributes('data-can-edit')).toBe('true')
    expect(grid.attributes('data-table')).toBe('orders.orderitems')
  })
})
