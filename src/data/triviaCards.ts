import type { AppLocale } from '@/i18n/locale'
import type { TriviaSection } from '@/types/triviaSection'

const triviaCardsByLocale: Record<AppLocale, TriviaSection[]> = {
  en: [
    {
      id: 'story',
      title: 'Story',
      frontSubtitle: 'How it all began',
      backContent: `Frisches takes its name from the Frisches Bier bar in Munich, where the early ideas first started to click.\n\nThe band is from Munich, and the current lineup solidified in 2019 after years of writing, rehearsing, and refining a shared direction.`,
      icon: 'story',
      animation: 'flip',
    },
    {
      id: 'influences',
      title: 'Influences',
      frontSubtitle: 'Musical DNA',
      backContent: `Our roots are classic rock from the 60s and 70s: The Beatles, Led Zeppelin, Janis Joplin, and Pink Floyd are all part of our DNA.\n\nThe songs keep that spirit but push it forward with modern grooves, sharper edges, and stories about pressure, control, and staying human.`,
      icon: 'influences',
      animation: 'flip',
    },
    {
      id: 'gear',
      title: 'Gear',
      frontSubtitle: 'Tools of the trade',
      backContent: `We prefer real amps, loud rooms, and takes that still breathe. Character always beats perfection.\n\nFrom tight riffs to open psychedelic passages, we shape songs around dynamics and emotion first, then polish only what serves the track.`,
      icon: 'gear',
      animation: 'flip',
    },
  ],
  de: [
    {
      id: 'story',
      title: 'Geschichte',
      frontSubtitle: 'Wie alles begann',
      backContent: `Der Name Frisches kommt von der Frisches-Bier-Bar in Muenchen, wo die ersten Ideen der Band Form annahmen.\n\nDie Band stammt aus Muenchen, und die heutige Besetzung hat sich 2019 nach Jahren gemeinsamen Schreibens und Probens gefestigt.`,
      icon: 'story',
      animation: 'flip',
    },
    {
      id: 'influences',
      title: 'Einfluesse',
      frontSubtitle: 'Musikalische DNA',
      backContent: `Unsere Wurzeln liegen im Classic Rock der 60er und 70er: The Beatles, Led Zeppelin, Janis Joplin und Pink Floyd praegen unseren Kern.\n\nDaraus bauen wir unseren eigenen modernen Sound - mit Druck, Dynamik und Texten ueber Kontrolle, Zweifel und Haltung.`,
      icon: 'influences',
      animation: 'flip',
    },
    {
      id: 'gear',
      title: 'Gear',
      frontSubtitle: 'Werkzeuge des Sounds',
      backContent: `Wir setzen auf echte Amps, laute Raeume und Aufnahmen mit Luft zum Atmen. Charakter ist wichtiger als sterile Perfektion.\n\nVon harten Riffs bis zu offenen psychedelischen Passagen entstehen unsere Songs zuerst aus Energie und Gefuehl, dann aus Feinschliff.`,
      icon: 'gear',
      animation: 'flip',
    },
  ],
  fr: [
    {
      id: 'story',
      title: 'Histoire',
      frontSubtitle: 'Comment tout a commence',
      backContent: `Le nom Frisches vient du bar Frisches Bier a Munich, la ou les premieres idees du groupe ont pris forme.\n\nLe groupe vient de Munich, et la formation actuelle s'est stabilisee en 2019 apres plusieurs annees d'ecriture et de repetition.`,
      icon: 'story',
      animation: 'flip',
    },
    {
      id: 'influences',
      title: 'Influences',
      frontSubtitle: 'ADN musical',
      backContent: `Nos racines sont dans le rock classique des annees 60 et 70: The Beatles, Led Zeppelin, Janis Joplin et Pink Floyd font partie de notre ADN.\n\nNous gardons cet esprit, avec une touche moderne et des chansons sur la pression, le controle et le fait de rester humain.`,
      icon: 'influences',
      animation: 'flip',
    },
    {
      id: 'gear',
      title: 'Materiel',
      frontSubtitle: 'Outils de creation',
      backContent: `Nous privilegions de vrais amplis, des pieces vivantes et des prises qui respirent. Le caractere passe avant la perfection sterile.\n\nDes riffs serres aux passages psychedeliques, nous construisons les morceaux autour de la dynamique et de l'emotion.`,
      icon: 'gear',
      animation: 'flip',
    },
  ],
  'pt-BR': [
    {
      id: 'story',
      title: 'Historia',
      frontSubtitle: 'Como tudo comecou',
      backContent: `O nome Frisches vem do bar Frisches Bier em Munique, onde as primeiras ideias da banda ganharam forma.\n\nA banda e de Munique, e a formacao atual se consolidou em 2019 depois de anos de composicao, ensaio e alinhamento musical.`,
      icon: 'story',
      animation: 'flip',
    },
    {
      id: 'influences',
      title: 'Influencias',
      frontSubtitle: 'DNA musical',
      backContent: `Nossas raizes estao no rock classico dos anos 60 e 70: The Beatles, Led Zeppelin, Janis Joplin e Pink Floyd fazem parte do nosso DNA.\n\nMantemos essa base e adicionamos um molho moderno, com letras sobre pressao, controle e resistencia humana.`,
      icon: 'influences',
      animation: 'flip',
    },
    {
      id: 'gear',
      title: 'Gear',
      frontSubtitle: 'Ferramentas do som',
      backContent: `Preferimos amplificadores reais, salas vivas e takes com respiracao natural. Carater vale mais que perfeicao esteril.\n\nDe riffs diretos a passagens psicodelicas, construimos cada faixa pela dinamica e pela emocao antes do acabamento final.`,
      icon: 'gear',
      animation: 'flip',
    },
  ],
}

export const getTriviaCards = (locale: AppLocale): TriviaSection[] => triviaCardsByLocale[locale]
