<script setup lang="ts">
import { computed, ref } from 'vue'

import arrowLeftSvg from '@/assets/icons/arrow-left.svg?raw'
import type { TriviaSection } from '@/types/triviaSection'

interface Props {
  sections: TriviaSection[]
}

const props = defineProps<Props>()

const selectedSectionId = ref(props.sections[0]?.id ?? '')
const isFlipped = ref(false)

const selectedSection = computed(
  () =>
    props.sections.find((section) => section.id === selectedSectionId.value) ?? props.sections[0]
)

const sectionSummary = (text: string) => {
  const flattened = text.replace(/\s+/g, ' ').trim()
  if (!flattened) return ''

  const firstSentenceEnd = flattened.search(/[.!?](\s|$)/)
  const firstSentence =
    firstSentenceEnd >= 0 ? flattened.slice(0, firstSentenceEnd + 1).trim() : flattened

  return firstSentence.length > 88 ? `${firstSentence.slice(0, 85).trimEnd()}...` : firstSentence
}

const openSection = (section: TriviaSection) => {
  selectedSectionId.value = section.id
  isFlipped.value = true
}

const showList = () => {
  isFlipped.value = false
}
</script>

<template>
  <article class="trivia-card" :class="{ 'trivia-card--flipped': isFlipped }">
    <div class="trivia-card__inner">
      <section class="trivia-card__face trivia-card__face--front" :aria-hidden="isFlipped">
        <header class="trivia-card__header">
          <strong class="trivia-card__title">Band Trivia</strong>
        </header>

        <ul class="trivia-card__rows" role="list">
          <li v-for="section in sections" :key="section.id" class="trivia-card__row-item">
            <button class="trivia-card__row" type="button" @click="openSection(section)">
              <span class="trivia-card__row-title">{{ section.title }}</span>
              <span v-if="section.frontSubtitle" class="trivia-card__row-subtitle">
                {{ section.frontSubtitle }}
              </span>
              <span class="trivia-card__row-summary">{{
                sectionSummary(section.backContent)
              }}</span>
            </button>
          </li>
        </ul>
      </section>

      <section class="trivia-card__face trivia-card__face--back" :aria-hidden="!isFlipped">
        <header class="trivia-card__back-header">
          <button class="trivia-card__back-arrow" type="button" @click="showList">
            <span aria-hidden="true" v-html="arrowLeftSvg" />
          </button>
          <div class="trivia-card__back-copy">
            <strong class="trivia-card__title">{{ selectedSection?.title }}</strong>
          </div>
        </header>

        <p class="trivia-card__content">{{ selectedSection?.backContent }}</p>
      </section>
    </div>
  </article>
</template>

<style scoped>
.trivia-card {
  --about-card-title-font-size: clamp(1.1rem, 1.5vw, 1.45rem);
  width: min(var(--about-card-width-desktop), calc(100vw - 2rem));
  aspect-ratio: var(--about-card-aspect-ratio);
  border: 0;
  background: transparent;
  padding: 0;
  perspective: 1100px;
}

.trivia-card__inner {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  transition: transform 0.44s cubic-bezier(0.2, 0.7, 0.3, 1);
  transform-style: preserve-3d;
}

.trivia-card--flipped .trivia-card__inner {
  transform: rotateY(180deg);
}

.trivia-card__face {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  border: 1px solid rgba(104, 198, 224, 0.45);
  border-radius: 1rem;
  padding: 1rem;
  backface-visibility: hidden;
  color: var(--color-text);
  background: linear-gradient(180deg, rgba(19, 5, 65, 0.96) 0%, rgba(45, 45, 68, 0.95) 100%);
  box-shadow:
    0 18px 40px rgba(0, 0, 0, 0.5),
    0 0 12px rgba(104, 198, 224, 0.2),
    inset 0 0 0 1px rgba(255, 255, 255, 0.04);
}

.trivia-card__face--back {
  transform: rotateY(180deg);
}

.trivia-card__header {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.trivia-card__title {
  margin: 0;
  font-family: 'Space Mono', 'Courier New', monospace;
  font-size: var(--about-card-title-font-size);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.trivia-card__subtitle {
  margin: 0;
  font-family: 'Space Mono', 'Courier New', monospace;
  font-size: 0.7rem;
  letter-spacing: 0.04em;
  color: var(--color-text-secondary);
}

.trivia-card__rows {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.trivia-card__row-item {
  margin: 0;
}

.trivia-card__row {
  width: 100%;
  border: 1px solid rgba(104, 198, 224, 0.3);
  border-radius: 0.62rem;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.18), rgba(0, 0, 0, 0.3));
  color: var(--color-text);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.2rem;
  text-align: left;
  padding: 0.42rem 0.56rem;
  cursor: pointer;
}

.trivia-card__row:hover,
.trivia-card__row:focus-visible {
  border-color: rgba(104, 198, 224, 0.62);
  transform: translateX(1px);
  outline: none;
}

.trivia-card__row-title {
  font-family: 'Space Mono', 'Courier New', monospace;
  font-size: 0.74rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.trivia-card__row-subtitle,
.trivia-card__row-summary {
  width: 100%;
  min-width: 0;
  font-family: 'Space Mono', 'Courier New', monospace;
  color: var(--color-text-secondary);
}

.trivia-card__row-subtitle {
  font-size: 0.66rem;
  letter-spacing: 0.03em;
}

.trivia-card__row-summary {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.64rem;
  letter-spacing: 0.02em;
}

.trivia-card__back-header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 2rem;
}

.trivia-card__back-copy {
  text-align: center;
}

.trivia-card__back-arrow {
  position: absolute;
  inset-inline-start: 0;
  width: 1.95rem;
  height: 1.95rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(104, 198, 224, 0.36);
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.22);
  color: var(--color-text);
  cursor: pointer;
}

.trivia-card__back-arrow :deep(svg) {
  width: 1rem;
  height: 1rem;
}

.trivia-card__content {
  margin: 0;
  white-space: pre-line;
  line-height: 1.38;
  font-family: 'Space Mono', 'Courier New', monospace;
  font-size: 0.74rem;
  overflow: auto;
}

@media (max-width: 767px) {
  .trivia-card {
    width: min(var(--about-card-width-mobile), calc(100vw - 2rem));
  }
}
</style>
