import { describe, expect, it } from 'vitest'

import { aboutMembersText } from '@/data/aboutMembersText'
import { appLocales, DEFAULT_APP_LOCALE, type AppLocale } from '@/i18n/locale'
import { navigationText } from '@/i18n/navigationText'
import { getUiText, uiText } from '@/i18n/uiText'

const collectLeafPaths = (value: unknown, prefix = ''): string[] => {
  if (typeof value === 'function') return [prefix]
  if (Array.isArray(value)) return [prefix]
  if (!value || typeof value !== 'object') return [prefix]

  return Object.entries(value as Record<string, unknown>)
    .flatMap(([key, child]) => collectLeafPaths(child, prefix ? `${prefix}.${key}` : key))
    .sort()
}

const englishUiPaths = collectLeafPaths(uiText[DEFAULT_APP_LOCALE])
const englishNavigationPaths = collectLeafPaths(navigationText[DEFAULT_APP_LOCALE])
const englishAboutPaths = collectLeafPaths(aboutMembersText[DEFAULT_APP_LOCALE])

const sampleUiOutputs = (locale: AppLocale) => {
  const t = getUiText(locale)

  return {
    gallery: {
      photosCount1: t.gallery.photosCount(1),
      photosCount2: t.gallery.photosCount(2),
    },
    music: {
      songsCount1: t.music.songsCount(1),
      songsCount2: t.music.songsCount(2),
      albumItemLabel: t.music.albumItemLabel('Tales From the Cellar', 2),
      playTrack: t.music.playTrack('Misled'),
      resumeTrack: t.music.resumeTrack('Misled'),
    },
    lyrics: t.lyrics,
    faders: {
      muteToggle: t.faders.muteToggle('Drums'),
      instrumentVolume: t.faders.instrumentVolume('Drums'),
    },
    status: t.status,
  }
}

describe('translation coverage', () => {
  it('includes the required english translation contract', () => {
    expect(englishNavigationPaths).toEqual([
      'about.headerTitle',
      'about.matchTokens',
      'about.title',
      'gallery.headerTitle',
      'gallery.matchTokens',
      'gallery.title',
      'home.headerTitle',
      'home.matchTokens',
      'home.title',
      'music.headerTitle',
      'music.matchTokens',
      'music.title',
    ])

    expect(englishAboutPaths).toEqual([
      'cami.badgeTitles',
      'cami.descriptionLead',
      'cami.descriptionTail',
      'cami.name',
      'edgar.badgeTitles',
      'edgar.descriptionLead',
      'edgar.name',
      'steff.badgeTitles',
      'steff.descriptionLead',
      'steff.descriptionTail',
      'steff.name',
      'tobi.badgeTitles',
      'tobi.descriptionLead',
      'tobi.name',
    ])

    expect(englishUiPaths).toEqual([
      'about.lyricsButton',
      'about.lyricsButtonAria',
      'about.membersButton',
      'about.membersButtonAria',
      'about.menuAriaLabel',
      'about.placeholderButtonAria',
      'about.storyButton',
      'about.storyButtonAria',
      'about.subHeaderTitle',
      'about.tabsButton',
      'about.tabsButtonAria',
      'credits.roles.art',
      'credits.roles.logoDesign',
      'credits.roles.webDesign',
      'credits.text',
      'faders.close',
      'faders.groupLabel',
      'faders.instrumentVolume',
      'faders.muteToggle',
      'faders.open',
      'faders.unavailableSuffix',
      'gallery.albumNavLabel',
      'gallery.albums',
      'gallery.clearFilters',
      'gallery.closeLightbox',
      'gallery.collapseLibrary',
      'gallery.collapseRail',
      'gallery.currentMonthLabel',
      'gallery.displayOptions',
      'gallery.expandLibrary',
      'gallery.expandRail',
      'gallery.filterDate',
      'gallery.filterLocation',
      'gallery.filterPeople',
      'gallery.filterPlaceholder',
      'gallery.filterSearchPlaceholder',
      'gallery.filterTags',
      'gallery.modeAlbums',
      'gallery.modeLabel',
      'gallery.modePhotos',
      'gallery.nextImage',
      'gallery.photoCredit',
      'gallery.photosCount',
      'gallery.prevImage',
      'gallery.resetZoom',
      'gallery.showTimeline',
      'gallery.squareThumbnails',
      'gallery.zoomControls',
      'gallery.zoomIn',
      'gallery.zoomLevel',
      'gallery.zoomOut',
      'languageSwitcher.ariaLabel',
      'languageSwitcher.currentLocaleLabel',
      'languageSwitcher.floatingAriaLabel',
      'languageSwitcher.options.br.acronym',
      'languageSwitcher.options.br.flag',
      'languageSwitcher.options.br.label',
      'languageSwitcher.options.de.acronym',
      'languageSwitcher.options.de.flag',
      'languageSwitcher.options.de.label',
      'languageSwitcher.options.en.acronym',
      'languageSwitcher.options.en.flag',
      'languageSwitcher.options.en.label',
      'languageSwitcher.options.fr.acronym',
      'languageSwitcher.options.fr.flag',
      'languageSwitcher.options.fr.label',
      'languageSwitcher.options.it.acronym',
      'languageSwitcher.options.it.flag',
      'languageSwitcher.options.it.label',
      'languageSwitcher.options.ru.acronym',
      'languageSwitcher.options.ru.flag',
      'languageSwitcher.options.ru.label',
      'logo.ariaLabel',
      'logo.logoAriaLabel',
      'logo.socialLinks',
      'lyrics.sync',
      'lyrics.syncToCurrent',
      'music.albumItemLabel',
      'music.albumLabel',
      'music.albumsNavLabel',
      'music.closeLyrics',
      'music.lyricsLoading',
      'music.noLyricsForTrack',
      'music.pauseAlbum',
      'music.playAlbum',
      'music.playTrack',
      'music.resumeTrack',
      'music.songsCount',
      'music.trackTitleHeader',
      'player.closePlayer',
      'player.disableRepeat',
      'player.disableShuffle',
      'player.enableRepeat',
      'player.enableShuffle',
      'player.hideLyrics',
      'player.mute',
      'player.nextTrack',
      'player.noLyrics',
      'player.pause',
      'player.play',
      'player.prevTrack',
      'player.repeatOne',
      'player.seek',
      'player.showLyrics',
      'player.toggleRepeat',
      'player.toggleShuffle',
      'player.unmute',
      'player.volume',
      'status.loading',
    ])
  })

  it('keeps all locales aligned with the english translation contract', () => {
    for (const locale of appLocales) {
      expect(collectLeafPaths(uiText[locale])).toEqual(englishUiPaths)
      expect(collectLeafPaths(navigationText[locale])).toEqual(englishNavigationPaths)
      expect(collectLeafPaths(aboutMembersText[locale])).toEqual(englishAboutPaths)
    }
  })

  it('captures representative localized outputs for dynamic labels', () => {
    expect(
      Object.fromEntries(appLocales.map((locale) => [locale, sampleUiOutputs(locale)]))
    ).toEqual({
      de: {
        faders: {
          instrumentVolume: 'Lautstärke Drums',
          muteToggle: 'Drums stummschalten',
        },
        gallery: {
          photosCount1: '1 Foto',
          photosCount2: '2 Fotos',
        },
        lyrics: {
          sync: 'Synchronisieren',
          syncToCurrent: 'Mit aktuellem Liedtext synchronisieren',
        },
        music: {
          albumItemLabel: 'Tales From the Cellar (2 Titel)',
          playTrack: 'Misled',
          resumeTrack: 'Misled',
          songsCount1: '1 Titel',
          songsCount2: '2 Titel',
        },
        status: {
          loading: 'Lädt...',
        },
      },
      en: {
        faders: {
          instrumentVolume: 'Drums volume',
          muteToggle: 'Drums mute toggle',
        },
        gallery: {
          photosCount1: '1 photo',
          photosCount2: '2 photos',
        },
        lyrics: {
          sync: 'Sync',
          syncToCurrent: 'Sync to current lyrics',
        },
        music: {
          albumItemLabel: 'Tales From the Cellar (2 songs)',
          playTrack: 'Play Misled',
          resumeTrack: 'Resume Misled',
          songsCount1: '1 song',
          songsCount2: '2 songs',
        },
        status: {
          loading: 'Loading...',
        },
      },
      fr: {
        faders: {
          instrumentVolume: 'Volume Drums',
          muteToggle: 'Couper Drums',
        },
        gallery: {
          photosCount1: '1 photo',
          photosCount2: '2 photos',
        },
        lyrics: {
          sync: 'Synchroniser',
          syncToCurrent: 'Se resynchroniser sur les paroles en cours',
        },
        music: {
          albumItemLabel: 'Tales From the Cellar (2 morceaux)',
          playTrack: 'Lire Misled',
          resumeTrack: 'Reprendre Misled',
          songsCount1: '1 morceau',
          songsCount2: '2 morceaux',
        },
        status: {
          loading: 'Chargement...',
        },
      },
      br: {
        faders: {
          instrumentVolume: 'Volume de Drums',
          muteToggle: 'Silenciar Drums',
        },
        gallery: {
          photosCount1: '1 foto',
          photosCount2: '2 fotos',
        },
        lyrics: {
          sync: 'Sincronizar',
          syncToCurrent: 'Sincronizar com a letra atual',
        },
        music: {
          albumItemLabel: 'Tales From the Cellar (2 faixas)',
          playTrack: 'Reproduzir Misled',
          resumeTrack: 'Retomar Misled',
          songsCount1: '1 faixa',
          songsCount2: '2 faixas',
        },
        status: {
          loading: 'Carregando...',
        },
      },
      it: {
        faders: {
          instrumentVolume: 'Volume Drums',
          muteToggle: 'Silenzia Drums',
        },
        gallery: {
          photosCount1: '1 foto',
          photosCount2: '2 foto',
        },
        lyrics: {
          sync: 'Sincronizza',
          syncToCurrent: 'Sincronizza con i testi attuali',
        },
        music: {
          albumItemLabel: 'Tales From the Cellar (2 brani)',
          playTrack: 'Riproduci Misled',
          resumeTrack: 'Riprendi Misled',
          songsCount1: '1 brano',
          songsCount2: '2 brani',
        },
        status: {
          loading: 'Caricamento...',
        },
      },
      ru: {
        faders: {
          instrumentVolume: 'Громкость Drums',
          muteToggle: 'Приглушить Drums',
        },
        gallery: {
          photosCount1: '1 фото',
          photosCount2: '2 фото',
        },
        lyrics: {
          sync: 'Синхронизировать',
          syncToCurrent: 'Синхронизировать с текущим текстом',
        },
        music: {
          albumItemLabel: 'Tales From the Cellar (2 треков)',
          playTrack: 'Воспроизвести Misled',
          resumeTrack: 'Продолжить Misled',
          songsCount1: '1 трек',
          songsCount2: '2 треков',
        },
        status: {
          loading: 'Загрузка...',
        },
      },
    })
  })
})
