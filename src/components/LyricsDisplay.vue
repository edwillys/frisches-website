<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import type { LyricsData, Line, Word } from '@/types/lyrics'

interface Props {
  lyricsData: LyricsData | null
  currentTime: number // in seconds
  isPlaying: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'seek', time: number): void
}>()

const lyricsContainer = ref<HTMLElement | null>(null)
const isSyncMode = ref(true)

const USER_INTENT_WINDOW_MS = 400
const RESYNC_DEBOUNCE_MS = 180
const SYNC_CENTER_TOLERANCE_RATIO = 0.25

let lastUserIntentAt = 0
let resyncTimer: number | null = null

function markUserIntent() {
  lastUserIntentAt = Date.now()
}

function clearResyncTimer() {
  if (resyncTimer !== null) {
    window.clearTimeout(resyncTimer)
    resyncTimer = null
  }
}

function isActiveLineInSyncWindow(): boolean {
  if (!lyricsContainer.value) return false
  if (activeLineIndex.value === -1) return false

  const activeElement = lyricsContainer.value.querySelector(
    `[data-line-index="${activeLineIndex.value}"]`
  ) as HTMLElement | null
  if (!activeElement) return false

  const containerRect = lyricsContainer.value.getBoundingClientRect()
  const activeRect = activeElement.getBoundingClientRect()

  const containerCenterY = containerRect.top + containerRect.height / 2
  const activeCenterY = activeRect.top + activeRect.height / 2
  const tolerance = containerRect.height * SYNC_CENTER_TOLERANCE_RATIO

  return Math.abs(activeCenterY - containerCenterY) <= tolerance
}

const currentTimeMs = computed(() => props.currentTime * 1000)

const activeLine = computed(() => {
  if (!props.lyricsData) return null

  const lines = props.lyricsData.lyrics
  // Before the first line starts, keep the first line "active" (Spotify-style).
  const firstLine = lines[0]
  if (firstLine && currentTimeMs.value < firstLine.startTime) {
    return firstLine
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line && currentTimeMs.value >= line.startTime && currentTimeMs.value <= line.endTime) {
      return line
    }
  }

  // If we're past the last line, return the last line
  const lastLine = lines[lines.length - 1]
  if (lines.length > 0 && lastLine && currentTimeMs.value > lastLine.endTime) {
    return lastLine
  }

  return null
})

const activeLineIndex = computed(() => {
  if (!props.lyricsData || !activeLine.value) return -1
  return props.lyricsData.lyrics.findIndex((line) => line.id === activeLine.value!.id)
})

// Index of last fully-past line, independent of whether we're currently "inside" a line.
// This prevents the "everything becomes unread" glitch when there's a timing gap between lines.
const pastLineIndex = computed(() => {
  const lines = props.lyricsData?.lyrics
  if (!lines || lines.length === 0) return -1

  let lastPast = -1
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue
    if (currentTimeMs.value > line.endTime) {
      lastPast = i
      continue
    }
    break
  }
  return lastPast
})

const anchorLineIndex = computed(() => {
  return activeLineIndex.value >= 0 ? activeLineIndex.value : pastLineIndex.value
})

function isWordActive(word: Word): boolean {
  // Strict start: when seeking exactly to a word start, don't immediately mark it as active.
  return currentTimeMs.value > word.startTime && currentTimeMs.value <= word.endTime
}

function isPastWord(word: Word): boolean {
  return currentTimeMs.value > word.endTime
}

function handleLineClick(line: Line) {
  // Seek to just before the first word so it isn't immediately highlighted.
  const firstWordStart = line.words?.[0]?.startTime ?? line.startTime
  emit('seek', firstWordStart / 1000)
}

function handleScroll() {
  if (!lyricsContainer.value) return

  // Only treat scroll as a user action if we saw a recent user intent event.
  // This avoids programmatic auto-scroll (scrollIntoView) randomly disabling sync.
  if (Date.now() - lastUserIntentAt > USER_INTENT_WINDOW_MS) return

  if (isSyncMode.value) {
    isSyncMode.value = false
  }

  // If the user scrolls and lands back on the active line, automatically re-enable.
  // Debounced so it doesn't flap during momentum scrolling.
  clearResyncTimer()
  resyncTimer = window.setTimeout(() => {
    if (!isSyncMode.value && props.isPlaying && isActiveLineInSyncWindow()) {
      syncToActiveLine()
    }
  }, RESYNC_DEBOUNCE_MS)
}

function syncToActiveLine() {
  isSyncMode.value = true
  scrollToActiveLine()
}

function scrollToActiveLine() {
  if (!lyricsContainer.value || activeLineIndex.value === -1) return

  nextTick(() => {
    const activeElement = lyricsContainer.value?.querySelector(
      `[data-line-index="${activeLineIndex.value}"]`
    )
    if (activeElement) {
      const el = activeElement as HTMLElement & { scrollIntoView?: (options?: unknown) => void }
      if (typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({
          behavior: 'auto',
          block: 'center',
        })
      }
    }
  })
}

// Watch for active line changes to auto-scroll
watch(activeLineIndex, (newIndex, oldIndex) => {
  if (newIndex === oldIndex) return

  if (isSyncMode.value) {
    scrollToActiveLine()
    return
  }

  // If the user scrolled ahead and the song caught up, automatically re-enable sync.
  if (props.isPlaying && isActiveLineInSyncWindow()) {
    syncToActiveLine()
  }
})

// Re-enable sync mode when playback starts
watch(
  () => props.isPlaying,
  (playing) => {
    if (playing && !isSyncMode.value) {
      // Don't auto-enable, let user choose
    }
  }
)

onMounted(() => {
  lyricsContainer.value?.addEventListener('scroll', handleScroll, { passive: true })

  // Track user intent separately so we can ignore programmatic auto-scroll.
  lyricsContainer.value?.addEventListener('wheel', markUserIntent, { passive: true })
  lyricsContainer.value?.addEventListener('touchstart', markUserIntent, { passive: true })
  lyricsContainer.value?.addEventListener('pointerdown', markUserIntent, { passive: true })
  lyricsContainer.value?.addEventListener('keydown', markUserIntent)
})

onUnmounted(() => {
  lyricsContainer.value?.removeEventListener('scroll', handleScroll)
  lyricsContainer.value?.removeEventListener('wheel', markUserIntent)
  lyricsContainer.value?.removeEventListener('touchstart', markUserIntent)
  lyricsContainer.value?.removeEventListener('pointerdown', markUserIntent)
  lyricsContainer.value?.removeEventListener('keydown', markUserIntent)

  clearResyncTimer()
})
</script>

<template>
  <div class="lyrics-display">
    <div ref="lyricsContainer" class="lyrics-container" :class="{ 'is-syncing': isSyncMode }">
      <div class="lyrics-content">
        <div
          v-for="(line, index) in lyricsData?.lyrics"
          :key="line.id"
          :data-line-index="index"
          class="lyrics-line"
          :class="{
            'is-active': index === activeLineIndex,
            'is-past': lyricsData && index <= pastLineIndex,
            'is-future': lyricsData && index > anchorLineIndex,
          }"
          @click="handleLineClick(line)"
        >
          <div class="lyrics-line-content">
            <span
              v-for="(word, wordIndex) in line.words"
              :key="`${line.id}-${wordIndex}`"
              class="lyrics-word"
              :class="{
                'is-active': index === activeLineIndex && isWordActive(word),
                'is-past': index === activeLineIndex && isPastWord(word),
              }"
              >{{ word.text }}</span
            >
          </div>
        </div>

        <!-- Spacer at bottom -->
        <div class="lyrics-spacer"></div>
      </div>
    </div>

    <!-- Sync button when out of sync -->
    <transition name="sync-button">
      <button
        v-if="!isSyncMode && isPlaying"
        class="sync-button"
        @click="syncToActiveLine"
        title="Sync to current lyrics"
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
          <polyline points="1 4 1 10 7 10" />
          <polyline points="23 20 23 14 17 14" />
          <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
        </svg>
        <span>Sync</span>
      </button>
    </transition>
  </div>
</template>

<style scoped>
.lyrics-display {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.lyrics-container {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
}

.lyrics-content {
  padding: 80px 24px 320px;
  max-width: 800px;
  margin: 0 auto;
}

.lyrics-line {
  margin: 24px 0;
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 12px 16px;
  border-radius: 8px;
}

.lyrics-line:hover {
  background: rgba(255, 255, 255, 0.05);
}

.lyrics-line.is-past {
  opacity: 1;
}

.lyrics-line.is-past .lyrics-line-content {
  color: var(--color-neon-cyan);
}

.lyrics-line.is-future {
  opacity: 0.5;
}

.lyrics-line.is-active {
  opacity: 1;
  background: rgba(255, 255, 255, 0.08);
}

.lyrics-line-content {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.5;
  color: var(--color-text);
  display: flex;
  flex-wrap: wrap;
  gap: 0;
}

.lyrics-word {
  position: relative;
  display: inline-block;
  margin-right: 0.3em;
  color: inherit;
}

.lyrics-line.is-active .lyrics-word {
  color: rgba(255, 255, 255, 0.5);
}

/* Past + current word are cyan (no gradient/progress effects). */
.lyrics-word.is-past,
.lyrics-word.is-active {
  color: var(--color-neon-cyan) !important;
}

.lyrics-spacer {
  height: 200px;
}

/* Sync Button */
.sync-button {
  position: absolute;
  bottom: calc(var(--mini-player-offset, 0px) + 24px);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: rgba(18, 18, 18, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  color: var(--color-text);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  z-index: 100;
}

.sync-button:hover {
  background: rgba(18, 18, 18, 1);
  border-color: var(--color-neon-cyan);
  color: var(--color-neon-cyan);
  transform: translateX(-50%) scale(1.05);
}

.sync-button svg {
  width: 16px;
  height: 16px;
}

/* Sync button transitions */
.sync-button-enter-active,
.sync-button-leave-active {
  transition: all 0.3s ease;
}

.sync-button-enter-from,
.sync-button-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

/* Responsive */
@media (max-width: 768px) {
  .lyrics-content {
    padding: 40px 16px 280px;
  }

  .lyrics-line-content {
    font-size: 22px;
  }

  .lyrics-line {
    margin: 16px 0;
    padding: 8px 12px;
  }
}
</style>
