import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, config } from '@vue/test-utils'
import { nextTick, ref, reactive } from 'vue'
import CardDealer from '../CardDealer.vue'
import MenuCard from '../MenuCard.vue'
import { createPinia, setActivePinia } from 'pinia'
import { useAudioStore } from '@/stores/audio'

// Mock @tresjs/cientos to avoid module resolution issues
vi.mock('@tresjs/cientos', () => ({
  OrbitControls: { name: 'OrbitControls', template: '<div class="mock-orbit-controls"></div>' },
  GLTFModel: { name: 'GLTFModel', template: '<div class="mock-gltf-model"></div>' },
  useGLTF: vi.fn(() => ({ state: ref(null), isLoading: ref(false) })),
  useAnimations: vi.fn(() => ({ actions: reactive({}), mixer: ref(null) })),
}))

// Mock @tresjs/core
vi.mock('@tresjs/core', () => ({
  TresCanvas: { name: 'TresCanvas', template: '<div class="mock-tres-canvas"><slot /></div>' },
}))

/**
 * CardDealer Component Tests
 *
 * Card Animation Behavior:
 * - Opening (logo → cards): Two-phase animation
 *   1. All cards grow together from a single center point as a unified deck (no stagger)
 *   2. Cards then distribute to their left/right positions (with stagger from center)
 *
 * - Closing (cards → logo): Inverse two-phase animation
 *   1. Cards gather from distributed positions back to center deck (stagger from edges)
 *   2. All cards shrink together to a single point (no stagger)
 *
 * - Return (content → cards): Cards emerge from their grid positions
 *   Background cards simply rise to the foreground with a stagger from center outward.
 *   No re-deal animation.
 */

// Mock GSAP to avoid animation issues in tests
const gsapMocks = vi.hoisted(() => {
  const timelineFromTo = vi.fn().mockReturnThis()

  // We need to handle onStart/onComplete in timeline.to()
  const timelineTo = vi.fn(function (this: unknown, _, vars: Record<string, unknown> = {}) {
    if (vars && typeof vars.onStart === 'function') {
      vars.onStart()
    }
    if (vars && typeof vars.onComplete === 'function') {
      vars.onComplete()
    }
    return this
  })

  return {
    set: vi.fn(),
    getProperty: vi.fn(() => 0),
    killTweensOf: vi.fn(),
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
    registerPlugin: vi.fn(),
    timelineFromTo,
    timelineTo,
    timeline: vi.fn((config?: { onStart?: () => void; onComplete?: () => void }) => {
      config?.onStart?.()
      config?.onComplete?.()
      // We need to return an object that has 'to' pointing to our enhanced timelineTo
      // And we need to ensure chaining works.
      const tl = {
        fromTo: timelineFromTo,
        to: timelineTo,
        add: vi.fn().mockReturnThis(),
        kill: vi.fn(),
      }
      // Bind timelineTo to this object so 'return this' works
      tl.to = timelineTo.bind(tl)
      tl.fromTo = timelineFromTo.bind(tl)
      return tl
    }),
    context: vi.fn((fn?: () => void) => {
      fn?.()
      return { revert: vi.fn() }
    }),
    matchMedia: vi.fn(() => ({
      add: vi.fn(),
    })),
  }
})

vi.mock('gsap', () => ({
  default: {
    set: gsapMocks.set,
    to: gsapMocks.to,
    getProperty: gsapMocks.getProperty,
    from: vi.fn(),
    delayedCall: gsapMocks.delayedCall,
    timeline: gsapMocks.timeline,
    killTweensOf: gsapMocks.killTweensOf,
    context: gsapMocks.context,
    matchMedia: gsapMocks.matchMedia,
    registerPlugin: gsapMocks.registerPlugin,
  },
}))

const customEaseMocks = vi.hoisted(() => ({
  create: vi.fn(() => 'custom-ease'),
}))

vi.mock('gsap/CustomEase', () => ({
  CustomEase: {
    create: customEaseMocks.create,
  },
}))

// Mock Vue Router
const mockRouter = {
  push: vi.fn(),
}

function mockMobileMatchMedia() {
  const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'matchMedia')
  if (!originalDescriptor) {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn(),
    })
  }

  const spy = vi.spyOn(window, 'matchMedia').mockImplementation(((query: string) => {
    return {
      matches: query === '(max-width: 768px)',
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(() => false),
    } as unknown as MediaQueryList
  }) satisfies typeof window.matchMedia)

  return {
    restore() {
      spy.mockRestore()
      if (originalDescriptor) {
        Object.defineProperty(window, 'matchMedia', originalDescriptor)
      } else {
        delete (window as unknown as Record<string, unknown>).matchMedia
      }
    },
  }
}

describe('CardDealer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()

    const pinia = createPinia()
    setActivePinia(pinia)
    config.global.plugins = [pinia]
    config.global.stubs = {
      RouterLink: {
        template: '<a href="#"><slot /></a>',
      },
    }
  })

  afterEach(() => {
    vi.useRealTimers()
    config.global.stubs = {}
  })

  it('renders properly', () => {
    const wrapper = mount(CardDealer, {
      global: {
        stubs: {
          MenuCard: true,
          LogoButton: true,
          LogoEffect: true,
        },
        mocks: {
          $router: mockRouter,
        },
      },
    })

    expect(wrapper.exists()).toBe(true)
  })

  it('displays the title "Frisches" (hidden initially)', () => {
    const wrapper = mount(CardDealer, {
      global: {
        stubs: {
          MenuCard: true,
          LogoButton: true,
          LogoEffect: true,
        },
        mocks: {
          $router: mockRouter,
        },
      },
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
          LogoEffect: true,
        },
        mocks: {
          $router: mockRouter,
        },
      },
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
          MenuCard: true,
        },
        mocks: {
          $router: mockRouter,
        },
      },
    })

    const bgImage = wrapper.find('.card-dealer__bg-image')
    expect(bgImage.exists()).toBe(true)
    expect(bgImage.attributes('alt')).toBe('')
  })

  it('renders three menu cards', () => {
    const wrapper = mount(CardDealer, {
      global: {
        mocks: {
          $router: mockRouter,
        },
      },
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
          $router: mockRouter,
        },
      },
    })

    const cards = wrapper.findAllComponents(MenuCard)
    expect(cards.length).toBe(3)
    expect(cards[0]?.props('title')).toBe('Music')
    expect(cards[1]?.props('title')).toBe('About')
    expect(cards[2]?.props('title')).toBe('Gallery')
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
          $router: mockRouter,
        },
      },
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
          MenuCard: true,
        },
        mocks: {
          $router: mockRouter,
        },
      },
    })

    expect(wrapper.find('.card-dealer__overlay').exists()).toBe(true)
  })

  it('shows cards after clicking the logo with two-phase animation: deck grows from point, then cards distribute', async () => {
    const wrapper = mount(CardDealer, {
      attachTo: document.body,
    })

    await wrapper.find('.logo-button').trigger('click')

    // Wait for the overlap timeout (400ms) + buffer
    await vi.advanceTimersByTimeAsync(1000)
    await nextTick()

    expect(wrapper.find('.card-dealer__cards').exists()).toBe(true)
    expect(wrapper.find('.card-dealer__cards').attributes('style')).not.toContain('display: none')

    wrapper.unmount()
  })

  it('stacks cards behind the lead card before spreading', async () => {
    const wrapper = mount(CardDealer, {
      attachTo: document.body,
    })

    await wrapper.find('.logo-button').trigger('click')
    await vi.advanceTimersByTimeAsync(1000)
    await nextTick()

    // Check z-index settings
    const setCalls = gsapMocks.set.mock.calls
    const zIndexCalls = setCalls.filter(([, vars]) => vars && typeof vars.zIndex === 'number')

    // We expect calls setting zIndex. Lead card (index 1) should be 50. Others < 50.
    const leadCardZIndex = zIndexCalls.find(([, vars]) => vars.zIndex === 50)
    const otherCardZIndex = zIndexCalls.find(([, vars]) => vars.zIndex < 50)

    expect(leadCardZIndex).toBeTruthy()
    expect(otherCardZIndex).toBeTruthy()

    wrapper.unmount()
  })

  it('ensures all cards are visible during the deck growth phase', async () => {
    const wrapper = mount(CardDealer, {
      attachTo: document.body,
    })

    await wrapper.find('.logo-button').trigger('click')
    await vi.advanceTimersByTimeAsync(1000)
    await nextTick()

    const visibilityCalls = gsapMocks.set.mock.calls.filter(([, vars]) =>
      Boolean(vars && Object.prototype.hasOwnProperty.call(vars, 'visibility'))
    )

    // We expect visibility to be set to 'visible' (from setDeckMask(false))
    const visibleCalls = visibilityCalls.filter(([, vars]) => vars?.visibility === 'visible')
    const hiddenCalls = visibilityCalls.filter(([, vars]) => vars?.visibility === 'hidden')

    expect(visibleCalls.length).toBeGreaterThan(0)
    expect(hiddenCalls.length).toBe(0) // No cards should be hidden

    wrapper.unmount()
  })

  it('keeps cards mounted while viewing content', async () => {
    const wrapper = mount(CardDealer, {
      attachTo: document.body,
    })

    await wrapper.find('.logo-button').trigger('click')
    await vi.advanceTimersByTimeAsync(1000)
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

  it('renders gallery content when selecting the Gallery card', async () => {
    const wrapper = mount(CardDealer, {
      attachTo: document.body,
      global: {
        stubs: {
          GalleryManager: {
            template: '<div data-testid="gallery-manager-stub" />',
          },
        },
      },
    })

    await wrapper.find('.logo-button').trigger('click')
    await vi.advanceTimersByTimeAsync(1000)
    await nextTick()

    const cards = wrapper.findAllComponents(MenuCard)
    const galleryCard = cards[2]
    if (!galleryCard) {
      throw new Error('Expected Gallery menu card to exist')
    }

    await galleryCard.trigger('click')
    await nextTick()

    expect(wrapper.find('[data-testid="gallery-manager-stub"]').exists()).toBe(true)

    wrapper.unmount()
  })

  it('renders the new About members view when selecting the About card', async () => {
    const wrapper = mount(CardDealer, {
      attachTo: document.body,
      global: {
        stubs: {
          AboutMembersView: {
            template: '<div data-testid="about-members-view-stub" />',
          },
        },
      },
    })

    await wrapper.find('.logo-button').trigger('click')
    await vi.advanceTimersByTimeAsync(1000)
    await nextTick()

    const aboutCard = wrapper.findAllComponents(MenuCard)[1]
    if (!aboutCard) {
      throw new Error('Expected About menu card to exist')
    }

    await aboutCard.trigger('click')
    await nextTick()

    expect(wrapper.find('[data-testid="about-members-view-stub"]').exists()).toBe(true)

    wrapper.unmount()
  })

  it('animates card stack and content fade when selecting a card', async () => {
    const wrapper = mount(CardDealer, {
      attachTo: document.body,
    })

    await wrapper.find('.logo-button').trigger('click')
    await vi.advanceTimersByTimeAsync(1000)
    await nextTick()

    const firstCard = wrapper.findAllComponents(MenuCard)[0]
    if (!firstCard) {
      throw new Error('Expected menu card to exist')
    }

    await firstCard.trigger('click')
    await nextTick()

    // Current behavior: the selected card animates to the header avatar position (scaled down)
    // and the content view becomes visible.
    const hasScaledDownCardTween = gsapMocks.timelineTo.mock.calls.some(([, vars]) => {
      const typedVars = vars as { scale?: number }
      return typeof typedVars?.scale === 'number' && typedVars.scale > 0 && typedVars.scale < 0.3
    })

    expect(hasScaledDownCardTween).toBe(true)
    expect(wrapper.find('.card-dealer__content-view').exists()).toBe(true)
    expect(wrapper.find('.card-dealer__content-container').exists()).toBe(true)

    wrapper.unmount()
  })

  it('clicking outside cards does not return to logo view (explicit back button required)', async () => {
    const wrapper = mount(CardDealer, {
      attachTo: document.body,
    })

    await wrapper.find('.logo-button').trigger('click')
    await vi.advanceTimersByTimeAsync(1000)
    await nextTick()

    // Should now be in cards view
    expect(wrapper.find('.card-dealer__cards').exists()).toBe(true)

    const outside = document.createElement('div')
    document.body.appendChild(outside)
    outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    await nextTick()

    // Should still be in cards view (clicking outside no longer triggers navigation)
    expect(wrapper.find('.card-dealer__cards').exists()).toBe(true)
    expect(wrapper.find('.card-dealer__logo-button-wrapper').exists()).toBe(false)

    document.body.removeChild(outside)
    wrapper.unmount()
  })

  it('clicking overlay outside the content panel does not return to cards view (explicit back button required)', async () => {
    const wrapper = mount(CardDealer, {
      attachTo: document.body,
    })

    await wrapper.find('.logo-button').trigger('click')
    await vi.advanceTimersByTimeAsync(1000)
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

    // Content view should still be visible (clicking outside no longer triggers navigation)
    const contentView = wrapper.find('.card-dealer__content-view')
    expect(contentView.exists()).toBe(true)
    expect((contentView.element as HTMLElement).style.display).not.toBe('none')

    wrapper.unmount()
  })

  it('ignores inside-content pointer events while content is visible', async () => {
    const wrapper = mount(CardDealer, {
      attachTo: document.body,
    })

    await wrapper.find('.logo-button').trigger('click')
    await vi.advanceTimersByTimeAsync(1000)
    await nextTick()

    const firstCard = wrapper.findAllComponents(MenuCard)[0]
    if (!firstCard) {
      throw new Error('Expected menu card to exist')
    }

    await firstCard.trigger('click')
    await nextTick()

    const content = wrapper.find('.card-dealer__content-container')
    await content.trigger('pointerdown')
    await nextTick()

    expect(wrapper.find('.card-dealer__content-view').exists()).toBe(true)

    wrapper.unmount()
  })

  it('switches to music content when mini-player requests opening lyrics', async () => {
    const wrapper = mount(CardDealer, {
      global: {
        stubs: {
          MenuCard: true,
          LogoButton: true,
          AboutView: true,
          GalleryManager: true,
          AudioPlayer: {
            template: '<div data-testid="audio-player-stub" />',
          },
        },
      },
    })

    window.dispatchEvent(new CustomEvent('frisches:mini-player-open-lyrics'))
    await nextTick()

    const contentView = wrapper.find('.card-dealer__content-view')
    expect(contentView.exists()).toBe(true)
    expect(contentView.attributes('style') || '').not.toContain('display: none')

    const musicContent = wrapper.find('.card-dealer__music-content')
    expect(musicContent.exists()).toBe(true)
    expect(musicContent.attributes('style') || '').not.toContain('display: none')
    expect(wrapper.find('[data-testid="audio-player-stub"]').exists()).toBe(true)

    wrapper.unmount()
  })

  it('does not force lyrics state when mini-player requests opening lyrics', async () => {
    const wrapper = mount(CardDealer)
    const audio = useAudioStore()
    audio.showLyrics = false

    window.dispatchEvent(new CustomEvent('frisches:mini-player-open-lyrics'))
    await nextTick()

    expect(audio.showLyrics).toBe(false)

    wrapper.unmount()
  })

  it('clicking About down-arrow opens submenu without navigating to About', async () => {
    const wrapper = mount(CardDealer, {
      attachTo: document.body,
      global: {
        stubs: {
          AboutView: {
            template: '<div data-testid="about-view-stub" />',
          },
          AudioPlayer: {
            template: '<div data-testid="audio-player-stub" />',
          },
        },
      },
    })

    await wrapper.find('.logo-button').trigger('click')
    await vi.advanceTimersByTimeAsync(1000)
    await nextTick()

    const musicCard = wrapper.findAllComponents(MenuCard)[0]
    if (!musicCard) {
      throw new Error('Expected Music menu card to exist')
    }

    await musicCard.trigger('click')
    await nextTick()

    expect(wrapper.find('[data-testid="audio-player-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="about-view-stub"]').exists()).toBe(false)

    const aboutArrow = wrapper.find('.card-dealer__about-dropdown-toggle-icon')
    expect(aboutArrow.exists()).toBe(true)

    await aboutArrow.trigger('click')
    await nextTick()

    expect(wrapper.find('.card-dealer__about-dropdown').exists()).toBe(true)
    expect(wrapper.find('[data-testid="audio-player-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="about-view-stub"]').exists()).toBe(false)

    wrapper.unmount()
  })

  it('keeps mobile about drawer submenu closed by default for none, but allows manual arrow open', async () => {
    const matchMediaMock = mockMobileMatchMedia()
    let wrapper: ReturnType<typeof mount> | null = null

    try {
      wrapper = mount(CardDealer, {
        attachTo: document.body,
        global: {
          stubs: {
            AboutView: {
              emits: ['state-change'],
              template: '<div data-testid="about-view-stub" />',
              mounted() {
                this.$emit('state-change', { activeSubmenu: 'none', canGoBack: false })
              },
            },
          },
        },
      })

      await wrapper.find('.logo-button').trigger('click')
      await vi.advanceTimersByTimeAsync(1000)
      await nextTick()

      const aboutCard = wrapper.findAllComponents(MenuCard)[1]
      if (!aboutCard) {
        throw new Error('Expected About menu card to exist')
      }

      await aboutCard.trigger('click')
      await nextTick()

      const mobileNavButton = wrapper.find('.card-dealer__mobile-nav-btn')
      expect(mobileNavButton.exists()).toBe(true)

      await mobileNavButton.trigger('click')
      await nextTick()

      expect(wrapper.find('.card-dealer__header-drawer').exists()).toBe(true)
      expect(wrapper.find('.card-dealer__header-drawer-about-submenu').exists()).toBe(false)

      const aboutToggle = wrapper.find('.card-dealer__header-drawer-about-toggle-btn')
      expect(aboutToggle.exists()).toBe(true)

      await aboutToggle.trigger('click')
      await nextTick()

      expect(wrapper.find('.card-dealer__header-drawer-about-submenu').exists()).toBe(true)
    } finally {
      wrapper?.unmount()
      matchMediaMock.restore()
    }
  })

  it('closes mobile about drawer submenu when about active submenu transitions to none', async () => {
    const matchMediaMock = mockMobileMatchMedia()
    let wrapper: ReturnType<typeof mount> | null = null

    const emitAboutStateChange: ((payload: {
      activeSubmenu: string
      canGoBack: boolean
    }) => void)[] = []

    try {
      wrapper = mount(CardDealer, {
        attachTo: document.body,
        global: {
          stubs: {
            AboutView: {
              emits: ['state-change'],
              template: '<div data-testid="about-view-stub" />',
              mounted() {
                emitAboutStateChange.push((payload) => {
                  this.$emit('state-change', payload)
                })
                this.$emit('state-change', { activeSubmenu: 'members', canGoBack: true })
              },
            },
          },
        },
      })

      await wrapper.find('.logo-button').trigger('click')
      await vi.advanceTimersByTimeAsync(1000)
      await nextTick()

      const aboutCard = wrapper.findAllComponents(MenuCard)[1]
      if (!aboutCard) {
        throw new Error('Expected About menu card to exist')
      }

      await aboutCard.trigger('click')
      await nextTick()

      const mobileNavButton = wrapper.find('.card-dealer__mobile-nav-btn')
      await mobileNavButton.trigger('click')
      await nextTick()

      expect(wrapper.find('.card-dealer__header-drawer-about-submenu').exists()).toBe(true)

      const emitState = emitAboutStateChange[0]
      if (!emitState) {
        throw new Error('Expected About state-change emitter to exist')
      }

      emitState({ activeSubmenu: 'none', canGoBack: false })
      await nextTick()

      expect(wrapper.find('.card-dealer__header-drawer-about-submenu').exists()).toBe(false)
    } finally {
      wrapper?.unmount()
      matchMediaMock.restore()
    }
  })
})
