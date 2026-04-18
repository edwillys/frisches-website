import { DEFAULT_APP_LOCALE, type AppLocale } from '@/i18n/locale'
import type { NavigationSectionKey } from '@/components/cardDealer/menuSections'

export type NavigationSectionText = {
  title: string
  headerTitle: string
  matchTokens: readonly string[]
}

export const navigationText: Record<
  AppLocale,
  Record<NavigationSectionKey, NavigationSectionText>
> = {
  en: {
    home: {
      title: 'Home',
      headerTitle: '_Home',
      matchTokens: ['home'],
    },
    music: {
      title: 'Music',
      headerTitle: '_Music',
      matchTokens: ['music'],
    },
    about: {
      title: 'About',
      headerTitle: '_About',
      matchTokens: ['about'],
    },
    gallery: {
      title: 'Gallery',
      headerTitle: '_Gallery',
      matchTokens: ['gallery'],
    },
  },
}

export const getNavigationText = (locale: AppLocale) =>
  navigationText[locale] ?? navigationText[DEFAULT_APP_LOCALE]
