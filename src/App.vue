<script setup lang="ts">
import { ref } from 'vue'
import CardDealer from './components/CardDealer.vue'
import MouseParticles from './components/MouseParticles.vue'

const mouseParticlesRef = ref<{ 
  setLogoButtonState: (hovered: boolean, x: number, y: number) => void
  hideLogoButton: () => void
} | null>(null)

function handleLogoHover(hovered: boolean, x: number, y: number) {
  mouseParticlesRef.value?.setLogoButtonState(hovered, x, y)
}

function handleLogoHide() {
  mouseParticlesRef.value?.hideLogoButton()
}
</script>

<template>
  <div id="app">
    <CardDealer :socialLinks="{
      instagram: 'https://www.instagram.com/frischestheband/',
      spotify: 'https://open.spotify.com/artist/3GkLzwg7QBN5fRoCDcI1pW?si=YoFaY--kTPWO-G1bRsnLdA',
      youtube: 'https://www.youtube.com/@frischestheband'
    }" @logo-hover="handleLogoHover" @logo-hide="handleLogoHide" />
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
