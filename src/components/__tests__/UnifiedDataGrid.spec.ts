import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import UnifiedDataGrid from '../UnifiedDataGrid.vue'

describe('UnifiedDataGrid.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const sampleColumns = [
    { name: 'id', type: 'int' },
    { name: 'name', type: 'varchar(255)' },
    { name: 'email', type: 'varchar(255)' },
    { name: 'active', type: 'boolean' }
  ]

  const sampleRows = [
    { id: 1, name: 'Alice', email: 'alice@example.com', active: true },
    { id: 2, name: 'Bob', email: 'bob@example.com', active: false },
    { id: 3, name: 'Charlie', email: 'charlie@example.com', active: true }
  ]

  it('renders columns and row count correctly', () => {
    const wrapper = mount(UnifiedDataGrid, {
      props: {
        columns: sampleColumns,
        rows: sampleRows,
        durationMs: 42
      }
    })

    expect(wrapper.text()).toContain('id')
    expect(wrapper.text()).toContain('name')
    expect(wrapper.text()).toContain('email')
    expect(wrapper.text()).toContain('3 / 3 rows')
    expect(wrapper.text()).toContain('42ms')
  })

  it('filters rows when quickSearch is input', async () => {
    const wrapper = mount(UnifiedDataGrid, {
      props: {
        columns: sampleColumns,
        rows: sampleRows
      }
    })

    const input = wrapper.find('input[placeholder="Search rows…"]')
    await input.setValue('Alice')

    expect(wrapper.text()).toContain('1 / 3 rows')
    expect(wrapper.text()).toContain('Alice')
    expect(wrapper.text()).not.toContain('Bob')
  })

  it('sorts rows when column header is clicked', async () => {
    const wrapper = mount(UnifiedDataGrid, {
      props: {
        columns: sampleColumns,
        rows: sampleRows
      }
    })

    const nameHeader = wrapper.findAll('.group\\/head').find(h => h.text().includes('name'))
    expect(nameHeader).toBeDefined()
    await nameHeader!.trigger('click')

    expect(wrapper.text()).toContain('name')
  })

  it('handles empty state when 0 rows provided', () => {
    const wrapper = mount(UnifiedDataGrid, {
      props: {
        columns: sampleColumns,
        rows: []
      }
    })

    expect(wrapper.text()).toContain('No rows returned')
  })
})
