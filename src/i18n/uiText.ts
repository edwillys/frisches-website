import { DEFAULT_APP_LOCALE, type AppLocale } from '@/i18n/locale'

export interface UiText {
  // Gallery
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
    // Lightbox
    closeLightbox: string
    prevImage: string
    nextImage: string
    zoomIn: string
    zoomOut: string
    resetZoom: string
    zoomControls: string
    zoomLevel: string
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
  // Music view / full audio page
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
  // Lyrics display controls
  lyrics: {
    syncToCurrent: string
    sync: string
  }
  // Instrument faders
  faders: {
    open: string
    close: string
    groupLabel: string
    muteToggle: (instrument: string) => string
    instrumentVolume: (instrument: string) => string
  }
  // Logo / general
  logo: {
    ariaLabel: string
    logoAriaLabel: string
    socialLinks: string
  }
  status: {
    loading: string
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
      modeLabel: 'Gallery mode',
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
      currentMonthLabel: 'Current month',
      photosCount: (n) => `${n} ${n === 1 ? 'photo' : 'photos'}`,
      closeLightbox: 'Close',
      prevImage: 'Previous image',
      nextImage: 'Next image',
      zoomIn: 'Zoom in',
      zoomOut: 'Zoom out',
      resetZoom: 'Reset zoom',
      zoomControls: 'Zoom controls',
      zoomLevel: 'Zoom level',
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
    music: {
      albumsNavLabel: 'Albums',
      albumLabel: 'Album',
      songsCount: (n) => `${n} ${n === 1 ? 'song' : 'songs'}`,
      albumItemLabel: (title, count) => `${title} (${count} ${count === 1 ? 'song' : 'songs'})`,
      playAlbum: 'Play album',
      pauseAlbum: 'Pause album',
      trackTitleHeader: 'Title',
      playTrack: (title) => `Play ${title}`,
      resumeTrack: (title) => `Resume ${title}`,
      closeLyrics: 'Close lyrics',
      lyricsLoading: 'Loading lyrics...',
      noLyricsForTrack: 'No lyrics available for this track',
    },
    lyrics: {
      syncToCurrent: 'Sync to current lyrics',
      sync: 'Sync',
    },
    faders: {
      open: 'Instrument faders',
      close: 'Close instrument faders',
      groupLabel: 'Instrument faders',
      muteToggle: (instrument) => `${instrument} mute toggle`,
      instrumentVolume: (instrument) => `${instrument} volume`,
    },
    logo: {
      ariaLabel: 'Frisches - Click to reveal menu',
      logoAriaLabel: 'Frisches',
      socialLinks: 'Social links',
    },
    status: {
      loading: 'Loading...',
    },
    credits: {
      text: 'Credits',
    },
  },
  de: {
    gallery: {
      modePhotos: 'Fotos',
      modeAlbums: 'Alben',
      modeLabel: 'Galeriemodus',
      collapseRail: 'Seitenleiste ausblenden',
      expandRail: 'Seitenleiste einblenden',
      collapseLibrary: 'Bibliothek ausblenden',
      expandLibrary: 'Bibliothek einblenden',
      filterPlaceholder: 'Filter',
      filterSearchPlaceholder: 'Suchen',
      clearFilters: 'Zurücksetzen',
      displayOptions: 'Anzeigeoptionen',
      squareThumbnails: 'Quadratisch (1:1)',
      showTimeline: 'Zeitstrahl anzeigen',
      photoCredit: 'Bildnachweis',
      currentMonthLabel: 'Aktueller Monat',
      photosCount: (n) => `${n} ${n === 1 ? 'Foto' : 'Fotos'}`,
      closeLightbox: 'Schließen',
      prevImage: 'Vorheriges Bild',
      nextImage: 'Nächstes Bild',
      zoomIn: 'Vergrößern',
      zoomOut: 'Verkleinern',
      resetZoom: 'Zoom zurücksetzen',
      zoomControls: 'Zoom-Steuerung',
      zoomLevel: 'Zoomstufe',
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
      seek: 'Abspielposition',
      showLyrics: 'Liedtext anzeigen',
      hideLyrics: 'Liedtext ausblenden',
      noLyrics: 'Kein Liedtext verfügbar',
      mute: 'Stummschalten',
      unmute: 'Stummschaltung aufheben',
      volume: 'Lautstärke',
      closePlayer: 'Player schließen',
    },
    music: {
      albumsNavLabel: 'Alben',
      albumLabel: 'Album',
      songsCount: (n) => `${n} Titel`,
      albumItemLabel: (title, count) => `${title} (${count} Titel)`,
      playAlbum: 'Album abspielen',
      pauseAlbum: 'Album pausieren',
      trackTitleHeader: 'Titel',
      playTrack: (title) => `${title} abspielen`,
      resumeTrack: (title) => `${title} fortsetzen`,
      closeLyrics: 'Liedtext schließen',
      lyricsLoading: 'Liedtext wird geladen...',
      noLyricsForTrack: 'Für diesen Titel ist kein Liedtext verfügbar',
    },
    lyrics: {
      syncToCurrent: 'Mit aktuellem Liedtext synchronisieren',
      sync: 'Synchronisieren',
    },
    faders: {
      open: 'Instrumentregler',
      close: 'Instrumentregler schließen',
      groupLabel: 'Instrumentregler',
      muteToggle: (instrument) => `${instrument} stummschalten`,
      instrumentVolume: (instrument) => `${instrument} Lautstärke`,
    },
    logo: {
      ariaLabel: 'Frisches – Klicken, um das Menü zu öffnen',
      logoAriaLabel: 'Frisches',
      socialLinks: 'Social-Links',
    },
    status: {
      loading: 'Lädt...',
    },
    credits: {
      text: 'Credits',
    },
  },
  fr: {
    gallery: {
      modePhotos: 'Photos',
      modeAlbums: 'Albums',
      modeLabel: 'Mode galerie',
      collapseRail: 'Réduire la barre latérale',
      expandRail: 'Développer la barre latérale',
      collapseLibrary: 'Réduire la bibliothèque',
      expandLibrary: 'Développer la bibliothèque',
      filterPlaceholder: 'Filtrer',
      filterSearchPlaceholder: 'Rechercher',
      clearFilters: 'Effacer',
      displayOptions: "Options d'affichage",
      squareThumbnails: 'Carré (1:1)',
      showTimeline: 'Afficher la chronologie',
      photoCredit: 'Crédit photo',
      currentMonthLabel: 'Mois en cours',
      photosCount: (n) => `${n} ${n === 1 ? 'photo' : 'photos'}`,
      closeLightbox: 'Fermer',
      prevImage: 'Image précédente',
      nextImage: 'Image suivante',
      zoomIn: 'Zoom avant',
      zoomOut: 'Zoom arrière',
      resetZoom: 'Réinitialiser le zoom',
      zoomControls: 'Commandes de zoom',
      zoomLevel: 'Niveau de zoom',
      filterPeople: 'Personnes',
      filterLocation: 'Lieu',
      filterTags: 'Tags',
      filterDate: 'Date',
      albums: 'Albums',
      albumNavLabel: 'Navigation des albums',
    },
    player: {
      enableShuffle: 'Activer la lecture aléatoire',
      disableShuffle: 'Désactiver la lecture aléatoire',
      toggleShuffle: 'Basculer la lecture aléatoire',
      prevTrack: 'Piste précédente',
      nextTrack: 'Piste suivante',
      play: 'Lecture',
      pause: 'Pause',
      enableRepeat: 'Activer la répétition',
      repeatOne: 'Répéter une piste',
      disableRepeat: 'Désactiver la répétition',
      toggleRepeat: 'Basculer la répétition',
      seek: 'Position de lecture',
      showLyrics: 'Afficher les paroles',
      hideLyrics: 'Masquer les paroles',
      noLyrics: 'Pas de paroles disponibles',
      mute: 'Couper le son',
      unmute: 'Rétablir le son',
      volume: 'Volume',
      closePlayer: 'Fermer le lecteur',
    },
    music: {
      albumsNavLabel: 'Albums',
      albumLabel: 'Album',
      songsCount: (n) => `${n} ${n === 1 ? 'morceau' : 'morceaux'}`,
      albumItemLabel: (title, count) =>
        `${title} (${count} ${count === 1 ? 'morceau' : 'morceaux'})`,
      playAlbum: "Lire l'album",
      pauseAlbum: "Mettre l'album en pause",
      trackTitleHeader: 'Titre',
      playTrack: (title) => `Lire ${title}`,
      resumeTrack: (title) => `Reprendre ${title}`,
      closeLyrics: 'Fermer les paroles',
      lyricsLoading: 'Chargement des paroles...',
      noLyricsForTrack: 'Aucune parole disponible pour ce titre',
    },
    lyrics: {
      syncToCurrent: 'Se resynchroniser sur les paroles en cours',
      sync: 'Synchroniser',
    },
    faders: {
      open: "Afficher les faders d'instruments",
      close: "Fermer les faders d'instruments",
      groupLabel: "Faders d'instruments",
      muteToggle: (instrument) => `Couper ${instrument}`,
      instrumentVolume: (instrument) => `Volume de ${instrument}`,
    },
    logo: {
      ariaLabel: 'Frisches – Cliquez pour afficher le menu',
      logoAriaLabel: 'Frisches',
      socialLinks: 'Réseaux sociaux',
    },
    status: {
      loading: 'Chargement...',
    },
    credits: {
      text: 'Crédits',
    },
  },
  'pt-BR': {
    gallery: {
      modePhotos: 'Fotos',
      modeAlbums: 'Álbuns',
      modeLabel: 'Modo da galeria',
      collapseRail: 'Recolher barra lateral',
      expandRail: 'Expandir barra lateral',
      collapseLibrary: 'Recolher biblioteca',
      expandLibrary: 'Expandir biblioteca',
      filterPlaceholder: 'Filtrar',
      filterSearchPlaceholder: 'Pesquisar',
      clearFilters: 'Limpar',
      displayOptions: 'Opções de exibição',
      squareThumbnails: 'Quadrado (1:1)',
      showTimeline: 'Mostrar linha do tempo',
      photoCredit: 'Crédito da foto',
      currentMonthLabel: 'Mês atual',
      photosCount: (n) => `${n} ${n === 1 ? 'foto' : 'fotos'}`,
      closeLightbox: 'Fechar',
      prevImage: 'Imagem anterior',
      nextImage: 'Próxima imagem',
      zoomIn: 'Aumentar o zoom',
      zoomOut: 'Diminuir o zoom',
      resetZoom: 'Redefinir o zoom',
      zoomControls: 'Controles de zoom',
      zoomLevel: 'Nível de zoom',
      filterPeople: 'Pessoas',
      filterLocation: 'Local',
      filterTags: 'Tags',
      filterDate: 'Data',
      albums: 'Álbuns',
      albumNavLabel: 'Navegação de álbuns',
    },
    player: {
      enableShuffle: 'Ativar modo aleatório',
      disableShuffle: 'Desativar modo aleatório',
      toggleShuffle: 'Alternar modo aleatório',
      prevTrack: 'Faixa anterior',
      nextTrack: 'Próxima faixa',
      play: 'Reproduzir',
      pause: 'Pausar',
      enableRepeat: 'Ativar repetição',
      repeatOne: 'Repetir uma faixa',
      disableRepeat: 'Desativar repetição',
      toggleRepeat: 'Alternar repetição',
      seek: 'Posição de reprodução',
      showLyrics: 'Mostrar letra',
      hideLyrics: 'Ocultar letra',
      noLyrics: 'Letra não disponível',
      mute: 'Silenciar',
      unmute: 'Ativar som',
      volume: 'Volume',
      closePlayer: 'Fechar player',
    },
    music: {
      albumsNavLabel: 'Álbuns',
      albumLabel: 'Álbum',
      songsCount: (n) => `${n} ${n === 1 ? 'faixa' : 'faixas'}`,
      albumItemLabel: (title, count) => `${title} (${count} ${count === 1 ? 'faixa' : 'faixas'})`,
      playAlbum: 'Reproduzir álbum',
      pauseAlbum: 'Pausar álbum',
      trackTitleHeader: 'Título',
      playTrack: (title) => `Reproduzir ${title}`,
      resumeTrack: (title) => `Retomar ${title}`,
      closeLyrics: 'Fechar letra',
      lyricsLoading: 'Carregando letra...',
      noLyricsForTrack: 'Nenhuma letra disponível para esta faixa',
    },
    lyrics: {
      syncToCurrent: 'Sincronizar com a letra atual',
      sync: 'Sincronizar',
    },
    faders: {
      open: 'Faders de instrumentos',
      close: 'Fechar faders de instrumentos',
      groupLabel: 'Faders de instrumentos',
      muteToggle: (instrument) => `Silenciar ${instrument}`,
      instrumentVolume: (instrument) => `Volume de ${instrument}`,
    },
    logo: {
      ariaLabel: 'Frisches – Clique para revelar o menu',
      logoAriaLabel: 'Frisches',
      socialLinks: 'Redes sociais',
    },
    status: {
      loading: 'Carregando...',
    },
    credits: {
      text: 'Créditos',
    },
  },
}

export const getUiText = (locale: AppLocale): UiText => uiText[locale] ?? uiText[DEFAULT_APP_LOCALE]
