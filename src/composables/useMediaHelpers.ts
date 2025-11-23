import { ref, onMounted, onUnmounted, type Ref } from 'vue'

/**
 * Composable for lazy loading media with Intersection Observer
 * @param elementRef - Reference to the element to observe
 * @param options - Intersection Observer options
 */
export function useLazyLoad(
  elementRef: Ref<HTMLElement | null>,
  options: IntersectionObserverInit = {}
) {
  const isVisible = ref(false)
  const hasLoaded = ref(false)
  let observer: IntersectionObserver | null = null

  const defaultOptions: IntersectionObserverInit = {
    root: null,
    rootMargin: '50px',
    threshold: 0.1,
    ...options
  }

  onMounted(() => {
    if (!elementRef.value) return

    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !hasLoaded.value) {
          isVisible.value = true
          hasLoaded.value = true
          // Disconnect after first load to save resources
          observer?.disconnect()
        }
      })
    }, defaultOptions)

    observer.observe(elementRef.value)
  })

  onUnmounted(() => {
    observer?.disconnect()
  })

  return {
    isVisible,
    hasLoaded
  }
}

/**
 * Composable for detecting media queries (mobile, tablet, desktop)
 */
export function useMediaQuery() {
  const isMobile = ref(false)
  const isTablet = ref(false)
  const isDesktop = ref(false)

  const mobileQuery = window.matchMedia('(max-width: 767px)')
  const tabletQuery = window.matchMedia('(min-width: 768px) and (max-width: 1023px)')
  const desktopQuery = window.matchMedia('(min-width: 1024px)')

  const updateMatches = () => {
    isMobile.value = mobileQuery.matches
    isTablet.value = tabletQuery.matches
    isDesktop.value = desktopQuery.matches
  }

  onMounted(() => {
    updateMatches()

    // Add listeners for changes
    mobileQuery.addEventListener('change', updateMatches)
    tabletQuery.addEventListener('change', updateMatches)
    desktopQuery.addEventListener('change', updateMatches)
  })

  onUnmounted(() => {
    mobileQuery.removeEventListener('change', updateMatches)
    tabletQuery.removeEventListener('change', updateMatches)
    desktopQuery.removeEventListener('change', updateMatches)
  })

  return {
    isMobile,
    isTablet,
    isDesktop
  }
}

/**
 * Composable for detecting reduced motion preference
 */
export function useReducedMotion() {
  const prefersReducedMotion = ref(false)

  const query = window.matchMedia('(prefers-reduced-motion: reduce)')

  const updatePreference = () => {
    prefersReducedMotion.value = query.matches
  }

  onMounted(() => {
    updatePreference()
    query.addEventListener('change', updatePreference)
  })

  onUnmounted(() => {
    query.removeEventListener('change', updatePreference)
  })

  return {
    prefersReducedMotion
  }
}

/**
 * Composable for touch device detection
 */
export function useTouchDevice() {
  const isTouchDevice = ref(false)

  onMounted(() => {
    isTouchDevice.value =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      // @ts-expect-error - MS specific
      navigator.msMaxTouchPoints > 0
  })

  return {
    isTouchDevice
  }
}
