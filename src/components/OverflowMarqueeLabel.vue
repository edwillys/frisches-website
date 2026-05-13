<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'

import { useOverflowMarquee } from '@/composables/useOverflowMarquee'

const props = defineProps<{
  text: string
}>()

const labelEl = ref<HTMLElement | null>(null)
const { isOverflowing, scheduleOverflowUpdate } = useOverflowMarquee(labelEl)

watch(labelEl, async () => {
  await nextTick()
  scheduleOverflowUpdate()
})

watch(
  () => props.text,
  async () => {
    await nextTick()
    scheduleOverflowUpdate()
  },
  { immediate: true }
)
</script>

<template>
  <span ref="labelEl" class="overflow-marquee-label" :class="{ 'is-marquee': isOverflowing }">
    <span class="overflow-marquee-label__text" data-marquee-text>{{ text }}</span>
  </span>
</template>

<style scoped>
.overflow-marquee-label {
  --marquee-distance: 0px;
  --overflow-marquee-duration: 6.8s;
  display: block;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.overflow-marquee-label.is-marquee {
  text-overflow: clip;
}

.overflow-marquee-label__text {
  display: inline-block;
  transform: translateX(0);
  will-change: transform;
}

.overflow-marquee-label.is-marquee .overflow-marquee-label__text {
  animation: overflow-marquee-label-scroll var(--overflow-marquee-duration) linear infinite;
}

@keyframes overflow-marquee-label-scroll {
  0% {
    transform: translateX(0);
  }
  8% {
    transform: translateX(0);
  }
  68% {
    transform: translateX(calc(-1 * var(--marquee-distance)));
  }
  84% {
    transform: translateX(calc(-1 * var(--marquee-distance)));
  }
  84.01% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(0);
  }
}
</style>
