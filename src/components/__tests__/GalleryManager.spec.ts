import { mount } from '@vue/test-utils'
import { computed, ref } from 'vue'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

import GalleryManager from '@/components/GalleryManager.vue'

vi.mock('@/composables/useGalleryData', () => {
  const mode = ref<'Photos' | 'Albums'>('Photos')
  const selectedFilters = ref({
    people: [] as string[],
    location: [] as string[],
    tags: [] as string[],
  })
  const lightboxImage = computed(() => null)
  const hasActiveFilters = computed(() => {
    return (
      selectedFilters.value.people.length > 0 ||
      selectedFilters.value.location.length > 0 ||
      selectedFilters.value.tags.length > 0
    )
  })
  const selectedYears = ref<number[]>([])

  return {
    useGalleryData: () => ({
      filteredImages: computed(() => []),
      filteredAlbums: computed(() => []),
      allPeople: computed(() => ['Edgar', 'Cami']),
      allLocations: computed(() => ['Munich', 'Germany/Munich']),
      allTags: computed(() => ['Show', 'Proberaum', 'Eisenbahnbrücke']),
      availableYears: computed(() => [2026, 2025, 2024]),
      mode,
      selectedFilters,
      lightboxImage,
      hasActiveFilters,
      selectedYears,
      setMode: (m: 'Photos' | 'Albums') => {
        mode.value = m
      },
      clearFilters: () => {
        selectedFilters.value = { people: [], location: [], tags: [] }
        selectedYears.value = []
      },
      setYears: (years: number[]) => {
        selectedYears.value = years
      },
      openLightbox: () => {},
      closeLightbox: () => {},
      nextImage: () => {},
      prevImage: () => {},
      getImagesForAlbum: () => [],
      resolveImage: async () => '',
    }),
  }
})

const TreeSelectStub = {
  name: 'TreeSelect',
  props: ['modelValue', 'options', 'display'],
  emits: ['update:modelValue'],
  template: '<div data-testid="treeselect-stub" />',
}

describe('GalleryManager', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows rail labels only when expanded', async () => {
    const wrapper = mount(GalleryManager, {
      global: {
        stubs: {
          TreeSelect: TreeSelectStub,
        },
      },
    })

    const toggle = wrapper.get('[data-testid="gallery-rail-toggle"]')

    // Expand
    await toggle.trigger('click')
    expect(wrapper.findAll('.gallery-rail__label').map((n) => n.text())).toEqual([
      'Photos',
      'Albums',
    ])

    // Collapse (labels should be hidden)
    await toggle.trigger('click')
    expect(wrapper.findAll('.gallery-rail__label').length).toBe(0)

    wrapper.unmount()
  })

  it('uses PrimeVue internal chip display for TreeSelect', async () => {
    const wrapper = mount(GalleryManager, {
      global: {
        stubs: {
          TreeSelect: TreeSelectStub,
        },
      },
    })

    const tree = wrapper.getComponent(TreeSelectStub)
    expect(tree.props('display')).toBe('chip')

    wrapper.unmount()
  })
})
