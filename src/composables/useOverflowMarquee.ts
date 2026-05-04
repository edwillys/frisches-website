import { onMounted, onUnmounted, ref, watch, type Ref } from 'vue'

interface UseOverflowMarqueeOptions {
  distanceVarName?: string
  overflowThresholdPx?: number
}

export const useOverflowMarquee = (
  containerRef: Ref<HTMLElement | null>,
  options: UseOverflowMarqueeOptions = {}
) => {
  const { distanceVarName = '--marquee-distance', overflowThresholdPx = 1 } = options

  const isOverflowing = ref(false)
  let resizeObserver: ResizeObserver | null = null
  let rafMeasureId = 0
  let windowResizeHandler: (() => void) | null = null

  const getMeasureTarget = (container: HTMLElement) =>
    container.querySelector<HTMLElement>('[data-marquee-text]') ?? container.firstElementChild

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
      resizeObserver?.disconnect()
      resizeObserver = new ResizeObserver(() => {
        scheduleOverflowUpdate()
      })

      if (containerRef.value) {
        resizeObserver.observe(containerRef.value)
      }
    }

    windowResizeHandler = () => {
      scheduleOverflowUpdate()
    }
    window.addEventListener('resize', windowResizeHandler, { passive: true })
    window.addEventListener('orientationchange', windowResizeHandler, { passive: true })
  })

  onUnmounted(() => {
    if (rafMeasureId) {
      window.cancelAnimationFrame(rafMeasureId)
      rafMeasureId = 0
    }

    resizeObserver?.disconnect()
    resizeObserver = null

    if (windowResizeHandler) {
      window.removeEventListener('resize', windowResizeHandler)
      window.removeEventListener('orientationchange', windowResizeHandler)
      windowResizeHandler = null
    }
  })

  watch(containerRef, () => {
    scheduleOverflowUpdate()
  })

  return {
    isOverflowing,
    updateOverflow,
    scheduleOverflowUpdate,
  }
}
