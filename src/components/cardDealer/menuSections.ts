export const NAVIGATION_SECTION_KEYS = ['home', 'music', 'about', 'gallery'] as const

export type NavigationSectionKey = (typeof NAVIGATION_SECTION_KEYS)[number]
export type MenuSectionKey = Exclude<NavigationSectionKey, 'home'>

export type NavigationSectionConfig = {
  key: NavigationSectionKey
  title: string
  headerTitle: string
  matchTokens: readonly string[]
}

export const NAVIGATION_SECTIONS: Record<NavigationSectionKey, NavigationSectionConfig> = {
  home: {
    key: 'home',
    title: 'Home',
    headerTitle: '_Home',
    matchTokens: ['home'],
  },
  music: {
    key: 'music',
    title: 'Music',
    headerTitle: '_Music',
    matchTokens: ['music'],
  },
  about: {
    key: 'about',
    title: 'About',
    headerTitle: '_About',
    matchTokens: ['about'],
  },
  gallery: {
    key: 'gallery',
    title: 'Gallery',
    headerTitle: '_Gallery',
    matchTokens: ['gallery'],
  },
}

export const normalizeSectionLabel = (value: string | null | undefined) =>
  value?.toLowerCase().trim() ?? ''

export const titleContainsSection = (
  value: string | null | undefined,
  sectionKey: MenuSectionKey
) => {
  const normalizedValue = normalizeSectionLabel(value)
  if (!normalizedValue) return false

  return NAVIGATION_SECTIONS[sectionKey].matchTokens.some((token) =>
    normalizedValue.includes(token)
  )
}
