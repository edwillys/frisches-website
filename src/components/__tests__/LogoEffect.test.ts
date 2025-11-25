import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import LogoEffect from '../LogoEffect.vue'

// Mock GSAP to avoid animation side-effects during tests
vi.mock('gsap', () => ({
  default: {
    to: vi.fn(),
    from: vi.fn(),
    context: vi.fn(() => ({ revert: vi.fn() })),
  },
}))

describe('LogoEffect', () => {
  it('renders and responds to click', async () => {
    const wrapper = mount(LogoEffect, {
      props: {
        size: 240,
        mode: 'animated',
      },
    })

    expect(wrapper.exists()).toBe(true)

    await wrapper.trigger('click')
    expect(wrapper.emitted()).toHaveProperty('click')
  })
})
