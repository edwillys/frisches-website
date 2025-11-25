import { onMounted, onUnmounted, type Ref } from 'vue'
import gsap from 'gsap'

/**
 * Composable for managing GSAP animations with automatic cleanup
 * @param animationFn - Function containing GSAP animation code
 * @returns cleanup function
 */
export function useGSAP(animationFn: () => void) {
  let ctx: gsap.Context | null = null

  onMounted(() => {
    ctx = gsap.context(() => {
      animationFn()
    })
  })

  onUnmounted(() => {
    ctx?.revert()
  })

  return {
    context: ctx,
  }
}

/**
 * Card dealing animation sequence
 * @param cards - Array of card element refs
 * @param options - Animation options
 */
export function useCardDealAnimation(
  cards: Ref<HTMLElement[]>,
  options: {
    stagger?: number
    duration?: number
    delay?: number
  } = {}
) {
  const { stagger = 0.15, duration = 0.8, delay = 0.5 } = options

  useGSAP(() => {
    if (!cards.value || cards.value.length === 0) return

    // Initial state
    gsap.set(cards.value, {
      opacity: 0,
      y: 100,
      rotation: -15,
      scale: 0.8,
    })

    // Deal cards animation
    gsap.to(cards.value, {
      opacity: 1,
      y: 0,
      rotation: 0,
      scale: 1,
      duration,
      stagger,
      delay,
      ease: 'back.out(1.4)',
    })
  })
}

/**
 * Card hover animation with GSAP
 * @param cardElement - Card element ref
 */
export function useCardHoverAnimation(cardElement: Ref<HTMLElement | null>) {
  let hoverTween: gsap.core.Tween | null = null

  const onMouseEnter = () => {
    if (!cardElement.value) return

    hoverTween = gsap.to(cardElement.value, {
      y: -10,
      scale: 1.05,
      rotation: 2,
      duration: 0.3,
      ease: 'power2.out',
    })
  }

  const onMouseLeave = () => {
    if (!cardElement.value) return

    hoverTween?.kill()
    gsap.to(cardElement.value, {
      y: 0,
      scale: 1,
      rotation: 0,
      duration: 0.3,
      ease: 'power2.out',
    })
  }

  onUnmounted(() => {
    hoverTween?.kill()
  })

  return {
    onMouseEnter,
    onMouseLeave,
  }
}

/**
 * Responsive GSAP animations based on screen size
 * @param animations - Object with breakpoint-specific animations
 */
export function useResponsiveGSAP(animations: {
  mobile?: () => void
  tablet?: () => void
  desktop?: () => void
}) {
  useGSAP(() => {
    const mm = gsap.matchMedia()

    mm.add(
      {
        mobile: '(max-width: 767px)',
        tablet: '(min-width: 768px) and (max-width: 1023px)',
        desktop: '(min-width: 1024px)',
      },
      (context) => {
        const { mobile, tablet, desktop } = context.conditions as {
          mobile: boolean
          tablet: boolean
          desktop: boolean
        }

        if (mobile && animations.mobile) {
          animations.mobile()
        } else if (tablet && animations.tablet) {
          animations.tablet()
        } else if (desktop && animations.desktop) {
          animations.desktop()
        }
      }
    )
  })
}

/**
 * Fade in animation for elements
 * @param element - Element ref
 * @param options - Animation options
 */
export function useFadeIn(
  element: Ref<HTMLElement | null>,
  options: {
    duration?: number
    delay?: number
    y?: number
  } = {}
) {
  const { duration = 1, delay = 0, y = 30 } = options

  useGSAP(() => {
    if (!element.value) return

    gsap.from(element.value, {
      opacity: 0,
      y,
      duration,
      delay,
      ease: 'power2.out',
    })
  })
}
