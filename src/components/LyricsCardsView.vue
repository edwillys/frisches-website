<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'

import { useLyricsCards } from '@/composables/useLyricsCards'
import AnimatedLoadingGlyph from './AnimatedLoadingGlyph.vue'
import ChordFretboard from './ChordFretboard.vue'
import LyricsFlipCard from './LyricsFlipCard.vue'
import type { ResolvedLyricsChord } from '@/types/lyrics'

interface Props {
  isActive?: boolean
  backSignal?: number
}

const props = withDefaults(defineProps<Props>(), {
  isActive: false,
  backSignal: 0,
})

const emit = defineEmits<{
  (e: 'detail-open-change', isOpen: boolean): void
  (e: 'expand-change', isExpanded: boolean): void
}>()

const lyricsCards = useLyricsCards()
const isExpanded = ref(false)

watch(isExpanded, (val) => {
  emit('expand-change', val)
})
const cardRef = ref<InstanceType<typeof LyricsFlipCard> | null>(null)
const chordRailRef = ref<HTMLElement | null>(null)
const stageRef = ref<HTMLElement | null>(null)
const mainCardCellRef = ref<HTMLElement | null>(null)

function toggleExpand() {
  isExpanded.value = !isExpanded.value
}

function handleStageClick(event: MouseEvent) {
  if (!isExpanded.value) return
  // If the click target is the stage itself (not a child of the card), collapse.
  const cardEl = (cardRef.value as unknown as { $el?: HTMLElement })?.$el
  if (cardEl && !cardEl.contains(event.target as Node)) {
    isExpanded.value = false
  }
}

function handleDetailOpenChange(isOpen: boolean) {
  if (!isOpen && isExpanded.value) {
    isExpanded.value = false
  }

  emit('detail-open-change', isOpen)
}

// --- Chord rail (sibling card) ---
// Access state exposed from LyricsFlipCard via the component instance proxy.
// The instance proxy auto-unwraps reactive refs, so these are plain values.
const showRail = computed<boolean>(() => cardRef.value?.showCompactChordRail ?? false)

const railRequested = computed<boolean>(() => cardRef.value?.compactChordRailRequested ?? false)

const reserveRailSlot = computed<boolean>(() => cardRef.value?.reserveCompactChordRailSlot ?? false)

const isRailFlipped = computed<boolean>(() => cardRef.value?.compactChordRailFlipped ?? false)

const isRailLoading = computed<boolean>(() => cardRef.value?.compactChordRailLoading ?? false)

const railChords = computed<ResolvedLyricsChord[]>(() => cardRef.value?.carouselChords ?? [])

const activeChordId = computed<string | null>(() => cardRef.value?.selectedChordId ?? null)

function handleRailChordClick(chordName: string, event: MouseEvent) {
  event.stopPropagation()
  cardRef.value?.handleChordSelection(chordName)
}

// Center active chord in the vertical rail whenever it changes
watch(
  activeChordId,
  (name) => {
    if (!name || !chordRailRef.value) return
    void nextTick(() => {
      const rail = chordRailRef.value
      if (!rail) return
      const safe = name.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
      const btn = rail.querySelector(`[data-chord-name="${safe}"]`) as HTMLElement | null
      if (!btn) return

      const targetTop = btn.offsetTop - rail.clientHeight / 2 + btn.clientHeight / 2
      rail.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' })
    })
  },
  { immediate: true }
)

watch([reserveRailSlot, isExpanded], ([isReserved, expanded], [wasReserved]) => {
  if (expanded || isReserved === wasReserved) return

  const stage = stageRef.value
  const cardCell = mainCardCellRef.value
  if (!stage || !cardCell) return

  const initialLeft = cardCell.getBoundingClientRect().left

  void nextTick(() => {
    const nextStage = stageRef.value
    const nextCardCell = mainCardCellRef.value
    if (!nextStage || !nextCardCell || isExpanded.value) return

    const delta = nextCardCell.getBoundingClientRect().left - initialLeft
    if (Math.abs(delta) > 0.5) {
      nextStage.scrollLeft += delta
    }
  })
})
</script>

<template>
  <section
    class="lyrics-cards"
    :class="{ 'lyrics-cards--expanded': isExpanded }"
    data-testid="lyrics-cards-view"
  >
    <div
      ref="stageRef"
      class="lyrics-cards__stage"
      :class="{ 'lyrics-cards__stage--expanded': isExpanded }"
      data-testid="lyrics-cards-carousel"
      @click="handleStageClick"
    >
      <div
        v-if="lyricsCards"
        class="lyrics-cards__track"
        :class="{
          'lyrics-cards__track--expanded': isExpanded,
          'lyrics-cards__track--rail-reserved': reserveRailSlot && !isExpanded,
        }"
      >
        <div
          ref="mainCardCellRef"
          class="lyrics-cards__cell"
          :class="{ 'lyrics-cards__cell--expanded': isExpanded }"
          data-about-card
        >
          <LyricsFlipCard
            ref="cardRef"
            :card="lyricsCards"
            :back-signal="props.backSignal"
            :can-expand="true"
            :is-expanded="isExpanded"
            @detail-open-change="handleDetailOpenChange"
            @toggle-expand="toggleExpand"
          />
        </div>

        <div
          v-if="reserveRailSlot && !isExpanded"
          class="lyrics-cards__cell lyrics-cards__cell--rail"
          data-about-card
        >
          <article
            v-if="railRequested || isRailFlipped || isRailLoading"
            class="lyrics-chord-rail-card"
            :class="{ 'lyrics-chord-rail-card--flipped': isRailFlipped }"
            :style="{ '--rail-tone': lyricsCards.themeColor }"
            data-testid="lyrics-chord-rail-card"
            aria-label="Chord diagrams"
          >
            <div class="lyrics-chord-rail-card__inner">
              <section
                class="lyrics-chord-rail-card__face lyrics-chord-rail-card__face--front"
                :aria-hidden="isRailFlipped"
              />

              <section
                class="lyrics-chord-rail-card__face lyrics-chord-rail-card__face--back"
                :aria-hidden="!isRailFlipped"
              >
                <div
                  v-if="isRailLoading"
                  class="lyrics-chord-rail__loading"
                  data-testid="lyrics-card-chords-rail-loading"
                >
                  <AnimatedLoadingGlyph :size="28" :stroke-width="2.1" />
                </div>
                <div
                  v-else-if="showRail"
                  ref="chordRailRef"
                  class="lyrics-chord-rail"
                  data-testid="lyrics-card-chords-rail"
                >
                  <button
                    v-for="chord in railChords"
                    :key="chord.name"
                    class="lyrics-chord-rail__item"
                    :class="{ 'is-active': chord.name === activeChordId }"
                    :data-chord-name="chord.name"
                    type="button"
                    @click="handleRailChordClick(chord.name, $event)"
                  >
                    <ChordFretboard
                      :name="chord.definition?.displayName ?? chord.definition?.name ?? chord.name"
                      :diagram="chord.definition?.diagram ?? null"
                      compact
                    />
                  </button>
                </div>
              </section>
            </div>
          </article>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.lyrics-cards {
  --lyrics-cards-card-width: var(--about-card-width-desktop);
  --lyrics-cards-card-width-mobile: var(--about-card-width-mobile);
  --lyrics-cards-cell-max-width: calc(100vw - 2rem);
  --lyrics-cards-cell-width: min(
    var(--lyrics-cards-card-width),
    var(--lyrics-cards-cell-max-width)
  );
  --lyrics-cards-padding-block: clamp(0.2rem, 0.8vw, 0.5rem);
  --lyrics-cards-padding-inline: clamp(0.4rem, 1vw, 0.8rem);
  --lyrics-cards-carousel-gap: var(--about-card-gap);
  --lyrics-cards-carousel-scroll-padding: var(--about-track-inline-padding);
  --lyrics-cards-carousel-min-height: 300px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-height: 0;
  margin: 0 auto;
  padding: var(--lyrics-cards-padding-block) var(--lyrics-cards-padding-inline);
  box-sizing: border-box;
}

.lyrics-cards--expanded {
  padding: 0;
}

.lyrics-cards__stage {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: var(--lyrics-cards-carousel-gap);
  width: 100%;
  height: 100%;
  min-height: var(--lyrics-cards-carousel-min-height);
  overflow-x: auto;
  overflow-y: scroll;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;
  overscroll-behavior-y: contain;
  touch-action: pan-x pan-y;
  padding-inline: var(--lyrics-cards-carousel-scroll-padding);
  padding-block: 0.4rem calc(var(--mini-player-offset, 0px) + 0.4rem);
  scrollbar-width: none;
  scrollbar-gutter: stable both-edges;
}

.lyrics-cards__stage--expanded {
  align-items: stretch;
  justify-content: flex-start;
  gap: 0;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  box-sizing: border-box;
  padding-inline: 0;
  padding-block: 0 var(--mini-player-offset, 0px);
}

.lyrics-cards__stage::-webkit-scrollbar {
  display: none;
}

.lyrics-cards__track {
  display: flex;
  align-items: flex-start;
  gap: var(--lyrics-cards-carousel-gap);
  min-width: max-content;
}

.lyrics-cards__track--expanded {
  width: 100%;
  min-width: 100%;
  gap: 0;
}

.lyrics-cards__cell {
  flex: 0 0 var(--lyrics-cards-cell-width);
  width: var(--lyrics-cards-cell-width);
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-block: auto;
  scroll-snap-align: center;
}

.lyrics-cards__cell--expanded {
  flex: 1 0 100%;
  width: 100%;
  height: 100%;
  max-width: none;
  align-self: stretch;
  margin-block: 0;
}

.lyrics-cards__cell--rail {
  align-items: stretch;
  position: relative;
}

.lyrics-cards__cell--rail:empty {
  min-height: calc(var(--lyrics-cards-cell-width) / (5 / 8));
}

/* ── Chord rail card ── */
.lyrics-chord-rail-card {
  width: 100%;
  height: 100%;
  aspect-ratio: var(--about-card-aspect-ratio);
  border: 0;
  background: transparent;
  padding: 0;
  perspective: 1200px;
}

.lyrics-chord-rail-card__inner {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  transition: transform 0.56s cubic-bezier(0.2, 0.7, 0.3, 1);
  transform-style: preserve-3d;
}

.lyrics-chord-rail-card--flipped .lyrics-chord-rail-card__inner {
  transform: rotateY(180deg);
}

.lyrics-chord-rail-card__face {
  position: absolute;
  inset: 0;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-radius: 1rem;
  box-sizing: border-box;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  transform-style: preserve-3d;
  overflow: hidden;
}

.lyrics-chord-rail-card__face--front {
  transform: rotateY(0deg) translateZ(1px);
  background: transparent;
}

.lyrics-chord-rail-card__face--back {
  transform: rotateY(180deg) translateZ(1px);
  border: 1px solid
    color-mix(in srgb, var(--rail-tone, var(--lyrics-album-contour)) 55%, transparent 45%);
  background:
    linear-gradient(160deg, rgba(19, 5, 65, 0.985), rgba(45, 45, 68, 0.982)),
    linear-gradient(180deg, rgba(139, 79, 125, 0.18), rgba(10, 10, 18, 0.08));
  box-shadow:
    0 18px 40px rgba(0, 0, 0, 0.5),
    0 0 12px color-mix(in srgb, var(--rail-tone, var(--lyrics-album-contour)) 22%, transparent 78%),
    inset 0 0 0 1px rgba(255, 255, 255, 0.04);
  padding: 0.55rem 0.45rem;
}

.lyrics-chord-rail-card:not(.lyrics-chord-rail-card--flipped) .lyrics-chord-rail-card__face--back {
  visibility: hidden;
}

.lyrics-chord-rail-card--flipped .lyrics-chord-rail-card__face--front {
  visibility: hidden;
}

.lyrics-chord-rail-card--flipped .lyrics-chord-rail-card__face--back {
  visibility: visible;
}

.lyrics-chord-rail__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-height: 0;
}

/* ── Vertical scrollable chord grid ── */
.lyrics-chord-rail {
  display: grid;
  /* Auto-fill columns; each item is one fretboard-button wide */
  grid-template-columns: repeat(auto-fill, calc(6 * 0.88rem + 2 * 0.48rem));
  justify-content: center;
  align-content: start;
  gap: 0.45rem;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  /* large padding-block creates a buffer so the active item can scroll to center */
  padding-block: 3rem;
  scroll-padding-block: 50%;
  scrollbar-width: none;
}

.lyrics-chord-rail::-webkit-scrollbar {
  display: none;
}

/* ── Individual chord card buttons ── */
.lyrics-chord-rail__item {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 0.82rem;
  background: rgba(255, 255, 255, 0.05);
  color: var(--color-text);
  padding: 0.42rem 0.48rem;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    transform 0.2s ease;
  scroll-snap-align: center;
}

.lyrics-chord-rail__item.is-active {
  border-color: var(--rail-tone, var(--lyrics-album-contour));
  background: color-mix(
    in srgb,
    var(--rail-tone, var(--lyrics-album-contour)) 18%,
    rgba(255, 255, 255, 0.06)
  );
  transform: scale(1.04);
}

/* ── Flip-in / flip-out animation for the chord rail card ── */
@media (min-width: 1051px) {
  .lyrics-cards__track--rail-reserved {
    transform: none;
  }
}

@media (max-width: 1050px) {
  .lyrics-cards__stage {
    justify-content: flex-start;
  }
}

@media (max-width: 767px) {
  .lyrics-cards {
    --lyrics-cards-card-width: var(--lyrics-cards-card-width-mobile);
  }

  .lyrics-cards:not(.lyrics-cards--expanded) .lyrics-cards__stage {
    align-items: center;
  }

  .lyrics-cards__cell {
    flex-basis: var(--lyrics-cards-cell-width);
    width: var(--lyrics-cards-cell-width);
  }

  .lyrics-chord-rail-card {
    width: 100%;
  }
}
</style>
