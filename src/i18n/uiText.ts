import { getAppMessages } from '@/i18n'
import { DEFAULT_APP_LOCALE, type AppLocale } from '@/i18n/locale'

export interface UiText {
  gallery: {
    modePhotos: string
    modeAlbums: string
    modeLabel: string
    collapseRail: string
    expandRail: string
    collapseLibrary: string
    expandLibrary: string
    filterPlaceholder: string
    filterSearchPlaceholder: string
    clearFilters: string
    displayOptions: string
    squareThumbnails: string
    showTimeline: string
    photoCredit: string
    currentMonthLabel: string
    photosCount: (n: number) => string
    closeLightbox: string
    prevImage: string
    nextImage: string
    zoomIn: string
    zoomOut: string
    resetZoom: string
    zoomControls: string
    zoomLevel: string
    filterPeople: string
    filterLocation: string
    filterTags: string
    filterDate: string
    albums: string
    albumNavLabel: string
  }
  player: {
    enableShuffle: string
    disableShuffle: string
    toggleShuffle: string
    prevTrack: string
    nextTrack: string
    play: string
    pause: string
    enableRepeat: string
    repeatOne: string
    disableRepeat: string
    toggleRepeat: string
    seek: string
    showLyrics: string
    hideLyrics: string
    noLyrics: string
    mute: string
    unmute: string
    volume: string
    closePlayer: string
  }
  music: {
    albumsNavLabel: string
    albumLabel: string
    songsCount: (n: number) => string
    albumItemLabel: (title: string, count: number) => string
    playAlbum: string
    pauseAlbum: string
    trackTitleHeader: string
    playTrack: (title: string) => string
    resumeTrack: (title: string) => string
    closeLyrics: string
    lyricsLoading: string
    noLyricsForTrack: string
  }
  lyrics: {
    syncToCurrent: string
    sync: string
  }
  about: {
    subHeaderTitle: string
    menuAriaLabel: string
    storyButton: string
    membersButton: string
    lyricsButton: string
    tabsButton: string
    storyButtonAria: string
    membersButtonAria: string
    lyricsButtonAria: string
    tabsButtonAria: string
    placeholderButtonAria: string
  }
  faders: {
    open: string
    close: string
    groupLabel: string
    muteToggle: (instrument: string) => string
    instrumentVolume: (instrument: string) => string
    contextMenuMute: string
    contextMenuSolo: string
    contextMenuUnsolo: string
    contextMenuSoloInGroup: string
    contextMenuUnsoloInGroup: string
    muteAll: string
    unmuteAll: string
    soloAll: string
    unsoloAll: string
    unavailableSuffix: string
  }
  logo: {
    ariaLabel: string
    logoAriaLabel: string
    socialLinks: string
  }
  status: {
    loading: string
  }
  credits: {
    text: string
    roles: {
      webDesign: string
      art: string
      logoDesign: string
    }
  }
  languageSwitcher: {
    ariaLabel: string
    floatingAriaLabel: string
    currentLocaleLabel: string
    options: Record<AppLocale, { label: string; acronym: string; flag: string }>
  }
}

const buildCountLabel = (count: number, one: string, other: string) =>
  `${count} ${count === 1 ? one : other}`

const buildInstrumentLabel = (
  locale: AppLocale,
  instrument: string,
  word: string,
  kind: 'mute' | 'volume'
) => {
  if (kind === 'mute') {
    if (locale === 'fr' || locale === 'br' || locale === 'it' || locale === 'ru') {
      return `${word} ${instrument}`
    }

    return `${instrument} ${word}`
  }

  if (locale === 'de' || locale === 'fr' || locale === 'br' || locale === 'it' || locale === 'ru') {
    return `${word} ${instrument}`
  }

  return `${instrument} ${word}`
}

const buildUiText = (locale: AppLocale): UiText => {
  const messages = getAppMessages(locale)

  return {
    gallery: {
      modePhotos: messages.gallery.modePhotos,
      modeAlbums: messages.gallery.modeAlbums,
      modeLabel: messages.gallery.modeLabel,
      collapseRail: messages.gallery.collapseRail,
      expandRail: messages.gallery.expandRail,
      collapseLibrary: messages.gallery.collapseLibrary,
      expandLibrary: messages.gallery.expandLibrary,
      filterPlaceholder: messages.gallery.filterPlaceholder,
      filterSearchPlaceholder: messages.gallery.filterSearchPlaceholder,
      clearFilters: messages.gallery.clearFilters,
      displayOptions: messages.gallery.displayOptions,
      squareThumbnails: messages.gallery.squareThumbnails,
      showTimeline: messages.gallery.showTimeline,
      photoCredit: messages.gallery.photoCredit,
      currentMonthLabel: messages.gallery.currentMonthLabel,
      photosCount: (count) =>
        buildCountLabel(
          count,
          messages.gallery.photosCount.one,
          messages.gallery.photosCount.other
        ),
      closeLightbox: messages.gallery.closeLightbox,
      prevImage: messages.gallery.prevImage,
      nextImage: messages.gallery.nextImage,
      zoomIn: messages.gallery.zoomIn,
      zoomOut: messages.gallery.zoomOut,
      resetZoom: messages.gallery.resetZoom,
      zoomControls: messages.gallery.zoomControls,
      zoomLevel: messages.gallery.zoomLevel,
      filterPeople: messages.gallery.filterPeople,
      filterLocation: messages.gallery.filterLocation,
      filterTags: messages.gallery.filterTags,
      filterDate: messages.gallery.filterDate,
      albums: messages.gallery.albums,
      albumNavLabel: messages.gallery.albumNavLabel,
    },
    player: {
      enableShuffle: messages.player.enableShuffle,
      disableShuffle: messages.player.disableShuffle,
      toggleShuffle: messages.player.toggleShuffle,
      prevTrack: messages.player.prevTrack,
      nextTrack: messages.player.nextTrack,
      play: messages.player.play,
      pause: messages.player.pause,
      enableRepeat: messages.player.enableRepeat,
      repeatOne: messages.player.repeatOne,
      disableRepeat: messages.player.disableRepeat,
      toggleRepeat: messages.player.toggleRepeat,
      seek: messages.player.seek,
      showLyrics: messages.player.showLyrics,
      hideLyrics: messages.player.hideLyrics,
      noLyrics: messages.player.noLyrics,
      mute: messages.player.mute,
      unmute: messages.player.unmute,
      volume: messages.player.volume,
      closePlayer: messages.player.closePlayer,
    },
    music: {
      albumsNavLabel: messages.music.albumsNavLabel,
      albumLabel: messages.music.albumLabel,
      songsCount: (count) =>
        buildCountLabel(count, messages.music.songsCount.one, messages.music.songsCount.other),
      albumItemLabel: (title, count) =>
        `${title} (${buildCountLabel(
          count,
          messages.music.albumItemLabel.one,
          messages.music.albumItemLabel.other
        )})`,
      playAlbum: messages.music.playAlbum,
      pauseAlbum: messages.music.pauseAlbum,
      trackTitleHeader: messages.music.trackTitleHeader,
      playTrack: (title) =>
        locale === 'de'
          ? `${title} ${messages.music.playTrackPrefix}`.trim()
          : `${messages.music.playTrackPrefix} ${title}`.trim(),
      resumeTrack: (title) =>
        locale === 'de'
          ? `${title} ${messages.music.resumeTrackPrefix}`.trim()
          : `${messages.music.resumeTrackPrefix} ${title}`.trim(),
      closeLyrics: messages.music.closeLyrics,
      lyricsLoading: messages.music.lyricsLoading,
      noLyricsForTrack: messages.music.noLyricsForTrack,
    },
    lyrics: {
      syncToCurrent: messages.lyrics.syncToCurrent,
      sync: messages.lyrics.sync,
    },
    about: {
      subHeaderTitle: messages.about.subHeaderTitle,
      menuAriaLabel: messages.about.menuAriaLabel,
      storyButton: messages.about.storyButton,
      membersButton: messages.about.membersButton,
      lyricsButton: messages.about.lyricsButton,
      tabsButton: messages.about.tabsButton,
      storyButtonAria: messages.about.storyButtonAria,
      membersButtonAria: messages.about.membersButtonAria,
      lyricsButtonAria: messages.about.lyricsButtonAria,
      tabsButtonAria: messages.about.tabsButtonAria,
      placeholderButtonAria: messages.about.placeholderButtonAria,
    },
    faders: {
      open: messages.faders.open,
      close: messages.faders.close,
      groupLabel: messages.faders.groupLabel,
      muteToggle: (instrument) =>
        buildInstrumentLabel(locale, instrument, messages.faders.muteToggleSuffix, 'mute'),
      instrumentVolume: (instrument) =>
        buildInstrumentLabel(locale, instrument, messages.faders.instrumentVolumePrefix, 'volume'),
      contextMenuMute: messages.faders.contextMenuMute,
      contextMenuSolo: messages.faders.contextMenuSolo,
      contextMenuUnsolo: messages.faders.contextMenuUnsolo,
      contextMenuSoloInGroup: messages.faders.contextMenuSoloInGroup,
      contextMenuUnsoloInGroup: messages.faders.contextMenuUnsoloInGroup,
      muteAll: messages.faders.muteAll,
      unmuteAll: messages.faders.unmuteAll,
      soloAll: messages.faders.soloAll,
      unsoloAll: messages.faders.unsoloAll,
      unavailableSuffix: ` ${messages.faders.unavailableSuffix}`,
    },
    logo: {
      ariaLabel: messages.logo.ariaLabel,
      logoAriaLabel: messages.logo.logoAriaLabel,
      socialLinks: messages.logo.socialLinks,
    },
    status: {
      loading: messages.status.loading,
    },
    credits: {
      text: messages.credits.text,
      roles: {
        webDesign: messages.credits.roles.webDesign,
        art: messages.credits.roles.art,
        logoDesign: messages.credits.roles.logoDesign,
      },
    },
    languageSwitcher: {
      ariaLabel: messages.languageSwitcher.ariaLabel,
      floatingAriaLabel: messages.languageSwitcher.floatingAriaLabel,
      currentLocaleLabel: messages.languageSwitcher.currentLocaleLabel,
      options: messages.languageSwitcher.options,
    },
  }
}

export const uiText: Record<AppLocale, UiText> = {
  en: buildUiText('en'),
  de: buildUiText('de'),
  fr: buildUiText('fr'),
  br: buildUiText('br'),
  it: buildUiText('it'),
  ru: buildUiText('ru'),
}

export const getUiText = (locale: AppLocale): UiText => uiText[locale] ?? uiText[DEFAULT_APP_LOCALE]
