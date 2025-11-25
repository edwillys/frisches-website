<script setup lang="ts">
import { ref } from 'vue'
import CardDealer from './components/CardDealer.vue'
import MouseParticles from './components/MouseParticles.vue'

const mouseParticlesRef = ref<{
  setLogoButtonState: (hovered: boolean, x: number, y: number) => void
  hideLogoButton: () => void
  setParticleColor?: (r: number, g: number, b: number) => void
} | null>(null)

function handleLogoHover(hovered: boolean, x: number, y: number) {
  mouseParticlesRef.value?.setLogoButtonState(hovered, x, y)
}

function handleLogoHide() {
  mouseParticlesRef.value?.hideLogoButton()
}

// Listen for palette changes from CardDealer and forward to particles
function handlePaletteChange(payload: number[] | null) {
  if (!mouseParticlesRef.value) return
  if (!payload) {
    // Try to read main/home palette from CSS vars, otherwise fallback to a sensible default
    try {
      const styles = getComputedStyle(document.documentElement)
      const rawMain = styles.getPropertyValue('--bg-main-particles') || ''
      const arrMain = rawMain
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => Number.isFinite(n))
      if (arrMain.length >= 3) {
        mouseParticlesRef.value.setParticleColor?.(arrMain[0]!, arrMain[1]!, arrMain[2]!)
      } else {
        mouseParticlesRef.value.setParticleColor?.(220, 40, 40)
      }
    } catch {
      mouseParticlesRef.value.setParticleColor?.(220, 40, 40)
    }
  } else {
    mouseParticlesRef.value.setParticleColor?.(payload[0]!, payload[1]!, payload[2]!)
  }
}
</script>

<template>
  <div id="app">
    <CardDealer
      :socialLinks="{
        instagram: 'https://www.instagram.com/frischestheband/',
        spotify: 'https://open.spotify.com/artist/3GkLzwg7QBN5fRoCDcI1pW?si=YoFaY--kTPWO-G1bRsnLdA',
        youtube: 'https://www.youtube.com/@frischestheband',
      }"
      @logo-hover="handleLogoHover"
      @logo-hide="handleLogoHide"
      @palette-change="handlePaletteChange"
    />
    <MouseParticles ref="mouseParticlesRef" />
  </div>
</template>

<style scoped>
#app {
  width: 100%;
  min-height: 100vh;
  position: relative;
  z-index: 1;
}
</style>
