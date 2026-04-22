import { readonly, ref } from 'vue'
import { trackLanguageChanged } from '@/analytics'

export const appLocales = ['en', 'de', 'fr', 'pt-BR'] as const

export type AppLocale = (typeof appLocales)[number]

export const DEFAULT_APP_LOCALE: AppLocale = 'en'

const appLocale = ref<AppLocale>(DEFAULT_APP_LOCALE)

export const currentAppLocale = readonly(appLocale)

export const getCurrentAppLocale = () => appLocale.value

export const setCurrentAppLocale = (nextLocale: AppLocale) => {
  const prev = appLocale.value
  appLocale.value = nextLocale
  trackLanguageChanged(prev, nextLocale)
}
