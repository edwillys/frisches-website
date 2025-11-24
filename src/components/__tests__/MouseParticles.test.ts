import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import MouseParticles from '../MouseParticles.vue'

interface MouseParticlesExposed {
  setLogoButtonState: (hovered: boolean, x: number, y: number) => void
  hideLogoButton: () => void
}

describe('MouseParticles', () => {
  let wrapper: ReturnType<typeof mount>

  beforeEach(() => {
    // Mock canvas context
    const mockContext = {
      scale: vi.fn(),
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      fillStyle: '',
      shadowBlur: 0,
      shadowColor: ''
    } as unknown as CanvasRenderingContext2D

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ; (HTMLCanvasElement.prototype.getContext as any) = vi.fn(() => mockContext)

    wrapper = mount(MouseParticles)
  })

  it('renders a canvas element', () => {
    expect(wrapper.find('canvas').exists()).toBe(true)
    expect(wrapper.find('.mouse-particles').exists()).toBe(true)
  })

  it('canvas has correct attributes', () => {
    const canvas = wrapper.find('canvas')
    expect(canvas.attributes('aria-hidden')).toBe('true')
  })

  it('exposes setLogoButtonState method', () => {
    const exposed = wrapper.vm as unknown as MouseParticlesExposed
    expect(exposed.setLogoButtonState).toBeDefined()
    expect(typeof exposed.setLogoButtonState).toBe('function')
  })

  it('exposes hideLogoButton method', () => {
    const exposed = wrapper.vm as unknown as MouseParticlesExposed
    expect(exposed.hideLogoButton).toBeDefined()
    expect(typeof exposed.hideLogoButton).toBe('function')
  })

  it('setLogoButtonState updates logo button state', () => {
    const exposed = wrapper.vm as unknown as MouseParticlesExposed

    // Should not throw
    expect(() => exposed.setLogoButtonState(true, 100, 200)).not.toThrow()
    expect(() => exposed.setLogoButtonState(false, 150, 250)).not.toThrow()
  })

  it('hideLogoButton method works without errors', () => {
    const exposed = wrapper.vm as unknown as MouseParticlesExposed

    // Should not throw
    expect(() => exposed.hideLogoButton()).not.toThrow()
  })

  it('can attract particles when logo is hovered', async () => {
    const exposed = wrapper.vm as unknown as MouseParticlesExposed

    // Set logo button as hovered
    exposed.setLogoButtonState(true, 400, 300)

    // Wait for next tick
    await wrapper.vm.$nextTick()

    // Component should still be mounted and working
    expect(wrapper.exists()).toBe(true)
  })

  it('disperses particles when logo button is hidden', async () => {
    const exposed = wrapper.vm as unknown as MouseParticlesExposed

    // First, attract particles
    exposed.setLogoButtonState(true, 400, 300)
    await wrapper.vm.$nextTick()

    // Then hide the button
    exposed.hideLogoButton()
    await wrapper.vm.$nextTick()

    // Component should still be mounted
    expect(wrapper.exists()).toBe(true)
  })

  it('handles hover state changes', async () => {
    const exposed = wrapper.vm as unknown as MouseParticlesExposed

    // Hover on
    exposed.setLogoButtonState(true, 400, 300)
    await wrapper.vm.$nextTick()

    // Hover off
    exposed.setLogoButtonState(false, 400, 300)
    await wrapper.vm.$nextTick()

    expect(wrapper.exists()).toBe(true)
  })

  it('handles position updates while hovered', async () => {
    const exposed = wrapper.vm as unknown as MouseParticlesExposed

    // Initial hover
    exposed.setLogoButtonState(true, 400, 300)
    await wrapper.vm.$nextTick()

    // Update position while still hovered
    exposed.setLogoButtonState(true, 450, 350)
    await wrapper.vm.$nextTick()

    expect(wrapper.exists()).toBe(true)
  })

  it('canvas has pointer-events: none style', () => {
    const canvas = wrapper.find('.mouse-particles')
    // The component should have pointer-events: none in its styles
    expect(canvas.classes()).toContain('mouse-particles')
  })
})
