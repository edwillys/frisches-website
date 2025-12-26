import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAudioStore } from '../audio'

describe('useAudioStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts playback from Music and shows mini-player gate', () => {
    const audio = useAudioStore()

    expect(audio.hasUserStartedPlayback).toBe(false)
    expect(audio.isStopped).toBe(false)

    audio.startFromMusic('tftc:01-misled')

    expect(audio.currentTrackId).toBe('tftc:01-misled')
    expect(audio.isPlaying).toBe(true)
    expect(audio.hasUserStartedPlayback).toBe(true)
    expect(audio.isStopped).toBe(false)
  })

  it('starts playback from About chip via trackId', () => {
    const audio = useAudioStore()

    audio.startFromAbout('tftc:05-witch-hunting')

    expect(audio.currentTrackId).toBe('tftc:05-witch-hunting')
    expect(audio.isPlaying).toBe(true)
    expect(audio.hasUserStartedPlayback).toBe(true)
  })

  it('stopAndHide stops playback and prevents mini-player until explicit restart', () => {
    const audio = useAudioStore()

    audio.startFromMusic('tftc:02-tojd')
    audio.seek(12.34)

    audio.stopAndHide()

    expect(audio.isPlaying).toBe(false)
    expect(audio.currentTime).toBe(0)
    expect(audio.hasUserStartedPlayback).toBe(false)
    expect(audio.isStopped).toBe(true)

    // togglePlayPause should do nothing while stopped
    audio.togglePlayPause()
    expect(audio.isPlaying).toBe(false)

    // explicit restart should work
    audio.startFromMusic('tftc:02-tojd')
    expect(audio.isPlaying).toBe(true)
    expect(audio.isStopped).toBe(false)
    expect(audio.hasUserStartedPlayback).toBe(true)
  })
})
