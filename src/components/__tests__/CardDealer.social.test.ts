import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import CardDealer from '../CardDealer.vue'

describe('CardDealer social links', () => {
  it('renders social anchors and respects provided URLs', () => {
    const socialLinks = {
      instagram: 'https://instagram.com/frisches',
      spotify: 'https://open.spotify.com/artist/example',
      youtube: ''
    }

    const wrapper = mount(CardDealer, {
      props: { socialLinks },
      global: {
        stubs: {
          MenuCard: true,
          LogoButton: true,
          AudioPlayer: true
        }
      }
    })

    const anchors = wrapper.findAll('.card-dealer__social-link')
    expect(anchors.length).toBe(3)

    // Instagram
    expect(anchors[0]!.attributes('href')).toBe(socialLinks.instagram)
    expect(anchors[0]!.attributes('aria-label')).toBe('Instagram')

    // Spotify
    expect(anchors[1]!.attributes('href')).toBe(socialLinks.spotify)
    expect(anchors[1]!.attributes('aria-label')).toBe('Spotify')

    // YouTube - empty URL should render '#' and have disabled state
    expect(anchors[2]!.attributes('href')).toBe('#')
    expect(anchors[2]!.attributes('aria-disabled')).toBe('true')
  })
})
