import { onMounted, onUnmounted } from 'vue'

/**
 * Half-width of the CSS border triangle.
 * Must equal the `border` value in the `.vp-tooltip-arrow` CSS rule (currently 8px).
 */
const ARROW_SIZE = 8
/** Minimum distance from any viewport edge. */
const MARGIN = 8
/**
 * Minimum inset from the tooltip's rounded corners for the arrow tip.
 * Should stay below the tooltip's border-radius (currently 8px in tooltip.css).
 */
const MIN_ARROW_INSET = 6

export function useViewportTooltip() {
  let tip: HTMLDivElement | null = null
  let arrow: HTMLDivElement | null = null
  let activeTarget: HTMLElement | null = null

  function ensureElements() {
    if (!tip) {
      tip = document.createElement('div')
      tip.className = 'vp-tooltip'
      tip.setAttribute('aria-hidden', 'true')
      tip.style.display = 'none'
      document.body.appendChild(tip)
    }
    if (!arrow) {
      arrow = document.createElement('div')
      arrow.className = 'vp-tooltip-arrow'
      arrow.style.display = 'none'
      document.body.appendChild(arrow)
    }
  }

  function hide() {
    if (tip) tip.style.display = 'none'
    if (arrow) arrow.style.display = 'none'
    activeTarget = null
  }

  function show(target: HTMLElement) {
    const text = target.dataset.tooltip
    if (!text) return
    if (target.classList.contains('tooltip-suppressed')) return
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

    ensureElements()

    tip!.textContent = text

    // Temporarily show off-screen (visibility:hidden) to measure dimensions
    tip!.style.visibility = 'hidden'
    tip!.style.display = 'block'
    tip!.style.top = '0'
    tip!.style.left = '0'

    // Reset animations so they replay when switching between tooltip targets
    // (elements stay display:block between targets, so the animation won't retrigger otherwise)
    tip!.style.animation = 'none'
    arrow!.style.animation = 'none'
    void tip!.offsetHeight // force reflow to apply animation:none before restoring
    tip!.style.animation = ''
    arrow!.style.animation = ''

    const tRect = tip!.getBoundingClientRect()
    const eRect = target.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight

    // Horizontal: center on the target element, then clamp inside viewport
    let left = eRect.left + eRect.width / 2 - tRect.width / 2
    left = Math.max(MARGIN, Math.min(left, vw - tRect.width - MARGIN))

    // Vertical: prefer above, fall back to below, clamp if neither fits cleanly
    const tipH = tRect.height
    const above = eRect.top - ARROW_SIZE - tipH - MARGIN >= 0
    const belowFits = eRect.bottom + ARROW_SIZE + tipH + MARGIN <= vh
    const top = above
      ? eRect.top - ARROW_SIZE - tipH
      : belowFits
        ? eRect.bottom + ARROW_SIZE
        : vh - tipH - MARGIN

    tip!.style.left = `${left}px`
    tip!.style.top = `${top}px`
    tip!.style.visibility = 'visible'

    // Read the background from the live computed style so arrow color stays in sync with CSS
    const bg = getComputedStyle(tip!).backgroundColor

    // Arrow: centered on the target element, clamped within tooltip bounds
    // Arrow total width = ARROW_SIZE * 2 (both left+right borders)
    const arrowW = ARROW_SIZE * 2
    const idealArrowLeft = eRect.left + eRect.width / 2 - ARROW_SIZE
    const arrowLeft = Math.max(
      left + MIN_ARROW_INSET,
      Math.min(idealArrowLeft, left + tRect.width - MIN_ARROW_INSET - arrowW)
    )

    arrow!.style.display = 'block'
    arrow!.style.left = `${arrowLeft}px`
    arrow!.style.top = above ? `${eRect.top - ARROW_SIZE}px` : `${eRect.bottom}px`
    arrow!.style.borderTopColor = above ? bg : 'transparent'
    arrow!.style.borderBottomColor = above ? 'transparent' : bg
    arrow!.style.borderLeftColor = 'transparent'
    arrow!.style.borderRightColor = 'transparent'
    arrow!.style.visibility = 'visible'
  }

  function findTarget(node: EventTarget | null): HTMLElement | null {
    if (!node) return null
    return (node as HTMLElement).closest?.(
      '[data-tooltip]:not([data-tooltip=""])'
    ) as HTMLElement | null
  }

  function onMouseOver(e: MouseEvent) {
    const target = findTarget(e.target)
    if (!target) {
      if (activeTarget) hide()
      return
    }
    if (target === activeTarget) return
    activeTarget = target
    show(target)
  }

  function onMouseOut(e: MouseEvent) {
    const target = findTarget(e.target)
    if (!target || target !== activeTarget) return
    // Still inside the element (moving between child nodes) — keep showing
    if (e.relatedTarget && (target as HTMLElement).contains(e.relatedTarget as Node)) return
    hide()
  }

  // Hide on scroll or click (scroll changes element position; click triggers suppression)
  function onScroll() {
    hide()
  }
  function onClick() {
    hide()
  }

  onMounted(() => {
    document.addEventListener('mouseover', onMouseOver, { passive: true })
    document.addEventListener('mouseout', onMouseOut, { passive: true })
    document.addEventListener('scroll', onScroll, { passive: true, capture: true })
    document.addEventListener('click', onClick, { passive: true })
  })

  onUnmounted(() => {
    document.removeEventListener('mouseover', onMouseOver)
    document.removeEventListener('mouseout', onMouseOut)
    document.removeEventListener('scroll', onScroll, { capture: true } as EventListenerOptions)
    document.removeEventListener('click', onClick)
    tip?.remove()
    arrow?.remove()
    tip = null
    arrow = null
  })
}
