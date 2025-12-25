<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

interface Track {
  id: number | string
  title: string
  artist: string
  album?: string
  cover?: string // Optional: Track cover art
  fallbackCover?: string // Optional: Album/fallback cover art
  url: string
  duration?: string // Display string like "2:30"
}

const props = withDefaults(
  defineProps<{
    tracks?: Track[]
    hidePlaylistCovers?: boolean
  }>(),
  {
    tracks: () => [],
    hidePlaylistCovers: true,
  }
)

// State
const isPlaying = ref(false)
const currentTrackIndex = ref(0)
const currentTime = ref(0)
const duration = ref(0)
const isShuffle = ref(false)
const repeatMode = ref<'off' | 'all' | 'one'>('off')
const isPlaylistOpen = ref(true)
const volume = ref(1)
const previousVolume = ref(1)
const showVolume = ref(false)
const audioRef = ref<HTMLAudioElement | null>(null)

const emit = defineEmits<{
  (e: 'back'): void
}>()

const defaultTracks: Track[] = [
  {
    id: 0,
    title: 'Intro',
    artist: 'Frisches',
    album: 'Tales From The Cellar',
    fallbackCover: '../assets/private/audio/TalesFromTheCellar/Cover.png',
    url: new URL(
      '../assets/private/audio/TalesFromTheCellar/00 - Intro - Mastered.mp3',
      import.meta.url
    ).href,
    duration: '0:45',
  },
  {
    id: 1,
    title: 'Misled',
    artist: 'Frisches',
    album: 'Tales From The Cellar',
    fallbackCover: '../assets/private/audio/TalesFromTheCellar/Cover.png',
    url: new URL(
      '../assets/private/audio/TalesFromTheCellar/01 - Misled - Mastered.mp3',
      import.meta.url
    ).href,
    duration: '3:12',
  },
  {
    id: 2,
    title: 'TOJD',
    artist: 'Frisches',
    album: 'Tales From The Cellar',
    fallbackCover: '../assets/private/audio/TalesFromTheCellar/Cover.png',
    url: new URL(
      '../assets/private/audio/TalesFromTheCellar/02 - TOJD - Mastered.mp3',
      import.meta.url
    ).href,
    duration: '2:58',
  },
  {
    id: 3,
    title: 'Etiquette',
    artist: 'Frisches',
    album: 'Tales From The Cellar',
    fallbackCover: '../assets/private/audio/TalesFromTheCellar/Cover.png',
    url: new URL(
      '../assets/private/audio/TalesFromTheCellar/03 - Etiquette - Mastered.mp3',
      import.meta.url
    ).href,
    duration: '3:05',
  },
  {
    id: 4,
    title: 'Mr Red Jacket',
    artist: 'Frisches',
    album: 'Tales From The Cellar',
    fallbackCover: '../assets/private/audio/TalesFromTheCellar/Cover.png',
    url: new URL(
      '../assets/private/audio/TalesFromTheCellar/04 - Mr Red Jacket - Mastered.mp3',
      import.meta.url
    ).href,
    duration: '3:30',
  },
  {
    id: 5,
    title: 'Witch Hunting',
    artist: 'Frisches',
    album: 'Tales From The Cellar',
    fallbackCover: '../assets/private/audio/TalesFromTheCellar/Cover.png',
    url: new URL(
      '../assets/private/audio/TalesFromTheCellar/05 - Witch Hunting - Mastered.mp3',
      import.meta.url
    ).href,
    duration: '3:45',
  },
  {
    id: 6,
    title: 'Suits',
    artist: 'Frisches',
    album: 'Tales From The Cellar',
    fallbackCover: '../assets/private/audio/TalesFromTheCellar/Cover.png',
    url: new URL(
      '../assets/private/audio/TalesFromTheCellar/06 - Suits - Mastered.mp3',
      import.meta.url
    ).href,
    duration: '3:15',
  },
  {
    id: 7,
    title: 'Ordinary Suspects',
    artist: 'Frisches',
    album: 'Tales From The Cellar',
    fallbackCover: '../assets/private/audio/TalesFromTheCellar/Cover.png',
    url: new URL(
      '../assets/private/audio/TalesFromTheCellar/07 - Ordinary Suspects - Mastered.mp3',
      import.meta.url
    ).href,
    duration: '3:20',
  },
  {
    id: 8,
    title: 'Solitude Etude',
    artist: 'Frisches',
    album: 'Tales From The Cellar',
    fallbackCover: '../assets/private/audio/TalesFromTheCellar/Cover.png',
    url: new URL(
      '../assets/private/audio/TalesFromTheCellar/08 - Solitude Etude - Mastered.mp3',
      import.meta.url
    ).href,
    duration: '2:50',
  },
]

const playlist = computed(() => (props.tracks.length > 0 ? props.tracks : defaultTracks))

const getCoverImage = (track: Track): string => {
  // Return only the track-specific cover
  return track.cover || ''
}

const getHeaderCover = (track: Track): string => {
  // Use track cover if available, otherwise fall back to album cover
  if (track.cover) return track.cover
  if (track.fallbackCover) return track.fallbackCover
  return ''
}

const getDisplayIndex = (track: Track): string => {
  const id = typeof track.id === 'string' ? parseInt(track.id) : track.id
  return String(id).padStart(2, '0')
}

const currentTrack = computed<Track>(() => {
  const track = playlist.value[currentTrackIndex.value]
  if (track) return track
  return (
    playlist.value[0] || {
      id: -1,
      title: 'No Track',
      artist: 'Unknown',
      url: '',
      duration: '0:00',
    }
  )
})

// Formatting
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Audio Controls
const togglePlay = () => {
  if (!audioRef.value) return
  if (isPlaying.value) {
    audioRef.value.pause()
  } else {
    audioRef.value.play()
  }
  isPlaying.value = !isPlaying.value
}

const nextTrack = () => {
  if (isShuffle.value) {
    currentTrackIndex.value = Math.floor(Math.random() * playlist.value.length)
  } else {
    currentTrackIndex.value = (currentTrackIndex.value + 1) % playlist.value.length
  }
  isPlaying.value = true // Auto play next
}

const prevTrack = () => {
  if (currentTime.value > 3) {
    if (audioRef.value) audioRef.value.currentTime = 0
    return
  }
  currentTrackIndex.value =
    (currentTrackIndex.value - 1 + playlist.value.length) % playlist.value.length
  isPlaying.value = true
}

const selectTrack = (index: number) => {
  currentTrackIndex.value = index
  isPlaying.value = true
}

const seek = (e: Event) => {
  const target = e.target as HTMLInputElement
  const time = parseFloat(target.value)
  if (audioRef.value) {
    audioRef.value.currentTime = time
    currentTime.value = time
  }
}

const onTimeUpdate = () => {
  if (audioRef.value) {
    currentTime.value = audioRef.value.currentTime
  }
}

const onLoadedMetadata = () => {
  if (audioRef.value) {
    duration.value = audioRef.value.duration
  }
}

const onEnded = () => {
  if (repeatMode.value === 'one') {
    if (audioRef.value) {
      audioRef.value.currentTime = 0
      audioRef.value.play()
    }
  } else {
    nextTrack()
  }
}

const toggleMute = () => {
  if (volume.value > 0) {
    previousVolume.value = volume.value
    volume.value = 0
  } else {
    volume.value = previousVolume.value || 1
  }
}

// Watchers
watch(currentTrackIndex, () => {
  if (audioRef.value) {
    audioRef.value.src = currentTrack.value.url
    if (isPlaying.value) {
      // Wait for DOM update
      setTimeout(() => audioRef.value?.play(), 0)
    }
  }
})

watch(volume, (newVol) => {
  if (audioRef.value) {
    audioRef.value.volume = newVol
  }
})

onMounted(() => {
  if (audioRef.value) {
    audioRef.value.volume = volume.value
  }
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('back')
  }
}
</script>

<template>
  <div class="audio-player" :class="{ 'is-playlist-open': isPlaylistOpen }">
    <!-- Main Player View -->
    <div class="player-main">
      <!-- Header Section: Transitions between Large and Compact -->
      <div class="player-header">
        <div class="artwork-wrapper">
          <img
            v-if="getHeaderCover(currentTrack)"
            :src="getHeaderCover(currentTrack)"
            :alt="currentTrack.title"
            class="artwork"
          />
          <div v-else class="artwork-placeholder">
            <span class="track-index">{{ getDisplayIndex(currentTrack) }}</span>
          </div>
        </div>

        <div class="header-info">
          <h2 class="title">{{ currentTrack.title }}</h2>
          <p class="artist">{{ currentTrack.artist }}</p>
        </div>
      </div>

      <div class="progress-container">
        <span class="time current">{{ formatTime(currentTime) }}</span>
        <input
          type="range"
          min="0"
          :max="duration || 100"
          :value="currentTime"
          @input="seek"
          class="progress-bar"
        />
        <span class="time total">{{ formatTime(duration) }}</span>
      </div>

      <div class="controls-layout">
        <!-- Secondary Left -->
        <div class="controls-group left">
          <button
            class="btn-icon small"
            :class="{ active: isShuffle }"
            @click="isShuffle = !isShuffle"
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
              <polyline points="16 3 21 3 21 8"></polyline>
              <line x1="4" y1="20" x2="21" y2="3"></line>
              <polyline points="21 16 21 21 16 21"></polyline>
              <line x1="15" y1="15" x2="21" y2="21"></line>
              <line x1="4" y1="4" x2="9" y2="9"></line>
            </svg>
          </button>

          <button
            class="btn-icon small"
            :class="{ active: repeatMode !== 'off' }"
            @click="
              repeatMode = repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off'
            "
          >
            <svg
              v-if="repeatMode === 'one'"
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
              <polyline points="17 1 21 5 17 9"></polyline>
              <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
              <polyline points="7 23 3 19 7 15"></polyline>
              <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
              <text x="10" y="15" font-size="8" fill="currentColor" font-weight="bold">1</text>
            </svg>
            <svg
              v-else
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
              <polyline points="17 1 21 5 17 9"></polyline>
              <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
              <polyline points="7 23 3 19 7 15"></polyline>
              <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
            </svg>
          </button>
        </div>

        <!-- Main Controls -->
        <div class="controls-main">
          <button class="btn-icon" @click="prevTrack">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M11 19V5l-7 7 7 7zm9 0V5l-7 7 7 7z" />
            </svg>
          </button>

          <button class="btn-icon btn-play" @click="togglePlay">
            <svg
              v-if="!isPlaying"
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          </button>

          <button class="btn-icon" @click="nextTrack">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M4 19V5l7 7-7 7zm9 0V5l7 7-7 7z" />
            </svg>
          </button>
        </div>

        <!-- Secondary Right -->
        <div class="controls-group right">
          <div
            class="volume-control"
            @mouseenter="showVolume = true"
            @mouseleave="showVolume = false"
          >
            <button class="btn-icon small" @click="toggleMute">
              <svg
                v-if="volume > 0.5"
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
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
              </svg>
              <svg
                v-else-if="volume > 0"
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
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
              </svg>
              <svg
                v-else
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
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <line x1="23" y1="9" x2="17" y2="15"></line>
                <line x1="17" y1="9" x2="23" y2="15"></line>
              </svg>
            </button>
            <transition name="fade">
              <div v-if="showVolume" class="volume-popup">
                <div class="slider-wrapper">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    v-model.number="volume"
                    class="volume-slider vertical"
                  />
                </div>
              </div>
            </transition>
          </div>

          <button class="btn-icon small" @click="isPlaylistOpen = !isPlaylistOpen">
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
              <line x1="8" y1="6" x2="21" y2="6"></line>
              <line x1="8" y1="12" x2="21" y2="12"></line>
              <line x1="8" y1="18" x2="21" y2="18"></line>
              <line x1="3" y1="6" x2="3.01" y2="6"></line>
              <line x1="3" y1="12" x2="3.01" y2="12"></line>
              <line x1="3" y1="18" x2="3.01" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Playlist View -->
    <div class="playlist-drawer">
      <div class="playlist-content">
        <div
          v-for="(track, index) in playlist"
          :key="track.id"
          class="playlist-item"
          :class="{ active: index === currentTrackIndex }"
          @click="selectTrack(index)"
        >
          <div class="thumb-container">
            <img
              v-if="!hidePlaylistCovers && getCoverImage(track)"
              :src="getCoverImage(track)"
              class="thumb"
            />
            <div v-if="!hidePlaylistCovers && !getCoverImage(track)" class="thumb-placeholder">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M4.93 4.93l14.14 14.14"></path>
              </svg>
            </div>
            <div v-if="!hidePlaylistCovers" class="play-overlay">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
          <div class="info">
            <div class="track-title" :class="{ active: index === currentTrackIndex }">
              <svg
                v-if="index === currentTrackIndex && isPlaying"
                class="visualizer"
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="14"
                viewBox="0 0 16 14"
                fill="currentColor"
              >
                <rect x="2" y="4" width="2" height="10" rx="1">
                  <animate
                    attributeName="height"
                    values="10;6;10"
                    dur="0.5s"
                    repeatCount="indefinite"
                  />
                  <animate attributeName="y" values="4;7;4" dur="0.5s" repeatCount="indefinite" />
                </rect>
                <rect x="7" y="2" width="2" height="12" rx="1">
                  <animate
                    attributeName="height"
                    values="12;8;12"
                    dur="0.7s"
                    repeatCount="indefinite"
                  />
                  <animate attributeName="y" values="2;5;2" dur="0.7s" repeatCount="indefinite" />
                </rect>
                <rect x="12" y="5" width="2" height="9" rx="1">
                  <animate
                    attributeName="height"
                    values="9;5;9"
                    dur="1.1s"
                    repeatCount="indefinite"
                  />
                  <animate attributeName="y" values="5;8;5" dur="1.1s" repeatCount="indefinite" />
                </rect>
              </svg>
              {{ track.title }}
            </div>
            <div class="track-artist">{{ track.artist }}</div>
          </div>
          <div class="duration">{{ track.duration }}</div>
        </div>
      </div>
    </div>

    <audio
      ref="audioRef"
      :src="currentTrack.url"
      @timeupdate="onTimeUpdate"
      @loadedmetadata="onLoadedMetadata"
      @ended="onEnded"
    ></audio>
  </div>
</template>

<style scoped>
.audio-player {
  width: 100%;
  max-width: 320px;
  background: var(--color-background, #000);
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  font-family: 'Inter', sans-serif;
  color: var(--color-text, #fff);
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
}

.player-main {
  padding: 20px;
  background: var(--color-background, #000);
  position: relative;
  z-index: 2;
}

/* Header & Artwork Transitions */
.player-header {
  display: flex;
  flex-direction: column;
  align-items: flex-start; /* Left align */
  text-align: left; /* Left align */
  margin-bottom: 24px;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.artwork-wrapper {
  width: 180px;
  height: 180px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
  margin-bottom: 20px;
  align-self: center; /* Keep artwork centered in large view */
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.audio-player:not(.is-playlist-open) .artwork-wrapper {
  width: 100%;
  height: 100%;
  margin-bottom: 24px;
  border-radius: 16px;
}

.artwork {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.artwork-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #333 0%, #222 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
}

.track-index {
  font-size: 48px;
  font-weight: 700;
  color: var(--color-accent, #d4af37);
  opacity: 0.6;
}

.header-info {
  width: 100%;
  transition: all 0.4s ease;
}

.title {
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 4px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--color-accent, #d4af37);
}

.artist {
  font-size: 14px;
  color: var(--color-text-secondary, #888);
  margin: 0;
}

/* Compact State (Playlist Open) */
.audio-player.is-playlist-open .player-header {
  flex-direction: row;
  text-align: left;
  margin-bottom: 16px;
  align-items: center;
}

.audio-player.is-playlist-open .artwork-wrapper {
  width: 48px;
  height: 48px;
  margin-bottom: 0;
  margin-right: 12px;
  border-radius: 6px;
  box-shadow: none;
  align-self: auto; /* Reset alignment */
}

.audio-player.is-playlist-open .title {
  font-size: 15px;
}

.audio-player.is-playlist-open .artist {
  font-size: 12px;
}

/* Progress Bar */
.progress-container {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.time {
  font-size: 11px;
  color: var(--color-text-secondary, #888);
  font-variant-numeric: tabular-nums;
  width: 35px;
}

.time.total {
  text-align: right;
}

.progress-bar {
  flex: 1;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: #333;
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.progress-bar::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  background: var(--color-accent, #d4af37);
  border-radius: 50%;
  transition: transform 0.1s;
}

.progress-bar::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

/* Controls Layout System */
.controls-layout {
  display: flex;
  flex-direction: row; /* Always row */
  align-items: center;
  justify-content: space-between;
  gap: 2px;
  transition: all 0.3s ease;
  padding: 0; /* Remove padding to maximize space */
}

.controls-main {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px; /* Reduced gap */
  order: 2; /* Center */
  flex-shrink: 0; /* Prevent shrinking */
}

.controls-group {
  display: flex;
  align-items: center;
  gap: 2px;
}

.controls-group.left {
  justify-content: flex-start;
  order: 1; /* Left */
}

.controls-group.right {
  justify-content: flex-end;
  order: 3; /* Right */
}

/* When Playlist is Open (Streamlined Layout) */
.audio-player.is-playlist-open .controls-main {
  gap: 8px; /* Even tighter in compact mode */
}

/* Adjust button sizes in compact mode */
.audio-player.is-playlist-open .btn-play {
  width: 40px;
  height: 40px;
  box-shadow: none;
}

.audio-player.is-playlist-open .btn-play svg {
  width: 24px;
  height: 24px;
}

.audio-player.is-playlist-open .btn-icon {
  padding: 6px;
}

/* Common Button Styles */
.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text, #fff);
  padding: 6px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    background 0.2s,
    color 0.2s;
}

.btn-icon:hover {
  background: rgba(255, 255, 255, 0.1);
}

.btn-play {
  width: 56px;
  height: 56px;
  background: var(--color-accent, #d4af37);
  color: #000; /* Contrast for play button */
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
}

.btn-play:hover {
  background: #fff;
  transform: scale(1.05);
}

.btn-icon.small {
  padding: 4px;
  color: var(--color-text-secondary, #888);
}

.btn-icon.small:hover {
  color: var(--color-text, #fff);
  background: rgba(255, 255, 255, 0.1);
}

.btn-icon.small.active {
  color: var(--color-accent, #d4af37);
  background: rgba(212, 175, 55, 0.1);
}

/* Volume Control - Refactored */
.volume-control {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.volume-popup {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: #222;
  padding: 12px 8px;
  border-radius: 20px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
  margin-bottom: 0px;
  z-index: 100;
  pointer-events: auto;
}

.slider-wrapper {
  width: 7px;
  height: 90px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Vertical Slider using Rotation Trick */
.volume-slider.vertical {
  width: 90px; /* Length of the slider */
  height: 7px; /* Hit area height */
  transform: rotate(-90deg);
  transform-origin: center;
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  cursor: pointer;
  margin: 0;
}

/* Track styling for rotated slider */
.volume-slider.vertical::-webkit-slider-runnable-track {
  width: 100%;
  height: 4px;
  background: #444;
  border-radius: 2px;
}

.volume-slider.vertical::-webkit-slider-thumb {
  -webkit-appearance: none;
  height: 14px;
  width: 14px;
  border-radius: 50%;
  background: var(--color-accent, #d4af37);
  margin-top: -5px; /* Center thumb on track */
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}

/* Playlist Drawer Animation */
.playlist-drawer {
  background: #111;
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  border-top: 1px solid #222;
}

.audio-player.is-playlist-open .playlist-drawer {
  max-height: 300px; /* Adjust based on desired visible items */
  overflow-y: auto;
}

/* Scrollbar styling */
.playlist-drawer::-webkit-scrollbar {
  width: 4px;
}
.playlist-drawer::-webkit-scrollbar-track {
  background: transparent;
}
.playlist-drawer::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 2px;
}

.playlist-content {
  padding: 10px 0;
}

.playlist-item {
  display: flex;
  align-items: center;
  padding: 8px 20px;
  cursor: pointer;
  transition: background 0.2s;
}

.playlist-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.playlist-item.active {
  background: rgba(212, 175, 55, 0.1);
  border-left: 3px solid var(--color-accent, #d4af37);
}

.thumb-container {
  position: relative;
  width: 40px;
  height: 40px;
  margin-right: 12px;
  flex-shrink: 0;
}

.thumb-container:empty {
  display: none;
  width: 0;
  margin-right: 0;
}

.thumb {
  width: 100%;
  height: 100%;
  border-radius: 4px;
  object-fit: cover;
}

.thumb-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #333 0%, #222 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: var(--color-text-secondary, #888);
}

.thumb-placeholder svg {
  opacity: 0.5;
}

.play-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  opacity: 0;
  transition: opacity 0.2s;
  border-radius: 4px;
}

.playlist-item:hover .play-overlay,
.playlist-item.active .play-overlay {
  opacity: 1;
}

.info {
  flex: 1;
  min-width: 0;
  text-align: left; /* Ensure left alignment */
}

.track-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--color-text, #fff);
  display: flex;
  align-items: center;
  gap: 6px;
}

.track-title.active {
  color: var(--color-accent, #d4af37);
}

.visualizer {
  flex-shrink: 0;
  width: 16px;
  height: 14px;
}

.track-artist {
  font-size: 12px;
  color: var(--color-text-secondary, #888);
}

.duration {
  font-size: 12px;
  color: var(--color-text-secondary, #888);
  margin-left: 10px;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(10px);
}
</style>
