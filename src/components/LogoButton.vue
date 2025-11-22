<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
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
const particlesRef = ref<HTMLElement | null>(null)
const logoSize = 140 // Internal logo size
const circleRadius = computed(() => (logoSize + 30) / 2) // Logo size plus margin, then radius

interface Particle {
  x: number
  y: number
  angle: number
  distance: number
}

const particles = ref<Particle[]>([])

function onClick() {
  emit('click')
}

function generateParticles() {
  // Generate 8-12 random particles
  const particleCount = Math.floor(Math.random() * 5) + 8
  const newParticles: Particle[] = []

  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2
    const distance = circleRadius.value + Math.random() * 40 + 10
    newParticles.push({
      angle,
      distance,
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
    })
  }

  particles.value = newParticles
}

function animateParticles() {
  if (!particlesRef.value) return

  const particleElements = particlesRef.value.querySelectorAll('.particle')

  particles.value.forEach((particle, index) => {
    if (!particleElements[index]) return

    const element = particleElements[index] as HTMLElement
    const distance = circleRadius.value + Math.random() * 60 + 20
    const angle = particle.angle + (Math.random() - 0.5) * 0.6

    gsap.to(element, {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      opacity: 0,
      duration: 1.2 + Math.random() * 0.6,
      ease: 'power1.out',
      onComplete: () => {
        // Reset particle for next burst
        gsap.set(element, {
          x: Math.cos(particle.angle) * circleRadius.value,
          y: Math.sin(particle.angle) * circleRadius.value,
          opacity: 1,
        })
      },
    })
  })
}

onMounted(() => {
  generateParticles()

  // Animate particles periodically
  const interval = setInterval(() => {
    animateParticles()
  }, 2000)

  return () => clearInterval(interval)
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
    <!-- Animated particles -->
    <div ref="particlesRef" class="logo-button__particles">
      <div
        v-for="(particle, index) in particles"
        :key="index"
        class="particle"
        :style="{
          left: size / 2 + 'px',
          top: size / 2 + 'px',
        }"
      ></div>
    </div>

    <!-- White circle background (sized to fit logo with margin) -->
    <div class="logo-button__circle"></div>
    
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

.logo-button__particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.particle {
  position: absolute;
  width: 4px;
  height: 4px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 50%;
  box-shadow: 0 0 6px rgba(255, 255, 255, 0.6);
  transform: translate(-50%, -50%);
  opacity: 1;
}

/* Circle is now sized to fit the logo (140px) plus margin (30px total), so diameter is 170px, radius 85px */
.logo-button__circle {
  position: absolute;
  width: 170px;
  height: 170px;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: transparent;
  border: 3px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.2);
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

  .particle {
    animation: none !important;
  }
}
</style>
