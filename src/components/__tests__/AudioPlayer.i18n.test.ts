import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

import AudioPlayer from '../AudioPlayer.vue'
import { setCurrentAppLocale } from '@/i18n/locale'
import { useAudioStore } from '@/stores/audio'

describe('AudioPlayer i18n', () => {
  const originalInnerWidth = window.innerWidth

  beforeEach(() => {
    setActivePinia(createPinia())
    setCurrentAppLocale('pt-BR')
  })

  afterEach(() => {
    setCurrentAppLocale('en')
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: originalInnerWidth,
    })
  })

  it('renders localized labels for the full music view', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    const audio = useAudioStore()
    audio.startFromMusic('tftc:01-misled')

    const wrapper = mount(AudioPlayer, {
      global: {
        plugins: [pinia],
      },
    })

    await wrapper.vm.$nextTick()

    expect(wrapper.get('[data-testid="album-carousel"]').attributes('aria-label')).toBe('Álbuns')
    expect(wrapper.get('.album-hero__label').text()).toBe('Álbum')
    expect(wrapper.find('.album-hero__artist').exists()).toBe(false)
    expect(wrapper.find('.album-hero__artist-avatar').exists()).toBe(false)
    expect(wrapper.get('[data-testid="btn-play-album"]').attributes('aria-label')).toBe(
      'Pausar álbum'
    )
    expect(wrapper.get('[data-testid="btn-repeat"]').attributes('aria-label')).toBe(
      'Ativar repetição'
    )
    expect(wrapper.get('.track-table__col--title').text()).toBe('Título')
  })

  it('starts playback when a track row is tapped', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    const audio = useAudioStore()

    const wrapper = mount(AudioPlayer, {
      global: {
        plugins: [pinia],
      },
    })

    const row = wrapper.get('[data-testid="track-row-1"]')
    await row.trigger('pointerdown', { pointerType: 'touch' })
    await row.trigger('click')

    expect(audio.currentTrackId).toBe('tftc:01-misled')
    expect(audio.isPlaying).toBe(true)
  })

  it('does not start playback from a desktop click on a selected row', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    const audio = useAudioStore()

    const wrapper = mount(AudioPlayer, {
      global: {
        plugins: [pinia],
      },
    })

    const row = wrapper.get('[data-testid="track-row-1"]')
    await row.trigger('pointerdown', { pointerType: 'mouse' })
    await row.trigger('click')

    expect(audio.currentTrackId).toBe('tftc:00-intro')
    expect(audio.isPlaying).toBe(false)
    expect(row.classes()).toContain('is-selected')
  })
})
