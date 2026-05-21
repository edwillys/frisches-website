<script setup lang="ts">
import { computed } from 'vue'

import type { LyricsChordDiagram } from '@/types/lyrics'

interface Props {
  name: string
  diagram?: LyricsChordDiagram | null
  compact?: boolean
  large?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  diagram: null,
  compact: false,
  large: false,
})

const FRET_ROWS = 5

const stringCount = computed(() => Math.max(props.diagram?.frets.length ?? 0, 6))

const startFret = computed(() => props.diagram?.baseFret ?? 1)

const needsPositionLabel = computed(() => startFret.value > 1)

const markers = computed(() => {
  const frets = props.diagram?.frets ?? []
  const fingers = props.diagram?.fingers ?? []
  const start = startFret.value

  return frets
    .map((fret, stringIndex) => {
      if (fret === 'x' || fret === 0 || fret === null) return null
      const relativeFret = Math.max(1, Number(fret) - start + 1)
      if (relativeFret > FRET_ROWS) return null
      return {
        stringIndex,
        row: relativeFret,
        finger: (fingers[stringIndex] as number | undefined) ?? null,
      }
    })
    .filter((m): m is { stringIndex: number; row: number; finger: number | null } => m !== null)
})

const totalCells = computed(() => stringCount.value * FRET_ROWS)

/** Per-string nut indicator state */
const nutStates = computed(() =>
  (props.diagram?.frets ?? []).map((fret) => {
    if (fret === 'x') return 'muted' as const
    if (fret === 0) return 'open' as const
    if (fret === null) return 'none' as const
    return 'fretted' as const
  })
)
</script>

<template>
  <div
    class="chord-fretboard"
    :class="{
      'chord-fretboard--compact': compact,
      'chord-fretboard--large': large,
    }"
    :style="{ '--cols': stringCount }"
  >
    <div class="chord-fretboard__name">{{ name }}</div>

    <div v-if="diagram" class="chord-fretboard__frame">
      <!-- Top row: fret position label or blank spacer (keeps height consistent) -->
      <div class="chord-fretboard__top-row">
        <span v-if="needsPositionLabel" class="chord-fretboard__position-label">
          {{ diagram.baseFret }}fr
        </span>
      </div>

      <!-- Fretboard: cells layer + marker overlay layer -->
      <div
        class="chord-fretboard__board"
        :class="{ 'chord-fretboard__board--has-nut': !needsPositionLabel }"
      >
        <!-- Grid cells provide fret/string line borders -->
        <div class="chord-fretboard__cells" aria-hidden="true">
          <span
            v-for="cellIndex in totalCells"
            :key="`cell-${cellIndex}`"
            class="chord-fretboard__cell"
          />
        </div>

        <!-- Marker overlay: same grid dimensions, absolute positioned -->
        <div class="chord-fretboard__markers-layer" aria-hidden="true">
          <span
            v-for="marker in markers"
            :key="`marker-${marker.stringIndex}-${marker.row}`"
            class="chord-fretboard__marker"
            :style="{ gridColumn: marker.stringIndex + 1, gridRow: marker.row }"
          >
            <span v-if="marker.finger !== null" class="chord-fretboard__finger">{{
              marker.finger
            }}</span>
          </span>
        </div>
      </div>

      <!-- Per-string indicators: ● open  ○ fretted  × muted -->
      <div class="chord-fretboard__nuts">
        <span
          v-for="(state, idx) in nutStates"
          :key="`nut-${idx}`"
          class="chord-fretboard__nut"
          :class="`chord-fretboard__nut--${state}`"
          aria-hidden="true"
        >
          {{ state === 'muted' ? '×' : state === 'open' ? '●' : state === 'fretted' ? '○' : '' }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
 * ── Design tokens (compact = default, large = override) ──
 * All sizing derived from these variables; no magic numbers below.
 */
.chord-fretboard {
  /* cell dimensions */
  --chord-cell-w: 0.88rem;
  --chord-cell-h: 0.82rem;
  /* marker circle diameter */
  --chord-marker-d: 0.6rem;
  /* typography */
  --chord-name-fs: 0.7rem;
  --chord-pos-fs: 0.44rem;
  --chord-top-h: 0.65rem;
  --chord-nut-fs: 0.5rem;
  --chord-nut-h: 0.65rem;
  --chord-finger-fs: 0.27rem;
  /* nut bar thickness */
  --chord-nut-line: 0.18rem;
  --chord-nut-ink: rgba(255, 255, 255, 0.55);

  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
}

.chord-fretboard--large {
  --chord-cell-w: 1.76rem;
  --chord-cell-h: 1.68rem;
  --chord-marker-d: 1.25rem;
  --chord-name-fs: 1.22rem;
  --chord-pos-fs: 0.82rem;
  --chord-top-h: 1.2rem;
  --chord-nut-fs: 0.85rem;
  --chord-nut-h: 1.1rem;
  --chord-finger-fs: 0.56rem;
  --chord-nut-line: 0.32rem;
  gap: 0.25rem;
}

/* ── Chord name ── */
.chord-fretboard__name {
  font-size: var(--chord-name-fs);
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

/*
 * ── Frame: wraps top-row + board + nuts ──
 * Width is fixed so all carousel items share the same footprint.
 */
.chord-fretboard__frame {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: calc(var(--cols, 6) * var(--chord-cell-w));
}

/* ── Top row: constant-height spacer / position label ── */
.chord-fretboard__top-row {
  height: var(--chord-top-h);
  display: flex;
  align-items: flex-end;
  padding-bottom: 0.04rem;
  flex-shrink: 0;
}

.chord-fretboard__position-label {
  font-size: var(--chord-pos-fs);
  line-height: 1;
  color: rgba(255, 255, 255, 0.65);
  font-family: monospace;
  padding-left: 0.06rem;
}

/* ── Board wrapper ── */
.chord-fretboard__board {
  position: relative;
  width: calc(var(--cols, 6) * var(--chord-cell-w));
  /* Nut bar: visible only for open-position chords */
  border-top: var(--chord-nut-line) solid transparent;
}

.chord-fretboard__board--has-nut {
  border-top-color: rgba(255, 255, 255, 0.82);
}

/* ── Cells layer – fret lines + centered string lines ── */
.chord-fretboard__cells {
  display: grid;
  grid-template-columns: repeat(var(--cols, 6), var(--chord-cell-w));
  grid-template-rows: repeat(5, var(--chord-cell-h));
}

.chord-fretboard__cell {
  position: relative;
  /* Horizontal fret line at the bottom of each row */
  border-bottom: 1px solid rgba(255, 255, 255, 0.22);
}

/* No fret line below the last row */
.chord-fretboard__cell:nth-last-child(-n + 6) {
  border-bottom: none;
}

/*
 * Vertical string line: centered within the column via a pseudo-element.
 * Using border-right would place the line at the column EDGE, not center.
 */
.chord-fretboard__cell::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.22);
}

/* ── Marker overlay layer (same grid, absolutely positioned) ── */
.chord-fretboard__markers-layer {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(var(--cols, 6), var(--chord-cell-w));
  grid-template-rows: repeat(5, var(--chord-cell-h));
  pointer-events: none;
}

.chord-fretboard__marker {
  place-self: center;
  width: var(--chord-marker-d);
  height: var(--chord-marker-d);
  border-radius: 50%;
  background: var(--album-theme-color, var(--color-neon-cyan));
  box-shadow: 0 0 4px
    color-mix(in srgb, var(--album-theme-color, var(--color-neon-cyan)) 55%, transparent 45%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.chord-fretboard__finger {
  font-size: var(--chord-finger-fs);
  font-weight: 800;
  /* White text for legibility against the orange/theme circle */
  color: rgba(255, 255, 255, 0.92);
  line-height: 1;
  user-select: none;
}

/* ── Per-string nut indicators row ── */
.chord-fretboard__nuts {
  display: grid;
  grid-template-columns: repeat(var(--cols, 6), var(--chord-cell-w));
  height: var(--chord-nut-h);
  margin-top: 0.06rem;
  flex-shrink: 0;
}

.chord-fretboard__nut {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--chord-nut-fs);
  line-height: 1;
}

/* ● filled circle = open string (uses theme accent) */
.chord-fretboard__nut--open {
  color: var(--chord-nut-ink);
}

/* ○ empty circle = fretted string (dimmed) */
.chord-fretboard__nut--fretted {
  color: var(--chord-nut-ink);
}

/* × = muted string */
.chord-fretboard__nut--muted {
  color: var(--chord-nut-ink);
}

/* no indicator for null fret (hidden, but preserves grid column) */
.chord-fretboard__nut--none {
  visibility: hidden;
}
</style>
