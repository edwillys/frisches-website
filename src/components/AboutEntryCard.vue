<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import AnimatedLoadingGlyph from './AnimatedLoadingGlyph.vue'
import ArcadeMenuButton from './ArcadeMenuButton.vue'
import { useTriggeredTypewriterText } from '@/composables/useTriggeredTypewriterText'
import { getAboutStoryText } from '@/data/aboutStoryText'
import { currentAppLocale } from '@/i18n/locale'
import { useUiText } from '@/composables/useUiText'

// @ts-expect-error - vite-imagetools generates these at build time
import bandSmall from '@/assets/private/avatar/band.png?w=128&format=webp&quality=78'
// @ts-expect-error - vite-imagetools generates these at build time
import bandMedium from '@/assets/private/avatar/band.png?w=256&format=webp&quality=78'
// @ts-expect-error - vite-imagetools generates these at build time
import bandLarge from '@/assets/private/avatar/band.png?w=384&format=webp&quality=78'

const bandFrameModules = import.meta.glob<string>(
  '../assets/private/avatar/poses/band/band-frame*.png',
  { eager: true, query: { w: '512', format: 'webp', quality: '78' }, import: 'default' }
)
const bandFlipFrames = Object.keys(bandFrameModules)
  .sort()
  .flatMap((key) => {
    const url = bandFrameModules[key]
    return url ? [url] : []
  })

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
const entryImageRef = ref<HTMLImageElement | null>(null)
const t = useUiText()
const isFlipped = ref(false)
const hoverFrameSrc = ref<string | null>(null)
const isHoveringCard = ref(false)
const isEntryImageLoaded = ref(false)
const isHoverFrameLoaded = ref(false)

const TEXT_TYPING_CHAR_INTERVAL_TITLE = 30

let lastPointerPosition: { x: number; y: number } | null = null
let previousPointerPosition: { x: number; y: number } | null = null
let suppressHoverUntilPointerLeaves = false
let lastHoverFrameIndex = -1
let titleFitFrame: number | null = null
let titleResizeObserver: ResizeObserver | null = null
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept alive intentionally: holding references prevents the browser from evicting decoded bitmaps before they are needed
let preloadedBandFrames: HTMLImageElement[] = []

const entryMember = computed(() => ({
  avatar: bandMedium as string,
  avatarSrcset: `${bandSmall} 128w, ${bandMedium} 256w, ${bandLarge} 384w`,
  flipFrames: bandFlipFrames,
  hoverPoseFrame: undefined,
}))

const storyParagraphs = computed(() => getAboutStoryText(currentAppLocale.value).paragraphs)

const titleText = computed(() => t.value.about.subHeaderTitle)
const {
  displayedText: displayedTitleText,
  isTyping: isTypingTitle,
  startTyping: startFrontTitleTyping,
  setFullText: setFullFrontTitle,
} = useTriggeredTypewriterText({
  text: titleText,
  charIntervalMs: TEXT_TYPING_CHAR_INTERVAL_TITLE,
  shouldSkipAnimation: () => isFlipped.value || prefersReducedMotion(),
})
const showTitleCursor = computed(
  () => isHoveringCard.value && !isFlipped.value && !isTypingTitle.value
)

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

const prefersReducedMotion = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const syncEntryImageLoadState = () => {
  const entryImage = entryImageRef.value
  isEntryImageLoaded.value = Boolean(entryImage?.complete && entryImage.naturalWidth > 0)
}

const resolveEntryImageLoading = () => {
  isEntryImageLoaded.value = true
}

const resolveHoverFrameLoading = () => {
  if (!hoverFrameSrc.value) return
  isHoverFrameLoaded.value = true
}

const preloadBandFrames = () => {
  if (typeof Image === 'undefined') return

  preloadedBandFrames = bandFlipFrames.map((src) => {
    const image = new Image()
    image.decoding = 'async'
    image.src = src
    return image
  })
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
    isHoverFrameLoaded.value = false
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
  isHoverFrameLoaded.value = false
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
  hoverFrameSrc.value = null
  isHoverFrameLoaded.value = false
}

const openStory = () => {
  if (isFlipped.value) return
  isHoveringCard.value = false
  setFullFrontTitle()
  hoverFrameSrc.value = null
  isHoverFrameLoaded.value = false
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

watch([displayedTitleText, titleText], () => {
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

  preloadBandFrames()
  setFullFrontTitle()
  syncEntryImageLoadState()
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
  preloadedBandFrames = []
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
              class="about-entry-card__cursor-indicator"
              :class="{ 'about-entry-card__cursor-indicator--hidden': !showTitleCursor }"
              aria-hidden="true"
            ></span>
          </h3>
        </header>

        <div class="about-entry-card__image-frame">
          <AnimatedLoadingGlyph
            v-if="!isEntryImageLoaded"
            class="about-entry-card__image-skeleton"
            aria-hidden="true"
          />
          <img
            v-if="entryMember"
            ref="entryImageRef"
            class="about-entry-card__image"
            :class="{
              'about-entry-card__image--loaded': isEntryImageLoaded,
              'about-entry-card__image--covered': isHoverFrameLoaded,
            }"
            :src="entryMember.avatar"
            :srcset="entryMember.avatarSrcset"
            alt=""
            loading="lazy"
            sizes="(max-width: 767px) 280px, 320px"
            @error="resolveEntryImageLoading"
            @load="resolveEntryImageLoading"
          />
          <img
            v-if="hoverFrameSrc"
            class="about-entry-card__image about-entry-card__image--frame"
            :src="hoverFrameSrc"
            :class="{ 'about-entry-card__image--loaded': isHoverFrameLoaded }"
            alt=""
            aria-hidden="true"
            @error="resolveHoverFrameLoading"
            @load="resolveHoverFrameLoading"
          />
        </div>

        <div class="about-entry-card__actions" role="group" :aria-label="t.about.menuAriaLabel">
          <ArcadeMenuButton
            :button-aria-label="t.about.storyButtonAria"
            :label="t.about.storyButton"
            tone-contour="var(--color-neon-cyan)"
            inner-contour-only
            @click.stop
            @press="openStory"
          />
          <ArcadeMenuButton
            :button-aria-label="t.about.membersButtonAria"
            :label="t.about.membersButton"
            tone-contour="var(--color-neon-magenta)"
            inner-contour-only
            @click.stop
            @press="emit('open-members')"
          />
          <ArcadeMenuButton
            :button-aria-label="t.about.lyricsButtonAria"
            :label="t.about.lyricsButton"
            tone-contour="var(--lyrics-album-contour)"
            inner-contour-only
            @click.stop
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
            v-for="para in storyParagraphs"
            :key="para.id"
            class="about-entry-card__story-block"
          >
            <p
              v-if="para.dictParts"
              class="about-entry-card__story-copy about-entry-card__story-copy--dict"
            >
              <strong>{{ para.dictParts.boldWord }}</strong
              >{{ para.dictParts.pronunciation }}<br /><em>{{ para.dictParts.definition }}</em>
            </p>
            <p v-else class="about-entry-card__story-copy">
              <span>{{ para.text }}</span>
              <a
                v-if="para.linkText && para.linkHref"
                class="about-entry-card__story-link"
                :href="para.linkHref"
                :data-tooltip-yt="para.linkYtId"
                :data-tooltip-card-title="para.linkPreviewTitle"
                :data-tooltip-card-meta-primary="para.linkPreviewMetaPrimary"
                :data-tooltip-card-meta-secondary="para.linkPreviewMetaSecondary"
                target="_blank"
                rel="noopener noreferrer"
                >{{ para.linkText }}</a
              >
              <span v-if="para.textAfterLink">{{ para.textAfterLink }}</span>
            </p>
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

.about-entry-card__cursor-indicator--hidden {
  opacity: 0;
  animation: none;
}

.about-entry-card__image-frame {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 0.8rem;
  overflow: hidden;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(10, 10, 18, 0.35));
}

.about-entry-card__image-skeleton {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.about-entry-card__image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 28%;
  opacity: 0;
  transition: opacity 220ms ease;
}

.about-entry-card__image--loaded {
  opacity: 1;
}

.about-entry-card__image--covered {
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
  text-align: left;
  line-height: 1.36;
  font-family: 'Space Mono', 'Courier New', monospace;
  font-size: 0.72rem;
  color: var(--color-text-secondary);
}

.about-entry-card__story-copy--dict strong {
  color: var(--color-text);
  font-weight: 700;
}

.about-entry-card__story-copy--dict em {
  font-style: italic;
  opacity: 0.75;
}

.about-entry-card__story-link {
  display: inline;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-neon-cyan);
  font: inherit;
  cursor: pointer;
  text-decoration: underline;
  text-decoration-color: rgba(104, 198, 224, 0.55);
  text-underline-offset: 0.15em;
  transition:
    color var(--transition-base),
    text-decoration-color var(--transition-base);
}

.about-entry-card__story-link:hover,
.about-entry-card__story-link:focus-visible {
  color: #9fe7fb;
  text-decoration-color: currentColor;
  outline: none;
}

@media (max-width: 767px) {
  .about-entry-card {
    width: min(var(--about-card-width-mobile), calc(100vw - 2rem));
  }
}
</style>
