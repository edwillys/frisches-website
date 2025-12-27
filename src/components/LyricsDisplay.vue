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
const isUserScrolling = ref(false)
const isSyncMode = ref(true)
const userScrollTimeout = ref<number | null>(null)

const currentTimeMs = computed(() => props.currentTime * 1000)

const activeLine = computed(() => {
  if (!props.lyricsData) return null
  
  const lines = props.lyricsData.lyrics
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (currentTimeMs.value >= line.startTime && currentTimeMs.value <= line.endTime) {
      return line
    }
  }
  
  // If we're past the last line, return the last line
  if (lines.length > 0 && currentTimeMs.value > lines[lines.length - 1].endTime) {
    return lines[lines.length - 1]
  }
  
  return null
})

const activeLineIndex = computed(() => {
  if (!props.lyricsData || !activeLine.value) return -1
  return props.lyricsData.lyrics.findIndex(line => line.id === activeLine.value!.id)
})

function isWordActive(word: Word): boolean {
  return currentTimeMs.value >= word.startTime && currentTimeMs.value <= word.endTime
}

function isPastWord(word: Word): boolean {
  return currentTimeMs.value > word.endTime
}

function getWordProgress(word: Word): number {
  if (currentTimeMs.value < word.startTime) return 0
  if (currentTimeMs.value > word.endTime) return 1
  return (currentTimeMs.value - word.startTime) / word.duration
}

function handleLineClick(line: Line) {
  // Seek to the start of the line (convert ms to seconds)
  emit('seek', line.startTime / 1000)
}

function handleScroll() {
  if (!lyricsContainer.value) return
  
  // User is scrolling manually
  isUserScrolling.value = true
  isSyncMode.value = false
  
  // Clear existing timeout
  if (userScrollTimeout.value) {
    clearTimeout(userScrollTimeout.value)
  }
  
  // After 150ms of no scrolling, mark as not scrolling
  userScrollTimeout.value = window.setTimeout(() => {
    isUserScrolling.value = false
  }, 150)
}

function syncToActiveLine() {
  isSyncMode.value = true
  scrollToActiveLine()
}

function scrollToActiveLine() {
  if (!lyricsContainer.value || activeLineIndex.value === -1) return
  
  nextTick(() => {
    const activeElement = lyricsContainer.value?.querySelector(`[data-line-index="${activeLineIndex.value}"]`)
    if (activeElement) {
      activeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      })
    }
  })
}

// Watch for active line changes to auto-scroll
watch(activeLineIndex, (newIndex, oldIndex) => {
  if (newIndex !== oldIndex && isSyncMode.value) {
    scrollToActiveLine()
  }
})

// Re-enable sync mode when playback starts
watch(() => props.isPlaying, (playing) => {
  if (playing && !isSyncMode.value) {
    // Don't auto-enable, let user choose
  }
})

onMounted(() => {
  lyricsContainer.value?.addEventListener('scroll', handleScroll, { passive: true })
})

onUnmounted(() => {
  lyricsContainer.value?.removeEventListener('scroll', handleScroll)
  if (userScrollTimeout.value) {
    clearTimeout(userScrollTimeout.value)
  }
})
</script>

<template>
  <div class="lyrics-display">
    <div 
      ref="lyricsContainer" 
      class="lyrics-container"
      :class="{ 'is-syncing': isSyncMode }"
    >
      <div class="lyrics-content">
        <div
          v-for="(line, index) in lyricsData?.lyrics"
          :key="line.id"
          :data-line-index="index"
          class="lyrics-line"
          :class="{
            'is-active': line.id === activeLine?.id,
            'is-past': lyricsData && index < activeLineIndex,
            'is-future': lyricsData && index > activeLineIndex
          }"
          @click="handleLineClick(line)"
        >
          <div class="lyrics-line-content">
            <span
              v-for="(word, wordIndex) in line.words"
              :key="`${line.id}-${wordIndex}`"
              class="lyrics-word"
              :class="{ 
                'is-active': line.id === activeLine?.id && isWordActive(word),
                'is-past': line.id === activeLine?.id && isPastWord(word)
              }"
              :style="{
                '--word-progress': line.id === activeLine?.id ? getWordProgress(word) : 0,
                '--word-duration': `${word.duration}ms`
              }"
            >{{ word.text }}</span>
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
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="1 4 1 10 7 10"/>
          <polyline points="23 20 23 14 17 14"/>
          <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
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
  transition: color 0.1s ease;
  color: inherit;
}

.lyrics-line.is-active .lyrics-word {
  color: rgba(255, 255, 255, 0.5);
}

/* Past words stay cyan */
.lyrics-word.is-past {
  color: var(--color-neon-cyan) !important;
}

/* Current word gets gradient animation */
.lyrics-word.is-active {
  position: relative;
  background: linear-gradient(
    90deg,
    var(--color-neon-cyan) 0%,
    var(--color-neon-cyan) calc(var(--word-progress) * 100%),
    rgba(255, 255, 255, 0.5) calc(var(--word-progress) * 100%),
    rgba(255, 255, 255, 0.5) 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-fill-color: transparent;
}

.lyrics-spacer {
  height: 200px;
}

/* Sync Button */
.sync-button {
  position: absolute;
  bottom: 24px;
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
