<script setup lang="ts">
import { useLyricsCards } from '@/composables/useLyricsCards'

import LyricsFlipCard from './LyricsFlipCard.vue'

interface Props {
  isActive?: boolean
  backSignal?: number
}

const props = withDefaults(defineProps<Props>(), {
  isActive: false,
  backSignal: 0,
})

const emit = defineEmits<{
  (e: 'detail-open-change', isOpen: boolean): void
}>()

const lyricsCards = useLyricsCards()
</script>

<template>
  <section class="lyrics-cards" data-testid="lyrics-cards-view">
    <div class="lyrics-cards__stage" data-testid="lyrics-cards-carousel">
      <div v-if="lyricsCards" class="lyrics-cards__cell" data-about-card>
        <LyricsFlipCard
          :card="lyricsCards"
          :back-signal="props.backSignal"
          @detail-open-change="emit('detail-open-change', $event)"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.lyrics-cards {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-height: 0;
  margin: 0 auto;
  padding: 0;
  box-sizing: border-box;
  overflow-x: hidden;
}

.lyrics-cards__stage {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
  padding-inline: var(--about-track-inline-padding);
  scrollbar-width: none;
}

.lyrics-cards__stage::-webkit-scrollbar {
  display: none;
}

.lyrics-cards__cell {
  flex: 0 1 min(var(--about-card-width-desktop), calc(100vw - 2rem));
  width: min(var(--about-card-width-desktop), calc(100vw - 2rem));
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  scroll-snap-align: center;
}
</style>
