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
import LyricsDisplay from './LyricsDisplay.vue'
import closeSvg from '@/assets/icons/close.svg?raw'
import playSvg from '@/assets/icons/play.svg?raw'
import pauseSvg from '@/assets/icons/pause.svg?raw'
import shuffleSvg from '@/assets/icons/shuffle.svg?raw'
import clockSvg from '@/assets/icons/clock.svg?raw'
import playingBarsSvg from '@/assets/icons/playing-bars.svg?raw'

const audioStore = useAudioStore()

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
const selectedArtist = computed(() => selectedAlbum.value?.artist ?? 'Frisches')

const heroTitleEl = ref<HTMLElement | null>(null)
const heroTitleTextEl = ref<HTMLElement | null>(null)
const isHeroTitleMarquee = ref(false)
let rafHeroTitleFitId = 0
let heroTitleResizeObserver: ResizeObserver | null = null
let windowResizeHandler: (() => void) | null = null

const HERO_TITLE_MAX_PX = 72
const HERO_TITLE_MIN_PX = 48

const bandLogoUrl = new URL(
  '../assets/private/images/Frisches_Logo-Mood-3-Round.png',
  import.meta.url
).href

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
  const textEl = heroTitleTextEl.value
  if (!el || !textEl) return

  // If hidden (e.g., stacked mobile mode), do nothing.
  const available = Math.floor(el.getBoundingClientRect().width)
  if (available <= 1) return

  isHeroTitleMarquee.value = false

  const setSize = (px: number) => {
    el.style.setProperty('--hero-title-size', `${px}px`)
    // Force layout so subsequent measurements are accurate.
    void el.offsetWidth
  }

  // Fast path: max size fits.
  setSize(HERO_TITLE_MAX_PX)
  if (textEl.scrollWidth <= available + 1) {
    el.style.setProperty('--hero-marquee-distance', `0px`)
    return
  }

  // Binary search for best fit.
  let low = HERO_TITLE_MIN_PX
  let high = HERO_TITLE_MAX_PX
  for (let i = 0; i < 10; i++) {
    const mid = Math.floor((low + high) / 2)
    setSize(mid)
    if (textEl.scrollWidth <= available + 1) {
      low = mid
    } else {
      high = mid - 1
    }
  }
  setSize(low)

  // If we still overflow at min size, enable marquee.
  if (textEl.scrollWidth > available + 1) {
    setSize(HERO_TITLE_MIN_PX)
    isHeroTitleMarquee.value = true
    // After toggling marquee, text width can change slightly due to subpixel rounding.
    void el.offsetWidth
    const distance = Math.max(0, textEl.scrollWidth - available)
    el.style.setProperty('--hero-marquee-distance', `${distance}px`)
  } else {
    el.style.setProperty('--hero-marquee-distance', `0px`)
  }
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
  <div class="spotify-layout" data-testid="audio-player">
    <!-- Top: Album Carousel -->
    <nav class="album-carousel" aria-label="Albums" data-testid="album-carousel">
      <div class="album-carousel__list" role="list">
        <button
          v-for="album in albums"
          :key="album.albumId"
          class="album-carousel__item"
          :class="{ 'is-active': album.albumId === selectedAlbumId }"
          :data-tooltip="`${album.title} • ${album.trackIds.length} songs`"
          :aria-label="`${album.title} (${album.trackIds.length} songs)`"
          @click="selectAlbum(album.albumId)"
          data-testid="album-carousel-item"
          role="listitem"
        >
          <img
            :src="album.coverUrl"
            :srcset="album.coverSrcset"
            sizes="48px"
            class="album-carousel__cover"
            width="48"
            height="48"
            :alt="album.title"
          />

          <div class="album-carousel__info">
            <div class="album-carousel__title">{{ album.title }}</div>
            <div class="album-carousel__meta">{{ album.trackIds.length }} songs</div>
          </div>
        </button>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="main-content">
      <!-- Hero Header with Album Info -->
      <header v-show="!audioStore.showLyrics" class="album-hero">
        <div class="album-hero__cover-wrapper">
          <img
            v-if="selectedAlbum?.coverUrl"
            :src="selectedAlbum.coverUrl"
            :srcset="selectedAlbum.coverSrcset"
            sizes="(max-width: 520px) 192px, 232px"
            :alt="selectedAlbum.title"
            class="album-hero__cover"
            data-testid="album-hero-cover"
          />
        </div>

        <div class="album-hero__info">
          <div class="album-hero__label">Album</div>
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
            <img :src="bandLogoUrl" :alt="selectedArtist" class="album-hero__artist-avatar" />
            <span class="album-hero__artist">{{ selectedAlbum?.artist }}</span>
            <span class="album-hero__dot">•</span>
            <span>{{ selectedAlbum?.year }}</span>
            <span class="album-hero__dot">•</span>
            <span>{{ albumSongCount }} songs</span>
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
          :data-tooltip="isPlaying ? 'Pause' : 'Play'"
          :aria-label="isPlaying ? 'Pause' : 'Play album'"
          data-testid="btn-play-album"
        >
          <span v-if="!isPlaying" aria-hidden="true" v-html="playSvg" />
          <span v-else aria-hidden="true" v-html="pauseSvg" />
        </button>

        <button
          class="btn-shuffle"
          :class="{ 'is-active': isShuffle }"
          @click="toggleShuffle"
          :data-tooltip="isShuffle ? 'Disable shuffle' : 'Enable shuffle'"
          :aria-label="isShuffle ? 'Disable shuffle' : 'Enable shuffle'"
          data-testid="btn-shuffle"
        >
          <span aria-hidden="true" v-html="shuffleSvg" />
        </button>
      </div>

      <!-- Track Table -->
      <div v-show="!audioStore.showLyrics" class="track-table">
        <div class="track-table__header">
          <div class="track-table__col track-table__col--index">#</div>
          <div class="track-table__col track-table__col--title">Title</div>
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
            @click="selectTrack(track)"
            @pointerenter="hoveredTrackId = track.trackId"
          >
            <div class="track-table__col track-table__col--index">
              <button
                v-if="hoveredTrackId === track.trackId && isCurrentTrack(track) && isPlaying"
                class="track-table__play-btn"
                type="button"
                data-tooltip="Pause"
                aria-label="Pause"
                :data-testid="`track-pause-${index}`"
                @click.stop="audioStore.togglePlayPause()"
              >
                <span class="track-table__icon" aria-hidden="true" v-html="pauseSvg" />
              </button>

              <button
                v-else-if="hoveredTrackId === track.trackId"
                class="track-table__play-btn"
                type="button"
                :data-tooltip="
                  (isCurrentTrack(track) && !isPlaying ? 'Resume ' : 'Play ') + track.title
                "
                :aria-label="
                  (isCurrentTrack(track) && !isPlaying ? 'Resume ' : 'Play ') + track.title
                "
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
        <div class="lyrics-view__header">
          <button
            class="lyrics-view__close"
            type="button"
            aria-label="Close lyrics"
            data-testid="lyrics-view-close"
            @click="audioStore.closeLyrics"
          >
            <span class="lyrics-view__close-icon" aria-hidden="true" v-html="closeSvg" />
          </button>
        </div>

        <LyricsDisplay
          v-if="lyricsData && !isLoadingLyrics"
          :lyricsData="lyricsData"
          :currentTime="audioStore.currentTime"
          :isPlaying="audioStore.isPlaying"
          @seek="handleLyricsSeek"
        />
        <div v-else-if="isLoadingLyrics" class="lyrics-loading">Loading lyrics...</div>
        <div v-else class="lyrics-empty">No lyrics available for this track</div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.spotify-layout {
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
  align-items: center;
  padding: 2px 2px;
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
}

.album-carousel__info {
  min-width: 0;
  max-width: 150px;
}

.album-carousel__title {
  font-size: 13px;
  font-weight: 650;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.album-carousel__meta {
  font-size: 12px;
  color: var(--color-text-secondary);
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
  background: linear-gradient(180deg, #d4711c 0%, #8b4f1a 40%, var(--color-background) 100%);
  padding: 4px 24px 8px;
  display: flex;
  gap: 24px;
  align-items: center;
  min-height: 265px;
}

.album-hero__cover-wrapper {
  width: 232px;
  height: 232px;
  flex-shrink: 0;
  box-shadow: 0 4px 60px rgba(0, 0, 0, 0.5);
}

.album-hero__cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 4px;
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
  --hero-title-min: 48px;
  --hero-title-max: 72px;
  font-size: clamp(var(--hero-title-min), var(--hero-title-size, 72px), var(--hero-title-max));
  font-weight: 900;
  line-height: 1;
  margin: 0;
  text-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: clip;
  max-width: 100%;
  width: 100%;
  text-align: left;
}

.album-hero__title-text {
  display: inline-block;
  transform: translateX(0);
  will-change: transform;
}

.album-hero__title.is-marquee {
  text-overflow: clip;
}

.album-hero__title.is-marquee .album-hero__title-text {
  animation: album-hero-marquee 12s linear infinite;
}

.album-hero__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  flex-wrap: wrap;
}

.album-hero__artist-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}

.album-hero__artist {
  font-weight: 700;
}

.album-hero__dot {
  opacity: 0.7;
}

/* Actions Row */
.actions-row {
  padding: 0 40px 8px;
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) 80px;
  column-gap: 16px;
  align-items: center;
  background: var(--color-background);
}

.actions-row .btn-play-big {
  grid-column: 1;
  justify-self: center;
}

.actions-row .btn-shuffle {
  grid-column: 2;
  justify-self: start;
}

.btn-play-big {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-secondary) 0%, var(--color-secondary-dark) 100%);
  border: none;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 8px 24px rgba(139, 79, 125, 0.4);
}

.btn-play-big :deep(svg) {
  width: 24px;
  height: 24px;
  display: block;
}

.btn-play-big:hover {
  transform: scale(1.06);
  box-shadow: 0 8px 32px rgba(139, 79, 125, 0.6);
}

.btn-play-big:active {
  transform: scale(0.98);
}

.btn-shuffle {
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

.btn-shuffle :deep(svg) {
  width: 20px;
  height: 20px;
  display: block;
}

.btn-shuffle:hover {
  border-color: var(--color-text);
  color: var(--color-text);
  transform: scale(1.04);
}

.btn-shuffle.is-active {
  background: var(--color-neon-cyan);
  border-color: var(--color-neon-cyan);
  color: var(--color-background);
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
  color: var(--color-neon-cyan);
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
  color: var(--color-neon-cyan);
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
  color: var(--color-neon-cyan);
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
    grid-template-columns: 40px minmax(0, 1fr) 60px;
    column-gap: 12px;
  }

  .actions-row .btn-play-big,
  .actions-row .btn-shuffle {
    width: 40px;
    height: 40px;
  }

  .album-carousel {
    padding: 8px 24px;
  }

  .album-carousel__item {
    width: 190px;
    max-width: 190px;
  }

  .album-carousel__info {
    max-width: 120px;
  }

  .track-table {
    padding: 0 24px 16px;
  }

  .track-table__header {
    display: none;
  }

  .track-table__row {
    grid-template-columns: 40px 1fr 60px;
    gap: 12px;
    padding: 12px 16px;
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

/* Tooltip styling */
[data-tooltip]:not([data-tooltip='']) {
  position: relative;
}

[data-tooltip]:not([data-tooltip='']):hover::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 12px;
  background: rgba(18, 18, 18, 0.95);
  color: var(--color-text);
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  border-radius: 8px;
  pointer-events: none;
  z-index: 10000;
  font-family: var(--font-family-base);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  animation: tooltip-fade-in 0.15s ease-out;
  backdrop-filter: blur(8px);
}

[data-tooltip]:not([data-tooltip='']):hover::before {
  content: '';
  position: absolute;
  bottom: calc(100% + 4px);
  left: 50%;
  transform: translateX(-50%);
  border: 4px solid transparent;
  border-top-color: rgba(18, 18, 18, 0.95);
  pointer-events: none;
  z-index: 10000;
  animation: tooltip-fade-in 0.15s ease-out;
}

@keyframes tooltip-fade-in {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

/* Lyrics View */
.lyrics-view {
  flex: 1;
  overflow-y: auto;
  padding: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.lyrics-view__header {
  width: 100%;
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}

.lyrics-view__close {
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
