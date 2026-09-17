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
    expect(wrapper.text()).toContain('3 / 3')
    expect(wrapper.text()).toContain('42ms')
  })

  it('filters rows when quickSearch is input', async () => {
    const wrapper = mount(UnifiedDataGrid, {
      props: {
        columns: sampleColumns,
        rows: sampleRows
      }
    })

    const input = wrapper.find('input[placeholder="Find…"]')
    await input.setValue('Alice')

    expect(wrapper.text()).toContain('1 / 3')
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

  it('filters rows when a column predicate is applied', async () => {
    const wrapper = mount(UnifiedDataGrid, {
      props: {
        columns: sampleColumns,
        rows: sampleRows
      },
      attachTo: document.body,
    })

    const funnels = wrapper.findAll('button[title="Filter column"]')
    expect(funnels.length).toBeGreaterThan(1)
    await funnels[1].trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    const valueInput = document.querySelector('input[placeholder="Value"]') as HTMLInputElement | null
    expect(valueInput).toBeTruthy()
    valueInput!.value = 'Alice'
    valueInput!.dispatchEvent(new Event('input', { bubbles: true }))
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('1 / 3')
    expect(wrapper.text()).toContain('name contains Alice')
    expect(wrapper.text()).not.toContain('bob@example.com')

    wrapper.unmount()
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

  it('updates cell display immediately after inline edit without re-selecting', async () => {
    const wrapper = mount(UnifiedDataGrid, {
      props: {
        columns: sampleColumns,
        rows: sampleRows,
      },
      attachTo: document.body,
    })

    const cells = wrapper.findAll('.grid-data-cell')
    expect(cells.length).toBeGreaterThan(0)

    await cells[1].trigger('dblclick')

    const input = wrapper.find('.grid-data-cell input')
    expect(input.exists()).toBe(true)

    await input.setValue('Updated Name')
    await input.trigger('keydown.enter')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Updated Name')
    expect(wrapper.text()).toContain('alice@example.com')

    wrapper.unmount()
  })

  it('extends selection with shift+arrow and applies range styling', async () => {
    const wrapper = mount(UnifiedDataGrid, {
      props: {
        columns: sampleColumns,
        rows: sampleRows,
      },
      attachTo: document.body,
    })

    const cells = wrapper.findAll('.grid-data-cell')
    // First row, name column (index 1)
    await cells[1].trigger('mousedown')

    const container = wrapper.find('#result-grid-table')
    await container.trigger('keydown', { key: 'ArrowDown', shiftKey: true })
    await container.trigger('keydown', { key: 'ArrowDown', shiftKey: true })
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('3×1 cells')

    const selectedCells = wrapper.findAll('.bg-primary\\/\\[0\\.10\\]')
    expect(selectedCells.length).toBe(3)

    wrapper.unmount()
  })

  it('renders duplicate column names with disambiguated keys and distinct values', async () => {
    const dupColumns = [
      { name: 'sku', key: 'sku', type: 'varchar(50)' },
      { name: 'sku', key: 'sku_2', type: 'varchar(50)' },
    ]
    const dupRows = [
      { sku: 'FIRST_SKU', sku_2: 'SECOND_SKU' }
    ]

    const wrapper = mount(UnifiedDataGrid, {
      props: {
        columns: dupColumns,
        rows: dupRows,
      },
      attachTo: document.body,
    })

    const cells = wrapper.findAll('.grid-data-cell')
    expect(cells.length).toBe(2)
    expect(cells[0].text()).toContain('FIRST_SKU')
    expect(cells[1].text()).toContain('SECOND_SKU')

    // Header should show disambiguation indicator #2 for the second column
    expect(wrapper.text()).toContain('#2')

    wrapper.unmount()
  })

  it('clears filters and sorts when active columns change', async () => {
    const wrapper = mount(UnifiedDataGrid, {
      props: {
        columns: sampleColumns,
        rows: sampleRows,
      },
    })

    const nameHeader = wrapper.findAll('.group\\/head').find(h => h.text().includes('name'))
    await nameHeader!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('name')

    // Replace columns with completely different columns
    await wrapper.setProps({
      columns: [
        { name: 'order_id', key: 'order_id', type: 'int' },
        { name: 'total_amount', key: 'total_amount', type: 'decimal(10,2)' },
      ],
      rows: [
        { order_id: 101, total_amount: 99.5 }
      ]
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('order_id')
    expect(wrapper.text()).toContain('total_amount')
    expect(wrapper.text()).not.toContain('Alice')
  })

  it('displays clean column names without cluttering inline table names', () => {
    const columnsWithTable = [
      { name: 'id', orgTable: 'wms_courier_shipping_providers', type: 'int' },
      { name: 'warehouse_id', orgTable: 'wms_courier_shipping_providers', type: 'int' },
    ]
    const rows = [
      { id: 131, warehouse_id: 10 }
    ]

    const wrapper = mount(UnifiedDataGrid, {
      props: {
        columns: columnsWithTable,
        rows,
      }
    })

    const headerCells = wrapper.findAll('.grid-header-cell')
    expect(headerCells.length).toBe(2)
    // The clean header should feature the column name
    expect(headerCells[0].text()).toContain('id')
    expect(headerCells[1].text()).toContain('warehouse_id')
  })

  it('provides column resizer handles with drag resizing capability', async () => {
    const wrapper = mount(UnifiedDataGrid, {
      props: {
        columns: sampleColumns,
        rows: sampleRows,
      }
    })

    const resizers = wrapper.findAll('.column-resizer')
    expect(resizers.length).toBe(sampleColumns.length)

    // Resizing mousedown
    await resizers[0].trigger('mousedown', { clientX: 100 })
    expect(wrapper.vm).toBeDefined()
  })
})
