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
        'Cami stepped in during 2020 and immediately made rehearsal sound like a séance with better timing. Her phrasing owes a debt to Joni Mitchell and the Beatles, but she still calls',
      descriptionTail: 'the cleanest proof that a haunting melody can grin while it cuts.',
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
}

export const getAboutMembersText = (locale: AppLocale) =>
  aboutMembersText[locale] ?? aboutMembersText[DEFAULT_APP_LOCALE]
