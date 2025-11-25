<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import gsap from 'gsap'
import LogoEffect from './LogoEffect.vue'

const props = defineProps<{
  size?: number
}>()

const emit = defineEmits<{
  (e: 'click'): void
  (e: 'hover', value: boolean): void
}>()

const size = props.size ?? 200
const LOGO_SIZE = 110
const CIRCLE_SIZE = LOGO_SIZE - 15
const GLOW_SIZE = size - 100

const wrapperRef = ref<HTMLElement | null>(null)
const glowRef = ref<HTMLElement | null>(null)

let glowTween: gsap.core.Tween | null = null

function onClick() {
  emit('click')
}

function onMouseEnter() {
  emit('hover', true)
}

function onMouseLeave() {
  emit('hover', false)
}

onMounted(() => {
  if (!wrapperRef.value || !glowRef.value) return

  glowTween = gsap.to(glowRef.value, {
    opacity: 0.6,
    scale: 1.15,
    duration: 2.5, // Slower duration
    ease: 'sine.inOut',
    repeat: -1,
    yoyo: true,
  })
})

onBeforeUnmount(() => {
  glowTween?.kill()
})

defineExpose({
  rootEl: wrapperRef,
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
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <div
      ref="glowRef"
      class="logo-button__glow"
      :style="{ width: GLOW_SIZE + 'px', height: GLOW_SIZE + 'px' }"
    ></div>

    <div
      class="logo-button__circle"
      :style="{ width: CIRCLE_SIZE + 'px', height: CIRCLE_SIZE + 'px' }"
    ></div>

    <!-- Logo inside circle -->
    <div class="logo-button__content">
      <LogoEffect :size="LOGO_SIZE" mode="static" />
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
  background: radial-gradient(
    circle,
    rgba(255, 255, 255, 0.6) 0%,
    rgba(220, 20, 60, 0.4) 50%,
    transparent 100%
  );
  filter: blur(16px);
  opacity: 0.4;
}

.logo-button__circle {
  border: 2px solid rgba(255, 255, 255, 0.7);
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

  .logo-button__glow {
    animation: none !important;
  }
}
</style>
