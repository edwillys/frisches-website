import { beforeAll, vi } from 'vitest'

beforeAll(() => {
  // Mock HTMLMediaElement methods that jsdom doesn't implement
  window.HTMLMediaElement.prototype.load = vi.fn()
  window.HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve())
  window.HTMLMediaElement.prototype.pause = vi.fn()

  // Suppress GLTF model loading errors (expected in test environment)
  const originalError = console.error
  console.error = (...args: unknown[]) => {
    const message = String(args[0])
    if (message.includes('Failed to load model for character')) {
      return
    }
    if (message.includes('Failed to load GLTF model')) {
      return
    }
    originalError.apply(console, args)
  }
})
