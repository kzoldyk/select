import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import TabBar from '../TabBar.vue'
import { useUiStore } from '../../stores/ui'
import { useEditorStore } from '../../stores/editor'

const mockInvoke = vi.fn()
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}))

describe('TabBar Update and Restart Button Flow', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    mockInvoke.mockReset()
    mockInvoke.mockResolvedValue(undefined)
  })

  it('hides update button when no update is available', () => {
    const uiStore = useUiStore()
    uiStore.isNewUpdateAvailable = false
    uiStore.updateState = 'idle'

    const wrapper = mount(TabBar)
    const updateBtn = wrapper.find('button[aria-label="Application Update"]')
    expect(updateBtn.exists()).toBe(false)
  })

  it('shows glowing update button next to Run button when update is available', () => {
    const uiStore = useUiStore()
    uiStore.isNewUpdateAvailable = true
    uiStore.updateState = 'idle'
    uiStore.activeRelease = {
      version: '0.3.0',
      releaseDate: '2026-10-15',
      title: 'Major Release',
      summary: 'New features',
      highlights: [],
    }

    const wrapper = mount(TabBar)
    const updateBtn = wrapper.find('button[aria-label="Application Update"]')
    expect(updateBtn.exists()).toBe(true)
    expect(updateBtn.text()).toContain('Update')
    // Distinct emerald/teal glowing style
    expect(updateBtn.classes().some(c => c.includes('from-emerald') || c.includes('emerald'))).toBe(true)
    expect(updateBtn.classes()).toContain('animate-pulse')

    // Run button also exists side-by-side
    const runBtn = wrapper.find('button[aria-label="Run Query"]')
    expect(runBtn.exists()).toBe(true)
  })

  it('transitions to "Updating…" then "Restart to Update" with glowing style on click', async () => {
    vi.useFakeTimers()
    const uiStore = useUiStore()
    uiStore.isNewUpdateAvailable = true
    uiStore.updateState = 'idle'
    uiStore.activeRelease = {
      version: '0.3.0',
      releaseDate: '2026-10-15',
      title: 'Major Release',
      summary: 'New features',
      highlights: [],
    }

    const wrapper = mount(TabBar)
    const updateBtn = wrapper.find('button[aria-label="Application Update"]')
    expect(updateBtn.exists()).toBe(true)

    // Click Update
    await updateBtn.trigger('click')
    await wrapper.vm.$nextTick()

    // State is updating
    expect(uiStore.updateState).toBe('updating')
    expect(wrapper.find('button[aria-label="Application Update"]').text()).toContain('Updating…')

    // Fast-forward simulated update download
    await vi.advanceTimersByTimeAsync(1200)
    await wrapper.vm.$nextTick()

    // State transitions to ready_to_restart
    expect(uiStore.updateState).toBe('ready_to_restart')
    const restartBtn = wrapper.find('button[aria-label="Application Update"]')
    expect(restartBtn.text()).toContain('Restart to Update')
    // Distinct restart amber/orange glow
    expect(restartBtn.classes().some(c => c.includes('from-amber') || c.includes('amber'))).toBe(true)

    vi.useRealTimers()
  })

  it('invokes restart_app when clicking "Restart to Update"', async () => {
    const uiStore = useUiStore()
    uiStore.isNewUpdateAvailable = false
    uiStore.updateState = 'ready_to_restart'
    uiStore.activeRelease = {
      version: '0.3.0',
      releaseDate: '2026-10-15',
      title: 'Major Release',
      summary: 'New features',
      highlights: [],
    }

    const wrapper = mount(TabBar)
    const restartBtn = wrapper.find('button[aria-label="Application Update"]')
    expect(restartBtn.exists()).toBe(true)
    expect(restartBtn.text()).toContain('Restart to Update')

    await restartBtn.trigger('click')
    expect(mockInvoke).toHaveBeenCalledWith('restart_app')
  })
})
