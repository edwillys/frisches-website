<script setup lang="ts">
import CardDealer from './components/CardDealer.vue'
import MouseParticles from './components/MouseParticles.vue'
</script>

<template>
  <div id="app">
    <CardDealer :socialLinks="{
      instagram: 'https://www.instagram.com/frischestheband/',
      spotify: 'https://open.spotify.com/artist/3GkLzwg7QBN5fRoCDcI1pW?si=YoFaY--kTPWO-G1bRsnLdA',
      youtube: 'https://www.youtube.com/@frischestheband'
    }" />
    <MouseParticles />
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
