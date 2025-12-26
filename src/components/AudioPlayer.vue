<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Track } from '@/data/tracks'
import { useAudioStore } from '@/stores/audio'
import {
  albums,
  getAlbumById,
  getAlbumTracks,
  getAlbumTotalDurationSeconds,
  formatSecondsAsAlbumDuration,
} from '@/data/albums'

const audioStore = useAudioStore()

// Current selected album
const selectedAlbumId = ref('tftc')
const isAlbumDrawerExpanded = ref(false)
const selectedTrackId = ref<string | null>(null)
const hoveredTrackId = ref<string | null>(null)

const selectedAlbum = computed(() => getAlbumById(selectedAlbumId.value))
const albumTracks = computed(() => getAlbumTracks(selectedAlbumId.value))
const albumDurationFormatted = computed(() =>
  formatSecondsAsAlbumDuration(getAlbumTotalDurationSeconds(selectedAlbumId.value))
)
const albumSongCount = computed(() => albumTracks.value.length)
const selectedArtist = computed(() => selectedAlbum.value?.artist ?? 'Frisches')

const bandLogoUrl = new URL(
  '../assets/private/image/Frisches_Logo-Mood-3-Round.png',
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
  isAlbumDrawerExpanded.value = false
}

function toggleAlbumDrawer() {
  isAlbumDrawerExpanded.value = !isAlbumDrawerExpanded.value
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
  if (isCurrentTrack(track)) {
    audioStore.togglePlayPause()
    return
  }
  audioStore.startFromMusic(track.trackId)
}

function selectTrack(track: Track) {
  selectedTrackId.value = track.trackId
}

function formatDuration(duration?: string): string {
  return duration ?? '0:00'
}

function isCurrentTrack(track: Track): boolean {
  return currentTrack.value?.trackId === track.trackId
}
</script>

<template>
  <div class="spotify-layout" data-testid="audio-player">
    <!-- Left Sidebar: Album Rail -->
    <aside class="album-rail" :class="{ 'is-expanded': isAlbumDrawerExpanded }">
      <button
        class="album-rail__toggle"
        @click="toggleAlbumDrawer"
        :title="isAlbumDrawerExpanded ? 'Collapse library' : 'Expand library'"
        :aria-label="isAlbumDrawerExpanded ? 'Collapse albums' : 'Expand albums'"
        data-testid="album-rail-toggle"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="9" y1="3" x2="9" y2="21" />
        </svg>
      </button>

      <div class="album-rail__list">
        <button
          v-for="album in albums"
          :key="album.albumId"
          class="album-rail__item"
          :class="{ 'is-active': album.albumId === selectedAlbumId }"
          :title="`${album.title} • ${album.trackIds.length} songs`"
          @click="selectAlbum(album.albumId)"
          data-testid="album-rail-item"
        >
          <img :src="album.coverUrl" class="album-rail__cover" width="48" height="48" />
          <div v-if="isAlbumDrawerExpanded" class="album-rail__info">
            <div class="album-rail__title">{{ album.title }}</div>
            <div class="album-rail__meta">{{ album.trackIds.length }} songs</div>
          </div>
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <!-- Hero Header with Album Info -->
      <header class="album-hero">
        <div class="album-hero__cover-wrapper">
          <img
            v-if="selectedAlbum?.coverUrl"
            :src="selectedAlbum.coverUrl"
            :alt="selectedAlbum.title"
            class="album-hero__cover"
            data-testid="album-hero-cover"
          />
        </div>

        <div class="album-hero__info">
          <div class="album-hero__label">Album</div>
          <h1 class="album-hero__title" data-testid="album-title">{{ selectedAlbum?.title }}</h1>
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
      <div class="actions-row">
        <button
          class="btn-play-big"
          @click="playAlbum"
          :title="isPlaying ? 'Pause' : 'Play'"
          :aria-label="isPlaying ? 'Pause' : 'Play album'"
          data-testid="btn-play-album"
        >
          <svg
            v-if="!isPlaying"
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
        </button>

        <button
          class="btn-shuffle"
          :class="{ 'is-active': isShuffle }"
          @click="toggleShuffle"
          :title="isShuffle ? 'Disable shuffle' : 'Enable shuffle'"
          :aria-label="isShuffle ? 'Disable shuffle' : 'Enable shuffle'"
          data-testid="btn-shuffle"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
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
      </div>

      <!-- Track Table -->
      <div class="track-table">
        <div class="track-table__header">
          <div class="track-table__col track-table__col--index">#</div>
          <div class="track-table__col track-table__col--title">Title</div>
          <div class="track-table__col track-table__col--duration">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
        </div>

        <div class="track-table__body">
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
            @pointerleave="hoveredTrackId = null"
          >
            <div class="track-table__col track-table__col--index">
              <button
                v-if="hoveredTrackId === track.trackId && isCurrentTrack(track) && isPlaying"
                class="track-table__play-btn"
                type="button"
                title="Pause"
                aria-label="Pause"
                :data-testid="`track-pause-${index}`"
                @click.stop="audioStore.togglePlayPause()"
              >
                <svg
                  class="track-table__icon"
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              </button>

              <button
                v-else-if="hoveredTrackId === track.trackId"
                class="track-table__play-btn"
                type="button"
                :title="(isCurrentTrack(track) && !isPlaying ? 'Resume ' : 'Play ') + track.title"
                :aria-label="
                  (isCurrentTrack(track) && !isPlaying ? 'Resume ' : 'Play ') + track.title
                "
                :data-testid="`track-play-${index}`"
                @click.stop="playOrToggle(track)"
              >
                <svg
                  class="track-table__icon"
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>

              <!-- Animated bars when playing (not hovered) -->
              <div
                v-else-if="isCurrentTrack(track) && isPlaying"
                class="track-table__animated-bars"
                aria-hidden="true"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="var(--color-neon-cyan)"
                >
                  <rect x="4" y="8" width="3" height="8">
                    <animate
                      attributeName="height"
                      values="8;16;8"
                      dur="0.8s"
                      repeatCount="indefinite"
                      begin="0s"
                    />
                    <animate
                      attributeName="y"
                      values="8;4;8"
                      dur="0.8s"
                      repeatCount="indefinite"
                      begin="0s"
                    />
                  </rect>
                  <rect x="10" y="6" width="3" height="12">
                    <animate
                      attributeName="height"
                      values="12;18;12"
                      dur="0.8s"
                      repeatCount="indefinite"
                      begin="0.2s"
                    />
                    <animate
                      attributeName="y"
                      values="6;3;6"
                      dur="0.8s"
                      repeatCount="indefinite"
                      begin="0.2s"
                    />
                  </rect>
                  <rect x="16" y="4" width="3" height="16">
                    <animate
                      attributeName="height"
                      values="16;12;16"
                      dur="0.8s"
                      repeatCount="indefinite"
                      begin="0.4s"
                    />
                    <animate
                      attributeName="y"
                      values="4;6;4"
                      dur="0.8s"
                      repeatCount="indefinite"
                      begin="0.4s"
                    />
                  </rect>
                </svg>
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
    </main>
  </div>
</template>

<style scoped>
.spotify-layout {
  position: absolute;
  inset: 0;
  display: flex;
  width: 100%;
  height: 100%;
  background: var(--color-background);
  color: var(--color-text);
  overflow: hidden;
}

/* Album Rail */
.album-rail {
  width: 72px;
  background: var(--color-surface);
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  overflow-y: auto;
  flex-shrink: 0;
  transition: width 0.3s ease;
  border-right: 1px solid var(--color-border);
}

.album-rail.is-expanded {
  width: 240px;
}

.album-rail__toggle {
  width: 100%;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.album-rail__toggle:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--color-text);
}

.album-rail__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.album-rail__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s ease;
  color: var(--color-text);
  text-align: left;
  min-height: 56px;
}

.album-rail__item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.album-rail__item.is-active {
  background: rgba(255, 255, 255, 0.15);
}

.album-rail__cover {
  display: block;
  width: 48px;
  height: 48px;
  min-width: 48px;
  min-height: 48px;
  max-width: 48px;
  max-height: 48px;
  border-radius: 4px;
  object-fit: contain;
  object-position: center;
  flex-shrink: 0;
  aspect-ratio: 1 / 1;
}

.album-rail__info {
  min-width: 0;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.album-rail.is-expanded .album-rail__info {
  opacity: 1;
}

.album-rail__title {
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.album-rail__meta {
  font-size: 12px;
  color: var(--color-text-secondary);
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
  padding: 24px;
  display: flex;
  gap: 24px;
  align-items: flex-end;
  min-height: 340px;
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
  padding-bottom: 12px;
}

.album-hero__label {
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.album-hero__title {
  font-size: 72px;
  font-weight: 900;
  line-height: 1;
  margin: 0;
  text-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
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
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 24px;
  background: var(--color-background);
}

.btn-play-big {
  width: 56px;
  height: 56px;
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

.btn-play-big:hover {
  transform: scale(1.06);
  box-shadow: 0 8px 32px rgba(139, 79, 125, 0.6);
}

.btn-play-big:active {
  transform: scale(0.98);
}

.btn-shuffle {
  width: 40px;
  height: 40px;
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

.track-table__row.is-playing {
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
  .album-rail {
    width: 64px;
  }

  .album-rail.is-expanded {
    width: 200px;
  }

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

  .album-hero__title {
    font-size: 48px;
  }

  .track-table {
    padding: 0 16px 16px;
  }

  .track-table__header {
    display: none;
  }

  .track-table__row {
    grid-template-columns: 40px 1fr 60px;
    gap: 12px;
    padding: 12px 8px;
  }
}

/* Tooltip styling */
[title]:not([title='']) {
  position: relative;
}

[title]:not([title='']):hover::after {
  content: attr(title);
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
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  animation: tooltip-fade-in 0.15s ease-out;
  backdrop-filter: blur(8px);
}

[title]:not([title='']):hover::before {
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
</style>
