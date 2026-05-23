<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import ChordFretboard from './ChordFretboard.vue'
import { getActiveChordAtTime, normalizeLyricsData } from '@/data/lyricsChords'
import type { LyricsData, Line, ResolvedLyricsChord, Word } from '@/types/lyrics'
import { useUiText } from '@/composables/useUiText'
import syncSvg from '@/assets/icons/sync.svg?raw'
import chordFretboardSvg from '@/assets/icons/chord-fretboard.svg?raw'

interface Props {
  lyricsData: LyricsData | null
  currentTime: number // in seconds
  isPlaying: boolean
}

const props = defineProps<Props>()
const t = useUiText()

const emit = defineEmits<{
  (e: 'seek', time: number): void
}>()

const SHOW_CHORDS_STORAGE_KEY = 'frisches:show-chords'

const lyricsContainer = ref<HTMLElement | null>(null)
const chordCarouselTop = ref<HTMLElement | null>(null)
const chordCarouselSidebar = ref<HTMLElement | null>(null)
const isSyncMode = ref(true)
const isLargeChordLayout = ref(false)
const showChords = ref(
  typeof localStorage !== 'undefined'
    ? localStorage.getItem(SHOW_CHORDS_STORAGE_KEY) === 'true'
    : false
)
const isChordRailCollapsed = ref(false)

const USER_INTENT_WINDOW_MS = 400
const RESYNC_DEBOUNCE_MS = 180
const SYNC_CENTER_TOLERANCE_RATIO = 0.25

let lastUserIntentAt = 0
let resyncTimer: number | null = null
let isProgrammaticScroll = false
let largeChordLayoutQuery: MediaQueryList | null = null

const resolvedLyricsData = computed(() =>
  props.lyricsData ? normalizeLyricsData(props.lyricsData) : null
)

const carouselChords = computed(() => {
  const unique: ResolvedLyricsChord[] = []
  const seen = new Set<string>()

  for (const chord of resolvedLyricsData.value?.resolvedChords.timeline ?? []) {
    if (seen.has(chord.name)) continue
    seen.add(chord.name)
    unique.push(chord)
  }

  return unique
})

const hasChordData = computed(() =>
  Boolean(
    resolvedLyricsData.value?.resolvedChords.enabled &&
    resolvedLyricsData.value.resolvedChords.timeline.length > 0
  )
)

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

const activeChord = computed(() => {
  if (!resolvedLyricsData.value || !hasChordData.value) return null
  return getActiveChordAtTime(resolvedLyricsData.value, currentTimeMs.value)
})

const activeChordName = computed(() => activeChord.value?.name ?? null)

// Tracks the chord highlighted in the carousel/sidebar and inline lyrics.
// Updated from playback (see activeChordName watch) and manual carousel/inline clicks.
const selectedChordId = ref<string | null>(null)

const selectedChord = computed(() => {
  if (!selectedChordId.value) return null
  const chord = carouselChords.value.find((entry) => entry.name === selectedChordId.value)
  if (!chord) return null

  return {
    name: chord.definition?.displayName ?? chord.name,
    diagram: chord.definition?.diagram ?? null,
  }
})

const activeLine = computed(() => {
  if (!resolvedLyricsData.value) return null

  const lines = resolvedLyricsData.value.lyrics
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
  if (!resolvedLyricsData.value || !activeLine.value) return -1
  return resolvedLyricsData.value.lyrics.findIndex((line) => line.id === activeLine.value!.id)
})

// Index of last fully-past line, independent of whether we're currently "inside" a line.
// This prevents the "everything becomes unread" glitch when there's a timing gap between lines.
const pastLineIndex = computed(() => {
  const lines = resolvedLyricsData.value?.lyrics
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

function lineWordChords(line: Line, wordIndex: number) {
  if (!showChords.value) return []
  return (line.chords ?? []).filter((chord) => (chord.wordIndex ?? 0) === wordIndex)
}

function isChordActive(chordName: string) {
  return selectedChordId.value === chordName
}

function isTopChordActive(chordName: string) {
  return !isLargeChordLayout.value && isChordActive(chordName)
}

function isSidebarChordActive(chordName: string) {
  return !isLargeChordLayout.value && isChordActive(chordName)
}

function findChordButton(chordName: string): HTMLElement | null {
  // Try sidebar first (large screens), then top carousel (small/medium screens)
  for (const container of [chordCarouselSidebar.value, chordCarouselTop.value]) {
    if (!container) continue
    const btn = container.querySelector(`[data-chord-name="${chordName}"]`) as HTMLElement | null
    if (btn) return btn
  }
  return null
}

function activeCarouselContainer(button: HTMLElement): HTMLElement | null {
  // Return whichever mounted container holds this button
  if (chordCarouselSidebar.value?.contains(button)) return chordCarouselSidebar.value
  if (chordCarouselTop.value?.contains(button)) return chordCarouselTop.value
  return null
}

function isChordVisible(button: HTMLElement): boolean {
  const container = activeCarouselContainer(button)
  if (!container) return true

  const containerRect = container.getBoundingClientRect()
  const buttonRect = button.getBoundingClientRect()

  // Sidebar scrolls vertically; top carousel scrolls horizontally
  const isSidebar = container === chordCarouselSidebar.value
  if (isSidebar) {
    return buttonRect.top >= containerRect.top + 8 && buttonRect.bottom <= containerRect.bottom - 8
  }
  return buttonRect.left >= containerRect.left + 8 && buttonRect.right <= containerRect.right - 8
}

function centerChord(chordName: string, onlyIfHidden: boolean) {
  nextTick(() => {
    const button = findChordButton(chordName)
    if (!button) return
    const container = activeCarouselContainer(button)
    if (!container) return
    if (onlyIfHidden && isChordVisible(button)) return

    const containerRect = container.getBoundingClientRect()
    const buttonRect = button.getBoundingClientRect()
    const isSidebar = container === chordCarouselSidebar.value

    if (typeof container.scrollTo === 'function') {
      if (isSidebar) {
        const top =
          container.scrollTop +
          (buttonRect.top - containerRect.top) -
          (containerRect.height - buttonRect.height) / 2

        container.scrollTo({ top, behavior: 'smooth' })
        return
      }

      const left =
        container.scrollLeft +
        (buttonRect.left - containerRect.left) -
        (containerRect.width - buttonRect.width) / 2

      container.scrollTo({ left, behavior: 'smooth' })
      return
    }

    if (typeof button.scrollIntoView === 'function') {
      button.scrollIntoView({
        behavior: 'smooth',
        block: isSidebar ? 'center' : 'nearest',
        inline: isSidebar ? 'nearest' : 'center',
      })
    }
  })
}

function syncLargeChordLayout(matches: boolean) {
  isLargeChordLayout.value = matches
}

function onLargeChordLayoutChange(event: MediaQueryListEvent) {
  syncLargeChordLayout(event.matches)
}

/** Carousel click: highlight only, no seek. */
function handleCarouselSelect(chord: ResolvedLyricsChord) {
  selectedChordId.value = chord.name
  centerChord(chord.name, false)
}

/** Inline chord click: seek to that chord's time AND highlight it.
 *  Re-enables sync mode so the watcher scrolls the lyric line into view once currentTime updates. */
function handleInlineChordSeek(chord: { name: string; startTime: number }) {
  selectedChordId.value = chord.name
  isSyncMode.value = true
  emit('seek', chord.startTime / 1000)
  centerChord(chord.name, false)
}

function preserveLyricsViewportPosition(updateLayout: () => void, afterLayout?: () => void) {
  const container = lyricsContainer.value

  if (!container) {
    updateLayout()
    afterLayout?.()
    return
  }

  const previousTop = container.getBoundingClientRect().top
  const previousScrollTop = container.scrollTop

  updateLayout()

  nextTick(() => {
    const nextTop = container.getBoundingClientRect().top
    const topDelta = previousTop - nextTop

    if (topDelta !== 0) {
      isProgrammaticScroll = true
      container.scrollTop = Math.max(0, previousScrollTop - topDelta)
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          isProgrammaticScroll = false
        })
      })
    }

    afterLayout?.()
  })
}

function toggleChords() {
  preserveLyricsViewportPosition(
    () => {
      showChords.value = !showChords.value
    },
    () => {
      if (showChords.value && activeChordName.value && !isChordRailCollapsed.value) {
        centerChord(activeChordName.value, false)
      }
    }
  )
}

function toggleChordRail() {
  preserveLyricsViewportPosition(
    () => {
      isChordRailCollapsed.value = !isChordRailCollapsed.value
    },
    () => {
      if (!isChordRailCollapsed.value && activeChordName.value) {
        centerChord(activeChordName.value, true)
      }
    }
  )
}

function handleScroll() {
  if (!lyricsContainer.value) return

  // Ignore scroll events we caused via scrollIntoView.
  if (isProgrammaticScroll) return

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
        // Mark as programmatic so the ensuing scroll event doesn't flip sync mode off.
        isProgrammaticScroll = true
        // Clear after the scroll event(s) have had a chance to fire.
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            isProgrammaticScroll = false
          })
        })
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

watch(
  () => activeChordName.value,
  (nextChordName, previousChordName) => {
    if (!nextChordName || nextChordName === previousChordName) return
    selectedChordId.value = nextChordName
  },
  { immediate: true }
)

watch(showChords, (val) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(SHOW_CHORDS_STORAGE_KEY, String(val))
  }
})

watch(
  () => resolvedLyricsData.value?.meta.title,
  () => {
    isChordRailCollapsed.value = false
    selectedChordId.value = null
  }
)

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
  if (typeof window !== 'undefined') {
    largeChordLayoutQuery = window.matchMedia('(min-width: 1100px)')
    syncLargeChordLayout(largeChordLayoutQuery.matches)

    if (typeof largeChordLayoutQuery.addEventListener === 'function') {
      largeChordLayoutQuery.addEventListener('change', onLargeChordLayoutChange)
    } else {
      largeChordLayoutQuery.addListener(onLargeChordLayoutChange)
    }
  }

  lyricsContainer.value?.addEventListener('scroll', handleScroll, { passive: true })

  // Track user intent separately so we can ignore programmatic auto-scroll.
  lyricsContainer.value?.addEventListener('wheel', markUserIntent, { passive: true })
  lyricsContainer.value?.addEventListener('touchstart', markUserIntent, { passive: true })
  lyricsContainer.value?.addEventListener('pointerdown', markUserIntent, { passive: true })
  lyricsContainer.value?.addEventListener('keydown', markUserIntent)
})

onUnmounted(() => {
  if (largeChordLayoutQuery) {
    if (typeof largeChordLayoutQuery.removeEventListener === 'function') {
      largeChordLayoutQuery.removeEventListener('change', onLargeChordLayoutChange)
    } else {
      largeChordLayoutQuery.removeListener(onLargeChordLayoutChange)
    }
  }

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
    <aside
      v-if="hasChordData && showChords && !isChordRailCollapsed"
      ref="chordCarouselSidebar"
      class="lyrics-chords-sidebar"
    >
      <button
        v-for="chord in carouselChords"
        :key="chord.name"
        class="lyrics-chords-sidebar__item"
        :class="{ 'is-active': isSidebarChordActive(chord.name) }"
        :data-chord-name="chord.name"
        type="button"
        @click.stop="handleCarouselSelect(chord)"
      >
        <ChordFretboard
          :name="chord.definition?.displayName ?? chord.name"
          :diagram="chord.definition?.diagram ?? null"
          compact
        />
      </button>
    </aside>

    <aside
      v-if="isLargeChordLayout && hasChordData && showChords && selectedChord"
      class="lyrics-side-chord lyrics-side-chord--right"
      aria-live="polite"
    >
      <ChordFretboard :name="selectedChord.name" :diagram="selectedChord.diagram" large />
    </aside>

    <div
      class="lyrics-display__sticky"
      :class="{
        'lyrics-display__sticky--with-top-strip':
          hasChordData && showChords && !isChordRailCollapsed && !isLargeChordLayout,
      }"
    >
      <div v-if="hasChordData" class="lyrics-chords-tools">
        <!-- "C#" circular toggle button -->
        <button
          class="lyrics-chords-tools__toggle"
          type="button"
          data-testid="lyrics-chords-toggle"
          :aria-pressed="showChords"
          :title="showChords ? t.lyrics.hideChords : t.lyrics.showChords"
          @click="toggleChords"
        >
          C#
        </button>
        <!-- Fretboard-icon collapse/expand button — only visible when chords strip is on -->
        <button
          v-if="showChords"
          class="lyrics-chords-tools__collapse"
          type="button"
          data-testid="lyrics-chords-collapse"
          :aria-expanded="!isChordRailCollapsed"
          :aria-label="isChordRailCollapsed ? t.lyrics.expandChords : t.lyrics.collapseChords"
          @click="toggleChordRail"
        >
          <span aria-hidden="true" v-html="chordFretboardSvg" />
        </button>
      </div>

      <!-- Top horizontal carousel: hidden when chord column sidebar is available (large screens) or when collapsed -->
      <section
        v-if="hasChordData && showChords && !isChordRailCollapsed"
        class="lyrics-chords-strip"
      >
        <div
          ref="chordCarouselTop"
          class="lyrics-chords-carousel"
          data-testid="lyrics-chords-carousel"
        >
          <button
            v-for="chord in carouselChords"
            :key="chord.name"
            class="lyrics-chords-carousel__item"
            :class="{ 'is-active': isTopChordActive(chord.name) }"
            :data-chord-name="chord.name"
            type="button"
            @click.stop="handleCarouselSelect(chord)"
          >
            <ChordFretboard
              :name="chord.definition?.displayName ?? chord.name"
              :diagram="chord.definition?.diagram ?? null"
              compact
            />
          </button>
        </div>
      </section>
    </div>

    <div ref="lyricsContainer" class="lyrics-container" :class="{ 'is-syncing': isSyncMode }">
      <div class="lyrics-content">
        <div class="lyrics-content__body">
          <div
            v-for="(line, index) in resolvedLyricsData?.lyrics"
            :key="line.id"
            :data-line-index="index"
            class="lyrics-line"
            :class="{
              'is-active': index === activeLineIndex,
              'is-past': resolvedLyricsData && index <= pastLineIndex,
              'is-future': resolvedLyricsData && index > anchorLineIndex,
              'has-chords': showChords,
            }"
            @click="handleLineClick(line)"
          >
            <div class="lyrics-line-content">
              <span
                v-for="(word, wordIndex) in line.words"
                :key="`${line.id}-${wordIndex}`"
                class="lyrics-word-stack"
              >
                <span v-if="showChords" class="lyrics-word-chords">
                  <button
                    v-for="chord in lineWordChords(line, wordIndex)"
                    :key="chord.id"
                    class="lyrics-inline-chord"
                    :class="{ 'is-active': isChordActive(chord.name) }"
                    type="button"
                    @click.stop="handleInlineChordSeek(chord)"
                  >
                    {{ chord.name }}
                  </button>
                </span>
                <span
                  class="lyrics-word"
                  :class="{
                    'is-active': index === activeLineIndex && isWordActive(word),
                    'is-past': index === activeLineIndex && isPastWord(word),
                  }"
                  >{{ word.text }}</span
                >
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Sync button when out of sync -->
    <transition name="sync-button">
      <button
        v-if="!isSyncMode && isPlaying"
        class="sync-button"
        @click="syncToActiveLine"
        :title="t.lyrics.syncToCurrent"
      >
        <span aria-hidden="true" v-html="syncSvg" />
        <span>{{ t.lyrics.sync }}</span>
      </button>
    </transition>
  </div>
</template>

<style scoped>
/* ─── The sidebar-width token is also used by the expanded sidebar in LyricsFlipCard.
 * Compact fretboard: frame = 6 * 0.88rem = 5.28rem per chord.
 * Button padding 0.48rem×2 sides → each cell ≈ 6.24rem wide. */

.lyrics-display {
  --lyrics-sidebar-width: clamp(7rem, 22vw, 21rem);
  --lyrics-side-chord-width: clamp(12rem, 18vw, 18rem);
  --lyrics-content-max-width: 52rem;
  --lyrics-side-padding-top: clamp(4.25rem, 10vh, 6rem);
  --lyrics-floating-tools-gap: 0.45rem;
  --lyrics-floating-tools-size: 2rem;
  --lyrics-floating-tools-strip-gap: 0.9rem;
  --lyrics-floating-tools-top: calc(
    var(--lyrics-overlay-close-top) + var(--lyrics-overlay-close-size) +
      var(--lyrics-floating-tools-gap)
  );
  --lyrics-floating-tools-right: var(--lyrics-overlay-close-right);
  --lyrics-mobile-tools-clearance: calc(
    var(--lyrics-floating-tools-right) + var(--lyrics-floating-tools-size) +
      var(--lyrics-floating-tools-strip-gap)
  );
  --lyrics-text-column-width: clamp(17rem, 84%, 38rem);
  position: relative;
  display: grid;
  /* default: single-column, 2 rows — [sticky] [lyrics] */
  grid-template-columns: 1fr;
  grid-template-rows: auto 1fr;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* ── Sidebar is hidden on small/medium screens ── */
.lyrics-chords-sidebar {
  display: none;
}

.lyrics-side-chord {
  display: none;
}

.lyrics-display__sticky {
  position: relative;
  z-index: 12;
  grid-row: 1;
  grid-column: 1;
  width: 100%;
  min-width: 0;
  background: none;
  backdrop-filter: none;
}

.lyrics-display__sticky--with-top-strip {
  background: linear-gradient(
    180deg,
    rgba(10, 10, 18, 0.96),
    rgba(10, 10, 18, 0.82) 82%,
    transparent
  );
  backdrop-filter: blur(14px);
}

.lyrics-chords-tools {
  position: absolute;
  top: var(--lyrics-floating-tools-top);
  right: var(--lyrics-floating-tools-right);
  z-index: 2;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: var(--lyrics-floating-tools-gap);
  padding: 0;
}

/* shared base for both tool buttons */
.lyrics-chords-tools__toggle,
.lyrics-chords-tools__collapse {
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: var(--color-text);
}

/* "C#" circular toggle: equal width/height for perfect circle */
.lyrics-chords-tools__toggle {
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  cursor: pointer;
}

.lyrics-chords-tools__toggle[aria-pressed='true'] {
  border-color: var(--album-theme-color, var(--color-neon-cyan));
  background: color-mix(
    in srgb,
    var(--album-theme-color, var(--color-neon-cyan)) 18%,
    rgba(255, 255, 255, 0.06)
  );
}

/* fretboard-icon collapse/expand button — same size as C# button */
.lyrics-chords-tools__collapse {
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.lyrics-chords-tools__collapse[aria-expanded='true'] {
  border-color: var(--album-theme-color, var(--color-neon-cyan));
  background: color-mix(
    in srgb,
    var(--album-theme-color, var(--color-neon-cyan)) 14%,
    rgba(255, 255, 255, 0.04)
  );
}

.lyrics-chords-tools__collapse :deep(svg) {
  width: 1.05rem;
  height: 1.05rem;
  display: block;
}

.lyrics-chords-strip {
  width: 100%;
  min-width: 0;
  padding: 0 1rem 0.75rem;
}

.lyrics-chords-carousel {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.55rem;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  padding-inline: 0.75rem;
  scroll-padding-inline: 0.75rem;
  padding-bottom: 0.35rem;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;
  touch-action: pan-x;
}

.lyrics-chords-carousel::-webkit-scrollbar {
  display: none;
}

.lyrics-chords-carousel__item {
  flex: 0 0 auto;
  border-radius: 0.85rem;
  padding: 0.48rem 0.52rem;
  cursor: pointer;
  scroll-snap-align: center;
  touch-action: pan-x;
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    background 0.2s ease;
}

.lyrics-chords-carousel__item.is-active {
  border-color: var(--album-theme-color, var(--color-neon-cyan));
  background: color-mix(
    in srgb,
    var(--album-theme-color, var(--color-neon-cyan)) 18%,
    rgba(255, 255, 255, 0.06)
  );
}

.lyrics-inline-chord.is-active {
  color: var(--album-theme-color, var(--color-neon-cyan));
  opacity: 1;
}

.lyrics-line.has-chords {
  padding-top: 0.8rem;
}

.lyrics-container {
  grid-row: 2;
  grid-column: 1;
  min-height: 0;
  min-width: 0;
  width: 100%;
  display: flex;
  justify-content: center;
  overflow-y: auto;
  overflow-x: hidden;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-y: contain;
}

.lyrics-content {
  width: min(100%, 800px);
  min-height: 100%;
  margin: 0 auto;
  padding-inline: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: left;
}

.lyrics-content::before,
.lyrics-content::after {
  content: '';
  flex: 1 1 clamp(2.5rem, 12vh, 8rem);
}

.lyrics-content::after {
  min-height: calc(var(--mini-player-offset, 0px) + clamp(5rem, 16vh, 9rem));
}

.lyrics-content__body {
  width: min(100%, var(--lyrics-text-column-width));
  max-width: 100%;
  margin-inline: auto;
  display: flex;
  flex-direction: column;
  align-items: stretch;
}

.lyrics-line {
  width: 100%;
  box-sizing: border-box;
  margin: 12px 0;
  cursor: pointer;
  transition:
    background 0.3s ease,
    opacity 0.3s ease;
  padding: 6px 12px;
  border-radius: 8px;
}

.lyrics-line:hover {
  background: rgba(255, 255, 255, 0.05);
}

.lyrics-line.is-past {
  opacity: 1;
}

.lyrics-line.is-past .lyrics-line-content {
  color: var(--album-theme-color, var(--color-neon-cyan));
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
  justify-content: flex-start;
  align-items: flex-end;
  gap: 0.18rem 0;
  width: 100%;
}

.lyrics-word-stack {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  margin-right: 0.3em;
}

.lyrics-inline-chord {
  background: transparent;
  border: none;
  border-radius: 0;
  padding: 0 0.1rem;
  font-size: 0.52em;
  font-weight: 800;
  letter-spacing: 0.02em;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.5);
}

/* ── Large-screen layout: vertical chord sidebar on the left ────────────── */
/* Breakpoint: enough space for ≥1 chord column + lyrics.
 * min-width chosen so the sidebar (≈7rem) + lyrics column still breathe. */
@media (min-width: 1100px) {
  .lyrics-display {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }

  .lyrics-chords-sidebar {
    position: absolute;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(calc(6 * 0.88rem + 2 * 0.52rem), 1fr));
    align-content: start;
    gap: 0.45rem;
    top: 0;
    bottom: 0;
    left: 0;
    width: var(--lyrics-sidebar-width);
    overflow-y: auto;
    overflow-x: hidden;
    padding: var(--lyrics-side-padding-top) 0.75rem 0.85rem;
    scrollbar-width: none;
    scroll-padding-block: 50%;
    overscroll-behavior-y: contain;
    z-index: 3;
  }

  .lyrics-chords-sidebar::-webkit-scrollbar {
    display: none;
  }

  .lyrics-chords-sidebar__item {
    border: none;
    background: transparent;
    color: var(--color-text);
    border-radius: 0.72rem;
    padding: 0.42rem 0.48rem;
    cursor: pointer;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition:
      box-shadow 0.2s ease,
      transform 0.2s ease;
  }

  .lyrics-chords-sidebar__item.is-active {
    box-shadow: inset 0 0 0 1px
      color-mix(in srgb, var(--album-theme-color, var(--color-neon-cyan)) 54%, transparent 46%);
    transform: translateX(2px);
  }

  .lyrics-side-chord {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: var(--lyrics-side-chord-width);
    padding: var(--lyrics-side-padding-top) 0.75rem 0.85rem;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    z-index: 3;
    background: linear-gradient(270deg, rgba(0, 0, 0, 0.16), rgba(0, 0, 0, 0.04));
  }

  .lyrics-display__sticky {
    grid-column: 1;
    grid-row: 1;
    z-index: 12;
  }

  .lyrics-container {
    grid-column: 1;
    grid-row: 2;
  }

  .lyrics-content {
    max-width: min(
      var(--lyrics-content-max-width),
      calc(100% - var(--lyrics-sidebar-width) - var(--lyrics-side-chord-width) - 2rem)
    );
    padding-left: 0.75rem;
    padding-right: 0.75rem;
  }

  /* Hide the top carousel on large screens — sidebar takes its role */
  .lyrics-chords-strip {
    display: none;
  }
}

.lyrics-line.is-active .lyrics-word {
  color: rgba(255, 255, 255, 0.5);
}

/* Past + current word are orange (album theme, falls back to cyan). */
.lyrics-word.is-past,
.lyrics-word.is-active {
  color: var(--album-theme-color, var(--color-neon-cyan)) !important;
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

.sync-button :deep(svg) {
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
  .lyrics-chords-tools {
    flex-direction: column;
    align-items: center;
  }

  .lyrics-chords-strip {
    padding: 0 0.25rem 0.6rem;
  }

  .lyrics-display__sticky--with-top-strip .lyrics-chords-strip {
    padding-top: 0;
    padding-right: var(--lyrics-mobile-tools-clearance);
  }

  .lyrics-content {
    padding-inline: 10px;
  }

  .lyrics-content::before {
    flex-basis: clamp(1.5rem, 8vh, 4rem);
  }

  .lyrics-content::after {
    min-height: calc(var(--mini-player-offset, 0px) + clamp(4.5rem, 14vh, 7rem));
  }

  .lyrics-line-content {
    font-size: 22px;
  }

  .lyrics-inline-chord {
    font-size: 0.54em;
  }

  .lyrics-line {
    margin: 8px 0;
    padding: 4px 8px;
  }
}

@media (min-width: 769px) {
  .lyrics-display {
    --lyrics-floating-tools-top: calc(
      var(--lyrics-overlay-close-top) +
        (var(--lyrics-overlay-close-size) - var(--lyrics-floating-tools-size)) / 2
    );
    --lyrics-floating-tools-right: calc(
      var(--lyrics-overlay-close-right) + var(--lyrics-overlay-close-size) +
        var(--lyrics-floating-tools-gap)
    );
  }

  .lyrics-chords-tools {
    flex-direction: row;
  }
}
</style>
