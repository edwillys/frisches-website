import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import CardDealer from '../CardDealer.vue'

// Mock gsap and CustomEase to avoid running animations during unit tests
vi.mock('gsap', () => {
  return {
    default: {
      registerPlugin: () => {},
      timeline: (config?: { onStart?: () => void; onComplete?: () => void }) => {
        config?.onStart?.()
        config?.onComplete?.()
        type TimelineObj = {
          to: (t: TimelineObj) => TimelineObj
          fromTo: (t: TimelineObj) => TimelineObj
          from: (t: TimelineObj) => TimelineObj
          add: (t: TimelineObj) => TimelineObj
          kill: () => void
          set: (t: TimelineObj) => TimelineObj
        }
        const t: TimelineObj = {} as TimelineObj
        const noop = () => t
        t.to = noop
        t.fromTo = noop
        t.from = noop
        t.add = noop
        t.kill = () => {}
        t.set = noop
        return t
      },
      to: () => {},
      set: () => {},
      killTweensOf: () => {},
      context: (fn: () => void) => {
        fn()
        return { revert: () => {} }
      },
      matchMedia: () => ({
        add: (
          _q: Record<string, unknown>,
          cb: (obj: { conditions: Record<string, unknown> }) => void
        ) => {
          cb({ conditions: {} })
        },
      }),
    },
  }
})
vi.mock('gsap/CustomEase', () => {
  return {
    CustomEase: {
      create: () => ({}),
    },
  }
})

describe('CardDealer cover behavior', () => {
  it('emits palette-change as RGB array when About card is clicked', async () => {
    // Set CSS vars used by the component
    document.documentElement.style.setProperty('--bg-cover-particles', '220, 40, 40')
    document.documentElement.style.setProperty('--bg-cover-about-dim', '0.36')

    const wrapper = mount(CardDealer, {
      props: {
        socialLinks: {
          instagram: '#',
          spotify: '#',
          youtube: '#',
        },
      },
    })

    // Find the MenuCard element that contains the title 'About'
    const cards = wrapper.findAll('.menu-card')
    expect(cards.length).toBeGreaterThan(0)

    const aboutCard = cards.find((c) => c.text().includes('About'))
    expect(aboutCard).toBeTruthy()

    await aboutCard!.trigger('click')

    // The component should emit 'palette-change' with a number[] payload
    const emitted = wrapper.emitted('palette-change') as Array<Array<unknown>> | undefined
    expect(emitted && emitted.length).toBeGreaterThan(0)
    const first = emitted?.[0]?.[0]
    expect(Array.isArray(first)).toBe(true)
    expect(first).toEqual([220, 40, 40])
  })

  it('renders dim overlay element for covers', () => {
    const wrapper = mount(CardDealer)
    const dim = wrapper.find('.card-dealer__cover-dim')
    expect(dim.exists()).toBe(true)
  })
})
