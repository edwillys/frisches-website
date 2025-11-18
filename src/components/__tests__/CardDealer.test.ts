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
          MenuCard: true
        },
        mocks: {
          $router: mockRouter
        }
      }
    })

    expect(wrapper.exists()).toBe(true)
  })

  it('displays the title "Frisches"', () => {
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

    expect(wrapper.find('.card-dealer__title').text()).toBe('Frisches')
  })

  it('displays the subtitle', () => {
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

    expect(wrapper.find('.card-dealer__subtitle').text()).toBe('Choose your path')
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

    const cards = wrapper.findAllComponents(MenuCard)
    expect(cards.length).toBe(3)
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
    
    expect(cards[0]?.props('title')).toBe('Music')
    expect(cards[0]?.props('route')).toBe('/music')
    
    expect(cards[1]?.props('title')).toBe('About')
    expect(cards[1]?.props('route')).toBe('/about')
    
    expect(cards[2]?.props('title')).toBe('Tour')
    expect(cards[2]?.props('route')).toBe('/tour')
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
    expect(wrapper.find('.card-dealer__cards').exists()).toBe(true)
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
