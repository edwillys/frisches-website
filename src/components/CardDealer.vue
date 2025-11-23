<script setup lang="ts">
/**
 * CardDealer Component
 * 
 * Manages the main card-based navigation interface with smooth animations.
 * 
 * Card Animation Behavior:
 * =========================
 * 
 * Opening Animation (Two-Phase):
 * 1. Deck Appearance: All cards grow together from a single center point as a unified deck
 *    - No stagger: cards appear as one solid entity
 *    - Duration: 0.8s with power2.inOut easing
 * 
 * 2. Card Distribution: Cards spread out to their final positions (left/right)
 *    - Stagger from center: creates symmetrical spread effect
 *    - Duration: 1.0s with power2.inOut easing
 * 
 * Closing Animation (Inverse Two-Phase):
 * 1. Card Gathering: Cards move from distributed positions back to center deck
 *    - Stagger from edges: cards gather from outside in
 *    - Duration: 1.0s with power2.inOut easing
 * 
 * 2. Deck Disappearance: All cards shrink together to a single point
 *    - No stagger: cards disappear as one unified deck
 *    - Duration: 0.8s with power2.inOut easing
 */
import { ref, onMounted, nextTick, onBeforeUnmount } from 'vue'
import MenuCard from './MenuCard.vue'
import LogoButton from './LogoButton.vue'
import AudioPlayer from './AudioPlayer.vue'
import { useGSAP, useFadeIn } from '../composables/useGSAP'
import gsap from 'gsap'
import { CustomEase } from 'gsap/CustomEase'

gsap.registerPlugin(CustomEase)

const deckGrowEase = CustomEase.create('deckGrowEase', 'M0,0 C0.3,0 0.05,1 1,1')
const deckSpreadEase = CustomEase.create('deckSpreadEase', 'M0,0 C0.18,0 0.05,1 1,1')
const deckGatherEase = CustomEase.create('deckGatherEase', 'M0,0 C0.6,0 0.25,1 1,1')
const panelEase = CustomEase.create('deckPanelEase', 'M0,0 C0.4,0 0.15,1 1,1')

const containerRef = ref<HTMLElement | null>(null)
const bgRef = ref<HTMLElement | null>(null)
const titleRef = ref<HTMLElement | null>(null)
const cardsRef = ref<(HTMLElement | null)[]>([])
const cardsContainerRef = ref<HTMLElement | null>(null)
const contentPanelRef = ref<HTMLElement | null>(null)
const logoButtonRef = ref<HTMLElement | Record<string, unknown> | null>(null)
const currentView = ref<'logo' | 'cards' | 'content'>('logo')
const selectedCard = ref<number | null>(null)
const isAnimating = ref(false)

// Background zoom-in animation on mount
useGSAP(() => {
  nextTick(() => {
    const bgEl = bgRef.value
    const logoEl = getLogoElement()

    if (!bgEl || !logoEl) return

    const tl = gsap.timeline()
    tl.fromTo(
      bgEl,
      { scale: 1.08, opacity: 0.7 },
      { scale: 1, opacity: 1, duration: 1.6, ease: 'power2.out' }
    )
      .fromTo(
        logoEl,
        { opacity: 0, scale: 0.8 },
        { opacity: 1, scale: 1, duration: 1, ease: 'power2.out' },
        '-=1.1'
      )
      .to(bgEl, {
        scale: 1.04,
        duration: 3,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true
      })
  })
})

// Fade in animations for title and subtitle
useFadeIn(titleRef, { duration: 1, delay: 0.3, y: 50 })

// Menu items configuration
const menuItems = [
  {
    title: 'Music',
    image: new URL('../assets/images/menu-card-music.png', import.meta.url).href,
    route: '/music'
  },
  {
    title: 'About',
    image: new URL('../assets/images/menu-card-about.png', import.meta.url).href,
    route: '/about'
  },
  {
    title: 'Tour',
    image: new URL('../assets/images/menu-card-tour.png', import.meta.url).href,
    route: '/tour'
  }
]

const deckLeadIndex = Math.floor(menuItems.length / 2)

const handleCardClick = (route: string) => {
  if (isAnimating.value) return
  
  // Find the clicked card index
  const cardIndex = menuItems.findIndex(item => item.route === route)
  if (cardIndex === -1) return

  console.log('Card clicked:', route)
  isAnimating.value = true
  selectedCard.value = cardIndex
  playCardSelection(cardIndex)
}

const handleLogoClick = () => {
  if (isAnimating.value || currentView.value !== 'logo') return
  console.log('Logo clicked! Starting animation sequence...')
  isAnimating.value = true
  
  // Trigger logo close animation, then card open
  playLogoCloseAndCardOpen()
}

const setCardRef = (componentOrEl: unknown, index: number) => {
  let el: HTMLElement | null = null
  if (componentOrEl && typeof componentOrEl === 'object') {
    const asRec = componentOrEl as Record<string, unknown>
    if ('cardEl' in asRec && asRec.cardEl) el = asRec.cardEl as HTMLElement
    else if ('$el' in asRec && asRec.$el) el = asRec.$el as HTMLElement
  } else if (componentOrEl instanceof HTMLElement) {
    el = componentOrEl
  }
  cardsRef.value[index] = el
}

const getLogoElement = () => {
  const instance = logoButtonRef.value
  if (!instance) return null
  if (typeof instance === 'object' && instance !== null) {
    const asRecord = instance as Record<string, unknown>
    if ('rootEl' in asRecord) return asRecord.rootEl as HTMLElement | null
    if ('$el' in asRecord) return asRecord.$el as HTMLElement | null
  }
  return instance as unknown as HTMLElement | null
}

const getCardElements = () => cardsRef.value.filter((card): card is HTMLElement => Boolean(card))

const setCardMaskState = (card: HTMLElement, hidden: boolean) => {
  if (hidden) {
    card.dataset.deckMasked = 'true'
    card.setAttribute('aria-hidden', 'true')
  } else {
    card.dataset.deckMasked = 'false'
    card.removeAttribute('aria-hidden')
  }

  gsap.set(card, {
    opacity: hidden ? 0 : 1,
    visibility: hidden ? 'hidden' : 'visible'
  })
}

const setDeckMask = (cards: HTMLElement[], maskNonLead: boolean) => {
  cards.forEach((card, index) => {
    if (!card) return
    const hidden = maskNonLead && index !== deckLeadIndex
    setCardMaskState(card, hidden)
  })
}

const handleGlobalPointerDown = (event: PointerEvent) => {
  if (isAnimating.value) return
  if (currentView.value === 'logo') return

  const target = event.target as Node | null
  if (!target) return

  const clickedInsideCards = cardsContainerRef.value?.contains(target) ?? false
  const clickedInsideContent = contentPanelRef.value?.contains(target) ?? false

  if (currentView.value === 'cards') {
    if (clickedInsideCards) return
    isAnimating.value = true
    playCardCloseAndLogoReappear()
  } else if (currentView.value === 'content') {
    if (clickedInsideContent) return
    isAnimating.value = true
    playContentCloseAndCardsReturn()
  }
}

const playLogoCloseAndCardOpen = () => {
  const logoEl = getLogoElement()
  if (!logoEl) {
    isAnimating.value = false
    return
  }

  // Step 1: Move logo to center
  const tl = gsap.timeline({
    onComplete: () => {
      // Animation complete
    }
  })

  // Move to center of screen
  const windowHeight = window.innerHeight
  const logoRect = logoEl.getBoundingClientRect()
  const currentY = logoRect.top + logoRect.height / 2
  const centerY = windowHeight / 2
  const moveY = centerY - currentY

  tl.to(logoEl, {
    y: moveY,
    duration: 0.8,
    ease: deckSpreadEase
  })
  
  // Step 2: Logo close animation (360° rotation + scale shrink)
  tl.to(logoEl, {
    rotation: 360,
    scale: 0.1,
    opacity: 0,
    duration: 0.8,
    ease: deckGrowEase,
    onStart: () => {
      // Start showing cards slightly before logo disappears completely
      // Overlap effect
      setTimeout(() => {
        currentView.value = 'cards'
        nextTick(() => {
          playCardOpen()
        })
      }, 400) // Start halfway through the 0.8s duration
    }
  }, '-=0.2')
}

const playCardOpen = () => {
  const cards = getCardElements()
  if (cards.length === 0) {
    isAnimating.value = false
    return
  }

  const container = cardsContainerRef.value
  if (!container) return

  const containerRect = container.getBoundingClientRect()
  const containerCenter = {
    x: containerRect.width / 2,
    y: containerRect.height / 2
  }

  const leadCard = cards[deckLeadIndex] ?? cards[0]
  if (!leadCard) {
    isAnimating.value = false
    return
  }

  const tl = gsap.timeline({
    onComplete: () => {
      cards.forEach(card => {
        if (!card) return
        card.dataset.deckMasked = 'false'
        card.removeAttribute('aria-hidden')
        // Don't clear opacity as it defaults to 0 in CSS
        gsap.set(card, { clearProps: 'transform,visibility,zIndex' })
      })
      isAnimating.value = false
    }
  })

  // Calculate how far each card needs to move to reach the center
  const cardOffsets = cards.map(card => {
    const rect = card.getBoundingClientRect()
    const cardCenterX = (rect.left - containerRect.left) + rect.width / 2
    const cardCenterY = (rect.top - containerRect.top) + rect.height / 2
    return {
      x: containerCenter.x - cardCenterX,
      y: containerCenter.y - cardCenterY
    }
  })

  // Set initial state: All cards at center, stacked perfectly, tiny scale
  cards.forEach((card, index) => {
    const offset = cardOffsets[index]
    if (!offset) return
    
    // Calculate z-index based on distance from lead to ensure proper stacking
    const distanceFromLead = Math.abs(index - deckLeadIndex)
    const zIndex = index === deckLeadIndex ? 50 : 40 - distanceFromLead

    gsap.set(card, {
      x: offset.x,
      y: offset.y,
      scale: 0.01,
      rotation: 0,
      zIndex: zIndex,
      transformOrigin: 'center center',
      force3D: true
    })
  })

  // Ensure all cards are visible for the "unified deck" effect
  setDeckMask(cards, false)

  // Phase 1: Grow from single point to full deck (all together, no stagger)
  tl.to(cards, {
    scale: 1,
    duration: 0.9,
    ease: deckGrowEase
  })

  // Phase 2: Slide cards out from behind the lead card
  const spreadTl = gsap.timeline()
  cards.forEach((card, index) => {
    const distanceFromLead = Math.abs(index - deckLeadIndex)
    const staggerStart = distanceFromLead * 0.14
    const slideDuration = 0.85 + distanceFromLead * 0.1

    spreadTl.to(card, {
      x: 0,
      y: 0,
      ease: deckSpreadEase,
      duration: slideDuration
    }, staggerStart)
  })

  tl.add(spreadTl, '-=0.25')
}

const playCardCloseAndLogoReappear = () => {
  const cards = getCardElements()
  if (cards.length === 0) {
    currentView.value = 'logo'
    nextTick(() => playLogoReappear())
    return
  }

  const container = cardsContainerRef.value
  if (!container) return

  const leadCard = cards[deckLeadIndex] ?? cards[0]
  if (!leadCard) {
    currentView.value = 'logo'
    nextTick(() => playLogoReappear())
    return
  }

  const containerRect = container.getBoundingClientRect()
  const containerCenter = {
    x: containerRect.width / 2,
    y: containerRect.height / 2
  }

  const tl = gsap.timeline({
    onComplete: () => {
      currentView.value = 'logo'
      nextTick(() => playLogoReappear())
    }
  })

  // Calculate offsets to move each card to center
  const cardOffsets = cards.map(card => {
    const rect = card.getBoundingClientRect()
    const cardCenterX = (rect.left - containerRect.left) + rect.width / 2
    const cardCenterY = (rect.top - containerRect.top) + rect.height / 2
    return {
      x: containerCenter.x - cardCenterX,
      y: containerCenter.y - cardCenterY
    }
  })

  // Phase 1: Gather cards to center (inverse of spread)
  tl.to(cards, {
    x: (i: number) => cardOffsets[i]?.x || 0,
    y: (i: number) => cardOffsets[i]?.y || 0,
    rotation: 0,
    scale: 1,
    zIndex: 50,
    duration: 1.0,
    ease: deckGatherEase,
    stagger: {
      from: 'edges',
      amount: 0.2
    },
    onComplete: () => setDeckMask(cards, true)
  })

  // Phase 2: Shrink to point (all together, no stagger)
  tl.to(leadCard, {
    scale: 0.01,
    duration: 0.85,
    ease: deckGrowEase,
    onComplete: () => {
      cards.forEach(card => {
        if (!card) return
        card.dataset.deckMasked = 'false'
        card.removeAttribute('aria-hidden')
        gsap.set(card, { clearProps: 'transform,opacity,visibility,zIndex' })
      })
    }
  })
}

const playLogoReappear = () => {
  const logoEl = getLogoElement()
  if (!logoEl) {
    isAnimating.value = false
    return
  }

  // Calculate center position
  const windowHeight = window.innerHeight
  const logoRect = logoEl.getBoundingClientRect()
  // Current position is likely at the bottom (initial CSS position)
  // We want to start animation at the center
  const currentY = logoRect.top + logoRect.height / 2
  const centerY = windowHeight / 2
  const moveY = centerY - currentY

  // Set initial state at center
  gsap.set(logoEl, {
    y: moveY,
    rotation: 360,
    scale: 0.1,
    opacity: 0
  })

  const tl = gsap.timeline({
    onComplete: () => {
      isAnimating.value = false
      // Clear props to return to CSS positioning if needed, 
      // but we want it to stay at bottom. 
      // Since we animated 'y' back to 0 (relative to original position), 
      // it should be fine.
      gsap.set(logoEl, { clearProps: 'transform,opacity' })
    }
  })

  // Step 1: Spiral in at center (Reverse of disappear)
  tl.to(logoEl, {
    rotation: 0,
    scale: 1,
    opacity: 1,
    duration: 0.8,
    ease: deckGrowEase,
    force3D: true
  })

  // Step 2: Move back to bottom (original position)
  tl.to(logoEl, {
    y: 0,
    duration: 0.8,
    ease: deckSpreadEase,
    force3D: true
  })
}

const playContentCloseAndCardsReturn = () => {
  const cards = getCardElements()
  const container = cardsContainerRef.value
  const panel = contentPanelRef.value

  const tl = gsap.timeline({
    defaults: { ease: deckSpreadEase, duration: 0.6 },
    onComplete: () => {
      // Don't clear opacity as it defaults to 0 in CSS
      cards.forEach(card => gsap.set(card, { clearProps: 'transform,visibility,zIndex' }))
      if (container) {
        gsap.set(container, { clearProps: 'transform' })
      }
      selectedCard.value = null
      currentView.value = 'cards'
      isAnimating.value = false
    }
  })

  if (panel) {
    tl.to(panel, {
      opacity: 0,
      y: 30,
      duration: 0.35,
      ease: panelEase
    }, 0)
  }

  if (container) {
    tl.to(container, { x: 0 }, 0)
  }

  cards.forEach(card => {
    tl.to(card, {
      opacity: 1,
      scale: 1,
      x: 0,
      y: 0,
      rotation: 0,
      zIndex: 1
    }, 0)
  })
}

const playCardSelection = (cardIndex: number) => {
  const cards = getCardElements()
  if (cards.length === 0 || !cards[cardIndex]) {
    isAnimating.value = false
    return
  }

  // Get positions before changing view state (which might trigger layout changes)
  const cardRects = cards.map(c => c.getBoundingClientRect())
  
  // We want all cards to move to the position where the middle card would be
  // if the container was shifted.
  // The middle card is index 1 (since we have 3 cards).
  const middleCardIndex = 1
  const middleRect = cardRects[middleCardIndex]
  
  if (!middleRect) return

  currentView.value = 'content'

  nextTick(() => {
    const container = cardsContainerRef.value
    const panel = contentPanelRef.value

    const tl = gsap.timeline({
      defaults: { ease: deckSpreadEase, duration: 0.8 },
      onComplete: () => {
        isAnimating.value = false
      }
    })

    if (container) {
      // Move the whole container to the left
      tl.to(container, {
        x: -320, // Moved further left to give space for content
        duration: 0.8
      }, 0)
    }

    cards.forEach((card, index) => {
      const rect = cardRects[index]
      if (!rect) return

      // Calculate offset to move this card to the middle card's position
      // This ensures the stack always forms at the same visual location
      const offsetToTarget = middleRect.left - rect.left
      
      // Tiny offset to show there are cards underneath (piling effect)
      const stackOffset = (index - cardIndex) * 3

      tl.to(card, {
        x: offsetToTarget + stackOffset,
        y: 0,
        scale: index === cardIndex ? 1.05 : 0.95,
        opacity: 1, // Keep visible so we see the stack edges
        rotation: (index - cardIndex) * 1.5, // Very slight rotation
        zIndex: index === cardIndex ? 50 : 40 - Math.abs(index - cardIndex),
        force3D: true // Force hardware acceleration
      }, 0)
    })

    if (panel) {
      tl.fromTo(
        panel,
        { opacity: 0, x: 40 },
        { opacity: 1, x: 0, duration: 0.6, ease: panelEase },
        0.2
      )
    }
  })
}

onMounted(() => {
  window.addEventListener('pointerdown', handleGlobalPointerDown)
  console.log('CardDealer mounted')
})

onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', handleGlobalPointerDown)
})
</script>

<template>
  <div ref="containerRef" class="card-dealer">
    <div ref="bgRef" class="card-dealer__background">
      <img
        src="../assets/images/card-dealer-main.jpg"
        alt="Mysterious card dealer"
        class="card-dealer__bg-image"
      />
      <div class="card-dealer__overlay"></div>
    </div>

    <div class="card-dealer__content">
      <!-- Logo button (initial view) -->
      <div v-if="currentView === 'logo'" class="card-dealer__logo-button-wrapper">
        <LogoButton
          ref="logoButtonRef"
          :size="240"
          @click="handleLogoClick"
        />
      </div>

      <!-- Cards container (shown after logo click) -->
      <div
        v-show="currentView !== 'logo'"
        ref="cardsContainerRef"
        :class="[
          'card-dealer__cards',
          { 'card-dealer__cards--content': currentView === 'content' }
        ]"
      >
        <MenuCard
          v-for="(item, index) in menuItems"
          :key="item.route"
          :ref="el => setCardRef(el, index)"
          :title="item.title"
          :image="item.image"
          :route="item.route"
          :index="index"
          @click="handleCardClick"
          class="card-dealer__card"
        />
      </div>

      <!-- Content view (shown after card click) -->
      <div
        v-if="currentView === 'content'"
        class="card-dealer__content-view"
      >
        <div ref="contentPanelRef" class="card-dealer__content-panel">
          <!-- Music Player -->
          <div v-if="selectedCard !== null && menuItems[selectedCard]?.title === 'Music'" class="card-dealer__music-content">
            <AudioPlayer />
          </div>
          
          <!-- Other content -->
          <div v-else>
            <h2 v-if="selectedCard !== null && selectedCard < menuItems.length">
              {{ menuItems[selectedCard]?.title }}
            </h2>
            <p>
              Content for {{ selectedCard !== null && selectedCard < menuItems.length ? menuItems[selectedCard]?.title : '' }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card-dealer {
  position: relative;
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.card-dealer__top-logo {
  position: fixed;
  top: var(--spacing-lg);
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  pointer-events: auto;
}

.card-dealer__background {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.card-dealer__bg-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.card-dealer__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(10, 10, 18, 0.3) 0%,
    rgba(10, 10, 18, 0.7) 50%,
    rgba(10, 10, 18, 0.9) 100%
  );
}

.card-dealer__content {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-2xl);
  text-align: center;
}

.card-dealer__title {
  font-size: var(--font-size-5xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  text-shadow: 0 4px 8px rgba(0, 0, 0, 0.8);
  margin-bottom: var(--spacing-sm);
}

.card-dealer__moon-wrapper {
  position: fixed;
  bottom: var(--spacing-2xl);
  left: 50%;
  transform: translateX(-50%);
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-dealer__logo-button-wrapper {
  position: fixed;
  bottom: var(--spacing-2xl);
  left: 50%;
  transform: translateX(-50%);
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-dealer__cards {
  display: flex;
  gap: var(--spacing-xl);
  justify-content: center;
  align-items: center;
  position: relative;
  z-index: 3;
  flex-wrap: nowrap;
  width: auto;
  perspective: 1000px; /* Add perspective for 3D transforms */
}

.card-dealer__cards--content {
  pointer-events: none;
}

.card-dealer__card {
  /* Cards will be animated with GSAP */
  opacity: 0;
  position: relative;
  z-index: 4;
  flex-shrink: 0;
  /* Improve rendering performance and reduce glitching */
  backface-visibility: hidden;
  transform-style: preserve-3d;
  will-change: transform, opacity;
}

.card-dealer__content-view {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 4;
  pointer-events: none;
}

.card-dealer__content-panel {
  background: rgba(0, 0, 0, 0.7);
  border: 2px solid var(--color-primary);
  border-radius: 16px;
  padding: var(--spacing-3xl);
  max-width: 600px;
  text-align: center;
  color: var(--color-text);
  pointer-events: auto;
}

.card-dealer__music-content {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

/* Tablet responsiveness */
@media (max-width: 1024px) {
  .card-dealer__title {
    font-size: var(--font-size-4xl);
  }

  .card-dealer__subtitle {
    font-size: var(--font-size-lg);
  }

  .card-dealer__content {
    gap: var(--spacing-2xl);
  }

  .card-dealer__cards {
    gap: var(--spacing-lg);
  }

}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .card-dealer__title {
    font-size: var(--font-size-3xl);
  }

  .card-dealer__subtitle {
    font-size: var(--font-size-base);
  }

  .card-dealer__content {
    gap: var(--spacing-xl);
    padding: var(--spacing-lg);
  }

  .card-dealer__cards {
    gap: var(--spacing-md);
  }

  .card-dealer__content-panel {
    width: 100%;
  }
}

/* Small mobile devices */
@media (max-width: 480px) {
  .card-dealer__title {
    font-size: var(--font-size-2xl);
  }

  .card-dealer__cards {
    flex-direction: column;
  }
}
</style>
