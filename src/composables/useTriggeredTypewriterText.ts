import { getCurrentInstance, onBeforeUnmount, ref, watch, type Ref } from 'vue'

interface UseTriggeredTypewriterTextOptions {
  text: Ref<string>
  charIntervalMs?: number
  shouldSkipAnimation?: () => boolean
}

const DEFAULT_CHAR_INTERVAL_MS = 20

export const useTriggeredTypewriterText = (options: UseTriggeredTypewriterTextOptions) => {
  const displayedText = ref(options.text.value)
  const isTyping = ref(false)

  let timeoutIds: ReturnType<typeof setTimeout>[] = []

  const clearTimers = () => {
    timeoutIds.forEach((id) => clearTimeout(id))
    timeoutIds = []
  }

  const setFullText = (value = options.text.value) => {
    clearTimers()
    displayedText.value = value
    isTyping.value = false
  }

  const startTyping = (forceRestart = false) => {
    if (options.shouldSkipAnimation?.()) {
      setFullText()
      return
    }

    const nextText = options.text.value

    if (!forceRestart) {
      // Replay is allowed when idle, but ignore re-triggers while the current pass is mid-flight.
      if (isTyping.value) return
    }

    clearTimers()
    displayedText.value = ''
    isTyping.value = true

    const chars = Array.from(nextText)
    const interval = options.charIntervalMs ?? DEFAULT_CHAR_INTERVAL_MS

    chars.forEach((char, index) => {
      timeoutIds.push(
        setTimeout(
          () => {
            displayedText.value += char
            if (index === chars.length - 1) {
              isTyping.value = false
            }
          },
          interval * (index + 1)
        )
      )
    })

    if (!chars.length) {
      isTyping.value = false
    }
  }

  watch(
    options.text,
    (nextText, previousText) => {
      if (nextText === previousText) return
      setFullText(nextText)
    },
    { immediate: true }
  )

  // Only register the lifecycle hook when called from a component setup context.
  // When used outside a component (e.g., effectScope in tests), call clearTimers() manually.
  if (getCurrentInstance()) {
    onBeforeUnmount(() => {
      clearTimers()
    })
  }

  return {
    displayedText,
    isTyping,
    startTyping,
    setFullText,
    clearTimers,
  }
}
