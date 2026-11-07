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

  it('triggers applyUpdate and opens What\'s New dialog on click', async () => {
    const uiStore = useUiStore()
    uiStore.isNewUpdateAvailable = true
    uiStore.activeRelease = {
      version: '0.3.0',
      releaseDate: '2026-10-15',
      title: 'Major Release',
      summary: 'New features',
      highlights: [],
      downloadUrl: 'https://github.com/hitesh103/select/releases/latest',
    }

    const spy = vi.spyOn(uiStore, 'applyUpdate').mockResolvedValue()
    const openWhatsNewSpy = vi.spyOn(uiStore, 'openWhatsNew')

    const wrapper = mount(TabBar)
    const updateBtn = wrapper.find('button[aria-label="Application Update"]')
    expect(updateBtn.exists()).toBe(true)

    await updateBtn.trigger('click')
    expect(spy).toHaveBeenCalled()
    expect(openWhatsNewSpy).toHaveBeenCalled()
  })
})
