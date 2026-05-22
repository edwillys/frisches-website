<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import AnimatedLoadingGlyph from './AnimatedLoadingGlyph.vue'
import ChordFretboard from './ChordFretboard.vue'
import { normalizeLyricsData } from '@/data/lyricsChords'
import { useUiText } from '@/composables/useUiText'
import type { LyricsData, Line, ResolvedLyricsData } from '@/types/lyrics'
import type { LyricsAlbumCard, LyricsAlbumTrack } from '@/types/lyricsAlbumCard'
import fullscreenEnterSvg from '@/assets/icons/fullscreen-enter.svg?raw'
import fullscreenExitSvg from '@/assets/icons/fullscreen-exit.svg?raw'
import chordFretboardSvg from '@/assets/icons/chord-fretboard.svg?raw'

const SHOW_CHORDS_STORAGE_KEY = 'frisches:show-chords'

type CachedLyrics = {
  title: string
  text: string
  data: ResolvedLyricsData
}

type CardDisplayLine = {
  line: Line
  hasBreakBefore: boolean
}

interface Props {
  card: LyricsAlbumCard
  backSignal?: number
  canExpand?: boolean
  isExpanded?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  backSignal: 0,
  canExpand: false,
  isExpanded: false,
})

const t = useUiText()

const emit = defineEmits<{
  (e: 'detail-open-change', isOpen: boolean): void
  (e: 'toggle-expand'): void
}>()

const selectedTrackId = ref(props.card.tracks[0]?.trackId ?? '')
const isFlipped = ref(false)
const isLoadingLyrics = ref(false)
const lyricsText = ref('')
const lyricsTitle = ref(props.card.tracks[0]?.title ?? '')
const lyricsData = ref<ResolvedLyricsData | null>(null)
const showChords = ref(
  typeof localStorage !== 'undefined'
    ? localStorage.getItem(SHOW_CHORDS_STORAGE_KEY) === 'true'
    : false
)
const isChordRailCollapsed = ref(false)
const selectedChordId = ref<string | null>(null)
const chordCarousel = ref<HTMLElement | null>(null)
const chordCarouselSidebar = ref<HTMLElement | null>(null)
const isExpandedDesktop = ref(false)
const compactChordRailFlipReady = ref(false)

const lyricsCache = ref<Record<string, CachedLyrics>>({})

let activeFetchController: AbortController | null = null
let compactChordRailFrame: number | null = null

const cardStyle = computed(() => ({
  '--lyrics-card-tone-base': props.card.themeColor,
  '--lyrics-card-tone-dark': props.card.themeColorDark,
}))

const selectedTrack = computed<LyricsAlbumTrack | null>(
  () => props.card.tracks.find((track) => track.trackId === selectedTrackId.value) ?? null
)

const selectedChord = computed(() => {
  if (!selectedChordId.value) return null
  const entry = carouselChords.value.find((c) => c.name === selectedChordId.value)
  if (!entry) return null
  return {
    name: entry.definition?.displayName ?? entry.name,
    diagram: entry.definition?.diagram ?? null,
  }
})

const selectedTrackSupportsChords = computed(
  () => selectedTrack.value?.hasChords === true || hasChordData.value
)

const compactChordRailRequested = computed(
  () => showChords.value && !isChordRailCollapsed.value && !props.isExpanded
)

const compactChordRailEligible = computed(
  () => compactChordRailRequested.value && isFlipped.value && selectedTrackSupportsChords.value
)

const showCompactChordRail = computed(
  () => compactChordRailFlipped.value && selectedTrackSupportsChords.value
)

const reserveCompactChordRailSlot = computed(() => compactChordRailEligible.value)

const compactChordRailFlipped = computed(
  () => compactChordRailEligible.value && compactChordRailFlipReady.value
)

const compactChordRailLoading = computed(
  () =>
    compactChordRailFlipped.value &&
    isLoadingLyrics.value &&
    selectedTrack.value?.hasChords === true
)

const showExpandedChordPanel = computed(
  () =>
    hasChordData.value &&
    showChords.value &&
    !isChordRailCollapsed.value &&
    props.isExpanded &&
    isExpandedDesktop.value &&
    Boolean(selectedChord.value)
)

let expandedDesktopQuery: MediaQueryList | null = null

function syncExpandedDesktop(matches: boolean) {
  isExpandedDesktop.value = matches
}

function onExpandedDesktopChange(event: MediaQueryListEvent) {
  syncExpandedDesktop(event.matches)
}

function cancelCompactChordRailFrame() {
  if (compactChordRailFrame === null) return
  if (typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(compactChordRailFrame)
  }
  compactChordRailFrame = null
}

function scheduleCompactChordRailFlipIn() {
  cancelCompactChordRailFrame()

  if (typeof requestAnimationFrame !== 'function') {
    compactChordRailFlipReady.value = true
    return
  }

  compactChordRailFrame = requestAnimationFrame(() => {
    compactChordRailFrame = null
    compactChordRailFlipReady.value = true
  })
}

const SECTION_BREAK_GAP_MS = 900

const hasChordData = computed(() =>
  Boolean(
    lyricsData.value?.resolvedChords.enabled && lyricsData.value.resolvedChords.timeline.length
  )
)

const carouselChords = computed(() => {
  const unique: NonNullable<ResolvedLyricsData['resolvedChords']['timeline']>[number][] = []
  const seen = new Set<string>()

  for (const chord of lyricsData.value?.resolvedChords.timeline ?? []) {
    if (seen.has(chord.name)) continue
    seen.add(chord.name)
    unique.push(chord)
  }

  return unique
})

const displayLines = computed<CardDisplayLine[]>(() => {
  const lines = lyricsData.value?.lyrics ?? []
  return lines.map((line, index) => {
    const previousSourceLine = index > 0 ? lines[index - 1] : null
    const currentSection = (line as { section?: string }).section
    const previousSection = (previousSourceLine as { section?: string } | null)?.section

    const sectionChanged =
      index > 0 &&
      Boolean(currentSection) &&
      Boolean(previousSection) &&
      currentSection !== previousSection

    const isSectionLead = /^\s*(\[.+\]|(chorus|verse|bridge|refrain)\b)/i.test(line.text)
    const hasTimingBreak =
      index > 0 &&
      typeof previousSourceLine?.endTime === 'number' &&
      typeof line.startTime === 'number' &&
      line.startTime - previousSourceLine.endTime >= SECTION_BREAK_GAP_MS

    return {
      line,
      hasBreakBefore: Boolean(index > 0 && (sectionChanged || isSectionLead || hasTimingBreak)),
    }
  })
})

const formatLyricsText = (data: LyricsData, fallbackTitle: string) => {
  const lines = data.lyrics ?? []
  if (!lines.length) {
    return {
      title: data.meta?.title || fallbackTitle,
      text: t.value.music.noLyricsForTrack,
    }
  }

  const formatted: string[] = []

  for (let index = 0; index < lines.length; index += 1) {
    const currentLine = lines[index]
    const text = currentLine.text.trimEnd()
    const previousSourceLine = index > 0 ? lines[index - 1] : null
    const currentSection = (currentLine as { section?: string }).section
    const previousSection = (previousSourceLine as { section?: string } | null)?.section

    const sectionChanged =
      index > 0 &&
      Boolean(currentSection) &&
      Boolean(previousSection) &&
      currentSection !== previousSection

    const isSectionLead = /^\s*(\[.+\]|(chorus|verse|bridge|refrain)\b)/i.test(text)
    const hasTimingBreak =
      index > 0 &&
      typeof previousSourceLine?.endTime === 'number' &&
      typeof currentLine.startTime === 'number' &&
      currentLine.startTime - previousSourceLine.endTime >= SECTION_BREAK_GAP_MS

    const previousFormattedLine = formatted[formatted.length - 1] ?? ''

    if ((sectionChanged || isSectionLead || hasTimingBreak) && previousFormattedLine !== '') {
      formatted.push('')
    }

    formatted.push(text)
  }

  return {
    title: data.meta?.title || fallbackTitle,
    text: formatted.join('\n'),
  }
}

const loadLyricsForTrack = async (track: LyricsAlbumTrack) => {
  lyricsTitle.value = track.title
  lyricsText.value = ''
  lyricsData.value = null

  const cached = lyricsCache.value[track.trackId]
  if (cached) {
    lyricsTitle.value = cached.title
    lyricsText.value = cached.text
    lyricsData.value = cached.data
    return
  }

  activeFetchController?.abort()
  const controller = new AbortController()
  activeFetchController = controller

  isLoadingLyrics.value = true

  try {
    const response = await fetch(track.lyricsPath, { signal: controller.signal })
    if (!response.ok) {
      lyricsTitle.value = track.title
      lyricsText.value = t.value.music.noLyricsForTrack
      lyricsData.value = null
      return
    }

    const json = (await response.json()) as LyricsData
    const normalized = normalizeLyricsData(json)
    const { title, text } = formatLyricsText(normalized, track.title)

    lyricsCache.value = {
      ...lyricsCache.value,
      [track.trackId]: {
        title,
        text,
        data: normalized,
      },
    }

    lyricsTitle.value = title
    lyricsText.value = text
    lyricsData.value = normalized
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return
    lyricsTitle.value = track.title
    lyricsText.value = t.value.music.noLyricsForTrack
    lyricsData.value = null
  } finally {
    if (activeFetchController === controller) {
      isLoadingLyrics.value = false
      activeFetchController = null
    }
  }
}

const selectTrack = async (track: LyricsAlbumTrack) => {
  selectedTrackId.value = track.trackId
  emit('detail-open-change', true)
  isFlipped.value = true
  isChordRailCollapsed.value = false
  selectedChordId.value = null
  await loadLyricsForTrack(track)
}

const showTrackList = () => {
  isFlipped.value = false
  isChordRailCollapsed.value = false
  selectedChordId.value = null
  emit('detail-open-change', false)
}

function lineWordChords(line: Line, wordIndex: number) {
  if (!showChords.value) return []
  return (line.chords ?? []).filter((chord) => (chord.wordIndex ?? 0) === wordIndex)
}

function isSelectedChord(chordName: string) {
  return selectedChordId.value === chordName
}

function findChordButton(chordName: string): HTMLElement | null {
  for (const container of [chordCarouselSidebar.value, chordCarousel.value]) {
    if (!container) continue
    const btn = container.querySelector(`[data-chord-name="${chordName}"]`) as HTMLElement | null
    if (btn) return btn
  }
  return null
}

function isChordVisible(button: HTMLElement): boolean {
  const isSidebar = chordCarouselSidebar.value?.contains(button)
  const container = isSidebar ? chordCarouselSidebar.value : chordCarousel.value
  if (!container) return true

  const containerRect = container.getBoundingClientRect()
  const buttonRect = button.getBoundingClientRect()

  if (isSidebar) {
    return buttonRect.top >= containerRect.top + 8 && buttonRect.bottom <= containerRect.bottom - 8
  }
  // Horizontal strip: check left/right visibility
  return buttonRect.left >= containerRect.left + 8 && buttonRect.right <= containerRect.right - 8
}

function centerChord(chordName: string, onlyIfHidden = false) {
  void nextTick(() => {
    const button = findChordButton(chordName)
    if (!button) return
    if (onlyIfHidden && isChordVisible(button)) return
    if (typeof button.scrollIntoView !== 'function') return

    const isSidebar = chordCarouselSidebar.value?.contains(button)
    button.scrollIntoView({
      behavior: 'smooth',
      block: isSidebar ? 'center' : 'nearest',
      inline: isSidebar ? 'nearest' : 'center',
    })
  })
}

function toggleChords() {
  showChords.value = !showChords.value
  if (!showChords.value) {
    selectedChordId.value = null
  } else if (!selectedChordId.value) {
    selectedChordId.value = carouselChords.value[0]?.name ?? null
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(SHOW_CHORDS_STORAGE_KEY, String(showChords.value))
  }
}

function toggleChordRail() {
  isChordRailCollapsed.value = !isChordRailCollapsed.value
}

function handleChordSelection(chordName: string, event?: MouseEvent) {
  event?.stopPropagation()
  selectedChordId.value = chordName
  centerChord(chordName)
}

function handleCardKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !isFlipped.value) return

  event.preventDefault()
  event.stopPropagation()
  showTrackList()
}

watch(
  [() => showChords.value, () => carouselChords.value],
  ([isEnabled, chords]) => {
    if (!isEnabled || chords.length === 0) {
      if (chords.length === 0) {
        selectedChordId.value = null
      }
      return
    }

    if (!selectedChordId.value || !chords.some((chord) => chord.name === selectedChordId.value)) {
      selectedChordId.value = chords[0]?.name ?? null
    }
  },
  { immediate: true }
)

watch(
  compactChordRailEligible,
  (isEligible, wasEligible) => {
    if (!isEligible) {
      cancelCompactChordRailFrame()
      compactChordRailFlipReady.value = false
      return
    }

    if (!wasEligible) {
      compactChordRailFlipReady.value = false
      scheduleCompactChordRailFlipIn()
    }
  },
  { immediate: true }
)

watch(
  [() => showCompactChordRail.value, () => selectedChordId.value, () => props.isExpanded],
  ([shouldCenterRail, chordName, expanded]) => {
    if (!chordName) return
    if (shouldCenterRail) {
      centerChord(chordName, true)
    } else if (expanded) {
      centerChord(chordName, false)
    }
  },
  { immediate: true }
)

watch(
  () => props.backSignal,
  () => {
    if (isFlipped.value) {
      showTrackList()
    }
  }
)

onMounted(() => {
  if (typeof window === 'undefined') return
  expandedDesktopQuery = window.matchMedia('(min-width: 1100px)')
  syncExpandedDesktop(expandedDesktopQuery.matches)

  if (typeof expandedDesktopQuery.addEventListener === 'function') {
    expandedDesktopQuery.addEventListener('change', onExpandedDesktopChange)
    return
  }

  expandedDesktopQuery.addListener(onExpandedDesktopChange)
})

onBeforeUnmount(() => {
  cancelCompactChordRailFrame()

  if (!expandedDesktopQuery) return

  if (typeof expandedDesktopQuery.removeEventListener === 'function') {
    expandedDesktopQuery.removeEventListener('change', onExpandedDesktopChange)
    return
  }

  expandedDesktopQuery.removeListener(onExpandedDesktopChange)
})

defineExpose({
  showCompactChordRail,
  reserveCompactChordRailSlot,
  compactChordRailFlipped,
  compactChordRailLoading,
  carouselChords,
  selectedChordId,
  handleChordSelection,
})
</script>

<template>
  <article
    class="lyrics-flip-card"
    :class="{
      'lyrics-flip-card--flipped': isFlipped,
      'lyrics-flip-card--expanded': props.isExpanded,
    }"
    :style="cardStyle"
    @keydown="handleCardKeydown"
  >
    <div class="lyrics-flip-card__inner">
      <section
        class="lyrics-flip-card__face lyrics-flip-card__face--front"
        :aria-hidden="isFlipped"
      >
        <header class="lyrics-flip-card__header">
          <img
            class="lyrics-flip-card__cover"
            :src="card.coverUrl"
            :srcset="card.coverSrcset"
            alt=""
            loading="lazy"
          />
          <div class="lyrics-flip-card__header-copy">
            <strong class="lyrics-flip-card__title">{{ card.albumTitle }}</strong>
          </div>
        </header>

        <ul class="lyrics-flip-card__rows" role="list">
          <li v-for="track in card.tracks" :key="track.trackId" class="lyrics-flip-card__row-item">
            <button class="lyrics-flip-card__row" type="button" @click="selectTrack(track)">
              <span class="lyrics-flip-card__row-title">{{ track.title }}</span>
            </button>
          </li>
        </ul>
      </section>

      <section
        class="lyrics-flip-card__face lyrics-flip-card__face--back"
        :aria-hidden="!isFlipped"
      >
        <header class="lyrics-flip-card__back-header">
          <div class="lyrics-flip-card__back-copy">
            <strong class="lyrics-flip-card__title">{{ lyricsTitle }}</strong>
            <span class="lyrics-flip-card__credits">{{ selectedTrack?.credits }}</span>
          </div>
        </header>

        <div
          class="lyrics-flip-card__floating-controls"
          data-testid="lyrics-card-floating-controls"
        >
          <template v-if="hasChordData">
            <!-- "C#" circular toggle -->
            <button
              class="lyrics-flip-card__toggle"
              type="button"
              data-testid="lyrics-card-chords-toggle"
              :aria-pressed="showChords"
              :title="showChords ? t.lyrics.hideChords : t.lyrics.showChords"
              @click="toggleChords"
            >
              C#
            </button>
            <!-- Fretboard icon — opens/closes the chord rail -->
            <button
              v-if="showChords"
              class="lyrics-flip-card__collapse"
              type="button"
              data-testid="lyrics-card-chords-collapse"
              :aria-expanded="!isChordRailCollapsed"
              :aria-label="isChordRailCollapsed ? t.lyrics.expandChords : t.lyrics.collapseChords"
              :title="isChordRailCollapsed ? t.lyrics.expandChords : t.lyrics.collapseChords"
              @click="toggleChordRail"
            >
              <span aria-hidden="true" v-html="chordFretboardSvg" />
            </button>
          </template>
        </div>

        <!-- Full-screen expand/exit button — bottom-right -->
        <button
          v-if="props.canExpand"
          class="lyrics-flip-card__expand-btn"
          type="button"
          :aria-label="props.isExpanded ? 'Collapse card' : 'Expand card'"
          data-testid="lyrics-card-expand"
          @click.stop="emit('toggle-expand')"
        >
          <span
            class="lyrics-flip-card__expand-icon"
            aria-hidden="true"
            v-html="props.isExpanded ? fullscreenExitSvg : fullscreenEnterSvg"
          />
        </button>

        <!-- Expanded left sidebar: multi-column vertical chord grid (large screens, replaces top strip) -->
        <div
          v-if="hasChordData && showChords && !isChordRailCollapsed && props.isExpanded"
          ref="chordCarouselSidebar"
          class="lyrics-flip-card__chord-sidebar"
          data-testid="lyrics-card-chord-strip"
        >
          <button
            v-for="chord in carouselChords"
            :key="chord.name"
            class="lyrics-flip-card__chord-sidebar-item"
            :class="{ 'is-active': isSelectedChord(chord.name) }"
            :data-chord-name="chord.name"
            type="button"
            @click="handleChordSelection(chord.name, $event)"
          >
            <ChordFretboard
              :name="chord.definition?.displayName ?? chord.name"
              :diagram="chord.definition?.diagram ?? null"
              compact
            />
          </button>
        </div>

        <!-- Expanded top horizontal strip: shown on small screens only (hidden by CSS at large widths) -->
        <div
          v-if="hasChordData && showChords && !isChordRailCollapsed && props.isExpanded"
          ref="chordCarousel"
          class="lyrics-flip-card__chord-strip"
          data-testid="lyrics-card-chord-strip-top"
        >
          <button
            v-for="chord in carouselChords"
            :key="chord.name"
            class="lyrics-flip-card__chord-strip-item"
            :class="{ 'is-active': isSelectedChord(chord.name) }"
            :data-chord-name="chord.name"
            type="button"
            @click="handleChordSelection(chord.name, $event)"
          >
            <ChordFretboard
              :name="chord.definition?.displayName ?? chord.name"
              :diagram="chord.definition?.diagram ?? null"
              compact
            />
          </button>
        </div>

        <div v-if="isLoadingLyrics" class="lyrics-flip-card__loading">
          <AnimatedLoadingGlyph :size="28" :stroke-width="2.1" />
        </div>
        <template v-else>
          <div
            class="lyrics-flip-card__content-area"
            :class="{
              'lyrics-flip-card__content-area--expanded-layout': showExpandedChordPanel,
            }"
          >
            <div class="lyrics-flip-card__lyrics-pane">
              <div v-if="hasChordData && showChords" class="lyrics-flip-card__lyrics-rich">
                <div
                  v-for="entry in displayLines"
                  :key="entry.line.id"
                  class="lyrics-flip-card__line"
                  :class="{ 'has-break-before': entry.hasBreakBefore }"
                >
                  <div class="lyrics-flip-card__line-content">
                    <span
                      v-for="(word, wordIndex) in entry.line.words"
                      :key="`${entry.line.id}-${wordIndex}`"
                      class="lyrics-flip-card__word-stack"
                    >
                      <span class="lyrics-flip-card__word-chords">
                        <button
                          v-for="chord in lineWordChords(entry.line, wordIndex)"
                          :key="chord.id"
                          class="lyrics-flip-card__inline-chord"
                          :class="{ 'is-active': isSelectedChord(chord.name) }"
                          type="button"
                          @click="handleChordSelection(chord.name, $event)"
                        >
                          {{ chord.name }}
                        </button>
                      </span>
                      <span class="lyrics-flip-card__word">{{ word.text }}</span>
                    </span>
                  </div>
                </div>
              </div>

              <pre v-else class="lyrics-flip-card__lyrics-text">{{ lyricsText }}</pre>
            </div>

            <aside
              v-if="showExpandedChordPanel && selectedChord"
              class="lyrics-flip-card__chord-panel"
              data-testid="lyrics-card-chord-panel"
            >
              <ChordFretboard :name="selectedChord.name" :diagram="selectedChord.diagram" large />
            </aside>
          </div>
        </template>
      </section>
    </div>
  </article>
</template>

<style scoped>
.lyrics-flip-card {
  --card-pad: 0.95rem;
  --card-pad-expanded: 1.35rem;
  --card-border-r: 1rem;
  --card-controls-reserve: clamp(4.75rem, 24vw, 7.5rem);
  --lyrics-pane-max: 31rem;
  --lyrics-expanded-chord-w: 22rem;
  --about-card-title-font-size: clamp(1.1rem, 1vw, 1.2rem);
  --lyrics-card-contour: var(--lyrics-album-contour);
  width: min(var(--about-card-width-desktop), calc(100vw - 2rem));
  aspect-ratio: var(--about-card-aspect-ratio);
  border: 0;
  background: transparent;
  padding: 0;
  perspective: 1200px;
}

.lyrics-flip-card--expanded {
  width: 100%;
  height: 100%;
  aspect-ratio: auto;
}

.lyrics-flip-card__inner {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  transition: transform 0.56s cubic-bezier(0.2, 0.7, 0.3, 1);
  transform-style: preserve-3d;
}

.lyrics-flip-card--flipped .lyrics-flip-card__inner {
  transform: rotateY(180deg);
}

.lyrics-flip-card__face {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  gap: 0.78rem;
  border: 1px solid color-mix(in srgb, var(--lyrics-card-contour) 58%, transparent 42%);
  border-radius: var(--card-border-r);
  padding: var(--card-pad);
  box-sizing: border-box;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  transform-style: preserve-3d;
  background:
    linear-gradient(160deg, rgba(19, 5, 65, 0.985), rgba(45, 45, 68, 0.982)),
    linear-gradient(180deg, rgba(139, 79, 125, 0.18), rgba(10, 10, 18, 0.08));
  color: var(--color-text);
  box-shadow:
    0 18px 40px rgba(0, 0, 0, 0.5),
    0 0 12px color-mix(in srgb, var(--lyrics-card-contour) 26%, transparent 74%),
    inset 0 0 0 1px rgba(255, 255, 255, 0.04);
  overflow: hidden;
}

.lyrics-flip-card__face--front {
  transform: rotateY(0deg) translateZ(1px);
}

.lyrics-flip-card__face--back {
  transform: rotateY(180deg) translateZ(1px);
}

.lyrics-flip-card:not(.lyrics-flip-card--flipped) .lyrics-flip-card__face--back {
  visibility: hidden;
}

.lyrics-flip-card--flipped .lyrics-flip-card__face--front {
  visibility: hidden;
}

.lyrics-flip-card--flipped .lyrics-flip-card__face--back {
  visibility: visible;
}

.lyrics-flip-card__header {
  display: grid;
  grid-template-columns: 3.6rem 1fr;
  align-items: center;
  gap: 0.66rem;
}

.lyrics-flip-card__cover {
  width: 3.6rem;
  height: 3.6rem;
  border-radius: 0.56rem;
  object-fit: cover;
}

.lyrics-flip-card__header-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.lyrics-flip-card__title {
  margin: 0;
  font-family: 'Space Mono', monospace;
  font-size: var(--about-card-title-font-size);
  letter-spacing: 0em;
}

.lyrics-flip-card__subtitle,
.lyrics-flip-card__credits {
  font-family: 'Space Mono', monospace;
  font-size: 0.68rem;
  letter-spacing: 0.03em;
  color: var(--color-text-secondary);
}

.lyrics-flip-card__rows {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.lyrics-flip-card__row-item {
  margin: 0;
}

.lyrics-flip-card__row {
  width: 100%;
  border: 1px solid color-mix(in srgb, var(--lyrics-card-contour) 45%, transparent 55%);
  border-radius: 0.62rem;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.18), rgba(0, 0, 0, 0.3));
  color: var(--color-text);
  font-family: 'Space Mono', 'Courier New', monospace;
  font-size: 0.84rem;
  letter-spacing: 0.04em;
  text-align: left;
  padding: 0.42rem 0.56rem;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    transform 0.2s ease;
}

.lyrics-flip-card__row:hover,
.lyrics-flip-card__row:focus-visible {
  border-color: color-mix(in srgb, var(--lyrics-card-contour) 74%, #ffffff 26%);
  transform: translateX(1px);
  outline: none;
}

.lyrics-flip-card__back-header {
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  min-height: 3rem;
  padding-inline: var(--card-controls-reserve);
}

.lyrics-flip-card__back-copy {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.28rem;
  min-width: 0;
}

.lyrics-flip-card__floating-controls {
  position: absolute;
  top: var(--card-pad);
  right: var(--card-pad);
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: flex-start;
  gap: 0.35rem;
}

.lyrics-flip-card__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-height: 0;
}

.lyrics-flip-card__toggle,
.lyrics-flip-card__collapse,
.lyrics-flip-card__expand-btn,
.lyrics-flip-card__chord-item {
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: var(--color-text);
}

/* "C#" circular toggle — same dimensions as collapse/expand buttons */
.lyrics-flip-card__toggle {
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  cursor: pointer;
  white-space: nowrap;
  padding: 0;
}

.lyrics-flip-card__toggle[aria-pressed='true'] {
  border-color: var(--lyrics-card-tone-base);
  background: color-mix(in srgb, var(--lyrics-card-tone-base) 18%, rgba(255, 255, 255, 0.06));
}

/* Fretboard-icon collapse button — same circle size */
.lyrics-flip-card__collapse {
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.lyrics-flip-card__collapse[aria-expanded='true'] {
  border-color: var(--lyrics-card-tone-base);
  background: color-mix(in srgb, var(--lyrics-card-tone-base) 14%, rgba(255, 255, 255, 0.04));
}

.lyrics-flip-card__collapse :deep(svg) {
  width: 1.05rem;
  height: 1.05rem;
  display: block;
}

/* Bottom-right expand/exit button */
.lyrics-flip-card__expand-btn {
  position: absolute;
  bottom: var(--card-pad);
  right: var(--card-pad);
  z-index: 3;
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: var(--color-text);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.lyrics-flip-card__expand-icon :deep(svg) {
  width: 0.9rem;
  height: 0.9rem;
  display: block;
}

.lyrics-flip-card__content-area {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  flex: 1;
  min-height: 0;
  gap: 1rem;
  overflow: hidden;
}

.lyrics-flip-card__lyrics-pane {
  min-width: 0;
  min-height: 0;
  display: flex;
}

.lyrics-flip-card__chord-panel {
  min-height: 0;
  border: 1px solid color-mix(in srgb, var(--lyrics-card-contour) 44%, transparent 56%);
  border-radius: calc(var(--card-border-r) - 0.12rem);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.055), rgba(255, 255, 255, 0.03)),
    rgba(15, 9, 42, 0.44);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.03);
}

.lyrics-flip-card__chord-item {
  border-radius: 0.82rem;
  padding: 0.42rem 0.48rem;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    transform 0.2s ease;
}

.lyrics-flip-card__chord-item.is-active {
  border-color: var(--lyrics-card-tone-base);
  background: color-mix(in srgb, var(--lyrics-card-tone-base) 18%, rgba(255, 255, 255, 0.06));
}

.lyrics-flip-card__chord-item.is-active {
  transform: translateX(-1px);
}

.lyrics-flip-card__chord-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  padding: clamp(0.75rem, 1.6vw, 1.1rem);
}

/* ── Chord sidebar: visible in expanded mode on large screens ── */
.lyrics-flip-card__chord-sidebar {
  /* Hidden by default; CSS below reveals it at the appropriate breakpoint */
  display: none;
}

.lyrics-flip-card__chord-sidebar-item {
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 0.72rem;
  background: rgba(255, 255, 255, 0.04);
  color: var(--color-text);
  padding: 0.42rem 0.48rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    transform 0.2s ease;
}

.lyrics-flip-card__chord-sidebar-item.is-active {
  border-color: var(--lyrics-card-tone-base);
  background: color-mix(in srgb, var(--lyrics-card-tone-base) 18%, rgba(255, 255, 255, 0.06));
  transform: translateX(2px);
}

/* ── Horizontal chord strip (expanded small/medium screens only) ── */
.lyrics-flip-card__chord-strip {
  flex-shrink: 0;
  display: flex;
  flex-direction: row;
  gap: 0.45rem;
  overflow-x: auto;
  overflow-y: hidden;
  padding-block: 0.25rem;
  padding-inline: 0.1rem;
  scrollbar-width: none;
  scroll-snap-type: x mandatory;
}

.lyrics-flip-card__chord-strip::-webkit-scrollbar {
  display: none;
}

.lyrics-flip-card__chord-strip-item {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 0.72rem;
  background: rgba(255, 255, 255, 0.04);
  color: var(--color-text);
  padding: 0.28rem 0.32rem;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background 0.2s ease;
  scroll-snap-align: center;
}

.lyrics-flip-card__chord-strip-item.is-active {
  border-color: var(--lyrics-card-tone-base);
  background: color-mix(in srgb, var(--lyrics-card-tone-base) 18%, rgba(255, 255, 255, 0.06));
}

.lyrics-flip-card__lyrics-rich,
.lyrics-flip-card__lyrics-text {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding-inline: max(0.25rem, calc(50% - (var(--lyrics-pane-max) / 2)));
  padding-right: max(0.25rem, calc(50% - (var(--lyrics-pane-max) / 2)));
}

.lyrics-flip-card__lyrics-rich {
  display: block;
}

.lyrics-flip-card__line.has-break-before {
  margin-top: 0.8rem;
}

.lyrics-flip-card__line-content {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: flex-start;
  gap: 0.14rem 0;
  line-height: 1.42;
  font-family: 'Segoe UI', 'Noto Sans', 'Helvetica Neue', Arial, sans-serif;
  font-size: 0.78rem;
}

.lyrics-flip-card__word-stack {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  margin-right: 0.28em;
}

.lyrics-flip-card__word-chords {
  min-height: 1.08rem;
  display: flex;
  align-items: flex-end;
}

.lyrics-flip-card__inline-chord {
  border: none;
  border-radius: 0;
  background: transparent;
  color: rgba(255, 255, 255, 0.68);
  padding: 0;
  font-size: 0.72em;
  font-weight: 800;
  cursor: pointer;
}

.lyrics-flip-card__inline-chord.is-active {
  border-color: transparent;
  background: transparent;
  color: var(--lyrics-card-tone-base);
}

.lyrics-flip-card__word {
  display: inline-block;
}

.lyrics-flip-card__lyrics-text {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.42;
  text-align: left;
  font-family: 'Segoe UI', 'Noto Sans', 'Helvetica Neue', Arial, sans-serif;
  font-size: 0.78rem;
}

.lyrics-flip-card--expanded .lyrics-flip-card__face {
  padding: var(--card-pad-expanded);
}

.lyrics-flip-card--expanded .lyrics-flip-card__expand-btn {
  bottom: var(--card-pad-expanded);
  right: var(--card-pad-expanded);
}

.lyrics-flip-card--expanded .lyrics-flip-card__floating-controls {
  top: var(--card-pad-expanded);
  right: var(--card-pad-expanded);
}

.lyrics-flip-card--expanded .lyrics-flip-card__back-header {
  min-height: 3.8rem;
  padding-inline: clamp(5rem, 12vw, 9rem);
}

.lyrics-flip-card--expanded .lyrics-flip-card__credits {
  font-size: 0.78rem;
}

.lyrics-flip-card--expanded .lyrics-flip-card__line-content,
.lyrics-flip-card--expanded .lyrics-flip-card__lyrics-text {
  font-size: clamp(1.62rem, 2.15vw, 1.98rem);
  line-height: 1.5;
  font-weight: 700;
}

.lyrics-flip-card--expanded .lyrics-flip-card__inline-chord {
  font-size: 0.54em;
}

.lyrics-flip-card--expanded .lyrics-flip-card__lyrics-rich,
.lyrics-flip-card--expanded .lyrics-flip-card__lyrics-text {
  padding-inline: max(0.35rem, calc(50% - 16rem));
}

.lyrics-flip-card--expanded .lyrics-flip-card__title {
  font-size: clamp(1.75rem, 2.5vw, 2.3rem);
}

/* In 2-col layout, lyrics fill the left column — no centering restriction */
.lyrics-flip-card--expanded
  .lyrics-flip-card__content-area--expanded-layout
  .lyrics-flip-card__lyrics-rich,
.lyrics-flip-card--expanded
  .lyrics-flip-card__content-area--expanded-layout
  .lyrics-flip-card__lyrics-text {
  padding-inline: 0.35rem;
}

@media (min-width: 1100px) {
  .lyrics-flip-card__content-area--expanded-layout {
    grid-template-columns: minmax(0, 1fr) minmax(18rem, var(--lyrics-expanded-chord-w));
    align-items: stretch;
  }
}

/* ── Expanded large-screen: left chord sidebar replaces top strip ── */
@media (min-width: 1100px) {
  /* Restructure the expanded back-face as a grid: [sidebar] [header+lyrics+chord-panel] */
  .lyrics-flip-card--expanded .lyrics-flip-card__face--back {
    display: grid;
    grid-template-columns: auto 1fr;
    grid-template-rows: auto auto 1fr;
    padding: 0;
    gap: 0;
  }

  /* Sidebar spans all rows on the left */
  .lyrics-flip-card--expanded .lyrics-flip-card__chord-sidebar {
    display: grid;
    /* Fill as many fretboard columns as fit */
    grid-template-columns: repeat(auto-fill, calc(6 * 0.88rem + 2 * 0.48rem));
    align-content: start;
    gap: 0.42rem;
    grid-row: 1 / -1;
    grid-column: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 0.9rem calc(0.42rem / 2) 0.9rem 0.85rem;
    scrollbar-width: none;
    border-right: 1px solid rgba(255, 255, 255, 0.07);
    background: rgba(0, 0, 0, 0.15);
    scroll-padding-block: 50%;
  }

  .lyrics-flip-card--expanded .lyrics-flip-card__chord-sidebar::-webkit-scrollbar {
    display: none;
  }

  /* Header, floating controls, expand btn, content area live in column 2 */
  .lyrics-flip-card--expanded .lyrics-flip-card__back-header {
    grid-column: 2;
    grid-row: 1;
    padding: var(--card-pad-expanded);
    min-height: 3.8rem;
    padding-inline: clamp(5rem, 12vw, 9rem);
  }

  .lyrics-flip-card--expanded .lyrics-flip-card__floating-controls {
    grid-column: 2;
    grid-row: 1;
    top: var(--card-pad-expanded);
    right: var(--card-pad-expanded);
  }

  .lyrics-flip-card--expanded .lyrics-flip-card__expand-btn {
    grid-column: 2;
    grid-row: 1 / -1; /* positioned absolutely within the card */
  }

  .lyrics-flip-card--expanded .lyrics-flip-card__loading,
  .lyrics-flip-card--expanded .lyrics-flip-card__content-area {
    grid-column: 2;
    grid-row: 2 / -1;
    padding: 0 var(--card-pad-expanded) var(--card-pad-expanded);
  }

  /* Top horizontal strip is hidden when the sidebar is shown */
  .lyrics-flip-card--expanded .lyrics-flip-card__chord-strip {
    display: none;
  }
}

@media (max-width: 979px) {
  .lyrics-flip-card__chord-panel {
    max-height: 20rem;
  }
}

@media (max-width: 767px) {
  .lyrics-flip-card {
    width: min(var(--about-card-width-mobile), calc(100vw - 2rem));
    --card-controls-reserve: clamp(4rem, 34vw, 6rem);
  }

  .lyrics-flip-card__back-header {
    min-height: 3.25rem;
  }
}
</style>
