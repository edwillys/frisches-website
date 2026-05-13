import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getTrackById, tracks, type Track } from '@/data/tracks'
import { trackEvent, trackLyricsToggled } from '@/analytics'

export type AudioRepeatMode = 'off' | 'all' | 'one'
export type AudioStartSource = 'music' | 'about'
export type AudioStemName =
  | 'drums'
  | 'guitar'
  | 'bass'
  | 'vocals'
  | 'flute'
  | 'brass'
  | 'percussion'
  | 'keyboard'
  | 'strings'

// ─── Stem gain persistence ───────────────────────────────────────────────────

const AUDIO_STEMS_STORAGE_KEY = 'frisches:audio:stems:v1'

const DEFAULT_STEM_GAINS: Record<AudioStemName, number> = {
  drums: 1,
  guitar: 1,
  bass: 1,
  vocals: 1,
  flute: 1,
  brass: 1,
  percussion: 1,
  keyboard: 1,
  strings: 1,
}

interface PersistedStemState {
  m?: unknown
  sg?: Record<string, unknown>
  sgg?: Record<string, unknown>
  tracks?: Record<
    string,
    {
      sg?: Record<string, unknown>
      sgg?: Record<string, unknown>
    }
  >
}

function readPersistedStemState(): PersistedStemState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(AUDIO_STEMS_STORAGE_KEY) ?? null
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return parsed as PersistedStemState
  } catch {
    return null
  }
}

function clampGainValue(v: unknown): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return 1
  return Math.min(1, Math.max(0, v))
}

function createDefaultStemGains(): Record<AudioStemName, number> {
  return { ...DEFAULT_STEM_GAINS }
}

function normalizeStemGains(value: unknown): Record<AudioStemName, number> | null {
  if (!value || typeof value !== 'object') return null

  const next = createDefaultStemGains()
  for (const stem of Object.keys(next) as AudioStemName[]) {
    if (stem in (value as Record<string, unknown>)) {
      next[stem] = clampGainValue((value as Record<string, unknown>)[stem])
    }
  }

  return next
}

function normalizeStemGroupGains(value: unknown): Record<string, number> | null {
  if (!value || typeof value !== 'object') return null

  const next: Record<string, number> = {}
  for (const [key, rawValue] of Object.entries(value as Record<string, unknown>)) {
    next[key] = clampGainValue(rawValue)
  }

  return next
}

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

  const stemMixEnabled = ref(false)
  const legacyStemGains = ref<Record<AudioStemName, number> | null>(null)
  const legacyStemGroupGains = ref<Record<string, number> | null>(null)
  const stemGainsByTrackId = ref<Record<string, Record<AudioStemName, number>>>({})
  const stemGroupGainsByTrackId = ref<Record<string, Record<string, number>>>({})

  // Hydrate persisted state once on store creation
  ;(() => {
    const persisted = readPersistedStemState()
    if (!persisted) return

    stemMixEnabled.value = persisted.m === true

    const normalizedLegacyStemGains = normalizeStemGains(persisted.sg)
    if (normalizedLegacyStemGains) {
      legacyStemGains.value = normalizedLegacyStemGains
    }

    const normalizedLegacyStemGroupGains = normalizeStemGroupGains(persisted.sgg)
    if (normalizedLegacyStemGroupGains) {
      legacyStemGroupGains.value = normalizedLegacyStemGroupGains
    }

    if (persisted.tracks && typeof persisted.tracks === 'object') {
      const nextStemGainsByTrackId: Record<string, Record<AudioStemName, number>> = {}
      const nextStemGroupGainsByTrackId: Record<string, Record<string, number>> = {}

      for (const [trackId, trackState] of Object.entries(persisted.tracks)) {
        if (!trackState || typeof trackState !== 'object') continue

        const normalizedTrackStemGains = normalizeStemGains(trackState.sg)
        if (normalizedTrackStemGains) {
          nextStemGainsByTrackId[trackId] = normalizedTrackStemGains
        }

        const normalizedTrackStemGroupGains = normalizeStemGroupGains(trackState.sgg)
        if (normalizedTrackStemGroupGains) {
          nextStemGroupGainsByTrackId[trackId] = normalizedTrackStemGroupGains
        }
      }

      stemGainsByTrackId.value = nextStemGainsByTrackId
      stemGroupGainsByTrackId.value = nextStemGroupGainsByTrackId
    }
  })()

  function resolveStemGainsForTrack(
    trackId: string | null | undefined
  ): Record<AudioStemName, number> {
    if (trackId && stemGainsByTrackId.value[trackId]) {
      return stemGainsByTrackId.value[trackId]!
    }

    return legacyStemGains.value ?? DEFAULT_STEM_GAINS
  }

  function resolveStemGroupGainsForTrack(
    trackId: string | null | undefined
  ): Record<string, number> {
    if (trackId && stemGroupGainsByTrackId.value[trackId]) {
      return stemGroupGainsByTrackId.value[trackId]!
    }

    return legacyStemGroupGains.value ?? {}
  }

  const stemGains = computed<Record<AudioStemName, number>>(() => {
    return resolveStemGainsForTrack(currentTrackId.value)
  })

  const stemGroupGains = computed<Record<string, number>>(() => {
    return resolveStemGroupGainsForTrack(currentTrackId.value)
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

  function persistStemState() {
    if (typeof window === 'undefined') return
    try {
      const tracksPayload: NonNullable<PersistedStemState['tracks']> = {}
      const trackIds = new Set([
        ...Object.keys(stemGainsByTrackId.value),
        ...Object.keys(stemGroupGainsByTrackId.value),
      ])

      for (const trackId of trackIds) {
        tracksPayload[trackId] = {
          sg: stemGainsByTrackId.value[trackId],
          sgg: stemGroupGainsByTrackId.value[trackId],
        }
      }

      const payload = JSON.stringify({
        m: stemMixEnabled.value,
        sg: legacyStemGains.value ?? undefined,
        sgg: legacyStemGroupGains.value ?? undefined,
        tracks: Object.keys(tracksPayload).length > 0 ? tracksPayload : undefined,
      })
      window.localStorage.setItem(AUDIO_STEMS_STORAGE_KEY, payload)
    } catch {
      // storage unavailable
    }
  }

  function setStemMixEnabled(nextEnabled: boolean) {
    stemMixEnabled.value = nextEnabled
    persistStemState()
  }

  function setStemGain(stem: AudioStemName, nextGain: number) {
    const trackId = currentTrackId.value
    if (!trackId) return

    const clamped = Math.max(0, Math.min(1, nextGain))
    stemGainsByTrackId.value = {
      ...stemGainsByTrackId.value,
      [trackId]: {
        ...resolveStemGainsForTrack(trackId),
        [stem]: clamped,
      },
    }
    persistStemState()
  }

  function setStemGroupGain(stem: AudioStemName, index: number, nextGain: number) {
    const trackId = currentTrackId.value
    if (!trackId) return

    const key = `${stem}-${index}`
    const clamped = Math.max(0, Math.min(1, nextGain))
    stemGroupGainsByTrackId.value = {
      ...stemGroupGainsByTrackId.value,
      [trackId]: {
        ...resolveStemGroupGainsForTrack(trackId),
        [key]: clamped,
      },
    }
    persistStemState()
  }

  function resetAllStemGains() {
    const trackId = currentTrackId.value
    if (!trackId) return

    const reset = createDefaultStemGains()
    for (const k of Object.keys(reset) as AudioStemName[]) {
      reset[k] = 1
    }
    stemGainsByTrackId.value = {
      ...stemGainsByTrackId.value,
      [trackId]: reset,
    }
    stemGroupGainsByTrackId.value = {
      ...stemGroupGainsByTrackId.value,
      [trackId]: {},
    }
    persistStemState()
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
    stemMixEnabled,
    stemGains,
    stemGroupGains,
    setCurrentTrack,
    setPlaylistByTrackIds,
    setVolume,
    setStemMixEnabled,
    setStemGain,
    setStemGroupGain,
    resetAllStemGains,
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
