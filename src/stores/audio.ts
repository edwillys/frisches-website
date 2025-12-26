import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getTrackById, tracks, type Track } from '@/data/tracks'

export type AudioRepeatMode = 'off' | 'all' | 'one'
export type AudioStartSource = 'music' | 'about'

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
    setCurrentTrack(trackId)
    hasUserStartedPlayback.value = true
    isStopped.value = false
    isPlaying.value = true
    // Source is currently not stored; keep API for future analytics/debug if needed.
    void source
  }

  function startFromMusic(trackId?: string) {
    playTrack(trackId ?? currentTrackId.value, 'music')
  }

  function startFromAbout(trackId: string) {
    playTrack(trackId, 'about')
  }

  function togglePlayPause() {
    if (isStopped.value) return

    // If toggling into play, treat it as a user start.
    if (!isPlaying.value) {
      hasUserStartedPlayback.value = true
      isStopped.value = false
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

    if (repeatMode.value === 'off' && currentTrackIndex.value === allTracks.value.length - 1) {
      // Stop at end of playlist.
      isPlaying.value = false
      return
    }

    next()
  }

  function stopAndHide() {
    // Stop playback and hide the mini-player. Only allowed restart paths are: Music UI or About chip.
    isPlaying.value = false
    seek(0)
    hasUserStartedPlayback.value = false
    isStopped.value = true
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
    setCurrentTrack,
    setPlaylistByTrackIds,
    setVolume,
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
  }
})
