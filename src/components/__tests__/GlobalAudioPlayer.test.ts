import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import GlobalAudioPlayer from '../GlobalAudioPlayer.vue'
import { useAudioStore } from '@/stores/audio'

describe('GlobalAudioPlayer', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('mounts a single audio element', () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    const wrapper = mount(GlobalAudioPlayer, {
      global: {
        plugins: [pinia],
      },
    })

    expect(wrapper.find('audio').exists()).toBe(true)
    expect(wrapper.findAll('audio')).toHaveLength(1)
  })

  it('binds audio src from the store track url', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    const audio = useAudioStore()
    audio.startFromMusic('tftc:01-misled')

    const wrapper = mount(GlobalAudioPlayer, {
      global: {
        plugins: [pinia],
      },
    })

    const audioEl = wrapper.find('audio').element as HTMLAudioElement

    // jsdom normalizes audio.src, so check for a stable substring.
    expect(audioEl.src).toContain('TalesFromTheCellar')
    expect(audioEl.src).toContain('01%20-%20Misled%20-%20Mastered.mp3')
  })

  it('updates store duration and currentTime from audio events', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    const audio = useAudioStore()
    audio.startFromMusic('tftc:00-intro')

    const wrapper = mount(GlobalAudioPlayer, {
      global: {
        plugins: [pinia],
      },
    })

    const audioEl = wrapper.find('audio').element as HTMLAudioElement

    Object.defineProperty(audioEl, 'duration', { value: 123.45, configurable: true })
    audioEl.dispatchEvent(new Event('loadedmetadata'))

    expect(audio.duration).toBe(123.45)

    Object.defineProperty(audioEl, 'currentTime', { value: 42.5, configurable: true })
    audioEl.dispatchEvent(new Event('timeupdate'))

    expect(audio.currentTime).toBe(42.5)
  })

  it('shows mini-player only after user started playback', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    const audio = useAudioStore()

    const wrapper = mount(GlobalAudioPlayer, {
      global: {
        plugins: [pinia],
      },
    })

    expect(wrapper.find('[data-testid="audio-mini-player"]').exists()).toBe(false)

    audio.startFromMusic('tftc:03-etiquette')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="audio-mini-player"]').exists()).toBe(true)
  })
})
