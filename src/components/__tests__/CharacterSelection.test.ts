import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import CharacterSelection from '../CharacterSelection.vue'
import { nextTick } from 'vue'
import type { ComponentPublicInstance } from 'vue'

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
  GLTFModel: {
    name: 'GLTFModel',
    template: '<div class="mock-gltf-model"></div>',
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
  Suspense: true,
  primitive: true,
  GLTFModel: true,
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
    expect(wrapper.find('.character-selection__scene').exists()).toBe(true)
    expect(wrapper.find('.character-selection__details').exists()).toBe(true)
  })

  it('displays navigation arrows', () => {
    const wrapper = mount(CharacterSelection, {
      global: {
        stubs: globalStubs,
      },
    })

    const arrows = wrapper.findAll('.character-selection__arrow')
    expect(arrows).toHaveLength(2)
    expect(wrapper.find('.character-selection__arrow--left').exists()).toBe(true)
    expect(wrapper.find('.character-selection__arrow--right').exists()).toBe(true)
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

    const cardTitle = wrapper.find('.character-selection__card-title')
    expect(cardTitle.text()).toBe('Edgar')

    const infoSections = wrapper.findAll('.character-selection__info-section')
    const instrumentsSection = infoSections[0] // First section is instruments

    const instruments = instrumentsSection?.findAll('.character-selection__info-list li')
    expect(instruments).toHaveLength(2)
    expect(instruments?.[0]?.text()).toBe('Guitar')
    expect(instruments?.[1]?.text()).toBe('Vocals')

    const favoriteSong = wrapper.find('.character-selection__favorite-song')
    expect(favoriteSong.text()).toBe('Tales From The Cellar')
  })

  it('switches character when arrow is clicked', async () => {
    const wrapper = mount(CharacterSelection, {
      global: {
        stubs: globalStubs,
      },
    })

    // Initially showing Edgar
    let cardTitle = wrapper.find('.character-selection__card-title')
    expect(cardTitle.text()).toBe('Edgar')

    // Click right arrow to go to next character
    const rightArrow = wrapper.find('.character-selection__arrow--right')
    await rightArrow.trigger('click')
    await nextTick()

    // Should show Cami now
    cardTitle = wrapper.find('.character-selection__card-title')
    expect(cardTitle.text()).toBe('Cami')

    const infoSections = wrapper.findAll('.character-selection__info-section')
    const instrumentsSection = infoSections[0] // First section is instruments

    const instruments = instrumentsSection?.findAll('.character-selection__info-list li')
    expect(instruments?.[0]?.text()).toBe('Bass')
    expect(instruments?.[1]?.text()).toBe('Backing Vocals')

    const favoriteSong = wrapper.find('.character-selection__favorite-song')
    expect(favoriteSong.text()).toBe('Witch Hunting')
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

    const infoSections = wrapper.findAll('.character-selection__info-section')
    const influencesSection = infoSections[1] // Second section is influences

    expect(influencesSection?.find('.character-selection__section-title').text()).toBe('Influences')

    const influences = influencesSection?.findAll('.character-selection__info-list li')
    expect(influences).toHaveLength(3)
    expect(influences?.[0]?.text()).toBe('Black Sabbath')
    expect(influences?.[1]?.text()).toBe('Led Zeppelin')
    expect(influences?.[2]?.text()).toBe('Pink Floyd')
  })

  it('updates influences when character changes', async () => {
    const wrapper = mount(CharacterSelection, {
      global: {
        stubs: globalStubs,
      },
    })

    const rightArrow = wrapper.find('.character-selection__arrow--right')

    // Switch to second character
    await rightArrow.trigger('click')
    await nextTick()

    const infoSections = wrapper.findAll('.character-selection__info-section')
    const influencesSection = infoSections[1]

    const influences = influencesSection?.findAll('.character-selection__info-list li')
    expect(influences).toHaveLength(3)
    expect(influences?.[0]?.text()).toBe('The Stooges')
    expect(influences?.[1]?.text()).toBe('Motörhead')
    expect(influences?.[2]?.text()).toBe('The Ramones')
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

    expect(titles).toEqual(['Role', 'Influences', 'Favorite Song'])
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

    const vm = wrapper.vm as ComponentPublicInstance

    // Check character data structure
    expect(vm.characters).toHaveLength(2)
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

    const vm = wrapper.vm as ComponentPublicInstance
    expect(vm.selectedIndex).toBe(0)
    expect(vm.selectedCharacter.name).toBe('Edgar')
  })

  it('computed selectedCharacter returns correct character', async () => {
    const wrapper = mount(CharacterSelection, {
      global: {
        stubs: globalStubs,
      },
    })

    const vm = wrapper.vm as ComponentPublicInstance

    // Initially selected character at index 0
    expect(vm.selectedCharacter.id).toBe(1)
    expect(vm.selectedCharacter.name).toBe('Edgar')

    // Select character 2 using arrow
    const rightArrow = wrapper.find('.character-selection__arrow--right')
    await rightArrow.trigger('click')
    await nextTick()

    expect(vm.selectedCharacter.id).toBe(2)
    expect(vm.selectedCharacter.name).toBe('Cami')
  })

  it('navigates backwards with left arrow', async () => {
    const wrapper = mount(CharacterSelection, {
      global: {
        stubs: globalStubs,
      },
    })

    const vm = wrapper.vm as ComponentPublicInstance

    // Start at Edgar
    expect(vm.selectedCharacter.name).toBe('Edgar')

    // Click left arrow - should wrap to last character (Cami)
    const leftArrow = wrapper.find('.character-selection__arrow--left')
    await leftArrow.trigger('click')
    await nextTick()

    expect(vm.selectedCharacter.name).toBe('Cami')
  })

  it('disables arrows during animation', async () => {
    const wrapper = mount(CharacterSelection, {
      global: {
        stubs: globalStubs,
      },
    })

    const rightArrow = wrapper.find('.character-selection__arrow--right')

    // Initially not disabled
    expect(rightArrow.attributes('disabled')).toBeUndefined()

    // Click arrow
    await rightArrow.trigger('click')

    // Should be disabled during animation
    const vm = wrapper.vm as ComponentPublicInstance
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

    expect(wrapper.find('.character-selection__scene').exists()).toBe(true)
  })

  it('has proper CSS classes for styling', () => {
    const wrapper = mount(CharacterSelection, {
      global: {
        stubs: globalStubs,
      },
    })

    // Check main container classes
    expect(wrapper.find('.character-selection').exists()).toBe(true)
    expect(wrapper.find('.character-selection__scene').exists()).toBe(true)
    expect(wrapper.find('.character-selection__details').exists()).toBe(true)
    expect(wrapper.find('.character-selection__card').exists()).toBe(true)
    expect(wrapper.find('.character-selection__arrow--left').exists()).toBe(true)
    expect(wrapper.find('.character-selection__arrow--right').exists()).toBe(true)

    // Check detail classes
    expect(wrapper.find('.character-selection__card-title').exists()).toBe(true)
    expect(wrapper.find('.character-selection__portrait').exists()).toBe(true)
    expect(wrapper.find('.character-selection__info-section').exists()).toBe(true)
    expect(wrapper.find('.character-selection__section-title').exists()).toBe(true)
    expect(wrapper.find('.character-selection__info-list').exists()).toBe(true)
  })
})
