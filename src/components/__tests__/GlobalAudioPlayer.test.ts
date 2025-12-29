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

  it('renders only one lyrics button in the mini-player', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    const audio = useAudioStore()
    audio.startFromMusic('tftc:01-misled')

    const wrapper = mount(GlobalAudioPlayer, {
      global: {
        plugins: [pinia],
      },
    })

    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('[data-testid="mini-lyrics"]').length).toBe(1)
  })

  it('updates store volume from mini-player volume slider', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    const audio = useAudioStore()
    audio.startFromMusic('tftc:01-misled')

    const wrapper = mount(GlobalAudioPlayer, {
      global: {
        plugins: [pinia],
      },
    })

    await wrapper.vm.$nextTick()

    const volumeWrap = wrapper.find('[data-testid="mini-volume"]')
    expect(volumeWrap.exists()).toBe(true)

    const volumeInput = volumeWrap.find('input[type="range"]')
    await volumeInput.setValue('0.5')

    expect(audio.volume).toBeCloseTo(0.5)
  })

  it('toggles instrument faders overlay and updates stem gain', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    const audio = useAudioStore()
    audio.startFromMusic('tftc:01-misled')

    const wrapper = mount(GlobalAudioPlayer, {
      global: {
        plugins: [pinia],
      },
    })

    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="stems-overlay"]').exists()).toBe(false)

    const stemsBtn = wrapper.find('[data-testid="mini-stems"]')
    await stemsBtn.trigger('click')
    await wrapper.vm.$nextTick()

    expect(stemsBtn.classes()).toContain('is-active')

    const overlay = wrapper.find('[data-testid="stems-overlay"]')
    expect(overlay.exists()).toBe(true)

    const drumsSlider = overlay.find('input[aria-label="Drums volume"]')
    await drumsSlider.setValue('0.25')

    expect(audio.stemGains.drums).toBeCloseTo(0.25)

    const drumsMute = overlay.find('[data-testid="stem-drums-mute"]')
    expect(drumsMute.exists()).toBe(true)

    await drumsMute.trigger('click')
    expect(audio.stemGains.drums).toBeCloseTo(0)

    await drumsMute.trigger('click')
    expect(audio.stemGains.drums).toBeCloseTo(0.25)

    const closeBtn = overlay.find('[data-testid="stems-close"]')
    expect(closeBtn.exists()).toBe(true)

    await closeBtn.trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="stems-overlay"]').exists()).toBe(false)
  })
})
