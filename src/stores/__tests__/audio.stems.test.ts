import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAudioStore } from '@/stores/audio'

describe('Audio Store - Stem Gains', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initializes stemGains at 1.0', () => {
    const store = useAudioStore()
    expect(store.stemGains).toEqual({
      drums: 1,
      guitar: 1,
      bass: 1,
      vocals: 1,
    })
  })

  it('setStemGain clamps between 0 and 1', () => {
    const store = useAudioStore()
    store.setStemGain('drums', 2)
    store.setStemGain('bass', -1)

    expect(store.stemGains.drums).toBe(1)
    expect(store.stemGains.bass).toBe(0)
  })
})
