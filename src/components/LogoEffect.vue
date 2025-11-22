<script setup lang="ts">
import { ref } from 'vue'
import { useGSAP } from '../composables/useGSAP'
import gsap from 'gsap'

const props = defineProps<{
  size?: number
  mode?: 'animated' | 'static'
}>()

const emit = defineEmits<{
  (e: 'click'): void
}>()

const size = props.size ?? 280
const mode = props.mode ?? 'animated'

const logoHref = new URL('../assets/images/logo-white-cropped.png', import.meta.url).href

const turbulenceRef = ref<SVGFETurbulenceElement | null>(null)
const wrapperRef = ref<HTMLElement | null>(null)

useGSAP(() => {
  if (mode === 'static') return

  if (wrapperRef.value) {
    gsap.to(wrapperRef.value, {
      rotate: 2,
      duration: 6,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut'
    })
  }

  if (turbulenceRef.value) {
    const el = turbulenceRef.value
    // Animate the baseFrequency attribute for subtle moving noise
    gsap.to(el, {
      attr: { baseFrequency: '0.02 0.06' },
      duration: 4,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut'
    } as any)
  }
})

function onClick() {
  emit('click')
}
</script>

<template>
  <div
    class="logo-effect"
    :style="{ width: size + 'px', height: (size * 0.25) + 'px' }"
    ref="wrapperRef"
    role="img"
    aria-label="Frisches"
    @click="onClick"
  >
    <svg 
      :width="size" 
      :height="size * 0.25" 
      :viewBox="`0 0 ${size * 4} ${size}`"
      xmlns="http://www.w3.org/2000/svg" 
      preserveAspectRatio="xMidYMid meet"
      style="width: 100%; height: 100%; display: block;"
    >
      <defs>
        <filter id="logoNoise">
          <feTurbulence ref="turbulenceRef" type="fractalNoise" baseFrequency="0.01 0.03" numOctaves="2" result="noise" />
          <feDisplacementMap in2="noise" in="SourceGraphic" scale="10" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>

      <image :href="logoHref" x="0" y="0" :width="size * 4" :height="size" preserveAspectRatio="xMidYMid meet" filter="url(#logoNoise)" />
    </svg>
  </div>
</template>

<style scoped>
.logo-effect {
  display: inline-block;
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.logo-effect svg image {
  image-rendering: optimizeQuality;
}

@media (prefers-reduced-motion: reduce) {
  .logo-effect {
    transition: none !important;
    animation: none !important;
  }
}
</style>
