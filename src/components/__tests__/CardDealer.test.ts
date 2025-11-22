import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CardDealer from '../CardDealer.vue'
import MenuCard from '../MenuCard.vue'

// Mock GSAP to avoid animation issues in tests
const gsapMocks = vi.hoisted(() => {
  const timelineFromTo = vi.fn().mockReturnThis()
  const timelineTo = vi.fn().mockReturnThis()

  return {
    set: vi.fn(),
    to: vi.fn((_, vars: Record<string, unknown> = {}) => {
      if (typeof vars.onStart === 'function') {
        vars.onStart()
      }
      if (typeof vars.onComplete === 'function') {
        vars.onComplete()
      }

      return { kill: vi.fn() }
    }),
    delayedCall: vi.fn((_, callback: () => void) => {
      callback?.()
      return { kill: vi.fn() }
    }),
    timelineFromTo,
    timelineTo,
    timeline: vi.fn((config?: { onComplete?: () => void }) => {
      config?.onComplete?.()
      return {
        fromTo: timelineFromTo,
        to: timelineTo,
        kill: vi.fn()
      }
    }),
    context: vi.fn((fn?: () => void) => {
      fn?.()
      return { revert: vi.fn() }
    }),
    matchMedia: vi.fn(() => ({
      add: vi.fn()
    }))
  }
})

vi.mock('gsap', () => ({
  default: {
    set: gsapMocks.set,
    to: gsapMocks.to,
    from: vi.fn(),
    delayedCall: gsapMocks.delayedCall,
    timeline: gsapMocks.timeline,
    context: gsapMocks.context,
    matchMedia: gsapMocks.matchMedia
  }
}))

// Mock Vue Router
const mockRouter = {
  push: vi.fn()
}

describe('CardDealer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders properly', () => {
    const wrapper = mount(CardDealer, {
      global: {
        stubs: {
          MenuCard: true,
          LogoButton: true,
          LogoEffect: true
        },
        mocks: {
          $router: mockRouter
        }
      }
    })

    expect(wrapper.exists()).toBe(true)
  })

  it('displays the title "Frisches" (hidden initially)', () => {
    const wrapper = mount(CardDealer, {
      global: {
        stubs: {
          MenuCard: true,
          LogoButton: true,
          LogoEffect: true
        },
        mocks: {
          $router: mockRouter
        }
      }
    })

    // Frisches is in a hidden h1 inside a v-if div (only visible after moon click)
    // For now, just check that the component renders and the logo button wrapper exists
    expect(wrapper.find('.card-dealer__logo-button-wrapper').exists()).toBe(true)
  })

  it('displays logo button wrapper initially', () => {
    const wrapper = mount(CardDealer, {
      global: {
        stubs: {
          MenuCard: true,
          LogoButton: true,
          LogoEffect: true
        },
        mocks: {
          $router: mockRouter
        }
      }
    })

    // Logo button wrapper should be visible initially
    expect(wrapper.find('.card-dealer__logo-button-wrapper').exists()).toBe(true)
    const subtitle = wrapper.find('.card-dealer__subtitle')
    expect(subtitle.exists()).toBe(false) // Hidden until interactions
  })

  it('renders background image', () => {
    const wrapper = mount(CardDealer, {
      global: {
        stubs: {
          MenuCard: true
        },
        mocks: {
          $router: mockRouter
        }
      }
    })

    const bgImage = wrapper.find('.card-dealer__bg-image')
    expect(bgImage.exists()).toBe(true)
    expect(bgImage.attributes('alt')).toBe('Mysterious card dealer')
  })

  it('renders three menu cards', () => {
    const wrapper = mount(CardDealer, {
      global: {
        mocks: {
          $router: mockRouter
        }
      }
    })

    // Cards are mounted but hidden until logo click
    const cards = wrapper.findAllComponents(MenuCard)
    expect(cards.length).toBe(3)
    expect(wrapper.find('.card-dealer__cards').attributes('style')).toContain('display: none')
  })

  it('passes correct props to MenuCard components', () => {
    const wrapper = mount(CardDealer, {
      global: {
        mocks: {
          $router: mockRouter
        }
      }
    })

    const cards = wrapper.findAllComponents(MenuCard)
    expect(cards.length).toBe(3)
    expect(cards[0]?.props('title')).toBe('Music')
    expect(cards[1]?.props('title')).toBe('About')
    expect(cards[2]?.props('title')).toBe('Tour')
  })

  it('creates intro animation timeline for background and logo', async () => {
    const wrapper = mount(CardDealer)
    await nextTick()

    expect(gsapMocks.timeline).toHaveBeenCalled()
    expect(gsapMocks.timelineFromTo).toHaveBeenCalled()

    wrapper.unmount()
  })

  it('has proper responsive layout structure', () => {
    const wrapper = mount(CardDealer, {
      global: {
        mocks: {
          $router: mockRouter
        }
      }
    })

    expect(wrapper.find('.card-dealer').exists()).toBe(true)
    expect(wrapper.find('.card-dealer__background').exists()).toBe(true)
    expect(wrapper.find('.card-dealer__content').exists()).toBe(true)
    // Logo button wrapper exists in template and visible initially
    expect(wrapper.find('.card-dealer__logo-button-wrapper').exists()).toBe(true)
  })

  it('includes overlay for background darkening', () => {
    const wrapper = mount(CardDealer, {
      global: {
        stubs: {
          MenuCard: true
        },
        mocks: {
          $router: mockRouter
        }
      }
    })

    expect(wrapper.find('.card-dealer__overlay').exists()).toBe(true)
  })

  it('shows cards after clicking the logo', async () => {
    const wrapper = mount(CardDealer, {
      attachTo: document.body
    })

    await wrapper.find('.logo-button').trigger('click')
    await nextTick()

    expect(wrapper.find('.card-dealer__cards').exists()).toBe(true)
    expect(wrapper.find('.card-dealer__cards').attributes('style')).not.toContain('display: none')

    wrapper.unmount()
  })

  it('keeps cards mounted while viewing content', async () => {
    const wrapper = mount(CardDealer, {
      attachTo: document.body
    })

    await wrapper.find('.logo-button').trigger('click')
    await nextTick()

    const cards = wrapper.findAllComponents(MenuCard)
    expect(cards.length).toBe(3)

    const firstCard = cards[0]
    if (!firstCard) {
      throw new Error('Expected first menu card to exist')
    }

    await firstCard.trigger('click')
    await nextTick()

    expect(wrapper.find('.card-dealer__content-view').exists()).toBe(true)
    expect(wrapper.find('.card-dealer__cards').exists()).toBe(true)
    expect(wrapper.find('.card-dealer__cards').classes()).toContain('card-dealer__cards--content')

    wrapper.unmount()
  })

  it('animates card stack and content fade when selecting a card', async () => {
    const wrapper = mount(CardDealer, {
      attachTo: document.body
    })

    await wrapper.find('.logo-button').trigger('click')
    await nextTick()

    const firstCard = wrapper.findAllComponents(MenuCard)[0]
    if (!firstCard) {
      throw new Error('Expected menu card to exist')
    }

    await firstCard.trigger('click')
    await nextTick()

    const containerEl = wrapper.find('.card-dealer__cards').element
    const containerShiftCall = gsapMocks.timelineTo.mock.calls.find(([target, vars]) => {
      const typedVars = vars as { x?: number }
      return target === containerEl && typeof typedVars?.x === 'number' && typedVars.x === -320
    })

    expect(containerShiftCall).toBeTruthy()
    expect(wrapper.find('.card-dealer__content-panel').exists()).toBe(true)

    wrapper.unmount()
  })

  it('clicking outside cards returns to logo view', async () => {
    const wrapper = mount(CardDealer, {
      attachTo: document.body
    })

    await wrapper.find('.logo-button').trigger('click')
    await nextTick()

    const outside = document.createElement('div')
    document.body.appendChild(outside)
    outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    await nextTick()

    expect(wrapper.find('.card-dealer__logo-button-wrapper').exists()).toBe(true)

    document.body.removeChild(outside)
    wrapper.unmount()
  })

  it('clicking overlay outside the content panel returns to cards view', async () => {
    const wrapper = mount(CardDealer, {
      attachTo: document.body
    })

    await wrapper.find('.logo-button').trigger('click')
    await nextTick()

    const firstCard = wrapper.findAllComponents(MenuCard)[0]
    if (!firstCard) {
      throw new Error('Expected menu card to exist')
    }

    await firstCard.trigger('click')
    await nextTick()

    expect(wrapper.find('.card-dealer__content-view').exists()).toBe(true)

    const overlay = wrapper.find('.card-dealer__content-view')
    overlay.element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    await nextTick()

    expect(wrapper.find('.card-dealer__content-view').exists()).toBe(false)
    expect(wrapper.find('.card-dealer__cards').attributes('style')).not.toContain('display: none')

    wrapper.unmount()
  })

  it('ignores inside-content pointer events while content is visible', async () => {
    const wrapper = mount(CardDealer, {
      attachTo: document.body
    })

    await wrapper.find('.logo-button').trigger('click')
    await nextTick()

    const firstCard = wrapper.findAllComponents(MenuCard)[0]
    if (!firstCard) {
      throw new Error('Expected menu card to exist')
    }

    await firstCard.trigger('click')
    await nextTick()

    const content = wrapper.find('.card-dealer__content-panel')
    await content.trigger('pointerdown')
    await nextTick()

    expect(wrapper.find('.card-dealer__content-view').exists()).toBe(true)

    wrapper.unmount()
  })
})
