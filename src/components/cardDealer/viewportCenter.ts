import gsap from 'gsap'

export type Point = {
  x: number
  y: number
}

export const getViewportCenter = (): Point => ({
  x: window.innerWidth / 2,
  y: window.innerHeight / 2,
})

const toNumber = (raw: unknown): number => {
  if (typeof raw === 'number') return raw
  const parsed = parseFloat(String(raw ?? 0))
  return Number.isFinite(parsed) ? parsed : 0
}

// Computes the (x,y) GSAP translate values needed to move an element to the viewport center.
// It adds the viewport delta to the element's current translate so this works regardless of
// parent/container coordinate space.
export const getTargetXYToViewportCenter = (el: HTMLElement, viewportCenter: Point): Point => {
  const rect = el.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2

  const currentXRaw = (
    gsap as unknown as { getProperty?: (t: Element, p: string) => unknown }
  ).getProperty?.(el, 'x')
  const currentYRaw = (
    gsap as unknown as { getProperty?: (t: Element, p: string) => unknown }
  ).getProperty?.(el, 'y')

  const currentX = toNumber(currentXRaw)
  const currentY = toNumber(currentYRaw)

  const deltaX = viewportCenter.x - centerX
  const deltaY = viewportCenter.y - centerY

  return {
    x: currentX + deltaX,
    y: currentY + deltaY,
  }
}
