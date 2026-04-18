import { readonly, ref } from 'vue'

export const appLocales = ['en'] as const

export type AppLocale = (typeof appLocales)[number]

export const DEFAULT_APP_LOCALE: AppLocale = 'en'

const appLocale = ref<AppLocale>(DEFAULT_APP_LOCALE)

export const currentAppLocale = readonly(appLocale)

export const getCurrentAppLocale = () => appLocale.value

export const setCurrentAppLocale = (nextLocale: AppLocale) => {
  appLocale.value = nextLocale
}
