<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'

type Anchor = 'center' | 'top' | 'bottom'

type Source = {
  key: string
  el: HTMLElement | null
}

const props = defineProps<{
  containerEl: HTMLElement | null
  targetEl: HTMLElement | null
  sources: Source[]
  activeKey?: string | null
  sourceAnchor?: Anchor
  targetAnchor?: Anchor
  sourceOffset?: { x: number; y: number }
  targetOffset?: { x: number; y: number }
  pulseTravelSec?: number
  pulseIdleSec?: number
  pulseLengthPct?: number
}>()

const width = ref(0)
const height = ref(0)
const extraTop = ref(0)
const extraBottom = ref(0)

const svgHeight = computed(() => Math.max(0, height.value + extraTop.value + extraBottom.value))

type Connection = {
  id: string
  key: string
  d: string
  start: { x: number; y: number }
  end: { x: number; y: number }
  sourceColor: string
  targetColor: string
}

const connections = shallowRef<Connection[]>([])

const sourceAnchor = computed<Anchor>(() => props.sourceAnchor ?? 'bottom')
const targetAnchor = computed<Anchor>(() => props.targetAnchor ?? 'bottom')
const sourceOffset = computed(() => props.sourceOffset ?? { x: 0, y: 8 })
const targetOffset = computed(() => props.targetOffset ?? { x: 0, y: 10 })

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

// Pulse controls (tweakable):
// - travel: total visible time from emerge to disappear (seconds)
// - idle: pause time between cycles (seconds)
// - length: dash length as percentage of path (0–100%)
//
// Travel is divided into three equal phases: emerge (1/3), move (1/3), disappear (1/3).
// pathLength="100" normalizes dash lengths, eliminating per-path staggering.
const pulseTravelSec = computed(() => clamp(Number(props.pulseTravelSec ?? 1.0), 0.05, 60))
const pulseIdleSec = computed(() => clamp(Number(props.pulseIdleSec ?? 2.5), 0, 60))
const pulseLengthPct = computed(() => clamp(Number(props.pulseLengthPct ?? 60), 0, 100))

const pulseTotalSec = computed(() => pulseTravelSec.value + pulseIdleSec.value)
const pulseTravelRatio = computed(() => {
  const total = pulseTotalSec.value
  return total > 0 ? pulseTravelSec.value / total : 1
})

// Make the pulse "emerge" from the source by growing its dash length from 0
// to the full segment length over the start of the travel phase.
// The travel time is divided into three equal phases: emerge, move, disappear.
const pulseGrowRatio = computed(() => {
  const total = pulseTotalSec.value
  const phaseDuration = pulseTravelSec.value / 3
  return total > 0 ? clamp(phaseDuration / total, 0, pulseTravelRatio.value) : 0
})

const pulseShrinkStartRatio = computed(() => {
  const total = pulseTotalSec.value
  const phaseDuration = pulseTravelSec.value / 3
  const shrinkStart = pulseTravelSec.value - phaseDuration
  return total > 0
    ? clamp(shrinkStart / total, pulseGrowRatio.value, pulseTravelRatio.value)
    : pulseTravelRatio.value
})

const pulseHeadPct = computed(() => {
  // Small visible "head" so the pulse doesn't pop in as a full block.
  // Keep it subtle and never larger than the full pulse length.
  return clamp(Math.min(4, pulseLengthPct.value * 0.2), 0, pulseLengthPct.value)
})

const pulseDasharrayKeyTimes = computed(() => {
  // 0: head appears
  // grow: head -> full length (emerge phase)
  // shrinkStart: hold full length while moving
  // travelEnd: shrink to 0 (disappear phase)
  // 1: idle (stay hidden)
  return `0;${pulseGrowRatio.value};${pulseShrinkStartRatio.value};${pulseTravelRatio.value};1`
})

const pulseDasharraySplines = computed(() => {
  // For 5 values, we need 4 splines.
  // All phases use gentle continuous easing for smooth flow.
  // Grow: gentle ease-out, hold: linear, shrink: gentle ease-in, idle: linear.
  return '0.33 0 0.67 1;0 0 1 1;0.33 0 0.67 1;0 0 1 1'
})

const pulseDashoffsetKeyTimes = computed(() => `0;${pulseTravelRatio.value};1`)
const pulseDashoffsetSplines = computed(() => {
  // Move continuously with gentle ease-in-out, hold during idle.
  return '0.33 0 0.67 1;0 0 1 1'
})

// Use a dash pattern whose period is > 100 (because the gap is fixed at 100).
// This avoids "wrap" artifacts and lets the pulse keep moving until its *tail*
// reaches the destination.
//
// With pathLength=100:
// - head reaches target when dashoffset = -(100 - len)
// - tail reaches target when dashoffset = -100
const pulseDasharray = computed(() => `${pulseLengthPct.value} 100`)
const pulseDasharrayValues = computed(
  () =>
    `${pulseHeadPct.value} 100;${pulseLengthPct.value} 100;${pulseLengthPct.value} 100;0 100;0 100`
)
const pulseDashoffsetValues = computed(() => '0;-100;-100')

// Controls how high the farthest arc peaks above the midpoint (in px).
// All other arcs scale down from this based on their distance to the target.
const ARC_MAX_LIFT_PX = 25

// Optional shaping: >1 makes near arcs flatter, <1 makes them closer to max lift.
const ARC_LIFT_POWER = 1

function getAnchorPoint(el: HTMLElement, containerRect: DOMRect, anchor: Anchor) {
  const r = el.getBoundingClientRect()

  const x = r.left - containerRect.left + r.width / 2
  const yBase = r.top - containerRect.top
  const y = anchor === 'top' ? yBase : anchor === 'bottom' ? yBase + r.height : yBase + r.height / 2

  return { x, y }
}

let ro: ResizeObserver | null = null
let rafId = 0

function scheduleUpdate() {
  if (rafId) return
  rafId = window.requestAnimationFrame(() => {
    rafId = 0
    updatePaths()
  })
}

function updatePaths() {
  const container = props.containerEl
  const target = props.targetEl

  if (!container || !target) {
    connections.value = []
    width.value = 0
    height.value = 0
    return
  }

  const containerRect = container.getBoundingClientRect()
  width.value = Math.max(0, containerRect.width)
  height.value = Math.max(0, containerRect.height)
  extraTop.value = 0
  extraBottom.value = 0

  if (width.value === 0 || height.value === 0) {
    connections.value = []
    return
  }

  const endBase = getAnchorPoint(target, containerRect, targetAnchor.value)
  const end = {
    x: endBase.x + targetOffset.value.x,
    y: endBase.y + targetOffset.value.y,
  }

  const targetColor =
    (typeof window !== 'undefined'
      ? window.getComputedStyle(target).color
      : 'rgba(255,255,255,0.8)') || 'rgba(255,255,255,0.8)'

  type Segment = {
    key: string
    start: { x: number; y: number }
    end: { x: number; y: number }
    dist: number
    sourceColor: string
  }

  const segments: Segment[] = []
  let minY = Math.min(end.y, 0)
  let maxY = Math.max(end.y, height.value)
  let maxDist = 1

  const existingByKey = new Map(connections.value.map((c) => [c.key, c]))
  const nextConnections: Connection[] = []

  for (const src of props.sources) {
    if (!src.el) continue

    const startBase = getAnchorPoint(src.el, containerRect, sourceAnchor.value)
    const start = {
      x: startBase.x + sourceOffset.value.x,
      y: startBase.y + sourceOffset.value.y,
    }

    const dx = end.x - start.x
    const dy = end.y - start.y
    const dist = Math.hypot(dx, dy)
    maxDist = Math.max(maxDist, dist)

    const sourceColor =
      (typeof window !== 'undefined'
        ? window.getComputedStyle(src.el).color
        : 'rgba(0,212,224,0.9)') || 'rgba(0,212,224,0.9)'

    segments.push({ key: src.key, start, end, dist, sourceColor })
  }

  // Compute control points in a second pass so we can scale lift by max distance.
  const segmentsWithControl = segments.map((seg) => {
    // Quadratic bezier control at midpoint keeps the apex centered.
    const midX = (seg.start.x + seg.end.x) / 2
    const midY = (seg.start.y + seg.end.y) / 2

    const t = maxDist > 0 ? Math.max(0, Math.min(1, seg.dist / maxDist)) : 0
    const scaled = ARC_LIFT_POWER === 1 ? t : Math.pow(t, ARC_LIFT_POWER)
    const lift = ARC_MAX_LIFT_PX * scaled
    const c = { x: midX, y: midY - lift }

    minY = Math.min(minY, seg.start.y, seg.end.y, c.y)
    maxY = Math.max(maxY, seg.start.y, seg.end.y, c.y)

    return { ...seg, c }
  })

  // Expand SVG viewport so arcs can go above/below without being clipped,
  // while keeping 1:1 pixel mapping at the button anchors.
  const pad = 16
  const neededTop = Math.max(0, Math.ceil(-minY + pad))
  const neededBottom = Math.max(0, Math.ceil(maxY - height.value + pad))
  extraTop.value = neededTop
  extraBottom.value = neededBottom

  for (const seg of segmentsWithControl) {
    const yOff = extraTop.value
    const d = `M ${seg.start.x.toFixed(2)} ${(seg.start.y + yOff).toFixed(2)} Q ${seg.c.x.toFixed(2)} ${(seg.c.y + yOff).toFixed(2)} ${seg.end.x.toFixed(2)} ${(seg.end.y + yOff).toFixed(2)}`

    const startPt = { x: seg.start.x, y: seg.start.y + yOff }
    const endPt = { x: seg.end.x, y: seg.end.y + yOff }

    const existing = existingByKey.get(seg.key)
    if (existing) {
      existing.d = d
      existing.start = startPt
      existing.end = endPt
      existing.sourceColor = seg.sourceColor
      existing.targetColor = targetColor
      nextConnections.push(existing)
      continue
    }

    nextConnections.push({
      id: `vine-${seg.key}-to-target`,
      key: seg.key,
      d,
      start: startPt,
      end: endPt,
      sourceColor: seg.sourceColor,
      targetColor,
    })
  }

  connections.value = nextConnections
}

watch(
  () => [props.containerEl, props.targetEl, props.sources, props.activeKey],
  () => scheduleUpdate(),
  { flush: 'post' }
)

onMounted(() => {
  scheduleUpdate()

  if (typeof window !== 'undefined' && 'ResizeObserver' in window) {
    ro = new ResizeObserver(() => scheduleUpdate())

    if (props.containerEl) ro.observe(props.containerEl)
    if (props.targetEl) ro.observe(props.targetEl)

    for (const s of props.sources) {
      if (s.el) ro.observe(s.el)
    }
  }

  window.addEventListener('resize', scheduleUpdate, { passive: true })
})

onUnmounted(() => {
  if (rafId) {
    window.cancelAnimationFrame(rafId)
    rafId = 0
  }

  window.removeEventListener('resize', scheduleUpdate)

  if (ro) {
    ro.disconnect()
    ro = null
  }

  connections.value = []
})

const viewBox = computed(() => `0 0 ${width.value} ${svgHeight.value}`)
</script>

<template>
  <svg
    class="vine-overlay"
    :width="width"
    :height="svgHeight"
    :viewBox="viewBox"
    :style="{ '--ext-top': `${extraTop}px`, '--ext-bottom': `${extraBottom}px` }"
    aria-hidden="true"
  >
    <defs>
      <!-- Glow aura: blur the stroke and merge back -->

      <template v-for="c in connections" :key="c.id">
        <!-- Per-connection color sync: source -> target gradient -->
        <linearGradient
          :id="`conduit-grad-${c.id}`"
          gradientUnits="userSpaceOnUse"
          :x1="c.start.x"
          :y1="c.start.y"
          :x2="c.end.x"
          :y2="c.end.y"
        >
          <stop offset="0%" :stop-color="c.sourceColor" stop-opacity="1" />
          <stop offset="100%" :stop-color="c.targetColor" stop-opacity="1" />
        </linearGradient>

        <!-- Vercel-like end fade: mask fades near both endpoints along the axis -->
        <linearGradient
          :id="`conduit-mask-grad-${c.id}`"
          gradientUnits="userSpaceOnUse"
          :x1="c.start.x"
          :y1="c.start.y"
          :x2="c.end.x"
          :y2="c.end.y"
        >
          <stop offset="0%" stop-color="white" stop-opacity="0" />
          <stop offset="10%" stop-color="white" stop-opacity="1" />
          <stop offset="90%" stop-color="white" stop-opacity="1" />
          <stop offset="100%" stop-color="white" stop-opacity="0" />
        </linearGradient>

        <mask :id="`conduit-mask-${c.id}`">
          <rect
            x="0"
            y="0"
            :width="width"
            :height="svgHeight"
            :fill="`url(#conduit-mask-grad-${c.id})`"
          />
        </mask>
      </template>
    </defs>

    <g v-for="c in connections" :key="c.id" class="conduit">
      <!-- Track: always-visible, thin, low-opacity line -->
      <path :d="c.d" class="conduit__track" :mask="`url(#conduit-mask-${c.id})`" />

      <!-- Pulse: sharp traveling segment toward the target -->
      <path
        :d="c.d"
        pathLength="100"
        class="conduit__pulse"
        :class="{ 'conduit__pulse--active': props.activeKey != null && c.key === props.activeKey }"
        :mask="`url(#conduit-mask-${c.id})`"
        :style="{ '--grad': `url(#conduit-grad-${c.id})`, strokeDasharray: pulseDasharray }"
      >
        <animate
          v-if="props.activeKey != null && c.key === props.activeKey && pulseTotalSec > 0"
          attributeName="stroke-dasharray"
          :dur="`${pulseTotalSec}s`"
          repeatCount="indefinite"
          :values="pulseDasharrayValues"
          :keyTimes="pulseDasharrayKeyTimes"
          calcMode="spline"
          :keySplines="pulseDasharraySplines"
        />

        <animate
          v-if="props.activeKey != null && c.key === props.activeKey && pulseTotalSec > 0"
          attributeName="stroke-dashoffset"
          :dur="`${pulseTotalSec}s`"
          repeatCount="indefinite"
          :values="pulseDashoffsetValues"
          :keyTimes="pulseDashoffsetKeyTimes"
          calcMode="spline"
          :keySplines="pulseDashoffsetSplines"
        />
      </path>
    </g>
  </svg>
</template>

<style scoped>
.vine-overlay {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(0px - var(--ext-top, 0px));
  width: 100%;
  height: calc(100% + var(--ext-top, 0px) + var(--ext-bottom, 0px));
  pointer-events: none;
  overflow: visible;
  z-index: 0;
}

.conduit__track {
  fill: none;
  stroke: rgba(255, 255, 255, 0.1);
  stroke-width: 1.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.conduit__glow {
  fill: none;
  stroke: var(--grad);
  stroke-opacity: 0.35;
  stroke-width: 6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.conduit__pulse {
  fill: none;
  stroke: var(--grad);
  stroke-opacity: 0;
  stroke-width: 0;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dashoffset: 0;
}

.conduit__pulse--active {
  stroke-opacity: 1;
  stroke-width: 2.6;
}
</style>
