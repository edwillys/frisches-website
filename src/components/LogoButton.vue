<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import gsap from 'gsap'
import LogoEffect from './LogoEffect.vue'

const props = defineProps<{
  size?: number
}>()

const emit = defineEmits<{
  (e: 'click'): void
}>()

const size = props.size ?? 240
const wrapperRef = ref<HTMLElement | null>(null)
const glowRef = ref<HTMLElement | null>(null)
const haloRef = ref<HTMLElement | null>(null)
const pulseRef = ref<HTMLElement | null>(null)
const logoSize = 140
const circleSize = logoSize + 10
const pulseSize = circleSize + 16
const haloSize = size + 16
const glowSize = size + 28

let heartbeatTimeline: gsap.core.Timeline | null = null
let glowTween: gsap.core.Tween | null = null
let haloTween: gsap.core.Tween | null = null

function onClick() {
  emit('click')
}

onMounted(() => {
  if (!wrapperRef.value || !glowRef.value || !haloRef.value || !pulseRef.value) return

  heartbeatTimeline = gsap.timeline({ repeat: -1, defaults: { ease: 'sine.inOut' } })
  heartbeatTimeline
    .fromTo(
      pulseRef.value,
      { scale: 0.96 },
      { scale: 1.05, duration: 0.55 }
    )
    .to(pulseRef.value, { scale: 0.98, duration: 0.45 })

  glowTween = gsap.to(glowRef.value, {
    opacity: 0.75,
    scale: 1.12,
    duration: 1.2,
    ease: 'sine.inOut',
    repeat: -1,
    yoyo: true
  })

  haloTween = gsap.to(haloRef.value, {
    opacity: 0.7,
    scale: 1.06,
    duration: 1.4,
    ease: 'sine.inOut',
    repeat: -1,
    yoyo: true
  })
})

onBeforeUnmount(() => {
  heartbeatTimeline && 'kill' in heartbeatTimeline && (heartbeatTimeline as gsap.core.Timeline).kill()
  glowTween?.kill()
  haloTween?.kill()
})

defineExpose({
  rootEl: wrapperRef
})
</script>

<template>
  <div
    ref="wrapperRef"
    class="logo-button"
    :style="{ width: size + 'px', height: size + 'px' }"
    role="button"
    tabindex="0"
    aria-label="Frisches - Click to reveal menu"
    @click="onClick"
    @keydown.enter="onClick"
  >
    <div
      ref="glowRef"
      class="logo-button__glow"
      :style="{ width: glowSize + 'px', height: glowSize + 'px' }"
    ></div>
    <div
      ref="haloRef"
      class="logo-button__halo"
      :style="{ width: haloSize + 'px', height: haloSize + 'px' }"
    ></div>

    <div
      ref="pulseRef"
      class="logo-button__pulse"
      :style="{ width: pulseSize + 'px', height: pulseSize + 'px' }"
    ></div>

    <div
      class="logo-button__circle"
      :style="{ width: circleSize + 'px', height: circleSize + 'px' }"
    ></div>
    
    <!-- Logo inside circle -->
    <div class="logo-button__content">
      <LogoEffect :size="logoSize" mode="static" />
    </div>
  </div>
</template>

<style scoped>
.logo-button {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.logo-button__glow,
.logo-button__halo,
.logo-button__pulse,
.logo-button__circle {
  position: absolute;
  width: 100%;
  height: 100%;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  pointer-events: none;
}

.logo-button__glow {
  background: radial-gradient(circle, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.05) 70%, transparent 100%);
  filter: blur(16px);
  opacity: 0.6;
}

.logo-button__halo {
  border: 2px solid rgba(255, 255, 255, 0.5);
  opacity: 0.4;
}

.logo-button__pulse {
  border: 2px solid rgba(255, 255, 255, 0.55);
  box-shadow: 0 0 25px rgba(255, 255, 255, 0.25);
  opacity: 0.85;
}

.logo-button__circle {
  border: 2px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 0 12px rgba(255, 255, 255, 0.2);
}

.logo-button__content {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-button:hover .logo-button__circle {
  box-shadow: 0 0 30px rgba(255, 255, 255, 0.4);
  border-color: rgba(255, 255, 255, 1);
}

@media (prefers-reduced-motion: reduce) {
  .logo-button {
    transition: none !important;
  }

  .logo-button__glow,
  .logo-button__halo {
    animation: none !important;
  }
}
</style>
