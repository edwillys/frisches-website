import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import GlobalAudioPlayer from '../GlobalAudioPlayer.vue'
import { useAudioStore } from '@/stores/audio'

describe('GlobalAudioPlayer', () => {
  const originalMatchMedia = window.matchMedia
  const originalInnerWidth = window.innerWidth

  beforeEach(() => {
    setActivePinia(createPinia())
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as typeof window.matchMedia
  })

  afterEach(() => {
    window.matchMedia = originalMatchMedia
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: originalInnerWidth,
    })
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

  it('hides compact mini-player controls on narrow screens without overriding the stored volume', async () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 768,
    })

    const pinia = createPinia()
    setActivePinia(pinia)

    const audio = useAudioStore()
    audio.setVolume(0.2)
    audio.startFromMusic('tftc:01-misled')

    const wrapper = mount(GlobalAudioPlayer, {
      global: {
        plugins: [pinia],
      },
    })

    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="mini-shuffle"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="mini-repeat"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="mini-volume"]').exists()).toBe(false)
    expect(wrapper.findAll('.mini-player__time')).toHaveLength(0)

    const audioEl = wrapper.find('audio').element as HTMLAudioElement
    expect(audioEl.volume).toBeCloseTo(0.2)
  })

  it('uses the default full volume when no stored volume was changed yet', async () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 768,
    })

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

    const audioEl = wrapper.find('audio').element as HTMLAudioElement
    expect(audio.volume).toBe(1)
    expect(audioEl.volume).toBe(1)
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
