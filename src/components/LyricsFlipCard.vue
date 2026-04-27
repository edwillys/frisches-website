<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import AnimatedLoadingGlyph from './AnimatedLoadingGlyph.vue'
import { useUiText } from '@/composables/useUiText'
import type { LyricsData } from '@/types/lyrics'
import type { LyricsAlbumCard, LyricsAlbumTrack } from '@/types/lyricsAlbumCard'

interface Props {
  card: LyricsAlbumCard
  backSignal?: number
}

const props = withDefaults(defineProps<Props>(), {
  backSignal: 0,
})

const t = useUiText()

const emit = defineEmits<{
  (e: 'detail-open-change', isOpen: boolean): void
}>()

const selectedTrackId = ref(props.card.tracks[0]?.trackId ?? '')
const isFlipped = ref(false)
const isLoadingLyrics = ref(false)
const lyricsText = ref('')
const lyricsTitle = ref(props.card.tracks[0]?.title ?? '')

const lyricsCache = ref<Record<string, { title: string; text: string }>>({})

let activeFetchController: AbortController | null = null

const cardStyle = computed(() => ({
  '--lyrics-card-tone-base': props.card.themeColor,
  '--lyrics-card-tone-dark': props.card.themeColorDark,
}))

const selectedTrack = computed<LyricsAlbumTrack | null>(
  () => props.card.tracks.find((track) => track.trackId === selectedTrackId.value) ?? null
)

const SECTION_BREAK_GAP_MS = 900

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

    const previousFormattedLine = formatted.at(-1) ?? ''

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
  const cached = lyricsCache.value[track.trackId]
  if (cached) {
    lyricsTitle.value = cached.title
    lyricsText.value = cached.text
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
      return
    }

    const json = (await response.json()) as LyricsData
    const { title, text } = formatLyricsText(json, track.title)

    lyricsCache.value = {
      ...lyricsCache.value,
      [track.trackId]: {
        title,
        text,
      },
    }

    lyricsTitle.value = title
    lyricsText.value = text
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return
    lyricsTitle.value = track.title
    lyricsText.value = t.value.music.noLyricsForTrack
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
  await loadLyricsForTrack(track)
}

const showTrackList = () => {
  isFlipped.value = false
  emit('detail-open-change', false)
}

watch(
  () => props.backSignal,
  () => {
    if (isFlipped.value) {
      showTrackList()
    }
  }
)
</script>

<template>
  <article
    class="lyrics-flip-card"
    :class="{ 'lyrics-flip-card--flipped': isFlipped }"
    :style="cardStyle"
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
            :alt="`${card.albumTitle} ${t.music.albumLabel}`"
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

        <div v-if="isLoadingLyrics" class="lyrics-flip-card__loading">
          <AnimatedLoadingGlyph :size="28" :stroke-width="2.1" />
        </div>
        <pre v-else class="lyrics-flip-card__lyrics-text">{{ lyricsText }}</pre>
      </section>
    </div>
  </article>
</template>

<style scoped>
.lyrics-flip-card {
  --about-card-title-font-size: clamp(1.1rem, 1vw, 1.2rem);
  --lyrics-card-contour: var(--lyrics-album-contour);
  width: min(var(--about-card-width-desktop), calc(100vw - 2rem));
  aspect-ratio: var(--about-card-aspect-ratio);
  border: 0;
  background: transparent;
  padding: 0;
  perspective: 1200px;
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
  gap: 0.68rem;
  border: 1px solid color-mix(in srgb, var(--lyrics-card-contour) 58%, transparent 42%);
  border-radius: 1rem;
  padding: 0.95rem;
  backface-visibility: hidden;
  background: linear-gradient(160deg, rgba(19, 5, 65, 0.96), rgba(45, 45, 68, 0.95));
  color: var(--color-text);
  box-shadow:
    0 18px 40px rgba(0, 0, 0, 0.5),
    0 0 12px color-mix(in srgb, var(--lyrics-card-contour) 26%, transparent 74%),
    inset 0 0 0 1px rgba(255, 255, 255, 0.04);
}

.lyrics-flip-card__face--back {
  transform: rotateY(180deg);
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
  font-size: 0.74rem;
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
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 2rem;
}

.lyrics-flip-card__back-copy {
  text-align: center;
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 0.22rem;
}

.lyrics-flip-card__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
}

.lyrics-flip-card__lyrics-text {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.35;
  text-align: left;
  font-family: 'Segoe UI', 'Noto Sans', 'Helvetica Neue', Arial, sans-serif;
  font-size: 0.72rem;
  overflow: auto;
  flex: 1;
  padding-right: 0.15rem;
}

@media (max-width: 767px) {
  .lyrics-flip-card {
    width: min(var(--about-card-width-mobile), calc(100vw - 2rem));
  }
}
</style>
