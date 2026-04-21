import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

import AudioPlayer from '../AudioPlayer.vue'
import { setCurrentAppLocale } from '@/i18n/locale'
import { useAudioStore } from '@/stores/audio'

describe('AudioPlayer i18n', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    setCurrentAppLocale('pt-BR')
  })

  afterEach(() => {
    setCurrentAppLocale('en')
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
    expect(wrapper.get('[data-testid="btn-play-album"]').attributes('aria-label')).toBe(
      'Pausar álbum'
    )
    expect(wrapper.get('.track-table__col--title').text()).toBe('Título')
  })
})
