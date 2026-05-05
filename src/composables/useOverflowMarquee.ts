import { onMounted, onUnmounted, ref, watch, type Ref } from 'vue'

interface UseOverflowMarqueeOptions {
  distanceVarName?: string
  overflowThresholdPx?: number
}

const windowOverflowSubscribers = new Set<() => void>()

const notifyWindowOverflowSubscribers = () => {
  windowOverflowSubscribers.forEach((callback) => {
    callback()
  })
}

const addWindowOverflowSubscriber = (callback: () => void) => {
  if (typeof window === 'undefined') return

  if (windowOverflowSubscribers.size === 0) {
    window.addEventListener('resize', notifyWindowOverflowSubscribers, { passive: true })
    window.addEventListener('orientationchange', notifyWindowOverflowSubscribers, {
      passive: true,
    })
  }

  windowOverflowSubscribers.add(callback)
}

const removeWindowOverflowSubscriber = (callback: () => void) => {
  if (typeof window === 'undefined') return

  windowOverflowSubscribers.delete(callback)

  if (windowOverflowSubscribers.size === 0) {
    window.removeEventListener('resize', notifyWindowOverflowSubscribers)
    window.removeEventListener('orientationchange', notifyWindowOverflowSubscribers)
  }
}

export const useOverflowMarquee = (
  containerRef: Ref<HTMLElement | null>,
  options: UseOverflowMarqueeOptions = {}
) => {
  const { distanceVarName = '--marquee-distance', overflowThresholdPx = 1 } = options

  const isOverflowing = ref(false)
  let resizeObserver: ResizeObserver | null = null
  let rafMeasureId = 0

  const getMeasureTarget = (container: HTMLElement) =>
    container.querySelector<HTMLElement>('[data-marquee-text]') ?? container.firstElementChild

  const observeContainer = () => {
    if (!resizeObserver) return

    resizeObserver.disconnect()

    if (containerRef.value) {
      resizeObserver.observe(containerRef.value)
    }
  }

  const updateOverflow = () => {
    const container = containerRef.value
    if (!container) return

    const target = getMeasureTarget(container)
    if (!(target instanceof HTMLElement)) return

    const overflow = target.scrollWidth > container.clientWidth + overflowThresholdPx
    isOverflowing.value = overflow

    const distance = Math.max(0, target.scrollWidth - container.clientWidth)
    container.style.setProperty(distanceVarName, `${distance}px`)
  }

  const scheduleOverflowUpdate = () => {
    if (rafMeasureId) return

    rafMeasureId = window.requestAnimationFrame(() => {
      rafMeasureId = 0
      updateOverflow()
    })
  }

  onMounted(() => {
    scheduleOverflowUpdate()

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        scheduleOverflowUpdate()
      })
      observeContainer()
    }

    addWindowOverflowSubscriber(scheduleOverflowUpdate)
  })

  onUnmounted(() => {
    if (rafMeasureId) {
      window.cancelAnimationFrame(rafMeasureId)
      rafMeasureId = 0
    }

    resizeObserver?.disconnect()
    resizeObserver = null

    removeWindowOverflowSubscriber(scheduleOverflowUpdate)
  })

  watch(containerRef, () => {
    observeContainer()
    scheduleOverflowUpdate()
  })

  return {
    isOverflowing,
    updateOverflow,
    scheduleOverflowUpdate,
  }
}
