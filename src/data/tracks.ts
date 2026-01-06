// Import album cover with responsive sizes (48w for thumbnails, 160w for small, 320w for large)
// @ts-expect-error - vite-imagetools generates these at build time
import coverSmall from '../assets/private/audio/TalesFromTheCellar/Cover.png?w=48&format=webp'
// @ts-expect-error - vite-imagetools generates these at build time
import coverMedium from '../assets/private/audio/TalesFromTheCellar/Cover.png?w=160&format=webp'
// @ts-expect-error - vite-imagetools generates these at build time
import coverLarge from '../assets/private/audio/TalesFromTheCellar/Cover.png?w=320&format=webp'

const albumCoverSrcset = `${coverSmall} 48w, ${coverMedium} 160w, ${coverLarge} 320w`
const albumCoverFallback = coverMedium // Use medium size as fallback

export interface Track {
  id: number
  trackId: string
  title: string
  artist: string
  album?: string
  cover?: string
  fallbackCover?: string
  coverSrcset?: string // Responsive srcset for the cover image
  url: string
  duration?: string
  lyricsPath?: string // Path to lyrics JSON file
}

export const tracks: Track[] = [
  {
    id: 0,
    trackId: 'tftc:00-intro',
    title: 'Intro',
    artist: 'Frisches',
    album: 'Tales From The Cellar',
    fallbackCover: albumCoverFallback,
    coverSrcset: albumCoverSrcset,
    url: new URL(
      '../assets/private/audio/TalesFromTheCellar/00 - Intro - Mastered.mp3',
      import.meta.url
    ).href,
    duration: '0:45',
  },
  {
    id: 1,
    trackId: 'tftc:01-misled',
    title: 'Misled',
    artist: 'Frisches',
    album: 'Tales From The Cellar',
    fallbackCover: albumCoverFallback,
    coverSrcset: albumCoverSrcset,
    url: new URL(
      '../assets/private/audio/TalesFromTheCellar/01 - Misled - Mastered.mp3',
      import.meta.url
    ).href,
    lyricsPath: new URL(
      '../assets/private/audio/TalesFromTheCellar/lyrics/01 - Misled - Mastered.json',
      import.meta.url
    ).href,
    duration: '3:12',
  },
  {
    id: 2,
    trackId: 'tftc:02-tojd',
    title: 'Tears Of Joyful Despair',
    artist: 'Frisches',
    album: 'Tales From The Cellar',
    fallbackCover: albumCoverFallback,
    coverSrcset: albumCoverSrcset,
    url: new URL(
      '../assets/private/audio/TalesFromTheCellar/02 - TOJD - Mastered.mp3',
      import.meta.url
    ).href,
    lyricsPath: new URL(
      '../assets/private/audio/TalesFromTheCellar/lyrics/02 - TOJD - Mastered.json',
      import.meta.url
    ).href,
    duration: '2:58',
  },
  {
    id: 3,
    trackId: 'tftc:03-etiquette',
    title: 'Etiquette',
    artist: 'Frisches',
    album: 'Tales From The Cellar',
    fallbackCover: albumCoverFallback,
    coverSrcset: albumCoverSrcset,
    url: new URL(
      '../assets/private/audio/TalesFromTheCellar/03 - Etiquette - Mastered.mp3',
      import.meta.url
    ).href,
    lyricsPath: new URL(
      '../assets/private/audio/TalesFromTheCellar/lyrics/03 - Etiquette - Mastered.json',
      import.meta.url
    ).href,
    duration: '3:05',
  },
  {
    id: 4,
    trackId: 'tftc:04-mr-red-jacket',
    title: 'Mr. Red Jacket',
    artist: 'Frisches',
    album: 'Tales From The Cellar',
    fallbackCover: albumCoverFallback,
    coverSrcset: albumCoverSrcset,
    url: new URL(
      '../assets/private/audio/TalesFromTheCellar/04 - Mr Red Jacket - Mastered.mp3',
      import.meta.url
    ).href,
    lyricsPath: new URL(
      '../assets/private/audio/TalesFromTheCellar/lyrics/04 - Mr Red Jacket - Mastered.json',
      import.meta.url
    ).href,
    duration: '3:30',
  },
  {
    id: 5,
    trackId: 'tftc:05-witch-hunting',
    title: 'Witch Hunting',
    artist: 'Frisches',
    album: 'Tales From The Cellar',
    fallbackCover: albumCoverFallback,
    coverSrcset: albumCoverSrcset,
    url: new URL(
      '../assets/private/audio/TalesFromTheCellar/05 - Witch Hunting - Mastered.mp3',
      import.meta.url
    ).href,
    duration: '3:45',
    lyricsPath: new URL(
      '../assets/private/audio/TalesFromTheCellar/lyrics/05 - Witch Hunting - Mastered.json',
      import.meta.url
    ).href,
  },
  {
    id: 6,
    trackId: 'tftc:06-suits',
    title: 'Suits',
    artist: 'Frisches',
    album: 'Tales From The Cellar',
    fallbackCover: albumCoverFallback,
    coverSrcset: albumCoverSrcset,
    url: new URL(
      '../assets/private/audio/TalesFromTheCellar/06 - Suits - Mastered.mp3',
      import.meta.url
    ).href,
    lyricsPath: new URL(
      '../assets/private/audio/TalesFromTheCellar/lyrics/06 - Suits - Mastered.json',
      import.meta.url
    ).href,
    duration: '3:15',
  },
  {
    id: 7,
    trackId: 'tftc:07-ordinary-suspects',
    title: 'Ordinary Suspects',
    artist: 'Frisches',
    album: 'Tales From The Cellar',
    fallbackCover: albumCoverFallback,
    coverSrcset: albumCoverSrcset,
    url: new URL(
      '../assets/private/audio/TalesFromTheCellar/07 - Ordinary Suspects - Mastered.mp3',
      import.meta.url
    ).href,
    lyricsPath: new URL(
      '../assets/private/audio/TalesFromTheCellar/lyrics/07 - Ordinary Suspects - Mastered.json',
      import.meta.url
    ).href,
    duration: '3:20',
  },
  {
    id: 8,
    trackId: 'tftc:08-solitude-etude',
    title: 'Solitude Etude',
    artist: 'Frisches',
    album: 'Tales From The Cellar',
    fallbackCover: albumCoverFallback,
    coverSrcset: albumCoverSrcset,
    url: new URL(
      '../assets/private/audio/TalesFromTheCellar/08 - Solitude Etude - Mastered.mp3',
      import.meta.url
    ).href,
    duration: '2:50',
  },
]

export function getTrackById(trackId: string): Track | undefined {
  return tracks.find((t) => t.trackId === trackId)
}

export function getTrackIndexById(trackId: string): number {
  return tracks.findIndex((t) => t.trackId === trackId)
}
