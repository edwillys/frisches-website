<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import type { Track } from '@/data/tracks'
import type { LyricsData } from '@/types/lyrics'
import { useAudioStore } from '@/stores/audio'
import {
  albums,
  getAlbumById,
  getAlbumTracks,
  getAlbumTotalDurationSeconds,
  formatSecondsAsAlbumDuration,
} from '@/data/albums'
import { useUiText } from '@/composables/useUiText'
import { usePlayerThemeStyle } from '@/composables/usePlayerThemeStyle'
import { useTooltipSuppression } from '@/composables/useTooltipSuppression'
import LyricsDisplay from './LyricsDisplay.vue'
import closeSvg from '@/assets/icons/close.svg?raw'
import playSvg from '@/assets/icons/play.svg?raw'
import pauseSvg from '@/assets/icons/pause.svg?raw'
import shuffleSvg from '@/assets/icons/shuffle.svg?raw'
import repeatSvg from '@/assets/icons/repeat.svg?raw'
import repeatOneSvg from '@/assets/icons/repeat-one.svg?raw'
import clockSvg from '@/assets/icons/clock.svg?raw'
import playingBarsSvg from '@/assets/icons/playing-bars.svg?raw'

const audioStore = useAudioStore()
const t = useUiText()

// Current selected album
const selectedAlbumId = ref('tftc')
const selectedTrackId = ref<string | null>(null)
const hoveredTrackId = ref<string | null>(null)

// Lyrics data
const lyricsData = ref<LyricsData | null>(null)
const isLoadingLyrics = ref(false)

const selectedAlbum = computed(() => getAlbumById(selectedAlbumId.value))
const albumTracks = computed(() => getAlbumTracks(selectedAlbumId.value))
const albumDurationFormatted = computed(() =>
  formatSecondsAsAlbumDuration(getAlbumTotalDurationSeconds(selectedAlbumId.value))
)
const albumSongCount = computed(() => albumTracks.value.length)

const heroTitleEl = ref<HTMLElement | null>(null)
const heroTitleTextEl = ref<HTMLElement | null>(null)
const isHeroTitleMarquee = ref(false)
let rafHeroTitleFitId = 0
let heroTitleResizeObserver: ResizeObserver | null = null
let windowResizeHandler: (() => void) | null = null

const HERO_TITLE_MAX_PX = 62
const HERO_TITLE_MIN_PX = 40

const albumImageLoaded = ref<Record<string, boolean>>({})
const albumImageFailed = ref<Record<string, boolean>>({})
const tappedTrackId = ref<string | null>(null)

// Sync store playlist when album changes
watch(
  selectedAlbumId,
  (albumId) => {
    const tracks = getAlbumTracks(albumId)
    audioStore.setPlaylistByTrackIds(tracks.map((t) => t.trackId))
  },
  { immediate: true }
)

const currentTrack = computed(() => audioStore.currentTrack)
const isPlaying = computed(() => audioStore.isPlaying)
const isShuffle = computed(() => audioStore.isShuffle)
const repeatMode = computed(() => audioStore.repeatMode)
const albumSongCountText = computed(() => t.value.music.songsCount(albumSongCount.value))
const playerThemeStyle = usePlayerThemeStyle(() => selectedAlbum.value, 'album-theme')
const { onTooltipAreaClick } = useTooltipSuppression()

function getAlbumItemLabel(title: string, count: number) {
  return t.value.music.albumItemLabel(title, count)
}

function getTrackActionLabel(track: Track) {
  return isCurrentTrack(track) && isPlaying.value ? t.value.player.pause : t.value.player.play
}

function getRepeatActionLabel() {
  return repeatMode.value === 'off'
    ? t.value.player.enableRepeat
    : repeatMode.value === 'all'
      ? t.value.player.repeatOne
      : t.value.player.disableRepeat
}

function markAlbumImageLoaded(albumId: string) {
  albumImageLoaded.value = { ...albumImageLoaded.value, [albumId]: true }
  albumImageFailed.value = { ...albumImageFailed.value, [albumId]: false }
}

function markAlbumImageFailed(albumId: string) {
  albumImageFailed.value = { ...albumImageFailed.value, [albumId]: true }
  albumImageLoaded.value = { ...albumImageLoaded.value, [albumId]: false }
}

function hasAlbumImageLoaded(albumId: string) {
  return albumImageLoaded.value[albumId] === true
}

function shouldShowAlbumImageSkeleton(albumId: string, imageUrl?: string) {
  if (!imageUrl) return true
  if (albumImageFailed.value[albumId]) return true
  return !hasAlbumImageLoaded(albumId)
}

function selectAlbum(albumId: string) {
  selectedAlbumId.value = albumId
}

function scheduleHeroTitleFit() {
  if (rafHeroTitleFitId) return
  rafHeroTitleFitId = window.requestAnimationFrame(() => {
    rafHeroTitleFitId = 0
    void updateHeroTitleFit()
  })
}

async function updateHeroTitleFit() {
  await nextTick()
  const el = heroTitleEl.value
  if (!el) return

  // If hidden (e.g., stacked mobile mode), do nothing.
  const rect = el.getBoundingClientRect()
  if (rect.width <= 1) return

  isHeroTitleMarquee.value = false

  const setSize = (px: number) => {
    el.style.setProperty('--hero-title-size', `${px}px`)
    // Force layout so subsequent measurements are accurate.
    void el.offsetWidth
  }

  // Check if text fits within two lines.
  const fitsInTwoLines = (): boolean => {
    const lh = parseFloat(getComputedStyle(el).lineHeight)
    return el.scrollHeight <= Math.ceil(lh * 2) + 4
  }

  // Fast path: max size fits in two lines.
  setSize(HERO_TITLE_MAX_PX)
  if (fitsInTwoLines()) return

  // Binary search for the largest size that fits in two lines.
  let low = HERO_TITLE_MIN_PX
  let high = HERO_TITLE_MAX_PX
  for (let i = 0; i < 10; i++) {
    const mid = Math.floor((low + high) / 2)
    setSize(mid)
    if (fitsInTwoLines()) {
      low = mid
    } else {
      high = mid - 1
    }
  }
  setSize(low)
  // If text still overflows at min size, CSS line-clamp shows ellipsis at line 2.
}

function playAlbum() {
  if (isPlaying.value) {
    audioStore.togglePlayPause()
    return
  }

  const firstTrack = albumTracks.value[0]
  if (!firstTrack) return
  audioStore.startFromMusic(firstTrack.trackId)
}

function toggleShuffle() {
  audioStore.toggleShuffle()
}

function toggleRepeat() {
  audioStore.cycleRepeatMode()
}

function playOrToggle(track: Track) {
  // If the mini-player was explicitly dismissed, toggling is disabled.
  // Treat any play intent from the Music UI as an explicit restart.
  if (audioStore.isStopped) {
    audioStore.startFromMusic(track.trackId)
    return
  }

  if (isCurrentTrack(track)) {
    audioStore.togglePlayPause()
    return
  }
  audioStore.startFromMusic(track.trackId)
}

function selectTrack(track: Track) {
  selectedTrackId.value = track.trackId
  if (shouldPlayTrackFromRowTap(track.trackId)) {
    tappedTrackId.value = null
    playOrToggle(track)
  }
}

function onTrackPointerDown(track: Track, event: PointerEvent) {
  tappedTrackId.value = event.pointerType === 'touch' ? track.trackId : null
}

function shouldPlayTrackFromRowTap(trackId: string) {
  return tappedTrackId.value === trackId
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

function formatDuration(duration?: string): string {
  return duration ?? '0:00'
}

function isCurrentTrack(track: Track): boolean {
  return currentTrack.value?.trackId === track.trackId
}

onMounted(() => {
  // When entering the Music screen, highlight the currently playing track.
  if (audioStore.currentTrackId) {
    selectedTrackId.value = audioStore.currentTrackId
  }

  // Keep hero title fitted on resize.
  if (typeof ResizeObserver !== 'undefined') {
    heroTitleResizeObserver?.disconnect()
    heroTitleResizeObserver = new ResizeObserver(() => {
      scheduleHeroTitleFit()
    })
    if (heroTitleEl.value) heroTitleResizeObserver.observe(heroTitleEl.value)
  }

  scheduleHeroTitleFit()

  windowResizeHandler = () => {
    scheduleHeroTitleFit()
  }
  window.addEventListener('resize', windowResizeHandler, { passive: true })
})

onUnmounted(() => {
  if (rafHeroTitleFitId) {
    window.cancelAnimationFrame(rafHeroTitleFitId)
    rafHeroTitleFitId = 0
  }
  heroTitleResizeObserver?.disconnect()
  heroTitleResizeObserver = null

  if (windowResizeHandler) {
    window.removeEventListener('resize', windowResizeHandler)
    windowResizeHandler = null
  }
})

watch(
  () => selectedAlbum.value?.title,
  async () => {
    await nextTick()
    scheduleHeroTitleFit()
  }
)

watch(
  () => audioStore.showLyrics,
  async (show) => {
    if (!show) {
      await nextTick()
      scheduleHeroTitleFit()
    }
  }
)

// Watch for showLyrics changes from store (triggered by mini-player button)
watch(
  () => audioStore.showLyrics,
  async (show) => {
    if (show && currentTrack.value?.lyricsPath) {
      await loadLyrics(currentTrack.value.lyricsPath)
    }
  }
)

// Watch for track changes to clear selected track and reload lyrics if needed
watch(currentTrack, async (newTrack, oldTrack) => {
  if (newTrack?.trackId !== oldTrack?.trackId) {
    // Keep selection synced to the currently playing track.
    selectedTrackId.value = newTrack?.trackId ?? null
    hoveredTrackId.value = null

    // Reload lyrics if lyrics view is open
    if (audioStore.showLyrics) {
      lyricsData.value = null
      if (newTrack?.lyricsPath) {
        await loadLyrics(newTrack.lyricsPath)
      } else {
        // Close lyrics if new track doesn't have lyrics
        audioStore.closeLyrics()
      }
    }
  }
})
</script>

<template>
  <div
    class="spotify-layout"
    :style="playerThemeStyle"
    data-testid="audio-player"
    @click.capture="onTooltipAreaClick"
  >
    <!-- Top: Album Carousel -->
    <nav class="album-carousel" :aria-label="t.music.albumsNavLabel" data-testid="album-carousel">
      <div class="album-carousel__list" role="list">
        <button
          v-for="album in albums"
          :key="album.albumId"
          class="album-carousel__item"
          :class="{ 'is-active': album.albumId === selectedAlbumId }"
          :data-tooltip="getAlbumItemLabel(album.title, album.trackIds.length)"
          :aria-label="getAlbumItemLabel(album.title, album.trackIds.length)"
          @click="selectAlbum(album.albumId)"
          data-testid="album-carousel-item"
          role="listitem"
        >
          <div class="album-carousel__cover-shell">
            <div
              v-if="shouldShowAlbumImageSkeleton(album.albumId, album.coverUrl)"
              class="skeleton-loader"
              aria-hidden="true"
            >
              <div class="skeleton-pulse"></div>
            </div>
            <img
              v-if="album.coverUrl && !albumImageFailed[album.albumId]"
              :src="album.coverUrl"
              :srcset="album.coverSrcset"
              sizes="48px"
              class="album-carousel__cover"
              :class="{ 'is-loaded': hasAlbumImageLoaded(album.albumId) }"
              width="48"
              height="48"
              alt=""
              @load="markAlbumImageLoaded(album.albumId)"
              @error="markAlbumImageFailed(album.albumId)"
            />
          </div>

          <div class="album-carousel__info">
            <div class="album-carousel__title">{{ album.title }}</div>
            <div class="album-carousel__meta">{{ t.music.songsCount(album.trackIds.length) }}</div>
          </div>
        </button>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="main-content">
      <!-- Hero Header with Album Info -->
      <header v-show="!audioStore.showLyrics" class="album-hero">
        <div class="album-hero__cover-wrapper">
          <div
            v-if="shouldShowAlbumImageSkeleton(selectedAlbumId, selectedAlbum?.coverUrl)"
            class="skeleton-loader"
            aria-hidden="true"
          >
            <div class="skeleton-pulse"></div>
          </div>
          <img
            v-if="selectedAlbum?.coverUrl && !albumImageFailed[selectedAlbumId]"
            :src="selectedAlbum.coverUrl"
            :srcset="selectedAlbum.coverSrcset"
            sizes="(max-width: 520px) 192px, 232px"
            alt=""
            class="album-hero__cover"
            :class="{ 'is-loaded': hasAlbumImageLoaded(selectedAlbumId) }"
            data-testid="album-hero-cover"
            @load="markAlbumImageLoaded(selectedAlbumId)"
            @error="markAlbumImageFailed(selectedAlbumId)"
          />
        </div>

        <div class="album-hero__info">
          <div class="album-hero__label">{{ t.music.albumLabel }}</div>
          <h1
            ref="heroTitleEl"
            class="album-hero__title"
            :class="{ 'is-marquee': isHeroTitleMarquee }"
            data-testid="album-title"
          >
            <span ref="heroTitleTextEl" class="album-hero__title-text">{{
              selectedAlbum?.title
            }}</span>
          </h1>
          <div class="album-hero__meta">
            <span>{{ selectedAlbum?.year }}</span>
            <span class="album-hero__dot">•</span>
            <span>{{ albumSongCountText }}</span>
            <span class="album-hero__dot">•</span>
            <span>{{ albumDurationFormatted }}</span>
          </div>
        </div>
      </header>

      <!-- Actions Row -->
      <div v-show="!audioStore.showLyrics" class="actions-row">
        <button
          class="btn-play-big"
          @click="playAlbum"
          :data-tooltip="isPlaying ? t.player.pause : t.player.play"
          :aria-label="isPlaying ? t.music.pauseAlbum : t.music.playAlbum"
          data-testid="btn-play-album"
        >
          <span v-if="!isPlaying" aria-hidden="true" v-html="playSvg" />
          <span v-else aria-hidden="true" v-html="pauseSvg" />
        </button>

        <button
          class="btn-shuffle"
          :class="{ 'is-active': isShuffle }"
          @click="toggleShuffle"
          :data-tooltip="isShuffle ? t.player.disableShuffle : t.player.enableShuffle"
          :aria-label="isShuffle ? t.player.disableShuffle : t.player.enableShuffle"
          data-testid="btn-shuffle"
        >
          <span aria-hidden="true" v-html="shuffleSvg" />
        </button>

        <button
          class="btn-repeat"
          :class="{ 'is-active': repeatMode !== 'off' }"
          @click="toggleRepeat"
          :data-tooltip="getRepeatActionLabel()"
          :aria-label="getRepeatActionLabel()"
          data-testid="btn-repeat"
        >
          <span aria-hidden="true" v-html="repeatMode === 'one' ? repeatOneSvg : repeatSvg" />
        </button>
      </div>

      <!-- Track Table -->
      <div v-show="!audioStore.showLyrics" class="track-table">
        <div class="track-table__header">
          <div class="track-table__col track-table__col--index">#</div>
          <div class="track-table__col track-table__col--title">{{ t.music.trackTitleHeader }}</div>
          <div class="track-table__col track-table__col--duration">
            <span aria-hidden="true" v-html="clockSvg" />
          </div>
        </div>

        <div class="track-table__body" @pointerleave="hoveredTrackId = null">
          <div
            v-for="(track, index) in albumTracks"
            :key="track.trackId"
            class="track-table__row"
            :class="{
              'is-playing': isCurrentTrack(track) && isPlaying,
              'is-selected': selectedTrackId === track.trackId,
            }"
            :data-testid="`track-row-${index}`"
            @pointerdown="onTrackPointerDown(track, $event)"
            @click="selectTrack(track)"
            @pointerenter="hoveredTrackId = track.trackId"
          >
            <div class="track-table__col track-table__col--index">
              <button
                v-if="hoveredTrackId === track.trackId && isCurrentTrack(track) && isPlaying"
                class="track-table__play-btn"
                type="button"
                :data-tooltip="t.player.pause"
                :aria-label="t.player.pause"
                :data-testid="`track-pause-${index}`"
                @click.stop="audioStore.togglePlayPause()"
              >
                <span class="track-table__icon" aria-hidden="true" v-html="pauseSvg" />
              </button>

              <button
                v-else-if="hoveredTrackId === track.trackId"
                class="track-table__play-btn"
                type="button"
                :data-tooltip="getTrackActionLabel(track)"
                :aria-label="getTrackActionLabel(track)"
                :data-testid="`track-play-${index}`"
                @click.stop="playOrToggle(track)"
              >
                <span class="track-table__icon" aria-hidden="true" v-html="playSvg" />
              </button>

              <!-- Animated bars when playing (not hovered) -->
              <div
                v-else-if="isCurrentTrack(track) && isPlaying"
                class="track-table__animated-bars"
                aria-hidden="true"
              >
                <span aria-hidden="true" v-html="playingBarsSvg" />
              </div>

              <span v-else class="track-table__number">{{ index + 1 }}</span>
            </div>

            <div class="track-table__col track-table__col--title">
              <div
                class="track-table__title-text"
                :class="{ 'is-active': isCurrentTrack(track) && isPlaying }"
              >
                {{ track.title }}
              </div>
              <div class="track-table__artist">{{ track.artist }}</div>
            </div>

            <div class="track-table__col track-table__col--duration">
              {{ formatDuration(track.duration) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Lyrics View -->
      <div v-if="audioStore.showLyrics" class="lyrics-view">
        <button
          class="lyrics-view__close"
          type="button"
          :aria-label="t.music.closeLyrics"
          data-testid="lyrics-view-close"
          @click="audioStore.closeLyrics"
        >
          <span class="lyrics-view__close-icon" aria-hidden="true" v-html="closeSvg" />
        </button>

        <LyricsDisplay
          v-if="lyricsData && !isLoadingLyrics"
          :lyricsData="lyricsData"
          :currentTime="audioStore.currentTime"
          :isPlaying="audioStore.isPlaying"
          @seek="handleLyricsSeek"
        />
        <div v-else-if="isLoadingLyrics" class="lyrics-loading">{{ t.music.lyricsLoading }}</div>
        <div v-else class="lyrics-empty">{{ t.music.noLyricsForTrack }}</div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.spotify-layout {
  --tooltip-font-size: 13px;
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: var(--color-background);
  color: var(--color-text);
  overflow: hidden;
}

/* Album Carousel */
.album-carousel {
  flex-shrink: 0;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  padding: 5px 24px;
}

.album-carousel__list {
  display: flex;
  align-items: stretch;
  gap: 5px;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x proximity;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  padding: 2px 0;
}

.album-carousel__item {
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: 48px 1fr;
  gap: 5px;
  align-items: stretch;
  padding: 5px 8px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  color: var(--color-text);
  text-align: left;
  scroll-snap-align: start;
  transition:
    background 0.2s ease,
    border-color 0.2s ease;
  width: 220px;
  max-width: 220px;
}

.album-carousel__item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.album-carousel__item.is-active {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.18);
}

.album-carousel__cover {
  display: block;
  width: 48px;
  height: 48px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
  aspect-ratio: 1 / 1;
  opacity: 0;
  transition: opacity var(--transition-base);
}

.album-carousel__cover.is-loaded {
  opacity: 1;
}

.album-carousel__cover-shell {
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
  aspect-ratio: 1 / 1;
  background: rgba(255, 255, 255, 0.04);
  align-self: center;
}

.album-carousel__info {
  min-width: 0;
  max-width: 150px;
  min-height: 48px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-self: stretch;
}

.album-carousel__title {
  font-size: 12px;
  font-weight: 650;
  line-height: 1.15;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  white-space: normal;
  overflow: hidden;
  text-overflow: ellipsis;
}

.album-carousel__meta {
  font-size: 11px;
  color: var(--color-text-secondary);
  margin-top: auto;
  flex-shrink: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Main Content */
.main-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
}

/* Album Hero Header */
.album-hero {
  background: linear-gradient(
    180deg,
    var(--album-theme-color) 0%,
    var(--album-theme-dark) 40%,
    var(--color-background) 100%
  );
  padding: 4px 24px 8px;
  display: flex;
  gap: 24px;
  align-items: center;
  min-height: 265px;
}

.album-hero__cover-wrapper {
  position: relative;
  width: 232px;
  height: 232px;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 4px;
  box-shadow: 0 4px 60px rgba(0, 0, 0, 0.5);
}

.album-hero__cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 4px;
  opacity: 0;
  transition: opacity var(--transition-base);
}

.album-hero__cover.is-loaded {
  opacity: 1;
}

.album-hero__info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: white;
  flex: 1 1 auto;
  min-width: 0;
  text-align: left;
}

.album-hero__label {
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  text-align: left;
}

.album-hero__title {
  --hero-title-min: 40px;
  --hero-title-max: 62px;
  font-size: clamp(var(--hero-title-min), var(--hero-title-size, 62px), var(--hero-title-max));
  font-weight: 900;
  line-height: 1.15;
  margin: 0;
  text-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  max-width: 100%;
  width: 100%;
  text-align: left;
}

.album-hero__title-text {
  display: inline;
  white-space: normal;
}

.album-hero__title.is-marquee {
  text-overflow: clip;
}

.album-hero__title.is-marquee .album-hero__title-text {
  animation: album-hero-marquee 12s linear infinite;
}

.album-hero__meta {
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  flex-wrap: wrap;
}

.album-hero__dot {
  opacity: 0.7;
}

/* Actions Row */
.actions-row {
  padding: 0 40px 8px;
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--color-background);
}

.btn-play-big {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--album-theme-color) 0%, var(--album-theme-dark) 100%);
  border: none;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 8px 24px var(--album-theme-shadow);
}

.btn-play-big :deep(svg) {
  width: 24px;
  height: 24px;
  display: block;
}

.btn-play-big:hover {
  transform: scale(1.06);
  box-shadow: 0 8px 32px var(--album-theme-shadow);
}

.btn-play-big:active {
  transform: scale(0.98);
}

.btn-shuffle,
.btn-repeat {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: transparent;
  border: 1px solid var(--color-text-secondary);
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-shuffle :deep(svg),
.btn-repeat :deep(svg) {
  width: 20px;
  height: 20px;
  display: block;
}

.btn-shuffle:hover,
.btn-repeat:hover {
  border-color: var(--color-text);
  color: var(--color-text);
  transform: scale(1.04);
}

.btn-shuffle.is-active,
.btn-repeat.is-active {
  background: var(--album-theme-color);
  border-color: var(--album-theme-color);
  color: white;
}

/* Track Table */
.track-table {
  padding: 0 24px 24px;
  flex: 1;
}

.track-table__header {
  display: grid;
  grid-template-columns: 48px 1fr 80px;
  gap: 16px;
  padding: 8px 16px;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.track-table__body {
  display: flex;
  flex-direction: column;
}

.track-table__row {
  display: grid;
  grid-template-columns: 48px 1fr 80px;
  gap: 16px;
  padding: 8px 16px;
  border-radius: 4px;
  background: transparent;
  color: var(--color-text);
  transition: background 0.2s ease;
  align-items: center;
  cursor: pointer;
}

.track-table__row:hover,
.track-table__row.is-selected {
  background: rgba(255, 255, 255, 0.1);
}

.track-table__row.is-playing:not(:hover):not(.is-selected) {
  background: transparent;
}

.track-table__row.is-playing .track-table__col--index {
  color: var(--album-theme-color);
}

.track-table__row.is-playing .track-table__number {
  visibility: hidden;
}

.track-table__col {
  display: flex;
  align-items: center;
  min-width: 0;
}

.track-table__col--index {
  justify-content: center;
  color: var(--color-text-secondary);
  font-size: 14px;
}

.track-table__number {
  font-variant-numeric: tabular-nums;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.track-table__animated-bars {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
}

.track-table__play-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.15s ease;
}

.track-table__play-btn:hover {
  transform: scale(1.08);
}

.track-table__row.is-playing .track-table__animated-bars,
.track-table__row.is-playing .track-table__play-btn {
  color: var(--album-theme-color);
}

.track-table__icon {
  color: inherit;
}

.track-table__col--title {
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  overflow: hidden;
}

.track-table__title-text {
  font-size: 16px;
  font-weight: 400;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
  text-align: left;
}

.track-table__title-text.is-active {
  color: var(--album-theme-color);
}

.track-table__artist {
  font-size: 14px;
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
  text-align: left;
}

.track-table__col--duration {
  justify-content: flex-end;
  color: var(--color-text-secondary);
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}

/* Responsive */
@media (max-width: 768px) {
  .actions-row {
    padding: 0 40px 8px;
    gap: 12px;
  }

  .actions-row .btn-play-big,
  .actions-row .btn-shuffle,
  .actions-row .btn-repeat {
    width: 40px;
    height: 40px;
  }

  .album-carousel {
    padding: 8px 12px;
  }

  .album-carousel__item {
    width: 188px;
    max-width: 188px;
  }

  .album-carousel__info {
    max-width: 122px;
  }

  .track-table {
    padding: 0 4px 16px;
  }

  .track-table__header {
    display: none;
  }

  .track-table__row {
    grid-template-columns: 32px 1fr 48px;
    gap: 6px;
    padding: 10px 8px;
  }
}

/* Mobile portrait: switch to stacked hero and hide label+title */
@media (max-width: 520px) {
  .album-hero {
    flex-direction: column;
    align-items: center;
    text-align: center;
    min-height: auto;
    padding: 16px;
  }

  .album-hero__cover-wrapper {
    width: 192px;
    height: 192px;
  }

  .album-hero__label,
  .album-hero__title {
    display: none;
  }

  .album-hero__meta {
    justify-content: center;
  }
}

@keyframes album-hero-marquee {
  0% {
    transform: translateX(0);
  }
  8% {
    transform: translateX(0);
  }
  70% {
    transform: translateX(calc(-1 * var(--hero-marquee-distance, 0px)));
  }
  86% {
    transform: translateX(calc(-1 * var(--hero-marquee-distance, 0px)));
  }
  86.01% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(0);
  }
}

.skeleton-loader {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.03);
}

.skeleton-pulse {
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.04) 0%,
    rgba(255, 255, 255, 0.09) 50%,
    rgba(255, 255, 255, 0.04) 100%
  );
  background-size: 200% 100%;
  animation: skeleton-loading 1.4s ease-in-out infinite;
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* Lyrics View */
.lyrics-view {
  flex: 1;
  overflow-y: auto;
  padding: 5px;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.lyrics-view__close {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.lyrics-view__close:hover {
  color: var(--color-text);
  background: rgba(255, 255, 255, 0.08);
  transform: scale(1.06);
}

:deep(.lyrics-view__close-icon svg) {
  width: 18px;
  height: 18px;
  display: block;
}

.lyrics-loading,
.lyrics-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: var(--color-text-secondary);
  font-size: 16px;
}
</style>
