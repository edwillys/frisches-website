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

const legalText: Record<AppLocale, LegalText> = {
  en: {
    impressum: {
      title: 'Legal Notice',
      subtitle: 'Pursuant to § 5 German Telemedia Act (TMG)',
      contactTitle: 'Contact',
      contactEmailLabel: 'E-Mail',
      disclaimerTitle: 'Disclaimer',
      contentLiabilityTitle: 'Liability for Content',
      contentLiabilityText:
        'The contents of this website have been prepared with the utmost care. However, we cannot guarantee the accuracy, completeness, or topicality of the content.',
      linksLiabilityTitle: 'Liability for Links',
      linksLiabilityText:
        'Our website contains links to external third-party websites. We have no influence over their content and therefore accept no liability for such external content.',
      copyrightTitle: 'Copyright',
      copyrightText:
        'The content and works published on this website are subject to German copyright law. Third-party contributions are identified as such.',
    },
    privacy: {
      title: 'Privacy Policy',
      subtitle: 'April 2025',
      s1Title: '1. Controller',
      s1ContactLabel: 'E-Mail',
      s2Title: '2. Data We Collect',
      s2Intro:
        'This website uses Umami Analytics, a privacy-friendly analytics service. Umami sets no cookies and stores no personal data on your device. The following data is collected anonymously on each page visit:',
      s2Item1: 'Page visited and time on page',
      s2Item2: 'Referring URL (referrer)',
      s2Item3: 'Device type, operating system, and browser type (User-Agent)',
      s2Item4:
        'Approximate origin (country) derived from the IP address; the IP address itself is not stored',
      s2Item5: 'Browser language setting',
      s2Outro:
        'In addition, anonymised interaction events (e.g. song played, social link clicked) are collected to understand how the site is used.',
      s3Title: '3. Legal Basis',
      s3Text:
        'Processing is based on our legitimate interest in improving and securely providing the website (Art. 6(1)(f) GDPR). Since no personal data is stored persistently and no cookies are set, no consent is required.',
      s4Title: '4. Data Processors and International Transfers',
      s4Text1:
        'Analytics data is processed by Umami Cloud (Umami Software, Inc., USA). The transfer to the USA is based on EU Standard Contractual Clauses (Art. 46(2)(c) GDPR). A Data Processing Agreement (DPA) with Umami has been or will be concluded.',
      s4Text2:
        'The website is served via Cloudflare Pages. Cloudflare processes technically necessary connection data for site delivery. For more information see the Cloudflare Privacy Policy.',
      s5Title: '5. Retention Period',
      s5Text:
        'Anonymised analytics data is stored for a maximum of 24 months and then automatically deleted.',
      s6Title: '6. Your Rights',
      s6Intro: 'You have the following rights against us:',
      s6Right1: 'Right of access (Art. 15 GDPR)',
      s6Right2: 'Right to rectification (Art. 16 GDPR)',
      s6Right3: 'Right to erasure (Art. 17 GDPR)',
      s6Right4: 'Right to restriction of processing (Art. 18 GDPR)',
      s6Right5: 'Right to data portability (Art. 20 GDPR)',
      s6Right6: 'Right to object (Art. 21 GDPR)',
      s6ContactText: 'To exercise your rights, please contact us at',
      s6AuthorityText:
        'You also have the right to lodge a complaint with the competent supervisory authority. For Bavaria, this is the',
      s6AuthorityName: 'Bavarian State Office for Data Protection Supervision (LDA)',
      s7Title: '7. External Links',
      s7Text:
        'This website contains links to external services (Spotify, Instagram, YouTube, GitHub). When you visit these sites, their respective privacy policies apply. We have no control over data processing by these third-party providers.',
    },
  },

  de: {
    impressum: {
      title: 'Impressum',
      subtitle: 'Angaben gemäß § 5 TMG',
      contactTitle: 'Kontakt',
      contactEmailLabel: 'E-Mail',
      disclaimerTitle: 'Haftungsausschluss',
      contentLiabilityTitle: 'Haftung für Inhalte',
      contentLiabilityText:
        'Die Inhalte dieser Seiten wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen.',
      linksLiabilityTitle: 'Haftung für Links',
      linksLiabilityText:
        'Unser Angebot enthält Links zu externen Webseiten Dritter, auf deren Inhalte wir keinen Einfluss haben. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber verantwortlich.',
      copyrightTitle: 'Urheberrecht',
      copyrightText:
        'Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Beiträge Dritter sind als solche gekennzeichnet.',
    },
    privacy: {
      title: 'Datenschutzerklärung',
      subtitle: 'Stand: April 2025',
      s1Title: '1. Verantwortlicher',
      s1ContactLabel: 'E-Mail',
      s2Title: '2. Welche Daten wir erheben',
      s2Intro:
        'Diese Website nutzt Umami Analytics, einen datenschutzfreundlichen Analysedienst. Umami setzt keine Cookies und speichert keine personenbezogenen Daten auf Ihrem Endgerät. Beim Seitenaufruf werden folgende technische Daten anonymisiert erfasst:',
      s2Item1: 'Aufgerufene Seite und Verweildauer',
      s2Item2: 'Verweisende URL (Referrer)',
      s2Item3: 'Gerätetyp, Betriebssystem und Browsertyp (User-Agent)',
      s2Item4:
        'Ungefähre Herkunft (Land), abgeleitet aus der IP-Adresse; die IP-Adresse selbst wird nicht gespeichert',
      s2Item5: 'Spracheinstellung des Browsers',
      s2Outro:
        'Zusätzlich werden anonymisierte Interaktionsereignisse (z. B. Song abgespielt, Social-Link angeklickt) erfasst, um die Nutzung der Website zu verstehen.',
      s3Title: '3. Rechtsgrundlage',
      s3Text:
        'Die Verarbeitung erfolgt auf Grundlage unseres berechtigten Interesses an der Verbesserung und sicheren Bereitstellung der Website (Art. 6 Abs. 1 lit. f DSGVO). Da keine personenbezogenen Daten dauerhaft gespeichert werden und keine Cookies gesetzt werden, ist keine Einwilligung erforderlich.',
      s4Title: '4. Auftragsverarbeitung und Datentransfer',
      s4Text1:
        'Die Analysedaten werden von Umami Cloud (Umami Software, Inc., USA) verarbeitet. Die Übermittlung in die USA erfolgt auf Grundlage der EU-Standardvertragsklauseln (Art. 46 Abs. 2 lit. c DSGVO). Ein Auftragsverarbeitungsvertrag (DPA) mit Umami wurde abgeschlossen bzw. wird abgeschlossen.',
      s4Text2:
        'Die Website wird über Cloudflare Pages bereitgestellt. Cloudflare verarbeitet dabei technisch notwendige Verbindungsdaten zur Auslieferung der Seite. Weitere Informationen: Cloudflare Privacy Policy.',
      s5Title: '5. Speicherdauer',
      s5Text:
        'Anonymisierte Analysedaten werden für maximal 24 Monate gespeichert, danach automatisch gelöscht.',
      s6Title: '6. Ihre Rechte',
      s6Intro: 'Sie haben gegenüber uns folgende Rechte:',
      s6Right1: 'Recht auf Auskunft (Art. 15 DSGVO)',
      s6Right2: 'Recht auf Berichtigung (Art. 16 DSGVO)',
      s6Right3: 'Recht auf Löschung (Art. 17 DSGVO)',
      s6Right4: 'Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO)',
      s6Right5: 'Recht auf Datenübertragbarkeit (Art. 20 DSGVO)',
      s6Right6: 'Widerspruchsrecht (Art. 21 DSGVO)',
      s6ContactText: 'Zur Ausübung Ihrer Rechte wenden Sie sich bitte an',
      s6AuthorityText:
        'Sie haben außerdem das Recht, sich bei der zuständigen Aufsichtsbehörde zu beschweren. Zuständig für Bayern ist der',
      s6AuthorityName: 'Landesbeauftragte für den Datenschutz Bayern (LDA)',
      s7Title: '7. Externe Links',
      s7Text:
        'Diese Website enthält Links zu externen Diensten (Spotify, Instagram, YouTube, GitHub). Beim Aufruf dieser Seiten gelten die jeweiligen Datenschutzerklärungen der Anbieter. Auf die Datenverarbeitung durch diese Drittanbieter haben wir keinen Einfluss.',
    },
  },

  fr: {
    impressum: {
      title: 'Mentions légales',
      subtitle: 'Informations selon le § 5 de la loi allemande sur les médias en ligne (TMG)',
      contactTitle: 'Contact',
      contactEmailLabel: 'E-mail',
      disclaimerTitle: 'Avertissement',
      contentLiabilityTitle: 'Responsabilité pour le contenu',
      contentLiabilityText:
        "Les contenus de ce site ont été créés avec le plus grand soin. Cependant, nous ne pouvons garantir l'exactitude, l'exhaustivité ni l'actualité des informations.",
      linksLiabilityTitle: 'Responsabilité pour les liens',
      linksLiabilityText:
        "Notre site contient des liens vers des sites externes tiers sur lesquels nous n'avons aucune influence. Nous déclinons toute responsabilité quant au contenu de ces sites.",
      copyrightTitle: "Droit d'auteur",
      copyrightText:
        "Les contenus et œuvres publiés sur ce site sont soumis au droit d'auteur allemand. Les contributions de tiers sont clairement identifiées.",
    },
    privacy: {
      title: 'Politique de confidentialité',
      subtitle: 'avril 2025',
      s1Title: '1. Responsable du traitement',
      s1ContactLabel: 'E-mail',
      s2Title: '2. Données collectées',
      s2Intro:
        "Ce site utilise Umami Analytics, un service d'analyse respectueux de la vie privée. Umami ne dépose aucun cookie et ne stocke aucune donnée personnelle sur votre appareil. Les données suivantes sont collectées de manière anonyme à chaque visite :",
      s2Item1: 'Page visitée et durée de la visite',
      s2Item2: 'URL de provenance (référent)',
      s2Item3: "Type d'appareil, système d'exploitation et navigateur (User-Agent)",
      s2Item4:
        "Origine approximative (pays) déduite de l'adresse IP ; l'adresse IP elle-même n'est pas stockée",
      s2Item5: 'Paramètre de langue du navigateur',
      s2Outro:
        "Des événements d'interaction anonymisés (p. ex. chanson écoutée, lien social cliqué) sont également collectés pour comprendre l'utilisation du site.",
      s3Title: '3. Base légale',
      s3Text:
        "Le traitement est fondé sur notre intérêt légitime à améliorer et sécuriser le site (art. 6, par. 1, point f) du RGPD). Aucune donnée personnelle n'étant stockée durablement et aucun cookie n'étant déposé, aucun consentement n'est requis.",
      s4Title: '4. Sous-traitants et transferts internationaux',
      s4Text1:
        "Les données d'analyse sont traitées par Umami Cloud (Umami Software, Inc., États-Unis). Le transfert vers les États-Unis est fondé sur les clauses contractuelles types de l'UE (art. 46, par. 2, point c) du RGPD). Un accord de traitement des données (DPA) avec Umami a été ou sera conclu.",
      s4Text2:
        'Le site est hébergé via Cloudflare Pages. Cloudflare traite les données de connexion techniquement nécessaires à la livraison du site. Pour en savoir plus, consultez la Politique de confidentialité de Cloudflare.',
      s5Title: '5. Durée de conservation',
      s5Text:
        "Les données d'analyse anonymisées sont conservées pendant 24 mois au maximum, puis supprimées automatiquement.",
      s6Title: '6. Vos droits',
      s6Intro: 'Vous disposez des droits suivants à notre égard :',
      s6Right1: "Droit d'accès (art. 15 RGPD)",
      s6Right2: 'Droit de rectification (art. 16 RGPD)',
      s6Right3: "Droit à l'effacement (art. 17 RGPD)",
      s6Right4: 'Droit à la limitation du traitement (art. 18 RGPD)',
      s6Right5: 'Droit à la portabilité (art. 20 RGPD)',
      s6Right6: "Droit d'opposition (art. 21 RGPD)",
      s6ContactText: 'Pour exercer vos droits, veuillez nous contacter à',
      s6AuthorityText:
        "Vous avez également le droit de déposer une plainte auprès de l'autorité de contrôle compétente. Pour la Bavière, il s'agit du",
      s6AuthorityName: 'Commissaire à la protection des données de Bavière (LDA)',
      s7Title: '7. Liens externes',
      s7Text:
        "Ce site contient des liens vers des services externes (Spotify, Instagram, YouTube, GitHub). Lors de la visite de ces sites, leurs politiques de confidentialité respectives s'appliquent. Nous n'avons aucun contrôle sur le traitement des données par ces tiers.",
    },
  },

  'pt-BR': {
    impressum: {
      title: 'Aviso Legal',
      subtitle: 'Informações conforme o § 5 TMG (lei alemã de telecomunicações)',
      contactTitle: 'Contato',
      contactEmailLabel: 'E-mail',
      disclaimerTitle: 'Isenção de Responsabilidade',
      contentLiabilityTitle: 'Responsabilidade pelo Conteúdo',
      contentLiabilityText:
        'Os conteúdos deste site foram elaborados com todo o cuidado. No entanto, não podemos garantir a exatidão, completude ou atualidade das informações.',
      linksLiabilityTitle: 'Responsabilidade por Links',
      linksLiabilityText:
        'Nosso site contém links para sites externos de terceiros, sobre cujo conteúdo não temos influência. Não assumimos qualquer responsabilidade pelo conteúdo desses sites externos.',
      copyrightTitle: 'Direitos Autorais',
      copyrightText:
        'Os conteúdos e obras publicados neste site estão sujeitos à lei alemã de direitos autorais. Contribuições de terceiros são identificadas como tal.',
    },
    privacy: {
      title: 'Política de Privacidade',
      subtitle: 'abril de 2025',
      s1Title: '1. Responsável pelo Tratamento',
      s1ContactLabel: 'E-mail',
      s2Title: '2. Dados que Coletamos',
      s2Intro:
        'Este site utiliza o Umami Analytics, um serviço de análise com foco em privacidade. O Umami não define cookies nem armazena dados pessoais no seu dispositivo. Os seguintes dados são coletados de forma anônima a cada visita:',
      s2Item1: 'Página visitada e tempo de visita',
      s2Item2: 'URL de referência (referrer)',
      s2Item3: 'Tipo de dispositivo, sistema operacional e tipo de navegador (User-Agent)',
      s2Item4:
        'Origem aproximada (país) derivada do endereço IP; o endereço IP em si não é armazenado',
      s2Item5: 'Configuração de idioma do navegador',
      s2Outro:
        'Além disso, eventos de interação anonimizados (p. ex., música reproduzida, link social clicado) são coletados para entender o uso do site.',
      s3Title: '3. Base Legal',
      s3Text:
        'O tratamento é baseado em nosso interesse legítimo em melhorar e disponibilizar o site com segurança (Art. 6.º, n.º 1, al. f) do RGPD). Como nenhum dado pessoal é armazenado permanentemente e nenhum cookie é definido, não é necessário consentimento.',
      s4Title: '4. Subcontratados e Transferências Internacionais',
      s4Text1:
        'Os dados de análise são processados pelo Umami Cloud (Umami Software, Inc., EUA). A transferência para os EUA é baseada nas Cláusulas Contratuais Padrão da UE (Art. 46.º, n.º 2, al. c) do RGPD). Um Acordo de Processamento de Dados (DPA) com o Umami foi ou será celebrado.',
      s4Text2:
        'O site é servido via Cloudflare Pages. A Cloudflare processa dados de conexão tecnicamente necessários para a entrega do site. Para mais informações, consulte a Política de Privacidade da Cloudflare.',
      s5Title: '5. Período de Retenção',
      s5Text:
        'Os dados de análise anonimizados são armazenados por no máximo 24 meses e depois são automaticamente excluídos.',
      s6Title: '6. Seus Direitos',
      s6Intro: 'Você tem os seguintes direitos em relação a nós:',
      s6Right1: 'Direito de acesso (Art. 15.º RGPD)',
      s6Right2: 'Direito de retificação (Art. 16.º RGPD)',
      s6Right3: 'Direito ao apagamento (Art. 17.º RGPD)',
      s6Right4: 'Direito à limitação do tratamento (Art. 18.º RGPD)',
      s6Right5: 'Direito à portabilidade dos dados (Art. 20.º RGPD)',
      s6Right6: 'Direito de oposição (Art. 21.º RGPD)',
      s6ContactText: 'Para exercer seus direitos, entre em contato conosco em',
      s6AuthorityText:
        'Você também tem o direito de apresentar uma reclamação à autoridade supervisora competente. Para a Baviera, é o',
      s6AuthorityName: 'Escritório Estadual da Baviera para Supervisão de Proteção de Dados (LDA)',
      s7Title: '7. Links Externos',
      s7Text:
        'Este site contém links para serviços externos (Spotify, Instagram, YouTube, GitHub). Ao visitar esses sites, aplicam-se as respetivas políticas de privacidade dos fornecedores. Não temos controlo sobre o tratamento de dados por esses terceiros.',
    },
  },
}

export const getLegalText = (locale: AppLocale): LegalText =>
  legalText[locale] ?? legalText[DEFAULT_APP_LOCALE]
