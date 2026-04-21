<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import closeSvg from '@/assets/icons/close.svg?raw'
import { currentAppLocale, type AppLocale } from '@/i18n/locale'

defineProps<{
  title: string
  subtitle: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const pageRef = ref<HTMLElement | null>(null)

const closeLabels: Record<AppLocale, string> = {
  en: 'Close',
  de: 'Schließen',
  fr: 'Fermer',
  'pt-BR': 'Fechar',
}

const closeAriaLabel = computed(() => closeLabels[currentAppLocale.value] ?? closeLabels.en)

function handleClose() {
  emit('close')
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  emit('close')
}

onMounted(() => {
  pageRef.value?.focus()
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <main ref="pageRef" class="legal-page" tabindex="-1" @click="handleClose">
    <div class="legal-page__veil" aria-hidden="true" />
    <div class="legal-page__glow legal-page__glow--accent" aria-hidden="true" />
    <div class="legal-page__glow legal-page__glow--cyan" aria-hidden="true" />

    <div class="legal-page__container" @click.stop>
      <button
        class="legal-page__close"
        type="button"
        :aria-label="closeAriaLabel"
        @click="handleClose"
      >
        <span class="legal-page__close-icon" aria-hidden="true" v-html="closeSvg" />
      </button>

      <header class="legal-page__header">
        <h1 class="legal-page__title">{{ title }}</h1>
        <p class="legal-page__subtitle">{{ subtitle }}</p>
      </header>

      <section class="legal-page__panel">
        <div class="legal-page__content">
          <slot />
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.legal-page {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  padding: clamp(5rem, 10vh, 7rem) var(--spacing-lg) var(--spacing-2xl);
  background:
    radial-gradient(circle at top, rgba(212, 175, 55, 0.12), transparent 28%),
    linear-gradient(180deg, rgba(10, 10, 18, 0.92) 0%, rgba(10, 10, 18, 0.98) 100%);
  color: var(--color-text);
}

.legal-page__veil {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0.58) 100%),
    linear-gradient(135deg, rgba(104, 198, 224, 0.04), rgba(191, 7, 90, 0.04));
  pointer-events: none;
}

.legal-page__glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.3;
  pointer-events: none;
}

.legal-page__glow--accent {
  top: -8rem;
  right: -6rem;
  width: 20rem;
  height: 20rem;
  background: rgba(212, 175, 55, 0.22);
}

.legal-page__glow--cyan {
  bottom: -10rem;
  left: -8rem;
  width: 24rem;
  height: 24rem;
  background: rgba(104, 198, 224, 0.12);
}

.legal-page__container {
  position: relative;
  z-index: 1;
  width: min(100%, 880px);
  margin: 0 auto;
}

.legal-page__close {
  position: fixed;
  top: clamp(18px, 3vw, 28px);
  right: clamp(18px, 3vw, 28px);
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.42);
  color: var(--color-text);
  backdrop-filter: blur(14px);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.32);
  transition:
    transform var(--transition-fast),
    border-color var(--transition-fast),
    background var(--transition-fast),
    box-shadow var(--transition-fast);
}

.legal-page__close:hover {
  transform: rotate(90deg) scale(1.03);
  border-color: rgba(212, 175, 55, 0.45);
  background: rgba(0, 0, 0, 0.58);
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.38);
}

.legal-page__close-icon :deep(svg) {
  display: block;
  width: 16px;
  height: 16px;
}

.legal-page__header {
  margin-bottom: var(--spacing-lg);
  padding-right: 3.5rem;
}

.legal-page__title {
  margin: 0;
  font-size: clamp(1.4rem, 3vw, 2rem);
  line-height: 0.98;
  text-wrap: balance;
}

.legal-page__subtitle {
  max-width: 58ch;
  margin-top: var(--spacing-sm);
  color: var(--color-text-secondary);
  font-size: clamp(0.78rem, 1.4vw, 0.86rem);
  line-height: 1.5;
}

.legal-page__panel {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 28px;
  background: linear-gradient(180deg, rgba(18, 18, 29, 0.9), rgba(9, 9, 15, 0.78));
  box-shadow:
    0 24px 70px rgba(0, 0, 0, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(18px);
}

.legal-page__panel::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.8), transparent);
}

.legal-page__content {
  display: grid;
  gap: var(--spacing-xl);
  padding: clamp(1.4rem, 3vw, 2.4rem);
}

.legal-page__content :deep(section) {
  display: grid;
  gap: var(--spacing-md);
}

.legal-page__content :deep(h2) {
  margin: 0;
  color: var(--color-accent);
  font-size: clamp(0.76rem, 1.2vw, 0.86rem);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.legal-page__content :deep(h3) {
  margin: 0;
  color: rgba(232, 232, 240, 0.92);
  font-size: clamp(0.74rem, 1.1vw, 0.82rem);
  font-weight: var(--font-weight-semibold);
}

.legal-page__content :deep(p),
.legal-page__content :deep(li) {
  color: rgba(232, 232, 240, 0.82);
  font-size: clamp(0.78rem, 1.3vw, 0.85rem);
  line-height: 1.78;
}

.legal-page__content :deep(ul) {
  display: grid;
  gap: 0.6rem;
  padding-left: 1.2rem;
}

.legal-page__content :deep(li::marker) {
  color: var(--color-accent);
}

.legal-page__content :deep(a) {
  color: var(--color-accent-light);
}

.legal-page__content :deep(a:hover) {
  color: var(--color-accent);
}

@media (max-width: 640px) {
  .legal-page {
    padding-left: var(--spacing-md);
    padding-right: var(--spacing-md);
  }

  .legal-page__header {
    padding-right: 0;
  }

  .legal-page__panel {
    border-radius: 22px;
  }
}
</style>
