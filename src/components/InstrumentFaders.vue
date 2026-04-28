<script setup lang="ts">
import { computed, reactive, ref } from 'vue'

import { useUiText } from '@/composables/useUiText'
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

import fluteMuteSvg from '@/assets/icons/instrument-flute-mute.svg?raw'
import fluteLowSvg from '@/assets/icons/instrument-flute-low.svg?raw'
import fluteMidSvg from '@/assets/icons/instrument-flute-mid.svg?raw'
import fluteHighSvg from '@/assets/icons/instrument-flute-high.svg?raw'

import saxophoneMuteSvg from '@/assets/icons/instrument-saxophone-mute.svg?raw'
import saxophoneLowSvg from '@/assets/icons/instrument-saxophone-low.svg?raw'
import saxophoneMidSvg from '@/assets/icons/instrument-saxophone-mid.svg?raw'
import saxophoneHighSvg from '@/assets/icons/instrument-saxophone-high.svg?raw'

import percussionMuteSvg from '@/assets/icons/instrument-percussion-mute.svg?raw'
import percussionLowSvg from '@/assets/icons/instrument-percussion-low.svg?raw'
import percussionMidSvg from '@/assets/icons/instrument-percussion-mid.svg?raw'
import percussionHighSvg from '@/assets/icons/instrument-percussion-high.svg?raw'
import keyboardMuteSvg from '@/assets/icons/instrument-keyboard-mute.svg?raw'
import keyboardLowSvg from '@/assets/icons/instrument-keyboard-low.svg?raw'
import keyboardMidSvg from '@/assets/icons/instrument-keyboard-mid.svg?raw'
import keyboardHighSvg from '@/assets/icons/instrument-keyboard-high.svg?raw'

import { type StemAvailability, createStemAvailability } from '@/data/stems'

export type StemName =
  | 'drums'
  | 'guitar'
  | 'bass'
  | 'vocals'
  | 'flute'
  | 'brass'
  | 'percussion'
  | 'keyboard'

export type StemGains = Record<StemName, number>
export type { StemAvailability }

const props = defineProps<{
  modelValue: boolean
  gains: StemGains
  availability?: StemAvailability
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
  flute: 1,
  brass: 1,
  percussion: 1,
  keyboard: 1,
})

const isFaderEditingEnabled = ref(false)

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
    if (stem === 'flute') return fluteMuteSvg
    if (stem === 'brass') return saxophoneMuteSvg
    if (stem === 'percussion') return percussionMuteSvg
    if (stem === 'keyboard') return keyboardMuteSvg
    return vocalsMuteSvg
  }

  const isHigh = g >= 0.67
  const isMid = g >= 0.34

  if (stem === 'drums') return isHigh ? drumsHighSvg : isMid ? drumsMidSvg : drumsLowSvg
  if (stem === 'guitar') return isHigh ? guitarHighSvg : isMid ? guitarMidSvg : guitarLowSvg
  if (stem === 'bass') return isHigh ? bassHighSvg : isMid ? bassMidSvg : bassLowSvg
  if (stem === 'flute') return isHigh ? fluteHighSvg : isMid ? fluteMidSvg : fluteLowSvg
  if (stem === 'brass') {
    return isHigh ? saxophoneHighSvg : isMid ? saxophoneMidSvg : saxophoneLowSvg
  }
  if (stem === 'percussion') {
    return isHigh ? percussionHighSvg : isMid ? percussionMidSvg : percussionLowSvg
  }
  if (stem === 'keyboard') {
    return isHigh ? keyboardHighSvg : isMid ? keyboardMidSvg : keyboardLowSvg
  }
  return isHigh ? vocalsHighSvg : isMid ? vocalsMidSvg : vocalsLowSvg
}

const t = useUiText()

const stems = computed(() => {
  const availability = props.availability ?? createStemAvailability(true)
  const base = [
    { key: 'drums' as const, title: 'Drums' },
    { key: 'guitar' as const, title: 'Guitar' },
    { key: 'bass' as const, title: 'Bass' },
    { key: 'vocals' as const, title: 'Vocals' },
    { key: 'flute' as const, title: 'Flute' },
    { key: 'brass' as const, title: 'Brass' },
    { key: 'percussion' as const, title: 'Percussion' },
    { key: 'keyboard' as const, title: 'Keyboard' },
  ]

  return base.map((s) => {
    const gain = clamp01(props.gains[s.key])
    return {
      ...s,
      gain,
      isAvailable: availability[s.key],
      tooltip: availability[s.key] ? s.title : `${s.title}${t.value.faders.unavailableSuffix}`,
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
  if (!isFaderEditingEnabled.value) return
  const target = e.target as HTMLInputElement
  const value = clamp01(Number.parseFloat(target.value))
  if (value > 0) lastNonZeroGain[stem] = value
  emit('setGain', stem, value)
}

function toggleMute(stem: StemName) {
  if (!isFaderEditingEnabled.value) return

  const current = clamp01(props.gains[stem])
  if (current <= 0) {
    const restore = clamp01(lastNonZeroGain[stem] ?? 1)
    emit('setGain', stem, restore > 0 ? restore : 1)
    return
  }

  lastNonZeroGain[stem] = current
  emit('setGain', stem, 0)
}

function toggleFaderEditing() {
  isFaderEditingEnabled.value = !isFaderEditingEnabled.value
}
</script>

<template>
  <div class="stems" :class="{ 'is-open': modelValue }">
    <button
      class="mini-player__btn mini-player__btn--stems"
      :class="{ 'is-active': isFaderEditingEnabled }"
      type="button"
      :data-tooltip="t.faders.open"
      :aria-label="t.faders.open"
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
      :aria-label="t.faders.groupLabel"
      @click.stop
    >
      <div class="stems__header">
        <button
          class="stems__activation-toggle"
          :class="{ 'is-enabled': isFaderEditingEnabled }"
          type="button"
          :aria-pressed="isFaderEditingEnabled"
          :aria-label="'Enable instrument fading'"
          data-testid="stems-enable-toggle"
          @click="toggleFaderEditing"
        >
          <span class="stems__activation-knob" aria-hidden="true" />
        </button>

        <button
          class="stems__close"
          type="button"
          :aria-label="t.faders.close"
          data-testid="stems-close"
          @click="close"
        >
          <span class="stems__close-icon" aria-hidden="true" v-html="closeSvg" />
        </button>
      </div>

      <div
        class="stems__grid"
        :class="{ 'stems__grid--disabled': !isFaderEditingEnabled }"
        role="group"
        :aria-label="t.faders.groupLabel"
      >
        <div
          v-for="stem in stems"
          :key="stem.key"
          class="stem"
          :class="{ 'stem--unavailable': !stem.isAvailable }"
          :data-testid="`stem-${stem.key}`"
        >
          <button
            class="stem__icon-btn"
            type="button"
            :data-tooltip="stem.tooltip"
            :aria-label="t.faders.muteToggle(stem.title)"
            :aria-pressed="stem.gain <= 0"
            :disabled="!isFaderEditingEnabled || !stem.isAvailable"
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
              :disabled="!isFaderEditingEnabled || !stem.isAvailable"
              :aria-label="t.faders.instrumentVolume(stem.title)"
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
  align-items: center;
}

.stem--unavailable {
  opacity: 0.45;
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
  justify-content: space-between;
  align-items: center;
  height: 22px;
  gap: 10px;
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
  color: var(--lyrics-album-contour);
}

.stems__activation-toggle {
  position: relative;
  width: 28px;
  height: 16px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.24);
  background: rgba(255, 255, 255, 0.12);
  cursor: pointer;
  transition:
    background 150ms ease,
    border-color 150ms ease,
    box-shadow 150ms ease;
}

.stems__activation-toggle.is-enabled {
  background: color-mix(in srgb, var(--lyrics-album-contour) 68%, transparent 32%);
  border-color: color-mix(in srgb, var(--lyrics-album-contour) 82%, #ffffff 18%);
  box-shadow: 0 0 10px color-mix(in srgb, var(--lyrics-album-contour) 34%, transparent 66%);
}

.stems__activation-knob {
  position: absolute;
  top: 50%;
  left: 2px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.95);
  transform: translate(0, -50%);
  transition: transform 150ms ease;
}

.stems__activation-toggle.is-enabled .stems__activation-knob {
  transform: translate(12px, -50%);
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

.stems__grid--disabled {
  opacity: 0.54;
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
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
}

.stem__icon-btn:hover {
  color: var(--lyrics-album-contour);
}

.stem__icon-btn:disabled {
  cursor: default;
}

.stems__grid--disabled .stem__icon-btn:hover {
  color: rgba(255, 255, 255, 0.8);
}

.mini-player__btn--stems {
  align-self: center;
  line-height: 0;
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

.stem__slider:disabled {
  cursor: default;
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
    var(--lyrics-album-contour) 0%,
    var(--lyrics-album-contour) var(--stem-percent, 100%),
    rgba(255, 255, 255, 0.22) var(--stem-percent, 100%),
    rgba(255, 255, 255, 0.22) 100%
  );
}

.stem__slider::-webkit-slider-thumb {
  appearance: none;
  width: 0;
  height: 0;
  opacity: 0;
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
  background: var(--lyrics-album-contour);
}

.stem__slider::-moz-range-thumb {
  width: 0;
  height: 0;
  opacity: 0;
  border: none;
}
</style>
