import { DEFAULT_APP_LOCALE, type AppLocale } from '@/i18n/locale'

export interface DictParts {
  boldWord: string
  pronunciation: string
  definition: string
}

export interface StoryParagraph {
  id: string
  text: string
  isDictHeader?: boolean
  /** Pre-computed for `isDictHeader` paragraphs; undefined for all others. */
  dictParts?: DictParts
  linkText?: string
  linkHref?: string
  linkYtId?: string
  linkPreviewTitle?: string
  linkPreviewMetaPrimary?: string
  textAfterLink?: string
}

export type StoryText = {
  paragraphs: StoryParagraph[]
}

const aboutStoryTextByLocale: Record<AppLocale, StoryText> = {
  en: {
    paragraphs: [
      {
        id: 'definition',
        isDictHeader: true,
        text: `Frisches /ˈfrɪʃəs/\nadj. German for "fresh"`,
      },
      {
        id: 'founding',
        text: `In 2019, the musical landscape birthed a most wondrous offspring: Frisches. Nourished by Isar’s shimmering golden water – betwixt one draught and the next – Frisches was delivered into the world with one mission: to keep rock fresh. Its powerful beats, punchy bass and gritty riffs have struck a chord within the very marrow of men’s souls from that day hence.`,
      },
      {
        id: 'album',
        text: `The debut album, "Tales From The Cellar" is a collection of sonic poetry forged by its four creative minds, Camilla (vocals and flute), Tobi (bass), Steff (drums) and Edgar (guitar). Its tracks emerged within the walls of their underground rehearsal lab. In 2023 the band expanded their lore with the animated video clip of `,
        linkText: `"Witch Hunting"`,
        linkHref: 'https://www.youtube.com/watch?v=_rZYN5G6-gg',
        linkYtId: '_rZYN5G6-gg',
        linkPreviewTitle: 'Witch Hunting - Frisches (Official Music Video)',
        linkPreviewMetaPrimary: '2023',
        textAfterLink: ` was released, casting a veil of mystery over the group’s visual identity.`,
      },
      {
        id: 'closing',
        text: `Draw your cards, step through the Looking-glass and see what awaits on the other side.`,
      },
    ],
  },
  de: {
    paragraphs: [
      {
        id: 'definition',
        isDictHeader: true,
        text: `Frisches /ˈfrɪʃəs/\nAdj. Deutsch für "frisch"`,
      },
      {
        id: 'founding',
        text: `2019 gebar die Musikwelt ein wunderbares Geschöpf: Frisches. Genährt vom schimmernden goldenen Wasser der Isar – zwischen einem Schluck und dem nächsten – trat Frisches mit einer einzigen Mission an: Rock frisch zu halten. Seine kraftvollen Beats, der druckvolle Bass und kernige Riffs haben seitdem die Seelen der Menschen in ihrem Innersten getroffen.`,
      },
      {
        id: 'album',
        text: `Das Debütalbum "Tales From The Cellar" ist eine Sammlung klänglicher Poesie, geschmiedet von vier kreativen Köpfen: Camilla (Gesang und Flöte), Tobi (Bass), Steff (Schlagzeug) und Edgar (Gitarre). Die Tracks entstanden innerhalb der Mauern ihres unterirdischen Proberaums. 2023 erweiterte die Band ihre Legende mit dem animierten Videoclip zu `,
        linkText: `"Witch Hunting"`,
        linkHref: 'https://www.youtube.com/watch?v=_rZYN5G6-gg',
        linkYtId: '_rZYN5G6-gg',
        linkPreviewTitle: 'Witch Hunting - Frisches (offizielles Musikvideo)',
        linkPreviewMetaPrimary: '2023',
        textAfterLink: `, der dem visuellen Auftritt der Gruppe eine geheimnisvolle Aura verlieh.`,
      },
      {
        id: 'closing',
        text: `Ziehe deine Karten, tritt durch den Spiegel – und sieh, was auf der anderen Seite wartet.`,
      },
    ],
  },
  fr: {
    paragraphs: [
      {
        id: 'definition',
        isDictHeader: true,
        text: `Frisches /ˈfrɪʃəs/\nadj. Allemand pour "frais"`,
      },
      {
        id: 'founding',
        text: `En 2019, le paysage musical engendra une progéniture des plus merveilleuses : Frisches. Nourri des eaux dorées et scintillantes de l’Isar – entre une gorgée et la suivante – Frisches fut livré au monde avec une seule mission : garder le rock frais. Ses rythmes puissants, sa basse percutante et ses riffs granuleux ont touché une corde dans le tréfonds des âmes depuis ce jour.`,
      },
      {
        id: 'album',
        text: `L’album de début, "Tales From The Cellar", est une collection de poésie sonore forgée par ses quatre esprits créatifs : Camilla (chant et flûte), Tobi (basse), Steff (batterie) et Edgar (guitare). Ses titres ont émergé dans les murs de leur laboratoire de répétition souterrain. En 2023, le groupe a élargi sa légende avec le clip animé de `,
        linkText: `"Witch Hunting"`,
        linkHref: 'https://www.youtube.com/watch?v=_rZYN5G6-gg',
        linkYtId: '_rZYN5G6-gg',
        linkPreviewTitle: 'Witch Hunting - Frisches (Clip officiel)',
        linkPreviewMetaPrimary: '2023',
        textAfterLink: `, jetant un voile de mystère sur l’identité visuelle du groupe.`,
      },
      {
        id: 'closing',
        text: `Tirez vos cartes, franchissez le miroir – et découvrez ce qui vous attend de l’autre côté.`,
      },
    ],
  },
  br: {
    paragraphs: [
      {
        id: 'definition',
        isDictHeader: true,
        text: `Frisches /ˈfrɪʃəs/\nadj. Alemão para "fresco"`,
      },
      {
        id: 'founding',
        text: `Em 2019, o cenário musical gerou uma criatura das mais maravilhosas: Frisches. Nutrida pelas águas douradas e cintilantes do Isar – entre um gole e outro – Frisches chegou ao mundo com uma missão: manter o rock fresco. Suas poderosas batidas, baixo vibrante e riffs ásperos tocaram uma corda no próprio âmago das almas desde então.`,
      },
      {
        id: 'album',
        text: `O álbum de estreia, "Tales From The Cellar", é uma coleção de poesia sonora forjada por suas quatro mentes criativas: Camilla (vocais e flauta), Tobi (baixo), Steff (bateria) e Edgar (guitarra). Suas faixas emergiram dentro das paredes de seu laboratório de ensaio subterrâneo. Em 2023, a banda expandiu sua lenda com o clipe animado de `,
        linkText: `"Witch Hunting"`,
        linkHref: 'https://www.youtube.com/watch?v=_rZYN5G6-gg',
        linkYtId: '_rZYN5G6-gg',
        linkPreviewTitle: 'Witch Hunting - Frisches (Clipe Oficial)',
        linkPreviewMetaPrimary: '2023',
        textAfterLink: `, lançando um véu de mistério sobre a identidade visual do grupo.`,
      },
      {
        id: 'closing',
        text: `Tire suas cartas, atravesse o espelho – e veja o que aguarda do outro lado.`,
      },
    ],
  },
  it: {
    paragraphs: [
      {
        id: 'definition',
        isDictHeader: true,
        text: `Frisches /ˈfrɪʃəs/\nagg. Tedesco per "fresco"`,
      },
      {
        id: 'founding',
        text: `Nel 2019 il panorama musicale ha dato vita a una creatura straordinaria: Frisches. Nutrita dalle acque dorate e scintillanti dell’Isar – tra un sorso e l’altro – Frisches è stata consegnata al mondo con una sola missione: mantenere il rock fresco. I suoi beat potenti, il basso incisivo e i riff ruvidi hanno toccato nel profondo l’anima delle persone fin da quel giorno.`,
      },
      {
        id: 'album',
        text: `L’album di debutto, "Tales From The Cellar", è una raccolta di poesia sonora forgiata da quattro menti creative: Camilla (voce e flauto), Tobi (basso), Steff (batteria) ed Edgar (chitarra). I brani sono nati tra le pareti del loro laboratorio di prove sotterraneo. Nel 2023 la band ha ampliato la propria leggenda con il videoclip animato di `,
        linkText: `"Witch Hunting"`,
        linkHref: 'https://www.youtube.com/watch?v=_rZYN5G6-gg',
        linkYtId: '_rZYN5G6-gg',
        linkPreviewTitle: 'Witch Hunting - Frisches (Video musicale ufficiale)',
        linkPreviewMetaPrimary: '2023',
        textAfterLink: `, aggiungendo un velo di mistero all’identità visiva del gruppo.`,
      },
      {
        id: 'closing',
        text: `Pesca le tue carte, attraversa lo specchio e scopri cosa ti aspetta dall’altra parte.`,
      },
    ],
  },
  ru: {
    paragraphs: [
      {
        id: 'definition',
        isDictHeader: true,
        text: `Frisches /ˈfrɪʃəs/\nприл. Немецкое слово для «свежий»`,
      },
      {
        id: 'founding',
        text: `В 2019 году музыкальный мир породил по-настоящему удивительное явление: Frisches. Выросшая на сияющих золотых водах Изара – между одним глотком и следующим – Frisches пришла в мир с одной миссией: сохранять рок свежим. Её мощные биты, пробивной бас и шероховатые риффы с тех пор задевают душу до самой глубины.`,
      },
      {
        id: 'album',
        text: `Дебютный альбом «Tales From The Cellar» – это сборник звуковой поэзии, созданной четырьмя творческими умами: Camilla (вокал и флейта), Tobi (бас), Steff (барабаны) и Edgar (гитара). Эти треки родились в стенах их подземной репетиционной лаборатории. В 2023 году группа расширила свою легенду анимированным клипом на `,
        linkText: `"Witch Hunting"`,
        linkHref: 'https://www.youtube.com/watch?v=_rZYN5G6-gg',
        linkYtId: '_rZYN5G6-gg',
        linkPreviewTitle: 'Witch Hunting - Frisches (Официальный клип)',
        linkPreviewMetaPrimary: '2023',
        textAfterLink: `, что добавило ореол тайны в их визуальный образ.`,
      },
      {
        id: 'closing',
        text: `Тяни карту, перешагни через зеркало и увидь, что ждёт тебя по ту сторону.`,
      },
    ],
  },
}

export const getAboutStoryText = (locale: AppLocale): StoryText => {
  const raw = aboutStoryTextByLocale[locale] ?? aboutStoryTextByLocale[DEFAULT_APP_LOCALE]
  return {
    paragraphs: raw.paragraphs.map((para) =>
      para.isDictHeader ? { ...para, dictParts: parseDictHeaderText(para.text) } : para
    ),
  }
}

function parseDictHeaderText(text: string): DictParts {
  const newlineIdx = text.indexOf('\n')
  const firstLine = newlineIdx >= 0 ? text.slice(0, newlineIdx) : text
  const restLines = newlineIdx >= 0 ? text.slice(newlineIdx + 1) : ''
  const spaceIdx = firstLine.indexOf(' ')
  return {
    boldWord: spaceIdx >= 0 ? firstLine.slice(0, spaceIdx) : firstLine,
    pronunciation: spaceIdx >= 0 ? firstLine.slice(spaceIdx) : '',
    definition: restLines,
  }
}
