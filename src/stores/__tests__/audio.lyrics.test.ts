import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAudioStore } from '@/stores/audio'

describe('Audio Store - Lyrics Functionality', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initializes with showLyrics as false', () => {
    const store = useAudioStore()
    expect(store.showLyrics).toBe(false)
  })

  it('toggleLyrics switches showLyrics state', () => {
    const store = useAudioStore()
    
    expect(store.showLyrics).toBe(false)
    
    store.toggleLyrics()
    expect(store.showLyrics).toBe(true)
    
    store.toggleLyrics()
    expect(store.showLyrics).toBe(false)
  })

  it('closeLyrics sets showLyrics to false', () => {
    const store = useAudioStore()
    
    // First open lyrics
    store.toggleLyrics()
    expect(store.showLyrics).toBe(true)
    
    // Then close them
    store.closeLyrics()
    expect(store.showLyrics).toBe(false)
  })

  it('closeLyrics does nothing when already closed', () => {
    const store = useAudioStore()
    
    expect(store.showLyrics).toBe(false)
    store.closeLyrics()
    expect(store.showLyrics).toBe(false)
  })

  it('stopAndHide closes lyrics', () => {
    const store = useAudioStore()
    
    // Open lyrics
    store.toggleLyrics()
    expect(store.showLyrics).toBe(true)
    
    // Stop and hide should close lyrics
    store.stopAndHide()
    expect(store.showLyrics).toBe(false)
  })

  it('multiple toggles work correctly', () => {
    const store = useAudioStore()
    
    store.toggleLyrics() // true
    store.toggleLyrics() // false
    store.toggleLyrics() // true
    store.toggleLyrics() // false
    
    expect(store.showLyrics).toBe(false)
  })
})
