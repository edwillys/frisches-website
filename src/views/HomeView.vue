<template>
  <main class="home-view">
    <!-- Reuse existing CardDealer component for the home screen -->
    <CardDealer />
  </main>
</template>

<script setup lang="ts">
import CardDealer from '@/components/CardDealer.vue'
</script>

<style scoped>
.home-view {
  width: 100%;
  height: 100%;
}
</style>
