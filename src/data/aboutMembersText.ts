import { DEFAULT_APP_LOCALE, type AppLocale } from '@/i18n/locale'

export type AboutMemberTextId = 'edgar' | 'cami' | 'steff' | 'tobi'

export interface AboutMemberTextEntry {
  name: string
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
      badgeTitles: ['Guitar', 'Backing Vocals'],
      descriptionLead:
        'Plays the guitar and sometimes the fool. Composer of misleading time signatures, his favourite note is always round the bend. He brings his passion for classical rock into every Frisches riff and solo. Intros and puns galore, his favourite tale telling brings him to',
    },
    cami: {
      name: 'Cami',
      badgeTitles: ['Singer', 'Flute'],
      descriptionLead:
        'Flautist and singer – and a bit of a saxophonist – Cami grew up with the Beatles and loves the sound of the 60s and 70s. Alongside her classical training on the transverse flute, pop, rock, glam rock and progressive rock – Elton John, David Bowie, Pink Floyd, King Crimson, Jethro Tull, Led Zeppelin, Jimi Hendrix and Janis Joplin – have shaped her musical journey and still accompany her every day. She calls',
      descriptionTail: 'the clearest proof that it is always worth chasing a white tiger.',
    },
    steff: {
      name: 'Steff',
      badgeTitles: ['Drums'],
      descriptionLead:
        "Steff keeps the rhythm of Frisches tightly locked — anything that wanders off the beat doesn't stand a chance. Non-negotiable on the Tuesday night rehearsals: Pizza Funghi, no pesto. Rain on the way, play away. Double bass is next on the agenda, coming to fill up the heart and soul of our songs. For her, nothing grooves harder than",
      descriptionTail: '!',
    },
    tobi: {
      name: 'Tobi',
      badgeTitles: ['Bass'],
      descriptionLead:
        'Tobi is all about the bass and lost his treble long ago. With him, one feels that the JBL bass boost was left turned on, as he brings in groovy lines to support Frisches\u2019 bottom end.',
    },
  },
  de: {
    edgar: {
      name: 'Edgar',
      badgeTitles: ['Gitarre', 'Begleitgesang'],
      descriptionLead:
        'Spielt die Gitarre – und manchmal den Spaßvogel. Als Komponist verschachtelter Taktarten ist seine Lieblingsnote stets eine Wendung entfernt. Seine Leidenschaft für klassischen Rock fließt in jedes Frisches-Riff und -Solo. Mit Intros und Wortspielen ohne Ende findet seine liebste Geschichte ihren Weg zu',
    },
    cami: {
      name: 'Cami',
      badgeTitles: ['Gesang', 'Flöte'],
      descriptionLead:
        'Flötistin und Sängerin – und ein bisschen Saxophonistin – ist Cami mit den Beatles aufgewachsen und liebt den Sound der 60er und 70er. Neben dem klassischen Studium der Querflöte haben Pop, Rock, Glamrock und Progressive Rock – Elton John, David Bowie, Pink Floyd, King Crimson, Jethro Tull, Led Zeppelin, Jimi Hendrix und Janis Joplin – ihre musikalische Entwicklung geprägt und begleiten sie noch täglich. Sie nennt',
      descriptionTail:
        'den überzeugendsten Beweis, dass es sich immer lohnt, einem weißen Tiger nachzujagen.',
    },
    steff: {
      name: 'Steff',
      badgeTitles: ['Schlagzeug'],
      descriptionLead:
        'Steff hält den Rhythmus von Frisches fest im Griff – was auch immer vom Beat abweicht, hat keine Chance. Unverhandelbar bei den Dienstagabend-Proben: Pizza Funghi, kein Pesto. Regen auf dem Weg? Wird trotzdem gespielt. Das Double Bass steht als Nächstes auf dem Programm und soll das Herzstück unserer Songs füllen. Für sie groovt nichts härter als',
      descriptionTail: '!',
    },
    tobi: {
      name: 'Tobi',
      badgeTitles: ['Bass'],
      descriptionLead:
        'Tobi dreht alles um den Bass – seinen Höhenanteil hat er längst abgegeben. Bei ihm hat man das Gefühl, der JBL-Bass-Boost wurde einfach angelassen: Er bringt groovige Linien, die das Fundament von Frisches tragen.',
    },
  },
  fr: {
    edgar: {
      name: 'Edgar',
      badgeTitles: ['Guitare', 'Chœurs'],
      descriptionLead:
        'Joue de la guitare et parfois le bouffon. Compositeur de signatures rythmiques trompeuses, sa note favorite se trouve toujours au prochain virage. Il apporte sa passion pour le rock classique dans chaque riff et solo de Frisches. Intros et jeux de mots en abondance, son conte préféré le mène à',
    },
    cami: {
      name: 'Cami',
      badgeTitles: ['Chant', 'Flûte'],
      descriptionLead:
        "Flûtiste et chanteuse – et un peu saxophoniste – Cami a grandi avec les Beatles et aime le son des années 60 et 70. En plus de sa formation classique à la flûte traversière, le pop, le rock, le glam rock et le rock progressif – Elton John, David Bowie, Pink Floyd, King Crimson, Jethro Tull, Led Zeppelin, Jimi Hendrix et Janis Joplin – ont façonné son parcours musical et l'accompagnent encore chaque jour. Elle dit de",
      descriptionTail:
        "que c'est la preuve la plus claire qu'il vaut toujours la peine de courir après un tigre blanc.",
    },
    steff: {
      name: 'Steff',
      badgeTitles: ['Batterie'],
      descriptionLead:
        "Steff tient le rythme de Frisches solidement en place — tout ce qui s'écarte du tempo n'a aucune chance. Incontournable lors des répétitions du mardi soir : Pizza Funghi, sans pesto. La pluie en chemin ? On joue quand même. La contrebasse est sur l'agenda, prête à combler le cœur et l'âme de nos chansons. Pour elle, rien ne groove plus fort que",
      descriptionTail: ' !',
    },
    tobi: {
      name: 'Tobi',
      badgeTitles: ['Basse'],
      descriptionLead:
        "Tobi ne pense qu'aux basses et a perdu ses aigus depuis longtemps. Avec lui, on a l'impression que le boost de basses du JBL est resté enclenché : il apporte des lignes pleines de groove qui soutiennent les graves de Frisches.",
    },
  },
  'pt-BR': {
    edgar: {
      name: 'Edgar',
      badgeTitles: ['Guitarra', 'Backing Vocals'],
      descriptionLead:
        'Toca a guitarra e às vezes não se toca. Compositor de fórmulas de compasso enganosas, sua nota favorita está sempre anotada. Ele traz sua paixão pelo rock clássico para cada riff e solo de Frisches. Introduzindo intros e trocadilhos, seu conto favorito o leva a',
    },
    cami: {
      name: 'Cami',
      badgeTitles: ['Voz', 'Flauta'],
      descriptionLead:
        'Flautista e cantora – e um pouco saxofonista – Cami cresceu com os Beatles e ama o som dos anos 60 e 70. Além de sua formação clássica na flauta transversal, o pop, o rock, o glam rock e o rock progressivo – Elton John, David Bowie, Pink Floyd, King Crimson, Jethro Tull, Led Zeppelin, Jimi Hendrix e Janis Joplin – moldaram sua jornada musical e ainda a acompanham todos os dias. Ela chama',
      descriptionTail: 'de a prova mais clara de que sempre vale a pena perseguir um tigre branco.',
    },
    steff: {
      name: 'Steff',
      badgeTitles: ['Bateria'],
      descriptionLead:
        'Steff mantém o ritmo do Frisches firme no lugar — qualquer coisa que saia do beat não tem a menor chance. Inegociável nos ensaios de terça à noite: Pizza Funghi, sem pesto. Chuva no caminho? A gente toca assim mesmo. O contrabaixo está na pauta, pronto para preencher o coração e a alma das nossas músicas. Para ela, nada groova mais forte do que',
      descriptionTail: '!',
    },
    tobi: {
      name: 'Tobi',
      badgeTitles: ['Baixo'],
      descriptionLead:
        'Tobi sabe tudo do baixo e já deixou os agudos para trás faz tempo. Com ele, parece que o bass boost da JBL fica ligado o tempo todo: ele traz linhas cheias de groove que sustentam os graves do Frisches.',
    },
  },
}

export const getAboutMembersText = (locale: AppLocale) =>
  aboutMembersText[locale] ?? aboutMembersText[DEFAULT_APP_LOCALE]
