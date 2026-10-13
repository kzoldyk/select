import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ResultPanel from '../ResultPanel.vue'
import { useResultStore } from '../../stores/result'
import { useConnectionStore } from '../../stores/connection'

const mockInvoke = vi.fn()
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}))

describe('ResultPanel Pinned Result Refresh', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    mockInvoke.mockReset()
    mockInvoke.mockResolvedValue({
      columns: [{ name: 'id', type: 'int' }],
      rows: [{ id: 1 }, { id: 2 }],
      row_count: 2,
      duration_ms: 15,
      has_more: false,
      offset: 0,
      limit: 100,
    })
  })

  it('renders refresh button on pinned tab pill and in toolbar when active', async () => {
    const resultStore = useResultStore()
    const connStore = useConnectionStore()
    connStore.activeId = 'conn-1'

    // Add a pinned result
    resultStore.status = 'success'
    resultStore.columns = [{ name: 'id', type: 'int' }]
    resultStore.rows = [{ id: 1 }]
    resultStore.lastSql = 'SELECT id FROM test_table'
    resultStore.pinCurrentResult()

    const wrapper = mount(ResultPanel, {
      global: {
        stubs: {
          UnifiedDataGrid: true,
          EmptyState: true,
          EditReviewDialog: true,
        },
      },
    })
    await wrapper.vm.$nextTick()

    // 1. Refresh button exists on pinned tab pill
    const tabRefreshBtn = wrapper.find('button[title="Refresh Pinned Result"]')
    expect(tabRefreshBtn.exists()).toBe(true)

    // 2. Click tab refresh button
    const refreshSpy = vi.spyOn(resultStore, 'refreshPinnedResult')
    await tabRefreshBtn.trigger('click')
    expect(refreshSpy).toHaveBeenCalledWith(resultStore.pinnedResults[0].id)

    // 3. Toolbar refresh button exists when viewing pinned result tab
    expect(resultStore.activeResultTabId).toBe(resultStore.pinnedResults[0].id)
    const toolbarButtons = wrapper.findAll('button')
    const toolbarRefreshBtn = toolbarButtons.find(b => b.text().includes('Refresh'))
    expect(toolbarRefreshBtn).toBeDefined()

    // 4. Click toolbar refresh button
    await toolbarRefreshBtn?.trigger('click')
    expect(refreshSpy).toHaveBeenCalledTimes(2)
  })
})
