import { DEFAULT_APP_LOCALE, type AppLocale } from '@/i18n/locale'
import { getAppMessages } from '@/i18n'
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
  en: getAppMessages('en').navigation,
  de: getAppMessages('de').navigation,
  fr: getAppMessages('fr').navigation,
  br: getAppMessages('br').navigation,
  it: getAppMessages('it').navigation,
  ru: getAppMessages('ru').navigation,
}

export const getNavigationText = (locale: AppLocale) =>
  navigationText[locale] ?? navigationText[DEFAULT_APP_LOCALE]
