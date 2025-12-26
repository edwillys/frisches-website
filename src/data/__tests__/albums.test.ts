import { describe, it, expect } from 'vitest'
import {
  albums,
  getAlbumById,
  getAlbumTracks,
  getAlbumTotalDurationSeconds,
  getAlbumSongCount,
  formatSecondsAsMinSec,
  formatSecondsAsAlbumDuration,
} from '@/data/albums'

describe('Albums registry', () => {
  it('exports the album list', () => {
    expect(albums).toBeDefined()
    expect(Array.isArray(albums)).toBe(true)
    expect(albums.length).toBeGreaterThan(0)
  })

  it('getAlbumById returns the correct album', () => {
    const album = getAlbumById('tftc')
    expect(album).toBeDefined()
    expect(album?.title).toBe('Tales From The Cellar')
    expect(album?.artist).toBe('Frisches')
    expect(album?.year).toBe(2024)
  })

  it('getAlbumTracks returns the album track list', () => {
    const tracks = getAlbumTracks('tftc')
    expect(tracks).toBeDefined()
    expect(Array.isArray(tracks)).toBe(true)
    expect(tracks.length).toBeGreaterThan(0)
    expect(tracks[0]?.album).toBe('Tales From The Cellar')
  })

  it('getAlbumSongCount returns the correct count', () => {
    const count = getAlbumSongCount('tftc')
    expect(count).toBeGreaterThan(0)
    expect(count).toBe(getAlbumTracks('tftc').length)
  })

  it('getAlbumTotalDurationSeconds calculates total duration', () => {
    const totalSeconds = getAlbumTotalDurationSeconds('tftc')
    expect(totalSeconds).toBeGreaterThan(0)
  })

  it('formatSecondsAsMinSec formats time correctly', () => {
    expect(formatSecondsAsMinSec(65)).toBe('1:05')
    expect(formatSecondsAsMinSec(125)).toBe('2:05')
    expect(formatSecondsAsMinSec(3661)).toBe('61:01')
  })

  it('formatSecondsAsAlbumDuration formats album duration', () => {
    expect(formatSecondsAsAlbumDuration(65)).toBe('1 min 5 sec')
    expect(formatSecondsAsAlbumDuration(125)).toBe('2 min 5 sec')
    expect(formatSecondsAsAlbumDuration(600)).toBe('10 min 0 sec')
  })
})
