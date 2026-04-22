import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { useViewportTooltip } from '../useViewportTooltip'

// ─── Mounting helper ────────────────────────────────────────────────────────

type Wrapper = ReturnType<typeof mount>

function mountComposable(): Wrapper {
  const Comp = defineComponent({
    setup() {
      useViewportTooltip()
    },
    template: '<div />',
  })
  return mount(Comp, { attachTo: document.body })
}

// ─── Event helpers ───────────────────────────────────────────────────────────

function mouseOver(target: HTMLElement, relatedTarget?: HTMLElement) {
  target.dispatchEvent(
    new MouseEvent('mouseover', { bubbles: true, relatedTarget: relatedTarget ?? null })
  )
}

function mouseOut(target: HTMLElement, relatedTarget?: HTMLElement) {
  target.dispatchEvent(
    new MouseEvent('mouseout', { bubbles: true, relatedTarget: relatedTarget ?? null })
  )
}

// ─── matchMedia helpers ──────────────────────────────────────────────────────

function setHoverDevice(enabled: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockReturnValue({ matches: enabled }),
  })
}

// ─── Tooltip element selectors ───────────────────────────────────────────────

function getTip(): HTMLElement | null {
  return document.querySelector('.vp-tooltip')
}

function getArrow(): HTMLElement | null {
  return document.querySelector('.vp-tooltip-arrow')
}

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('useViewportTooltip', () => {
  let wrapper: Wrapper

  beforeEach(() => {
    setHoverDevice(true)
    wrapper = mountComposable()
  })

  afterEach(() => {
    wrapper.unmount()
    document.querySelectorAll('.vp-tooltip, .vp-tooltip-arrow').forEach((el) => el.remove())
    vi.restoreAllMocks()
  })

  // ── Show / hide ─────────────────────────────────────────────────────────────

  describe('show and hide', () => {
    it('shows the tooltip with the correct text on hover', () => {
      const btn = document.createElement('button')
      btn.dataset.tooltip = 'Save file'
      document.body.appendChild(btn)

      mouseOver(btn)

      const tip = getTip()
      expect(tip).not.toBeNull()
      expect(tip!.textContent).toBe('Save file')
      expect(tip!.style.display).toBe('block')

      btn.remove()
    })

    it('hides the tooltip when the mouse leaves the element', () => {
      const btn = document.createElement('button')
      btn.dataset.tooltip = 'Delete'
      document.body.appendChild(btn)

      mouseOver(btn)
      mouseOut(btn)

      expect(getTip()!.style.display).toBe('none')

      btn.remove()
    })

    it('keeps the tooltip visible when moving between child nodes', () => {
      const btn = document.createElement('button')
      btn.dataset.tooltip = 'Parent'
      const child = document.createElement('span')
      btn.appendChild(child)
      document.body.appendChild(btn)

      mouseOver(btn)
      // relatedTarget is a child — should NOT hide
      mouseOut(btn, child)

      expect(getTip()!.style.display).toBe('block')

      btn.remove()
    })

    it('hides the tooltip on scroll', () => {
      const btn = document.createElement('button')
      btn.dataset.tooltip = 'Scrolled away'
      document.body.appendChild(btn)

      mouseOver(btn)
      document.dispatchEvent(new Event('scroll', { bubbles: true }))

      expect(getTip()!.style.display).toBe('none')

      btn.remove()
    })

    it('hides the tooltip on click', () => {
      const btn = document.createElement('button')
      btn.dataset.tooltip = 'Clicked'
      document.body.appendChild(btn)

      mouseOver(btn)
      document.dispatchEvent(new Event('click'))

      expect(getTip()!.style.display).toBe('none')

      btn.remove()
    })
  })

  // ── Suppression ─────────────────────────────────────────────────────────────

  describe('suppression', () => {
    it('does not show the tooltip when the element has tooltip-suppressed', () => {
      const btn = document.createElement('button')
      btn.dataset.tooltip = 'Hidden'
      btn.classList.add('tooltip-suppressed')
      document.body.appendChild(btn)

      mouseOver(btn)

      expect(getTip()).toBeNull()

      btn.remove()
    })

    it('does not show the tooltip on non-hover (touch) devices', () => {
      setHoverDevice(false)

      const btn = document.createElement('button')
      btn.dataset.tooltip = 'Touch only'
      document.body.appendChild(btn)

      mouseOver(btn)

      expect(getTip()).toBeNull()

      btn.remove()
    })

    it('ignores elements with an empty data-tooltip attribute', () => {
      const btn = document.createElement('button')
      btn.dataset.tooltip = ''
      document.body.appendChild(btn)

      mouseOver(btn)

      expect(getTip()).toBeNull()

      btn.remove()
    })
  })

  // ── Vertical placement ──────────────────────────────────────────────────────

  describe('vertical placement', () => {
    // ARROW_SIZE = 8, MARGIN = 8; tip height is 0 in jsdom (no layout engine)
    // above condition: eRect.top - 8 - tipH - 8 >= 0

    afterEach(() => {
      document.querySelectorAll('button').forEach((b) => b.remove())
    })

    function positionedBtn(rect: Partial<DOMRect>): HTMLElement {
      const btn = document.createElement('button')
      btn.dataset.tooltip = 'Tip'
      vi.spyOn(btn, 'getBoundingClientRect').mockReturnValue({
        top: 0,
        bottom: 0,
        left: 200,
        right: 300,
        width: 100,
        height: 40,
        x: 200,
        y: 0,
        toJSON: () => {},
        ...rect,
      } as DOMRect)
      document.body.appendChild(btn)
      return btn
    }

    it('places the tooltip above when there is room above the element', () => {
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 800,
      })
      const btn = positionedBtn({ top: 200, bottom: 240 })

      mouseOver(btn)

      // top = eRect.top - ARROW_SIZE - tipH = 200 - 8 - 0 = 192
      expect(parseInt(getTip()!.style.top)).toBe(192)
    })

    it('places the tooltip below when there is not enough room above', () => {
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 800,
      })
      const btn = positionedBtn({ top: 10, bottom: 50 })

      mouseOver(btn)

      // top = eRect.bottom + ARROW_SIZE = 50 + 8 = 58
      expect(parseInt(getTip()!.style.top)).toBe(58)
    })

    it('clamps the tooltip to the bottom of the viewport when neither above nor below fits', () => {
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 60,
      })
      // top=5: above fails (5-8-0-8 < 0). belowFits: 55+8+0+8=71 > 60 → fails.
      const btn = positionedBtn({ top: 5, bottom: 55 })

      mouseOver(btn)

      // top = vh - tipH - MARGIN = 60 - 0 - 8 = 52
      expect(parseInt(getTip()!.style.top)).toBe(52)
    })

    it('sets the arrow above the element when positioned above', () => {
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 800,
      })
      const btn = positionedBtn({ top: 200, bottom: 240 })

      mouseOver(btn)

      // arrow.top = eRect.top - ARROW_SIZE = 200 - 8 = 192
      expect(parseInt(getArrow()!.style.top)).toBe(192)
    })

    it('sets the arrow below the element when positioned below', () => {
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 800,
      })
      const btn = positionedBtn({ top: 10, bottom: 50 })

      mouseOver(btn)

      // arrow.top = eRect.bottom = 50
      expect(parseInt(getArrow()!.style.top)).toBe(50)
    })
  })

  // ── Horizontal clamping ─────────────────────────────────────────────────────

  describe('horizontal clamping', () => {
    afterEach(() => {
      document.querySelectorAll('button').forEach((b) => b.remove())
    })

    it('does not let the tooltip left edge go below the MARGIN', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 400,
      })
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 800,
      })

      const btn = document.createElement('button')
      btn.dataset.tooltip = 'Near left'
      // Element far to the left — centered tooltip would be negative
      vi.spyOn(btn, 'getBoundingClientRect').mockReturnValue({
        top: 200,
        bottom: 240,
        left: 0,
        right: 10,
        width: 10,
        height: 40,
        x: 0,
        y: 200,
        toJSON: () => {},
      } as DOMRect)
      document.body.appendChild(btn)

      mouseOver(btn)

      expect(parseInt(getTip()!.style.left)).toBeGreaterThanOrEqual(8)
    })

    it('does not let the tooltip right edge exceed (viewport - MARGIN)', () => {
      const vw = 300
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: vw })
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 800,
      })

      const btn = document.createElement('button')
      btn.dataset.tooltip = 'Near right'
      vi.spyOn(btn, 'getBoundingClientRect').mockReturnValue({
        top: 200,
        bottom: 240,
        left: 280,
        right: 300,
        width: 20,
        height: 40,
        x: 280,
        y: 200,
        toJSON: () => {},
      } as DOMRect)
      document.body.appendChild(btn)

      mouseOver(btn)

      const tip = getTip()!
      // tip width is 0 in jsdom, so right edge = left + 0 = left
      expect(parseInt(tip.style.left)).toBeLessThanOrEqual(vw - 8)
    })
  })

  // ── Cleanup ─────────────────────────────────────────────────────────────────

  describe('cleanup on unmount', () => {
    it('removes the tooltip and arrow elements from the DOM', () => {
      const btn = document.createElement('button')
      btn.dataset.tooltip = 'Will be removed'
      document.body.appendChild(btn)

      mouseOver(btn)
      expect(getTip()).not.toBeNull()
      expect(getArrow()).not.toBeNull()

      wrapper.unmount()

      expect(getTip()).toBeNull()
      expect(getArrow()).toBeNull()

      btn.remove()
    })

    it('no longer shows a tooltip after unmounting', () => {
      wrapper.unmount()

      const btn = document.createElement('button')
      btn.dataset.tooltip = 'After unmount'
      document.body.appendChild(btn)

      mouseOver(btn)

      expect(getTip()).toBeNull()

      btn.remove()
      // Prevent afterEach from calling unmount again
      wrapper = mountComposable()
      wrapper.unmount()
    })
  })
})
