<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import gsap from 'gsap'

import AnimatedLoadingGlyph from './AnimatedLoadingGlyph.vue'
import type { AboutMember } from '@/types/aboutMember'

interface Props {
  member: AboutMember
  isFlipped: boolean
  isFocused?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isFocused: false,
})

const emit = defineEmits<{
  (e: 'toggle'): void
  (e: 'focus-card'): void
  (e: 'play-favorite', trackId: string): void
}>()

const rootRef = ref<HTMLElement | null>(null)
const innerRef = ref<HTMLElement | null>(null)
const frontAvatarImageRef = ref<HTMLImageElement | null>(null)
const backAvatarAnchorRef = ref<HTMLElement | null>(null)
const backAvatarSlotRef = ref<HTMLElement | null>(null)
const backAvatarImageRef = ref<HTMLImageElement | null>(null)
const floatingAvatarRef = ref<HTMLElement | null>(null)
const floatingAvatarImageRef = ref<HTMLImageElement | null>(null)

let ctx: gsap.Context | null = null

const FLIP_DURATION = 0.72
const FRONT_AVATAR_FALLBACK = { x: 28, y: 112, width: 180, height: 180 }
const BACK_AVATAR_FALLBACK = { x: 192, y: 14, width: 40, height: 40 }
const CARD_FACE_RADIUS = '1rem'
const CARD_CIRCLE_RADIUS = '999px'
const TEXT_TYPING_START_RATIO = 0.42
const TEXT_TYPING_CHAR_INTERVAL = 13
const TEXT_TYPING_CHAR_INTERVAL_TITLE = 30
const TEXT_TYPING_SEGMENT_PAUSE = 80

const displayedTitleText = ref(props.member.name)
const displayedDescriptionLead = ref(props.isFlipped ? props.member.descriptionLead : '')
const displayedFavoriteTrackTitle = ref(
  props.isFlipped ? (props.member.favoriteTrackTitle ?? '') : ''
)
const displayedDescriptionTail = ref(props.isFlipped ? (props.member.descriptionTail ?? '') : '')
const isHoveringCard = ref(false)
const isTypingFrontTitle = ref(false)
const isTypingBackText = ref(false)
const isAvatarLoaded = ref(false)

let titleTypingTimeoutIds: ReturnType<typeof setTimeout>[] = []
let typingTimeoutIds: ReturnType<typeof setTimeout>[] = []
let lastPointerPosition: { x: number; y: number } | null = null
let previousPointerPosition: { x: number; y: number } | null = null
let suppressHoverUntilPointerLeaves = false

const getFlipDuration = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return FLIP_DURATION
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : FLIP_DURATION
}

const getRelativeRect = (element: HTMLElement | null, fallback: DOMRectInit) => {
  const rootElement = rootRef.value
  if (!rootElement || !element) {
    return {
      x: fallback.x ?? 0,
      y: fallback.y ?? 0,
      width: fallback.width ?? 0,
      height: fallback.height ?? 0,
    }
  }

  const rootRect = rootElement.getBoundingClientRect()
  const rect = element.getBoundingClientRect()

  return {
    x: rect.width ? rect.left - rootRect.left : (fallback.x ?? 0),
    y: rect.height ? rect.top - rootRect.top : (fallback.y ?? 0),
    width: rect.width || (fallback.width ?? 0),
    height: rect.height || (fallback.height ?? 0),
  }
}

const syncFloatingAvatarImageStyle = (sourceAvatar: HTMLImageElement | null) => {
  const floatingAvatarImage = floatingAvatarImageRef.value
  if (!sourceAvatar || !floatingAvatarImage || typeof window === 'undefined') return

  const computedStyle = window.getComputedStyle(sourceAvatar)
  gsap.set(floatingAvatarImage, {
    objectFit: computedStyle.objectFit,
    objectPosition: computedStyle.objectPosition,
  })
}

const prefersReducedMotion = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const clearTypingTimers = () => {
  for (const timeoutId of typingTimeoutIds) {
    clearTimeout(timeoutId)
  }

  typingTimeoutIds = []
}

const clearTitleTypingTimers = () => {
  for (const timeoutId of titleTypingTimeoutIds) {
    clearTimeout(timeoutId)
  }

  titleTypingTimeoutIds = []
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

  // No movement history means we cannot confirm the cursor came from outside.
  // Treat as "did not enter from outside" to prevent false hover on mount.
  if (!previousPointerPosition) return false

  return !isPointInsideCard(previousPointerPosition)
}

const syncHoverSuppressionState = () => {
  suppressHoverUntilPointerLeaves = isPointInsideCard(lastPointerPosition)
}

const syncAvatarLoadState = () => {
  const avatar = frontAvatarImageRef.value
  isAvatarLoaded.value = Boolean(avatar?.complete && avatar.naturalWidth > 0)
}

const resolveAvatarLoading = () => {
  isAvatarLoaded.value = true
}

const setFullFrontTitle = () => {
  displayedTitleText.value = props.member.name
  isTypingFrontTitle.value = false
}

const startFrontTitleTyping = () => {
  clearTitleTypingTimers()

  if (props.isFlipped) {
    setFullFrontTitle()
    return
  }

  if (prefersReducedMotion()) {
    setFullFrontTitle()
    return
  }

  displayedTitleText.value = ''
  isTypingFrontTitle.value = true

  for (let index = 1; index <= props.member.name.length; index += 1) {
    const nextValue = props.member.name.slice(0, index)
    titleTypingTimeoutIds.push(
      setTimeout(() => {
        displayedTitleText.value = nextValue
      }, index * TEXT_TYPING_CHAR_INTERVAL_TITLE)
    )
  }

  titleTypingTimeoutIds.push(
    setTimeout(() => {
      isTypingFrontTitle.value = false
    }, props.member.name.length * TEXT_TYPING_CHAR_INTERVAL_TITLE)
  )
}

const handleMouseenter = (event: MouseEvent) => {
  if (suppressHoverUntilPointerLeaves) return
  if (!enteredFromOutside(event)) return

  isHoveringCard.value = true

  if (!props.isFlipped) {
    startFrontTitleTyping()
  }
}

const handleMouseleave = () => {
  isHoveringCard.value = false
  suppressHoverUntilPointerLeaves = false
  clearTitleTypingTimers()
  setFullFrontTitle()
}

const setFullBackText = () => {
  displayedDescriptionLead.value = props.member.descriptionLead
  displayedFavoriteTrackTitle.value = props.member.favoriteTrackTitle ?? ''
  displayedDescriptionTail.value = props.member.descriptionTail ?? ''
  isTypingBackText.value = false
}

const resetBackText = () => {
  displayedDescriptionLead.value = ''
  displayedFavoriteTrackTitle.value = ''
  displayedDescriptionTail.value = ''
  isTypingBackText.value = false
}

const queueTypedText = (text: string, applyValue: (value: string) => void, delay: number) => {
  if (!text) return delay

  for (let index = 1; index <= text.length; index += 1) {
    const nextValue = text.slice(0, index)
    typingTimeoutIds.push(
      setTimeout(
        () => {
          applyValue(nextValue)
        },
        delay + index * TEXT_TYPING_CHAR_INTERVAL
      )
    )
  }

  return delay + text.length * TEXT_TYPING_CHAR_INTERVAL
}

const startBackTextTyping = () => {
  clearTypingTimers()

  if (!props.isFlipped) {
    resetBackText()
    return
  }

  if (prefersReducedMotion()) {
    setFullBackText()
    return
  }

  resetBackText()
  isTypingBackText.value = true

  let delay = Math.max(Math.round(getFlipDuration() * 1000 * TEXT_TYPING_START_RATIO), 120)

  delay = queueTypedText(
    props.member.descriptionLead,
    (value) => {
      displayedDescriptionLead.value = value
    },
    delay
  )

  delay = queueTypedText(
    props.member.favoriteTrackTitle ?? '',
    (value) => {
      displayedFavoriteTrackTitle.value = value
    },
    delay + TEXT_TYPING_SEGMENT_PAUSE
  )

  delay = queueTypedText(
    props.member.descriptionTail ?? '',
    (value) => {
      displayedDescriptionTail.value = value
    },
    delay + TEXT_TYPING_SEGMENT_PAUSE
  )

  typingTimeoutIds.push(
    setTimeout(() => {
      isTypingBackText.value = false
    }, delay + TEXT_TYPING_SEGMENT_PAUSE)
  )
}

const animateAvatarTransition = (flipped: boolean, duration: number) => {
  const floatingAvatar = floatingAvatarRef.value
  const frontAvatar = frontAvatarImageRef.value
  const backAvatarAnchor = backAvatarAnchorRef.value
  const backAvatar = backAvatarImageRef.value
  const backAvatarSlot = backAvatarSlotRef.value

  if (!floatingAvatar || !frontAvatar || !backAvatar || !backAvatarSlot || !backAvatarAnchor) return

  const sourceAvatar = flipped ? frontAvatar : backAvatar

  const startRect = flipped
    ? getRelativeRect(frontAvatar, FRONT_AVATAR_FALLBACK)
    : getRelativeRect(backAvatarAnchor, BACK_AVATAR_FALLBACK)
  const endRect = flipped
    ? getRelativeRect(backAvatarAnchor, BACK_AVATAR_FALLBACK)
    : getRelativeRect(frontAvatar, FRONT_AVATAR_FALLBACK)

  gsap.killTweensOf([floatingAvatar, frontAvatar, backAvatar])
  syncFloatingAvatarImageStyle(sourceAvatar)

  gsap.set(floatingAvatar, {
    autoAlpha: 1,
    x: startRect.x,
    y: startRect.y,
    width: startRect.width,
    height: startRect.height,
    borderRadius: flipped ? CARD_FACE_RADIUS : CARD_CIRCLE_RADIUS,
  })
  gsap.set(flipped ? backAvatar : frontAvatar, { autoAlpha: 0 })

  gsap.to(flipped ? frontAvatar : backAvatar, {
    autoAlpha: 0,
    duration: Math.min(duration * 0.2, 0.18),
    overwrite: 'auto',
  })

  gsap.to(floatingAvatar, {
    autoAlpha: 1,
    x: endRect.x,
    y: endRect.y,
    width: endRect.width,
    height: endRect.height,
    borderRadius: flipped ? CARD_CIRCLE_RADIUS : CARD_FACE_RADIUS,
    duration,
    ease: 'power3.inOut',
    overwrite: 'auto',
    onComplete: () => {
      gsap.set(floatingAvatar, { autoAlpha: 0 })
      gsap.set(flipped ? backAvatar : frontAvatar, { autoAlpha: 1 })
    },
  })

  gsap.to(flipped ? backAvatar : frontAvatar, {
    autoAlpha: 1,
    duration: Math.min(duration * 0.22, 0.2),
    delay: duration * 0.58,
    overwrite: 'auto',
  })
}

const animateFlip = (flipped: boolean) => {
  if (!innerRef.value) return

  const duration = getFlipDuration()

  animateAvatarTransition(flipped, duration)

  gsap.to(innerRef.value, {
    rotateY: flipped ? 180 : 0,
    duration,
    ease: 'power3.inOut',
    overwrite: 'auto',
  })
}

const handleCardKeydown = (event: KeyboardEvent) => {
  const target = event.target
  if (target instanceof HTMLElement && target.closest('.about-flip-card__song-chip')) {
    return
  }

  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    emit('toggle')
  }
}

const handleFavoriteSongClick = () => {
  if (!props.member.favoriteTrackId) return
  emit('play-favorite', props.member.favoriteTrackId)
}

const handleCardClick = () => {
  emit('toggle')
}

const focusCard = () => {
  rootRef.value?.focus()
}

defineExpose({
  focusCard,
})

watch(
  () => props.isFlipped,
  (flipped, previousFlipped) => {
    animateFlip(flipped)

    if (flipped === previousFlipped) return

    if (flipped) {
      startBackTextTyping()
      return
    }

    clearTypingTimers()
    resetBackText()
  }
)

watch(
  () => props.member.id,
  async () => {
    clearTitleTypingTimers()
    setFullFrontTitle()
    clearTypingTimers()
    isHoveringCard.value = false
    isAvatarLoaded.value = false

    if (props.isFlipped) {
      setFullBackText()
    } else {
      resetBackText()
    }

    await nextTick()
    syncAvatarLoadState()
    syncHoverSuppressionState()
  }
)

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('pointermove', handleWindowPointerMove, { passive: true })
  }

  ctx = gsap.context(() => {
    if (!innerRef.value) return

    gsap.set(innerRef.value, {
      rotateY: props.isFlipped ? 180 : 0,
      transformStyle: 'preserve-3d',
    })

    gsap.set(floatingAvatarRef.value, { autoAlpha: 0 })
  }, rootRef)

  if (props.isFlipped) {
    setFullBackText()
  }

  setFullFrontTitle()
  syncAvatarLoadState()
  syncHoverSuppressionState()
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('pointermove', handleWindowPointerMove)
  }

  clearTitleTypingTimers()
  clearTypingTimers()
  ctx?.revert()
})
</script>

<template>
  <article
    ref="rootRef"
    class="about-flip-card"
    :class="{
      'about-flip-card--flipped': isFlipped,
      'about-flip-card--focused': isFocused,
      'about-flip-card--hovered': isHoveringCard,
      'about-flip-card--title-typing': isTypingFrontTitle,
      'about-flip-card--show-title-cursor': isHoveringCard && !isFlipped && !isTypingFrontTitle,
      'about-flip-card--typing': isTypingBackText,
    }"
    :aria-label="`${member.name} profile card`"
    :aria-pressed="isFlipped"
    :aria-keyshortcuts="`${member.initial} Space Enter`"
    :tabindex="isFocused ? 0 : -1"
    data-member-card="true"
    role="button"
    @click="handleCardClick"
    @focus="emit('focus-card')"
    @mouseenter="handleMouseenter"
    @mouseleave="handleMouseleave"
    @keydown="handleCardKeydown"
  >
    <div ref="innerRef" class="about-flip-card__inner">
      <section class="about-flip-card__face about-flip-card__face--front" :aria-hidden="isFlipped">
        <div class="about-flip-card__front-header">
          <h3 class="about-flip-card__title about-flip-card__title--front">
            <span>{{ displayedTitleText }}</span>
            <span
              class="about-flip-card__cursor-indicator about-flip-card__cursor-indicator--title"
              aria-hidden="true"
            ></span>
          </h3>
        </div>
        <div class="about-flip-card__avatar-frame">
          <AnimatedLoadingGlyph
            v-if="!isAvatarLoaded"
            class="about-flip-card__avatar-skeleton"
            data-testid="member-avatar-skeleton"
          />
          <img
            ref="frontAvatarImageRef"
            :alt="member.avatarAlt"
            :src="member.avatar"
            :srcset="member.avatarSrcset"
            class="about-flip-card__avatar"
            :class="{ 'about-flip-card__avatar--loaded': isAvatarLoaded }"
            data-testid="member-avatar-front"
            loading="lazy"
            @error="resolveAvatarLoading"
            @load="resolveAvatarLoading"
            sizes="(max-width: 767px) 280px, 320px"
          />
        </div>
      </section>

      <section class="about-flip-card__face about-flip-card__face--back" :aria-hidden="!isFlipped">
        <div class="about-flip-card__back-header">
          <div class="about-flip-card__back-badges" data-testid="member-badges-back">
            <span
              v-for="badge in member.badges"
              :key="badge.title"
              :aria-label="badge.title"
              class="about-flip-card__badge"
              :title="badge.title"
            >
              <img :alt="badge.title" :src="badge.image" data-testid="member-badge" />
            </span>
          </div>

          <div
            ref="backAvatarSlotRef"
            class="about-flip-card__back-avatar-slot"
            data-testid="member-avatar-slot-back"
          >
            <img
              ref="backAvatarImageRef"
              :alt="member.avatarAlt"
              :src="member.avatar"
              :srcset="member.avatarSrcset"
              class="about-flip-card__back-avatar"
              data-testid="member-avatar-back"
              loading="lazy"
              sizes="64px"
            />
          </div>
        </div>

        <div class="about-flip-card__back-body">
          <p
            class="about-flip-card__copy"
            :class="{ 'about-flip-card__copy--typing': isTypingBackText }"
          >
            <span>{{ displayedDescriptionLead }}</span>
            <button
              v-if="member.favoriteTrackId && displayedFavoriteTrackTitle"
              class="about-flip-card__song-chip"
              data-testid="favorite-song-chip"
              type="button"
              @click.stop="handleFavoriteSongClick"
            >
              {{ displayedFavoriteTrackTitle }}
            </button>
            <span v-if="displayedDescriptionTail"> {{ displayedDescriptionTail }}</span>
            <span
              class="about-flip-card__cursor-indicator about-flip-card__cursor-indicator--copy"
              aria-hidden="true"
            ></span>
          </p>
        </div>
      </section>
    </div>

    <div
      ref="backAvatarAnchorRef"
      class="about-flip-card__back-avatar-anchor"
      aria-hidden="true"
    ></div>

    <div ref="floatingAvatarRef" class="about-flip-card__floating-avatar" aria-hidden="true">
      <img
        ref="floatingAvatarImageRef"
        :alt="member.avatarAlt"
        :src="member.avatar"
        :srcset="member.avatarSrcset"
      />
    </div>
  </article>
</template>

<style scoped>
.about-flip-card {
  --about-card-width: var(--about-members-card-width, 15.75rem);
  --about-card-width-mobile: var(--about-members-card-width-mobile, 16rem);
  --about-card-height-mobile: clamp(17.4rem, 45vh, 20.6rem);
  --about-card-aspect-ratio: 5 / 7.2;
  --about-card-face-radius: 1rem;
  --about-card-frame-radius: 0.9rem;
  --about-card-face-gap: 0rem;
  --about-card-back-face-gap: 0rem;
  --about-card-face-padding: 0.8rem;
  --about-card-face-padding-mobile: 0.8rem;
  --about-card-header-height: 3.1rem;
  --about-card-avatar-frame-padding: 0.55rem 0.35rem 0.35rem;
  --about-card-avatar-max-height: 14.35rem;
  --about-card-back-icon-size: 2.2rem;
  --about-card-back-icon-offset: 0.9rem;
  --about-card-back-badge-gap: 0.2rem;
  --about-card-back-badge-width: calc(
    (var(--about-card-back-icon-size) * 2) + var(--about-card-back-badge-gap)
  );
  --about-card-back-badge-inner-size: 1.08rem;
  --about-card-back-body-gap: 0.55rem;
  --about-card-title-font-size: clamp(1.1rem, 1.5vw, 1.45rem);
  --about-card-title-line-height: 1.1;
  --about-card-copy-font-size: 0.87rem;
  --about-card-copy-font-size-mobile: 0.84rem;
  --about-card-copy-padding-inline-end: 0.2rem;
  --about-card-cursor-width-ratio: 0.5;
  --about-card-cursor-height-ratio: 0.88;
  --about-card-cursor-gap-ratio: 0.1;
  --about-card-cursor-baseline-shift-ratio: 0;
  --about-card-cursor-blink-duration: 1.05s;
  --about-card-avatar-filter: saturate(0.82) contrast(1.08) brightness(0.9) sepia(0.16)
    hue-rotate(-12deg);
  --about-card-avatar-drop-shadow: drop-shadow(0 18px 28px rgba(0, 0, 0, 0.45));
  --about-card-floating-avatar-shadow: 0 12px 24px rgba(0, 0, 0, 0.32);
  position: relative;
  aspect-ratio: var(--about-card-aspect-ratio);
  min-height: 0;
  width: min(100%, var(--about-card-width));
  height: auto;
  max-width: min(100%, var(--about-card-width));
  cursor: pointer;
  perspective: 1600px;
  outline: none;
  isolation: isolate;
  z-index: 0;
}

.about-flip-card--focused,
.about-flip-card--flipped {
  z-index: 2;
}

.about-flip-card__inner {
  position: relative;
  height: 100%;
  transform-style: preserve-3d;
  will-change: transform;
}

.about-flip-card__face {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  gap: var(--about-card-face-gap);
  padding: var(--about-card-face-padding);
  border: 1px solid var(--color-neon-magenta);
  border-radius: var(--about-card-face-radius);
  background:
    linear-gradient(180deg, rgba(19, 5, 65, 0.96) 0%, rgba(45, 45, 68, 0.95) 100%),
    linear-gradient(180deg, rgba(139, 79, 125, 0.26) 0%, rgba(10, 10, 18, 0.15) 100%);
  box-shadow:
    0 18px 40px rgba(0, 0, 0, 0.5),
    0 0 12px rgba(191, 7, 90, 0.28),
    inset 0 0 0 1px rgba(255, 255, 255, 0.04);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  transform-style: preserve-3d;
  overflow: hidden;
  pointer-events: none;
}

.about-flip-card__face--front {
  transform: rotateY(0deg) translateZ(1px);
  pointer-events: auto;
}

.about-flip-card__face::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at top left, rgba(212, 175, 55, 0.12), transparent 38%),
    radial-gradient(circle at bottom right, rgba(104, 198, 224, 0.12), transparent 42%);
  pointer-events: none;
}

.about-flip-card__face--back {
  transform: rotateY(180deg) translateZ(1px);
  gap: var(--about-card-back-face-gap);
}

.about-flip-card__face,
.about-flip-card__face * {
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.about-flip-card--flipped .about-flip-card__face--front {
  pointer-events: none;
}

.about-flip-card--flipped .about-flip-card__face--back {
  pointer-events: auto;
}

.about-flip-card--flipped .about-flip-card__face {
  border-color: var(--color-neon-cyan);
  box-shadow:
    0 18px 40px rgba(0, 0, 0, 0.55),
    0 0 22px rgba(104, 198, 224, 0.38),
    inset 0 0 0 1px rgba(255, 255, 255, 0.06);
}

.about-flip-card--focused .about-flip-card__face,
.about-flip-card:focus-visible .about-flip-card__face {
  box-shadow:
    0 18px 40px rgba(0, 0, 0, 0.55),
    0 0 0 2px rgba(104, 198, 224, 0.35),
    0 0 22px rgba(104, 198, 224, 0.32);
}

.about-flip-card__front-header,
.about-flip-card__title,
.about-flip-card__back-header,
.about-flip-card__back-body,
.about-flip-card__copy,
.about-flip-card__song-chip,
.about-flip-card__avatar-frame {
  position: relative;
  z-index: 1;
}

.about-flip-card__front-header,
.about-flip-card__back-header {
  flex: 0 0 var(--about-card-header-height);
  width: 100%;
  height: var(--about-card-header-height);
  min-height: var(--about-card-header-height);
  max-height: var(--about-card-header-height);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  position: relative;
}

.about-flip-card__back-header {
  justify-content: space-between;
}

.about-flip-card__title {
  margin: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: var(--about-card-title-font-size);
  line-height: var(--about-card-title-line-height);
  color: var(--color-text);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  text-align: center;
}

.about-flip-card__title--front {
  align-self: flex-start;
  padding-top: 0.35rem;
}

.about-flip-card__avatar-frame {
  flex: 1;
  min-height: 0;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: var(--about-card-avatar-frame-padding);
  border-radius: var(--about-card-frame-radius);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(10, 10, 18, 0.35) 100%),
    radial-gradient(circle at top, rgba(104, 198, 224, 0.16), transparent 45%);
}

.about-flip-card__avatar-skeleton {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.about-flip-card__avatar {
  display: block;
  width: 100%;
  max-width: 100%;
  height: auto;
  max-height: var(--about-card-avatar-max-height);
  object-fit: contain;
  object-position: center center;
  flex: 0 0 auto;
  opacity: 0;
  position: relative;
  z-index: 1;
  transition: opacity 240ms ease;
  filter: var(--about-card-avatar-filter) var(--about-card-avatar-drop-shadow);
}

.about-flip-card__avatar--loaded {
  opacity: 1;
}

.about-flip-card__back-avatar-slot {
  position: absolute;
  top: 0;
  right: 0;
  flex: 0 0 var(--about-card-back-icon-size);
  width: var(--about-card-back-icon-size);
  height: var(--about-card-back-icon-size);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid rgba(104, 198, 224, 0.45);
  border-radius: 999px;
  background:
    radial-gradient(circle at top, rgba(104, 198, 224, 0.18), rgba(10, 10, 18, 0.2) 70%),
    rgba(0, 0, 0, 0.28);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
}

.about-flip-card__back-avatar-anchor {
  position: absolute;
  top: var(--about-card-back-icon-offset);
  right: var(--about-card-back-icon-offset);
  width: var(--about-card-back-icon-size);
  height: var(--about-card-back-icon-size);
  pointer-events: none;
  opacity: 0;
}

.about-flip-card__back-avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 20%;
  filter: var(--about-card-avatar-filter);
}

.about-flip-card__back-body {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  gap: var(--about-card-back-body-gap);
}

.about-flip-card__back-badges {
  display: grid;
  grid-template-columns: repeat(2, var(--about-card-back-icon-size));
  grid-auto-rows: var(--about-card-back-icon-size);
  gap: var(--about-card-back-badge-gap);
  justify-content: start;
  align-content: start;
  align-items: start;
  width: var(--about-card-back-badge-width);
}

.about-flip-card__copy {
  margin: 0;
  display: block;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  color: var(--color-text-secondary);
  line-height: 1.48;
  font-size: var(--about-card-copy-font-size);
  text-align: left;
  padding-right: var(--about-card-copy-padding-inline-end);
}

.about-flip-card__cursor-indicator {
  display: inline-block;
  flex: 0 0 auto;
  width: calc(var(--about-card-cursor-width-ratio) * 1em);
  height: calc(var(--about-card-cursor-height-ratio) * 1em);
  margin-inline-start: calc(var(--about-card-cursor-gap-ratio) * 1em);
  border-radius: 0.08em;
  background: currentColor;
  vertical-align: baseline;
  transform: translateY(calc(var(--about-card-cursor-baseline-shift-ratio) * 1em));
  opacity: 0;
}

.about-flip-card__cursor-indicator--title {
  color: var(--color-text);
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.08);
}

.about-flip-card__cursor-indicator--copy {
  color: var(--color-text-secondary);
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.04);
}

.about-flip-card--show-title-cursor .about-flip-card__cursor-indicator--title,
.about-flip-card--flipped.about-flip-card--hovered .about-flip-card__cursor-indicator--copy {
  opacity: 1;
  animation: about-flip-card-cursor-blink var(--about-card-cursor-blink-duration) step-end infinite;
}

.about-flip-card__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--about-card-back-icon-size);
  height: var(--about-card-back-icon-size);
  min-height: var(--about-card-back-icon-size);
  max-height: var(--about-card-back-icon-size);
  aspect-ratio: 1;
  flex: 0 0 var(--about-card-back-icon-size);
  border: 1px solid rgba(104, 198, 224, 0.24);
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.22);
}

.about-flip-card__badge img {
  width: var(--about-card-back-badge-inner-size);
  height: var(--about-card-back-badge-inner-size);
}

.about-flip-card__song-chip {
  display: inline-flex;
  align-items: baseline;
  margin-inline: 0.22em;
  padding: 0;
  border: 0;
  border-radius: 0;
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

.about-flip-card__floating-avatar {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: var(--about-card-face-radius);
  pointer-events: none;
  z-index: 3;
  box-shadow: var(--about-card-floating-avatar-shadow);
}

.about-flip-card__floating-avatar img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 20%;
  filter: var(--about-card-avatar-filter);
}

.about-flip-card__song-chip:hover,
.about-flip-card__song-chip:focus-visible {
  color: #9fe7fb;
  text-decoration-color: currentColor;
  outline: none;
}

@keyframes about-flip-card-cursor-blink {
  0%,
  48% {
    opacity: 1;
  }

  49%,
  100% {
    opacity: 0;
  }
}

@media (max-width: 767px) {
  .about-flip-card {
    width: min(100%, var(--about-card-width-mobile));
    height: var(--about-card-height-mobile);
  }

  .about-flip-card__face {
    padding: var(--about-card-face-padding-mobile);
  }

  .about-flip-card__copy {
    font-size: var(--about-card-copy-font-size-mobile);
  }
}
</style>
