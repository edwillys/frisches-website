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
import { ref, onMounted, nextTick, onBeforeUnmount, computed } from 'vue'
import MenuCard from './MenuCard.vue'
import LogoButton from './LogoButton.vue'
import AudioPlayer from './AudioPlayer.vue'
import { useGSAP } from '../composables/useGSAP'
import { readParticlesPaletteFromCss } from '../composables/useCardDealerPalette'
import gsap from 'gsap'
import { CustomEase } from 'gsap/CustomEase'

gsap.registerPlugin(CustomEase)

const deckGrowEase = CustomEase.create('deckGrowEase', 'M0,0 C0.3,0 0.05,1 1,1')
const deckSpreadEase = CustomEase.create('deckSpreadEase', 'M0,0 C0.18,0 0.05,1 1,1')
const deckGatherEase = CustomEase.create('deckGatherEase', 'M0,0 C0.6,0 0.25,1 1,1')
const panelEase = CustomEase.create('deckPanelEase', 'M0,0 C0.4,0 0.15,1 1,1')

const bgRef = ref<HTMLElement | null>(null)
const bgMainRef = ref<HTMLImageElement | null>(null)
const bgCoverRef = ref<HTMLImageElement | null>(null)
const coverDimRef = ref<HTMLElement | null>(null)
const cardsRef = ref<(HTMLElement | null)[]>([])
const cardsContainerRef = ref<HTMLElement | null>(null)
const contentPanelRef = ref<HTMLElement | null>(null)
const logoButtonRef = ref<HTMLElement | Record<string, unknown> | null>(null)
const backButtonRef = ref<HTMLElement | null>(null)
const miniCardRef = ref<HTMLElement | null>(null)
const currentView = ref<'logo' | 'cards' | 'content'>('logo')
const selectedCard = ref<number | null>(null)
const isAnimating = ref(false)

const miniCardStyle = computed(() => {
  if (selectedCard.value !== null && menuItems[selectedCard.value]) {
    const item = menuItems[selectedCard.value]
    return {
      backgroundImage: `url(${item!.image})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }
  }
  return {}
})

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
        yoyo: true,
      })
  })
})

// Menu items configuration
const menuItems = [
  {
    title: 'Music',
    image: new URL('../assets/images/menu-card-music.png', import.meta.url).href,
    route: '/music',
  },
  {
    title: 'About',
    image: new URL('../assets/images/menu-card-about.png', import.meta.url).href,
    route: '/about',
  },
  {
    title: 'Tour',
    image: new URL('../assets/images/menu-card-tour.png', import.meta.url).href,
    route: '/tour',
  },
]

const deckLeadIndex = Math.floor(menuItems.length / 2)

// Component props
const props = withDefaults(
  defineProps<{
    socialLinks?: { instagram?: string; spotify?: string; youtube?: string }
  }>(),
  {
    socialLinks: () => ({}),
  }
)

const emit = defineEmits<{
  (e: 'logo-hover', hovered: boolean, x: number, y: number): void
  (e: 'logo-hide'): void
  (e: 'palette-change', payload: number[] | null): void
}>()

const handleLogoHover = (hovered: boolean) => {
  const instance = logoButtonRef.value
  if (!instance || typeof instance !== 'object' || !('rootEl' in instance)) return

  const element = instance.rootEl as HTMLElement | null
  if (!element) return

  const rect = element.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2

  emit('logo-hover', hovered, centerX, centerY)
}

const handleCardClick = (route: string) => {
  if (isAnimating.value) return

  // Find the clicked card index
  const cardIndex = menuItems.findIndex((item) => item.route === route)
  if (cardIndex === -1) return

  isAnimating.value = true
  selectedCard.value = cardIndex
  playCardSelection(cardIndex)
}

const handleLogoClick = () => {
  if (isAnimating.value || currentView.value !== 'logo') return
  isAnimating.value = true

  // Notify that logo will be hidden
  emit('logo-hide')

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
    visibility: hidden ? 'hidden' : 'visible',
  })
}

const setDeckMask = (cards: HTMLElement[], maskNonLead: boolean) => {
  cards.forEach((card, index) => {
    if (!card) return
    const hidden = maskNonLead && index !== deckLeadIndex
    setCardMaskState(card, hidden)
  })
}

const handleBackClick = () => {
  if (isAnimating.value || currentView.value !== 'content') return
  isAnimating.value = true
  playContentCloseAndCardsReturn()
}

const handleCardsBackClick = () => {
  if (isAnimating.value || currentView.value !== 'cards') return
  isAnimating.value = true
  playCardCloseAndLogoReappear()
}

const handleGlobalPointerDown = (event: PointerEvent) => {
  if (isAnimating.value) return
  if (currentView.value === 'logo') return

  const target = event.target as Node | null
  if (!target) return

  const clickedInsideCards = cardsContainerRef.value?.contains(target) ?? false
  const clickedInsideContent = contentPanelRef.value?.contains(target) ?? false
  const clickedBackButton = backButtonRef.value?.contains(target) ?? false
  const clickedMiniCard = miniCardRef.value?.contains(target) ?? false

  if (currentView.value === 'cards') {
    if (clickedInsideCards) return
    isAnimating.value = true
    playCardCloseAndLogoReappear()
  } else if (currentView.value === 'content') {
    if (clickedInsideContent || clickedBackButton || clickedMiniCard) return
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
    },
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
    ease: deckSpreadEase,
  })

  // Step 2: Logo close animation (360° rotation + scale shrink)
  tl.to(
    logoEl,
    {
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
      },
    },
    '-=0.2'
  )
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
    y: containerRect.height / 2,
  }

  const leadCard = cards[deckLeadIndex] ?? cards[0]
  if (!leadCard) {
    isAnimating.value = false
    return
  }

  const tl = gsap.timeline({
    onComplete: () => {
      cards.forEach((card) => {
        if (!card) return
        card.dataset.deckMasked = 'false'
        card.removeAttribute('aria-hidden')
        // Don't clear opacity as it defaults to 0 in CSS
        gsap.set(card, { clearProps: 'transform,visibility,zIndex' })
      })
      isAnimating.value = false
    },
  })

  // Calculate how far each card needs to move to reach the center
  const cardOffsets = cards.map((card) => {
    const rect = card.getBoundingClientRect()
    const cardCenterX = rect.left - containerRect.left + rect.width / 2
    const cardCenterY = rect.top - containerRect.top + rect.height / 2
    return {
      x: containerCenter.x - cardCenterX,
      y: containerCenter.y - cardCenterY,
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
      force3D: true,
    })
  })

  // Ensure all cards are visible for the "unified deck" effect
  setDeckMask(cards, false)

  // Phase 1: Grow from single point to full deck (all together, no stagger)
  tl.to(cards, {
    scale: 1,
    duration: 0.9,
    ease: deckGrowEase,
  })

  // Phase 2: Slide cards out from behind the lead card
  const spreadTl = gsap.timeline()
  cards.forEach((card, index) => {
    const distanceFromLead = Math.abs(index - deckLeadIndex)
    const staggerStart = distanceFromLead * 0.14
    const slideDuration = 0.85 + distanceFromLead * 0.1

    spreadTl.to(
      card,
      {
        x: 0,
        y: 0,
        ease: deckSpreadEase,
        duration: slideDuration,
      },
      staggerStart
    )
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
    y: containerRect.height / 2,
  }

  const tl = gsap.timeline({
    onComplete: () => {
      currentView.value = 'logo'
      nextTick(() => playLogoReappear())
    },
  })

  // Calculate offsets to move each card to center
  const cardOffsets = cards.map((card) => {
    const rect = card.getBoundingClientRect()
    const cardCenterX = rect.left - containerRect.left + rect.width / 2
    const cardCenterY = rect.top - containerRect.top + rect.height / 2
    return {
      x: containerCenter.x - cardCenterX,
      y: containerCenter.y - cardCenterY,
    }
  })

  // Phase 1: Gather cards to center (inverse of spread)
  // Apply per-card z-index immediately so stacking is deterministic (middle card on top)
  cards.forEach((card, i) => {
    const distance = Math.abs(i - deckLeadIndex)
    const z = i === deckLeadIndex ? 80 : 60 - distance
    gsap.set(card, { zIndex: z })
  })

  tl.to(cards, {
    x: (i: number) => cardOffsets[i]?.x || 0,
    y: (i: number) => cardOffsets[i]?.y || 0,
    rotation: 0,
    scale: 1,
    duration: 1.0,
    ease: deckGatherEase,
    stagger: {
      from: 'edges',
      amount: 0.2,
    },
    onComplete: () => setDeckMask(cards, true),
  })

  // Phase 2: Shrink to point with rotation (zoom-out + rotate)
  // Keep middle/lead card on top during the shrink
  gsap.set(leadCard, { zIndex: 120 })
  tl.to(cards, {
    scale: 0.01,
    rotation: (i: number) => 360 + (i - deckLeadIndex) * 22,
    opacity: 0,
    transformOrigin: 'center center',
    duration: 0.85,
    ease: deckGrowEase,
    stagger: {
      from: 'center',
      amount: 0.12,
    },
    onComplete: () => {
      cards.forEach((card) => {
        if (!card) return
        card.dataset.deckMasked = 'false'
        card.removeAttribute('aria-hidden')
        gsap.set(card, { clearProps: 'transform,opacity,visibility,zIndex' })
      })
    },
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
    opacity: 0,
  })

  const tl = gsap.timeline({
    onComplete: () => {
      isAnimating.value = false
      // Clear props to return to CSS positioning if needed,
      // but we want it to stay at bottom.
      // Since we animated 'y' back to 0 (relative to original position),
      // it should be fine.
      gsap.set(logoEl, { clearProps: 'transform,opacity' })
    },
  })

  // Step 1: Spiral in at center (Reverse of disappear)
  tl.to(logoEl, {
    rotation: 0,
    scale: 1,
    opacity: 1,
    duration: 0.8,
    ease: deckGrowEase,
    force3D: true,
  })

  // Step 2: Move back to bottom (original position)
  tl.to(logoEl, {
    y: 0,
    duration: 0.8,
    ease: deckSpreadEase,
    force3D: true,
  })
}

const playContentCloseAndCardsReturn = () => {
  const cards = getCardElements()
  const panel = contentPanelRef.value
  const backButton = backButtonRef.value
  const miniCard = miniCardRef.value
  const headerTitle = document.querySelector('.card-dealer__header-title') as HTMLElement
  const container = cardsContainerRef.value

  if (!container) return

  // We want the “gather to center” point to be the CENTER OF THE SCREEN (viewport),
  // not the center of the cards container (which is auto-sized and can be offset).
  const viewportCenter = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  }

  const getTargetXYToViewportCenter = (el: HTMLElement) => {
    const rect = el.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    // Current GSAP translate values (relative to the element’s original layout position).
    // We compute a viewport delta and add it to the current translate so the element ends up
    // at the viewport center regardless of parent/container coordinate space.
    const currentXRaw = (
      gsap as unknown as { getProperty?: (t: Element, p: string) => unknown }
    ).getProperty?.(el, 'x')
    const currentYRaw = (
      gsap as unknown as { getProperty?: (t: Element, p: string) => unknown }
    ).getProperty?.(el, 'y')

    const currentX =
      typeof currentXRaw === 'number' ? currentXRaw : parseFloat(String(currentXRaw || 0))
    const currentY =
      typeof currentYRaw === 'number' ? currentYRaw : parseFloat(String(currentYRaw || 0))

    const deltaX = viewportCenter.x - centerX
    const deltaY = viewportCenter.y - centerY

    return {
      x: currentX + deltaX,
      y: currentY + deltaY,
    }
  }

  const selectedIdx = selectedCard.value

  const tl = gsap.timeline({
    defaults: { ease: deckSpreadEase },
    onStart: () => {
      // Start background transition at the beginning
      transitionToCover(false)
      emit('palette-change', readParticlesPaletteFromCss('main'))
    },
    onComplete: () => {
      // Don't clear opacity as it defaults to 0 in CSS
      cards.forEach((card) =>
        gsap.set(card, { clearProps: 'transform,visibility,zIndex,borderRadius' })
      )
      selectedCard.value = null
      currentView.value = 'cards'
      isAnimating.value = false
    },
  })

  // Phase 1: Fade out content panel
  if (panel) {
    tl.to(
      panel,
      {
        opacity: 0,
        y: 30,
        duration: 0.3,
        ease: panelEase,
      },
      0
    )
  }

  // Phase 2: Fade out header elements (back button, avatar, title) in sync
  if (backButton) {
    tl.to(
      backButton,
      {
        opacity: 0,
        scale: 0.8,
        duration: 0.3,
      },
      0.2
    )
  }

  if (miniCard) {
    tl.to(
      miniCard,
      {
        opacity: 0,
        scale: 0.8,
        duration: 0.3,
      },
      0.2
    )
  }

  if (headerTitle) {
    tl.to(
      headerTitle,
      {
        opacity: 0,
        x: -20,
        duration: 0.3,
      },
      0.2
    )
  }

  // Phase 3: Make selected card visible and animate to center
  // Important: do NOT clear transforms here.
  // In the content-open animation the selected card is left transformed at the avatar position.
  // Clearing transform before using the precomputed offsets causes the card to animate from the
  // wrong baseline and shoot off-screen (often bottom-right).
  if (selectedIdx !== null && cards[selectedIdx]) {
    const selectedCardEl = cards[selectedIdx]

    if (selectedCardEl) {
      // Use a 0-duration tween instead of tl.set for test-mock compatibility.
      tl.to(
        selectedCardEl,
        {
          opacity: 1,
          zIndex: 50,
          duration: 0,
        },
        0.4
      )
    }
  }

  // Compute per-card targets to gather at the viewport center.
  const cardTargetsToCenter = cards.map((card) => getTargetXYToViewportCenter(card))

  // Animate selected card to center
  if (selectedIdx !== null && cards[selectedIdx]) {
    const selectedCard = cards[selectedIdx]
    const target = cardTargetsToCenter[selectedIdx]

    if (selectedCard && target) {
      tl.to(
        selectedCard,
        {
          x: target.x,
          y: target.y,
          scale: 1,
          rotation: 0,
          duration: 0.5,
        },
        0.5
      )
    }
  }

  // Phase 4: Set other cards at center position
  cards.forEach((card, index) => {
    if (index !== selectedIdx) {
      const target = cardTargetsToCenter[index]
      if (!target) return

      // Use a 0-duration tween instead of tl.set for test-mock compatibility.
      tl.to(
        card,
        {
          x: target.x,
          y: target.y,
          scale: 1,
          rotation: 0,
          opacity: 1,
          zIndex: 40,
          duration: 0,
        },
        0.9
      )
    }
  })

  // Phase 5: Distribute all cards from center to their grid positions
  const deckLeadIndex = Math.floor(cards.length / 2)
  cards.forEach((card, index) => {
    const distanceFromLead = Math.abs(index - deckLeadIndex)
    const staggerStart = 1.0 + distanceFromLead * 0.14
    const slideDuration = 0.7 + distanceFromLead * 0.1

    tl.to(
      card,
      {
        x: 0,
        y: 0,
        duration: slideDuration,
      },
      staggerStart
    )
  })
}

const playCardSelection = (cardIndex: number) => {
  const cards = getCardElements()
  if (cards.length === 0 || !cards[cardIndex]) {
    isAnimating.value = false
    return
  }

  // Get positions before changing view state
  const selectedCardEl = cards[cardIndex]
  if (!selectedCardEl) return

  const selectedCardRect = selectedCardEl.getBoundingClientRect()

  currentView.value = 'content'

  nextTick(() => {
    const panel = contentPanelRef.value
    const miniCard = miniCardRef.value
    const backButton = backButtonRef.value
    const headerTitle = document.querySelector('.card-dealer__header-title') as HTMLElement

    const tl = gsap.timeline({
      defaults: { ease: deckSpreadEase },
      onStart: () => {
        // Start background transition at the beginning
        const selectedItem = menuItems[cardIndex]
        if (selectedItem?.title === 'About') {
          const coverKey = (selectedItem.title || '').toString().toLowerCase().replace(/\s+/g, '-')
          transitionToCover(true, coverKey)

          emit('palette-change', readParticlesPaletteFromCss('cover'))
        } else {
          // Reset cover if any and emit main/home palette as RGB array
          transitionToCover(false)
          emit('palette-change', readParticlesPaletteFromCss('main'))
        }
      },
      onComplete: () => {
        isAnimating.value = false
      },
    })

    // Calculate avatar target position (in header)
    const targetX = 24 + 48 + 16 + 24 - selectedCardRect.left - selectedCardRect.width / 2
    const targetY = 50 - selectedCardRect.top - selectedCardRect.height / 2

    // Phase 1: Animate selected card to avatar position, hide others
    cards.forEach((card, index) => {
      if (index === cardIndex) {
        // Selected card: animate to avatar position
        tl.to(
          card,
          {
            x: targetX,
            y: targetY,
            scale: 0.18,
            rotation: 0,
            opacity: 1,
            duration: 0.6,
          },
          0
        )
      } else {
        // Hide other cards
        tl.to(
          card,
          {
            opacity: 0,
            scale: 0.8,
            duration: 0.5,
          },
          0
        )
      }
    })

    // Phase 2: Fade out selected card (now at avatar position) and fade in header elements in sync
    if (cards[cardIndex]) {
      tl.to(
        cards[cardIndex]!,
        {
          opacity: 0,
          duration: 0.3,
        },
        0.5
      )
    }

    // Animate in back button, avatar, and title together
    if (backButton) {
      tl.fromTo(
        backButton,
        { opacity: 0, scale: 0.8 },
        { opacity: 1, scale: 1, duration: 0.4 },
        0.5
      )
    }

    if (miniCard) {
      tl.fromTo(miniCard, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.4 }, 0.5)
    }

    if (headerTitle) {
      tl.fromTo(headerTitle, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.4 }, 0.5)
    }

    // Phase 3: Animate in content panel
    if (panel) {
      tl.fromTo(
        panel,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.5, ease: panelEase },
        0.7
      )
    }
  })
}

// Smoothly crossfade to the cover image (enter = true) or back to main (enter = false)
const transitionToCover = (enter: boolean, coverKey?: string) => {
  const cover = bgCoverRef.value
  if (!cover) return

  const styles = getComputedStyle(document.documentElement)
  const durationStr = styles.getPropertyValue('--bg-cover-transition-duration') || '1.6s'
  const duration = parseFloat(durationStr) || 1.6

  const dimEl = coverDimRef.value
  const mainBg = bgMainRef.value
  if (enter) {
    // Determine per-cover dim (overlay darkness) first; if set, prefer dim overlay
    const key = (coverKey || '').toString().toLowerCase().replace(/\s+/g, '-')
    const dimVar = key ? `--bg-cover-${key}-dim` : '--bg-cover-dim'
    let dim = parseFloat(styles.getPropertyValue(dimVar) || '')
    if (!Number.isFinite(dim)) dim = parseFloat(styles.getPropertyValue('--bg-cover-dim') || '')

    // Determine desired main background opacity while cover is active
    let mainOpacity = parseFloat(styles.getPropertyValue('--bg-main-opacity') || '')
    if (!Number.isFinite(mainOpacity)) mainOpacity = 1

    // Build a single timeline to animate cover, dim overlay, and main background in sync
    const tl = gsap.timeline()

    if (Number.isFinite(dim)) {
      // Show cover and dim overlay together
      gsap.set(cover, { opacity: 0, visibility: 'visible' })
      if (dimEl) gsap.set(dimEl, { opacity: 0, visibility: 'visible' })
      tl.to(cover, { opacity: 1, duration, ease: 'power2.inOut' }, 0)
      if (dimEl)
        tl.to(dimEl, { opacity: Math.max(0, Math.min(1, dim)), duration, ease: 'power2.inOut' }, 0)
      if (mainBg) tl.to(mainBg, { opacity: mainOpacity, duration, ease: 'power2.inOut' }, 0)
    } else {
      // Fallback: animate cover opacity (no dim available)
      const varName = key ? `--bg-cover-${key}-opacity` : '--bg-cover-target-opacity'
      let targetOpacity = parseFloat(styles.getPropertyValue(varName) || '')
      if (!Number.isFinite(targetOpacity)) {
        targetOpacity = parseFloat(styles.getPropertyValue('--bg-cover-target-opacity') || '1') || 1
      }
      gsap.set(cover, { opacity: 0, visibility: 'visible' })
      if (mainBg) gsap.set(mainBg, { opacity: 1, visibility: 'visible' })
      tl.to(cover, { opacity: targetOpacity, duration, ease: 'power2.inOut' }, 0)
      if (mainBg) tl.to(mainBg, { opacity: mainOpacity, duration, ease: 'power2.inOut' }, 0)
    }
  } else {
    // Animate dim overlay and cover out together
    const tl = gsap.timeline({
      onComplete: () => {
        if (dimEl) gsap.set(dimEl, { visibility: 'hidden' })
        gsap.set(cover, { visibility: 'hidden' })
        if (mainBg) gsap.set(mainBg, { opacity: 1 })
      },
    })
    if (dimEl) tl.to(dimEl, { opacity: 0, duration, ease: 'power2.inOut' }, 0)
    tl.to(cover, { opacity: 0, duration, ease: 'power2.inOut' }, 0)
    if (mainBg) tl.to(mainBg, { opacity: 1, duration, ease: 'power2.inOut' }, 0)
  }
}

// NOTE: color extraction from image removed. Palette should be declared
// in CSS variables (see `--bg-cover-particles-r/g/b` in `variables.css`).

onMounted(() => {
  window.addEventListener('pointerdown', handleGlobalPointerDown)

  // Preload cover image to ensure it loads properly
  const coverImg = new Image()
  coverImg.src = new URL('../assets/images/cover.png', import.meta.url).href
  coverImg.onload = () => {
    // Set the src on the actual element to ensure browser caches it
    if (bgCoverRef.value) {
      bgCoverRef.value.src = coverImg.src
    }
  }
  coverImg.onerror = () => {}
})

onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', handleGlobalPointerDown)
})
</script>

<template>
  <div :class="['card-dealer', { 'is-animating': isAnimating }]">
    <!-- Social links (top center) -->
    <div
      v-if="currentView !== 'content'"
      class="card-dealer__social"
      role="navigation"
      aria-label="Social links"
    >
      <a
        :href="props.socialLinks?.instagram || '#'"
        class="card-dealer__social-link"
        :class="{ 'card-dealer__social-link--disabled': !props.socialLinks?.instagram }"
        :aria-disabled="!props.socialLinks?.instagram"
        aria-label="Instagram"
        target="_blank"
        rel="noopener noreferrer"
      >
        <!-- Instagram (outline) -->
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          preserveAspectRatio="xMidYMid meet"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <rect
            x="3"
            y="3"
            width="18"
            height="18"
            rx="5"
            stroke="currentColor"
            stroke-width="1.6"
            fill="none"
          />
          <circle cx="12" cy="12" r="3.2" stroke="currentColor" stroke-width="1.6" fill="none" />
          <circle cx="17.5" cy="6.5" r="0.8" stroke="currentColor" stroke-width="1.6" fill="none" />
        </svg>
      </a>

      <a
        :href="props.socialLinks?.spotify || '#'"
        class="card-dealer__social-link"
        :class="{ 'card-dealer__social-link--disabled': !props.socialLinks?.spotify }"
        :aria-disabled="!props.socialLinks?.spotify"
        aria-label="Spotify"
        target="_blank"
        rel="noopener noreferrer"
      >
        <!-- Spotify (three stepped arcs: top thicker, middle slightly thinner, bottom thinnest) -->
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          preserveAspectRatio="xMidYMid meet"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6" fill="none" />
          <!-- Top arc: longest, thickest -->
          <path
            d="M6.2 9.1 C9.4 7.2 14.6 7.2 17.8 9.1"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            fill="none"
          />
          <!-- Middle arc: slightly shorter, medium thickness -->
          <path
            d="M6.6 11.8 C9.4 10.4 14.6 10.4 17.2 11.8"
            stroke="currentColor"
            stroke-width="1.4"
            stroke-linecap="round"
            fill="none"
          />
          <!-- Bottom arc: shortest, thinnest -->
          <path
            d="M7.4 14.7 C9.3 13.7 14.4 13.7 16.3 14.7"
            stroke="currentColor"
            stroke-width="1.3"
            stroke-linecap="round"
            fill="none"
          />
        </svg>
      </a>

      <a
        :href="props.socialLinks?.youtube || '#'"
        class="card-dealer__social-link"
        :class="{ 'card-dealer__social-link--disabled': !props.socialLinks?.youtube }"
        :aria-disabled="!props.socialLinks?.youtube"
        aria-label="YouTube"
        target="_blank"
        rel="noopener noreferrer"
      >
        <!-- YouTube (outline only) -->
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          preserveAspectRatio="xMidYMid meet"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <rect
            x="2"
            y="3"
            width="20"
            height="18"
            rx="3"
            stroke="currentColor"
            stroke-width="1.6"
            fill="none"
          />
          <polygon
            points="10,9 16,12 10,15"
            stroke="currentColor"
            stroke-width="1.4"
            stroke-linejoin="round"
            stroke-linecap="round"
            fill="none"
          />
        </svg>
      </a>
    </div>
    <div ref="bgRef" class="card-dealer__background">
      <img
        ref="bgMainRef"
        src="../assets/images/card-dealer-main.jpg"
        alt="Mysterious card dealer"
        class="card-dealer__bg-image card-dealer__bg-main"
      />
      <img
        ref="bgCoverRef"
        src="../assets/images/cover.png"
        alt="Cover"
        class="card-dealer__bg-image card-dealer__bg-cover"
        style="opacity: 0; visibility: hidden"
      />
      <div
        ref="coverDimRef"
        class="card-dealer__cover-dim"
        style="opacity: 0; visibility: hidden; pointer-events: none"
      ></div>
      <div class="card-dealer__overlay"></div>
    </div>

    <div class="card-dealer__content">
      <!-- Logo button (initial view) -->
      <div v-if="currentView === 'logo'" class="card-dealer__logo-button-wrapper">
        <LogoButton
          ref="logoButtonRef"
          :size="240"
          @click="handleLogoClick"
          @hover="handleLogoHover"
        />
      </div>

      <!-- Cards container (shown after logo click) -->
      <div
        v-show="currentView !== 'logo'"
        ref="cardsContainerRef"
        :class="[
          'card-dealer__cards',
          { 'card-dealer__cards--content': currentView === 'content' },
        ]"
      >
        <MenuCard
          v-for="(item, index) in menuItems"
          :key="item.route"
          :ref="(el) => setCardRef(el, index)"
          :title="item.title"
          :image="item.image"
          :route="item.route"
          :index="index"
          @click="handleCardClick"
          class="card-dealer__card"
        />
      </div>

      <!-- Header with back button and miniature card (shown in content view) -->
      <div v-if="currentView === 'content'" class="card-dealer__header">
        <div ref="backButtonRef" class="card-dealer__back-button" @click="handleBackClick">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M19 12H5M5 12L12 19M5 12L12 5"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
        <div ref="miniCardRef" class="card-dealer__mini-card-wrapper" :style="miniCardStyle">
          <!-- Circular avatar shows selected card image as background -->
        </div>
        <h2 v-if="selectedCard !== null" class="card-dealer__header-title">
          {{ menuItems[selectedCard]?.title }}
        </h2>
      </div>

      <!-- Back button for cards view -->
      <div v-if="currentView === 'cards'" class="card-dealer__cards-back-button-wrapper">
        <div class="card-dealer__back-button" @click="handleCardsBackClick">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M19 12H5M5 12L12 19M5 12L12 5"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
      </div>

      <!-- Content view (shown after card click) -->
      <div v-if="currentView === 'content'" class="card-dealer__content-view">
        <!-- Content overlay for transparency -->
        <div class="card-dealer__content-overlay"></div>

        <!-- Actual content -->
        <div ref="contentPanelRef" class="card-dealer__content-container">
          <!-- Music Player -->
          <div
            v-if="selectedCard !== null && menuItems[selectedCard]?.title === 'Music'"
            class="card-dealer__music-content"
          >
            <AudioPlayer />
          </div>

          <!-- Other content -->
          <div v-else class="card-dealer__generic-content">
            <p>
              Content for
              {{
                selectedCard !== null && selectedCard < menuItems.length
                  ? menuItems[selectedCard]?.title
                  : ''
              }}
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

.card-dealer__background {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.card-dealer__bg-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.card-dealer__bg-main {
  z-index: 0;
}

.card-dealer__bg-cover {
  z-index: 1;
}

.card-dealer__cover-dim {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 1);
  z-index: 2;
  pointer-events: none;
}

.card-dealer__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    var(--overlay-top) 0%,
    var(--overlay-middle) 50%,
    var(--overlay-bottom) 100%
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

.card-dealer__cards-back-button-wrapper {
  position: fixed;
  top: var(--spacing-lg);
  left: var(--spacing-lg);
  z-index: 99;
  pointer-events: auto;
}

/* Cards container: horizontal layout by default */
.card-dealer__cards {
  display: flex;
  gap: var(--spacing-lg, 28px);
  align-items: center;
  justify-content: center;
  /* size to content so clicks just outside the visible cards register as outside */
  width: auto;
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

/* Social links at top center */
.card-dealer__social {
  position: fixed;
  top: var(--spacing-lg, 18px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 12;
  display: flex;
  gap: 14px;
  align-items: center;
}

.card-dealer__social-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  opacity: 0.9;
  background: transparent;
  padding: 10px;
  border-radius: 10px;
  min-width: 44px;
  min-height: 44px;
  transition:
    color var(--transition-fast),
    transform var(--transition-fast),
    box-shadow var(--transition-fast);
}

.card-dealer__social-link:hover {
  color: var(--color-social-hover);
  opacity: 1;
  transform: translateY(-3px) scale(1.03);
  background: var(--color-social-hover-bg);
  box-shadow: var(--color-social-glow);
}

.card-dealer__social-link:focus-visible {
  outline: 2px solid var(--color-social-focus-outline);
  outline-offset: 2px;
}

.card-dealer__social-link--disabled {
  pointer-events: none;
  opacity: 0.5;
}

.card-dealer__header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 100px;
  z-index: 99;
  display: flex;
  align-items: center;
  padding: var(--spacing-lg);
  gap: var(--spacing-md);
  pointer-events: none;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0) 100%);
  backdrop-filter: blur(8px);
}

.card-dealer__back-button {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  border: 2px solid var(--color-primary);
  border-radius: 50%;
  color: var(--color-text);
  cursor: pointer;
  pointer-events: auto;
  flex-shrink: 0;
  transition:
    background var(--transition-fast),
    transform var(--transition-fast),
    border-color var(--transition-fast);
  backdrop-filter: blur(8px);
}

.card-dealer__back-button:hover {
  background: rgba(0, 0, 0, 0.7);
  border-color: var(--color-text);
  transform: scale(1.1);
}

.card-dealer__back-button svg {
  width: 24px;
  height: 24px;
}

.card-dealer__mini-card-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid var(--color-primary);
  background: rgba(0, 0, 0, 0.3);
  flex-shrink: 0;
  pointer-events: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  position: relative;
}

.card-dealer__header-title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  text-shadow: 2px 2px 8px rgba(0, 0, 0, 0.8);
  margin: 0;
  pointer-events: none;
  white-space: nowrap;
}

.card-dealer__content-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  z-index: 0;
}

.card-dealer__content-container {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-2xl);
  pointer-events: auto;
  overflow-y: auto;
}

.card-dealer__music-content {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 800px;
}

.card-dealer__generic-content {
  text-align: center;
  color: var(--color-text);
  font-size: var(--font-size-xl);
  max-width: 800px;
  width: 100%;
}

/* When a card is selected, show the content full-screen */
.card-dealer__content-view {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 100px;
  z-index: 4;
  pointer-events: none;
}

.card-dealer__cards--content {
  pointer-events: none;
}

.card-dealer__card {
  opacity: 1;
  position: relative;
  z-index: 4;
  flex-shrink: 0;
  backface-visibility: hidden;
  transform-style: preserve-3d;
  will-change: transform, opacity;
}

/* Disable CSS transitions on cards while JS/GSAP animations run to avoid conflicts */
.card-dealer.is-animating .menu-card,
.card-dealer.is-animating .card-dealer__card {
  transition: none !important;
}

/* Ensure hovered transform doesn't fight animations when animating */
.card-dealer.is-animating .menu-card--hovered {
  transform: none !important;
}

/* Tablet responsiveness */
@media (max-width: 1024px) {
  .card-dealer__content {
    gap: var(--spacing-2xl);
  }

  .card-dealer__cards {
    gap: var(--spacing-lg);
  }
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .card-dealer__content {
    gap: var(--spacing-xl);
    padding: var(--spacing-lg);
  }

  .card-dealer__cards {
    gap: var(--spacing-md);
  }

  .card-dealer__content-container {
    padding: var(--spacing-lg);
  }

  .card-dealer__content-view {
    padding-top: 100px;
  }

  .card-dealer__header {
    height: 80px;
    gap: var(--spacing-sm);
  }

  .card-dealer__back-button {
    width: 44px;
    height: 44px;
  }

  .card-dealer__mini-card-wrapper {
    width: 44px;
    height: 44px;
    border-width: 2px;
  }

  .card-dealer__header-title {
    font-size: var(--font-size-xl);
  }

  .card-dealer__generic-content {
    font-size: var(--font-size-lg);
  }
}

/* Small mobile devices */
@media (max-width: 480px) {
  .card-dealer__cards {
    flex-direction: column;
  }
}
</style>
