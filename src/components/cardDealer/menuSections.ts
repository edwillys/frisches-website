import type { AppLocale } from '@/i18n/locale'
import { getNavigationText } from '@/i18n/navigationText'

export const NAVIGATION_SECTION_KEYS = ['home', 'music', 'about', 'gallery'] as const

export type NavigationSectionKey = (typeof NAVIGATION_SECTION_KEYS)[number]
export type MenuSectionKey = Exclude<NavigationSectionKey, 'home'>

export type NavigationSectionConfig = {
  key: NavigationSectionKey
  title: string
  headerTitle: string
  matchTokens: readonly string[]
}

export type NavigationSectionsMap = Record<NavigationSectionKey, NavigationSectionConfig>

export const getNavigationSections = (locale: AppLocale): NavigationSectionsMap => {
  const localeText = getNavigationText(locale)

  return {
    home: {
      key: 'home',
      ...localeText.home,
    },
    music: {
      key: 'music',
      ...localeText.music,
    },
    about: {
      key: 'about',
      ...localeText.about,
    },
    gallery: {
      key: 'gallery',
      ...localeText.gallery,
    },
  }
}

export const normalizeSectionLabel = (value: string | null | undefined) =>
  value
    ?.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim() ?? ''

export const titleContainsSection = (
  value: string | null | undefined,
  sectionKey: MenuSectionKey,
  sections: NavigationSectionsMap
) => {
  const normalizedValue = normalizeSectionLabel(value)
  if (!normalizedValue) return false

  return sections[sectionKey].matchTokens.some((token) =>
    normalizedValue.includes(normalizeSectionLabel(token))
  )
}
