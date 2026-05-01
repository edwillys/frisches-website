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
  linkPreviewMetaSecondary?: string
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
        text: `Frisches /\u02c8fr\u026a\u0283\u0259s/\nadj. German for \u201cfresh\u201d`,
      },
      {
        id: 'founding',
        text: `In 2019, the musical landscape birthed a most wondrous offspring: Frisches. Nourished by Isar\u2019s shimmering golden water \u2013 betwixt one draught and the next \u2013 Frisches was delivered into the world with one mission: to keep rock fresh. Its powerful beats, punchy bass and gritty riffs have struck a chord within the very marrow of men\u2019s souls from that day hence.`,
      },
      {
        id: 'album',
        text: `The debut album, \u201cTales From The Cellar\u201d is a collection of sonic poetry forged by its four creative minds, Camilla (vocals and flute), Tobi (bass), Steff (drums) and Edgar (guitar). Its tracks emerged within the walls of their underground rehearsal lab. In 2023 the band expanded their lore with the animated video clip of `,
        linkText: `\u201cWitch Hunting\u201d`,
        linkHref: 'https://www.youtube.com/watch?v=_rZYN5G6-gg',
        linkYtId: '_rZYN5G6-gg',
        linkPreviewTitle: 'Witch Hunting - Frisches (Official Music Video)',
        linkPreviewMetaPrimary: '2023',
        linkPreviewMetaSecondary: '',
        textAfterLink: ` was released, casting a veil of mystery to the group\u2019s visual identity.`,
      },
      {
        id: 'closing',
        text: `Draw your card and step through the Looking-glass and see what awaits on the other side.`,
      },
    ],
  },
  de: {
    paragraphs: [
      {
        id: 'definition',
        isDictHeader: true,
        text: `Frisches /\u02c8fr\u026a\u0283\u0259s/\nAdj. Deutsch f\u00fcr \u201efrisch\u201c`,
      },
      {
        id: 'founding',
        text: `2019 gebar die Musikwelt ein wunderbares Gesch\u00f6pf: Frisches. Gen\u00e4hrt vom schimmernden goldenen Wasser der Isar \u2013 zwischen einem Schluck und dem n\u00e4chsten \u2013 trat Frisches mit einer einzigen Mission an: Rock frisch zu halten. Seine kraftvollen Beats, der druckvolle Bass und kernige Riffs haben seitdem die Seelen der Menschen in ihrem Innersten getroffen.`,
      },
      {
        id: 'album',
        text: `Das Deb\u00fctalbum \u201eTales From The Cellar\u201c ist eine Sammlung kl\u00e4nglicher Poesie, geschmiedet von vier kreativen K\u00f6pfen: Camilla (Gesang und Fl\u00f6te), Tobi (Bass), Steff (Schlagzeug) und Edgar (Gitarre). Die Tracks entstanden innerhalb der Mauern ihres unterirdischen Proberaums. 2023 erweiterte die Band ihre Legende mit dem animierten Videoclip zu `,
        linkText: `\u201eWitch Hunting\u201c`,
        linkHref: 'https://www.youtube.com/watch?v=_rZYN5G6-gg',
        linkYtId: '_rZYN5G6-gg',
        linkPreviewTitle: 'Witch Hunting - Frisches (offizielles Musikvideo)',
        linkPreviewMetaPrimary: '2023',
        linkPreviewMetaSecondary: '',
        textAfterLink: `, der dem visuellen Auftritt der Gruppe eine geheimnisvolle Aura verlieh.`,
      },
      {
        id: 'closing',
        text: `Ziehe deine Karte und tritt durch den Spiegel \u2013 und sieh, was auf der anderen Seite wartet.`,
      },
    ],
  },
  fr: {
    paragraphs: [
      {
        id: 'definition',
        isDictHeader: true,
        text: `Frisches /\u02c8fr\u026a\u0283\u0259s/\nadj. Allemand pour \u00ab\u00a0frais\u00a0\u00bb`,
      },
      {
        id: 'founding',
        text: `En 2019, le paysage musical engendra une prog\u00e9niture des plus merveilleuses\u00a0: Frisches. Nourri des eaux dor\u00e9es et scintillantes de l\u2019Isar \u2013 entre une gorg\u00e9e et la suivante \u2013 Frisches fut livr\u00e9 au monde avec une seule mission\u00a0: garder le rock frais. Ses rythmes puissants, sa basse percutante et ses riffs granuleux ont touch\u00e9 une corde dans le tr\u00e9fonds des \u00e2mes depuis ce jour.`,
      },
      {
        id: 'album',
        text: `L\u2019album de d\u00e9but, \u00ab\u00a0Tales From The Cellar\u00a0\u00bb, est une collection de po\u00e9sie sonore forg\u00e9e par ses quatre esprits cr\u00e9atifs\u00a0: Camilla (chant et fl\u00fbte), Tobi (basse), Steff (batterie) et Edgar (guitare). Ses titres ont \u00e9merg\u00e9 dans les murs de leur laboratoire de r\u00e9p\u00e9tition souterrain. En 2023, le groupe a \u00e9largi sa l\u00e9gende avec le clip anim\u00e9 de `,
        linkText: `\u00ab\u00a0Witch Hunting\u00a0\u00bb`,
        linkHref: 'https://www.youtube.com/watch?v=_rZYN5G6-gg',
        linkYtId: '_rZYN5G6-gg',
        linkPreviewTitle: 'Witch Hunting - Frisches (Clip officiel)',
        linkPreviewMetaPrimary: '2023',
        linkPreviewMetaSecondary: '',
        textAfterLink: `, jetant un voile de myst\u00e8re sur l\u2019identit\u00e9 visuelle du groupe.`,
      },
      {
        id: 'closing',
        text: `Tirez votre carte et franchissez le miroir \u2013 et d\u00e9couvrez ce qui vous attend de l\u2019autre c\u00f4t\u00e9.`,
      },
    ],
  },
  'pt-BR': {
    paragraphs: [
      {
        id: 'definition',
        isDictHeader: true,
        text: `Frisches /\u02c8fr\u026a\u0283\u0259s/\nadj. Alem\u00e3o para \u201cfresco\u201d`,
      },
      {
        id: 'founding',
        text: `Em 2019, o cen\u00e1rio musical gerou uma criatura das mais maravilhosas: Frisches. Nutrida pelas \u00e1guas douradas e cintilantes do Isar \u2013 entre um gole e outro \u2013 Frisches chegou ao mundo com uma miss\u00e3o: manter o rock fresco. Suas poderosas batidas, baixo vibrante e riffs \u00e1speros tocaram uma corda no pr\u00f3prio \u00e2mago das almas desde ent\u00e3o.`,
      },
      {
        id: 'album',
        text: `O \u00e1lbum de estreia, \u201cTales From The Cellar\u201d, \u00e9 uma cole\u00e7\u00e3o de poesia sonora forjada por suas quatro mentes criativas: Camilla (vocais e flauta), Tobi (baixo), Steff (bateria) e Edgar (guitarra). Suas faixas emergiram dentro das paredes de seu laborat\u00f3rio de ensaio subterr\u00e2neo. Em 2023, a banda expandiu sua lenda com o clipe animado de `,
        linkText: `\u201cWitch Hunting\u201d`,
        linkHref: 'https://www.youtube.com/watch?v=_rZYN5G6-gg',
        linkYtId: '_rZYN5G6-gg',
        linkPreviewTitle: 'Witch Hunting - Frisches (Clipe Oficial)',
        linkPreviewMetaPrimary: '2023',
        linkPreviewMetaSecondary: '',
        textAfterLink: `, lan\u00e7ando um v\u00e9u de mist\u00e9rio sobre a identidade visual do grupo.`,
      },
      {
        id: 'closing',
        text: `Puxe sua carta e atravesse o espelho \u2013 e veja o que aguarda do outro lado.`,
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
