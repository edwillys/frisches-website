import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAudioStore } from '@/stores/audio'

describe('Audio Store - Stem Gains', () => {
  beforeEach(() => {
    window.localStorage.clear()
    setActivePinia(createPinia())
  })

  it('persists the desired stem mix mode across store recreation', () => {
    const firstStore = useAudioStore()

    expect(firstStore.stemMixEnabled).toBe(false)

    firstStore.setStemMixEnabled(true)

    setActivePinia(createPinia())
    const restoredStore = useAudioStore()

    expect(restoredStore.stemMixEnabled).toBe(true)
  })

  it('initializes stemGains at 1.0 for all 9 stems including strings', () => {
    const store = useAudioStore()
    expect(store.stemGains).toEqual({
      drums: 1,
      guitar: 1,
      bass: 1,
      vocals: 1,
      flute: 1,
      brass: 1,
      percussion: 1,
      keyboard: 1,
      strings: 1,
    })
  })

  it('setStemGain clamps between 0 and 1', () => {
    const store = useAudioStore()
    store.setStemGain('drums', 2)
    store.setStemGain('bass', -1)

    expect(store.stemGains.drums).toBe(1)
    expect(store.stemGains.bass).toBe(0)
  })

  it('initializes stemGroupGains as empty object', () => {
    const store = useAudioStore()
    expect(store.stemGroupGains).toEqual({})
  })

  it('setStemGroupGain stores clamped gain keyed as stem-index', () => {
    const store = useAudioStore()
    store.setStemGroupGain('guitar', 0, 0.7)
    store.setStemGroupGain('guitar', 1, 1.5) // should clamp to 1
    store.setStemGroupGain('vocals', 0, -0.2) // should clamp to 0

    expect(store.stemGroupGains['guitar-0']).toBeCloseTo(0.7)
    expect(store.stemGroupGains['guitar-1']).toBe(1)
    expect(store.stemGroupGains['vocals-0']).toBe(0)
  })

  it('resetAllStemGains resets all stemGains to 1 and clears stemGroupGains', () => {
    const store = useAudioStore()
    store.setStemGain('drums', 0.5)
    store.setStemGroupGain('guitar', 0, 0.3)

    store.resetAllStemGains()

    expect(store.stemGains.drums).toBe(1)
    expect(store.stemGains.strings).toBe(1)
    expect(store.stemGroupGains).toEqual({})
  })

  it('persists stem gains per track instead of sharing one global stem mix', () => {
    let store = useAudioStore()

    store.setCurrentTrack('tftc:02-tojd')
    store.setStemGain('guitar', 0)
    store.setStemGroupGain('guitar', 0, 0.25)

    store.setCurrentTrack('tftc:01-misled')
    expect(store.stemGains.guitar).toBe(1)
    expect(store.stemGroupGains).toEqual({})

    store.setStemGain('drums', 0.4)

    store.setCurrentTrack('tftc:02-tojd')
    expect(store.stemGains.guitar).toBe(0)
    expect(store.stemGains.drums).toBe(1)
    expect(store.stemGroupGains['guitar-0']).toBeCloseTo(0.25)

    setActivePinia(createPinia())
    store = useAudioStore()

    store.setCurrentTrack('tftc:01-misled')
    expect(store.stemGains.drums).toBeCloseTo(0.4)
    expect(store.stemGains.guitar).toBe(1)
    expect(store.stemGroupGains).toEqual({})

    store.setCurrentTrack('tftc:02-tojd')
    expect(store.stemGains.guitar).toBe(0)
    expect(store.stemGains.drums).toBe(1)
    expect(store.stemGroupGains['guitar-0']).toBeCloseTo(0.25)
  })
})
