import { DEFAULT_APP_LOCALE, type AppLocale } from '@/i18n/locale'

export type AboutMemberTextId = 'edgar' | 'cami' | 'steff' | 'tobi'

export interface AboutMemberTextEntry {
  name: string
  avatarAlt: string
  badgeTitles: string[]
  descriptionLead: string
  descriptionTail?: string
}

export const aboutMembersText: Record<
  AppLocale,
  Record<AboutMemberTextId, AboutMemberTextEntry>
> = {
  en: {
    edgar: {
      name: 'Edgar',
      avatarAlt: 'Portrait of Edgar',
      badgeTitles: ['Guitar', 'Backing Vocals'],
      descriptionLead:
        'Joined in 2019 with a stack of riffs that were somehow both too loud and too elegant. Edgar still chases Zeppelin-sized weight with Beatles melody, keeps a suspicious number of alternate intros in reserve, and still points to',
      descriptionTail:
        'when the band wants a song that feels like a cellar storm learning table manners.',
    },
    cami: {
      name: 'Cami',
      avatarAlt: 'Portrait of Cami',
      badgeTitles: ['Singer', 'Flute'],
      descriptionLead:
        'Flautist and singer – and a bit of a saxophonist – Cami grew up with the Beatles and loves the sound of the 60s and 70s. Alongside her classical training on the transverse flute, pop, rock, glam rock and progressive rock – Elton John, David Bowie, Pink Floyd, King Crimson, Jethro Tull, Led Zeppelin, Jimi Hendrix and Janis Joplin – have shaped her musical journey and still accompany her every day. She calls',
      descriptionTail: 'the clearest proof that it is always worth chasing a white tiger.',
    },
    steff: {
      name: 'Steff',
      avatarAlt: 'Portrait of Steff',
      badgeTitles: ['Drums'],
      descriptionLead:
        'Steff joined in 2021, brought order to the chaos, and then quietly improved the chaos anyway. Pink Floyd patience and Zeppelin punch sit side by side in his playing, and he still swears',
      descriptionTail:
        'is the best example of a groove tightening its tie without losing its grin.',
    },
    tobi: {
      name: 'Tobi',
      avatarAlt: 'Portrait of Tobi',
      badgeTitles: ['Bass'],
      descriptionLead:
        'Tobi locked in during 2022 with the sort of bass lines that make every chorus feel heavier without asking permission. His ear lives somewhere between Hendrix swagger and Red Hot Chili Peppers momentum, and he still says',
      descriptionTail:
        'was discovered because nobody in the room could find a good reason to stop the riff.',
    },
  },
  de: {
    edgar: {
      name: 'Edgar',
      avatarAlt: 'Portrait von Edgar',
      badgeTitles: ['Gitarre', 'Backingvocals'],
      descriptionLead:
        'Seit 2019 mit einem Arsenal an Riffs, die irgendwie gleichzeitig zu laut und zu elegant sind. Edgar jagt noch immer Zeppelin-große Wucht mit Beatles-Melodie, hält verdächtig viele alternative Intros in Reserve, und zeigt immer noch auf',
      descriptionTail:
        'wenn die Band einen Song sucht, der klingt wie ein Keller-Sturm, der Tischmanieren lernt.',
    },
    cami: {
      name: 'Cami',
      avatarAlt: 'Portrait von Cami',
      badgeTitles: ['Gesang', 'Flöte'],
      descriptionLead:
        'Flötistin und Sängerin – und ein bisschen Saxophonistin – ist Cami mit den Beatles aufgewachsen und liebt den Sound der 60er und 70er. Neben dem klassischen Studium der Querflöte haben Pop, Rock, Glamrock und Progressive Rock – Elton John, David Bowie, Pink Floyd, King Crimson, Jethro Tull, Led Zeppelin, Jimi Hendrix und Janis Joplin – ihre musikalische Entwicklung geprägt und begleiten sie noch täglich. Sie nennt',
      descriptionTail:
        'den überzeugendsten Beweis, dass es sich immer lohnt, einem weißen Tiger nachzujagen.',
    },
    steff: {
      name: 'Steff',
      avatarAlt: 'Portrait von Steff',
      badgeTitles: ['Schlagzeug'],
      descriptionLead:
        'Steff kam 2021 dazu, brachte Ordnung ins Chaos – und verbesserte das Chaos dann trotzdem. Pink-Floyd-Geduld und Zeppelin-Punch stehen in seinem Spiel Seite an Seite, und er besteht noch immer darauf, dass',
      descriptionTail:
        'das beste Beispiel ist, wie ein Groove seine Krawatte strafft, ohne sein Grinsen zu verlieren.',
    },
    tobi: {
      name: 'Tobi',
      avatarAlt: 'Portrait von Tobi',
      badgeTitles: ['Bass'],
      descriptionLead:
        'Tobi stieg 2022 ein mit Basslinien, die jeden Chorus schwerer machen, ohne um Erlaubnis zu fragen. Sein Gehör lebt irgendwo zwischen Hendrix-Swagger und Red Hot Chili Peppers-Momentum, und er sagt noch immer,',
      descriptionTail:
        'sei entdeckt worden, weil niemand im Raum einen guten Grund finden konnte, das Riff zu stoppen.',
    },
  },
}

export const getAboutMembersText = (locale: AppLocale) =>
  aboutMembersText[locale] ?? aboutMembersText[DEFAULT_APP_LOCALE]
