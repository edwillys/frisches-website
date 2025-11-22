import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import LogoButton from '../LogoButton.vue'

const gsapMocks = vi.hoisted(() => {
  const to = vi.fn(() => ({ kill: vi.fn() }))
  const timelineStep = vi.fn().mockReturnThis()
  const timelineInstance = {
    to: timelineStep,
    fromTo: timelineStep,
    kill: vi.fn()
  }
  const timeline = vi.fn(() => timelineInstance)

  return {
    to,
    timeline,
    timelineInstance,
    context: vi.fn((fn?: () => void) => {
      fn?.()
      return { revert: vi.fn() }
    })
  }
})

vi.mock('gsap', () => ({
  default: {
    to: gsapMocks.to,
    timeline: gsapMocks.timeline,
    context: gsapMocks.context
  }
}))

describe('LogoButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders glow element', () => {
    const wrapper = mount(LogoButton)
    expect(wrapper.find('.logo-button__glow').exists()).toBe(true)
  })

  it('emits click when activated via keyboard', async () => {
    const wrapper = mount(LogoButton)
    await wrapper.trigger('keydown.enter')
    expect(wrapper.emitted('click')).toBeTruthy()
  })
})
