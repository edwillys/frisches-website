import Cookies from 'js-cookie'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const clearLocalePersistence = () => {
  window.localStorage.clear()
  document.cookie = 'frisches_locale=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
  Cookies.remove('frisches_locale', { path: '/' })
}

describe('locale persistence', () => {
  beforeEach(() => {
    vi.resetModules()
    clearLocalePersistence()
  })

  afterEach(() => {
    clearLocalePersistence()
  })

  it('aliases legacy pt-BR values to br', async () => {
    const { resolveAppLocale } = await import('../locale')

    expect(resolveAppLocale('pt-BR')).toBe('br')
    expect(resolveAppLocale('pt')).toBe('br')
  })

  it('persists locale changes to cookie and localStorage', async () => {
    const { setCurrentAppLocale, APP_LOCALE_COOKIE_KEY, APP_LOCALE_STORAGE_KEY } =
      await import('../locale')

    setCurrentAppLocale('fr')

    expect(Cookies.get(APP_LOCALE_COOKIE_KEY)).toBe('fr')
    expect(window.localStorage.getItem(APP_LOCALE_STORAGE_KEY)).toBe('fr')
  })

  it('prefers the cookie over localStorage on initialization', async () => {
    Cookies.set('frisches_locale', 'de', { path: '/' })
    window.localStorage.setItem('frisches:locale', 'fr')

    const { initializeAppLocale, getCurrentAppLocale } = await import('../locale')

    initializeAppLocale()

    expect(getCurrentAppLocale()).toBe('de')
  })

  it('falls back to browser language when nothing is stored', async () => {
    Object.defineProperty(window.navigator, 'language', {
      configurable: true,
      value: 'fr-FR',
    })
    Object.defineProperty(window.navigator, 'languages', {
      configurable: true,
      value: ['fr-FR'],
    })

    const { initializeAppLocale, getCurrentAppLocale } = await import('../locale')

    initializeAppLocale()

    expect(getCurrentAppLocale()).toBe('fr')
  })
})
