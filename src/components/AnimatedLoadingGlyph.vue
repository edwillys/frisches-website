<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useUiText } from '@/composables/useUiText'

const props = withDefaults(defineProps<{ startAt?: number }>(), { startAt: 0 })
const t = useUiText()

const LOADING_SEGMENT_INTERVAL_MS = 170

const segments = Array.from({ length: 8 }, (_, index) => index)
const activeSegmentCount = ref(0)

let progressTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  if (import.meta.env.MODE === 'test') return

  let nextCount = Math.max(0, props.startAt % (segments.length + 1))

  progressTimer = setInterval(() => {
    activeSegmentCount.value = nextCount
    nextCount = nextCount >= segments.length ? 0 : nextCount + 1
  }, LOADING_SEGMENT_INTERVAL_MS)
})

onBeforeUnmount(() => {
  if (!progressTimer) return
  clearInterval(progressTimer)
  progressTimer = null
})
</script>

<template>
  <div class="animated-loading-glyph" aria-hidden="true">
    <div class="animated-loading-glyph__hud">
      <div class="animated-loading-glyph__label">{{ t.status.loading }}</div>

      <div class="animated-loading-glyph__bar-frame">
        <div class="animated-loading-glyph__bar-grid">
          <span
            v-for="segment in segments"
            :key="segment"
            class="animated-loading-glyph__segment"
            :class="{
              'animated-loading-glyph__segment--active': segment < activeSegmentCount,
            }"
          ></span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animated-loading-glyph {
  --loader-padding: 0.12rem;
  --loader-gap: 0.14rem;

  --loading-color-border: var(--color-neon-cyan);
  --loading-color-shadow: color-mix(in srgb, var(--color-neon-cyan) 26%, transparent);
  --loading-color-fill: color-mix(in srgb, var(--color-neon-cyan) 82%, var(--color-text) 18%);
  --loading-color-fill-dim: color-mix(
    in srgb,
    var(--color-primary-light) 72%,
    var(--color-primary-dark) 28%
  );
  --loading-color-stroke: color-mix(
    in srgb,
    var(--color-primary-dark) 78%,
    var(--color-background) 22%
  );
  --loading-color-frame-background: color-mix(in srgb, var(--color-primary-dark) 82%, transparent);
  --loading-color-frame-inner-stroke: color-mix(
    in srgb,
    var(--color-primary-dark) 78%,
    var(--color-background) 22%
  );
  --loading-color-segment-border: color-mix(
    in srgb,
    var(--color-primary-dark) 70%,
    var(--color-background) 30%
  );
  --loading-color-segment-highlight: color-mix(in srgb, var(--color-text) 20%, transparent);
  --loading-color-segment-inset: color-mix(in srgb, var(--color-text-secondary) 22%, transparent);
  --loading-color-segment-active-inset: color-mix(in srgb, var(--color-text) 42%, transparent);
  --loading-color-segment-active-glow: color-mix(in srgb, var(--color-neon-cyan) 20%, transparent);

  --loading-font-size: clamp(0.56rem, 0.72vw, 0.66rem);
  --loading-letter-spacing: 0.14em;
  --loading-text-shadow-size: 1px;
  --loading-text-glow-size: 4px;
  --loading-transition-duration: 110ms;

  --loading-frame-padding-inline: var(--loading-segment-gap);
  --loading-frame-padding-block: 0.14rem;
  --loading-frame-border-width: 2px;
  --loading-frame-glow-size: 8px;
  --loading-frame-background: rgba(22, 24, 58, 0.14);

  --loading-segment-count: 8;
  --loading-segment-width: 0.42rem;
  --loading-segment-height: var(--loading-font-size);
  --loading-segment-gap: 0.12rem;
  --loading-segment-border-width: 1px;
  --loading-segment-highlight-inset: 0.06rem;
  --loading-segment-glow-size: 6px;

  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  padding: var(--loader-padding);
  overflow: hidden;
  pointer-events: none;
}

.animated-loading-glyph__hud {
  display: inline-grid;
  justify-items: start;
  gap: var(--loader-gap);
  width: fit-content;
  image-rendering: pixelated;
}

.animated-loading-glyph__label {
  color: var(--loading-color-border);
  font-family: 'Courier New', monospace;
  font-size: var(--loading-font-size);
  font-weight: 700;
  line-height: 1;
  letter-spacing: var(--loading-letter-spacing);
  text-transform: uppercase;
  width: fit-content;
  text-shadow:
    var(--loading-text-shadow-size) 0 0 var(--loading-color-stroke),
    0 var(--loading-text-shadow-size) 0 var(--loading-color-stroke),
    0 0 var(--loading-text-glow-size) var(--loading-color-shadow);
}

.animated-loading-glyph__bar-frame {
  position: relative;
  width: fit-content;
  padding: var(--loading-frame-padding-block) var(--loading-frame-padding-inline);
  border: var(--loading-frame-border-width) solid var(--loading-color-border);
  background: var(--loading-color-frame-background);
  box-shadow: 0 0 var(--loading-frame-glow-size) var(--loading-color-shadow);
}

.animated-loading-glyph__bar-grid {
  display: flex;
  align-items: stretch;
  gap: var(--loading-segment-gap);
  width: fit-content;
  min-height: var(--loading-segment-height);
}

.animated-loading-glyph__segment {
  position: relative;
  flex: 0 0 var(--loading-segment-width);
  width: var(--loading-segment-width);
  min-height: var(--loading-segment-height);
  border: var(--loading-segment-border-width) solid var(--loading-color-segment-border);
  background: var(--loading-color-fill-dim);
  box-shadow:
    inset 0 1px 0 var(--loading-color-segment-inset),
    0 0 0 transparent;
  transition:
    background-color var(--loading-transition-duration) steps(1, end),
    box-shadow var(--loading-transition-duration) steps(1, end),
    opacity var(--loading-transition-duration) steps(1, end);
}

.animated-loading-glyph__segment::before {
  content: '';
  position: absolute;
  inset: var(--loading-segment-highlight-inset);
  background: var(--loading-color-segment-highlight);
  opacity: 0;
  transition: opacity var(--loading-transition-duration) steps(1, end);
}

.animated-loading-glyph__segment--active {
  background: var(--loading-color-fill);
  box-shadow:
    inset 0 1px 0 var(--loading-color-segment-active-inset),
    0 0 var(--loading-segment-glow-size) var(--loading-color-segment-active-glow);
}

.animated-loading-glyph__segment--active::before {
  opacity: 1;
}
</style>
