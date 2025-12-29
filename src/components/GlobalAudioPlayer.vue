<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useAudioStore } from '@/stores/audio'
import InstrumentFaders from './InstrumentFaders.vue'

// Icon imports
import lyricsSvg from '@/assets/icons/song-lyrics.svg?raw'
import shuffleSvg from '@/assets/icons/shuffle.svg?raw'
import previousSvg from '@/assets/icons/previous.svg?raw'
import playSvg from '@/assets/icons/play.svg?raw'
import pauseSvg from '@/assets/icons/pause.svg?raw'
import nextSvg from '@/assets/icons/next.svg?raw'
import repeatSvg from '@/assets/icons/repeat.svg?raw'
import repeatOneSvg from '@/assets/icons/repeat-one.svg?raw'
import closeSvg from '@/assets/icons/close.svg?raw'
import volumeMuteSvg from '@/assets/icons/volume-mute.svg?raw'
import volumeLowSvg from '@/assets/icons/volume-low.svg?raw'
import volumeMidSvg from '@/assets/icons/volume-mid.svg?raw'
import volumeHighSvg from '@/assets/icons/volume-high.svg?raw'

const audioStore = useAudioStore()

const audioEl = ref<HTMLAudioElement | null>(null)
const miniPlayerEl = ref<HTMLElement | null>(null)
let miniPlayerResizeObserver: ResizeObserver | null = null
let lastMiniPlayerOffsetPx = -1

const showStemFaders = ref(false)

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

const volumeIconSvg = computed(() => {
  const v = audioStore.volume
  if (v <= 0.001) return volumeMuteSvg
  if (v < 0.34) return volumeLowSvg
  if (v < 0.67) return volumeMidSvg
  return volumeHighSvg
})

const volumePercent = computed(() => `${Math.round(audioStore.volume * 100)}%`)
const lastNonZeroVolume = ref(1)

watch(
  () => audioStore.volume,
  (v) => {
    if (v > 0.001) lastNonZeroVolume.value = v
  },
  { immediate: true }
)

const progressPercent = computed(() => {
  const d = audioStore.duration
  if (!Number.isFinite(d) || d <= 0) return '0%'
  const p = Math.min(1, Math.max(0, audioStore.currentTime / d))
  return `${Math.round(p * 100)}%`
})

function onVolumeInput(e: Event) {
  const target = e.target as HTMLInputElement
  const v = Number.parseFloat(target.value)
  const next = Number.isFinite(v) ? v : audioStore.volume
  if (next > 0.001) lastNonZeroVolume.value = next
  audioStore.setVolume(next)
}

function toggleVolumeMute() {
  const v = audioStore.volume
  if (v <= 0.001) {
    const restore = Math.min(1, Math.max(0, lastNonZeroVolume.value || 1))
    audioStore.setVolume(restore > 0.001 ? restore : 1)
    return
  }

  lastNonZeroVolume.value = v
  audioStore.setVolume(0)
}

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
  if (Math.abs(el.currentTime - nextTime) < 0.05) return
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
      audioStore.closeLyrics()
      showStemFaders.value = false
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

function onStemGain(stem: 'drums' | 'guitar' | 'bass' | 'vocals', value: number) {
  audioStore.setStemGain(stem, value)
}
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
            <span class="mini-player__icon" aria-hidden="true" v-html="shuffleSvg" />
          </button>

          <button
            class="mini-player__btn"
            type="button"
            title="Previous track"
            aria-label="Previous"
            @click="audioStore.prev"
          >
            <span class="mini-player__icon" aria-hidden="true" v-html="previousSvg" />
          </button>

          <button
            class="mini-player__btn mini-player__btn--play"
            type="button"
            :title="audioStore.isPlaying ? 'Pause' : 'Play'"
            :aria-label="audioStore.isPlaying ? 'Pause' : 'Play'"
            @click="audioStore.togglePlayPause"
            data-testid="mini-play-pause"
          >
            <span
              class="mini-player__icon"
              aria-hidden="true"
              v-html="audioStore.isPlaying ? pauseSvg : playSvg"
            />
          </button>

          <button
            class="mini-player__btn"
            type="button"
            title="Next track"
            aria-label="Next"
            @click="audioStore.next"
          >
            <span class="mini-player__icon" aria-hidden="true" v-html="nextSvg" />
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
            <span
              class="mini-player__icon"
              aria-hidden="true"
              v-html="audioStore.repeatMode === 'one' ? repeatOneSvg : repeatSvg"
            />
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
            :style="{ '--progress-percent': progressPercent }"
            @input="onSeek"
            aria-label="Seek"
          />
          <span class="mini-player__time">{{ formatTime(audioStore.duration) }}</span>
        </div>
      </div>

      <!-- Right: Lyrics + Close -->
      <div class="mini-player__right">
        <InstrumentFaders
          v-model="showStemFaders"
          :gains="audioStore.stemGains"
          @setGain="onStemGain"
        />

        <button
          class="mini-player__btn mini-player__btn--lyrics"
          :class="{ 'is-active': audioStore.showLyrics, 'is-disabled': !currentTrackHasLyrics }"
          type="button"
          :title="
            !currentTrackHasLyrics
              ? 'No lyrics available'
              : audioStore.showLyrics
                ? 'Hide lyrics'
                : 'Show lyrics'
          "
          :aria-label="audioStore.showLyrics ? 'Hide lyrics' : 'Show lyrics'"
          :disabled="!currentTrackHasLyrics"
          data-testid="mini-lyrics"
          @click="audioStore.toggleLyrics"
        >
          <span class="mini-player__icon" aria-hidden="true" v-html="lyricsSvg" />
        </button>

        <div class="mini-player__volume-wrap" data-testid="mini-volume">
          <button
            class="mini-player__volume-icon-btn"
            type="button"
            :title="audioStore.volume <= 0.001 ? 'Unmute' : 'Mute'"
            :aria-label="audioStore.volume <= 0.001 ? 'Unmute' : 'Mute'"
            data-testid="mini-volume-mute"
            @click="toggleVolumeMute"
          >
            <span class="mini-player__volume-icon" aria-hidden="true" v-html="volumeIconSvg" />
          </button>
          <input
            class="mini-player__volume"
            type="range"
            min="0"
            max="1"
            step="0.01"
            :value="audioStore.volume"
            :style="{ '--volume-percent': volumePercent }"
            aria-label="Volume"
            @input="onVolumeInput"
          />
        </div>

        <button
          class="mini-player__btn mini-player__close"
          type="button"
          title="Close player"
          aria-label="Close player"
          data-testid="audio-mini-close"
          @click="audioStore.stopAndHide"
        >
          <span class="mini-player__icon" aria-hidden="true" v-html="closeSvg" />
        </button>
      </div>
    </div>
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

:deep(.mini-player__icon svg) {
  display: block;
  width: 16px;
  height: 16px;
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

:deep(.mini-player__btn) {
  position: relative;
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

:deep(.mini-player__btn:hover) {
  color: var(--color-text);
  transform: scale(1.06);
}

:deep(.mini-player__btn--play) {
  width: 32px;
  height: 32px;
  background: white;
  color: black;
}

:deep(.mini-player__btn--play:hover) {
  background: white;
  transform: scale(1.08);
}

:deep(.mini-player__btn--shuffle.is-active),
:deep(.mini-player__btn--repeat.is-active),
:deep(.mini-player__btn--lyrics.is-active),
:deep(.mini-player__btn--stems.is-active) {
  color: var(--color-neon-cyan);
}

:deep(.mini-player__btn--shuffle.is-active::after),
:deep(.mini-player__btn--repeat.is-active::after),
:deep(.mini-player__btn--lyrics.is-active::after),
:deep(.mini-player__btn--stems.is-active::after) {
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

:deep(.mini-player__btn--lyrics.is-disabled) {
  opacity: 0.3;
  cursor: not-allowed;
}

:deep(.mini-player__btn--lyrics.is-disabled:hover) {
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

.mini-player__progress:hover::-webkit-slider-runnable-track {
  background: linear-gradient(
    to right,
    var(--color-neon-cyan) 0%,
    var(--color-neon-cyan) var(--progress-percent, 0%),
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

.mini-player__progress:hover::-moz-range-progress {
  background: var(--color-neon-cyan);
}

/* Right: Close */
.mini-player__right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.mini-player__volume-wrap {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.mini-player__volume-icon {
  color: var(--color-text-secondary);
}

.mini-player__volume-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin: 0;
  border: none;
  background: transparent;
  cursor: pointer;
}

:deep(.mini-player__volume-icon svg) {
  display: block;
  width: 16px;
  height: 16px;
}

.mini-player__volume {
  width: 130px;
  height: 4px;
  border-radius: 999px;
  appearance: none;
  cursor: pointer;
  background: transparent;
}

.mini-player__volume::-webkit-slider-runnable-track {
  height: 4px;
  border-radius: 999px;
  background: linear-gradient(
    to right,
    rgba(255, 255, 255, 0.92) 0%,
    rgba(255, 255, 255, 0.92) var(--volume-percent, 0%),
    rgba(255, 255, 255, 0.22) var(--volume-percent, 0%),
    rgba(255, 255, 255, 0.22) 100%
  );
}

.mini-player__volume::-webkit-slider-thumb {
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: white;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s ease;
  margin-top: -4px;
}

.mini-player__volume::-moz-range-track {
  height: 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.22);
}

.mini-player__volume::-moz-range-progress {
  height: 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
}

.mini-player__volume::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: white;
  border: none;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.mini-player__volume-wrap:hover .mini-player__volume-icon {
  color: var(--color-text);
}

.mini-player__volume-wrap:hover .mini-player__volume::-webkit-slider-runnable-track {
  background: linear-gradient(
    to right,
    var(--color-neon-cyan) 0%,
    var(--color-neon-cyan) var(--volume-percent, 0%),
    rgba(255, 255, 255, 0.22) var(--volume-percent, 0%),
    rgba(255, 255, 255, 0.22) 100%
  );
}

.mini-player__volume-wrap:hover .mini-player__volume::-moz-range-progress {
  background: var(--color-neon-cyan);
}

.mini-player__volume-wrap:hover .mini-player__volume::-webkit-slider-thumb,
.mini-player__volume-wrap:hover .mini-player__volume::-moz-range-thumb {
  opacity: 1;
}

.mini-player__close {
  width: 32px;
  height: 32px;
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
