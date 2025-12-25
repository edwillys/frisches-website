import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import CharacterSelection from '../CharacterSelection.vue'
import { nextTick, ref, reactive } from 'vue'
import type { ComponentPublicInstance } from 'vue'

interface TimelineChain {
  to: (selector: string, props: unknown) => TimelineChain
  call: (callback: () => void) => TimelineChain
}

// Mock GSAP to execute animations synchronously and call onComplete
vi.mock('gsap', () => ({
  default: {
    timeline: vi.fn((config?: { onComplete?: () => void }) => {
      const chain: TimelineChain = {
        to: vi.fn(function (this: TimelineChain) {
          return this
        }),
        call: vi.fn(function (this: TimelineChain, callback: () => void) {
          callback()
          return this
        }),
      }
      // Execute onComplete synchronously to set isAnimating = false
      if (config?.onComplete) {
        setTimeout(config.onComplete, 0)
      }
      return chain
    }),
    // Mock gsap.to for camera reset animations
    to: vi.fn((target, props) => {
      // Execute onUpdate if provided
      if (props?.onUpdate) {
        props.onUpdate()
      }
      return {}
    }),
  },
}))

// Component VM shape used in tests to avoid `any` and satisfy linting
type Character = {
  id: number
  name: string
  modelPath: string
  instruments: string[]
  influences: string[]
  favoriteSong: string
}

type ComponentVM = {
  characters: Character[]
  selectedIndex: number
  selectedCharacter: Character
  isAnimating: boolean
  nextCharacter: () => void
  prevCharacter: () => void
  selectCharacter: (index: number) => void
  handleKeydown: (e: KeyboardEvent) => void
}

// Mock TresJS components - must be simple for hoisting
vi.mock('@tresjs/core', () => ({
  TresCanvas: {
    name: 'TresCanvas',
    template: '<div class="mock-tres-canvas"><slot /></div>',
  },
}))

vi.mock('@tresjs/cientos', () => {
  const useGLTFMock = vi.fn(() => ({
    state: ref(null),
    isLoading: ref(false),
  })) as unknown as { preload: ReturnType<typeof vi.fn> }
  useGLTFMock.preload = vi.fn()

  return {
    OrbitControls: {
      name: 'OrbitControls',
      template: '<div class="mock-orbit-controls"></div>',
    },
    useGLTF: useGLTFMock,
    useAnimations: vi.fn(() => ({
      actions: reactive({}),
      mixer: ref(null),
    })),
  }
})

// Mock Three.js classes
vi.mock('three', () => ({
  Color: vi.fn(function (this: { value: number }, value: number) {
    this.value = value
  }),
  DoubleSide: 2,
  Vector3: vi.fn(function (
    this: { x: number; y: number; z: number },
    x: number,
    y: number,
    z: number
  ) {
    this.x = x
    this.y = y
    this.z = z
  }),
  GLTFLoader: vi.fn(() => ({
    load: vi.fn(),
  })),
  ACESFilmicToneMapping: 4,
  PCFSoftShadowMap: 2,
  SRGBColorSpace: 'srgb',
}))

// Global stubs for all Tres components
const globalStubs = {
  TresCanvas: true,
  TresPerspectiveCamera: true,
  TresAmbientLight: true,
  TresDirectionalLight: true,
  TresPointLight: true,
  TresGroup: true,
  TresMesh: true,
  TresCircleGeometry: true,
  TresRingGeometry: true,
  TresSphereGeometry: true,
  TresPlaneGeometry: true,
  TresMeshStandardMaterial: true,
  TresMeshBasicMaterial: true,
  OrbitControls: true,
  primitive: true,
  GLTFModelWithEvents: true,
}

// Helper to create keyboard events
const createKeyboardEvent = (key: string): KeyboardEvent => {
  return new KeyboardEvent('keydown', { key, bubbles: true })
}

// Helper to create touch events
const createTouchEvent = (type: 'touchstart' | 'touchend', screenX: number): TouchEvent => {
  const touch = {
    screenX,
    screenY: 0,
    clientX: screenX,
    clientY: 0,
    pageX: screenX,
    pageY: 0,
    identifier: 0,
    target: document.body,
    radiusX: 0,
    radiusY: 0,
    rotationAngle: 0,
    force: 0,
  } as Touch
  return new TouchEvent(type, {
    touches: type === 'touchstart' ? [touch] : [],
    changedTouches: [touch],
    bubbles: true,
  })
}

describe('CharacterSelection', () => {
  let wrapper: VueWrapper<ComponentPublicInstance>

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  it('renders properly with character selection interface', () => {
    const wrapper = mount(CharacterSelection, {
      global: {
        stubs: globalStubs,
      },
    })

    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.character-selection').exists()).toBe(true)
    expect(wrapper.find('.character-selection__model-container').exists()).toBe(true)
    expect(wrapper.find('.character-selection__card').exists()).toBe(true)
  })

  it('displays character selection buttons', () => {
    const wrapper = mount(CharacterSelection, {
      global: {
        stubs: globalStubs,
      },
    })

    const vm = wrapper.vm as unknown as ComponentVM
    const buttons = wrapper.findAll('.character-selection__button')
    expect(buttons).toHaveLength(vm.characters.length)
    expect(buttons[0]?.classes()).toContain('character-selection__button--active')
  })

  it('displays first character profile by default', () => {
    const wrapper = mount(CharacterSelection, {
      global: {
        stubs: {
          TresCanvas: true,
          OrbitControls: true,
          Suspense: true,
        },
      },
    })

    const vm = wrapper.vm as unknown as ComponentVM
    expect(vm.characters.length).toBeGreaterThan(0)

    const cardTitle = wrapper.find('.character-selection__card-title')
    expect(cardTitle.text()).toBe(vm.selectedCharacter.name)

    // Check badges (instruments) in portrait area
    const badges = wrapper.findAll('.character-selection__badge')
    expect(badges).toHaveLength(vm.selectedCharacter.instruments.length)

    const favoriteSong = wrapper.find('.character-selection__favorite-song')
    expect(favoriteSong.text()).toBe(vm.selectedCharacter.favoriteSong)
  })

  it('switches character when button is clicked', async () => {
    const wrapper = mount(CharacterSelection, {
      global: {
        stubs: globalStubs,
      },
    })

    const vm = wrapper.vm as unknown as ComponentVM
    expect(vm.characters.length).toBeGreaterThan(1)

    let cardTitle = wrapper.find('.character-selection__card-title')
    expect(cardTitle.text()).toBe(vm.selectedCharacter.name)

    // Click second button to switch character
    const buttons = wrapper.findAll('.character-selection__button')
    await buttons[1]?.trigger('click')
    await nextTick()

    cardTitle = wrapper.find('.character-selection__card-title')
    expect(cardTitle.text()).toBe(vm.selectedCharacter.name)

    const badges = wrapper.findAll('.character-selection__badge')
    expect(badges).toHaveLength(vm.selectedCharacter.instruments.length)

    const favoriteSong = wrapper.find('.character-selection__favorite-song')
    expect(favoriteSong.text()).toBe(vm.selectedCharacter.favoriteSong)
  })

  it('displays character influences correctly', () => {
    wrapper = mount(CharacterSelection, {
      global: {
        stubs: globalStubs,
      },
    })

    const vm = wrapper.vm as unknown as ComponentVM

    const infoSections = wrapper.findAll('.character-selection__info-section')
    const influencesSection = infoSections.find(
      (section) => section.find('.character-selection__section-title').text() === 'Influences'
    )

    expect(influencesSection).toBeTruthy()

    const influences = influencesSection?.findAll('.character-selection__influence-chip')
    expect(influences).toHaveLength(vm.selectedCharacter.influences.length)
    vm.selectedCharacter.influences.forEach((influence, i) => {
      expect(influences?.[i]?.text()).toBe(influence)
    })
  })

  it('updates influences when character changes', async () => {
    wrapper = mount(CharacterSelection, {
      global: {
        stubs: globalStubs,
      },
    })

    const vm = wrapper.vm as unknown as ComponentVM
    expect(vm.characters.length).toBeGreaterThan(1)

    const buttons = wrapper.findAll('.character-selection__button')

    // Switch to second character
    await buttons[1]?.trigger('click')
    await nextTick()

    const infoSections = wrapper.findAll('.character-selection__info-section')
    const influencesSection = infoSections.find(
      (section) => section.find('.character-selection__section-title').text() === 'Influences'
    )

    const influences = influencesSection?.findAll('.character-selection__influence-chip')
    expect(influences).toHaveLength(vm.selectedCharacter.influences.length)
    vm.selectedCharacter.influences.forEach((influence, i) => {
      expect(influences?.[i]?.text()).toBe(influence)
    })
  })

  it('displays all info sections with correct titles', () => {
    wrapper = mount(CharacterSelection, {
      global: {
        stubs: globalStubs,
      },
    })

    const titles = wrapper.findAll('.character-selection__section-title').map((el) => el.text())

    expect(titles).toEqual(['Influences', 'Favorite Frisches Song'])
  })

  it('maintains correct character data structure', () => {
    wrapper = mount(CharacterSelection, {
      global: {
        stubs: globalStubs,
      },
    })

    const vm = wrapper.vm as unknown as ComponentVM

    // Check character data structure
    expect(vm.characters.length).toBeGreaterThan(0)
    expect(vm.characters[0]).toHaveProperty('id')
    expect(vm.characters[0]).toHaveProperty('name')
    expect(vm.characters[0]).toHaveProperty('modelPath')
    expect(vm.characters[0]).toHaveProperty('instruments')
    expect(vm.characters[0]).toHaveProperty('influences')
    expect(vm.characters[0]).toHaveProperty('favoriteSong')
  })

  it('starts with first character selected', () => {
    wrapper = mount(CharacterSelection, {
      global: {
        stubs: globalStubs,
      },
    })

    const vm = wrapper.vm as unknown as ComponentVM
    expect(vm.selectedIndex).toBe(0)
    expect(vm.selectedCharacter.name).toBe(vm.characters[0]!.name)
  })

  it('computed selectedCharacter returns correct character', async () => {
    wrapper = mount(CharacterSelection, {
      global: {
        stubs: globalStubs,
      },
    })

    const vm = wrapper.vm as unknown as ComponentVM

    expect(vm.characters.length).toBeGreaterThan(1)

    // Initially selected character at index 0
    expect(vm.selectedCharacter.id).toBe(vm.characters[0]!.id)
    expect(vm.selectedCharacter.name).toBe(vm.characters[0]!.name)

    // Select character 2 using button
    const buttons = wrapper.findAll('.character-selection__button')
    await buttons[1]?.trigger('click')

    // Wait for animation to complete
    await new Promise((resolve) => setTimeout(resolve, 100))
    await nextTick()

    expect(vm.selectedCharacter.id).toBe(vm.characters[1]!.id)
    expect(vm.selectedCharacter.name).toBe(vm.characters[1]!.name)
  })

  it('renders character selection buttons', async () => {
    wrapper = mount(CharacterSelection, {
      global: {
        stubs: globalStubs,
      },
    })

    const vm = wrapper.vm as unknown as ComponentVM

    const buttons = wrapper.findAll('.character-selection__button')
    expect(buttons).toHaveLength(vm.characters.length)

    // Initially first button is active
    expect(buttons[0]?.classes()).toContain('character-selection__button--active')

    // Click second button
    await buttons[1]?.trigger('click')

    // Wait for animation to complete
    await new Promise((resolve) => setTimeout(resolve, 100))
    await nextTick()

    // Now second button should be active
    expect(buttons[1]?.classes()).toContain('character-selection__button--active')
  })

  it('disables buttons during animation', async () => {
    wrapper = mount(CharacterSelection, {
      global: {
        stubs: globalStubs,
      },
    })

    const buttons = wrapper.findAll('.character-selection__button')

    // Initially not disabled
    expect(buttons[0]?.attributes('disabled')).toBeUndefined()

    // Click button
    await buttons[1]?.trigger('click')

    // Should be disabled during animation
    const vm = wrapper.vm as unknown as ComponentVM
    expect(vm.isAnimating).toBe(true)
  })

  it('renders 3D scene container', () => {
    wrapper = mount(CharacterSelection, {
      global: {
        stubs: globalStubs,
      },
    })

    expect(wrapper.find('.character-selection__model-container').exists()).toBe(true)
  })

  it('has proper CSS classes for styling', () => {
    wrapper = mount(CharacterSelection, {
      global: {
        stubs: globalStubs,
      },
    })

    // Check main container classes
    expect(wrapper.find('.character-selection').exists()).toBe(true)
    expect(wrapper.find('.character-selection__model-container').exists()).toBe(true)
    expect(wrapper.find('.character-selection__card').exists()).toBe(true)
    expect(wrapper.find('.character-selection__buttons').exists()).toBe(true)

    // Check detail classes
    expect(wrapper.find('.character-selection__card-title').exists()).toBe(true)
    expect(wrapper.find('.character-selection__portrait-row').exists()).toBe(true)
    expect(wrapper.find('.character-selection__info-section').exists()).toBe(true)
    expect(wrapper.find('.character-selection__section-title').exists()).toBe(true)
    expect(wrapper.find('.character-selection__badges-container').exists()).toBe(true)
  })

  // =============================================
  // ESCAPE KEY TESTS
  // =============================================
  describe('Escape key behavior', () => {
    it('emits back event when Escape key is pressed', async () => {
      wrapper = mount(CharacterSelection, {
        global: {
          stubs: globalStubs,
        },
      })

      // Dispatch Escape key event
      window.dispatchEvent(createKeyboardEvent('Escape'))
      await nextTick()

      expect(wrapper.emitted('back')).toBeTruthy()
      expect(wrapper.emitted('back')).toHaveLength(1)
    })

    it('emits back event multiple times for multiple Escape presses', async () => {
      wrapper = mount(CharacterSelection, {
        global: {
          stubs: globalStubs,
        },
      })

      // Press Escape multiple times
      window.dispatchEvent(createKeyboardEvent('Escape'))
      await nextTick()
      window.dispatchEvent(createKeyboardEvent('Escape'))
      await nextTick()

      expect(wrapper.emitted('back')).toHaveLength(2)
    })

    it('does not emit back for other keys', async () => {
      wrapper = mount(CharacterSelection, {
        global: {
          stubs: globalStubs,
        },
      })

      window.dispatchEvent(createKeyboardEvent('Enter'))
      window.dispatchEvent(createKeyboardEvent('Space'))
      window.dispatchEvent(createKeyboardEvent('Tab'))
      await nextTick()

      expect(wrapper.emitted('back')).toBeFalsy()
    })
  })

  // =============================================
  // KEYBOARD NAVIGATION TESTS
  // =============================================
  describe('Keyboard navigation', () => {
    it('navigates to next character with ArrowRight', async () => {
      wrapper = mount(CharacterSelection, {
        global: {
          stubs: globalStubs,
        },
      })

      const vm = wrapper.vm as unknown as ComponentVM
      expect(vm.selectedIndex).toBe(0)

      window.dispatchEvent(createKeyboardEvent('ArrowRight'))
      await new Promise((resolve) => setTimeout(resolve, 100))
      await nextTick()

      expect(vm.selectedIndex).toBe(1)
    })

    it('navigates to previous character with ArrowLeft', async () => {
      wrapper = mount(CharacterSelection, {
        global: {
          stubs: globalStubs,
        },
      })

      const vm = wrapper.vm as unknown as ComponentVM

      // First go to index 1
      window.dispatchEvent(createKeyboardEvent('ArrowRight'))
      await new Promise((resolve) => setTimeout(resolve, 100))
      await nextTick()
      expect(vm.selectedIndex).toBe(1)

      // Then go back
      window.dispatchEvent(createKeyboardEvent('ArrowLeft'))
      await new Promise((resolve) => setTimeout(resolve, 100))
      await nextTick()

      expect(vm.selectedIndex).toBe(0)
    })

    it('wraps around to first character when navigating past last', async () => {
      wrapper = mount(CharacterSelection, {
        global: {
          stubs: globalStubs,
        },
      })

      const vm = wrapper.vm as unknown as ComponentVM
      const lastIndex = vm.characters.length - 1

      // Navigate directly to last character by clicking its button
      const buttons = wrapper.findAll('.character-selection__button')
      await buttons[lastIndex]?.trigger('click')
      await new Promise((resolve) => setTimeout(resolve, 150))
      await nextTick()
      expect(vm.selectedIndex).toBe(lastIndex)

      // Navigate past last - should wrap to first
      window.dispatchEvent(createKeyboardEvent('ArrowRight'))
      await new Promise((resolve) => setTimeout(resolve, 150))
      await nextTick()

      expect(vm.selectedIndex).toBe(0)
    })

    it('wraps around to last character when navigating before first', async () => {
      wrapper = mount(CharacterSelection, {
        global: {
          stubs: globalStubs,
        },
      })

      const vm = wrapper.vm as unknown as ComponentVM
      expect(vm.selectedIndex).toBe(0)

      // Navigate before first - should wrap to last
      window.dispatchEvent(createKeyboardEvent('ArrowLeft'))
      await new Promise((resolve) => setTimeout(resolve, 150))
      await nextTick()

      expect(vm.selectedIndex).toBe(vm.characters.length - 1)
    })
  })

  // =============================================
  // SWIPE GESTURE TESTS
  // =============================================
  describe('Swipe gestures', () => {
    it('navigates to next character on left swipe', async () => {
      wrapper = mount(CharacterSelection, {
        global: {
          stubs: globalStubs,
        },
      })

      const vm = wrapper.vm as unknown as ComponentVM
      expect(vm.selectedIndex).toBe(0)

      // Simulate swipe left (start at 200, end at 100 = -100 difference)
      window.dispatchEvent(createTouchEvent('touchstart', 200))
      window.dispatchEvent(createTouchEvent('touchend', 100))
      await new Promise((resolve) => setTimeout(resolve, 100))
      await nextTick()

      expect(vm.selectedIndex).toBe(1)
    })

    it('navigates to previous character on right swipe', async () => {
      wrapper = mount(CharacterSelection, {
        global: {
          stubs: globalStubs,
        },
      })

      const vm = wrapper.vm as unknown as ComponentVM

      // First move to index 1 using button click
      const buttons = wrapper.findAll('.character-selection__button')
      await buttons[1]?.trigger('click')
      await new Promise((resolve) => setTimeout(resolve, 50))
      await nextTick()
      expect(vm.selectedIndex).toBe(1)

      // Simulate swipe right (start at 100, end at 200 = +100 difference)
      window.dispatchEvent(createTouchEvent('touchstart', 100))
      window.dispatchEvent(createTouchEvent('touchend', 200))
      await new Promise((resolve) => setTimeout(resolve, 50))
      await nextTick()

      expect(vm.selectedIndex).toBe(0)
    })

    it('does not navigate on small swipe (below threshold)', async () => {
      wrapper = mount(CharacterSelection, {
        global: {
          stubs: globalStubs,
        },
      })

      const vm = wrapper.vm as unknown as ComponentVM
      expect(vm.selectedIndex).toBe(0)

      // Simulate small swipe (only 30px, threshold is 50)
      window.dispatchEvent(createTouchEvent('touchstart', 100))
      window.dispatchEvent(createTouchEvent('touchend', 70))
      await nextTick()

      expect(vm.selectedIndex).toBe(0) // Should not change
    })
  })

  // =============================================
  // EDGE CASES
  // =============================================
  describe('Edge cases', () => {
    it('does not change character when clicking already selected button', async () => {
      wrapper = mount(CharacterSelection, {
        global: {
          stubs: globalStubs,
        },
      })

      const vm = wrapper.vm as unknown as ComponentVM
      expect(vm.selectedIndex).toBe(0)

      const buttons = wrapper.findAll('.character-selection__button')
      await buttons[0]?.trigger('click')
      await nextTick()

      // Should still be 0 and not animating
      expect(vm.selectedIndex).toBe(0)
      expect(vm.isAnimating).toBe(false)
    })

    it('handles character with single instrument', async () => {
      wrapper = mount(CharacterSelection, {
        global: {
          stubs: globalStubs,
        },
      })

      // Navigate to Steff (index 2) who has only Drums
      const buttons = wrapper.findAll('.character-selection__button')
      await buttons[2]?.trigger('click')
      await nextTick()

      const vm = wrapper.vm as unknown as ComponentVM
      expect(vm.selectedIndex).toBe(2)

      const badges = wrapper.findAll('.character-selection__badge')
      expect(badges.length).toBe(1)
      expect(badges[0]?.attributes('title')).toBe('Drums')
    })

    it('handles character with multiple instruments', () => {
      wrapper = mount(CharacterSelection, {
        global: {
          stubs: globalStubs,
        },
      })

      const vm = wrapper.vm as unknown as ComponentVM
      // First character (Edgar) has multiple instruments
      const badges = wrapper.findAll('.character-selection__badge')
      expect(badges.length).toBe(vm.selectedCharacter.instruments.length)
    })

    it('cleans up event listeners on unmount', async () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

      wrapper = mount(CharacterSelection, {
        global: {
          stubs: globalStubs,
        },
      })

      wrapper.unmount()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith('touchstart', expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith('touchend', expect.any(Function))

      removeEventListenerSpy.mockRestore()
    })

    it('adds event listeners on mount', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

      wrapper = mount(CharacterSelection, {
        global: {
          stubs: globalStubs,
        },
      })

      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
      expect(addEventListenerSpy).toHaveBeenCalledWith('touchstart', expect.any(Function))
      expect(addEventListenerSpy).toHaveBeenCalledWith('touchend', expect.any(Function))

      addEventListenerSpy.mockRestore()
    })
  })

  // =============================================
  // CHARACTER CARD DISPLAY TESTS
  // =============================================
  describe('Character card display', () => {
    it('displays instrument badges correctly', () => {
      wrapper = mount(CharacterSelection, {
        global: {
          stubs: globalStubs,
        },
      })

      const vm = wrapper.vm as unknown as ComponentVM
      const badges = wrapper.findAll('.character-selection__badge')

      expect(badges).toHaveLength(vm.selectedCharacter.instruments.length)

      // Check each badge has an image
      badges.forEach((badge) => {
        expect(badge.find('img').exists()).toBe(true)
      })
    })

    it('displays favorite song with play icon', () => {
      wrapper = mount(CharacterSelection, {
        global: {
          stubs: globalStubs,
        },
      })

      const vm = wrapper.vm as unknown as ComponentVM
      const songLink = wrapper.find('.character-selection__favorite-song-link')

      expect(songLink.exists()).toBe(true)
      expect(songLink.find('.character-selection__favorite-song').text()).toBe(
        vm.selectedCharacter.favoriteSong
      )
      expect(songLink.find('.character-selection__play-icon').exists()).toBe(true)
    })

    it('displays character initial in portrait', () => {
      wrapper = mount(CharacterSelection, {
        global: {
          stubs: globalStubs,
        },
      })

      const vm = wrapper.vm as unknown as ComponentVM
      const portrait = wrapper.find('.character-selection__portrait-inner')

      expect(portrait.text()).toBe(vm.selectedCharacter.name.charAt(0))
    })

    it('updates badges when character changes', async () => {
      wrapper = mount(CharacterSelection, {
        global: {
          stubs: globalStubs,
        },
      })

      const vm = wrapper.vm as unknown as ComponentVM
      const initialBadgeCount = wrapper.findAll('.character-selection__badge').length

      // Switch to a character with different instruments
      const buttons = wrapper.findAll('.character-selection__button')
      await buttons[2]?.trigger('click') // Steff - only Drums
      await new Promise((resolve) => setTimeout(resolve, 100))
      await nextTick()

      const newBadgeCount = wrapper.findAll('.character-selection__badge').length
      expect(newBadgeCount).toBe(vm.selectedCharacter.instruments.length)
      expect(newBadgeCount).not.toBe(initialBadgeCount)
    })
  })

  // =============================================
  // ANIMATION STATE TESTS
  // =============================================
  describe('Animation state management', () => {
    it('prevents rapid character switching during animation', async () => {
      wrapper = mount(CharacterSelection, {
        global: {
          stubs: globalStubs,
        },
      })

      const vm = wrapper.vm as unknown as ComponentVM
      const buttons = wrapper.findAll('.character-selection__button')

      // Start first switch
      await buttons[1]?.trigger('click')
      expect(vm.isAnimating).toBe(true)

      // Try to switch again immediately
      await buttons[2]?.trigger('click')
      await nextTick()

      // Should still be at index 1, not 2
      expect(vm.selectedIndex).toBe(1)
    })

    it('buttons have correct aria-label for accessibility', () => {
      wrapper = mount(CharacterSelection, {
        global: {
          stubs: globalStubs,
        },
      })

      const vm = wrapper.vm as unknown as ComponentVM
      const buttons = wrapper.findAll('.character-selection__button')

      vm.characters.forEach((character, index) => {
        expect(buttons[index]?.attributes('aria-label')).toBe(`Select ${character.name}`)
      })
    })
  })
})
