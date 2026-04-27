import { ref, watch, type Ref } from 'vue'

interface UseTypewriterTextOptions {
  text: Ref<string>
  isActive: Ref<boolean>
  charIntervalMs?: number
}

const DEFAULT_CHAR_INTERVAL_MS = 20

export const useTypewriterText = (options: UseTypewriterTextOptions) => {
  const displayedText = ref('')
  const isTyping = ref(false)

  let timeoutIds: ReturnType<typeof setTimeout>[] = []

  const clearTimers = () => {
    timeoutIds.forEach((id) => clearTimeout(id))
    timeoutIds = []
  }

  const setFullText = () => {
    clearTimers()
    displayedText.value = options.text.value
    isTyping.value = false
  }

  const startTyping = () => {
    clearTimers()

    if (!options.isActive.value) {
      displayedText.value = options.text.value
      isTyping.value = false
      return
    }

    displayedText.value = ''
    isTyping.value = true

    const chars = Array.from(options.text.value)
    const interval = options.charIntervalMs ?? DEFAULT_CHAR_INTERVAL_MS

    chars.forEach((char, index) => {
      timeoutIds.push(
        setTimeout(() => {
          displayedText.value += char
          if (index === chars.length - 1) {
            isTyping.value = false
          }
        }, interval * index)
      )
    })

    if (!chars.length) {
      isTyping.value = false
    }
  }

  watch(
    [options.text, options.isActive],
    () => {
      if (options.isActive.value) {
        startTyping()
        return
      }
      setFullText()
    },
    { immediate: true }
  )

  return {
    displayedText,
    isTyping,
    startTyping,
  }
}
