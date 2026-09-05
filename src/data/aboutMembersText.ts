import { DEFAULT_APP_LOCALE, type AppLocale } from '@/i18n/locale'

export type AboutMemberTextId = 'edgar' | 'cami' | 'steff' | 'aleksey'

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
    aleksey: {
      name: 'Aleksey',
      badgeTitles: ['Bass'],
      descriptionLead:
        "Aleksey is the newest member of the group, joining the band the very same day he showed up for his audition. Within Frisches, he found more than just a band; he found his soulmates. Whether he's at work training agents to fine-tune a virtual audio assistant or diving into musical leisure, one thing remains constant: he is always pushing to add more bass.",
    },
  },
  de: {
    edgar: {
      name: 'Edgar',
      badgeTitles: ['Gitarre', 'Begleitgesang'],
      descriptionLead:
        'Spielt Gitarre – und bisweilen auch den Narren. Als Architekt krummer Takte liegt seine Lieblingsnote immer gleich hinter der nächsten Ecke. Seine Liebe zum Classic Rock steckt in jedem Frisches-Riff und jedem Solo. Mit Intros und Wortspielen im Gepäck landet seine liebste Geschichte bei',
    },
    cami: {
      name: 'Cami',
      badgeTitles: ['Gesang', 'Flöte'],
      descriptionLead:
        'Flötistin, Sängerin und ein bisschen auch Saxophonistin: Cami ist mit den Beatles aufgewachsen und liebt den Sound der 60er und 70er. Neben ihrer klassischen Ausbildung an der Querflöte haben Pop, Rock, Glam Rock und Prog Rock – von Elton John über David Bowie, Pink Floyd und King Crimson bis hin zu Jethro Tull, Led Zeppelin, Jimi Hendrix und Janis Joplin – ihren musikalischen Weg geprägt und begleiten sie bis heute. Für sie ist',
      descriptionTail:
        'der schönste Beweis dafür, dass es sich immer lohnt, einem weißen Tiger hinterherzujagen.',
    },
    steff: {
      name: 'Steff',
      badgeTitles: ['Schlagzeug'],
      descriptionLead:
        'Steff hält den Frisches-Groove eisern zusammen – alles, was neben dem Beat landet, hat bei ihr schlechte Karten. Unverhandelbar bei den Dienstagabend-Proben: Pizza Funghi, ohne Pesto. Regen auf dem Weg? Gespielt wird trotzdem. Das Doublebass-Pedal steht als Nächstes auf dem Zettel und soll Herz und Seele unserer Songs noch voller machen. Für sie groovt nichts härter als',
      descriptionTail: '!',
    },
    aleksey: {
      name: 'Aleksey',
      badgeTitles: ['Bass'],
      descriptionLead:
        'Aleksey ist das neueste Mitglied der Gruppe und wurde noch am selben Tag Teil der Band, an dem er zum Vorspielen erschien. Bei Frisches hat er mehr als nur eine Band gefunden: Er hat seine Seelenverwandten gefunden. Ob er bei der Arbeit Agenten trainiert, um einen virtuellen Audioassistenten feinzujustieren, oder in die musikalische Muße eintaucht – eines bleibt konstant: Er treibt den Bass immer weiter nach vorn.',
    },
  },
  fr: {
    edgar: {
      name: 'Edgar',
      badgeTitles: ['Guitare', 'Chœurs'],
      descriptionLead:
        'Manie la guitare et, à l’occasion, amuse la galerie. Adepte des métriques sinueuses, sa note de prédilection nous tire toujours au détour du prochain virage. Il injecte sa passion du rock classique dans chaque riff et chaque solo de Frisches. Entre intros à rallonge et jeux de mots douteux, son conte préféré finit toujours par mener à ',
    },
    cami: {
      name: 'Cami',
      badgeTitles: ['Chant', 'Flûte'],
      descriptionLead:
        'Flûtiste, chanteuse et un peu saxophoniste sur les bords, Cami a grandi avec les Beatles et adore le son des années 60 et 70. En plus de sa formation classique à la flûte traversière, la pop, le rock, le glam rock et le rock progressif – d’Elton John à David Bowie, Pink Floyd, King Crimson, Jethro Tull, Led Zeppelin, Jimi Hendrix et Janis Joplin – ont façonné son parcours musical et l’accompagnent encore tous les jours. À ses yeux,',
      descriptionTail:
        'est la preuve la plus limpide qu’il faut parfois partir à la poursuite d’un tigre blanc.',
    },
    steff: {
      name: 'Steff',
      badgeTitles: ['Batterie'],
      descriptionLead:
        'Véritable métronome de Frisches, Steff tient le tempo d’une main de maître: ici, comme le dit Ringo, le f*ing clic, c’est elle. Qu’il neige ou qu’il vente, rien ne l’arrête. Le rituel du mardi est sacré : Pizza Funghi, sans pesto. Prochain rajout à ses atouts ? La double pédale, pour rajouter encore un peu plus de coffre à sa grosse caisse et à l’âme de nos morceaux. Pour elle, rien ne groove plus qu’',
      descriptionTail: ' !',
    },
    aleksey: {
      name: 'Aleksey',
      badgeTitles: ['Basse'],
      descriptionLead:
        "Aleksey est le nouveau membre du groupe : il a rejoint la formation le jour même où il s'est présenté à son audition. Chez Frisches, il a trouvé plus qu'un groupe ; il y a trouvé ses âmes sœurs. Qu'il soit au travail à entraîner des agents pour affiner un assistant audio virtuel ou qu'il plonge dans ses loisirs musicaux, une chose ne change jamais : il pousse toujours pour ajouter plus de basse.",
    },
  },
  br: {
    edgar: {
      name: 'Edgar',
      badgeTitles: ['Guitarra', 'Backing Vocals'],
      descriptionLead:
        'Toca a guitarra quando até mesmo nem se toca. Compositor de fórmulas de compasso enganosas, está sempre anotando sua nota predileta. Ele traz sua paixão pelo rock clássico para cada riff e solo dos Frisches. Introduzindo intros e trocadilhos, seu conto favorito o leva a',
    },
    cami: {
      name: 'Cami',
      badgeTitles: ['Voz', 'Flauta'],
      descriptionLead:
        'Flautista e cantora – e arranhando no saxofone – Cami cresceu ouvindo Beatles e ama o som dos anos 60 e 70. Além de sua formação clássica na flauta transversal, outras batidas moldaram sua jornada musical e ainda a acompanham todos os dias: pop, rock, glam rock e rock progressivo – leia-se Elton John, David Bowie, Pink Floyd, King Crimson, Jethro Tull, Led Zeppelin, Jimi Hendrix e Janis Joplin. Ela considera',
      descriptionTail: ' a prova mais clara de que sempre vale a pena perseguir o "tigre branco".',
    },
    steff: {
      name: 'Steff',
      badgeTitles: ['Bateria'],
      descriptionLead:
        'Steff mantém o ritmo do Frisches firme no lugar — qualquer coisa que saia do beat não tem a menor chance. Inegociável nos ensaios de terça à noite: Pizza Funghi, sem pesto. Chuva no caminho? A gente toca assim mesmo. O pedal duplo está na pauta, e em breve preencherá o coração e a alma das nossas músicas. Para ela, nada possui um groove mais forte do que',
      descriptionTail: '!',
    },
    aleksey: {
      name: 'Aleksey',
      badgeTitles: ['Baixo'],
      descriptionLead:
        'Aleksey é o mais novo integrante do grupo e entrou para a banda no mesmo dia em que apareceu para a audição. No Frisches, ele encontrou mais do que uma banda; encontrou suas almas gêmeas. Seja no trabalho treinando agentes para ajustar com precisão um assistente de áudio virtual ou mergulhando no lazer musical, uma coisa permanece constante: ele está sempre forçando para adicionar mais baixo.',
    },
  },
  it: {
    edgar: {
      name: 'Edgar',
      badgeTitles: ['Chitarra', 'Cori'],
      descriptionLead:
        'Suona la chitarra e, quando capita, fa anche il buffone. Compositore di tempi sghembi, la sua nota preferita è sempre dietro l’angolo. Porta la sua passione per il rock classico in ogni riff e assolo dei Frisches. Fra intro e giochi di parole a non finire, il suo racconto preferito lo porta a',
    },
    cami: {
      name: 'Cami',
      badgeTitles: ['Voce', 'Flauto'],
      descriptionLead:
        'Flautista, cantante e, ogni tanto, anche sassofonista, Cami è cresciuta con i Beatles e ama il suono degli anni 60 e 70. Accanto alla formazione classica al flauto traverso, pop, rock, glam rock e progressive rock – da Elton John e David Bowie ai Pink Floyd, King Crimson, Jethro Tull, Led Zeppelin, Jimi Hendrix e Janis Joplin – hanno segnato il suo percorso musicale e la accompagnano ancora ogni giorno. Per lei',
      descriptionTail: 'è la prova più limpida che vale sempre la pena inseguire una tigre bianca.',
    },
    steff: {
      name: 'Steff',
      badgeTitles: ['Batteria'],
      descriptionLead:
        'Steff tiene il ritmo dei Frisches ben saldo: tutto ciò che esce dal beat con lei non ha scampo. Irrinunciabile alle prove del martedì sera: Pizza Funghi, niente pesto. Piove lungo la strada? Si suona comunque. Il doppio pedale è il prossimo obiettivo, pronto a riempire ancora di più il cuore e l’anima delle nostre canzoni. Per lei, niente ha più groove di',
      descriptionTail: '!',
    },
    aleksey: {
      name: 'Aleksey',
      badgeTitles: ['Basso'],
      descriptionLead:
        "Aleksey è il membro più recente del gruppo: è entrato nella band lo stesso giorno in cui si è presentato all'audizione. In Frisches ha trovato più di una semplice band; ha trovato le sue anime affini. Che sia al lavoro ad addestrare agenti per perfezionare un assistente audio virtuale o immerso nel tempo libero musicale, una cosa resta costante: spinge sempre per aggiungere più basso.",
    },
  },
  ru: {
    edgar: {
      name: 'Edgar',
      badgeTitles: ['Гитара', 'Бэк-вокал'],
      descriptionLead:
        'Играет на гитаре и временами ещё и валяет дурака. Как автор ломаных размеров, свою любимую ноту он всегда прячет где-то за следующим поворотом. Любовь к классическому року он вплетает в каждый рифф и каждое соло Frisches. Интро и каламбуры у него никогда не заканчиваются, а любимая история неизменно приводит к',
    },
    cami: {
      name: 'Cami',
      badgeTitles: ['Вокал', 'Флейта'],
      descriptionLead:
        'Флейтистка, вокалистка и немного саксофонистка, Cami выросла на Beatles и любит звучание 60-х и 70-х. Наряду с классической школой флейты её музыкальный путь сформировали поп, рок, глэм-рок и прог-рок — от Elton John и David Bowie до Pink Floyd, King Crimson, Jethro Tull, Led Zeppelin, Jimi Hendrix и Janis Joplin — и они до сих пор сопровождают её каждый день. Для неё',
      descriptionTail:
        'это самое наглядное доказательство того, что за белым тигром иногда просто необходимо пуститься в погоню.',
    },
    steff: {
      name: 'Steff',
      badgeTitles: ['Ударные'],
      descriptionLead:
        'Steff держит ритм Frisches мёртвой хваткой: всё, что уходит мимо бита, у неё не выживает. Святое на репетициях по вторникам: Pizza Funghi, без песто. Дождь по дороге? Всё равно играем. Двойная бочка уже на очереди, чтобы ещё плотнее заполнить сердце и душу наших песен. Для неё нет ничего грувовее, чем',
      descriptionTail: '!',
    },
    aleksey: {
      name: 'Aleksey',
      badgeTitles: ['Бас'],
      descriptionLead:
        'Aleksey — самый новый участник группы: он присоединился к коллективу в тот же день, когда пришел на прослушивание. В Frisches он нашел не просто группу, а родственные души. Будь то работа, где он обучает агентов для тонкой настройки виртуального аудиоассистента, или погружение в музыкальный досуг, одно остается неизменным: он всегда стремится добавить еще больше баса.',
    },
  },
}

export const getAboutMembersText = (locale: AppLocale) =>
  aboutMembersText[locale] ?? aboutMembersText[DEFAULT_APP_LOCALE]
