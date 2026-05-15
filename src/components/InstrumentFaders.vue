<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'

import { useUiText } from '@/composables/useUiText'
import OverflowMarqueeLabel from '@/components/OverflowMarqueeLabel.vue'
import closeSvg from '@/assets/icons/close.svg?raw'
import fadersSvg from '@/assets/icons/faders.svg?raw'
import clearAllSvg from '@/assets/icons/clear-all.svg?raw'

import drumsMuteSvg from '@/assets/icons/instrument-drums-mute.svg?raw'
import drumsLowSvg from '@/assets/icons/instrument-drums-low.svg?raw'
import drumsMidSvg from '@/assets/icons/instrument-drums-mid.svg?raw'
import drumsHighSvg from '@/assets/icons/instrument-drums-high.svg?raw'

import guitarMuteSvg from '@/assets/icons/instrument-guitar-mute.svg?raw'
import guitarLowSvg from '@/assets/icons/instrument-guitar-low.svg?raw'
import guitarMidSvg from '@/assets/icons/instrument-guitar-mid.svg?raw'
import guitarHighSvg from '@/assets/icons/instrument-guitar-high.svg?raw'

import guitarAcousticMuteSvg from '@/assets/icons/instrument-guitar-acoustic-mute.svg?raw'
import guitarAcousticLowSvg from '@/assets/icons/instrument-guitar-acoustic-low.svg?raw'
import guitarAcousticMidSvg from '@/assets/icons/instrument-guitar-acoustic-mid.svg?raw'
import guitarAcousticHighSvg from '@/assets/icons/instrument-guitar-acoustic-high.svg?raw'

import bassMuteSvg from '@/assets/icons/instrument-bass-mute.svg?raw'
import bassLowSvg from '@/assets/icons/instrument-bass-low.svg?raw'
import bassMidSvg from '@/assets/icons/instrument-bass-mid.svg?raw'
import bassHighSvg from '@/assets/icons/instrument-bass-high.svg?raw'

import vocalsMuteSvg from '@/assets/icons/instrument-vocals-mute.svg?raw'
import vocalsLowSvg from '@/assets/icons/instrument-vocals-low.svg?raw'
import vocalsMidSvg from '@/assets/icons/instrument-vocals-mid.svg?raw'
import vocalsHighSvg from '@/assets/icons/instrument-vocals-high.svg?raw'

import vocalsBkgMuteSvg from '@/assets/icons/instrument-vocals-backing-mute.svg?raw'
import vocalsBkgLowSvg from '@/assets/icons/instrument-vocals-backing-low.svg?raw'
import vocalsBkgMidSvg from '@/assets/icons/instrument-vocals-backing-mid.svg?raw'
import vocalsBkgHighSvg from '@/assets/icons/instrument-vocals-backing-high.svg?raw'

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

import stringsMuteSvg from '@/assets/icons/instrument-strings-mute.svg?raw'
import stringsLowSvg from '@/assets/icons/instrument-strings-low.svg?raw'
import stringsMidSvg from '@/assets/icons/instrument-strings-mid.svg?raw'
import stringsHighSvg from '@/assets/icons/instrument-strings-high.svg?raw'

import { type StemAvailability, type StemGroupItem, createStemAvailability } from '@/data/stems'

const STEM_ICON_BUTTON_SIZE_PX = 22
const STEM_SLIDER_LENGTH_PX = 96
const STEM_SLIDER_THICKNESS_PX = 18
const STEM_CONTROL_GAP_PX = 4
const STEM_STACK_MIN_HEIGHT_PX =
  STEM_ICON_BUTTON_SIZE_PX + STEM_CONTROL_GAP_PX + STEM_SLIDER_LENGTH_PX

const GROUP_DRAWER_ITEM_WIDTH_PX = 38
const GROUP_DRAWER_GAP_PX = 10
const GROUP_HANDLE_WIDTH_PX = 5
const GROUP_HANDLE_HEIGHT_PX = 56
const GROUP_HANDLE_GRIP_WIDTH_PX = 2
const GROUP_HANDLE_GRIP_GAP_PX = 3
const GROUP_HANDLE_OVERHANG_PX = Math.ceil(GROUP_HANDLE_WIDTH_PX / 2)
const GROUP_SHELL_TOP_OVERHANG_PX = 6
const GROUP_SHELL_PADDING_TOP_PX = 0
const GROUP_SHELL_PADDING_RIGHT_PX = 2
const GROUP_SHELL_PADDING_BOTTOM_PX = 0
const GROUP_SHELL_PADDING_LEFT_PX = 0
const GROUP_SHELL_EXTENSION_BOTTOM_PX = 8
const GROUP_DRAWER_HORIZONTAL_PADDING_PX =
  GROUP_SHELL_PADDING_LEFT_PX + GROUP_SHELL_PADDING_RIGHT_PX
const GROUP_STEM_TOP_PADDING_PX = 2
const GROUP_ITEM_LABEL_MIN_HEIGHT_PX = 10
const GROUP_ITEM_LABEL_GAP_PX = 4
const GROUP_DRAWER_DRAG_THRESHOLD_PX = 6

type GroupDragSession = {
  stem: StemName
  handleEl: HTMLElement
  mainEl: HTMLElement
  startClientX: number
  pointerHandleCenterOffsetX: number
  zeroWidthHandleCenterX: number
  maxWidth: number
  didDrag: boolean
}

export type StemSoloScope = 'global-stem' | 'global-item' | 'group-item'

export type StemSoloTarget = {
  scope: StemSoloScope
  stem: StemName
  index: number | null
}

export type StemSoloState = {
  targets: StemSoloTarget[]
}

type ContextMenuAction = 'mute' | 'solo' | 'solo-in-group'

type ContextMenuState = {
  stem: StemName
  index: number | null
  x: number
  y: number
  actions: ContextMenuAction[]
}

export type StemName =
  | 'drums'
  | 'guitar'
  | 'bass'
  | 'vocals'
  | 'flute'
  | 'brass'
  | 'percussion'
  | 'keyboard'
  | 'strings'

export type StemGains = Record<StemName, number>
export type { StemAvailability }

const props = defineProps<{
  modelValue: boolean
  stemsEnabled?: boolean
  gains: StemGains
  availability?: StemAvailability
  groupItems?: Partial<Record<StemName, StemGroupItem[]>>
  groupGains?: Record<string, number>
  soloState?: StemSoloState | null
  stemsModeAvailable?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'setGain', stem: StemName, value: number): void
  (e: 'setGroupGain', stem: StemName, index: number, value: number): void
  (e: 'setSoloState', value: StemSoloState | null): void
  (e: 'resetGains'): void
  (e: 'enableStems'): void
  (e: 'disableStems'): void
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
  strings: 1,
})

const lastNonZeroGroupGain = reactive<Record<string, number>>({})

// Pre-populate last-non-zero memory from the incoming prop values so that
// "undo mute" after a page refresh restores to the previously saved gain
// rather than always snapping to 1.
watch(
  () => props.gains,
  (gains) => {
    for (const [stem, value] of Object.entries(gains) as [StemName, number][]) {
      const g = clamp01(value)
      if (g > 0) lastNonZeroGain[stem] = g
    }
  },
  { immediate: true }
)

watch(
  () => props.groupGains,
  (groupGains) => {
    if (!groupGains) return
    for (const [key, value] of Object.entries(groupGains)) {
      const g = clamp01(value)
      if (g > 0) lastNonZeroGroupGain[key] = g
    }
  },
  { immediate: true }
)
const groupOpen = reactive<Partial<Record<StemName, boolean>>>({})
const groupPreviewWidth = reactive<Partial<Record<StemName, number>>>({})
const suppressHandleClick = reactive<Partial<Record<StemName, boolean>>>({})
const draggingGroupStem = ref<StemName | null>(null)
const contextMenuState = ref<ContextMenuState | null>(null)
const contextMenuEl = ref<HTMLElement | null>(null)

const isFaderEditingEnabled = ref(false)
let activeGroupDrag: GroupDragSession | null = null
let longPressTimer: ReturnType<typeof setTimeout> | null = null
const pendingIconActionTimers = new Map<string, ReturnType<typeof setTimeout>>()
const suppressedIconActionKeys = new Set<string>()

watch(
  [() => props.stemsEnabled, () => props.stemsModeAvailable],
  ([enabled, available]) => {
    isFaderEditingEnabled.value = Boolean(enabled) && (available ?? true)
  },
  { immediate: true }
)

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
    if (stem === 'strings') return stringsMuteSvg
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
  if (stem === 'strings') {
    return isHigh ? stringsHighSvg : isMid ? stringsMidSvg : stringsLowSvg
  }
  return isHigh ? vocalsHighSvg : isMid ? vocalsMidSvg : vocalsLowSvg
}

function iconForGroupItem(
  stem: StemName,
  role: string | undefined,
  type: string | undefined,
  gain: number
): string {
  const g = clamp01(gain)
  const isHigh = g >= 0.67
  const isMid = g >= 0.34

  if (type === 'acoustic') {
    if (g <= 0) return guitarAcousticMuteSvg
    return isHigh ? guitarAcousticHighSvg : isMid ? guitarAcousticMidSvg : guitarAcousticLowSvg
  }

  if (role === 'backing') {
    if (g <= 0) return vocalsBkgMuteSvg
    return isHigh ? vocalsBkgHighSvg : isMid ? vocalsBkgMidSvg : vocalsBkgLowSvg
  }

  return iconFor(stem, gain)
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
    { key: 'strings' as const, title: 'Strings' },
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

const hasAnyStemAvailable = computed(() => stems.value.some((stem) => stem.isAvailable))

const visibleStems = computed(() => {
  if (!hasAnyStemAvailable.value) return stems.value
  return stems.value.filter((stem) => stem.isAvailable)
})

const groupDrawerCssVars = computed(() => ({
  '--stem-icon-button-size': `${STEM_ICON_BUTTON_SIZE_PX}px`,
  '--stem-slider-length': `${STEM_SLIDER_LENGTH_PX}px`,
  '--stem-slider-thickness': `${STEM_SLIDER_THICKNESS_PX}px`,
  '--stem-control-gap': `${STEM_CONTROL_GAP_PX}px`,
  '--stem-stack-min-height': `${STEM_STACK_MIN_HEIGHT_PX}px`,
  '--group-drawer-item-width': `${GROUP_DRAWER_ITEM_WIDTH_PX}px`,
  '--group-drawer-gap': `${GROUP_DRAWER_GAP_PX}px`,
  '--group-drawer-horizontal-padding': `${GROUP_DRAWER_HORIZONTAL_PADDING_PX}px`,
  '--group-stem-top-padding': `${GROUP_STEM_TOP_PADDING_PX}px`,
  '--group-item-label-min-height': `${GROUP_ITEM_LABEL_MIN_HEIGHT_PX}px`,
  '--group-item-label-gap': `${GROUP_ITEM_LABEL_GAP_PX}px`,
  '--group-shell-padding-top': `${GROUP_SHELL_PADDING_TOP_PX}px`,
  '--group-shell-padding-right': `${GROUP_SHELL_PADDING_RIGHT_PX}px`,
  '--group-shell-padding-bottom': `${GROUP_SHELL_PADDING_BOTTOM_PX}px`,
  '--group-shell-padding-left': `${GROUP_SHELL_PADDING_LEFT_PX}px`,
  '--group-shell-top-overhang': `${GROUP_SHELL_TOP_OVERHANG_PX}px`,
  '--group-shell-extension-bottom': `${GROUP_SHELL_EXTENSION_BOTTOM_PX}px`,
  '--group-handle-width': `${GROUP_HANDLE_WIDTH_PX}px`,
  '--group-handle-height': `${GROUP_HANDLE_HEIGHT_PX}px`,
  '--group-handle-overhang': `${GROUP_HANDLE_OVERHANG_PX}px`,
  '--group-handle-grip-width': `${GROUP_HANDLE_GRIP_WIDTH_PX}px`,
  '--group-handle-grip-gap': `${GROUP_HANDLE_GRIP_GAP_PX}px`,
}))

// ─── Group helpers ────────────────────────────────────────────────────────────────────────────

function hasGroupItems(stem: StemName): boolean {
  const items = props.groupItems?.[stem]
  return Array.isArray(items) && items.length > 0
}

function effectiveGroupItems(stem: StemName): StemGroupItem[] {
  return props.groupItems?.[stem] ?? []
}

function groupItemGain(stem: StemName, index: number): number {
  return clamp01(props.groupGains?.[`${stem}-${index}`] ?? 1)
}

function groupItemPercent(stem: StemName, index: number): string {
  return `${Math.round(groupItemGain(stem, index) * 100)}%`
}

function groupItemShortLabel(item: StemGroupItem, index: number): string {
  const shortLabel = item.shortLabel?.trim()
  return shortLabel && shortLabel.length > 0 ? shortLabel : String(index + 1)
}

function groupItemAriaLabel(stemTitle: string, item: StemGroupItem, index: number): string {
  return item.label ?? `${stemTitle} ${index + 1}`
}

function groupItemKey(stem: StemName, index: number): string {
  return `${stem}-${index}`
}

function iconTargetKey(stem: StemName, index: number | null = null): string {
  return index === null ? stem : groupItemKey(stem, index)
}

function isSameSoloTarget(a: StemSoloTarget, b: StemSoloTarget): boolean {
  return a.scope === b.scope && a.stem === b.stem && a.index === b.index
}

function soloTargetKey(target: StemSoloTarget): string {
  return `${target.scope}:${target.stem}:${target.index ?? 'stem'}`
}

function getSoloTargets(): StemSoloTarget[] {
  return props.soloState?.targets ?? []
}

function emitSoloTargets(targets: StemSoloTarget[]) {
  const next: StemSoloTarget[] = []
  const seen = new Set<string>()

  for (const target of targets) {
    const key = soloTargetKey(target)
    if (seen.has(key)) continue
    seen.add(key)
    next.push(target)
  }

  emit('setSoloState', next.length > 0 ? { targets: next } : null)
}

function hasAnySoloTargets(): boolean {
  return getSoloTargets().length > 0
}

function hasAnyGlobalSoloTargets(): boolean {
  return getSoloTargets().some((target) => target.scope !== 'group-item')
}

function isStemGloballySoloed(stem: StemName): boolean {
  return getSoloTargets().some(
    (target) => target.scope === 'global-stem' && target.stem === stem && target.index === null
  )
}

function isGroupItemGloballySoloed(stem: StemName, index: number): boolean {
  return getSoloTargets().some(
    (target) => target.scope === 'global-item' && target.stem === stem && target.index === index
  )
}

function isGroupItemGroupSoloed(stem: StemName, index: number): boolean {
  return getSoloTargets().some(
    (target) => target.scope === 'group-item' && target.stem === stem && target.index === index
  )
}

function stemHasAnySolo(stem: StemName): boolean {
  return getSoloTargets().some((target) => target.stem === stem)
}

function stemHasLocalGroupSolo(stem: StemName): boolean {
  return getSoloTargets().some((target) => target.scope === 'group-item' && target.stem === stem)
}

function isStemEffectivelySoloAudible(stem: StemName): boolean {
  if (!hasAnyGlobalSoloTargets()) return true
  if (isStemGloballySoloed(stem)) return true
  return getSoloTargets().some((target) => target.scope === 'global-item' && target.stem === stem)
}

function isGroupItemEffectivelySoloAudible(stem: StemName, index: number): boolean {
  if (!isStemEffectivelySoloAudible(stem)) return false

  if (isStemGloballySoloed(stem)) {
    if (!stemHasLocalGroupSolo(stem)) return true
    return isGroupItemGroupSoloed(stem, index)
  }

  const hasGlobalItemSoloForStem = getSoloTargets().some(
    (target) => target.scope === 'global-item' && target.stem === stem
  )
  if (hasGlobalItemSoloForStem) {
    return isGroupItemGloballySoloed(stem, index)
  }

  if (stemHasLocalGroupSolo(stem)) {
    return isGroupItemGroupSoloed(stem, index)
  }

  return true
}

function isStemSoloVisual(stem: StemName): boolean {
  return stemHasAnySolo(stem)
}

function isGroupItemSoloVisual(stem: StemName, index: number): boolean {
  return isGroupItemGloballySoloed(stem, index) || isGroupItemGroupSoloed(stem, index)
}

function isStemDimmed(stem: StemName): boolean {
  return hasAnySoloTargets() && !isStemEffectivelySoloAudible(stem)
}

function isGroupItemDimmed(stem: StemName, index: number): boolean {
  return hasAnySoloTargets() && !isGroupItemEffectivelySoloAudible(stem, index)
}

function isStemMuted(stem: StemName): boolean {
  return clamp01(props.gains[stem]) <= 0.001
}

function isGroupItemMuted(stem: StemName, index: number): boolean {
  return groupItemGain(stem, index) <= 0.001
}

function applyStemGainChange(stem: StemName, value: number) {
  const nextValue = clamp01(value)
  if (nextValue > 0) lastNonZeroGain[stem] = nextValue
  emit('setGain', stem, nextValue)
}

function applyGroupGainChange(stem: StemName, index: number, value: number) {
  const nextValue = clamp01(value)
  const key = groupItemKey(stem, index)
  if (nextValue > 0) lastNonZeroGroupGain[key] = nextValue
  emit('setGroupGain', stem, index, nextValue)
}

const allVisibleStemsMuted = computed(
  () => visibleStems.value.length > 0 && visibleStems.value.every((stem) => stem.gain <= 0.001)
)

function clearAllIconActionTimers() {
  for (const timer of pendingIconActionTimers.values()) {
    clearTimeout(timer)
  }
  pendingIconActionTimers.clear()
}

function scheduleIconAction(key: string, singleAction: () => void, doubleAction: () => void) {
  if (suppressedIconActionKeys.has(key)) {
    suppressedIconActionKeys.delete(key)
    return
  }

  const existingTimer = pendingIconActionTimers.get(key)
  if (existingTimer) {
    clearTimeout(existingTimer)
    pendingIconActionTimers.delete(key)
    doubleAction()
    return
  }

  const timer = setTimeout(() => {
    pendingIconActionTimers.delete(key)
    singleAction()
  }, 220)
  pendingIconActionTimers.set(key, timer)
}

function closeContextMenu() {
  contextMenuState.value = null
  document.removeEventListener('pointerdown', onDocumentPointerDown, true)
  document.removeEventListener('keydown', onDocumentKeyDown)
}

function onDocumentPointerDown(event: PointerEvent) {
  if (!contextMenuState.value) return
  if (contextMenuEl.value?.contains(event.target as Node)) return
  closeContextMenu()
}

function onDocumentKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeContextMenu()
  }
}

async function clampContextMenuPosition() {
  await nextTick()
  const menu = contextMenuEl.value
  const state = contextMenuState.value
  if (!menu || !state || typeof window === 'undefined') return

  const rect = menu.getBoundingClientRect()
  const padding = 10
  state.x = Math.min(Math.max(state.x, padding), window.innerWidth - rect.width - padding)
  state.y = Math.min(Math.max(state.y, padding), window.innerHeight - rect.height - padding)
}

function openContextMenu(stem: StemName, index: number | null, x: number, y: number) {
  if (!isFaderEditingEnabled.value) return

  const actions: ContextMenuAction[] =
    index === null || isGroupItemGloballySoloed(stem, index)
      ? ['mute', 'solo']
      : ['mute', 'solo', 'solo-in-group']

  contextMenuState.value = {
    stem,
    index,
    x,
    y,
    actions,
  }
  document.addEventListener('pointerdown', onDocumentPointerDown, true)
  document.addEventListener('keydown', onDocumentKeyDown)
  void clampContextMenuPosition()
}

function clearLongPressTimer() {
  if (longPressTimer !== null) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
}

function scheduleLongPress(stem: StemName, index: number | null, event: PointerEvent) {
  if (!isFaderEditingEnabled.value || event.pointerType !== 'touch') return

  clearLongPressTimer()
  const key = iconTargetKey(stem, index)
  const x = event.clientX
  const y = event.clientY

  longPressTimer = setTimeout(() => {
    suppressedIconActionKeys.add(key)
    openContextMenu(stem, index, x, y)
  }, 420)
}

function openStemContextMenu(stem: StemName, event: MouseEvent) {
  event.preventDefault()
  openContextMenu(stem, null, event.clientX, event.clientY)
}

function openGroupItemContextMenu(stem: StemName, index: number, event: MouseEvent) {
  event.preventDefault()
  openContextMenu(stem, index, event.clientX, event.clientY)
}

function clearSoloForStem(stem: StemName) {
  emitSoloTargets(getSoloTargets().filter((target) => target.stem !== stem))
}

function clearSoloForItem(stem: StemName, index: number) {
  emitSoloTargets(
    getSoloTargets().filter((target) => !(target.stem === stem && target.index === index))
  )
}

function clearAllSoloTargets() {
  emitSoloTargets([])
}

function toggleSoloTarget(target: StemSoloTarget) {
  if (!isFaderEditingEnabled.value) return

  closeContextMenu()
  const targets = getSoloTargets()

  if (targets.some((existing) => isSameSoloTarget(existing, target))) {
    if (target.scope === 'global-stem') {
      clearSoloForStem(target.stem)
      return
    }

    emitSoloTargets(targets.filter((existing) => !isSameSoloTarget(existing, target)))
    return
  }

  let nextTargets = targets.filter((existing) => {
    if (target.scope === 'global-stem') {
      return existing.stem !== target.stem
    }

    if (target.scope === 'global-item') {
      return !(
        existing.stem === target.stem &&
        (existing.scope === 'global-stem' || existing.index === target.index)
      )
    }

    return !(existing.stem === target.stem && existing.scope === 'global-stem')
  })

  nextTargets = [...nextTargets, target]
  emitSoloTargets(nextTargets)
}

function contextMenuActionLabel(action: ContextMenuAction, state: ContextMenuState): string {
  if (action === 'mute') return t.value.faders.contextMenuMute

  if (action === 'solo') {
    if (state.index === null) {
      return isStemSoloVisual(state.stem)
        ? t.value.faders.contextMenuUnsolo
        : t.value.faders.contextMenuSolo
    }

    return isGroupItemGloballySoloed(state.stem, state.index)
      ? t.value.faders.contextMenuUnsolo
      : t.value.faders.contextMenuSolo
  }

  if (state.index !== null && isGroupItemGroupSoloed(state.stem, state.index)) {
    return t.value.faders.contextMenuUnsoloInGroup
  }

  return t.value.faders.contextMenuSoloInGroup
}

function runContextMenuAction(action: ContextMenuAction) {
  const state = contextMenuState.value
  if (!state) return

  closeContextMenu()
  if (action === 'mute') {
    if (state.index === null) {
      toggleMute(state.stem)
      return
    }
    toggleGroupItemMute(state.stem, state.index)
    return
  }

  if (action === 'solo') {
    toggleSoloTarget({
      scope: state.index === null ? 'global-stem' : 'global-item',
      stem: state.stem,
      index: state.index,
    })
    return
  }

  if (state.index !== null) {
    toggleSoloTarget({ scope: 'group-item', stem: state.stem, index: state.index })
  }
}

function toggleMuteAll() {
  if (!isFaderEditingEnabled.value) return

  closeContextMenu()
  for (const stem of visibleStems.value) {
    if (allVisibleStemsMuted.value) {
      const restore = clamp01(lastNonZeroGain[stem.key] ?? 1)
      applyStemGainChange(stem.key, restore > 0 ? restore : 1)
      continue
    }

    if (stem.gain > 0.001) {
      lastNonZeroGain[stem.key] = stem.gain
      applyStemGainChange(stem.key, 0)
    }
  }
}

function clearSoloMomentarily() {
  if (!isFaderEditingEnabled.value) return
  if (!hasAnySoloTargets()) return

  closeContextMenu()
  clearAllSoloTargets()
}

function groupToggleLabel(isOpen: boolean): string {
  return isOpen ? 'Close stem group' : 'Open stem group'
}

function getGroupDrawerMaxWidth(stem: StemName) {
  const itemCount = effectiveGroupItems(stem).length
  return (
    itemCount * GROUP_DRAWER_ITEM_WIDTH_PX +
    Math.max(0, itemCount - 1) * GROUP_DRAWER_GAP_PX +
    GROUP_DRAWER_HORIZONTAL_PADDING_PX
  )
}

function getGroupDrawerWidth(stem: StemName) {
  const previewWidth = groupPreviewWidth[stem]
  if (typeof previewWidth === 'number') return previewWidth
  return groupOpen[stem] ? getGroupDrawerMaxWidth(stem) : 0
}

function isGroupExpanded(stem: StemName) {
  return getGroupDrawerWidth(stem) > 0
}

function groupDrawerStyle(stem: StemName) {
  const drawerWidth = getGroupDrawerWidth(stem)

  return {
    '--drawer-width': `${drawerWidth}px`,
  }
}

function toggleGroup(stem: StemName) {
  delete groupPreviewWidth[stem]
  groupOpen[stem] = !groupOpen[stem]
}

function clearGroupDragSession() {
  if (activeGroupDrag) {
    window.removeEventListener('pointermove', onGroupHandlePointerMove)
    window.removeEventListener('mousemove', onGroupHandlePointerMove)
    window.removeEventListener('pointerup', onGroupHandlePointerUp)
    window.removeEventListener('mouseup', onGroupHandlePointerUp)
    window.removeEventListener('pointercancel', onGroupHandlePointerUp)
    activeGroupDrag.handleEl.style.cursor = ''
  }
  document.body.style.cursor = ''
  draggingGroupStem.value = null
  activeGroupDrag = null
}

function onGroupHandlePointerMove(event: PointerEvent | MouseEvent) {
  if (!activeGroupDrag) return

  if (
    !activeGroupDrag.didDrag &&
    Math.abs(event.clientX - activeGroupDrag.startClientX) < GROUP_DRAWER_DRAG_THRESHOLD_PX
  )
    return
  activeGroupDrag.didDrag = true

  const desiredHandleCenterX = event.clientX + activeGroupDrag.pointerHandleCenterOffsetX
  // The overlay is horizontally centered, so growing the drawer recenters the whole panel and
  // moves the visible handle by half the drawer width. Solve against that stable zero-width base.
  const rawWidth = (desiredHandleCenterX - activeGroupDrag.zeroWidthHandleCenterX) * 2
  const nextWidth = Math.max(0, Math.min(rawWidth, activeGroupDrag.maxWidth))
  activeGroupDrag.mainEl.style.setProperty('--drawer-width', `${nextWidth}px`)
  groupPreviewWidth[activeGroupDrag.stem] = nextWidth
}

function onGroupHandlePointerUp() {
  if (!activeGroupDrag) return

  const { stem, didDrag, maxWidth } = activeGroupDrag
  const currentWidth = groupPreviewWidth[stem] ?? (groupOpen[stem] ? maxWidth : 0)

  if (didDrag) {
    groupOpen[stem] = currentWidth >= maxWidth / 2
    suppressHandleClick[stem] = true
  }

  delete groupPreviewWidth[stem]
  clearGroupDragSession()
}

function onGroupHandlePointerDown(stem: StemName, event: PointerEvent | MouseEvent) {
  if (!hasGroupItems(stem)) return
  if (activeGroupDrag?.stem === stem) return
  event.preventDefault()

  const handleEl = event.currentTarget as HTMLElement
  if ('pointerId' in event) {
    try {
      handleEl.setPointerCapture(event.pointerId)
    } catch {
      // Pointer capture can fail on some synthetic events; dragging still works via window listeners.
    }
  }
  handleEl.style.cursor = 'grabbing'

  const mainEl = handleEl.closest('.stem-group__main') as HTMLElement | null
  if (!mainEl) return

  const handleRect = handleEl.getBoundingClientRect()
  const startWidth = getGroupDrawerWidth(stem)
  const handleCenterX = handleRect.left + handleRect.width / 2

  const maxWidth = getGroupDrawerMaxWidth(stem)
  activeGroupDrag = {
    stem,
    handleEl,
    mainEl,
    startClientX: event.clientX,
    pointerHandleCenterOffsetX: handleCenterX - event.clientX,
    zeroWidthHandleCenterX: handleCenterX - startWidth / 2,
    maxWidth,
    didDrag: false,
  }
  suppressHandleClick[stem] = false
  groupPreviewWidth[stem] = startWidth
  draggingGroupStem.value = stem

  window.addEventListener('pointermove', onGroupHandlePointerMove)
  window.addEventListener('mousemove', onGroupHandlePointerMove)
  window.addEventListener('pointerup', onGroupHandlePointerUp)
  window.addEventListener('mouseup', onGroupHandlePointerUp)
  window.addEventListener('pointercancel', onGroupHandlePointerUp)
  document.body.style.cursor = 'grabbing'
}

function onGroupHandleClick(stem: StemName) {
  if (suppressHandleClick[stem]) {
    suppressHandleClick[stem] = false
    return
  }

  toggleGroup(stem)
}

onBeforeUnmount(() => {
  clearGroupDragSession()
  clearLongPressTimer()
  clearAllIconActionTimers()
  closeContextMenu()
})

function onGroupItemInput(stem: StemName, index: number, e: Event) {
  if (!isFaderEditingEnabled.value) return
  const target = e.target as HTMLInputElement
  const value = clamp01(Number.parseFloat(target.value))
  applyGroupGainChange(stem, index, value)
}

function toggleGroupItemMute(stem: StemName, index: number) {
  if (!isFaderEditingEnabled.value) return
  const current = groupItemGain(stem, index)
  const key = groupItemKey(stem, index)
  if (current <= 0) {
    const restore = clamp01(lastNonZeroGroupGain[key] ?? 1)
    applyGroupGainChange(stem, index, restore > 0 ? restore : 1)
    return
  }
  lastNonZeroGroupGain[key] = current
  applyGroupGainChange(stem, index, 0)
}

function runStemPrimaryAction(stem: StemName) {
  if (isStemSoloVisual(stem)) {
    clearSoloForStem(stem)
    return
  }

  toggleMute(stem)
}

function runGroupItemPrimaryAction(stem: StemName, index: number) {
  if (isGroupItemSoloVisual(stem, index)) {
    clearSoloForItem(stem, index)
    return
  }

  toggleGroupItemMute(stem, index)
}

function onStemIconClick(stem: StemName, event: MouseEvent) {
  if (!isFaderEditingEnabled.value) return
  const key = iconTargetKey(stem)
  if (suppressedIconActionKeys.has(key)) {
    suppressedIconActionKeys.delete(key)
    return
  }

  if (event.detail === 0) {
    runStemPrimaryAction(stem)
    return
  }

  scheduleIconAction(
    key,
    () => runStemPrimaryAction(stem),
    () => toggleSoloTarget({ scope: 'global-stem', stem, index: null })
  )
}

function onStemIconPointerUp(stem: StemName, event: PointerEvent) {
  clearLongPressTimer()
  if (event.pointerType !== 'touch') return

  scheduleIconAction(
    iconTargetKey(stem),
    () => runStemPrimaryAction(stem),
    () => toggleSoloTarget({ scope: 'global-stem', stem, index: null })
  )
  suppressedIconActionKeys.add(iconTargetKey(stem))
}

function onGroupItemIconClick(stem: StemName, index: number, event: MouseEvent) {
  if (!isFaderEditingEnabled.value) return
  const key = iconTargetKey(stem, index)
  if (suppressedIconActionKeys.has(key)) {
    suppressedIconActionKeys.delete(key)
    return
  }

  if (event.detail === 0) {
    runGroupItemPrimaryAction(stem, index)
    return
  }

  scheduleIconAction(
    key,
    () => runGroupItemPrimaryAction(stem, index),
    () => toggleSoloTarget({ scope: 'global-item', stem, index })
  )
}

function onGroupItemIconPointerUp(stem: StemName, index: number, event: PointerEvent) {
  clearLongPressTimer()
  if (event.pointerType !== 'touch') return

  scheduleIconAction(
    iconTargetKey(stem, index),
    () => runGroupItemPrimaryAction(stem, index),
    () => toggleSoloTarget({ scope: 'global-item', stem, index })
  )
  suppressedIconActionKeys.add(iconTargetKey(stem, index))
}

// ─── Core fader handlers ─────────────────────────────────────────────────────────────────────────

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
  applyStemGainChange(stem, value)
}

function toggleMute(stem: StemName) {
  if (!isFaderEditingEnabled.value) return

  const current = clamp01(props.gains[stem])
  if (current <= 0) {
    const restore = clamp01(lastNonZeroGain[stem] ?? 1)
    applyStemGainChange(stem, restore > 0 ? restore : 1)
    return
  }

  lastNonZeroGain[stem] = current
  applyStemGainChange(stem, 0)
}

function toggleFaderEditing() {
  if (!isFaderEditingEnabled.value && !props.stemsModeAvailable) return
  const nextEnabled = !isFaderEditingEnabled.value
  isFaderEditingEnabled.value = nextEnabled
  if (nextEnabled) {
    emit('enableStems')
  } else {
    closeContextMenu()
    clearAllSoloTargets()
    emit('disableStems')
  }
}

function resetGains() {
  if (!isFaderEditingEnabled.value) return
  closeContextMenu()
  clearAllSoloTargets()
  emit('resetGains')
}
</script>

<template>
  <div class="stems" :class="{ 'is-open': modelValue }" :style="groupDrawerCssVars">
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
          :class="{ 'is-enabled': isFaderEditingEnabled, 'is-unavailable': !stemsModeAvailable }"
          type="button"
          :aria-pressed="isFaderEditingEnabled"
          :aria-label="'Enable stem mixing'"
          :disabled="!stemsModeAvailable && !isFaderEditingEnabled"
          data-testid="stems-enable-toggle"
          @click="toggleFaderEditing"
        >
          <span class="stems__activation-knob" aria-hidden="true" />
        </button>

        <div class="stems__header-actions">
          <button
            class="stems__mode-btn stems__mode-btn--mute"
            type="button"
            :class="{ 'is-active': allVisibleStemsMuted }"
            :aria-label="allVisibleStemsMuted ? t.faders.unmuteAll : t.faders.muteAll"
            :data-tooltip="allVisibleStemsMuted ? t.faders.unmuteAll : t.faders.muteAll"
            :aria-pressed="allVisibleStemsMuted"
            :disabled="!isFaderEditingEnabled"
            data-testid="stems-mute-all"
            @click="toggleMuteAll"
          >
            <span aria-hidden="true">M</span>
          </button>

          <button
            class="stems__mode-btn stems__mode-btn--solo-clear"
            type="button"
            :aria-label="t.faders.unsoloAll"
            :data-tooltip="t.faders.unsoloAll"
            :aria-pressed="false"
            :disabled="!isFaderEditingEnabled || !hasAnySoloTargets()"
            data-testid="stems-solo-all"
            @click="clearSoloMomentarily"
          >
            <span aria-hidden="true">!S</span>
          </button>

          <button
            class="stems__reset"
            type="button"
            :aria-label="'Reset all faders'"
            :aria-disabled="!isFaderEditingEnabled"
            :data-tooltip="
              isFaderEditingEnabled ? 'Reset all faders' : 'Enable stem mixing to reset faders'
            "
            data-testid="stems-reset"
            @click="resetGains"
          >
            <span class="stems__reset-icon" aria-hidden="true" v-html="clearAllSvg" />
          </button>

          <button
            class="stems__close"
            type="button"
            :aria-label="t.faders.close"
            :data-tooltip="t.faders.close"
            data-testid="stems-close"
            @click="close"
          >
            <span class="stems__close-icon" aria-hidden="true" v-html="closeSvg" />
          </button>
        </div>
      </div>

      <div
        class="stems__grid"
        :class="{ 'stems__grid--disabled': !isFaderEditingEnabled }"
        role="group"
        :aria-label="t.faders.groupLabel"
      >
        <!-- Each stem lives in a stem-group container (flex column):
             [main row: parent fader + optional expanding drawer]
             [footer: expand-toggle or spacer, always 14 px to keep rows aligned] -->
        <div
          v-for="stem in visibleStems"
          :key="stem.key"
          class="stem-group"
          :class="{
            'stem-group--grouped': hasGroupItems(stem.key),
            'stem-group--open': !!groupOpen[stem.key],
          }"
          :data-testid="`stem-${stem.key}`"
        >
          <!-- Main row: parent fader + horizontal drawer -->
          <div class="stem-group__main" :style="groupDrawerStyle(stem.key)">
            <div
              class="stem-group__shell"
              :class="{
                'stem-group__shell--grouped': hasGroupItems(stem.key),
                'stem-group__shell--open': hasGroupItems(stem.key) && isGroupExpanded(stem.key),
              }"
            >
              <div class="stem-group__content">
                <div class="stem-group__anchor">
                  <div
                    class="stem"
                    :class="{
                      'stem--dimmed': isStemDimmed(stem.key),
                      'stem--unavailable': !stem.isAvailable,
                      'stem--group-parent': hasGroupItems(stem.key),
                    }"
                  >
                    <button
                      class="stem__icon-btn"
                      type="button"
                      :data-tooltip="stem.tooltip"
                      :aria-label="t.faders.muteToggle(stem.title)"
                      :aria-pressed="stem.gain <= 0"
                      :disabled="!isFaderEditingEnabled || !stem.isAvailable"
                      :data-testid="`stem-${stem.key}-mute`"
                      @click="onStemIconClick(stem.key, $event)"
                      @contextmenu="openStemContextMenu(stem.key, $event)"
                      @pointerdown="scheduleLongPress(stem.key, null, $event)"
                      @pointerup="onStemIconPointerUp(stem.key, $event)"
                      @pointercancel="clearLongPressTimer"
                      @pointerleave="clearLongPressTimer"
                    >
                      <span class="stem__icon" aria-hidden="true" v-html="stem.icon" />
                      <span v-if="isStemMuted(stem.key)" class="stem__mute-badge" aria-hidden="true"
                        >M</span
                      >
                      <span
                        v-if="isStemSoloVisual(stem.key)"
                        class="stem__solo-badge"
                        aria-hidden="true"
                        >S</span
                      >
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

                <div
                  v-if="hasGroupItems(stem.key)"
                  class="stem-group__drawer"
                  :class="{ 'is-open': isGroupExpanded(stem.key) }"
                  :style="draggingGroupStem === stem.key ? { transition: 'none' } : undefined"
                >
                  <div class="stem-group__drawer-inner" :data-testid="`stem-${stem.key}-labels`">
                    <div
                      v-for="(item, idx) in effectiveGroupItems(stem.key)"
                      :key="idx"
                      class="stem-group__item"
                    >
                      <div
                        class="stem stem--child"
                        :class="{ 'stem--dimmed': isGroupItemDimmed(stem.key, idx) }"
                        :data-testid="`stem-${stem.key}-item-${idx}`"
                      >
                        <button
                          class="stem__icon-btn"
                          type="button"
                          :data-tooltip="groupItemAriaLabel(stem.title, item, idx)"
                          :aria-label="groupItemAriaLabel(stem.title, item, idx)"
                          :aria-pressed="groupItemGain(stem.key, idx) <= 0"
                          :disabled="!isFaderEditingEnabled"
                          :data-testid="`stem-${stem.key}-item-${idx}-mute`"
                          @click="onGroupItemIconClick(stem.key, idx, $event)"
                          @contextmenu="openGroupItemContextMenu(stem.key, idx, $event)"
                          @pointerdown="scheduleLongPress(stem.key, idx, $event)"
                          @pointerup="onGroupItemIconPointerUp(stem.key, idx, $event)"
                          @pointercancel="clearLongPressTimer"
                          @pointerleave="clearLongPressTimer"
                        >
                          <span
                            class="stem__icon"
                            aria-hidden="true"
                            v-html="
                              iconForGroupItem(
                                stem.key,
                                item.role,
                                item.type,
                                groupItemGain(stem.key, idx)
                              )
                            "
                          />
                          <span
                            v-if="isGroupItemMuted(stem.key, idx)"
                            class="stem__mute-badge"
                            aria-hidden="true"
                            >M</span
                          >
                          <span
                            v-if="isGroupItemSoloVisual(stem.key, idx)"
                            class="stem__solo-badge"
                            aria-hidden="true"
                            >S</span
                          >
                        </button>

                        <div
                          class="stem__slider-wrap"
                          :style="{ '--stem-percent': groupItemPercent(stem.key, idx) }"
                        >
                          <input
                            class="stem__slider"
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            :value="groupItemGain(stem.key, idx)"
                            :disabled="!isFaderEditingEnabled"
                            :aria-label="groupItemAriaLabel(stem.title, item, idx)"
                            @input="onGroupItemInput(stem.key, idx, $event)"
                          />
                        </div>
                      </div>

                      <div
                        class="stem-group__item-label"
                        :title="groupItemAriaLabel(stem.title, item, idx)"
                      >
                        <OverflowMarqueeLabel
                          :text="groupItemShortLabel(item, idx)"
                          :data-testid="`stem-${stem.key}-label-${idx}`"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button
                v-if="hasGroupItems(stem.key)"
                class="stem-group__handle"
                :class="{ 'is-open': isGroupExpanded(stem.key) }"
                type="button"
                :aria-label="groupToggleLabel(!!groupOpen[stem.key])"
                :data-tooltip="groupToggleLabel(!!groupOpen[stem.key])"
                :aria-expanded="!!groupOpen[stem.key]"
                :data-testid="`stem-${stem.key}-expand`"
                @click="onGroupHandleClick(stem.key)"
                @pointerdown="onGroupHandlePointerDown(stem.key, $event)"
                @mousedown="onGroupHandlePointerDown(stem.key, $event)"
              >
                <span class="stem-group__handle-grip" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="contextMenuState"
        ref="contextMenuEl"
        class="stems__context-menu"
        :style="{ left: `${contextMenuState.x}px`, top: `${contextMenuState.y}px` }"
        data-testid="stems-context-menu"
        role="menu"
        @pointerdown.stop
        @click.stop
      >
        <button
          v-for="action in contextMenuState.actions"
          :key="action"
          class="stems__context-action"
          type="button"
          role="menuitem"
          :data-testid="`stems-context-action-${action}`"
          @click="runContextMenuAction(action)"
        >
          {{ contextMenuActionLabel(action, contextMenuState) }}
        </button>
      </div>
    </Teleport>
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
  right: 0;
  bottom: calc(100% + 10px);
  left: auto;
  transform: none;
  max-width: min(92vw, 38rem);
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
  right: 14px;
  bottom: -6px;
  width: 12px;
  height: 12px;
  transform: rotate(45deg);
  background: rgba(0, 0, 0, 0.92);
  border-right: 1px solid rgba(255, 255, 255, 0.12);
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.stems__context-menu {
  position: fixed;
  min-width: 9.5rem;
  padding: 0.35rem;
  border-radius: 0.85rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: linear-gradient(180deg, rgba(16, 16, 18, 0.97), rgba(8, 8, 10, 0.94));
  box-shadow: 0 18px 36px rgba(0, 0, 0, 0.34);
  backdrop-filter: blur(16px);
  z-index: 1100;
}

.stems__context-action {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  padding: 0.55rem 0.65rem;
  border: none;
  border-radius: 0.6rem;
  background: transparent;
  color: rgba(255, 255, 255, 0.86);
  font-size: 0.78rem;
  text-align: left;
  cursor: pointer;
  transition:
    background 140ms ease,
    color 140ms ease,
    transform 140ms ease;
}

.stems__context-action:hover,
.stems__context-action:focus-visible {
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
  transform: translateX(1px);
}

.stems__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 22px;
  gap: 10px;
  margin-bottom: 8px;
}

.stems__header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.stems__mode-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.03);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition:
    background 150ms ease,
    border-color 150ms ease,
    color 150ms ease,
    opacity 150ms ease;
}

.stems__mode-btn--mute {
  color: rgba(255, 108, 108, 0.92);
}

.stems__mode-btn--solo {
  color: rgba(245, 210, 108, 0.92);
}

.stems__mode-btn--solo-clear {
  min-width: 28px;
  padding: 0 5px;
  color: rgba(245, 210, 108, 0.92);
}

.stems__mode-btn--mute.is-active {
  background: rgba(255, 108, 108, 0.92);
  border-color: rgba(255, 108, 108, 0.96);
  color: #070707;
}

.stems__mode-btn:disabled {
  opacity: 0.34;
  cursor: default;
}

.stems__mode-btn--solo-clear:not(:disabled):active {
  background: rgba(245, 210, 108, 0.92);
  border-color: rgba(245, 210, 108, 0.96);
  color: #070707;
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

.stems__reset {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.55);
  cursor: pointer;
  transition: color 150ms ease;
}

.stems__reset:hover {
  color: var(--lyrics-album-contour);
}

.stems__reset[aria-disabled='true'] {
  color: rgba(255, 255, 255, 0.24);
  cursor: default;
}

.stems__reset[aria-disabled='true']:hover {
  color: rgba(255, 255, 255, 0.24);
}

:deep(.stems__reset-icon svg) {
  width: 12px;
  height: 12px;
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

.stems__activation-toggle.is-unavailable {
  opacity: 0.35;
  cursor: default;
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
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  padding-top: var(--group-shell-top-overhang);
  padding-bottom: 14px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.34) transparent;
}

.stems__grid::-webkit-scrollbar {
  height: 4px;
}

.stems__grid::-webkit-scrollbar-track {
  background: transparent;
}

.stems__grid::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.34);
  border-radius: 999px;
}

.stems__grid--disabled {
  opacity: 0.54;
}

/* ─── Stem group container (flex column: [main row] + [footer]) ─── */

.stem-group {
  display: flex;
  align-items: flex-end;
  flex-shrink: 0;
}

.stem-group__main {
  position: relative;
  display: flex;
  align-items: flex-end;
  gap: 0;
}

.stem-group__shell {
  position: relative;
  display: flex;
  align-items: stretch;
  isolation: isolate;
}

.stem-group__shell--grouped {
  padding: var(--group-shell-padding-top) var(--group-shell-padding-right)
    var(--group-shell-padding-bottom) var(--group-shell-padding-left);
  transition:
    border-color 180ms ease,
    background 180ms ease,
    box-shadow 220ms ease;
}

.stem-group__shell--grouped::before {
  content: '';
  position: absolute;
  top: calc(var(--group-shell-top-overhang) * -1);
  left: 0;
  right: 0;
  bottom: calc(var(--group-shell-extension-bottom) * -1);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.035);
  pointer-events: none;
  z-index: 0;
  transition:
    border-color 180ms ease,
    background 180ms ease,
    box-shadow 220ms ease;
}

.stem-group__shell--grouped:hover::before {
  border-color: rgba(255, 255, 255, 0.22);
}

.stem-group__shell--open::before {
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
}

.stem-group__content {
  display: flex;
  align-items: flex-end;
  position: relative;
  z-index: 1;
}

.stem-group__anchor {
  width: var(--group-drawer-item-width);
  flex: 0 0 var(--group-drawer-item-width);
}

.stem-group__handle {
  position: absolute;
  top: calc(50% + (var(--group-shell-extension-bottom) / 2));
  right: calc(var(--group-handle-overhang) * -1);
  width: var(--group-handle-width);
  height: var(--group-handle-height);
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.56);
  cursor: grab;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transform: translateY(-50%);
  z-index: 2;
  transition:
    background 180ms ease,
    border-color 180ms ease,
    color 180ms ease,
    box-shadow 180ms ease;
  touch-action: none;
}

.stem-group__handle:active {
  cursor: grabbing;
}

.stem-group__handle:hover {
  color: rgba(255, 255, 255, 0.78);
  background: rgba(255, 255, 255, 0.14);
  border-color: rgba(255, 255, 255, 0.28);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.06);
}

.stem-group__handle.is-open {
  background: color-mix(in srgb, var(--lyrics-album-contour) 18%, rgba(255, 255, 255, 0.06));
  border-color: color-mix(in srgb, var(--lyrics-album-contour) 45%, rgba(255, 255, 255, 0.2));
}

.stem-group__handle-grip {
  position: relative;
  width: var(--group-handle-grip-width);
  height: calc(var(--group-handle-height) - 16px);
  border-radius: 999px;
  background: currentColor;
  opacity: 0.85;
}

.stem-group__handle-grip::before,
.stem-group__handle-grip::after {
  content: '';
  position: absolute;
  left: 0;
  width: var(--group-handle-grip-width);
  height: calc(var(--group-handle-height) - 16px);
  border-radius: 999px;
  background: currentColor;
}

.stem-group__handle-grip::before {
  transform: translateX(calc(var(--group-handle-grip-gap) * -1));
}

.stem-group__handle-grip::after {
  transform: translateX(var(--group-handle-grip-gap));
}

/* ─── Horizontal drawer (CSS grid 0fr → 1fr trick) ─── */

.stem-group__drawer {
  width: 0;
  overflow: hidden;
  transition:
    width 280ms cubic-bezier(0.4, 0, 0.2, 1),
    opacity 220ms ease;
  opacity: 0;
  padding-left: 0;
}

.stem-group__drawer.is-open {
  width: var(--drawer-width);
  opacity: 1;
}

.stem-group__drawer-inner {
  overflow: hidden;
  display: flex;
  gap: var(--group-drawer-gap);
  align-items: flex-end;
  min-width: var(--drawer-width);
  padding: 0 calc(var(--group-drawer-horizontal-padding) / 2);
}

/* ─── Visual distinction for parent / child faders ─── */

.stem--group-parent {
  background: transparent;
  border: none;
  padding: var(--group-stem-top-padding) 0 0;
}

.stem--child {
  background: transparent;
  border-radius: 0;
  padding: var(--group-stem-top-padding) 0 0;
  border: none;
}

.stem-group__item {
  display: grid;
  width: var(--group-drawer-item-width);
  gap: var(--group-item-label-gap);
  justify-items: center;
  align-content: start;
}

.stem-group__item-label {
  width: 100%;
  min-height: var(--group-item-label-min-height);
  text-align: center;
  color: rgba(255, 255, 255, 0.52);
  font-size: 10px;
  line-height: 1;
  font-family: 'Space Mono', 'Courier New', monospace;
  font-weight: 700;
  letter-spacing: 0.04em;
}

/* ─── Shared fader elements ─── */

.stem {
  display: grid;
  gap: var(--stem-control-gap);
  justify-items: center;
  align-content: start;
  min-height: var(--stem-stack-min-height);
  transition: opacity 150ms ease;
}

.stem--dimmed {
  opacity: 0.38;
}

.stem__icon {
  color: currentColor;
}

.stem__icon-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--stem-icon-button-size);
  height: var(--stem-icon-button-size);
  border-radius: 6px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: color 150ms ease;
}

.stem__icon-btn:hover {
  color: var(--lyrics-album-contour);
}

.stem__solo-badge {
  position: absolute;
  top: -3px;
  right: -4px;
  font-size: 9px;
  line-height: 1;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: rgba(245, 210, 108, 0.96);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
  pointer-events: none;
}

.stem__mute-badge {
  position: absolute;
  top: -3px;
  left: -4px;
  font-size: 9px;
  line-height: 1;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: rgba(255, 108, 108, 0.98);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
  pointer-events: none;
}

.stem__icon-btn:disabled {
  cursor: default;
}

.stems__grid--disabled .stem__icon-btn:hover {
  color: rgba(255, 255, 255, 0.44);
}

.mini-player__btn--stems {
  align-self: center;
  line-height: 0;
}

:deep(.stem__icon svg) {
  width: 18px;
  height: 18px;
  display: block;
  color: inherit;
  fill: currentColor;
}

.stem__slider-wrap {
  width: var(--stem-slider-thickness);
  height: var(--stem-slider-length);
  position: relative;
}

.stem__slider {
  position: absolute;
  left: 50%;
  top: 50%;
  width: var(--stem-slider-length);
  height: var(--stem-slider-thickness);
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

.stems__grid--disabled .stem:hover .stem__slider::-webkit-slider-runnable-track {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.5) 0%,
    rgba(255, 255, 255, 0.5) var(--stem-percent, 100%),
    rgba(255, 255, 255, 0.16) var(--stem-percent, 100%),
    rgba(255, 255, 255, 0.16) 100%
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

.stems__grid--disabled .stem:hover .stem__slider::-moz-range-progress {
  background: rgba(255, 255, 255, 0.5);
}

.stem__slider::-moz-range-thumb {
  width: 0;
  height: 0;
  opacity: 0;
  border: none;
}
</style>
