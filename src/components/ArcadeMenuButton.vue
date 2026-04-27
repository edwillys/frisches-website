<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'

interface Props {
  label?: string
  isActive?: boolean
  isDisabled?: boolean
  toneContour: string
  buttonAriaLabel: string
  innerContourOnly?: boolean
}

withDefaults(defineProps<Props>(), {
  label: '',
  isActive: false,
  isDisabled: false,
  innerContourOnly: false,
})

const emit = defineEmits<{
  (e: 'press'): void
}>()

const isClickHighlighted = ref(false)
let clickHighlightTimeoutId: ReturnType<typeof setTimeout> | null = null

const clearClickHighlightTimeout = () => {
  if (clickHighlightTimeoutId === null) return
  clearTimeout(clickHighlightTimeoutId)
  clickHighlightTimeoutId = null
}

const handlePress = () => {
  isClickHighlighted.value = true
  clearClickHighlightTimeout()
  clickHighlightTimeoutId = setTimeout(() => {
    isClickHighlighted.value = false
    clickHighlightTimeoutId = null
  }, 220)

  emit('press')
}

onBeforeUnmount(() => {
  clearClickHighlightTimeout()
})
</script>

<template>
  <button
    class="arcade-menu-button"
    :class="{
      'arcade-menu-button--active': isActive,
      'arcade-menu-button--click-highlighted': isClickHighlighted,
      'arcade-menu-button--inner-only': innerContourOnly,
    }"
    :aria-label="buttonAriaLabel"
    :disabled="isDisabled"
    :style="{
      '--tone-contour': toneContour,
    }"
    type="button"
    @click="handlePress"
  >
    <span class="arcade-menu-button__inner">
      <span class="arcade-menu-button__label">{{ label }}</span>
    </span>
  </button>
</template>

<style scoped>
.arcade-menu-button {
  --arcade-button-radius: 1rem;
  --arcade-button-inner-radius: 0.9rem;
  --arcade-button-size: clamp(2.75rem, 7vw, 3.85rem);
  --arcade-button-text-size: clamp(0.52rem, 1.15vw, 0.64rem);
  position: relative;
  width: var(--arcade-button-size);
  aspect-ratio: 1 / 1;
  border: 0;
  border-radius: var(--arcade-button-radius);
  padding: 0;
  background: linear-gradient(165deg, rgba(48, 46, 60, 0.98), rgba(24, 24, 34, 0.98));
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--tone-contour) 74%, #000000 26%),
    0 10px 18px rgba(0, 0, 0, 0.24);
  cursor: pointer;
  transition: box-shadow 0.2s ease;
}

.arcade-menu-button::before,
.arcade-menu-button::after {
  content: '';
  position: absolute;
  pointer-events: none;
}

.arcade-menu-button::before {
  inset: 0.35rem;
  border-radius: var(--arcade-button-inner-radius);
  border: 1px solid color-mix(in srgb, var(--tone-contour) 84%, #ffffff 16%);
  opacity: 0.86;
}

.arcade-menu-button::after {
  inset: 0;
  border-radius: var(--arcade-button-radius);
  box-shadow: 0 0 0 0 color-mix(in srgb, var(--tone-contour) 35%, transparent 65%);
  transition: box-shadow 0.2s ease;
}

.arcade-menu-button:hover:not(:disabled) {
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--tone-contour) 90%, #ffffff 10%),
    0 0 14px color-mix(in srgb, var(--tone-contour) 40%, transparent 60%),
    0 10px 18px rgba(0, 0, 0, 0.26);
}

.arcade-menu-button:hover:not(:disabled)::after {
  box-shadow: 0 0 14px 2px color-mix(in srgb, var(--tone-contour) 46%, transparent 54%);
}

.arcade-menu-button:active:not(:disabled) {
  transform: translateY(1px) scale(0.97);
}

.arcade-menu-button:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--tone-contour) 90%, #ffffff 10%);
  outline-offset: 3px;
}

.arcade-menu-button--active {
  box-shadow:
    0 0 0 2px color-mix(in srgb, var(--tone-contour) 86%, #ffffff 14%),
    inset 0 0 0 1px color-mix(in srgb, var(--tone-contour) 56%, transparent 44%),
    0 0 14px color-mix(in srgb, var(--tone-contour) 44%, transparent 56%),
    0 10px 18px rgba(0, 0, 0, 0.28);
}

.arcade-menu-button--active::after {
  box-shadow: 0 0 10px 1px color-mix(in srgb, var(--tone-contour) 34%, transparent 66%);
}

.arcade-menu-button--click-highlighted,
.arcade-menu-button--click-highlighted.arcade-menu-button--inner-only {
  box-shadow:
    0 0 0 2px color-mix(in srgb, var(--tone-contour) 92%, #ffffff 8%),
    inset 0 0 0 1px color-mix(in srgb, var(--tone-contour) 68%, transparent 32%),
    0 0 18px color-mix(in srgb, var(--tone-contour) 52%, transparent 48%),
    0 12px 22px rgba(0, 0, 0, 0.3);
}

.arcade-menu-button--click-highlighted::after {
  box-shadow: 0 0 14px 2px color-mix(in srgb, var(--tone-contour) 52%, transparent 48%);
}

.arcade-menu-button--inner-only {
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--tone-contour) 74%, #000000 26%),
    0 10px 18px rgba(0, 0, 0, 0.24);
}

.arcade-menu-button--inner-only::before {
  display: none;
}

.arcade-menu-button--inner-only:hover:not(:disabled),
.arcade-menu-button--inner-only.arcade-menu-button--active {
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--tone-contour) 90%, #ffffff 10%),
    0 0 10px color-mix(in srgb, var(--tone-contour) 24%, transparent 76%),
    0 10px 18px rgba(0, 0, 0, 0.26);
}

.arcade-menu-button:disabled {
  opacity: 0.6;
  cursor: default;
}

.arcade-menu-button__inner {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border-radius: var(--arcade-button-radius);
  background: repeating-linear-gradient(
    180deg,
    rgba(28, 28, 40, 0.98) 0 2px,
    rgba(38, 38, 52, 0.98) 2px 4px
  );
}

.arcade-menu-button__label {
  max-width: 90%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text);
  font-family: 'Space Mono', 'Courier New', monospace;
  font-size: var(--arcade-button-text-size);
  letter-spacing: 0.04em;
  font-weight: 700;
  text-shadow: none;
}
</style>
