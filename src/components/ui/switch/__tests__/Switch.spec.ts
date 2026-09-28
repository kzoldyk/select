import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Switch from '../Switch.vue'

describe('Switch.vue', () => {
  it('renders unchecked by default', () => {
    const wrapper = mount(Switch, {
      props: {
        checked: false,
      },
    })
    expect(wrapper.find('button').attributes('aria-checked')).toBe('false')
  })

  it('renders checked when checked prop is true', () => {
    const wrapper = mount(Switch, {
      props: {
        checked: true,
      },
    })
    expect(wrapper.find('button').attributes('aria-checked')).toBe('true')
  })

  it('emits update:checked and update:modelValue on click', async () => {
    const wrapper = mount(Switch, {
      props: {
        checked: false,
      },
    })

    await wrapper.find('button').trigger('click')

    expect(wrapper.emitted('update:checked')).toBeTruthy()
    expect(wrapper.emitted('update:checked')?.[0]).toEqual([true])
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([true])
  })

  it('works with modelValue prop', async () => {
    const wrapper = mount(Switch, {
      props: {
        modelValue: true,
      },
    })
    expect(wrapper.find('button').attributes('aria-checked')).toBe('true')

    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
  })
})
