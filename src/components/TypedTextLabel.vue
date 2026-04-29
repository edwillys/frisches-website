<script setup lang="ts">
import { computed, toRef } from 'vue'

import { useTypewriterText } from '@/composables/useTypewriterText'

interface Props {
  text: string
  isActive?: boolean
  charIntervalMs?: number
  tag?: 'span' | 'p' | 'h2' | 'h3'
  showIdleCursor?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isActive: true,
  charIntervalMs: 20,
  tag: 'span',
  showIdleCursor: true,
})

const textRef = toRef(props, 'text')
const isActiveRef = toRef(props, 'isActive')

const { displayedText, isTyping } = useTypewriterText({
  text: textRef,
  isActive: isActiveRef,
  charIntervalMs: props.charIntervalMs,
})

const tagName = computed(() => props.tag)
</script>

<template>
  <component :is="tagName" class="typed-text-label">
    {{ displayedText }}
    <span
      class="typed-text-label__cursor typing-cursor--blink"
      :class="{ 'typed-text-label__cursor--show': isTyping || props.showIdleCursor }"
      aria-hidden="true"
    ></span>
  </component>
</template>

<style scoped>
.typed-text-label {
  display: inline-flex;
  align-items: baseline;
}

.typed-text-label__cursor {
  display: inline-block;
  width: 0.5em;
  height: 0.88em;
  margin-inline-start: 0.1em;
  border-radius: 0.08em;
  background: currentColor;
  transform: translateY(0);
  vertical-align: baseline;
  opacity: 0;
  color: currentColor;
}

.typed-text-label__cursor--show {
  opacity: 1;
}
</style>
