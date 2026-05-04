import { getAppMessages } from '@/i18n'
import { DEFAULT_APP_LOCALE, type AppLocale } from '@/i18n/locale'

export interface LegalText {
  impressum: {
    title: string
    subtitle: string
    contactTitle: string
    contactEmailLabel: string
    disclaimerTitle: string
    contentLiabilityTitle: string
    contentLiabilityText: string
    linksLiabilityTitle: string
    linksLiabilityText: string
    copyrightTitle: string
    copyrightText: string
    musicTitle: string
    musicText: string
  }
  privacy: {
    title: string
    subtitle: string
    s1Title: string
    s1ContactLabel: string
    s2Title: string
    s2Intro: string
    s2Item1: string
    s2Item2: string
    s2Item3: string
    s2Item4: string
    s2Item5: string
    s2Outro: string
    s3Title: string
    s3Text: string
    s4Title: string
    s4Text1: string
    s4Text2: string
    s5Title: string
    s5Text: string
    s6Title: string
    s6Intro: string
    s6Right1: string
    s6Right2: string
    s6Right3: string
    s6Right4: string
    s6Right5: string
    s6Right6: string
    s6ContactText: string
    s6AuthorityText: string
    s6AuthorityName: string
    s7Title: string
    s7Text: string
  }
}

const buildLegalText = (locale: AppLocale): LegalText => getAppMessages(locale).legal

const legalText: Record<AppLocale, LegalText> = {
  en: buildLegalText('en'),
  de: buildLegalText('de'),
  fr: buildLegalText('fr'),
  br: buildLegalText('br'),
  it: buildLegalText('it'),
  ru: buildLegalText('ru'),
}

export const getLegalText = (locale: AppLocale): LegalText =>
  legalText[locale] ?? legalText[DEFAULT_APP_LOCALE]
