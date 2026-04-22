<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useAudioStore } from '@/stores/audio'
import { getAlbumById } from '@/data/albums'
import { useUiText } from '@/composables/useUiText'
import { usePlayerThemeStyle } from '@/composables/usePlayerThemeStyle'
import { useTooltipSuppression } from '@/composables/useTooltipSuppression'
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
const titleEl = ref<HTMLElement | null>(null)
const artistEl = ref<HTMLElement | null>(null)
let miniPlayerResizeObserver: ResizeObserver | null = null
let textResizeObserver: ResizeObserver | null = null
let lastMiniPlayerOffsetPx = -1
let rafOverflowUpdateId = 0
let windowResizeHandler: (() => void) | null = null

const showStemFaders = ref(false)
const t = useUiText()
const isTitleOverflowing = ref(false)
const isArtistOverflowing = ref(false)
const isCompactMiniPlayerUi = ref(false)

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

const currentAlbumId = computed(() => audioStore.currentTrackId?.split(':')[0] ?? null)
const currentAlbum = computed(() =>
  currentAlbumId.value ? getAlbumById(currentAlbumId.value) : undefined
)
const playerThemeStyle = usePlayerThemeStyle(() => currentAlbum.value, 'player-accent')
const { onTooltipAreaClick } = useTooltipSuppression()

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

function getRepeatLabel() {
  return audioStore.repeatMode === 'off'
    ? t.value.player.enableRepeat
    : audioStore.repeatMode === 'all'
      ? t.value.player.repeatOne
      : t.value.player.disableRepeat
}

function updateCompactMiniPlayerUi() {
  if (typeof window === 'undefined') return
  isCompactMiniPlayerUi.value = window.innerWidth <= 900
}

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

function updateTextOverflow() {
  const title = titleEl.value
  const artist = artistEl.value

  if (title) {
    const overflow = title.scrollWidth > title.clientWidth + 1
    isTitleOverflowing.value = overflow
    const distance = Math.max(0, title.scrollWidth - title.clientWidth)
    title.style.setProperty('--marquee-distance', `${distance}px`)
  }

  if (artist) {
    const overflow = artist.scrollWidth > artist.clientWidth + 1
    isArtistOverflowing.value = overflow
    const distance = Math.max(0, artist.scrollWidth - artist.clientWidth)
    artist.style.setProperty('--marquee-distance', `${distance}px`)
  }
}

function scheduleOverflowUpdate() {
  if (rafOverflowUpdateId) return
  rafOverflowUpdateId = window.requestAnimationFrame(() => {
    rafOverflowUpdateId = 0
    updateTextOverflow()
  })
}

watch(
  () => [currentTitle.value, currentArtist.value],
  async () => {
    await nextTick()
    scheduleOverflowUpdate()
  },
  { immediate: true }
)

watch(
  shouldShowMiniPlayer,
  async (show) => {
    if (!show) {
      audioStore.closeLyrics()
      showStemFaders.value = false
      setMiniPlayerOffset(0)
      miniPlayerResizeObserver?.disconnect()
      miniPlayerResizeObserver = null
      textResizeObserver?.disconnect()
      textResizeObserver = null
      return
    }

    const el = miniPlayerEl.value
    if (!el) {
      setMiniPlayerOffset(80)
      return
    }

    updateCompactMiniPlayerUi()
    setMiniPlayerOffset(el.getBoundingClientRect().height)

    await nextTick()
    scheduleOverflowUpdate()

    if (typeof ResizeObserver !== 'undefined') {
      textResizeObserver?.disconnect()
      textResizeObserver = new ResizeObserver(() => {
        scheduleOverflowUpdate()
      })
      if (titleEl.value) textResizeObserver.observe(titleEl.value)
      if (artistEl.value) textResizeObserver.observe(artistEl.value)
    }

    if (typeof ResizeObserver === 'undefined') return

    miniPlayerResizeObserver?.disconnect()
    miniPlayerResizeObserver = new ResizeObserver(() => {
      setMiniPlayerOffset(el.getBoundingClientRect().height)
      scheduleOverflowUpdate()
    })
    miniPlayerResizeObserver.observe(el)
  },
  { immediate: true }
)

onMounted(() => {
  updateCompactMiniPlayerUi()

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

  windowResizeHandler = () => {
    updateCompactMiniPlayerUi()
    // Layout can change without affecting mini-player height, so recompute overflow on resize.
    scheduleOverflowUpdate()
  }
  window.addEventListener('resize', windowResizeHandler, { passive: true })
  window.addEventListener('orientationchange', windowResizeHandler, { passive: true })

  nextTick(() => {
    scheduleOverflowUpdate()
  })
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)

  if (windowResizeHandler) {
    window.removeEventListener('resize', windowResizeHandler)
    window.removeEventListener('orientationchange', windowResizeHandler)
    windowResizeHandler = null
  }

  if (rafOverflowUpdateId) {
    window.cancelAnimationFrame(rafOverflowUpdateId)
    rafOverflowUpdateId = 0
  }

  textResizeObserver?.disconnect()
  textResizeObserver = null

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
      :style="playerThemeStyle"
      data-testid="audio-mini-player"
      ref="miniPlayerEl"
      @pointerdown.stop
      @click.stop
      @click.capture="onTooltipAreaClick"
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
          <div
            ref="titleEl"
            class="mini-player__title"
            :class="{ 'is-marquee': isTitleOverflowing }"
          >
            <span class="mini-player__text">{{ currentTitle }}</span>
          </div>
          <div
            ref="artistEl"
            class="mini-player__artist"
            :class="{ 'is-marquee': isArtistOverflowing }"
          >
            <span class="mini-player__text">{{ currentArtist }}</span>
          </div>
        </div>
      </div>

      <!-- Center: Controls + Progress -->
      <div
        class="mini-player__center"
        :class="{ 'mini-player__center--mobile': isCompactMiniPlayerUi }"
      >
        <div class="mini-player__controls">
          <button
            v-if="!isCompactMiniPlayerUi"
            class="mini-player__btn mini-player__btn--shuffle"
            :class="{ 'is-active': audioStore.isShuffle }"
            type="button"
            :data-tooltip="audioStore.isShuffle ? t.player.disableShuffle : t.player.enableShuffle"
            :aria-label="audioStore.isShuffle ? t.player.disableShuffle : t.player.enableShuffle"
            @click="audioStore.toggleShuffle()"
            data-testid="mini-shuffle"
          >
            <span class="mini-player__icon" aria-hidden="true" v-html="shuffleSvg" />
          </button>

          <button
            class="mini-player__btn"
            type="button"
            :data-tooltip="t.player.prevTrack"
            :aria-label="t.player.prevTrack"
            @click="audioStore.prev"
          >
            <span class="mini-player__icon" aria-hidden="true" v-html="previousSvg" />
          </button>

          <button
            class="mini-player__btn mini-player__btn--play"
            type="button"
            :data-tooltip="audioStore.isPlaying ? t.player.pause : t.player.play"
            :aria-label="audioStore.isPlaying ? t.player.pause : t.player.play"
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
            :data-tooltip="t.player.nextTrack"
            :aria-label="t.player.nextTrack"
            @click="audioStore.next"
          >
            <span class="mini-player__icon" aria-hidden="true" v-html="nextSvg" />
          </button>

          <button
            v-if="!isCompactMiniPlayerUi"
            class="mini-player__btn mini-player__btn--repeat"
            :class="{ 'is-active': audioStore.repeatMode !== 'off' }"
            type="button"
            :data-tooltip="getRepeatLabel()"
            :aria-label="getRepeatLabel()"
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

        <span v-if="!isCompactMiniPlayerUi" class="mini-player__time mini-player__time--current">{{
          formatTime(audioStore.currentTime)
        }}</span>
        <input
          type="range"
          class="mini-player__progress"
          min="0"
          :max="audioStore.duration || 100"
          :value="audioStore.currentTime"
          :style="{ '--progress-percent': progressPercent }"
          @input="onSeek"
          :aria-label="t.player.seek"
        />
        <span v-if="!isCompactMiniPlayerUi" class="mini-player__time mini-player__time--duration">{{
          formatTime(audioStore.duration)
        }}</span>
      </div>

      <!-- Right: Utility actions -->
      <div class="mini-player__right">
        <div class="mini-player__actions">
          <InstrumentFaders
            v-model="showStemFaders"
            :gains="audioStore.stemGains"
            @setGain="onStemGain"
          />

          <button
            class="mini-player__btn mini-player__btn--lyrics"
            :class="{ 'is-active': audioStore.showLyrics, 'is-disabled': !currentTrackHasLyrics }"
            type="button"
            :data-tooltip="
              !currentTrackHasLyrics
                ? t.player.noLyrics
                : audioStore.showLyrics
                  ? t.player.hideLyrics
                  : t.player.showLyrics
            "
            :aria-label="audioStore.showLyrics ? t.player.hideLyrics : t.player.showLyrics"
            :disabled="!currentTrackHasLyrics"
            data-testid="mini-lyrics"
            @click="audioStore.toggleLyrics"
          >
            <span class="mini-player__icon" aria-hidden="true" v-html="lyricsSvg" />
          </button>

          <div
            v-if="!isCompactMiniPlayerUi"
            class="mini-player__volume-wrap"
            data-testid="mini-volume"
          >
            <button
              class="mini-player__volume-icon-btn"
              type="button"
              :data-tooltip="audioStore.volume <= 0.001 ? t.player.unmute : t.player.mute"
              :aria-label="audioStore.volume <= 0.001 ? t.player.unmute : t.player.mute"
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
              :aria-label="t.player.volume"
              @input="onVolumeInput"
            />
          </div>
        </div>
      </div>

      <button
        class="mini-player__btn mini-player__close"
        type="button"
        :data-tooltip="t.player.closePlayer"
        :aria-label="t.player.closePlayer"
        data-testid="audio-mini-close"
        @click="audioStore.stopAndHide"
      >
        <span class="mini-player__icon" aria-hidden="true" v-html="closeSvg" />
      </button>
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
  --tooltip-font-size: 12px;
  position: relative;
  pointer-events: auto;
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: stretch;
  gap: 16px;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.92);
  backdrop-filter: blur(20px);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  --mini-btn-size: 32px;
}

.mini-player__left,
.mini-player__center,
.mini-player__right {
  min-width: 0;
}

:deep(.mini-player__icon svg) {
  display: block;
  width: 16px;
  height: 16px;
}

/* Left: Track Info */
.mini-player__left {
  grid-column: 1;
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
  flex: 1 1 auto;
  width: 100%;
}

.mini-player__title,
.mini-player__artist {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  --marquee-distance: 0px;
  display: block;
  width: 100%;
}

.mini-player__title.is-marquee,
.mini-player__artist.is-marquee {
  text-overflow: clip;
}

.mini-player__text {
  display: inline-block;
  transform: translateX(0);
  will-change: transform;
}

.mini-player__title.is-marquee .mini-player__text,
.mini-player__artist.is-marquee .mini-player__text {
  animation: mini-player-marquee 10s linear infinite;
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
  --mini-time-width: 40px;
  --mini-time-gap: 8px;
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: grid;
  grid-template-columns: var(--mini-time-width) minmax(0, 1fr) var(--mini-time-width);
  grid-template-rows: auto auto;
  column-gap: var(--mini-time-gap);
  row-gap: 8px;
  align-items: center;
  justify-items: center;
  width: clamp(320px, 42vw, 722px);
  max-width: min(722px, calc(100% - 440px));
  min-width: 0;
  z-index: 1;
}

.mini-player__controls {
  display: flex;
  align-items: center;
  gap: 16px;
  justify-content: center;
  grid-column: 1 / -1;
  grid-row: 1;
  width: 100%;
  min-width: 0;
}

.mini-player__time {
  font-size: 11px;
  color: var(--color-text-secondary);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  align-self: center;
}

.mini-player__time--current {
  grid-column: 1;
  grid-row: 2;
  justify-self: start;
}

.mini-player__time--duration {
  grid-column: 3;
  grid-row: 2;
  justify-self: end;
}

.mini-player__progress {
  grid-column: 2;
  grid-row: 2;
  width: 100%;
  height: 20px;
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
  background: transparent;
  padding: 0;
  margin: 0;
  align-self: center;
}

:deep(.mini-player__btn) {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--mini-btn-size);
  height: var(--mini-btn-size);
  min-width: var(--mini-btn-size);
  min-height: var(--mini-btn-size);
  aspect-ratio: 1 / 1;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
  flex: 0 0 auto;
  flex-shrink: 0;
}

:deep(.mini-player__btn:hover) {
  color: var(--color-text);
  transform: scale(1.06);
}

:deep(.mini-player__btn--play) {
  width: var(--mini-btn-size);
  height: var(--mini-btn-size);
  background: white;
  color: black;
  box-shadow: 0 8px 24px rgba(255, 255, 255, 0.15);
}

:deep(.mini-player__btn--play:hover) {
  background: white;
  transform: scale(1.08);
}

:deep(.mini-player__btn--shuffle.is-active),
:deep(.mini-player__btn--repeat.is-active),
:deep(.mini-player__btn--lyrics.is-active),
:deep(.mini-player__btn--stems.is-active) {
  color: var(--player-accent-color);
}

.mini-player__progress::-webkit-slider-thumb {
  appearance: none;
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: white;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s ease;
  margin-top: -4px;
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
    var(--player-accent-color) 0%,
    var(--player-accent-color) var(--progress-percent, 0%),
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
  background: var(--player-accent-color);
}

/* Right: Close */
.mini-player__right {
  grid-column: 2;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  position: relative;
  z-index: 2;
}

.mini-player__actions {
  display: flex;
  align-items: center;
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
  width: clamp(64px, 12vw, 130px);
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
    var(--player-accent-color) 0%,
    var(--player-accent-color) var(--volume-percent, 0%),
    rgba(255, 255, 255, 0.22) var(--volume-percent, 0%),
    rgba(255, 255, 255, 0.22) 100%
  );
}

.mini-player__volume-wrap:hover .mini-player__volume::-moz-range-progress {
  background: var(--player-accent-color);
}

.mini-player__volume-wrap:hover .mini-player__volume::-webkit-slider-thumb,
.mini-player__volume-wrap:hover .mini-player__volume::-moz-range-thumb {
  opacity: 1;
}

.mini-player__close {
  grid-column: 3;
  align-self: center;
  width: 32px;
  height: 32px;
  justify-self: end;
  position: relative;
  z-index: 2;
}

@keyframes mini-player-marquee {
  /*
    Behavior:
    - Start at beginning
    - Scroll to the end (last letter touches the right edge)
    - Hold at the end
    - Snap immediately back to the beginning
  */
  0% {
    transform: translateX(0);
  }
  6% {
    transform: translateX(0);
  }
  66% {
    transform: translateX(calc(-1 * var(--marquee-distance)));
  }
  82% {
    transform: translateX(calc(-1 * var(--marquee-distance)));
  }
  82.01% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(0);
  }
}

/* Responsive */
@media (max-width: 900px) {
  .mini-player {
    display: grid;
    /*
     * 1fr auto 1fr: outer columns are equal, so column-2 (controls) is
     * naturally centered regardless of how much info is in the left rail.
     */
    grid-template-columns: 1fr auto 1fr;
    grid-template-rows: auto auto;
    align-items: center;
    gap: 6px 8px;
    padding: 6px 8px 6px;
    --mini-btn-size: 28px;
    --mini-row-height: 40px;
  }

  .mini-player__left {
    grid-column: 1;
    grid-row: 1;
    align-self: center;
    min-height: var(--mini-row-height);
    min-width: 0;
    gap: 8px;
    align-items: center;
    overflow: hidden;
  }

  .mini-player__info {
    width: 100%;
    min-width: 0;
    gap: 2px;
    min-height: var(--mini-row-height);
    justify-content: center;
  }

  .mini-player__title,
  .mini-player__artist {
    max-width: 100%;
  }

  .mini-player__center,
  .mini-player__center--mobile {
    min-width: 0;
    max-width: none;
  }

  .mini-player__center--mobile {
    display: contents;
  }

  /* Controls become a direct grid item via display:contents on the parent. */
  .mini-player__center--mobile .mini-player__controls {
    grid-column: 2;
    grid-row: 1;
    position: static;
    display: flex;
    align-items: center;
    justify-content: center;
    align-self: center;
    gap: 8px;
    width: max-content;
    min-height: var(--mini-row-height);
  }

  .mini-player__right {
    grid-column: 3;
    grid-row: 1;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
    min-height: var(--mini-row-height);
    /* leave room at the right edge for the close button (18px + 4px gap) */
    padding-right: 22px;
    justify-self: end;
    align-self: center;
  }

  .mini-player__actions {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
    min-height: var(--mini-row-height);
  }

  /* Close button shares column 3 with right-actions; justify-self:end pins it
     to the far right while padding-right on .mini-player__right keeps actions
     clear of it. */
  .mini-player__close {
    grid-column: 3;
    grid-row: 1;
    width: 16px !important;
    height: 16px !important;
    min-width: 16px !important;
    min-height: 16px !important;
    align-self: start;
    margin-top: 2px;
    justify-self: end;
    flex-shrink: 0;
    z-index: 2;
  }

  .mini-player__artwork {
    width: 38px;
    height: 38px;
  }

  .mini-player__title {
    font-size: 12px;
  }

  .mini-player__artist {
    font-size: 10px;
  }

  .mini-player__center--mobile .mini-player__progress {
    grid-column: 1 / -1;
    grid-row: 2;
    width: 100%;
    margin-top: 2px;
  }

  :deep(.mini-player__btn) {
    width: var(--mini-btn-size);
    height: var(--mini-btn-size);
    min-width: var(--mini-btn-size);
    min-height: var(--mini-btn-size);
  }
}
</style>
