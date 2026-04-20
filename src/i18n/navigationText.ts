import { DEFAULT_APP_LOCALE, type AppLocale } from '@/i18n/locale'
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
  en: {
    home: {
      title: 'Home',
      headerTitle: '_Home',
      matchTokens: ['home'],
    },
    music: {
      title: 'Music',
      headerTitle: '_Music',
      matchTokens: ['music'],
    },
    about: {
      title: 'About',
      headerTitle: '_About',
      matchTokens: ['about'],
    },
    gallery: {
      title: 'Gallery',
      headerTitle: '_Gallery',
      matchTokens: ['gallery'],
    },
  },
  de: {
    home: {
      title: 'Home',
      headerTitle: '_Home',
      matchTokens: ['home'],
    },
    music: {
      title: 'Musik',
      headerTitle: '_Musik',
      matchTokens: ['musik', 'music'],
    },
    about: {
      title: 'Über uns',
      headerTitle: '_Über uns',
      matchTokens: ['about', 'über'],
    },
    gallery: {
      title: 'Galerie',
      headerTitle: '_Galerie',
      matchTokens: ['galerie', 'gallery'],
    },
  },
  fr: {
    home: {
      title: 'Accueil',
      headerTitle: '_Accueil',
      matchTokens: ['accueil', 'home'],
    },
    music: {
      title: 'Musique',
      headerTitle: '_Musique',
      matchTokens: ['musique', 'music'],
    },
    about: {
      title: 'À propos',
      headerTitle: '_À propos',
      matchTokens: ['about', 'à propos'],
    },
    gallery: {
      title: 'Galerie',
      headerTitle: '_Galerie',
      matchTokens: ['galerie', 'gallery'],
    },
  },
  'pt-BR': {
    home: {
      title: 'Início',
      headerTitle: '_Início',
      matchTokens: ['inicio', 'home'],
    },
    music: {
      title: 'Música',
      headerTitle: '_Música',
      matchTokens: ['musica', 'music'],
    },
    about: {
      title: 'Sobre',
      headerTitle: '_Sobre',
      matchTokens: ['sobre', 'about'],
    },
    gallery: {
      title: 'Galeria',
      headerTitle: '_Galeria',
      matchTokens: ['galeria', 'gallery'],
    },
  },
}

export const getNavigationText = (locale: AppLocale) =>
  navigationText[locale] ?? navigationText[DEFAULT_APP_LOCALE]
