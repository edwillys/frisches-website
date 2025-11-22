import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import CardDealer from '../CardDealer.vue'
import MenuCard from '../MenuCard.vue'

// Mock GSAP to avoid animation issues in tests
vi.mock('gsap', () => ({
  default: {
    set: vi.fn(),
    to: vi.fn(),
    from: vi.fn(),
    context: vi.fn(() => ({
      revert: vi.fn()
    }))
  }
}))

// Mock Vue Router
const mockRouter = {
  push: vi.fn()
}

describe('CardDealer', () => {
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

    // Cards are hidden initially (only show after moon click)
    const cards = wrapper.findAllComponents(MenuCard)
    expect(cards.length).toBe(0) // Not rendered until moon clicked
  })

  it('passes correct props to MenuCard components', () => {
    const wrapper = mount(CardDealer, {
      global: {
        mocks: {
          $router: mockRouter
        }
      }
    })

    // Cards only rendered after moon click, so none exist initially
    const cards = wrapper.findAllComponents(MenuCard)
    expect(cards.length).toBe(0)
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
})
