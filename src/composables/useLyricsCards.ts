import { computed, ref, watchEffect } from 'vue'

import { albums } from '@/data/albums'
import { tracks } from '@/data/tracks'
import type { LyricsData } from '@/types/lyrics'
import type { LyricsAlbumCard, LyricsAlbumTrack } from '@/types/lyricsAlbumCard'

const DEFAULT_CREDITS = 'Words & music: Edgar Lubicz'

const fetchTrackCredits = async (
  trackId: string,
  lyricsPath: string,
  creditsByTrackId: ReturnType<typeof ref<Record<string, string>>>
) => {
  try {
    const response = await fetch(lyricsPath)
    if (!response.ok) return

    const json = (await response.json()) as LyricsData
    const credits = json.meta?.credits?.trim()
    if (!credits) return

    creditsByTrackId.value = {
      ...creditsByTrackId.value,
      [trackId]: credits,
    }
  } catch {
    // Ignore and use fallback credits.
  }
}

export const useLyricsCards = () => {
  const creditsByTrackId = ref<Record<string, string>>({})
  const hasLoadedCredits = ref(false)

  watchEffect(() => {
    if (hasLoadedCredits.value) return

    hasLoadedCredits.value = true
    const lyricTracks = tracks.filter((track) => track.lyricsPath)

    void Promise.all(
      lyricTracks.map((track) =>
        fetchTrackCredits(track.trackId, track.lyricsPath as string, creditsByTrackId)
      )
    )
  })

  return computed<LyricsAlbumCard | null>(() => {
    const lyricTracks = tracks.filter((track) => track.lyricsPath)
    if (!lyricTracks.length) return null

    const album =
      albums.find((item) => lyricTracks.every((track) => item.trackIds.includes(track.trackId))) ??
      albums.find((item) => item.trackIds.includes(lyricTracks[0].trackId))

    const orderedTrackIds = album
      ? album.trackIds.filter((trackId) => lyricTracks.some((track) => track.trackId === trackId))
      : lyricTracks.map((track) => track.trackId)

    const orderedTracks = orderedTrackIds
      .map((trackId) => lyricTracks.find((track) => track.trackId === trackId))
      .filter((track): track is (typeof lyricTracks)[number] => Boolean(track))

    const remainingTracks = lyricTracks.filter(
      (track) => !orderedTracks.some((orderedTrack) => orderedTrack.trackId === track.trackId)
    )

    const cardTracks: LyricsAlbumTrack[] = [...orderedTracks, ...remainingTracks].map((track) => ({
      trackId: track.trackId,
      title: track.title,
      lyricsPath: track.lyricsPath as string,
      credits: creditsByTrackId.value[track.trackId] ?? DEFAULT_CREDITS,
    }))

    return {
      albumId: album?.albumId ?? 'frisches',
      albumTitle: album?.title ?? lyricTracks[0].album ?? 'Frisches',
      coverSrcset: lyricTracks[0].coverSrcset ?? album?.coverSrcset,
      coverUrl: lyricTracks[0].fallbackCover ?? album?.coverUrl ?? '',
      themeColor: album?.themeColor ?? '#d4711c',
      themeColorDark: album?.themeColorDark ?? '#8b4f1a',
      tracks: cardTracks,
    }
  })
}
