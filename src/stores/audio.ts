import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getTrackById, tracks, type Track } from '@/data/tracks'
import { trackEvent, trackLyricsToggled } from '@/analytics'

export type AudioRepeatMode = 'off' | 'all' | 'one'
export type AudioStartSource = 'music' | 'about'
export type AudioStemName = 'drums' | 'guitar' | 'bass' | 'vocals'

export const useAudioStore = defineStore('audio', () => {
  const persistAcrossPages = true as const

  const allTracks = ref<Track[]>(tracks)

  const currentTrackId = ref<string>(allTracks.value[0]?.trackId ?? '')
  const isPlaying = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const volume = ref(1)

  const isShuffle = ref(false)
  const repeatMode = ref<AudioRepeatMode>('off')

  // Mini-player visibility state
  const hasUserStartedPlayback = ref(false)
  const isStopped = ref(false)

  // Analytics: track which percentage milestones have been fired for the current track session.
  // Reset whenever a new track starts playing.
  const reportedMilestones = ref(new Set<number>())

  // Lyrics display state
  const showLyrics = ref(false)

  // Stem mixing (future: parallel stem playback)
  const stemGains = ref<Record<AudioStemName, number>>({
    drums: 1,
    guitar: 1,
    bass: 1,
    vocals: 1,
  })

  const currentTrack = computed<Track | null>(() => {
    if (!currentTrackId.value) return null
    return (
      allTracks.value.find((t) => t.trackId === currentTrackId.value) ??
      getTrackById(currentTrackId.value) ??
      null
    )
  })

  const currentTrackIndex = computed(() => {
    if (!currentTrackId.value) return -1
    const idx = allTracks.value.findIndex((t) => t.trackId === currentTrackId.value)
    return idx >= 0 ? idx : 0
  })

  function setPlaylistByTrackIds(trackIds: string[]) {
    const next: Track[] = []
    for (const id of trackIds) {
      const t = getTrackById(id)
      if (t) next.push(t)
    }

    if (next.length === 0) return
    allTracks.value = next

    // Keep current track consistent with the new list.
    if (!next.some((t) => t.trackId === currentTrackId.value)) {
      currentTrackId.value = next[0]!.trackId
    }
  }

  function setCurrentTrack(trackId: string) {
    const next = getTrackById(trackId)
    if (!next) return
    currentTrackId.value = next.trackId
    // Reset time when changing tracks
    currentTime.value = 0
  }

  function setVolume(nextVolume: number) {
    const clamped = Math.max(0, Math.min(1, nextVolume))
    volume.value = clamped
  }

  function seek(nextTimeSeconds: number) {
    const clamped = Math.max(0, nextTimeSeconds)
    currentTime.value = clamped
  }

  function updateFromAudioTime(nextTimeSeconds: number) {
    currentTime.value = nextTimeSeconds

    // Fire milestone events at 25 / 50 / 75 % of the track.
    const dur = duration.value
    if (dur <= 0 || !isPlaying.value) return
    const pct = (nextTimeSeconds / dur) * 100
    for (const milestone of [25, 50, 75] as const) {
      if (pct >= milestone && !reportedMilestones.value.has(milestone)) {
        reportedMilestones.value.add(milestone)
        trackEvent('song-milestone', {
          trackId: currentTrackId.value,
          title: currentTrack.value?.title ?? currentTrackId.value,
          album: currentTrack.value?.album ?? '',
          milestone,
        })
      }
    }
  }

  function updateFromAudioDuration(nextDurationSeconds: number) {
    duration.value = nextDurationSeconds
  }

  function toggleShuffle() {
    isShuffle.value = !isShuffle.value
  }

  function cycleRepeatMode() {
    repeatMode.value =
      repeatMode.value === 'off' ? 'all' : repeatMode.value === 'all' ? 'one' : 'off'
  }

  function playTrack(trackId: string, source: AudioStartSource) {
    // Reset milestones for every new play (same track re-played or different track).
    reportedMilestones.value = new Set()
    setCurrentTrack(trackId)
    hasUserStartedPlayback.value = true
    isStopped.value = false
    isPlaying.value = true
    trackEvent('song-played', {
      trackId,
      title: currentTrack.value?.title ?? trackId,
      album: currentTrack.value?.album ?? '',
      source,
      language: typeof navigator !== 'undefined' ? navigator.language : '',
    })
  }

  function startFromMusic(trackId?: string) {
    playTrack(trackId ?? currentTrackId.value, 'music')
  }

  function startFromAbout(trackId: string) {
    playTrack(trackId, 'about')
  }

  function togglePlayPause() {
    if (isStopped.value) return

    if (!isPlaying.value) {
      // Toggling into play – treat as user start.
      hasUserStartedPlayback.value = true
      isStopped.value = false
    } else {
      // Pausing – record how far the user got.
      const pos = currentTime.value
      const dur = duration.value
      trackEvent('song-paused', {
        trackId: currentTrackId.value,
        title: currentTrack.value?.title ?? currentTrackId.value,
        album: currentTrack.value?.album ?? '',
        playedSeconds: Math.round(pos),
        percentPlayed: dur > 0 ? Math.round((pos / dur) * 100) : 0,
      })
    }

    isPlaying.value = !isPlaying.value
  }

  function next() {
    const list = allTracks.value
    if (list.length === 0) return

    let nextIndex: number
    if (isShuffle.value) {
      nextIndex = Math.floor(Math.random() * list.length)
    } else {
      nextIndex = (currentTrackIndex.value + 1) % list.length
    }

    const nextTrack = list[nextIndex]
    if (!nextTrack) return
    playTrack(nextTrack.trackId, 'music')
  }

  function prev() {
    const list = allTracks.value
    if (list.length === 0) return

    const idx = currentTrackIndex.value
    const prevIndex = (idx - 1 + list.length) % list.length
    const prevTrack = list[prevIndex]
    if (!prevTrack) return
    playTrack(prevTrack.trackId, 'music')
  }

  function handleEnded() {
    if (repeatMode.value === 'one') {
      // Keep playing; GlobalAudioPlayer will reset currentTime to 0.
      seek(0)
      isPlaying.value = true
      return
    }

    trackEvent('song-completed', {
      trackId: currentTrackId.value,
      title: currentTrack.value?.title ?? currentTrackId.value,
      album: currentTrack.value?.album ?? '',
      durationSeconds: Math.round(duration.value),
    })

    if (repeatMode.value === 'off' && currentTrackIndex.value === allTracks.value.length - 1) {
      // Stop at end of playlist.
      isPlaying.value = false
      return
    }

    next()
  }

  function stopAndHide() {
    // Stop playback and hide the mini-player. Only allowed restart paths are: Music UI or About chip.
    const pos = currentTime.value
    const dur = duration.value
    if (isPlaying.value || pos > 0) {
      trackEvent('song-stopped', {
        trackId: currentTrackId.value,
        title: currentTrack.value?.title ?? currentTrackId.value,
        album: currentTrack.value?.album ?? '',
        playedSeconds: Math.round(pos),
        percentPlayed: dur > 0 ? Math.round((pos / dur) * 100) : 0,
      })
    }
    isPlaying.value = false
    seek(0)
    hasUserStartedPlayback.value = false
    isStopped.value = true
    showLyrics.value = false // Close lyrics when hiding mini-player
  }

  function toggleLyrics() {
    showLyrics.value = !showLyrics.value
    trackLyricsToggled(showLyrics.value)
  }

  function closeLyrics() {
    showLyrics.value = false
  }

  function setStemGain(stem: AudioStemName, nextGain: number) {
    const clamped = Math.max(0, Math.min(1, nextGain))
    stemGains.value = { ...stemGains.value, [stem]: clamped }
  }

  return {
    persistAcrossPages,
    tracks: allTracks,
    currentTrackId,
    currentTrack,
    currentTrackIndex,
    isPlaying,
    currentTime,
    duration,
    volume,
    isShuffle,
    repeatMode,
    hasUserStartedPlayback,
    isStopped,
    showLyrics,
    stemGains,
    setCurrentTrack,
    setPlaylistByTrackIds,
    setVolume,
    setStemGain,
    seek,
    updateFromAudioTime,
    updateFromAudioDuration,
    toggleShuffle,
    cycleRepeatMode,
    playTrack,
    startFromMusic,
    startFromAbout,
    togglePlayPause,
    next,
    prev,
    handleEnded,
    stopAndHide,
    toggleLyrics,
    closeLyrics,
  }
})
