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

const wrapperRef = ref<HTMLElement | null>(null)
const imageRef = ref<SVGImageElement | null>(null)

useGSAP(() => {
  if (mode === 'static' || !imageRef.value) return

  // Continuous heartbeat (pumping)
  gsap.to(imageRef.value, {
    scale: 1.03,
    transformOrigin: 'center center',
    duration: 0.8,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut'
  })

  // Glowing effect (opacity/filter pulse)
  gsap.to(imageRef.value, {
    filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.6))',
    duration: 1.5,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut'
  })
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
      style="width: 100%; height: 100%; display: block; overflow: visible;"
    >
      <image 
        ref="imageRef"
        :href="logoHref" 
        x="0" 
        y="0" 
        :width="size * 4" 
        :height="size" 
        preserveAspectRatio="xMidYMid meet" 
      />
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
