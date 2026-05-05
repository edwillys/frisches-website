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
        text: `Frisches /ˈfrɪʃəs/\nAdj. deutsch für "frisch"`,
      },
      {
        id: 'founding',
        text: `2019 brachte die Musikwelt ein wunderbares Geschöpf hervor: Frisches. Getränkt vom goldschimmernden Wasser der Isar – irgendwo zwischen einem Schluck und dem nächsten – kam Frisches mit nur einer Mission zur Welt: Rock frisch zu halten. Wuchtige Beats, ein druckvoller Bass und raue Riffs treffen seitdem mitten ins Mark.`,
      },
      {
        id: 'album',
        text: `Das Debütalbum "Tales From The Cellar" ist eine Sammlung klanggewordener Poesie, geschmiedet von vier kreativen Köpfen: Camilla (Gesang und Flöte), Tobi (Bass), Steff (Schlagzeug) und Edgar (Gitarre). Die Songs entstanden zwischen den Wänden ihres unterirdischen Proberaums. 2023 spann die Band ihre eigene Legende mit dem animierten Videoclip zu `,
        linkText: `"Witch Hunting"`,
        linkHref: 'https://www.youtube.com/watch?v=_rZYN5G6-gg',
        linkYtId: '_rZYN5G6-gg',
        linkPreviewTitle: 'Witch Hunting - Frisches (offizielles Musikvideo)',
        linkPreviewMetaPrimary: '2023',
        textAfterLink: ` weiter und verlieh ihrem visuellen Auftritt einen Schleier aus Geheimnis.`,
      },
      {
        id: 'closing',
        text: `Zieh deine Karten, tritt durch den Spiegel und sieh nach, was auf der anderen Seite auf dich wartet.`,
      },
    ],
  },
  fr: {
    paragraphs: [
      {
        id: 'definition',
        isDictHeader: true,
        text: `Frisches /ˈfrɪʃəs/\nadj. Mot allemand signifiant "frais"`,
      },
      {
        id: 'founding',
        text: `En 2019, le paysage musical a vu surgir une créature comme on n’en fait pas deux : Frisches. Nourri aux eaux dorées de l’Isar, quelque part entre une gorgée et la suivante, Frisches est arrivé avec une seule mission : garder le rock bien frais. Depuis, ses rythmes massifs, sa basse qui cogne et ses riffs rugueux viennent remuer les tripes.`,
      },
      {
        id: 'album',
        text: `Le premier album, "Tales From The Cellar", est un recueil de poésie sonore façonné par quatre têtes créatives : Camilla (chant et flûte), Tobi (basse), Steff (batterie) et Edgar (guitare). Les morceaux ont pris forme dans leur repaire de répétition souterrain. En 2023, le groupe a encore épaissi son mythe avec le clip animé de `,
        linkText: `"Witch Hunting"`,
        linkHref: 'https://www.youtube.com/watch?v=_rZYN5G6-gg',
        linkYtId: '_rZYN5G6-gg',
        linkPreviewTitle: 'Witch Hunting - Frisches (Clip officiel)',
        linkPreviewMetaPrimary: '2023',
        textAfterLink: `, qui a posé un voile de mystère supplémentaire sur l’identité visuelle du groupe.`,
      },
      {
        id: 'closing',
        text: `Tirez vos cartes, passez de l’autre côté du miroir et voyez ce qui vous y attend.`,
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
        text: `Em 2019, o cenário musical acolheu a mais maravilhosa criatura: Frisches. Nutrida pelas águas douradas e cintilantes do Isar – entre um gole e outro – Frisches veio ao mundo com uma só missão: refrescar o rock. Suas poderosas levadas, linhas de baixo vibrantes e riffs cativantes vêm tocando o âmago da alma de cada humano desde então.`,
      },
      {
        id: 'album',
        text: `O álbum de estreia, "Tales From The Cellar", é uma coleção de poesias sonoras concebida por suas quatro mentes criativas: Camilla (vocais e flauta), Tobi (baixo), Steff (bateria) e Edgar (guitarra). Cada faixa emergiu entre as paredes subterrâneas do laboratório de ensaio do grupo. Em 2023, a banda expandiu os horizontes com o clipe de animação de `,
        linkText: `"Witch Hunting"`,
        linkHref: 'https://www.youtube.com/watch?v=_rZYN5G6-gg',
        linkYtId: '_rZYN5G6-gg',
        linkPreviewTitle: 'Witch Hunting - Frisches (Clipe Oficial)',
        linkPreviewMetaPrimary: '2023',
        textAfterLink: `, lançando um véu de mistério e consolidando sua identidade visual.`,
      },
      {
        id: 'closing',
        text: `Tire sua carta; atravesse o espelho e verá o que te aguarda do outro lado.`,
      },
    ],
  },
  it: {
    paragraphs: [
      {
        id: 'definition',
        isDictHeader: true,
        text: `Frisches /ˈfrɪʃəs/\nagg. In tedesco: "fresco"`,
      },
      {
        id: 'founding',
        text: `Nel 2019 il panorama musicale ha dato alla luce una creatura fuori dal comune: Frisches. Nutrita dalle acque dorate dell’Isar, tra un sorso e l’altro, Frisches è arrivata con una sola missione: tenere il rock sempre fresco. Beat poderosi, basso che spinge e riff ruvidi colpiscono da allora dritti allo stomaco.`,
      },
      {
        id: 'album',
        text: `L’album d’esordio, "Tales From The Cellar", è una raccolta di poesia sonora forgiata da quattro menti creative: Camilla (voce e flauto), Tobi (basso), Steff (batteria) ed Edgar (chitarra). I brani sono nati fra le pareti del loro covo di prova sotterraneo. Nel 2023 la band ha allargato ulteriormente la propria leggenda con il videoclip animato di `,
        linkText: `"Witch Hunting"`,
        linkHref: 'https://www.youtube.com/watch?v=_rZYN5G6-gg',
        linkYtId: '_rZYN5G6-gg',
        linkPreviewTitle: 'Witch Hunting - Frisches (Video musicale ufficiale)',
        linkPreviewMetaPrimary: '2023',
        textAfterLink: `, aggiungendo un ulteriore velo di mistero all’identità visiva del gruppo.`,
      },
      {
        id: 'closing',
        text: `Pesca le tue carte, attraversa lo specchio e scopri che cosa ti aspetta dall’altra parte.`,
      },
    ],
  },
  ru: {
    paragraphs: [
      {
        id: 'definition',
        isDictHeader: true,
        text: `Frisches /ˈfrɪʃəs/\nприл. По-немецки — «свежий»`,
      },
      {
        id: 'founding',
        text: `В 2019 году музыкальный мир породил по-настоящему дивное создание: Frisches. Вскормленная золотистыми водами Изара где-то между одним глотком и следующим, группа явилась в мир с одной-единственной миссией: держать рок свежим. С тех пор её мощный бит, пробивной бас и шероховатые риффы бьют прямо в нутро.`,
      },
      {
        id: 'album',
        text: `Дебютный альбом «Tales From The Cellar» — это коллекция звуковой поэзии, собранная четырьмя творческими умами: Camilla (вокал и флейта), Tobi (бас), Steff (барабаны) и Edgar (гитара). Эти песни родились в стенах их подземного репетиционного логова. В 2023 году группа дополнила собственную легенду анимированным клипом на `,
        linkText: `"Witch Hunting"`,
        linkHref: 'https://www.youtube.com/watch?v=_rZYN5G6-gg',
        linkYtId: '_rZYN5G6-gg',
        linkPreviewTitle: 'Witch Hunting - Frisches (Официальный клип)',
        linkPreviewMetaPrimary: '2023',
        textAfterLink: `, добавив ещё один слой тайны к их визуальному образу.`,
      },
      {
        id: 'closing',
        text: `Тяни карту, шагни по ту сторону зеркала и посмотри, что ждёт тебя там.`,
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
