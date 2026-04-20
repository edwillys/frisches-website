import { DEFAULT_APP_LOCALE, type AppLocale } from '@/i18n/locale'

export interface UiText {
  // Gallery
  gallery: {
    modePhotos: string
    modeAlbums: string
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
    photosCount: (n: number) => string
    // Lightbox
    closeLightbox: string
    prevImage: string
    nextImage: string
    zoomIn: string
    zoomOut: string
    resetZoom: string
    // Filter tree roots
    filterPeople: string
    filterLocation: string
    filterTags: string
    filterDate: string
    // Breadcrumb
    albums: string
    albumNavLabel: string
  }
  // Audio player
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
  // Instrument faders
  faders: {
    open: string
    close: string
    groupLabel: string
    muteToggle: (instrument: string) => string
    instrumentVolume: (instrument: string) => string
  }
  // Character selection (CharacterSelection.vue inline data)
  character: {
    groupDescription: string
  }
  // Logo / general
  logo: {
    ariaLabel: string
    logoAriaLabel: string
    socialLinks: string
  }
  // Footer credits
  credits: {
    text: string
  }
}

export const uiText: Record<AppLocale, UiText> = {
  en: {
    gallery: {
      modePhotos: 'Photos',
      modeAlbums: 'Albums',
      collapseRail: 'Collapse gallery sidebar',
      expandRail: 'Expand gallery sidebar',
      collapseLibrary: 'Collapse library',
      expandLibrary: 'Expand library',
      filterPlaceholder: 'Filter',
      filterSearchPlaceholder: 'Search',
      clearFilters: 'Clear',
      displayOptions: 'Display options',
      squareThumbnails: 'Square (1:1)',
      showTimeline: 'Show Timeline',
      photoCredit: 'Photo credit',
      photosCount: (n) => `${n} ${n === 1 ? 'photo' : 'photos'}`,
      closeLightbox: 'Close',
      prevImage: 'Previous',
      nextImage: 'Next',
      zoomIn: 'Zoom in',
      zoomOut: 'Zoom out',
      resetZoom: 'Reset zoom',
      filterPeople: 'People',
      filterLocation: 'Location',
      filterTags: 'Tags',
      filterDate: 'Date',
      albums: 'Albums',
      albumNavLabel: 'Album navigation',
    },
    player: {
      enableShuffle: 'Enable shuffle',
      disableShuffle: 'Disable shuffle',
      toggleShuffle: 'Toggle shuffle',
      prevTrack: 'Previous track',
      nextTrack: 'Next track',
      play: 'Play',
      pause: 'Pause',
      enableRepeat: 'Enable repeat',
      repeatOne: 'Repeat one',
      disableRepeat: 'Disable repeat',
      toggleRepeat: 'Toggle repeat',
      seek: 'Seek',
      showLyrics: 'Show lyrics',
      hideLyrics: 'Hide lyrics',
      noLyrics: 'No lyrics available',
      mute: 'Mute',
      unmute: 'Unmute',
      volume: 'Volume',
      closePlayer: 'Close player',
    },
    faders: {
      open: 'Instrument faders',
      close: 'Close instrument faders',
      groupLabel: 'Instrument faders',
      muteToggle: (instrument) => `${instrument} mute toggle`,
      instrumentVolume: (instrument) => `${instrument} volume`,
    },
    character: {
      groupDescription:
        'Powerful beats, punchy bass lines, gritty guitar riffs, touching solos and incisive lyrics. We embody rock in its purest form.',
    },
    logo: {
      ariaLabel: 'Frisches - Click to reveal menu',
      logoAriaLabel: 'Frisches',
      socialLinks: 'Social links',
    },
    credits: {
      text: 'Web Design by Edgar Lubicz · Art Design by Laurent Carcelle',
    },
  },
  de: {
    gallery: {
      modePhotos: 'Fotos',
      modeAlbums: 'Alben',
      collapseRail: 'Seitenleiste ausblenden',
      expandRail: 'Seitenleiste einblenden',
      collapseLibrary: 'Bibliothek ausblenden',
      expandLibrary: 'Bibliothek einblenden',
      filterPlaceholder: 'Filter',
      filterSearchPlaceholder: 'Suchen',
      clearFilters: 'Löschen',
      displayOptions: 'Anzeigeoptionen',
      squareThumbnails: 'Quadratisch (1:1)',
      showTimeline: 'Zeitstrahl anzeigen',
      photoCredit: 'Fotocredit',
      photosCount: (n) => `${n} ${n === 1 ? 'Foto' : 'Fotos'}`,
      closeLightbox: 'Schließen',
      prevImage: 'Zurück',
      nextImage: 'Weiter',
      zoomIn: 'Vergrößern',
      zoomOut: 'Verkleinern',
      resetZoom: 'Zoom zurücksetzen',
      filterPeople: 'Personen',
      filterLocation: 'Ort',
      filterTags: 'Tags',
      filterDate: 'Datum',
      albums: 'Alben',
      albumNavLabel: 'Albumnavigation',
    },
    player: {
      enableShuffle: 'Zufallswiedergabe aktivieren',
      disableShuffle: 'Zufallswiedergabe deaktivieren',
      toggleShuffle: 'Zufallswiedergabe umschalten',
      prevTrack: 'Vorheriger Titel',
      nextTrack: 'Nächster Titel',
      play: 'Abspielen',
      pause: 'Pause',
      enableRepeat: 'Wiederholen aktivieren',
      repeatOne: 'Einen Titel wiederholen',
      disableRepeat: 'Wiederholen deaktivieren',
      toggleRepeat: 'Wiederholen umschalten',
      seek: 'Suchen',
      showLyrics: 'Liedtext anzeigen',
      hideLyrics: 'Liedtext ausblenden',
      noLyrics: 'Kein Liedtext verfügbar',
      mute: 'Stummschalten',
      unmute: 'Stummschaltung aufheben',
      volume: 'Lautstärke',
      closePlayer: 'Player schließen',
    },
    faders: {
      open: 'Instrumentregler',
      close: 'Instrumentregler schließen',
      groupLabel: 'Instrumentregler',
      muteToggle: (instrument) => `${instrument} stummschalten`,
      instrumentVolume: (instrument) => `${instrument} Lautstärke`,
    },
    character: {
      groupDescription:
        'Kraftvolle Beats, prägnante Basslinien, raue Gitarrenriffs, berührende Soli und einprägsame Texte. Wir verkörpern Rock in seiner reinsten Form.',
    },
    logo: {
      ariaLabel: 'Frisches – Klicken um das Menü zu öffnen',
      logoAriaLabel: 'Frisches',
      socialLinks: 'Social-Links',
    },
    credits: {
      text: 'Webdesign von Edgar Lubicz · Grafikdesign von Laurent Carcelle',
    },
  },
}

export const getUiText = (locale: AppLocale): UiText => uiText[locale] ?? uiText[DEFAULT_APP_LOCALE]
