import { describe, expect, it, vi } from 'vitest'
import { effectScope, ref } from 'vue'

import { useTriggeredTypewriterText } from '../useTriggeredTypewriterText'

describe('useTriggeredTypewriterText', () => {
  it('replays when idle and ignores re-triggers while typing is already in progress', async () => {
    vi.useFakeTimers()

    const scope = effectScope()
    const text = ref('Story')
    const api = scope.run(() =>
      useTriggeredTypewriterText({
        text,
        charIntervalMs: 20,
      })
    )

    if (!api) {
      throw new Error('Expected composable API to be created')
    }

    api.startTyping()
    expect(api.isTyping.value).toBe(true)

    await vi.advanceTimersByTimeAsync(40)
    const inFlight = api.displayedText.value
    expect(inFlight.length).toBeGreaterThan(0)
    expect(inFlight).not.toBe('Story')

    api.startTyping()
    expect(api.displayedText.value).toBe(inFlight)

    await vi.runAllTimersAsync()
    expect(api.displayedText.value).toBe('Story')
    expect(api.isTyping.value).toBe(false)

    api.startTyping()
    expect(api.isTyping.value).toBe(true)
    expect(api.displayedText.value).toBe('')

    scope.stop()
    vi.useRealTimers()
  })

  it('exposes clearTimers for explicit cleanup when used outside a component context', async () => {
    vi.useFakeTimers()

    const scope = effectScope()
    const text = ref('World')
    const api = scope.run(() =>
      useTriggeredTypewriterText({
        text,
        charIntervalMs: 30,
      })
    )

    if (!api) {
      throw new Error('Expected composable API to be created')
    }

    api.startTyping()
    await vi.advanceTimersByTimeAsync(30) // 'W' typed
    const snapshot = api.displayedText.value
    expect(snapshot).toBe('W')

    // Explicitly clear pending timers — required when not inside a component lifecycle
    api.clearTimers()

    // Advancing time further must not append more characters
    await vi.runAllTimersAsync()
    expect(api.displayedText.value).toBe(snapshot)

    scope.stop()
    vi.useRealTimers()
  })
})
