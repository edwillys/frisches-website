import { getTrackById, tracks, type Track } from './tracks'

export interface Album {
  albumId: string
  title: string
  artist: string
  year: number
  coverUrl: string
  trackIds: string[]
}

function parseDurationToSeconds(duration?: string): number {
  if (!duration) return 0
  const match = duration.trim().match(/^(\d+):(\d{2})$/)
  if (!match) return 0
  const minutes = Number(match[1])
  const seconds = Number(match[2])
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return 0
  return minutes * 60 + seconds
}

export function formatSecondsAsMinSec(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(clamped / 60)
  const seconds = clamped % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function formatSecondsAsAlbumDuration(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(clamped / 60)
  const seconds = clamped % 60
  return `${minutes} min ${seconds} sec`
}

export function getAlbumTracks(albumId: string): Track[] {
  const album = getAlbumById(albumId)
  if (!album) return []

  const list: Track[] = []
  for (const trackId of album.trackIds) {
    const t = getTrackById(trackId)
    if (t) list.push(t)
  }
  return list
}

export function getAlbumTotalDurationSeconds(albumId: string): number {
  const list = getAlbumTracks(albumId)
  return list.reduce((acc, t) => acc + parseDurationToSeconds(t.duration), 0)
}

export function getAlbumSongCount(albumId: string): number {
  return getAlbumById(albumId)?.trackIds.length ?? 0
}

export const albums: Album[] = [
  {
    albumId: 'tftc',
    title: 'Tales From The Cellar',
    artist: 'Frisches',
    year: 2024,
    coverUrl:
      tracks.find((t) => t.album === 'Tales From The Cellar')?.fallbackCover ??
      tracks[0]?.fallbackCover ??
      '',
    trackIds: tracks
      .filter((t) => t.album === 'Tales From The Cellar')
      .sort((a, b) => a.id - b.id)
      .map((t) => t.trackId),
  },
]

export function getAlbumById(albumId: string): Album | undefined {
  return albums.find((a) => a.albumId === albumId)
}
