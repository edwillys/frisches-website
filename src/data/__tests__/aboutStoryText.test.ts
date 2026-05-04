import { describe, expect, it } from 'vitest'

import { getAboutStoryText } from '@/data/aboutStoryText'
import { appLocales } from '@/i18n/locale'

describe('getAboutStoryText', () => {
  it('pre-computes dictParts for the isDictHeader paragraph', () => {
    const storyText = getAboutStoryText('en')
    const definition = storyText.paragraphs.find((p) => p.id === 'definition')

    expect(definition).toBeDefined()
    expect(definition!.dictParts).toBeDefined()
    expect(definition!.dictParts!.boldWord).toBe('Frisches')
    expect(definition!.dictParts!.pronunciation).toContain('/ˈfrɪʃəs/')
    expect(definition!.dictParts!.definition).toContain('German for')
  })

  it('leaves dictParts undefined for non-header paragraphs', () => {
    const storyText = getAboutStoryText('en')
    const founding = storyText.paragraphs.find((p) => p.id === 'founding')
    const album = storyText.paragraphs.find((p) => p.id === 'album')

    expect(founding).toBeDefined()
    expect(founding!.dictParts).toBeUndefined()
    expect(album!.dictParts).toBeUndefined()
  })

  it('pre-computes dictParts for all supported locales', () => {
    for (const locale of appLocales) {
      const storyText = getAboutStoryText(locale)
      const definition = storyText.paragraphs.find((p) => p.id === 'definition')

      expect(definition?.dictParts, `locale ${locale}`).toBeDefined()
      expect(definition!.dictParts!.boldWord, `locale ${locale}`).toBe('Frisches')
      expect(definition!.dictParts!.pronunciation.trim(), `locale ${locale}`).toMatch(/^\//)
      expect(definition!.dictParts!.definition, `locale ${locale}`).not.toBe('')
    }
  })

  it('falls back to the default locale for an unknown locale value', () => {
    const storyText = getAboutStoryText('xx' as never)
    expect(storyText.paragraphs.length).toBeGreaterThan(0)
    expect(storyText.paragraphs[0]?.id).toBe('definition')
  })

  it('uses localized copy for italian and russian story paragraphs', () => {
    const enFounding = getAboutStoryText('en').paragraphs.find((p) => p.id === 'founding')?.text
    const itFounding = getAboutStoryText('it').paragraphs.find((p) => p.id === 'founding')?.text
    const ruFounding = getAboutStoryText('ru').paragraphs.find((p) => p.id === 'founding')?.text

    expect(itFounding).toBeDefined()
    expect(ruFounding).toBeDefined()
    expect(itFounding).not.toBe(enFounding)
    expect(ruFounding).not.toBe(enFounding)
  })
})
