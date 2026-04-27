<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import ArcadeMenuButton from './ArcadeMenuButton.vue'
import { useAboutMembers } from '@/composables/useAboutMembers'
import { getTriviaCards } from '@/data/triviaCards'
import { currentAppLocale } from '@/i18n/locale'
import { useUiText } from '@/composables/useUiText'

interface Props {
  backSignal?: number
  storyOpenSignal?: number
  isActive?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  backSignal: 0,
  storyOpenSignal: 0,
  isActive: false,
})

const emit = defineEmits<{
  (e: 'open-members'): void
  (e: 'open-lyrics'): void
  (e: 'story-open-change', isOpen: boolean): void
}>()

const rootRef = ref<HTMLElement | null>(null)
const titleRef = ref<HTMLElement | null>(null)
const aboutMembers = useAboutMembers()
const t = useUiText()
const isFlipped = ref(false)
const hoverFrameSrc = ref<string | null>(null)
const displayedTitleText = ref('')
const isTypingTitle = ref(false)
const isHoveringCard = ref(false)

const TEXT_TYPING_CHAR_INTERVAL_TITLE = 30

let titleTypingTimeoutIds: ReturnType<typeof setTimeout>[] = []
let lastPointerPosition: { x: number; y: number } | null = null
let previousPointerPosition: { x: number; y: number } | null = null
let suppressHoverUntilPointerLeaves = false
let lastHoverFrameIndex = -1
let titleFitFrame: number | null = null
let titleResizeObserver: ResizeObserver | null = null

const entryMember = computed(() => {
  const members = aboutMembers.value
  return members.find((member) => member.id === 'edgar') ?? members[0]
})

const storySections = computed(() => {
  const sections = getTriviaCards(currentAppLocale.value)
  const preferredOrder = ['story', 'influences', 'gear']

  return preferredOrder
    .map((id) => sections.find((section) => section.id === id))
    .filter((section): section is NonNullable<(typeof sections)[number]> => Boolean(section))
})

const storyBlocks = computed(() =>
  storySections.value.map((section) => ({
    id: section.id,
    content: section.backContent,
  }))
)

const titleText = computed(() => t.value.about.subHeaderTitle)
const showTitleCursor = computed(
  () => isHoveringCard.value && !isFlipped.value && !isTypingTitle.value
)

const clearTitleTypingTimers = () => {
  for (const timeoutId of titleTypingTimeoutIds) {
    clearTimeout(timeoutId)
  }

  titleTypingTimeoutIds = []
}

const fitTitleToCard = () => {
  titleFitFrame = null

  const titleElement = titleRef.value
  if (!titleElement) return

  titleElement.style.removeProperty('font-size')

  let safetyCounter = 0
  while (titleElement.scrollWidth > titleElement.clientWidth && safetyCounter < 4) {
    const computedStyle = window.getComputedStyle(titleElement)
    const currentFontSize = Number.parseFloat(computedStyle.fontSize)
    if (!Number.isFinite(currentFontSize) || currentFontSize <= 0) break

    const nextFontSize = currentFontSize * (titleElement.clientWidth / titleElement.scrollWidth)
    titleElement.style.fontSize = `${nextFontSize}px`
    safetyCounter += 1
  }
}

const scheduleTitleFit = () => {
  if (typeof window === 'undefined') return

  if (titleFitFrame !== null) {
    window.cancelAnimationFrame(titleFitFrame)
  }

  titleFitFrame = window.requestAnimationFrame(fitTitleToCard)
}

const setFullFrontTitle = () => {
  displayedTitleText.value = titleText.value
  isTypingTitle.value = false
}

const prefersReducedMotion = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const startFrontTitleTyping = () => {
  clearTitleTypingTimers()

  if (isFlipped.value || prefersReducedMotion()) {
    setFullFrontTitle()
    return
  }

  displayedTitleText.value = ''
  isTypingTitle.value = true

  for (let index = 1; index <= titleText.value.length; index += 1) {
    const nextValue = titleText.value.slice(0, index)
    titleTypingTimeoutIds.push(
      setTimeout(() => {
        displayedTitleText.value = nextValue
      }, index * TEXT_TYPING_CHAR_INTERVAL_TITLE)
    )
  }

  titleTypingTimeoutIds.push(
    setTimeout(() => {
      isTypingTitle.value = false
    }, titleText.value.length * TEXT_TYPING_CHAR_INTERVAL_TITLE)
  )
}

const handleWindowPointerMove = (event: PointerEvent) => {
  previousPointerPosition = lastPointerPosition
  lastPointerPosition = { x: event.clientX, y: event.clientY }
}

const isPointInsideCard = (point: { x: number; y: number } | null) => {
  const rootElement = rootRef.value
  if (!rootElement || !point) return false

  const rect = rootElement.getBoundingClientRect()

  return (
    point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom
  )
}

const enteredFromOutside = (event: MouseEvent) => {
  const rootElement = rootRef.value
  if (!rootElement) return true

  const relatedTarget = event.relatedTarget
  if (relatedTarget instanceof Node && rootElement.contains(relatedTarget)) {
    return false
  }

  const currentPoint = { x: event.clientX, y: event.clientY }

  if (!isPointInsideCard(currentPoint)) {
    return false
  }

  if (!previousPointerPosition) return false

  return !isPointInsideCard(previousPointerPosition)
}

const syncHoverSuppressionState = () => {
  suppressHoverUntilPointerLeaves = isPointInsideCard(lastPointerPosition)
}

const pickHoverFrame = () => {
  const frames = entryMember.value?.flipFrames
  if (!frames?.length) return

  const fixedIndex = entryMember.value?.hoverPoseFrame
  if (fixedIndex !== undefined) {
    hoverFrameSrc.value = frames[Math.min(fixedIndex, frames.length - 1)] ?? null
    return
  }

  let index: number
  if (frames.length === 1) {
    index = 0
  } else {
    do {
      index = Math.floor(Math.random() * frames.length)
    } while (index === lastHoverFrameIndex)
  }

  lastHoverFrameIndex = index
  hoverFrameSrc.value = frames[index] ?? null
}

const handleMouseEnter = (event: MouseEvent) => {
  if (suppressHoverUntilPointerLeaves) return
  if (!enteredFromOutside(event)) return
  if (isFlipped.value) return

  isHoveringCard.value = true
  startFrontTitleTyping()
  pickHoverFrame()
}

const handleMouseLeave = () => {
  isHoveringCard.value = false
  suppressHoverUntilPointerLeaves = false
  clearTitleTypingTimers()
  setFullFrontTitle()
  hoverFrameSrc.value = null
}

const openStory = () => {
  if (isFlipped.value) return
  isHoveringCard.value = false
  clearTitleTypingTimers()
  setFullFrontTitle()
  hoverFrameSrc.value = null
  isFlipped.value = true
  emit('story-open-change', true)
}

const closeStory = () => {
  isFlipped.value = false
  emit('story-open-change', false)
}

watch(
  () => props.backSignal,
  () => {
    if (isFlipped.value) {
      closeStory()
    }
  }
)

watch(
  () => props.storyOpenSignal,
  () => {
    if (!isFlipped.value) {
      openStory()
    }
  }
)

watch([displayedTitleText, showTitleCursor, titleText], () => {
  void nextTick(() => {
    scheduleTitleFit()
  })
})

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('pointermove', handleWindowPointerMove, { passive: true })

    if (typeof ResizeObserver !== 'undefined') {
      titleResizeObserver = new ResizeObserver(() => {
        scheduleTitleFit()
      })

      if (rootRef.value) {
        titleResizeObserver.observe(rootRef.value)
      }
    }
  }

  setFullFrontTitle()
  syncHoverSuppressionState()
  void nextTick(() => {
    scheduleTitleFit()
  })
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('pointermove', handleWindowPointerMove)

    if (titleFitFrame !== null) {
      window.cancelAnimationFrame(titleFitFrame)
      titleFitFrame = null
    }
  }

  titleResizeObserver?.disconnect()
  titleResizeObserver = null

  clearTitleTypingTimers()
})
</script>

<template>
  <article
    ref="rootRef"
    class="about-entry-card"
    :class="{
      'about-entry-card--flipped': isFlipped,
      'about-entry-card--hovered': isHoveringCard,
      'about-entry-card--title-typing': isTypingTitle,
    }"
    data-about-card
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <div class="about-entry-card__inner">
      <section
        class="about-entry-card__face about-entry-card__face--front"
        :aria-hidden="isFlipped"
      >
        <header class="about-entry-card__header">
          <h3 ref="titleRef" class="about-entry-card__title">
            <span>{{ displayedTitleText }}</span>
            <span
              v-if="showTitleCursor"
              class="about-entry-card__cursor-indicator"
              aria-hidden="true"
            ></span>
          </h3>
        </header>

        <div class="about-entry-card__image-frame">
          <img
            v-if="entryMember"
            class="about-entry-card__image"
            :class="{ 'about-entry-card__image--hidden': hoverFrameSrc }"
            :src="entryMember.avatar"
            :srcset="entryMember.avatarSrcset"
            :alt="t.about.entryImageAlt"
            loading="lazy"
            sizes="(max-width: 767px) 280px, 320px"
          />
          <img
            v-if="hoverFrameSrc"
            class="about-entry-card__image about-entry-card__image--frame"
            :src="hoverFrameSrc"
            alt=""
            aria-hidden="true"
          />
        </div>

        <div class="about-entry-card__actions" role="group" :aria-label="t.about.menuAriaLabel">
          <ArcadeMenuButton
            :button-aria-label="t.about.storyButtonAria"
            :label="t.about.storyButton"
            tone-contour="var(--color-neon-cyan)"
            inner-contour-only
            @press="openStory"
          />
          <ArcadeMenuButton
            :button-aria-label="t.about.membersButtonAria"
            :label="t.about.membersButton"
            tone-contour="var(--color-neon-magenta)"
            inner-contour-only
            @press="emit('open-members')"
          />
          <ArcadeMenuButton
            :button-aria-label="t.about.lyricsButtonAria"
            :label="t.about.lyricsButton"
            tone-contour="var(--lyrics-album-contour)"
            inner-contour-only
            @press="emit('open-lyrics')"
          />
        </div>
      </section>

      <section
        class="about-entry-card__face about-entry-card__face--back"
        :aria-hidden="!isFlipped"
      >
        <header class="about-entry-card__back-header">
          <h3 class="about-entry-card__title">{{ t.about.storyButton }}</h3>
        </header>

        <div class="about-entry-card__story" role="article">
          <section
            v-for="block in storyBlocks"
            :key="block.id"
            class="about-entry-card__story-block"
          >
            <p class="about-entry-card__story-copy">{{ block.content }}</p>
          </section>
        </div>
      </section>
    </div>
  </article>
</template>

<style scoped>
.about-entry-card {
  --about-card-title-font-size: clamp(1rem, 7.1cqi, 1.2rem);
  --about-entry-contour: var(--color-neon-cyan);
  container-type: inline-size;
  --about-card-cursor-width-ratio: 0.5;
  --about-card-cursor-height-ratio: 0.88;
  --about-card-cursor-gap-ratio: 0.1;
  --about-card-cursor-baseline-shift-ratio: 0;
  --about-card-cursor-blink-duration: var(--typing-cursor-blink-duration, 1.05s);
  width: min(var(--about-card-width-desktop), calc(100vw - 2rem));
  aspect-ratio: var(--about-card-aspect-ratio);
  border: 0;
  background: transparent;
  padding: 0;
  perspective: 1200px;
}

.about-entry-card__inner {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  transition: transform 0.56s cubic-bezier(0.2, 0.7, 0.3, 1);
  transform-style: preserve-3d;
}

.about-entry-card--flipped .about-entry-card__inner {
  transform: rotateY(180deg);
}

.about-entry-card__face {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  border: 1px solid color-mix(in srgb, var(--about-entry-contour) 58%, transparent 42%);
  border-radius: 1rem;
  padding: 0.9rem;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  transform-style: preserve-3d;
  color: var(--color-text);
  background:
    linear-gradient(180deg, rgba(19, 5, 65, 0.96) 0%, rgba(45, 45, 68, 0.95) 100%),
    linear-gradient(180deg, rgba(139, 79, 125, 0.26) 0%, rgba(10, 10, 18, 0.15) 100%);
  box-shadow:
    0 18px 40px rgba(0, 0, 0, 0.5),
    0 0 12px color-mix(in srgb, var(--about-entry-contour) 28%, transparent 72%),
    inset 0 0 0 1px rgba(255, 255, 255, 0.04);
}

.about-entry-card__face--front {
  transform: rotateY(0deg) translateZ(1px);
}

.about-entry-card__face--back {
  transform: rotateY(180deg) translateZ(1px);
  background: linear-gradient(180deg, rgba(18, 7, 53, 1) 0%, rgba(33, 31, 55, 1) 100%);
}

.about-entry-card:not(.about-entry-card--flipped) .about-entry-card__face--back {
  visibility: hidden;
}

.about-entry-card--flipped .about-entry-card__face--front {
  visibility: hidden;
}

.about-entry-card--flipped .about-entry-card__face--back {
  visibility: visible;
}

.about-entry-card__header {
  min-height: 2.4rem;
  display: flex;
  justify-content: center;
  align-items: center;
}

.about-entry-card__title {
  margin: 0;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  text-align: center;
  color: var(--color-text);
  font-family: 'Space Mono', 'Courier New', monospace;
  font-size: var(--about-card-title-font-size);
  line-height: 1.1;
  letter-spacing: clamp(0.03em, 0.24cqi, 0.08em);
  white-space: nowrap;
  overflow: hidden;
}

.about-entry-card__cursor-indicator {
  display: inline-block;
  flex: 0 0 auto;
  width: calc(var(--about-card-cursor-width-ratio) * 1em);
  height: calc(var(--about-card-cursor-height-ratio) * 1em);
  margin-inline-start: calc(var(--about-card-cursor-gap-ratio) * 1em);
  border-radius: 0.08em;
  background: currentColor;
  vertical-align: baseline;
  transform: translateY(calc(var(--about-card-cursor-baseline-shift-ratio) * 1em));
  color: var(--color-text);
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.08);
  animation: typing-cursor-blink var(--about-card-cursor-blink-duration) step-end infinite;
}

.about-entry-card__image-frame {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 0.8rem;
  overflow: hidden;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(10, 10, 18, 0.35));
}

.about-entry-card__image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 28%;
}

.about-entry-card__image--hidden {
  opacity: 0;
}

.about-entry-card__image--frame {
  z-index: 1;
}

.about-entry-card__actions {
  margin-top: auto;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.52rem;
  justify-items: center;
}

.about-entry-card__back-header {
  position: relative;
  min-height: 2rem;
  display: flex;
  justify-content: center;
  align-items: center;
}

.about-entry-card__story {
  margin-top: 0.2rem;
  display: grid;
  gap: 0.68rem;
  min-height: 0;
  overflow: auto;
}

.about-entry-card__story-block {
  display: grid;
  gap: 0;
}

.about-entry-card__story-copy {
  margin: 0;
  white-space: pre-line;
  line-height: 1.36;
  font-family: 'Space Mono', 'Courier New', monospace;
  font-size: 0.68rem;
  color: var(--color-text-secondary);
}

@media (max-width: 767px) {
  .about-entry-card {
    width: min(var(--about-card-width-mobile), calc(100vw - 2rem));
  }
}
</style>
