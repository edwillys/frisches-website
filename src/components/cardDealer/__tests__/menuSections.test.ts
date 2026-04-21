import { describe, expect, it } from 'vitest'

import { getNavigationSections, titleContainsSection } from '../menuSections'

describe('menuSections', () => {
  it('builds populated navigation sections immediately for the active locale', () => {
    const sections = getNavigationSections('en')

    expect(sections.music.title).toBe('Music')
    expect(sections.about.headerTitle).toBe('_About')
  })

  it('falls back to the default locale for unknown runtime locale values', () => {
    const sections = getNavigationSections('xx' as never)

    expect(sections.gallery.title).toBe('Gallery')
  })

  it('matches section titles using the provided localized sections map', () => {
    const sections = getNavigationSections('en')

    expect(titleContainsSection('Music', 'music', sections)).toBe(true)
    expect(titleContainsSection('_Gallery', 'gallery', sections)).toBe(true)
    expect(titleContainsSection('About', 'music', sections)).toBe(false)
  })

  it('matches accented localized titles without depending on exact diacritics', () => {
    const frenchSections = getNavigationSections('fr')
    const portugueseSections = getNavigationSections('pt-BR')
    const germanSections = getNavigationSections('de')

    expect(titleContainsSection('_À propos', 'about', frenchSections)).toBe(true)
    expect(titleContainsSection('_A propos', 'about', frenchSections)).toBe(true)
    expect(titleContainsSection('_Música', 'music', portugueseSections)).toBe(true)
    expect(titleContainsSection('_Musica', 'music', portugueseSections)).toBe(true)
    expect(titleContainsSection('_Über uns', 'about', germanSections)).toBe(true)
    expect(titleContainsSection('_Uber uns', 'about', germanSections)).toBe(true)
  })
})
