import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import CharacterSelection from '../CharacterSelection.vue'
import { nextTick } from 'vue'

interface TimelineChain {
  to: (selector: string, props: unknown) => TimelineChain
  call: (callback: () => void) => TimelineChain
}

// Mock GSAP to execute animations synchronously
vi.mock('gsap', () => ({
  default: {
    timeline: vi.fn(() => ({
      to: vi.fn(function (this: TimelineChain) {
        return this
      }),
      call: vi.fn(function (this: TimelineChain, callback: () => void) {
        callback()
        return this
      }),
    })),
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
}

// Mock TresJS components - must be simple for hoisting
vi.mock('@tresjs/core', () => ({
  TresCanvas: {
    name: 'TresCanvas',
    template: '<div class="mock-tres-canvas"><slot /></div>',
  },
}))

vi.mock('@tresjs/cientos', () => ({
  OrbitControls: {
    name: 'OrbitControls',
    template: '<div class="mock-orbit-controls"></div>',
  },
  useGLTF: vi.fn(() => ({
    nodes: {},
    materials: {},
  })),
}))

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
  ACESFilmicToneMapping: 3,
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

describe('CharacterSelection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

    const infoSections = wrapper.findAll('.character-selection__info-section')
    const influencesSection = infoSections.find(
      (section) => section.find('.character-selection__section-title').text() === 'Influences'
    )

    expect(influencesSection).toBeTruthy()

    const influences = influencesSection?.findAll('.character-selection__info-list li')
    expect(influences).toHaveLength(vm.selectedCharacter.influences.length)
    vm.selectedCharacter.influences.forEach((influence, i) => {
      expect(influences?.[i]?.text()).toBe(influence)
    })
  })

  it('updates influences when character changes', async () => {
    const wrapper = mount(CharacterSelection, {
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

    const influences = influencesSection?.findAll('.character-selection__info-list li')
    expect(influences).toHaveLength(vm.selectedCharacter.influences.length)
    vm.selectedCharacter.influences.forEach((influence, i) => {
      expect(influences?.[i]?.text()).toBe(influence)
    })
  })

  it('displays all info sections with correct titles', () => {
    const wrapper = mount(CharacterSelection, {
      global: {
        stubs: {
          TresCanvas: true,
          OrbitControls: true,
          Suspense: true,
        },
      },
    })

    const titles = wrapper.findAll('.character-selection__section-title').map((el) => el.text())

    expect(titles).toEqual(['Influences', 'Favorite Song'])
  })

  it('maintains correct character data structure', () => {
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
    const wrapper = mount(CharacterSelection, {
      global: {
        stubs: globalStubs,
      },
    })

    const vm = wrapper.vm as unknown as ComponentVM
    expect(vm.selectedIndex).toBe(0)
    expect(vm.selectedCharacter.name).toBe(vm.characters[0]!.name)
  })

  it('computed selectedCharacter returns correct character', async () => {
    const wrapper = mount(CharacterSelection, {
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
    const wrapper = mount(CharacterSelection, {
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
    const wrapper = mount(CharacterSelection, {
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
    const wrapper = mount(CharacterSelection, {
      global: {
        stubs: {
          TresCanvas: true,
          OrbitControls: true,
          Suspense: true,
        },
      },
    })

    expect(wrapper.find('.character-selection__model-container').exists()).toBe(true)
  })

  it('has proper CSS classes for styling', () => {
    const wrapper = mount(CharacterSelection, {
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
    expect(wrapper.find('.character-selection__portrait').exists()).toBe(true)
    expect(wrapper.find('.character-selection__info-section').exists()).toBe(true)
    expect(wrapper.find('.character-selection__section-title').exists()).toBe(true)
    expect(wrapper.find('.character-selection__badges').exists()).toBe(true)
  })
})
