import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import AnimatedLoadingGlyph from '../AnimatedLoadingGlyph.vue'
import { setCurrentAppLocale } from '@/i18n/locale'

describe('AnimatedLoadingGlyph', () => {
  afterEach(() => {
    setCurrentAppLocale('en')
  })

  it('renders the localized loading label', () => {
    setCurrentAppLocale('de')

    const wrapper = mount(AnimatedLoadingGlyph)

    expect(wrapper.get('.animated-loading-glyph__label').text()).toBe('Lädt...')
  })
})
