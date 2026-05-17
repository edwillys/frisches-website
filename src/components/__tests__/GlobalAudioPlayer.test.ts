import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import gsap from 'gsap'
import GlobalAudioPlayer from '../GlobalAudioPlayer.vue'
import { useAudioStore } from '@/stores/audio'

const {
  resolveStemAvailabilityMock,
  resolveStemGroupItemsMock,
  resolveStemAudioSourcesMock,
  resolveStemLimiterParamsMock,
  stemPlaybackMock,
} = vi.hoisted(() => ({
  makeMockRef: <T>(value: T) => ({ value }),
  resolveStemAvailabilityMock: vi.fn(),
  resolveStemGroupItemsMock: vi.fn(),
  resolveStemAudioSourcesMock: vi.fn(),
  resolveStemLimiterParamsMock: vi.fn(),
  stemPlaybackMock: {
    lastStemGainsRef: null as unknown,
    lastGroupGainsRef: null as unknown,
    isActive: { value: false },
    isStemsPrebuffered: { value: true },
    isStemsLoading: { value: false },
    preloadStemsForCurrentSources: vi.fn(async () => {
      stemPlaybackMock.isStemsLoading.value = true
      await Promise.resolve()
      stemPlaybackMock.isStemsPrebuffered.value = true
      stemPlaybackMock.isStemsLoading.value = false
    }),
    activate: vi.fn(async () => {
      stemPlaybackMock.isActive.value = true
    }),
    deactivate: vi.fn(async () => {
      stemPlaybackMock.isActive.value = false
    }),
    deactivateWithOptions: vi.fn(async () => {
      stemPlaybackMock.isActive.value = false
    }),
    seek: vi.fn(),
    suspend: vi.fn(),
    resume: vi.fn(),
    warmUp: vi.fn().mockResolvedValue(undefined),
    setSources: vi.fn(),
    setLimiterParams: vi.fn(),
    setMasterVolume: vi.fn(),
    updateStemGain: vi.fn(),
    updateGroupItemGain: vi.fn(),
    getPlaybackOffset: vi.fn(() => (stemPlaybackMock.isActive.value ? 0 : null)),
    getDebugSnapshot: vi.fn(() => ({
      active: false,
      prebuffered: false,
      currentTrackPaths: [],
      currentTrackTransferredBytes: 0,
      currentTrackDecodedBytes: 0,
      currentCompressedCacheBytes: 0,
      currentDecodedCacheBytes: 0,
      totalTransferredBytes: 0,
      totalDecodedBytes: 0,
      assets: [],
    })),
    printDebugSnapshot: vi.fn(),
    dispose: vi.fn(() => {
      stemPlaybackMock.isActive.value = false
    }),
  },
}))

vi.mock('@/data/stems', () => ({
  resolveStemAvailability: resolveStemAvailabilityMock,
  resolveStemGroupItems: resolveStemGroupItemsMock,
  resolveStemAudioSources: resolveStemAudioSourcesMock,
}))

vi.mock('@/data/stemLimiter', () => ({
  resolveStemLimiterParams: resolveStemLimiterParamsMock,
}))

vi.mock('@/composables/useStemPlayback', () => ({
  useStemPlayback: vi.fn((_audioEl, stemGains, groupGains) => {
    stemPlaybackMock.lastStemGainsRef = stemGains
    stemPlaybackMock.lastGroupGainsRef = groupGains
    return stemPlaybackMock
  }),
}))

const allStemAvailability = {
  drums: true,
  guitar: true,
  bass: true,
  vocals: true,
  flute: true,
  brass: true,
  percussion: true,
  keyboard: true,
  strings: true,
}

const noStemAvailability = {
  drums: false,
  guitar: false,
  bass: false,
  vocals: false,
  flute: false,
  brass: false,
  percussion: false,
  keyboard: false,
  strings: false,
}

function dispatchDetailedClick(element: Element, detail: number): void {
  element.dispatchEvent(
    new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      detail,
    })
  )
}

describe('GlobalAudioPlayer', () => {
  const originalMatchMedia = window.matchMedia
  const originalInnerWidth = window.innerWidth
  let reduceMotion = false

  beforeEach(() => {
    window.localStorage.clear()
    setActivePinia(createPinia())
    stemPlaybackMock.lastStemGainsRef = null
    stemPlaybackMock.lastGroupGainsRef = null
    stemPlaybackMock.isActive.value = false
    stemPlaybackMock.isStemsPrebuffered.value = true
    stemPlaybackMock.isStemsLoading.value = false
    stemPlaybackMock.preloadStemsForCurrentSources.mockClear()
    stemPlaybackMock.activate.mockClear()
    stemPlaybackMock.deactivate.mockClear()
    stemPlaybackMock.deactivateWithOptions.mockClear()
    stemPlaybackMock.seek.mockClear()
    stemPlaybackMock.setSources.mockClear()
    stemPlaybackMock.setLimiterParams.mockClear()
    stemPlaybackMock.setMasterVolume.mockClear()
    stemPlaybackMock.updateStemGain.mockClear()
    stemPlaybackMock.updateGroupItemGain.mockClear()
    stemPlaybackMock.getPlaybackOffset.mockClear()
    stemPlaybackMock.getDebugSnapshot.mockClear()
    stemPlaybackMock.printDebugSnapshot.mockClear()
    stemPlaybackMock.suspend.mockClear()
    stemPlaybackMock.resume.mockClear()
    stemPlaybackMock.warmUp.mockClear()
    stemPlaybackMock.dispose.mockClear()
    resolveStemAvailabilityMock.mockReturnValue(allStemAvailability)
    resolveStemGroupItemsMock.mockReturnValue({})
    resolveStemAudioSourcesMock.mockReturnValue({
      guitar: ['/src/assets/private/audio/test/stem.mp3'],
    })
    resolveStemLimiterParamsMock.mockReturnValue({
      preGainDb: 0.07,
      threshold: -0.1,
      knee: 0,
      ratio: 20,
      attack: 0.003,
      release: 0.1,
    })
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)' ? reduceMotion : false,
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
    window.localStorage.clear()
    reduceMotion = false
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

  it('dispatches music-menu request when opening lyrics from mini-player', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    const audio = useAudioStore()
    audio.startFromMusic('tftc:01-misled')

    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')

    const wrapper = mount(GlobalAudioPlayer, {
      global: {
        plugins: [pinia],
      },
    })

    await wrapper.vm.$nextTick()

    const lyricsBtn = wrapper.find('[data-testid="mini-lyrics"]')
    expect(lyricsBtn.exists()).toBe(true)
    expect(audio.showLyrics).toBe(false)

    await lyricsBtn.trigger('click')

    expect(audio.showLyrics).toBe(true)
    expect(dispatchSpy).toHaveBeenCalledWith(expect.any(CustomEvent))
    expect(
      dispatchSpy.mock.calls.some((args) => {
        const evt = args[0]
        return evt instanceof CustomEvent && evt.type === 'frisches:mini-player-open-lyrics'
      })
    ).toBe(true)
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

  it('uses smooth media time for the desktop mini-player progress slider while playing', async () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 1280,
    })

    const progressTickerHolder: { current: null | (() => void) } = { current: null }
    const addSpy = vi.spyOn(gsap.ticker, 'add').mockImplementation((fn) => {
      progressTickerHolder.current = () => {
        ;(fn as () => void)()
      }
      return fn
    })

    const pinia = createPinia()
    setActivePinia(pinia)

    const audio = useAudioStore()
    audio.startFromMusic('tftc:01-misled')
    audio.updateFromAudioDuration(100)
    audio.updateFromAudioTime(10)

    const wrapper = mount(GlobalAudioPlayer, {
      global: {
        plugins: [pinia],
      },
    })

    await wrapper.vm.$nextTick()

    const audioEl = wrapper.find('audio').element as HTMLAudioElement
    Object.defineProperty(audioEl, 'currentTime', { value: 10.75, configurable: true })

    progressTickerHolder.current?.()
    await wrapper.vm.$nextTick()

    const progressInput = wrapper.find('input.mini-player__progress').element as HTMLInputElement
    expect(Number(progressInput.value)).toBeCloseTo(10.75)

    addSpy.mockRestore()
  })

  it('allows fractional desktop progress values', async () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 1280,
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

    const progressInput = wrapper.find('input.mini-player__progress')
    expect(progressInput.attributes('step')).toBe('any')
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

  it('arming stem mixing while paused keeps playback paused and stems armed', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    const audio = useAudioStore()
    audio.startFromMusic('tftc:02-tojd')
    audio.togglePlayPause()

    const wrapper = mount(GlobalAudioPlayer, {
      global: {
        plugins: [pinia],
      },
    })

    await wrapper.vm.$nextTick()
    await wrapper.find('[data-testid="mini-stems"]').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.find('[data-testid="stems-enable-toggle"]').trigger('click')
    await flushPromises()

    expect(audio.isPlaying).toBe(false)
    expect(stemPlaybackMock.activate).toHaveBeenCalled()
    expect(stemPlaybackMock.suspend).toHaveBeenCalled()
  })

  it('pausing and seeking while stem mixing is armed follows the master player transport', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    const audio = useAudioStore()
    audio.startFromMusic('tftc:02-tojd')

    const wrapper = mount(GlobalAudioPlayer, {
      global: {
        plugins: [pinia],
      },
    })

    await wrapper.vm.$nextTick()
    await wrapper.find('[data-testid="mini-stems"]').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.find('[data-testid="stems-enable-toggle"]').trigger('click')
    await flushPromises()
    await wrapper.vm.$nextTick()

    expect(stemPlaybackMock.activate).toHaveBeenCalled()

    audio.togglePlayPause()
    await wrapper.vm.$nextTick()

    expect(audio.isPlaying).toBe(false)
    // On pause the composable suspends the AudioContext rather than deactivating,
    // so stems stay loaded and resume from the same position when unpaused.
    expect(stemPlaybackMock.suspend).toHaveBeenCalled()

    stemPlaybackMock.isActive.value = true
    const audioEl = wrapper.find('audio').element as HTMLAudioElement
    Object.defineProperty(audioEl, 'currentTime', { value: 21.5, configurable: true })
    audioEl.dispatchEvent(new Event('seeked'))

    expect(stemPlaybackMock.seek).toHaveBeenCalledWith(21.5)
  })

  it('enabling stems forwards the current timeline into stem activation', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    const audio = useAudioStore()
    audio.startFromMusic('tftc:02-tojd')
    audio.seek(12.5)

    const wrapper = mount(GlobalAudioPlayer, {
      global: {
        plugins: [pinia],
      },
    })

    await wrapper.vm.$nextTick()
    await wrapper.find('[data-testid="mini-stems"]').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.find('[data-testid="stems-enable-toggle"]').trigger('click')
    await flushPromises()

    expect(stemPlaybackMock.activate).toHaveBeenCalledWith(12.5, expect.any(Function))
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

    expect(stemsBtn.classes()).not.toContain('is-active')

    const overlay = wrapper.find('[data-testid="stems-overlay"]')
    expect(overlay.exists()).toBe(true)

    const enableToggle = overlay.find('[data-testid="stems-enable-toggle"]')
    expect(enableToggle.exists()).toBe(true)
    await enableToggle.trigger('click')
    await flushPromises()
    await wrapper.vm.$nextTick()

    expect(stemsBtn.classes()).toContain('is-active')

    const drumsSlider = overlay.find('input[aria-label="Drums volume"]')
    await drumsSlider.setValue('0.25')

    expect(audio.stemGains.drums).toBeCloseTo(0.25)
    expect(stemsBtn.classes()).toContain('is-active')

    const drumsMute = overlay.find('[data-testid="stem-drums-mute"]')
    expect(drumsMute.exists()).toBe(true)

    await drumsMute.trigger('click')
    expect(audio.stemGains.drums).toBeCloseTo(0)

    await drumsMute.trigger('click')
    expect(audio.stemGains.drums).toBeCloseTo(0.25)

    const closeBtn = overlay.find('[data-testid="stems-close"]')
    expect(closeBtn.exists()).toBe(true)

    await enableToggle.trigger('click')
    await flushPromises()
    await wrapper.vm.$nextTick()
    expect(stemsBtn.classes()).not.toContain('is-active')

    await closeBtn.trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="stems-overlay"]').exists()).toBe(false)

    // State is retained while popup is closed.
    expect(stemsBtn.classes()).not.toContain('is-active')

    await stemsBtn.trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="stems-overlay"]').exists()).toBe(true)
    expect(stemsBtn.classes()).not.toContain('is-active')
  })

  it('resetting gains while stems are active also restores grouped stem item gains', async () => {
    resolveStemGroupItemsMock.mockReturnValue({
      guitar: [
        { label: 'Guitar PRS', shortLabel: '1', role: 'base', type: 'electric', isAvailable: true },
      ],
    })

    const pinia = createPinia()
    setActivePinia(pinia)

    const audio = useAudioStore()
    audio.startFromMusic('tftc:02-tojd')

    const wrapper = mount(GlobalAudioPlayer, {
      global: {
        plugins: [pinia],
      },
    })

    await wrapper.vm.$nextTick()
    await wrapper.find('[data-testid="mini-stems"]').trigger('click')
    await wrapper.vm.$nextTick()

    const overlay = wrapper.find('[data-testid="stems-overlay"]')
    await overlay.find('[data-testid="stems-enable-toggle"]').trigger('click')
    await flushPromises()
    await wrapper.vm.$nextTick()
    await overlay.find('[data-testid="stem-guitar-expand"]').trigger('click')
    await wrapper.vm.$nextTick()

    const groupSlider = overlay.find('[data-testid="stem-guitar-item-0"] input[type="range"]')
    await groupSlider.setValue('0.35')

    expect(audio.stemGroupGains['guitar-0']).toBeCloseTo(0.35)
    expect(stemPlaybackMock.updateGroupItemGain).toHaveBeenLastCalledWith('guitar', 0, 0.35)

    stemPlaybackMock.updateStemGain.mockClear()
    stemPlaybackMock.updateGroupItemGain.mockClear()

    await overlay.find('[data-testid="stems-reset"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(audio.stemGains.guitar).toBe(1)
    expect(audio.stemGroupGains['guitar-0']).toBeUndefined()
    expect(stemPlaybackMock.updateStemGain).toHaveBeenCalledWith('guitar', 1)
    expect(stemPlaybackMock.updateGroupItemGain).toHaveBeenCalledWith('guitar', 0, 1)
  })

  it('hides unavailable stem controls for the current track when other stems remain available', async () => {
    resolveStemAvailabilityMock.mockReturnValue({
      drums: false,
      guitar: true,
      bass: true,
      vocals: true,
      flute: true,
      brass: true,
      percussion: true,
      keyboard: true,
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

    await wrapper.find('[data-testid="mini-stems"]').trigger('click')
    await wrapper.vm.$nextTick()

    const overlay = wrapper.find('[data-testid="stems-overlay"]')
    await overlay.find('[data-testid="stems-enable-toggle"]').trigger('click')

    expect(overlay.find('[data-testid="stem-drums-mute"]').exists()).toBe(false)
    expect(overlay.find('input[aria-label="Drums volume"]').exists()).toBe(false)
  })

  it('restores the persisted stem mode and track-specific gains after remounting the player', async () => {
    let pinia = createPinia()
    setActivePinia(pinia)

    let audio = useAudioStore()
    audio.startFromMusic('tftc:02-tojd')

    const firstWrapper = mount(GlobalAudioPlayer, {
      global: {
        plugins: [pinia],
      },
    })

    await firstWrapper.vm.$nextTick()
    await firstWrapper.find('[data-testid="mini-stems"]').trigger('click')
    await firstWrapper.vm.$nextTick()

    const firstOverlay = firstWrapper.find('[data-testid="stems-overlay"]')
    await firstOverlay.find('[data-testid="stems-enable-toggle"]').trigger('click')
    await flushPromises()
    await firstWrapper.vm.$nextTick()
    await firstOverlay.find('[data-testid="stem-guitar-mute"]').trigger('click')
    await flushPromises()
    await firstWrapper.vm.$nextTick()

    expect(audio.stemGains.guitar).toBe(0)

    firstWrapper.unmount()

    stemPlaybackMock.activate.mockClear()
    pinia = createPinia()
    setActivePinia(pinia)
    audio = useAudioStore()
    audio.startFromMusic('tftc:02-tojd')

    const restoredWrapper = mount(GlobalAudioPlayer, {
      global: {
        plugins: [pinia],
      },
    })

    await flushPromises()

    expect(audio.stemMixEnabled).toBe(true)
    expect(audio.stemGains.guitar).toBe(0)
    expect(stemPlaybackMock.activate).toHaveBeenCalled()
    expect(
      (stemPlaybackMock.lastStemGainsRef as { value: Record<string, number> }).value.guitar
    ).toBe(0)
    expect(restoredWrapper.find('[data-testid="mini-stems"]').classes()).toContain('is-active')
  })

  it('persisted group item gain is passed to composable with correct value on restore', async () => {
    resolveStemGroupItemsMock.mockReturnValue({
      guitar: [
        { label: 'Guitar PRS', shortLabel: '1', role: 'base', type: 'electric', isAvailable: true },
      ],
    })

    let pinia = createPinia()
    setActivePinia(pinia)

    let audio = useAudioStore()
    audio.startFromMusic('tftc:02-tojd')

    const firstWrapper = mount(GlobalAudioPlayer, {
      global: { plugins: [pinia] },
    })

    await firstWrapper.vm.$nextTick()
    await firstWrapper.find('[data-testid="mini-stems"]').trigger('click')
    await firstWrapper.vm.$nextTick()

    const firstOverlay = firstWrapper.find('[data-testid="stems-overlay"]')
    await firstOverlay.find('[data-testid="stems-enable-toggle"]').trigger('click')
    await flushPromises()
    await firstWrapper.vm.$nextTick()
    await firstOverlay.find('[data-testid="stem-guitar-expand"]').trigger('click')
    await firstWrapper.vm.$nextTick()

    const groupSlider = firstOverlay.find('[data-testid="stem-guitar-item-0"] input[type="range"]')
    await groupSlider.setValue('0')

    expect(audio.stemGroupGains['guitar-0']).toBe(0)

    firstWrapper.unmount()

    stemPlaybackMock.activate.mockClear()
    pinia = createPinia()
    setActivePinia(pinia)
    audio = useAudioStore()
    audio.startFromMusic('tftc:02-tojd')

    mount(GlobalAudioPlayer, {
      global: { plugins: [pinia] },
    })

    await flushPromises()

    expect(audio.stemMixEnabled).toBe(true)
    expect(audio.stemGroupGains['guitar-0']).toBe(0)
    expect(stemPlaybackMock.activate).toHaveBeenCalled()
    expect(
      (stemPlaybackMock.lastGroupGainsRef as { value: Record<string, number> }).value['guitar-0']
    ).toBe(0)
  })

  it('fresh playback start after restore activates stems with the saved gains', async () => {
    // Simulate the real browser flow: persist state, then reload page (fresh hasUserStartedPlayback=false),
    // then user clicks play. This is different from the "restore" test where startFromMusic is called
    // before mounting.
    let pinia = createPinia()
    setActivePinia(pinia)

    let audio = useAudioStore()
    audio.startFromMusic('tftc:02-tojd')

    const firstWrapper = mount(GlobalAudioPlayer, {
      global: { plugins: [pinia] },
    })

    await firstWrapper.vm.$nextTick()
    await firstWrapper.find('[data-testid="mini-stems"]').trigger('click')
    await firstWrapper.vm.$nextTick()
    await firstWrapper.find('[data-testid="stems-enable-toggle"]').trigger('click')
    await flushPromises()
    await firstWrapper.vm.$nextTick()
    await firstWrapper.find('[data-testid="stem-guitar-mute"]').trigger('click')
    await flushPromises()
    await firstWrapper.vm.$nextTick()

    expect(audio.stemGains.guitar).toBe(0)
    firstWrapper.unmount()

    // Simulate page reload: fresh pinia, hasUserStartedPlayback = false
    stemPlaybackMock.activate.mockClear()
    pinia = createPinia()
    setActivePinia(pinia)
    audio = useAudioStore()
    // NOTE: do NOT call startFromMusic yet — user hasn't clicked play

    mount(GlobalAudioPlayer, {
      global: { plugins: [pinia] },
    })

    await flushPromises()

    // Stems should NOT activate yet — user hasn't started playback
    expect(stemPlaybackMock.activate).not.toHaveBeenCalled()

    // User navigates to music and clicks play on TOJD
    audio.startFromMusic('tftc:02-tojd')
    await flushPromises()

    // Now stems should activate with the persisted muted guitar gain
    expect(stemPlaybackMock.activate).toHaveBeenCalled()
    expect(
      (stemPlaybackMock.lastStemGainsRef as { value: Record<string, number> }).value.guitar
    ).toBe(0)
  })

  it('holds master playback until stem activation resolves on fresh persisted stem start', async () => {
    window.localStorage.setItem(
      'frisches:audio:stems:v1',
      JSON.stringify({
        m: true,
        tracks: {
          'tftc:02-tojd': {
            sg: {},
            sgg: {},
          },
        },
      })
    )

    let resolveActivate!: () => void
    stemPlaybackMock.activate.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveActivate = () => {
            stemPlaybackMock.isActive.value = true
            resolve()
          }
        })
    )

    const playSpy = window.HTMLMediaElement.prototype.play as ReturnType<typeof vi.fn>
    playSpy.mockClear()

    const pinia = createPinia()
    setActivePinia(pinia)

    const audio = useAudioStore()
    audio.startFromMusic('tftc:02-tojd')

    mount(GlobalAudioPlayer, {
      global: { plugins: [pinia] },
    })

    await flushPromises()

    expect(stemPlaybackMock.activate).toHaveBeenCalled()
    expect(playSpy).not.toHaveBeenCalled()

    resolveActivate()
    await flushPromises()

    expect(playSpy).toHaveBeenCalled()
  })

  it('shows a loading state on the play button while persisted stem activation is pending', async () => {
    window.localStorage.setItem(
      'frisches:audio:stems:v1',
      JSON.stringify({
        m: true,
        tracks: {
          'tftc:02-tojd': {
            sg: {},
            sgg: {},
          },
        },
      })
    )

    let resolveActivate!: () => void
    stemPlaybackMock.activate.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveActivate = () => {
            stemPlaybackMock.isActive.value = true
            resolve()
          }
        })
    )

    const pinia = createPinia()
    setActivePinia(pinia)

    const audio = useAudioStore()
    audio.startFromMusic('tftc:02-tojd')

    const wrapper = mount(GlobalAudioPlayer, {
      global: { plugins: [pinia] },
    })

    await flushPromises()

    const button = wrapper.find('[data-testid="mini-play-pause"]')
    expect(button.attributes('data-loading')).toBe('true')
    expect(button.attributes('aria-busy')).toBe('true')

    resolveActivate()
    await flushPromises()

    expect(button.attributes('data-loading')).toBe('false')
    expect(button.attributes('aria-busy')).toBe('false')
  })

  it('keeps loading visible after pausing while a persisted stem activation is still pending', async () => {
    window.localStorage.setItem(
      'frisches:audio:stems:v1',
      JSON.stringify({
        m: true,
        tracks: {
          'tftc:02-tojd': {
            sg: {},
            sgg: {},
          },
        },
      })
    )

    let resolveActivate!: () => void
    stemPlaybackMock.activate.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveActivate = () => {
            stemPlaybackMock.isActive.value = true
            resolve()
          }
        })
    )

    const pinia = createPinia()
    setActivePinia(pinia)

    const audio = useAudioStore()
    audio.startFromMusic('tftc:02-tojd')

    const wrapper = mount(GlobalAudioPlayer, {
      global: { plugins: [pinia] },
    })

    await flushPromises()

    const button = wrapper.find('[data-testid="mini-play-pause"]')
    await button.trigger('click')
    await flushPromises()

    expect(audio.isPlaying).toBe(false)
    expect(button.attributes('data-loading')).toBe('true')

    resolveActivate()
    await flushPromises()

    expect(button.attributes('data-loading')).toBe('false')
    expect(stemPlaybackMock.activate).toHaveBeenCalled()
    expect(stemPlaybackMock.deactivateWithOptions).not.toHaveBeenCalled()
    expect(stemPlaybackMock.isActive.value).toBe(true)
  })

  it('reapplies restored stem gains into the live graph right after activation', async () => {
    let pinia = createPinia()
    setActivePinia(pinia)

    let audio = useAudioStore()
    audio.startFromMusic('tftc:02-tojd')

    const firstWrapper = mount(GlobalAudioPlayer, {
      global: { plugins: [pinia] },
    })

    await firstWrapper.vm.$nextTick()
    await firstWrapper.find('[data-testid="mini-stems"]').trigger('click')
    await firstWrapper.vm.$nextTick()
    await firstWrapper.find('[data-testid="stems-enable-toggle"]').trigger('click')
    await flushPromises()
    await firstWrapper.vm.$nextTick()
    await firstWrapper.find('[data-testid="stem-guitar-mute"]').trigger('click')
    await flushPromises()
    await firstWrapper.vm.$nextTick()

    expect(audio.stemGains.guitar).toBe(0)
    firstWrapper.unmount()

    stemPlaybackMock.activate.mockClear()
    stemPlaybackMock.updateStemGain.mockClear()

    pinia = createPinia()
    setActivePinia(pinia)
    audio = useAudioStore()

    mount(GlobalAudioPlayer, {
      global: { plugins: [pinia] },
    })

    await flushPromises()

    audio.startFromMusic('tftc:02-tojd')
    await flushPromises()

    expect(stemPlaybackMock.activate).toHaveBeenCalled()
    expect(stemPlaybackMock.updateStemGain).toHaveBeenCalledWith('guitar', 0)
  })

  it('reapplies restored group item gains into the live graph right after activation', async () => {
    resolveStemGroupItemsMock.mockReturnValue({
      guitar: [{ label: 'PRS', role: 'base', type: 'electric', isAvailable: true }],
    })

    let pinia = createPinia()
    setActivePinia(pinia)

    let audio = useAudioStore()
    audio.startFromMusic('tftc:02-tojd')

    const firstWrapper = mount(GlobalAudioPlayer, {
      global: { plugins: [pinia] },
    })

    await firstWrapper.vm.$nextTick()
    await firstWrapper.find('[data-testid="mini-stems"]').trigger('click')
    await firstWrapper.vm.$nextTick()
    await firstWrapper.find('[data-testid="stems-enable-toggle"]').trigger('click')
    await flushPromises()
    await firstWrapper.vm.$nextTick()
    await firstWrapper.find('[data-testid="stem-guitar-expand"]').trigger('click')
    await firstWrapper.vm.$nextTick()
    await firstWrapper.find('[data-testid="stem-guitar-item-0-mute"]').trigger('click')
    await flushPromises()
    await firstWrapper.vm.$nextTick()

    expect(audio.stemGroupGains['guitar-0']).toBe(0)
    firstWrapper.unmount()

    stemPlaybackMock.activate.mockClear()
    stemPlaybackMock.updateGroupItemGain.mockClear()

    pinia = createPinia()
    setActivePinia(pinia)
    audio = useAudioStore()

    mount(GlobalAudioPlayer, {
      global: { plugins: [pinia] },
    })

    await flushPromises()

    audio.startFromMusic('tftc:02-tojd')
    await flushPromises()

    expect(stemPlaybackMock.activate).toHaveBeenCalled()
    expect(stemPlaybackMock.updateGroupItemGain).toHaveBeenCalledWith('guitar', 0, 0)
  })

  it('activates persisted stems when playback starts on a later track after booting on a non-stem track', async () => {
    resolveStemAvailabilityMock.mockImplementation((trackId: string) => {
      return trackId === 'tftc:02-tojd' ? allStemAvailability : noStemAvailability
    })
    resolveStemAudioSourcesMock.mockImplementation((trackId: string) => {
      return trackId === 'tftc:02-tojd'
        ? { guitar: ['/src/assets/private/audio/test/stem.mp3'] }
        : {}
    })

    window.localStorage.setItem(
      'frisches:audio:stems:v1',
      JSON.stringify({
        m: true,
        tracks: {
          'tftc:02-tojd': {
            sg: { guitar: 0 },
            sgg: {},
          },
        },
      })
    )

    const pinia = createPinia()
    setActivePinia(pinia)
    const audio = useAudioStore()

    mount(GlobalAudioPlayer, {
      global: { plugins: [pinia] },
    })

    await flushPromises()

    expect(audio.currentTrackId).toBe('tftc:00-intro')
    expect(audio.stemMixEnabled).toBe(true)
    expect(stemPlaybackMock.activate).not.toHaveBeenCalled()

    audio.startFromMusic('tftc:02-tojd')
    await flushPromises()

    expect(stemPlaybackMock.activate).toHaveBeenCalled()
    expect(stemPlaybackMock.updateStemGain).toHaveBeenCalledWith('guitar', 0)
  })

  it('re-enabling stems after toggling off uses the persisted muted gain', async () => {
    let pinia = createPinia()
    setActivePinia(pinia)

    let audio = useAudioStore()
    audio.startFromMusic('tftc:02-tojd')

    const firstWrapper = mount(GlobalAudioPlayer, {
      global: { plugins: [pinia] },
    })

    await firstWrapper.vm.$nextTick()
    await firstWrapper.find('[data-testid="mini-stems"]').trigger('click')
    await firstWrapper.vm.$nextTick()
    await firstWrapper.find('[data-testid="stems-enable-toggle"]').trigger('click')
    await flushPromises()
    await firstWrapper.vm.$nextTick()
    await firstWrapper.find('[data-testid="stem-guitar-mute"]').trigger('click')

    expect(audio.stemGains.guitar).toBe(0)
    firstWrapper.unmount()

    stemPlaybackMock.activate.mockClear()
    pinia = createPinia()
    setActivePinia(pinia)
    audio = useAudioStore()
    audio.startFromMusic('tftc:02-tojd')

    const restoredWrapper = mount(GlobalAudioPlayer, {
      global: { plugins: [pinia] },
    })

    await flushPromises()
    expect(stemPlaybackMock.activate).toHaveBeenCalled()

    // Simulate the user toggling stems off then on again
    stemPlaybackMock.activate.mockClear()
    await restoredWrapper.find('[data-testid="mini-stems"]').trigger('click')
    await restoredWrapper.vm.$nextTick()

    const overlay = restoredWrapper.find('[data-testid="stems-overlay"]')
    // Click toggle to disable
    await overlay.find('[data-testid="stems-enable-toggle"]').trigger('click')
    await flushPromises()

    expect(audio.stemMixEnabled).toBe(false)

    // Click toggle to re-enable
    await overlay.find('[data-testid="stems-enable-toggle"]').trigger('click')
    await flushPromises()

    expect(audio.stemMixEnabled).toBe(true)
    expect(stemPlaybackMock.activate).toHaveBeenCalled()
    // The persisted muted guitar gain must still be applied on re-enable
    expect(
      (stemPlaybackMock.lastStemGainsRef as { value: Record<string, number> }).value.guitar
    ).toBe(0)
  })

  it('arms stem sources on track load so stems can prebuffer before enabling', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    const audio = useAudioStore()
    audio.startFromMusic('tftc:02-tojd')

    const wrapper = mount(GlobalAudioPlayer, {
      global: {
        plugins: [pinia],
      },
    })

    await flushPromises()

    expect(stemPlaybackMock.setSources).toHaveBeenCalledWith({
      guitar: ['/src/assets/private/audio/test/stem.mp3'],
    })

    await wrapper.find('[data-testid="mini-stems"]').trigger('click')
    await wrapper.find('[data-testid="stems-enable-toggle"]').trigger('click')
    await flushPromises()

    // Enabling stems should not require re-arming sources; it should only switch state.
    expect(stemPlaybackMock.setSources).toHaveBeenCalled()
  })

  it('keeps persisted gains untouched while solo updates the effective playback mask', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    const audio = useAudioStore()
    audio.startFromMusic('tftc:02-tojd')

    const wrapper = mount(GlobalAudioPlayer, {
      global: {
        plugins: [pinia],
      },
    })

    await wrapper.find('[data-testid="mini-stems"]').trigger('click')
    await wrapper.find('[data-testid="stems-enable-toggle"]').trigger('click')
    await flushPromises()

    expect(
      (stemPlaybackMock.lastStemGainsRef as { value: Record<string, number> }).value.guitar
    ).toBe(1)
    expect(
      (stemPlaybackMock.lastStemGainsRef as { value: Record<string, number> }).value.drums
    ).toBe(1)

    const guitarButton = wrapper.find('[data-testid="stem-guitar-mute"]').element
    dispatchDetailedClick(guitarButton, 1)
    dispatchDetailedClick(guitarButton, 2)
    await flushPromises()

    expect(audio.stemGains.guitar).toBe(1)
    expect(audio.stemGains.drums).toBe(1)
    expect(
      (stemPlaybackMock.lastStemGainsRef as { value: Record<string, number> }).value.guitar
    ).toBe(1)
    expect(
      (stemPlaybackMock.lastStemGainsRef as { value: Record<string, number> }).value.drums
    ).toBe(0)
  })

  it('keeps stem sources armed when stem mode is disabled', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    const audio = useAudioStore()
    audio.startFromMusic('tftc:02-tojd')

    const wrapper = mount(GlobalAudioPlayer, {
      global: {
        plugins: [pinia],
      },
    })

    await wrapper.find('[data-testid="mini-stems"]').trigger('click')
    await wrapper.find('[data-testid="stems-enable-toggle"]').trigger('click')
    await flushPromises()

    stemPlaybackMock.setSources.mockClear()

    await wrapper.find('[data-testid="stems-enable-toggle"]').trigger('click')
    await flushPromises()

    expect(audio.stemMixEnabled).toBe(false)
    expect(stemPlaybackMock.setSources).not.toHaveBeenCalledWith({})
  })

  it('re-enabling stems after disabling re-activates stems playback', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    const audio = useAudioStore()
    audio.startFromMusic('tftc:02-tojd')

    const wrapper = mount(GlobalAudioPlayer, {
      global: {
        plugins: [pinia],
      },
    })

    await wrapper.find('[data-testid="mini-stems"]').trigger('click')
    await wrapper.find('[data-testid="stems-enable-toggle"]').trigger('click')
    await flushPromises()

    stemPlaybackMock.activate.mockClear()

    // Disable stems mode.
    await wrapper.find('[data-testid="stems-enable-toggle"]').trigger('click')
    await flushPromises()
    expect(audio.stemMixEnabled).toBe(false)

    // Re-enable stems mode and verify we re-activate the stems graph.
    await wrapper.find('[data-testid="stems-enable-toggle"]').trigger('click')
    await flushPromises()

    expect(audio.stemMixEnabled).toBe(true)
    expect(stemPlaybackMock.activate).toHaveBeenCalled()
  })

  it('keeps the last requested stem mode across tracks without stems and reactivates on return', async () => {
    resolveStemAvailabilityMock.mockImplementation((trackId: string) => {
      return trackId === 'tftc:02-tojd' ? allStemAvailability : noStemAvailability
    })
    resolveStemAudioSourcesMock.mockImplementation((trackId: string) => {
      return trackId === 'tftc:02-tojd'
        ? { guitar: ['/src/assets/private/audio/test/stem.mp3'] }
        : {}
    })

    const pinia = createPinia()
    setActivePinia(pinia)

    const audio = useAudioStore()
    audio.startFromMusic('tftc:02-tojd')

    const wrapper = mount(GlobalAudioPlayer, {
      global: {
        plugins: [pinia],
      },
    })

    await wrapper.vm.$nextTick()
    await wrapper.find('[data-testid="mini-stems"]').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.find('[data-testid="stems-enable-toggle"]').trigger('click')
    await flushPromises()

    expect(audio.stemMixEnabled).toBe(true)
    expect(wrapper.find('[data-testid="mini-stems"]').classes()).toContain('is-active')

    audio.startFromMusic('tftc:01-misled')
    await flushPromises()

    expect(audio.stemMixEnabled).toBe(true)
    expect(wrapper.find('[data-testid="mini-stems"]').classes()).not.toContain('is-active')

    stemPlaybackMock.activate.mockClear()
    audio.startFromMusic('tftc:02-tojd')
    await flushPromises()

    expect(audio.stemMixEnabled).toBe(true)
    expect(stemPlaybackMock.activate).toHaveBeenCalled()
    expect(wrapper.find('[data-testid="mini-stems"]').classes()).toContain('is-active')
  })

  it('enables wobble in compact mode by default', async () => {
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

    const visual = wrapper.find('[data-testid="mini-progress-visual"]')
    expect(visual.exists()).toBe(true)
    expect(visual.attributes('data-wobble-active')).toBe('true')
  })

  it('disables wobble when enableMiniProgressWobble prop is false', async () => {
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
      props: {
        enableMiniProgressWobble: false,
      },
      global: {
        plugins: [pinia],
      },
    })

    await wrapper.vm.$nextTick()

    const visual = wrapper.find('[data-testid="mini-progress-visual"]')
    expect(visual.exists()).toBe(true)
    expect(visual.attributes('data-wobble-active')).toBe('false')
  })

  it('disables wobble for reduced motion when respected', async () => {
    reduceMotion = true
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
      props: {
        wobbleRespectReducedMotion: true,
      },
      global: {
        plugins: [pinia],
      },
    })

    await wrapper.vm.$nextTick()

    const visual = wrapper.find('[data-testid="mini-progress-visual"]')
    expect(visual.exists()).toBe(true)
    expect(visual.attributes('data-wobble-active')).toBe('false')
  })

  it('allows wobble for reduced motion when override is disabled', async () => {
    reduceMotion = true
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
      props: {
        wobbleRespectReducedMotion: false,
      },
      global: {
        plugins: [pinia],
      },
    })

    await wrapper.vm.$nextTick()

    const visual = wrapper.find('[data-testid="mini-progress-visual"]')
    expect(visual.exists()).toBe(true)
    expect(visual.attributes('data-wobble-active')).toBe('true')
  })

  it('renders the buffered progress shadow on the desktop progress bar', async () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 1440,
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
    Object.defineProperty(audioEl, 'duration', { value: 200, configurable: true })
    Object.defineProperty(audioEl, 'buffered', {
      configurable: true,
      value: {
        length: 1,
        end: vi.fn(() => 100),
      },
    })

    audioEl.dispatchEvent(new Event('loadedmetadata'))
    audioEl.dispatchEvent(new Event('progress'))
    await wrapper.vm.$nextTick()

    const progress = wrapper.find('input.mini-player__progress')
    expect(progress.attributes('style')).toContain('--buffered-percent: 50.000%')
  })
})
