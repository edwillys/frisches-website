import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import LanguageSwitcher from '../LanguageSwitcher.vue'
import { currentAppLocale, setCurrentAppLocale } from '@/i18n/locale'

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    setCurrentAppLocale('en')
  })

  afterEach(() => {
    setCurrentAppLocale('en')
    window.localStorage.clear()
    document.cookie = 'frisches_locale=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
  })

  it('renders all supported locale buttons with translated acronyms', async () => {
    const wrapper = mount(LanguageSwitcher)

    await wrapper.get('[data-testid="language-current"]').trigger('click')

    expect(wrapper.get('[data-testid="language-option-en"]').text()).toContain('EN')
    expect(wrapper.get('[data-testid="language-option-de"]').text()).toContain('DE')
    expect(wrapper.get('[data-testid="language-option-fr"]').text()).toContain('FR')
    expect(wrapper.get('[data-testid="language-option-br"]').text()).toContain('BR')
    expect(wrapper.get('[data-testid="language-option-it"]').text()).toContain('IT')
    expect(wrapper.get('[data-testid="language-option-ru"]').text()).toContain('RU')
  })

  it('switches the current locale and updates the active state', async () => {
    const wrapper = mount(LanguageSwitcher)
    await wrapper.get('[data-testid="language-current"]').trigger('click')

    await wrapper.get('[data-testid="language-option-br"]').trigger('click')

    expect(currentAppLocale.value).toBe('br')
    await wrapper.get('[data-testid="language-current"]').trigger('click')
    expect(wrapper.get('[data-testid="language-option-br"]').attributes('aria-pressed')).toBe(
      'true'
    )
  })

  it('opens on hover and closes on hover out', async () => {
    const wrapper = mount(LanguageSwitcher)

    await wrapper.get('[data-testid="language-switcher"]').trigger('mouseenter')
    expect(wrapper.find('[data-testid="language-option-en"]').exists()).toBe(true)

    await wrapper.get('[data-testid="language-switcher"]').trigger('mouseleave')
    expect(wrapper.find('[data-testid="language-option-en"]').exists()).toBe(false)
  })

  it('latches open on click and closes on second click', async () => {
    const wrapper = mount(LanguageSwitcher)

    await wrapper.get('[data-testid="language-current"]').trigger('click')
    expect(wrapper.find('[data-testid="language-option-en"]').exists()).toBe(true)

    await wrapper.get('[data-testid="language-current"]').trigger('click')
    expect(wrapper.find('[data-testid="language-option-en"]').exists()).toBe(false)
  })
})
