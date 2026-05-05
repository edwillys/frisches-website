import { createI18n } from 'vue-i18n'

import brMessages from '@/locales/br.json'
import deMessages from '@/locales/de.json'
import enMessages from '@/locales/en.json'
import frMessages from '@/locales/fr.json'
import itMessages from '@/locales/it.json'
import ruMessages from '@/locales/ru.json'

import {
  getCurrentAppLocale,
  initializeAppLocale,
  registerI18nLocaleSync,
  type AppLocale,
} from './locale'

export type AppMessages = typeof enMessages

export const appMessages: Record<AppLocale, AppMessages> = {
  en: enMessages,
  de: deMessages,
  fr: frMessages,
  br: brMessages,
  it: itMessages,
  ru: ruMessages,
}

initializeAppLocale()

export const i18n = createI18n({
  legacy: false,
  locale: getCurrentAppLocale(),
  fallbackLocale: 'en',
  messages: appMessages,
  missingWarn: import.meta.env.DEV,
  fallbackWarn: import.meta.env.DEV,
})

registerI18nLocaleSync((locale) => {
  i18n.global.locale.value = locale
})

export const getAppMessages = (locale: AppLocale): AppMessages =>
  appMessages[locale] ?? appMessages.en
