<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useAudioStore } from '@/stores/audio'
import type { LyricsData } from '@/types/lyrics'
import LyricsDisplay from './LyricsDisplay.vue'

const audioStore = useAudioStore()

const audioEl = ref<HTMLAudioElement | null>(null)
const miniPlayerEl = ref<HTMLElement | null>(null)
let miniPlayerResizeObserver: ResizeObserver | null = null
let lastMiniPlayerOffsetPx = -1

// Lyrics state
const showLyrics = ref(false)
const lyricsData = ref<LyricsData | null>(null)
const isLoadingLyrics = ref(false)

const shouldShowMiniPlayer = computed(
  () => audioStore.persistAcrossPages && audioStore.hasUserStartedPlayback && !audioStore.isStopped
)

const currentUrl = computed(() => audioStore.currentTrack?.url ?? '')
const currentTitle = computed(() => audioStore.currentTrack?.title ?? '')
const currentArtist = computed(() => audioStore.currentTrack?.artist ?? '')
const currentCover = computed(() => {
  const t = audioStore.currentTrack
  return t?.cover || t?.fallbackCover || ''
})

const currentTrackHasLyrics = computed(() => {
  return !!audioStore.currentTrack?.lyricsPath
})

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function safeSetAudioCurrentTime(nextTime: number) {
  const el = audioEl.value
  if (!el) return
  if (!Number.isFinite(nextTime)) return
  // Avoid tiny oscillation loops between watcher and timeupdate.
  if (Math.abs(el.currentTime - nextTime) < 0.35) return
  el.currentTime = nextTime
}

async function safePlay() {
  const el = audioEl.value
  if (!el) return
  try {
    await el.play()
  } catch {
    // Autoplay policies (or jsdom) may block; fall back to paused state.
    audioStore.isPlaying = false
  }
}

function safePause() {
  const el = audioEl.value
  if (!el) return
  try {
    el.pause()
  } catch {
    // ignore
  }
}

function onLoadedMetadata() {
  const el = audioEl.value
  if (!el) return
  audioStore.updateFromAudioDuration(el.duration)

  // If we have a stored/desired time, jump after metadata.
  if (audioStore.currentTime > 0) {
    safeSetAudioCurrentTime(audioStore.currentTime)
  }
}

function onTimeUpdate() {
  const el = audioEl.value
  if (!el) return
  audioStore.updateFromAudioTime(el.currentTime)
}

function onEnded() {
  const el = audioEl.value
  if (!el) return

  if (audioStore.repeatMode === 'one') {
    el.currentTime = 0
    void safePlay()
    return
  }

  audioStore.handleEnded()
}

function safeLoad() {
  const el = audioEl.value
  if (!el) return
  try {
    el.load()
  } catch {
    // jsdom does not implement HTMLMediaElement.load()
  }
}

watch(
  currentUrl,
  async (nextUrl) => {
    const el = audioEl.value
    if (!el) return

    if (!nextUrl) {
      el.removeAttribute('src')
      el.load()
      return
    }

    el.src = nextUrl
    safeLoad()

    if (audioStore.isPlaying && audioStore.hasUserStartedPlayback && !audioStore.isStopped) {
      await safePlay()
    }
  },
  { immediate: true }
)

watch(
  () => audioStore.isPlaying,
  async (playing) => {
    const el = audioEl.value
    if (!el) return

    if (playing && audioStore.hasUserStartedPlayback && !audioStore.isStopped) {
      await safePlay()
    } else {
      safePause()
    }
  }
)

watch(
  () => audioStore.volume,
  (vol) => {
    const el = audioEl.value
    if (!el) return
    el.volume = vol
  },
  { immediate: true }
)

watch(
  () => audioStore.currentTime,
  (t) => {
    safeSetAudioCurrentTime(t)
  }
)

watch(
  shouldShowMiniPlayer,
  (show) => {
    if (!show) {
      setMiniPlayerOffset(0)
      miniPlayerResizeObserver?.disconnect()
      miniPlayerResizeObserver = null
      return
    }

    const el = miniPlayerEl.value
    if (!el) {
      setMiniPlayerOffset(80)
      return
    }

    setMiniPlayerOffset(el.getBoundingClientRect().height)

    if (typeof ResizeObserver === 'undefined') return

    miniPlayerResizeObserver?.disconnect()
    miniPlayerResizeObserver = new ResizeObserver(() => {
      setMiniPlayerOffset(el.getBoundingClientRect().height)
    })
    miniPlayerResizeObserver.observe(el)
  },
  { immediate: true }
)

onMounted(() => {
  const el = audioEl.value
  if (!el) return
  el.preload = 'metadata'
  el.volume = audioStore.volume

  // Ensure src is applied after the ref is mounted (the immediate watch can run before audioEl exists).
  if (currentUrl.value) {
    el.src = currentUrl.value
    safeLoad()
  }

  if (audioStore.isPlaying && audioStore.hasUserStartedPlayback && !audioStore.isStopped) {
    void safePlay()
  }

  window.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)

  miniPlayerResizeObserver?.disconnect()
  miniPlayerResizeObserver = null
  setMiniPlayerOffset(0)
})

function setMiniPlayerOffset(px: number) {
  const clamped = Number.isFinite(px) ? Math.max(0, Math.ceil(px)) : 0
  if (clamped === lastMiniPlayerOffsetPx) return
  lastMiniPlayerOffsetPx = clamped
  document.documentElement.style.setProperty('--mini-player-offset', `${clamped}px`)
}

function handleGlobalKeydown(e: KeyboardEvent) {
  // Space toggles play/pause globally (both player and mini-player).
  if (e.key !== ' ' && e.code !== 'Space') return

  const target = e.target as HTMLElement | null
  const tag = target?.tagName?.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || (target as HTMLElement | null)?.isContentEditable)
    return

  if (!audioStore.hasUserStartedPlayback || audioStore.isStopped) return

  e.preventDefault()
  audioStore.togglePlayPause()
}

function onSeek(e: Event) {
  const target = e.target as HTMLInputElement
  const time = parseFloat(target.value)
  audioStore.seek(time)
}

async function toggleLyrics() {
  if (!currentTrackHasLyrics.value) return
  
  showLyrics.value = !showLyrics.value
  
  // Load lyrics if showing and not already loaded
  if (showLyrics.value && !lyricsData.value && audioStore.currentTrack?.lyricsPath) {
    await loadLyrics(audioStore.currentTrack.lyricsPath)
  }
}

async function loadLyrics(lyricsPath: string) {
  try {
    isLoadingLyrics.value = true
    const response = await fetch(lyricsPath)
    if (!response.ok) throw new Error('Failed to load lyrics')
    lyricsData.value = await response.json()
  } catch (error) {
    console.error('Error loading lyrics:', error)
    lyricsData.value = null
  } finally {
    isLoadingLyrics.value = false
  }
}

function handleLyricsSeek(time: number) {
  audioStore.seek(time)
}

// Watch for track changes to load lyrics automatically if lyrics view is open
watch(
  () => audioStore.currentTrack,
  async (newTrack, oldTrack) => {
    if (newTrack?.trackId !== oldTrack?.trackId) {
      // Load new track lyrics if lyrics view is open
      if (showLyrics.value) {
        lyricsData.value = null
        if (newTrack?.lyricsPath) {
          await loadLyrics(newTrack.lyricsPath)
        } else {
          // Hide lyrics if new track doesn't have lyrics
          showLyrics.value = false
        }
      }
    }
  }
)
</script>

<template>
  <div class="global-audio-player" data-testid="global-audio-player">
    <audio
      ref="audioEl"
      @loadedmetadata="onLoadedMetadata"
      @timeupdate="onTimeUpdate"
      @ended="onEnded"
    />

    <div
      v-if="shouldShowMiniPlayer"
      class="mini-player"
      data-testid="audio-mini-player"
      ref="miniPlayerEl"
      @pointerdown.stop
      @click.stop
    >
      <!-- Left: Track Info -->
      <div class="mini-player__left">
        <div class="mini-player__artwork">
          <img
            v-if="currentCover"
            class="mini-player__art"
            :src="currentCover"
            :alt="currentTitle"
          />
          <div v-else class="mini-player__art--placeholder" aria-hidden="true"></div>
        </div>

        <div class="mini-player__info">
          <div class="mini-player__title">{{ currentTitle }}</div>
          <div class="mini-player__artist">{{ currentArtist }}</div>
        </div>
      </div>

      <!-- Center: Controls + Progress -->
      <div class="mini-player__center">
        <div class="mini-player__controls">
          <button
            class="mini-player__btn mini-player__btn--shuffle"
            :class="{ 'is-active': audioStore.isShuffle }"
            type="button"
            :title="audioStore.isShuffle ? 'Disable shuffle' : 'Enable shuffle'"
            aria-label="Toggle shuffle"
            @click="audioStore.toggleShuffle()"
            data-testid="mini-shuffle"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="16 3 21 3 21 8" />
              <line x1="4" y1="20" x2="21" y2="3" />
              <polyline points="21 16 21 21 16 21" />
              <line x1="15" y1="15" x2="21" y2="21" />
              <line x1="4" y1="4" x2="9" y2="9" />
            </svg>
          </button>

          <button
            class="mini-player__btn"
            type="button"
            title="Previous track"
            aria-label="Previous"
            @click="audioStore.prev"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M11 19V5l-7 7 7 7zm9 0V5l-7 7 7 7z" />
            </svg>
          </button>

          <button
            class="mini-player__btn mini-player__btn--play"
            type="button"
            :title="audioStore.isPlaying ? 'Pause' : 'Play'"
            :aria-label="audioStore.isPlaying ? 'Pause' : 'Play'"
            @click="audioStore.togglePlayPause"
            data-testid="mini-play-pause"
          >
            <svg
              v-if="audioStore.isPlaying"
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>

          <button
            class="mini-player__btn"
            type="button"
            title="Next track"
            aria-label="Next"
            @click="audioStore.next"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M13 19V5l7 7-7 7zm-9 0V5l7 7-7 7z" />
            </svg>
          </button>

          <button
            class="mini-player__btn mini-player__btn--repeat"
            :class="{ 'is-active': audioStore.repeatMode !== 'off' }"
            type="button"
            :title="
              audioStore.repeatMode === 'off'
                ? 'Enable repeat'
                : audioStore.repeatMode === 'all'
                  ? 'Repeat one'
                  : 'Disable repeat'
            "
            aria-label="Toggle repeat"
            @click="audioStore.cycleRepeatMode()"
            data-testid="mini-repeat"
          >
            <svg
              v-if="audioStore.repeatMode === 'one'"
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="17 1 21 5 17 9" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <polyline points="7 23 3 19 7 15" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
              <text x="10" y="15" font-size="8" fill="currentColor" font-weight="bold">1</text>
            </svg>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="17 1 21 5 17 9" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <polyline points="7 23 3 19 7 15" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
          </button>
          
          <button
            class="mini-player__btn mini-player__btn--lyrics"
            :class="{ 'is-active': showLyrics, 'is-disabled': !currentTrackHasLyrics }"
            type="button"
            :title="!currentTrackHasLyrics ? 'No lyrics available' : showLyrics ? 'Hide lyrics' : 'Show lyrics'"
            :aria-label="showLyrics ? 'Hide lyrics' : 'Show lyrics'"
            :disabled="!currentTrackHasLyrics"
            @click="toggleLyrics"
            data-testid="mini-lyrics"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </button>
        </div>

        <div class="mini-player__progress-row">
          <span class="mini-player__time">{{ formatTime(audioStore.currentTime) }}</span>
          <input
            type="range"
            class="mini-player__progress"
            min="0"
            :max="audioStore.duration || 100"
            :value="audioStore.currentTime"
            @input="onSeek"
            aria-label="Seek"
          />
          <span class="mini-player__time">{{ formatTime(audioStore.duration) }}</span>
        </div>
      </div>

      <!-- Right: Lyrics + Close -->
      <div class="mini-player__right">
        <button
          class="mini-player__btn mini-player__btn--lyrics"
          :class="{ 'is-active': audioStore.showLyrics, 'is-disabled': !currentTrackHasLyrics }"
          type="button"
          :title="!currentTrackHasLyrics ? 'No lyrics available' : audioStore.showLyrics ? 'Hide lyrics' : 'Show lyrics'"
          :aria-label="audioStore.showLyrics ? 'Hide lyrics' : 'Show lyrics'"
          :disabled="!currentTrackHasLyrics"
          data-testid="mini-lyrics"
          @click="audioStore.toggleLyrics"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        </button>
        
        <button
          class="mini-player__btn mini-player__close"
          type="button"
          title="Close player"
          aria-label="Close player"
          data-testid="audio-mini-close"
          @click="audioStore.stopAndHide"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
    
    <!-- Lyrics Overlay -->
    <transition name="lyrics-overlay">
      <div v-if="showLyrics" class="lyrics-overlay" data-testid="lyrics-overlay">
        <div class="lyrics-overlay__header">
          <button
            class="lyrics-overlay__close"
            @click="showLyrics = false"
            aria-label="Close lyrics"
            data-testid="lyrics-close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <div class="lyrics-overlay__track-info">
            <div class="lyrics-overlay__title">{{ currentTitle }}</div>
            <div class="lyrics-overlay__artist">{{ currentArtist }}</div>
          </div>
        </div>
        
        <LyricsDisplay
          v-if="lyricsData"
          :lyricsData="lyricsData"
          :currentTime="audioStore.currentTime"
          :isPlaying="audioStore.isPlaying"
          @seek="handleLyricsSeek"
        />
        <div v-else-if="isLoadingLyrics" class="lyrics-loading">
          <div class="lyrics-loading__spinner"></div>
          <p>Loading lyrics...</p>
        </div>
        <div v-else class="lyrics-empty">
          <p>No lyrics available for this track</p>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.global-audio-player {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  pointer-events: none;
}

audio {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.mini-player {
  pointer-events: auto;
  width: 100%;
  display: grid;
  grid-template-columns: 1fr 2fr 1fr;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.92);
  backdrop-filter: blur(20px);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

/* Left: Track Info */
.mini-player__left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.mini-player__artwork {
  width: 56px;
  height: 56px;
  border-radius: 4px;
  overflow: hidden;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.06);
  aspect-ratio: 1 / 1;
}

.mini-player__art {
  width: 100%;
  height: 100%;
  object-fit: cover;
  aspect-ratio: 1 / 1;
}

.mini-player__art--placeholder {
  width: 100%;
  height: 100%;
}

.mini-player__info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mini-player__title,
.mini-player__artist {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mini-player__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.mini-player__artist {
  font-size: 12px;
  color: var(--color-text-secondary);
}

/* Center: Controls + Progress */
.mini-player__center {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  justify-content: center;
  max-width: 722px;
}

.mini-player__controls {
  display: flex;
  align-items: center;
  gap: 16px;
  justify-content: center;
}

.mini-player__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.mini-player__btn:hover {
  color: var(--color-text);
  transform: scale(1.06);
}

.mini-player__btn--play {
  width: 32px;
  height: 32px;
  background: white;
  color: black;
}

.mini-player__btn--play:hover {
  background: white;
  transform: scale(1.08);
}

.mini-player__btn--shuffle.is-active,
.mini-player__btn--repeat.is-active,
.mini-player__btn--lyrics.is-active {
  color: var(--color-neon-cyan);
}

.mini-player__btn--shuffle.is-active::after,
.mini-player__btn--repeat.is-active::after,
.mini-player__btn--lyrics.is-active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--color-neon-cyan);
}

.mini-player__btn--lyrics.is-disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.mini-player__btn--lyrics.is-disabled:hover {
  color: var(--color-text-secondary);
  transform: none;
}

.mini-player__progress-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.mini-player__time {
  font-size: 11px;
  color: var(--color-text-secondary);
  font-variant-numeric: tabular-nums;
  min-width: 40px;
  text-align: center;
}

.mini-player__progress {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.3);
  appearance: none;
  cursor: pointer;
}

.mini-player__progress::-webkit-slider-thumb {
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: white;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.mini-player__progress:hover::-webkit-slider-thumb {
  opacity: 1;
}

.mini-player__progress::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: white;
  border: none;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.mini-player__progress:hover::-moz-range-thumb {
  opacity: 1;
}

.mini-player__progress::-webkit-slider-runnable-track {
  height: 4px;
  border-radius: 2px;
  background: linear-gradient(
    to right,
    white 0%,
    white var(--progress-percent, 0%),
    rgba(255, 255, 255, 0.3) var(--progress-percent, 0%),
    rgba(255, 255, 255, 0.3) 100%
  );
}

.mini-player__progress::-moz-range-track {
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.3);
}

.mini-player__progress::-moz-range-progress {
  height: 4px;
  border-radius: 2px;
  background: white;
}

/* Right: Close */
.mini-player__right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.mini-player__btn--lyrics.is-active {
  background: var(--color-neon-cyan);
  color: black;
}

.mini-player__btn--lyrics.is-disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.mini-player__close {
  width: 32px;
  height: 32px;
}

/* Lyrics Overlay */
.lyrics-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--color-background);
  z-index: 10000;
  display: flex;
  flex-direction: column;
}

.lyrics-overlay__header {
  display: flex;
  align-items: center;
  padding: 16px 24px;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  gap: 16px;
}

.lyrics-overlay__close {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: transparent;
  border: none;
  color: var(--color-text);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.lyrics-overlay__close:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: scale(1.1);
}

.lyrics-overlay__track-info {
  flex: 1;
  min-width: 0;
}

.lyrics-overlay__title {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lyrics-overlay__artist {
  font-size: 14px;
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lyrics-loading,
.lyrics-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-text-secondary);
  gap: 16px;
}

.lyrics-loading__spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: var(--color-neon-cyan);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Lyrics overlay transitions */
.lyrics-overlay-enter-active,
.lyrics-overlay-leave-active {
  transition: all 0.3s ease;
}

.lyrics-overlay-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.lyrics-overlay-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

/* Responsive */
@media (max-width: 768px) {
  .mini-player {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .mini-player__center {
    order: 3;
  }

  .mini-player__right {
    position: absolute;
    top: 12px;
    right: 12px;
  }
}
</style>
