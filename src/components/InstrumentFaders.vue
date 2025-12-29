<script setup lang="ts">
import { computed, reactive } from 'vue'

import closeSvg from '@/assets/icons/close.svg?raw'
import fadersSvg from '@/assets/icons/faders.svg?raw'

import drumsMuteSvg from '@/assets/icons/instrument-drums-mute.svg?raw'
import drumsLowSvg from '@/assets/icons/instrument-drums-low.svg?raw'
import drumsMidSvg from '@/assets/icons/instrument-drums-mid.svg?raw'
import drumsHighSvg from '@/assets/icons/instrument-drums-high.svg?raw'

import guitarMuteSvg from '@/assets/icons/instrument-guitar-mute.svg?raw'
import guitarLowSvg from '@/assets/icons/instrument-guitar-low.svg?raw'
import guitarMidSvg from '@/assets/icons/instrument-guitar-mid.svg?raw'
import guitarHighSvg from '@/assets/icons/instrument-guitar-high.svg?raw'

import bassMuteSvg from '@/assets/icons/instrument-bass-mute.svg?raw'
import bassLowSvg from '@/assets/icons/instrument-bass-low.svg?raw'
import bassMidSvg from '@/assets/icons/instrument-bass-mid.svg?raw'
import bassHighSvg from '@/assets/icons/instrument-bass-high.svg?raw'

import vocalsMuteSvg from '@/assets/icons/instrument-vocals-mute.svg?raw'
import vocalsLowSvg from '@/assets/icons/instrument-vocals-low.svg?raw'
import vocalsMidSvg from '@/assets/icons/instrument-vocals-mid.svg?raw'
import vocalsHighSvg from '@/assets/icons/instrument-vocals-high.svg?raw'

export type StemName = 'drums' | 'guitar' | 'bass' | 'vocals'

export type StemGains = Record<StemName, number>

const props = defineProps<{
  modelValue: boolean
  gains: StemGains
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'setGain', stem: StemName, value: number): void
}>()

const lastNonZeroGain = reactive<StemGains>({
  drums: 1,
  guitar: 1,
  bass: 1,
  vocals: 1,
})

function clamp01(v: number) {
  if (!Number.isFinite(v)) return 0
  return Math.min(1, Math.max(0, v))
}

function iconFor(stem: StemName, gain: number) {
  const g = clamp01(gain)
  if (g <= 0) {
    if (stem === 'drums') return drumsMuteSvg
    if (stem === 'guitar') return guitarMuteSvg
    if (stem === 'bass') return bassMuteSvg
    return vocalsMuteSvg
  }

  const isHigh = g >= 0.67
  const isMid = g >= 0.34

  if (stem === 'drums') return isHigh ? drumsHighSvg : isMid ? drumsMidSvg : drumsLowSvg
  if (stem === 'guitar') return isHigh ? guitarHighSvg : isMid ? guitarMidSvg : guitarLowSvg
  if (stem === 'bass') return isHigh ? bassHighSvg : isMid ? bassMidSvg : bassLowSvg
  return isHigh ? vocalsHighSvg : isMid ? vocalsMidSvg : vocalsLowSvg
}

const stems = computed(() => {
  const base = [
    { key: 'drums' as const, title: 'Drums' },
    { key: 'guitar' as const, title: 'Guitar' },
    { key: 'bass' as const, title: 'Bass' },
    { key: 'vocals' as const, title: 'Vocals' },
  ]

  return base.map((s) => {
    const gain = clamp01(props.gains[s.key])
    return {
      ...s,
      gain,
      percent: `${Math.round(gain * 100)}%`,
      icon: iconFor(s.key, gain),
    }
  })
})

function toggle() {
  emit('update:modelValue', !props.modelValue)
}

function close() {
  emit('update:modelValue', false)
}

function onInput(stem: StemName, e: Event) {
  const target = e.target as HTMLInputElement
  const value = clamp01(Number.parseFloat(target.value))
  if (value > 0) lastNonZeroGain[stem] = value
  emit('setGain', stem, value)
}

function toggleMute(stem: StemName) {
  const current = clamp01(props.gains[stem])
  if (current <= 0) {
    const restore = clamp01(lastNonZeroGain[stem] ?? 1)
    emit('setGain', stem, restore > 0 ? restore : 1)
    return
  }

  lastNonZeroGain[stem] = current
  emit('setGain', stem, 0)
}
</script>

<template>
  <div class="stems" :class="{ 'is-open': modelValue }">
    <button
      class="mini-player__btn mini-player__btn--stems"
      :class="{ 'is-active': modelValue }"
      type="button"
      title="Instrument faders"
      aria-label="Instrument faders"
      :aria-expanded="modelValue"
      data-testid="mini-stems"
      @click="toggle"
    >
      <span class="mini-player__icon" aria-hidden="true" v-html="fadersSvg" />
    </button>

    <div
      v-if="modelValue"
      class="stems__overlay"
      data-testid="stems-overlay"
      role="dialog"
      aria-label="Instrument faders"
      @click.stop
    >
      <div class="stems__header">
        <button
          class="stems__close"
          type="button"
          aria-label="Close instrument faders"
          data-testid="stems-close"
          @click="close"
        >
          <span class="stems__close-icon" aria-hidden="true" v-html="closeSvg" />
        </button>
      </div>

      <div class="stems__grid" role="group" aria-label="Instrument faders">
        <div v-for="stem in stems" :key="stem.key" class="stem" :data-testid="`stem-${stem.key}`">
          <button
            class="stem__icon-btn"
            type="button"
            :aria-label="`${stem.title} mute toggle`"
            :aria-pressed="stem.gain <= 0"
            :data-testid="`stem-${stem.key}-mute`"
            @click="toggleMute(stem.key)"
          >
            <span class="stem__icon" aria-hidden="true" v-html="stem.icon" />
          </button>

          <div class="stem__slider-wrap" :style="{ '--stem-percent': stem.percent }">
            <input
              class="stem__slider"
              type="range"
              min="0"
              max="1"
              step="0.01"
              :value="stem.gain"
              :aria-label="`${stem.title} volume`"
              @input="onInput(stem.key, $event)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stems {
  position: relative;
  display: inline-flex;
}

.stems__overlay {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 10px);
  transform: translateX(-50%);
  padding: 10px 10px 10px;
  background: rgba(0, 0, 0, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  backdrop-filter: blur(20px);
  z-index: 1000;
  overflow: visible;
}

.stems__overlay::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -6px;
  width: 12px;
  height: 12px;
  transform: translateX(-50%) rotate(45deg);
  background: rgba(0, 0, 0, 0.92);
  border-right: 1px solid rgba(255, 255, 255, 0.12);
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.stems__header {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  height: 22px;
}

.stems__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.75);
  cursor: pointer;
}

.stems__close:hover {
  color: var(--color-neon-cyan);
}

:deep(.stems__close-icon svg) {
  width: 12px;
  height: 12px;
}

.stems__grid {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

.stem {
  display: grid;
  gap: 6px;
  justify-items: center;
}

.stem__icon {
  color: currentColor;
}

.stem__icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
}

.stem__icon-btn:hover {
  color: var(--color-neon-cyan);
}

:deep(.stem__icon svg) {
  width: 18px;
  height: 18px;
  display: block;
}

.stem__slider-wrap {
  width: 18px;
  height: 96px;
  position: relative;
}

.stem__slider {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 96px;
  height: 18px;
  appearance: none;
  transform: translate(-50%, -50%) rotate(-90deg);
  cursor: pointer;
  background: transparent;
}

.stem__slider::-webkit-slider-runnable-track {
  height: 2px;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.92) 0%,
    rgba(255, 255, 255, 0.92) var(--stem-percent, 100%),
    rgba(255, 255, 255, 0.22) var(--stem-percent, 100%),
    rgba(255, 255, 255, 0.22) 100%
  );
}

.stem:hover .stem__slider::-webkit-slider-runnable-track {
  background: linear-gradient(
    90deg,
    var(--color-neon-cyan) 0%,
    var(--color-neon-cyan) var(--stem-percent, 100%),
    rgba(255, 255, 255, 0.22) var(--stem-percent, 100%),
    rgba(255, 255, 255, 0.22) 100%
  );
}

.stem__slider::-webkit-slider-thumb {
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: white;
  border: none;
  opacity: 0;
  transition: opacity 150ms ease;
}

.stem:hover .stem__slider::-webkit-slider-thumb {
  opacity: 1;
}

.stem__slider::-moz-range-track {
  height: 2px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.25);
}

.stem__slider::-moz-range-progress {
  height: 2px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
}

.stem:hover .stem__slider::-moz-range-progress {
  background: var(--color-neon-cyan);
}

.stem__slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: white;
  border: none;
  opacity: 0;
  transition: opacity 150ms ease;
}

.stem:hover .stem__slider::-moz-range-thumb {
  opacity: 1;
}
</style>
