import Cookies from 'js-cookie'
import { readonly, ref } from 'vue'

import { trackLanguageChanged } from '@/analytics'

export const appLocales = ['en', 'de', 'fr', 'br', 'it', 'ru'] as const

export type AppLocale = (typeof appLocales)[number]

export const DEFAULT_APP_LOCALE: AppLocale = 'en'
export const APP_LOCALE_COOKIE_KEY = 'frisches_locale'
export const APP_LOCALE_STORAGE_KEY = 'frisches:locale'

const appLocale = ref<AppLocale>(DEFAULT_APP_LOCALE)

let localeSync: ((locale: AppLocale) => void) | null = null
let hasInitializedAppLocale = false

export const currentAppLocale = readonly(appLocale)

export const getCurrentAppLocale = () => appLocale.value

export const registerI18nLocaleSync = (sync: (locale: AppLocale) => void) => {
  localeSync = sync
  sync(appLocale.value)
}

const normalizeLocaleCandidate = (value: string | null | undefined): string =>
  value?.trim().replace(/_/g, '-').toLowerCase() ?? ''

export const resolveAppLocale = (value: string | null | undefined): AppLocale | null => {
  const normalized = normalizeLocaleCandidate(value)
  if (!normalized) return null

  if (normalized === 'pt-br' || normalized === 'pt') return 'br'
  if (normalized === 'br') return 'br'
  if (appLocales.includes(normalized as AppLocale)) return normalized as AppLocale

  const primary = normalized.split('-')[0]
  if (primary === 'pt') return 'br'
  if (primary && appLocales.includes(primary as AppLocale)) return primary as AppLocale

  return null
}

const persistAppLocale = (locale: AppLocale) => {
  if (typeof window === 'undefined') return

  Cookies.set(APP_LOCALE_COOKIE_KEY, locale, {
    expires: 365,
    sameSite: 'Lax',
    path: '/',
  })
  window.localStorage.setItem(APP_LOCALE_STORAGE_KEY, locale)
}

const readStoredAppLocale = (): AppLocale | null => {
  if (typeof window === 'undefined') return null

  return (
    resolveAppLocale(Cookies.get(APP_LOCALE_COOKIE_KEY)) ??
    resolveAppLocale(window.localStorage.getItem(APP_LOCALE_STORAGE_KEY))
  )
}

export const resolveBrowserAppLocale = (): AppLocale => {
  if (typeof navigator === 'undefined') return DEFAULT_APP_LOCALE

  const browserLocales = [...(navigator.languages ?? []), navigator.language]
  for (const candidate of browserLocales) {
    const resolved = resolveAppLocale(candidate)
    if (resolved) return resolved
  }

  return DEFAULT_APP_LOCALE
}

const applyResolvedAppLocale = (
  nextLocale: AppLocale,
  options: { persist?: boolean; track?: boolean } = {}
) => {
  const { persist = true, track = true } = options
  const prevLocale = appLocale.value

  appLocale.value = nextLocale
  localeSync?.(nextLocale)

  if (persist) persistAppLocale(nextLocale)
  if (track && prevLocale !== nextLocale) trackLanguageChanged(prevLocale, nextLocale)

  return nextLocale
}

export const setCurrentAppLocale = (
  nextLocale: AppLocale | string,
  options?: { persist?: boolean; track?: boolean }
) => applyResolvedAppLocale(resolveAppLocale(nextLocale) ?? DEFAULT_APP_LOCALE, options)

export const initializeAppLocale = () => {
  const resolvedLocale = readStoredAppLocale() ?? resolveBrowserAppLocale()

  hasInitializedAppLocale = true
  return applyResolvedAppLocale(resolvedLocale, { persist: true, track: false })
}

export const ensurePersistedAppLocale = () => {
  if (!hasInitializedAppLocale) {
    return initializeAppLocale()
  }

  if (!Cookies.get(APP_LOCALE_COOKIE_KEY)) {
    persistAppLocale(appLocale.value)
  }
  return appLocale.value
}
