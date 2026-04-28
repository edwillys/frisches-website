import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import { vi } from 'vitest'
import { ref, reactive } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import CardDealer from '../CardDealer.vue'

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

describe('CardDealer social links', () => {
  it('renders social anchors and respects provided URLs', () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    const socialLinks = {
      instagram: 'https://instagram.com/frisches',
      spotify: 'https://open.spotify.com/artist/example',
      youtube: '',
    }

    const wrapper = mount(CardDealer, {
      props: { socialLinks },
      global: {
        plugins: [pinia],
        stubs: {
          RouterLink: true,
          MenuCard: true,
          LogoButton: true,
          AudioPlayer: true,
        },
      },
    })

    const anchors = wrapper.findAll('.card-dealer__social-link')
    expect(anchors.length).toBe(4)

    // Instagram
    expect(anchors[0]!.attributes('href')).toBe(socialLinks.instagram)
    expect(anchors[0]!.attributes('aria-label')).toBe('Instagram')

    // Spotify
    expect(anchors[1]!.attributes('href')).toBe(socialLinks.spotify)
    expect(anchors[1]!.attributes('aria-label')).toBe('Spotify')

    // YouTube - empty URL: no href, has disabled state and tabindex="-1"
    expect(anchors[2]!.attributes('href')).toBeUndefined()
    expect(anchors[2]!.attributes('aria-disabled')).toBe('true')
    expect(anchors[2]!.attributes('tabindex')).toBe('-1')

    // Email
    expect(anchors[3]!.attributes('href')).toBe('mailto:contact@frisches.band')
    expect(anchors[3]!.attributes('aria-label')).toBe('Email')
  })

  it('shows header social actions in content view without the removed mini avatar wrapper', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    const wrapper = mount(CardDealer, {
      props: {
        socialLinks: {
          instagram: 'https://instagram.com/frisches',
          spotify: 'https://open.spotify.com/artist/example',
          youtube: 'https://youtube.com/@frisches',
        },
      },
      global: {
        plugins: [pinia],
        stubs: {
          RouterLink: true,
        },
      },
    })

    const musicCard = wrapper.findAll('.menu-card').find((card) => card.text().includes('Music'))
    expect(musicCard).toBeTruthy()

    await musicCard!.trigger('click')

    expect(wrapper.find('.card-dealer__header-social').exists()).toBe(true)
    expect(wrapper.find('.card-dealer__mini-card-wrapper').exists()).toBe(false)
  })
})
