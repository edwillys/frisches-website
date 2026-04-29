import { nextTick, ref, type Ref } from 'vue'
import gsap from 'gsap'

export type AboutSubSection = 'entry' | 'members' | 'lyrics'

interface UseAboutSubSectionOptions {
  containerRef: Ref<HTMLElement | null>
  initialSection?: AboutSubSection
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const collectAnimatedCards = (sectionRoot: HTMLElement) =>
  Array.from(sectionRoot.querySelectorAll<HTMLElement>('[data-about-card]'))

const animateSectionOut = async (sectionRoot: HTMLElement) => {
  if (prefersReducedMotion()) return

  const cards = collectAnimatedCards(sectionRoot)
  const targets = cards.length ? cards : [sectionRoot]
  const staggerMs = cards.length > 1 ? (cards.length - 1) * 30 : 0
  const fallbackMs = 220 + staggerMs + 150

  const anim = gsap.to(targets, {
    duration: 0.22,
    scale: 0.86,
    y: 20,
    opacity: 0,
    ease: 'power2.inOut',
    stagger: cards.length
      ? {
          each: 0.03,
          from: 'center',
        }
      : 0,
  })

  await Promise.race([anim, new Promise<void>((r) => setTimeout(r, fallbackMs))])
}

const animateSectionIn = async (sectionRoot: HTMLElement) => {
  if (prefersReducedMotion()) return

  const cards = collectAnimatedCards(sectionRoot)
  const targets = cards.length ? cards : [sectionRoot]
  const staggerMs = cards.length > 1 ? (cards.length - 1) * 30 : 0
  const fallbackMs = 280 + staggerMs + 150

  const anim = gsap.fromTo(
    targets,
    {
      scale: 0.84,
      y: -18,
      opacity: 0,
    },
    {
      duration: 0.28,
      scale: 1,
      y: 0,
      opacity: 1,
      ease: 'power2.out',
      stagger: cards.length
        ? {
            each: 0.03,
            from: 'center',
          }
        : 0,
    }
  )

  await Promise.race([anim, new Promise<void>((r) => setTimeout(r, fallbackMs))])
}

export const useAboutSubSection = (options: UseAboutSubSectionOptions) => {
  const activeSection = ref<AboutSubSection>(options.initialSection ?? 'entry')
  const isSwitching = ref(false)
  let switchVersion = 0
  let pendingSection: AboutSubSection | null = null

  const switchSection = async (nextSection: AboutSubSection) => {
    if (nextSection === activeSection.value) return

    if (isSwitching.value) {
      pendingSection = nextSection
      return
    }

    pendingSection = null

    const runVersion = ++switchVersion

    const containerElement = options.containerRef.value
    const currentSectionElement = containerElement?.querySelector<HTMLElement>(
      `[data-about-section="${activeSection.value}"]`
    )

    isSwitching.value = true

    try {
      if (currentSectionElement) {
        await animateSectionOut(currentSectionElement)
      }

      if (runVersion !== switchVersion) return

      activeSection.value = nextSection
      await nextTick()

      if (runVersion !== switchVersion) return

      const nextSectionElement = containerElement?.querySelector<HTMLElement>(
        `[data-about-section="${nextSection}"]`
      )

      if (nextSectionElement) {
        await animateSectionIn(nextSectionElement)
      }
    } finally {
      if (runVersion === switchVersion) {
        isSwitching.value = false
        const pending = pendingSection
        if (pending !== null && pending !== activeSection.value) {
          pendingSection = null
          void switchSection(pending)
        }
      }
    }
  }

  const setSectionImmediately = (nextSection: AboutSubSection) => {
    switchVersion += 1
    pendingSection = null
    isSwitching.value = false
    activeSection.value = nextSection
  }

  return {
    activeSection,
    isSwitching,
    switchSection,
    setSectionImmediately,
  }
}
