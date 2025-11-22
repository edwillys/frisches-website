<script setup lang="ts">
import { ref, onMounted, nextTick, onBeforeUnmount } from 'vue'
import MenuCard from './MenuCard.vue'
import LogoButton from './LogoButton.vue'
import { useGSAP, useFadeIn } from '../composables/useGSAP'
import gsap from 'gsap'

const containerRef = ref<HTMLElement | null>(null)
const bgRef = ref<HTMLElement | null>(null)
const titleRef = ref<HTMLElement | null>(null)
const subtitleRef = ref<HTMLElement | null>(null)
const cardsRef = ref<(HTMLElement | null)[]>([])
const cardsContainerRef = ref<HTMLElement | null>(null)
const contentPanelRef = ref<HTMLElement | null>(null)
const logoButtonRef = ref<any | null>(null)

type StackState = {
  x: number
  y: number
  rotation: number
  scale: number
  zIndex: number
}

const STACK_BASE_X = 140
const STACK_BASE_Y = 20
const STACK_X_STEP = 10
const STACK_Y_STEP = -4
const STACK_ROTATION_BASE = -12
const STACK_ROTATION_STEP = 3.5
const STACK_SCALE_BASE = 0.82
const STACK_SCALE_STEP = 0.06

const getStackState = (index: number, total: number): StackState => {
  const order = index
  return {
    x: STACK_BASE_X + order * STACK_X_STEP,
    y: STACK_BASE_Y + order * STACK_Y_STEP,
    rotation: STACK_ROTATION_BASE + order * STACK_ROTATION_STEP,
    scale: STACK_SCALE_BASE + order * STACK_SCALE_STEP,
    zIndex: 40 + (total - order)
  }
}

// View states: 'logo' | 'cards' | 'content'
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
    image: new URL('../assets/images/menu-card-music.jpg', import.meta.url).href,
    route: '/music'
  },
  {
    title: 'About',
    image: new URL('../assets/images/menu-card-about.jpg', import.meta.url).href,
    route: '/about'
  },
  {
    title: 'Tour',
    image: new URL('../assets/images/menu-card-tour.jpg', import.meta.url).href,
    route: '/tour'
  }
]

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

const setCardRef = (componentOrEl: any, index: number) => {
  cardsRef.value[index] = componentOrEl?.cardEl ?? componentOrEl?.$el ?? componentOrEl ?? null
}

const getLogoElement = () => {
  const instance = logoButtonRef.value
  if (!instance) return null
  return instance.rootEl ?? instance.$el ?? instance
}

const getCardElements = () => cardsRef.value.filter((card): card is HTMLElement => Boolean(card))

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
      // Step 3: Update view and trigger card open
      currentView.value = 'cards'
      nextTick(() => {
        playCardOpen()
      })
    }
  })

  // Move to center of screen
  // Since it's fixed at bottom, we need to calculate the center
  const windowHeight = window.innerHeight
  const logoRect = logoEl.getBoundingClientRect()
  const currentY = logoRect.top + logoRect.height / 2
  const centerY = windowHeight / 2
  const moveY = centerY - currentY

  tl.to(logoEl, {
    y: moveY,
    duration: 0.8,
    ease: 'power2.inOut'
  })
  
  // Step 2: Logo close animation (360° rotation + scale shrink)
  tl.to(logoEl, {
    rotation: 360,
    scale: 0.1,
    opacity: 0,
    duration: 0.8,
    ease: 'power2.inOut'
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

  const tl = gsap.timeline({
    defaults: { ease: 'back.out(1.2)', duration: 1.0 },
    onComplete: () => {
      cards.forEach(card => gsap.set(card, { clearProps: 'transform' }))
      gsap.set(cardsContainerRef.value, { clearProps: 'transform' })
      isAnimating.value = false
    }
  })

  cards.forEach((card, index) => {
    const rect = card.getBoundingClientRect()
    // Calculate offset to center (where the logo was)
    const cardCenterX = (rect.left - containerRect.left) + rect.width / 2
    const cardCenterY = (rect.top - containerRect.top) + rect.height / 2
    
    const offsetX = containerCenter.x - cardCenterX
    const offsetY = containerCenter.y - cardCenterY

    tl.fromTo(
      card,
      {
        opacity: 0,
        scale: 0.1,
        rotation: -180, // Start from a tighter spiral
        x: offsetX,
        y: offsetY,
        transformOrigin: 'center center'
      },
      {
        opacity: 1,
        scale: 1,
        rotation: 0,
        x: 0,
        y: 0,
        force3D: true // Force hardware acceleration
      },
      index * 0.12
    )
  })
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

  const containerRect = container.getBoundingClientRect()
  const containerCenter = {
    x: containerRect.width / 2,
    y: containerRect.height / 2
  }

  const tl = gsap.timeline({
    defaults: { ease: 'power2.inOut', duration: 0.6 },
    onComplete: () => {
      currentView.value = 'logo'
      nextTick(() => playLogoReappear())
    }
  })

  cards.forEach((card, index) => {
    const rect = card.getBoundingClientRect()
    const cardCenterX = (rect.left - containerRect.left) + rect.width / 2
    const cardCenterY = (rect.top - containerRect.top) + rect.height / 2
    
    const offsetX = containerCenter.x - cardCenterX
    const offsetY = containerCenter.y - cardCenterY

    tl.to(
      card,
      {
        opacity: 0,
        scale: 0.1,
        rotation: -120 + (index * 30),
        x: offsetX,
        y: offsetY,
        transformOrigin: 'center center'
      },
      index * 0.06
    )
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
      gsap.set(logoEl, { clearProps: 'transform' })
    }
  })

  // Step 1: Spiral in at center (Reverse of disappear)
  tl.to(logoEl, {
    rotation: 0,
    scale: 1,
    opacity: 1,
    duration: 0.8,
    ease: 'power2.inOut',
    force3D: true
  })

  // Step 2: Move back to bottom (original position)
  tl.to(logoEl, {
    y: 0,
    duration: 0.8,
    ease: 'power2.inOut',
    force3D: true
  })
}

const playContentCloseAndCardsReturn = () => {
  const cards = getCardElements()
  const container = cardsContainerRef.value
  const panel = contentPanelRef.value

  const tl = gsap.timeline({
    defaults: { ease: 'power2.inOut', duration: 0.6 },
    onComplete: () => {
      cards.forEach(card => gsap.set(card, { clearProps: 'transform opacity zIndex' }))
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
      ease: 'power1.in'
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
      defaults: { ease: 'power2.inOut', duration: 0.8 },
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
        { opacity: 1, x: 0, duration: 0.6, ease: 'power2.out' },
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
          <!-- Card content will be displayed here -->
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
}

.card-dealer__cards--content {
  pointer-events: none;
}

.card-dealer__card {
  /* Cards will be animated with GSAP */
  opacity: 1;
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
