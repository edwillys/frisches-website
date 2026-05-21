<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'

import { useLyricsCards } from '@/composables/useLyricsCards'
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
}>()

const lyricsCards = useLyricsCards()
const isExpanded = ref(false)
const cardRef = ref<InstanceType<typeof LyricsFlipCard> | null>(null)
const chordRailRef = ref<HTMLElement | null>(null)

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

// --- Chord rail (sibling card) ---
// Access state exposed from LyricsFlipCard via the component instance proxy.
// The instance proxy auto-unwraps reactive refs, so these are plain values.
const showRail = computed<boolean>(() => cardRef.value?.showCompactChordRail ?? false)

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
      const safe = name.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
      const btn = chordRailRef.value?.querySelector(
        `[data-chord-name="${safe}"]`
      ) as HTMLElement | null
      if (btn && typeof btn.scrollIntoView === 'function') {
        btn.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    })
  },
  { immediate: true }
)
</script>

<template>
  <section class="lyrics-cards" data-testid="lyrics-cards-view">
    <div
      class="lyrics-cards__stage"
      :class="{ 'lyrics-cards__stage--expanded': isExpanded }"
      data-testid="lyrics-cards-carousel"
      @click="handleStageClick"
    >
      <div
        v-if="lyricsCards"
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
          @detail-open-change="emit('detail-open-change', $event)"
          @toggle-expand="toggleExpand"
        />
      </div>

      <Transition name="chord-rail-flip">
        <div
          v-if="lyricsCards && showRail && !isExpanded"
          class="lyrics-cards__cell lyrics-cards__cell--rail"
          data-about-card
        >
          <aside
            class="lyrics-chord-rail-card"
            :style="{ '--rail-tone': lyricsCards.themeColor }"
            data-testid="lyrics-chord-rail-card"
            aria-label="Chord diagrams"
          >
            <div ref="chordRailRef" class="lyrics-chord-rail" data-testid="lyrics-card-chords-rail">
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
                  :name="chord.definition?.displayName ?? chord.name"
                  :diagram="chord.definition?.diagram ?? null"
                  compact
                />
              </button>
            </div>
          </aside>
        </div>
      </Transition>
    </div>
  </section>
</template>

<style scoped>
.lyrics-cards {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-height: 0;
  margin: 0 auto;
  padding: 0;
  box-sizing: border-box;
  overflow-x: hidden;
}

.lyrics-cards__stage {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow-x: auto;
  overflow-y: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;
  overscroll-behavior-y: contain;
  touch-action: pan-x pan-y;
  padding-inline: var(--about-track-inline-padding);
  padding-block: 0.4rem calc(var(--mini-player-offset, 0px) + 0.4rem);
  scrollbar-width: none;
}

.lyrics-cards__stage--expanded {
  align-items: stretch;
  justify-content: flex-start;
  overflow-x: hidden;
  overflow-y: auto;
  box-sizing: border-box;
  padding-inline: 0;
}

.lyrics-cards__stage::-webkit-scrollbar {
  display: none;
}

.lyrics-cards__cell {
  flex: 0 0 min(var(--about-card-width-desktop), calc(100vw - 2rem));
  width: min(var(--about-card-width-desktop), calc(100vw - 2rem));
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
}

/* ── Chord rail card ── */
/*
 * Same card appearance AND dimensions as .lyrics-flip-card (standard site card).
 * Width + aspect-ratio mirrors the lyrics flip card exactly.
 */
.lyrics-chord-rail-card {
  width: 100%;
  aspect-ratio: var(--about-card-aspect-ratio);
  flex-shrink: 0;
  border: 1px solid
    color-mix(in srgb, var(--rail-tone, var(--lyrics-album-contour)) 55%, transparent 45%);
  border-radius: 1rem;
  background:
    linear-gradient(160deg, rgba(19, 5, 65, 0.985), rgba(45, 45, 68, 0.982)),
    linear-gradient(180deg, rgba(139, 79, 125, 0.18), rgba(10, 10, 18, 0.08));
  box-shadow:
    0 18px 40px rgba(0, 0, 0, 0.5),
    0 0 12px color-mix(in srgb, var(--rail-tone, var(--lyrics-album-contour)) 22%, transparent 78%),
    inset 0 0 0 1px rgba(255, 255, 255, 0.04);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 0.55rem 0.45rem;
  box-sizing: border-box;
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
.chord-rail-flip-enter-active,
.chord-rail-flip-leave-active {
  transition: transform 0.56s cubic-bezier(0.2, 0.7, 0.3, 1);
  transform-origin: left center;
}

.chord-rail-flip-enter-from {
  transform: rotateY(-90deg);
}

.chord-rail-flip-enter-to {
  transform: rotateY(0deg);
}

.chord-rail-flip-leave-from {
  transform: rotateY(0deg);
}

.chord-rail-flip-leave-to {
  transform: rotateY(90deg);
}

@media (max-width: 767px) {
  .lyrics-cards__cell {
    flex-basis: min(var(--about-card-width-mobile), calc(100vw - 2rem));
    width: min(var(--about-card-width-mobile), calc(100vw - 2rem));
  }

  .lyrics-chord-rail-card {
    width: 100%;
  }
}
</style>
