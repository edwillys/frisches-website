<script setup lang="ts">
import { computed, nextTick, ref, watch, type ComponentPublicInstance } from 'vue'

import AboutFlipCard from './AboutFlipCard.vue'
import { useAboutMembers } from '@/composables/useAboutMembers'
import { useAudioStore } from '@/stores/audio'

interface Props {
  isActive?: boolean
}

interface AboutFlipCardHandle {
  focusCard: () => void
}

const props = withDefaults(defineProps<Props>(), {
  isActive: false,
})

const audioStore = useAudioStore()
const aboutMembers = useAboutMembers()
const flippedMemberIds = ref<string[]>([])
const focusedIndex = ref(0)
const cardRefs = ref<Array<AboutFlipCardHandle | null>>([])
const cellRefs = ref<Array<HTMLElement | null>>([])
const rootRef = ref<HTMLElement | null>(null)
const initialToIndex = computed(
  () =>
    new Map(
      aboutMembers.value
        .filter((member) => member.initial)
        .map((member, index) => [member.initial, index])
    )
)

const setCardRef = (instance: AboutFlipCardHandle | null, index: number) => {
  cardRefs.value[index] = instance
}

const setCellRef = (element: Element | ComponentPublicInstance | null, index: number) => {
  const resolvedElement =
    element instanceof HTMLElement
      ? element
      : element && '$el' in element && element.$el instanceof HTMLElement
        ? element.$el
        : null

  cellRefs.value[index] = resolvedElement
}

const getScrollBehavior = (): ScrollBehavior => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'smooth'
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
}

const focusCardAtIndex = async (index: number) => {
  const boundedIndex = Math.min(Math.max(index, 0), aboutMembers.value.length - 1)
  focusedIndex.value = boundedIndex
  await nextTick()
  const cellElement = cellRefs.value[boundedIndex]

  if (cellElement && typeof cellElement.scrollIntoView === 'function') {
    cellElement.scrollIntoView({
      behavior: getScrollBehavior(),
      block: 'nearest',
      inline: 'center',
    })
  }

  cardRefs.value[boundedIndex]?.focusCard()
}

const toggleCard = (index: number) => {
  const member = aboutMembers.value[index]
  if (!member) return

  const isOpen = flippedMemberIds.value.includes(member.id)
  flippedMemberIds.value = isOpen
    ? flippedMemberIds.value.filter((memberId) => memberId !== member.id)
    : [...flippedMemberIds.value, member.id]
}

const playFavoriteSong = (trackId: string) => {
  audioStore.startFromAbout(trackId)
}

const moveFocus = async (direction: 'left' | 'right' | 'up' | 'down') => {
  const currentIndex = focusedIndex.value
  const lastIndex = aboutMembers.value.length - 1
  let nextIndex = currentIndex

  if (direction === 'left' || direction === 'up') {
    nextIndex = Math.max(0, currentIndex - 1)
  }

  if (direction === 'right' || direction === 'down') {
    nextIndex = Math.min(lastIndex, currentIndex + 1)
  }

  if (nextIndex === currentIndex) return
  await focusCardAtIndex(nextIndex)
}

const handleKeydown = async (event: KeyboardEvent) => {
  if (!props.isActive) return
  if (event.altKey || event.ctrlKey || event.metaKey) return

  const target = event.target
  if (!(target instanceof HTMLElement)) return
  if (!rootRef.value?.contains(target)) return

  const uppercaseKey = event.key.toUpperCase()
  const memberIndex = initialToIndex.value.get(uppercaseKey)
  if (memberIndex !== undefined) {
    event.preventDefault()
    toggleCard(memberIndex)
    await focusCardAtIndex(memberIndex)
    return
  }

  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    await moveFocus('left')
  }

  if (event.key === 'ArrowRight') {
    event.preventDefault()
    await moveFocus('right')
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault()
    await moveFocus('up')
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    await moveFocus('down')
  }
}

watch(
  () => props.isActive,
  async (isActive) => {
    if (!isActive) return
    await focusCardAtIndex(focusedIndex.value)
  },
  { immediate: true }
)

watch(
  aboutMembers,
  async (members) => {
    if (!members.length) return

    focusedIndex.value = Math.min(focusedIndex.value, members.length - 1)

    if (props.isActive) {
      await focusCardAtIndex(focusedIndex.value)
    }
  },
  { immediate: true }
)
</script>

<template>
  <section
    ref="rootRef"
    class="about-members"
    data-testid="about-members-view"
    @keydown="handleKeydown"
  >
    <div class="about-members__carousel" data-testid="about-members-carousel">
      <div
        v-for="(member, index) in aboutMembers"
        :key="member.id"
        class="about-members__cell"
        :ref="(element) => setCellRef(element, index)"
      >
        <AboutFlipCard
          :ref="(instance) => setCardRef(instance as AboutFlipCardHandle | null, index)"
          :is-flipped="flippedMemberIds.includes(member.id)"
          :is-focused="focusedIndex === index"
          :member="member"
          :skeleton-offset="[0, 3, 6, 2][index] ?? 0"
          @focus-card="focusedIndex = index"
          @play-favorite="playFavoriteSong"
          @toggle="toggleCard(index)"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.about-members {
  --about-members-card-width: 15.75rem;
  --about-members-card-width-mobile: 16rem;
  --about-members-cell-max-width: calc(100vw - 2rem);
  --about-members-padding-block: clamp(0.2rem, 0.8vw, 0.5rem);
  --about-members-padding-inline: clamp(0.4rem, 1vw, 0.8rem);
  --about-members-carousel-gap: 0.85rem;
  --about-members-carousel-scroll-padding: 0.8rem;
  --about-members-carousel-inline-padding: 0.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-height: 0;
  margin: 0 auto;
  padding: var(--about-members-padding-block) var(--about-members-padding-inline);
  box-sizing: border-box;
}

.about-members__carousel {
  display: flex;
  align-items: center;
  /* centred when all cards fit; falls back to flex-start via the media query below */
  justify-content: center;
  gap: var(--about-members-carousel-gap);
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
  /* Small edge padding so the first / last card is fully visible when scrolled to the edge */
  padding-inline: var(--about-members-carousel-scroll-padding);
  scrollbar-width: none;
}

.about-members__carousel::-webkit-scrollbar {
  display: none;
}

/* When cards don't all fit, left-align so scrolling reveals each card fully */
@media (max-width: 1050px) {
  .about-members__carousel {
    justify-content: flex-start;
  }
}

.about-members__cell {
  flex: 0 0 min(var(--about-members-card-width), var(--about-members-cell-max-width));
  width: min(var(--about-members-card-width), var(--about-members-cell-max-width));
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  scroll-snap-align: center;
}
</style>
