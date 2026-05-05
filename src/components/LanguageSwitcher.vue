<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { currentAppLocale, setCurrentAppLocale, appLocales, type AppLocale } from '@/i18n/locale'
import { useUiText } from '@/composables/useUiText'

interface Props {
  variant?: 'default' | 'header' | 'drawer' | 'floating'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
})

const t = useUiText()
const rootRef = ref<HTMLElement | null>(null)
const isHovered = ref(false)
const isLatchedOpen = ref(false)

const localeOptions = computed(() =>
  appLocales.map((locale) => ({
    locale,
    ...t.value.languageSwitcher.options[locale],
  }))
)

const currentOption = computed(
  () =>
    localeOptions.value.find((option) => option.locale === currentAppLocale.value) ??
    localeOptions.value[0]
)

const computedAriaLabel = computed(() =>
  props.variant === 'floating'
    ? t.value.languageSwitcher.floatingAriaLabel
    : t.value.languageSwitcher.ariaLabel
)

const isOpen = computed(() => isHovered.value || isLatchedOpen.value)

const handleMouseEnter = () => {
  isHovered.value = true
}

const handleMouseLeave = () => {
  isHovered.value = false
}

const toggleDropdown = () => {
  if (isLatchedOpen.value) {
    closeDropdown()
    return
  }

  isLatchedOpen.value = true
}

const closeDropdown = () => {
  isHovered.value = false
  isLatchedOpen.value = false
}

const handleLocaleSelect = (locale: AppLocale) => {
  if (locale !== currentAppLocale.value) {
    setCurrentAppLocale(locale)
  }
  closeDropdown()
}

const onDocumentPointerDown = (event: PointerEvent) => {
  const rootElement = rootRef.value
  if (!rootElement) return

  const target = event.target
  if (!(target instanceof Node)) return

  if (!rootElement.contains(target)) {
    closeDropdown()
  }
}

const onDocumentKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') closeDropdown()
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown)
  document.addEventListener('keydown', onDocumentKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  document.removeEventListener('keydown', onDocumentKeydown)
})
</script>

<template>
  <nav
    ref="rootRef"
    class="language-switcher"
    :class="[`language-switcher--${props.variant}`, { 'is-open': isOpen }]"
    :aria-label="computedAriaLabel"
    data-testid="language-switcher"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <button
      type="button"
      class="language-switcher__trigger"
      :class="{ 'language-switcher__trigger--open': isOpen }"
      :aria-label="t.languageSwitcher.currentLocaleLabel"
      :aria-expanded="isOpen"
      :title="currentOption?.label"
      data-testid="language-current"
      @click="toggleDropdown"
    >
      <span
        class="language-switcher__arrow"
        :class="{ 'language-switcher__arrow--open': isOpen }"
        aria-hidden="true"
      ></span>
      <span class="language-switcher__acronym">{{ currentOption?.acronym }}</span>
    </button>

    <ul v-if="isOpen" class="language-switcher__dropdown">
      <li v-for="option in localeOptions" :key="option.locale" class="language-switcher__item">
        <button
          type="button"
          class="language-switcher__option"
          :class="{ 'is-active': currentAppLocale === option.locale }"
          :aria-label="option.label"
          :aria-pressed="currentAppLocale === option.locale"
          :title="option.label"
          :data-testid="`language-option-${option.locale}`"
          @click="handleLocaleSelect(option.locale)"
        >
          <span class="language-switcher__flag" aria-hidden="true">{{ option.flag }}</span>
          <span class="language-switcher__acronym">{{ option.acronym }}</span>
        </button>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.language-switcher {
  --language-switcher-bg: rgba(0, 0, 0, 0.52);
  --language-switcher-border: rgba(255, 255, 255, 0.16);
  --language-switcher-overlay-z: 220;
  position: relative;
  display: inline-flex;
  align-items: stretch;
  border: 1px solid var(--language-switcher-border);
  border-radius: 999px;
  background: var(--language-switcher-bg);
  backdrop-filter: blur(12px);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.22);
  z-index: 20;
}

.language-switcher.is-open {
  z-index: var(--language-switcher-overlay-z);
}

.language-switcher--drawer {
  width: auto;
  border-radius: 1rem;
}

.language-switcher__trigger {
  appearance: none;
  border: 0;
  background: transparent;
  color: var(--color-text);
  min-width: 3.2rem;
  min-height: 2.55rem;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.32rem;
  cursor: pointer;
  transition:
    background var(--transition-fast),
    transform var(--transition-fast);
}

.language-switcher__trigger:hover,
.language-switcher__trigger:focus-visible {
  background: rgba(255, 255, 255, 0.09);
  outline: none;
  transform: translateY(-1px);
}

.language-switcher--drawer .language-switcher__trigger {
  border-radius: 0.8rem;
  min-width: 3.4rem;
  justify-content: center;
  padding-left: 0.4rem;
  padding-right: 0.55rem;
}

.language-switcher__arrow {
  display: inline-block;
  width: 0.48rem;
  height: 0.48rem;
  border-right: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  transform: rotate(45deg) translateY(-1px);
  transition: transform var(--transition-fast);
}

.language-switcher__arrow--open {
  transform: rotate(-135deg) translateY(-1px);
}

.language-switcher--drawer .language-switcher__arrow {
  transform: rotate(-135deg);
}

.language-switcher--drawer .language-switcher__arrow--open {
  transform: rotate(45deg);
}

.language-switcher__dropdown {
  list-style: none;
  margin: 0;
  position: absolute;
  top: calc(100% - 1px);
  right: 0;
  min-width: 100%;
  padding: 0.25rem;
  display: grid;
  gap: 0.2rem;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 0.8rem;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(12px);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.36);
  z-index: calc(var(--language-switcher-overlay-z) + 1);
}

.language-switcher__item {
  margin: 0;
  padding: 0;
}

.language-switcher--drawer .language-switcher__dropdown {
  top: auto;
  right: 0;
  bottom: calc(100% - 1px);
  transform: none;
  min-width: 3.75rem;
}

.language-switcher__option {
  appearance: none;
  border: 1px solid transparent;
  background: transparent;
  color: var(--color-text-secondary);
  min-height: 2.35rem;
  width: 100%;
  padding: 0.25rem 0.45rem;
  border-radius: 0.58rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.34rem;
  cursor: pointer;
  transition:
    color var(--transition-fast),
    background var(--transition-fast),
    border-color var(--transition-fast),
    transform var(--transition-fast);
}

.language-switcher__option:hover,
.language-switcher__option:focus-visible {
  color: var(--color-text);
  background: rgba(255, 255, 255, 0.09);
  border-color: rgba(255, 255, 255, 0.24);
  outline: none;
}

.language-switcher__option.is-active {
  color: var(--color-text);
  background: rgba(255, 255, 255, 0.14);
  border-color: rgba(255, 255, 255, 0.3);
}

.language-switcher__flag {
  font-size: 0.95rem;
  line-height: 1;
}

.language-switcher__acronym {
  font-family: 'Space Mono', 'Courier New', monospace;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  line-height: 1;
}
</style>
