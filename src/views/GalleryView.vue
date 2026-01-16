<template>
  <div class="gallery-view">
    <GalleryManager />
  </div>
</template>

<script setup lang="ts">
import GalleryManager from '@/components/GalleryManager.vue'
</script>

<style scoped lang="scss">
.gallery-view {
  width: 100%;
  min-height: 100vh;
}
</style>
