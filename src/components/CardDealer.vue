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
const contentViewRef = ref<HTMLElement | null>(null)
const logoButtonRef = ref<any | null>(null)

// View states: 'logo' | 'cards' | 'content'
const currentView = ref<'logo' | 'cards' | 'content'>('logo')
const selectedCard = ref<number | null>(null)
const isAnimating = ref(false)

// Background zoom-in animation on mount
useGSAP(() => {
  if (!bgRef.value) return
  gsap.from(bgRef.value, {
    scale: 1.1,
    duration: 2,
    ease: 'power1.inOut'
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
  const clickedInsideContent = contentViewRef.value?.contains(target) ?? false

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

  // Step 1: Logo close animation (360° rotation + scale shrink)
  gsap.to(logoEl, {
    rotation: 360,
    scale: 0.1,
    opacity: 0,
    duration: 0.8,
    ease: 'power2.inOut',
    onComplete: () => {
      // Step 2: Update view and trigger card open
      currentView.value = 'cards'
      nextTick(() => {
        playCardOpen()
      })
    }
  })
}

const playCardOpen = () => {
  const cards = getCardElements()
  if (cards.length === 0) {
    isAnimating.value = false
    return
  }

  // Set initial state (cards at center, hidden)
  gsap.set(cards, {
    opacity: 0,
    scale: 0.3,
    rotation: 0
  })

  // Animate cards expanding from center (using scale only, let flex do the layout)
  cards.forEach((card, index) => {
    gsap.to(card, {
      opacity: 1,
      scale: 1,
      rotation: 0,
      duration: 0.9,
      delay: index * 0.06,
      ease: 'back.out(1.2)',
      onComplete: () => {
        if (index === cards.length - 1) {
          isAnimating.value = false
        }
      }
    })
  })
}

const playCardCloseAndLogoReappear = () => {
  const cards = getCardElements()
  if (cards.length === 0) {
    currentView.value = 'logo'
    isAnimating.value = false
    return
  }

  // Collapse cards back to center
  gsap.to(cards, {
    opacity: 0,
    scale: 0.3,
    x: 0,
    y: 0,
    rotation: 0,
    duration: 0.8,
    stagger: 0.03,
    ease: 'back.in(1.2)',
    onComplete: () => {
      // Bring back logo
      currentView.value = 'logo'
      nextTick(() => {
        playLogoReappear()
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

  gsap.to(logoEl, {
    rotation: 0,
    scale: 1,
    opacity: 1,
    duration: 0.8,
    ease: 'power2.inOut',
    onComplete: () => {
      isAnimating.value = false
    }
  })
}

const playContentCloseAndCardsReturn = () => {
  const cards = getCardElements()
  if (cards.length === 0) {
    selectedCard.value = null
    currentView.value = 'cards'
    isAnimating.value = false
    return
  }

  // Reverse card selection animation - cards return to normal layout
  cards.forEach((card, index) => {
    gsap.to(card, {
      opacity: 1,
      scale: 1,
      x: 0,
      y: 0,
      rotation: 0,
      zIndex: 1,
      duration: 0.6,
      delay: index * 0.03,
      ease: 'back.out(1)',
      onComplete: () => {
        if (index === cards.length - 1) {
          selectedCard.value = null
          currentView.value = 'cards'
          isAnimating.value = false
        }
      }
    })
  })
}

const playCardSelection = (cardIndex: number) => {
  const cards = getCardElements()
  if (cards.length === 0 || !cards[cardIndex]) {
    currentView.value = 'content'
    isAnimating.value = false
    return
  }

  // Animate selected card to side as a pile, others stack behind with slight offset
  cards.forEach((card, index) => {
    if (index === cardIndex) {
      // Selected card: move to left side, on top of pile
      gsap.to(card, {
        x: -320,
        y: 0,
        scale: 1,
        opacity: 1,
        rotation: 0,
        zIndex: 10,
        duration: 0.6,
        ease: 'power2.inOut'
      })
    } else {
      // Other cards: stack behind with slight offset, visible but faded
      const offsetX = -320 + (index > cardIndex ? 8 : -8)
      const offsetY = (index > cardIndex ? 4 : -4)
      gsap.to(card, {
        x: offsetX,
        y: offsetY,
        scale: 0.95,
        opacity: 0.4,
        rotation: 0,
        zIndex: 5,
        duration: 0.6,
        ease: 'power2.inOut'
      })
    }
  })

  // Show content view after animation
  gsap.delayedCall(0.6, () => {
    currentView.value = 'content'
    isAnimating.value = false
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
        ref="contentViewRef"
        class="card-dealer__content-view"
      >
        <div class="card-dealer__content-placeholder">
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
}

.card-dealer__content-view {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  z-index: 4;
}

.card-dealer__content-placeholder {
  background: rgba(0, 0, 0, 0.7);
  border: 2px solid var(--color-primary);
  border-radius: 16px;
  padding: var(--spacing-3xl);
  max-width: 600px;
  text-align: center;
  color: var(--color-text);
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
