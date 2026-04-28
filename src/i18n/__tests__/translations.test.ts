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
  it('freezes the english translation contract', () => {
    expect({
      aboutMembersText: englishAboutPaths,
      navigationText: englishNavigationPaths,
      uiText: englishUiPaths,
    }).toMatchInlineSnapshot(`
      {
        "aboutMembersText": [
          "cami.badgeTitles",
          "cami.descriptionLead",
          "cami.descriptionTail",
          "cami.name",
          "edgar.badgeTitles",
          "edgar.descriptionLead",
          "edgar.name",
          "steff.badgeTitles",
          "steff.descriptionLead",
          "steff.descriptionTail",
          "steff.name",
          "tobi.badgeTitles",
          "tobi.descriptionLead",
          "tobi.name",
        ],
        "navigationText": [
          "about.headerTitle",
          "about.matchTokens",
          "about.title",
          "gallery.headerTitle",
          "gallery.matchTokens",
          "gallery.title",
          "home.headerTitle",
          "home.matchTokens",
          "home.title",
          "music.headerTitle",
          "music.matchTokens",
          "music.title",
        ],
        "uiText": [
          "about.entryImageAlt",
          "about.lyricsButton",
          "about.lyricsButtonAria",
          "about.membersButton",
          "about.membersButtonAria",
          "about.menuAriaLabel",
          "about.placeholderButtonAria",
          "about.storyButton",
          "about.storyButtonAria",
          "about.subHeaderTitle",
          "about.triviaButton",
          "about.triviaButtonAria",
          "credits.roles.art",
          "credits.roles.logoDesign",
          "credits.roles.webDesign",
          "credits.text",
          "faders.close",
          "faders.groupLabel",
          "faders.instrumentVolume",
          "faders.muteToggle",
          "faders.open",
          "faders.unavailableSuffix",
          "gallery.albumNavLabel",
          "gallery.albums",
          "gallery.clearFilters",
          "gallery.closeLightbox",
          "gallery.collapseLibrary",
          "gallery.collapseRail",
          "gallery.currentMonthLabel",
          "gallery.displayOptions",
          "gallery.expandLibrary",
          "gallery.expandRail",
          "gallery.filterDate",
          "gallery.filterLocation",
          "gallery.filterPeople",
          "gallery.filterPlaceholder",
          "gallery.filterSearchPlaceholder",
          "gallery.filterTags",
          "gallery.modeAlbums",
          "gallery.modeLabel",
          "gallery.modePhotos",
          "gallery.nextImage",
          "gallery.photoCredit",
          "gallery.photosCount",
          "gallery.prevImage",
          "gallery.resetZoom",
          "gallery.showTimeline",
          "gallery.squareThumbnails",
          "gallery.zoomControls",
          "gallery.zoomIn",
          "gallery.zoomLevel",
          "gallery.zoomOut",
          "logo.ariaLabel",
          "logo.logoAriaLabel",
          "logo.socialLinks",
          "lyrics.sync",
          "lyrics.syncToCurrent",
          "music.albumItemLabel",
          "music.albumLabel",
          "music.albumsNavLabel",
          "music.closeLyrics",
          "music.lyricsLoading",
          "music.noLyricsForTrack",
          "music.pauseAlbum",
          "music.playAlbum",
          "music.playTrack",
          "music.resumeTrack",
          "music.songsCount",
          "music.trackTitleHeader",
          "player.closePlayer",
          "player.disableRepeat",
          "player.disableShuffle",
          "player.enableRepeat",
          "player.enableShuffle",
          "player.hideLyrics",
          "player.mute",
          "player.nextTrack",
          "player.noLyrics",
          "player.pause",
          "player.play",
          "player.prevTrack",
          "player.repeatOne",
          "player.seek",
          "player.showLyrics",
          "player.toggleRepeat",
          "player.toggleShuffle",
          "player.unmute",
          "player.volume",
          "status.loading",
        ],
      }
    `)
  })

  it('keeps all locales aligned with the english translation contract', () => {
    for (const locale of appLocales) {
      expect(collectLeafPaths(uiText[locale])).toEqual(englishUiPaths)
      expect(collectLeafPaths(navigationText[locale])).toEqual(englishNavigationPaths)
      expect(collectLeafPaths(aboutMembersText[locale])).toEqual(englishAboutPaths)
    }
  })

  it('captures representative localized outputs for dynamic labels', () => {
    expect(Object.fromEntries(appLocales.map((locale) => [locale, sampleUiOutputs(locale)])))
      .toMatchInlineSnapshot(`
      {
        "de": {
          "faders": {
            "instrumentVolume": "Drums Lautstärke",
            "muteToggle": "Drums stummschalten",
          },
          "gallery": {
            "photosCount1": "1 Foto",
            "photosCount2": "2 Fotos",
          },
          "lyrics": {
            "sync": "Synchronisieren",
            "syncToCurrent": "Mit aktuellem Liedtext synchronisieren",
          },
          "music": {
            "albumItemLabel": "Tales From the Cellar (2 Titel)",
            "playTrack": "Misled abspielen",
            "resumeTrack": "Misled fortsetzen",
            "songsCount1": "1 Titel",
            "songsCount2": "2 Titel",
          },
          "status": {
            "loading": "Lädt...",
          },
        },
        "en": {
          "faders": {
            "instrumentVolume": "Drums volume",
            "muteToggle": "Drums mute toggle",
          },
          "gallery": {
            "photosCount1": "1 photo",
            "photosCount2": "2 photos",
          },
          "lyrics": {
            "sync": "Sync",
            "syncToCurrent": "Sync to current lyrics",
          },
          "music": {
            "albumItemLabel": "Tales From the Cellar (2 songs)",
            "playTrack": "Play Misled",
            "resumeTrack": "Resume Misled",
            "songsCount1": "1 song",
            "songsCount2": "2 songs",
          },
          "status": {
            "loading": "Loading...",
          },
        },
        "fr": {
          "faders": {
            "instrumentVolume": "Volume de Drums",
            "muteToggle": "Couper Drums",
          },
          "gallery": {
            "photosCount1": "1 photo",
            "photosCount2": "2 photos",
          },
          "lyrics": {
            "sync": "Synchroniser",
            "syncToCurrent": "Se resynchroniser sur les paroles en cours",
          },
          "music": {
            "albumItemLabel": "Tales From the Cellar (2 morceaux)",
            "playTrack": "Lire Misled",
            "resumeTrack": "Reprendre Misled",
            "songsCount1": "1 morceau",
            "songsCount2": "2 morceaux",
          },
          "status": {
            "loading": "Chargement...",
          },
        },
        "pt-BR": {
          "faders": {
            "instrumentVolume": "Volume de Drums",
            "muteToggle": "Silenciar Drums",
          },
          "gallery": {
            "photosCount1": "1 foto",
            "photosCount2": "2 fotos",
          },
          "lyrics": {
            "sync": "Sincronizar",
            "syncToCurrent": "Sincronizar com a letra atual",
          },
          "music": {
            "albumItemLabel": "Tales From the Cellar (2 faixas)",
            "playTrack": "Reproduzir Misled",
            "resumeTrack": "Retomar Misled",
            "songsCount1": "1 faixa",
            "songsCount2": "2 faixas",
          },
          "status": {
            "loading": "Carregando...",
          },
        },
      }
    `)
  })
})
