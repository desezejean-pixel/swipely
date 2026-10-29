// Français / English for the interface. Your offers, their descriptions, your CV and your letters keep their own language.
// Interface texts are shown in French as they appear on screen (exact texts, plus a few patterns for texts with numbers).
const UI_LANG = (() => {
  try {
    return localStorage.getItem('uiLang') || 'en';
  } catch {
    return 'en';
  }
})();

const FR = {
  // Header, views, menu
  Swipely: 'Swipely', Discover: 'Découvrir', Board: 'Tableau', List: 'Liste', 'My CV': 'Mon CV', Preferences: 'Préférences', Searches: 'Recherches',
  Add: 'Ajouter', More: 'Plus', 'How it works': 'Comment ça marche', 'Export to Excel': 'Exporter vers Excel', Backup: 'Sauvegarder',
  'Restore backup': 'Restaurer une sauvegarde', View: 'Vue', 'Edit your master CV': 'Modifier ton CV principal',
  "What you're looking for: roles, places, words to avoid": 'Ce que tu cherches : postes, lieux, mots à éviter',
  'Where offers are found, checked automatically every day': 'Où les offres sont trouvées, vérifiées automatiquement chaque jour',
  'Search': 'Rechercher', 'Français': 'Français', English: 'English',

  // Steps
  New: 'Nouvelle', 'To apply': 'À postuler', Applied: 'Postulé', Interview: 'Entretien', Offer: 'Offre', Rejected: 'Refusé', 'Not interested': 'Pas intéressé',
  All: 'Toutes', 'Needs attention': 'À traiter', Step: 'Étape', 'Change the step': 'Changer l’étape', Status: 'Statut',

  // Filters and sorting
  Location: 'Lieu', Contract: 'Contrat', 'Company type': 'Type d’entreprise', Site: 'Site', Match: 'Correspondance', Posted: 'Publiée',
  'Sort by': 'Trier par', 'Best match': 'Meilleure correspondance', 'Most recently posted': 'Publiées le plus récemment', 'Newest first': 'Ajoutées récemment',
  Deadline: 'Date limite', 'Follow-up date': 'Date de relance', 'Company A–Z': 'Entreprise A–Z', Clear: 'Effacer', 'Any match': 'Peu importe',
  'Any time': 'N’importe quand', 'Last 24 h': 'Dernières 24 h', 'Last 7 days': '7 derniers jours', 'Last 30 days': '30 derniers jours',
  'Early applicant': 'Parmi les premiers', Early: 'Tôt', 'Only offers with few applicants so far': 'Seulement les offres avec peu de candidats pour l’instant',
  'No offer here is flagged "early applicant" yet': 'Aucune offre ici n’est encore marquée « parmi les premiers »',
  'Paris area': 'Région parisienne', 'Rest of France': 'Reste de la France', Europe: 'Europe', 'United Kingdom': 'Royaume-Uni',
  'USA & Canada': 'États-Unis & Canada', 'Latin America': 'Amérique latine', Remote: 'Télétravail', 'Not specified': 'Non précisé',
  'Other places': 'Autres lieux', Other: 'Autre', Internship: 'Stage', 'Full-time': 'Temps plein', Apprenticeship: 'Alternance', VIE: 'VIE',
  'Fixed-term': 'CDD', 'Part-time': 'Temps partiel', Freelance: 'Freelance', 'Big group': 'Grand groupe', 'Big tech': 'Big tech', VC: 'VC',
  Startup: 'Startup', Tech: 'Tech', 'Reset filters': 'Réinitialiser les filtres', 'No offer matches these filters.': 'Aucune offre ne correspond à ces filtres.',

  // Discover
  'All caught up': 'Tu es à jour', 'Open the board': 'Ouvrir le tableau',
  'New offers from your saved searches will show up here. The ones you like are on the board.': 'Les nouvelles offres de tes recherches apparaîtront ici. Celles que tu aimes sont sur le tableau.',
  'No new offer matches these filters': 'Aucune nouvelle offre ne correspond à ces filtres',
  'Loosen a filter, or reset them to see every new offer.': 'Assouplis un filtre, ou réinitialise-les pour voir toutes les nouvelles offres.',
  'Swipe with two fingers on the trackpad, drag the card, or use the ← → keys.': 'Balaie avec deux doigts sur le trackpad, fais glisser la carte, ou utilise les flèches ← →.',
  Dislike: 'Je n’aime pas', Like: 'J’aime', LIKE: 'J’AIME', DISLIKE: 'BOF', 'Undo (U)': 'Annuler (U)', 'Open the offer’s window': 'Ouvrir la fiche de l’offre',
  'Dislike (swipe left or ←)': 'Je n’aime pas (balaie à gauche ou ←)', 'Like (swipe right or →)': 'J’aime (balaie à droite ou →)',
  'Loading the description…': 'Chargement de la description…', 'Try now': 'Réessayer maintenant', 'Read it on the site': 'La lire sur le site',
  'The full description will appear here by itself in a few minutes.': 'La description complète apparaîtra ici d’elle-même dans quelques minutes.',
  'The description couldn’t be read from this site.': 'La description n’a pas pu être lue sur ce site.',
  'Related role': 'Poste proche', 'Internship / junior': 'Stage / junior', 'Location not in your list': 'Lieu hors de ta liste',
  'Startup / VC job board': 'Site d’offres startups / VC', 'Seniority: too senior': 'Séniorité : trop senior',
  '1. Swipe the offers': '1. Balaie les offres', '2. Your documents are ready': '2. Tes documents sont prêts', '3. Follow the board': '3. Suis le tableau',
  'Offers that fit your CV arrive here every day. Swipe right to like, left to pass.': 'Les offres qui collent à ton CV arrivent ici chaque jour. Balaie à droite pour aimer, à gauche pour passer.',
  'Each offer you like gets a tailored CV and a cover letter, written for it.': 'Chaque offre que tu aimes reçoit un CV personnalisé et une lettre de motivation écrite pour elle.',
  'Drag each application through the steps. Every step tells you what to do next.': 'Fais glisser chaque candidature d’étape en étape. Chaque étape te dit quoi faire ensuite.',
  'Got it': 'Compris',

  // Board and list
  'Drop an offer here': 'Dépose une offre ici', 'Remove this offer': 'Retirer cette offre', 'CV + letter ready': 'CV + lettre prêts',
  'CV + AI letter ready': 'CV + lettre IA prêts', 'Writing your letter…': 'Rédaction de ta lettre…', 'Follow up': 'Relancer',
  'Deadline soon': 'Date limite proche', 'Deadline passed': 'Date limite passée', Details: 'Détails', Hide: 'Masquer', Open: 'Ouvrir', Edit: 'Modifier',
  Internship_header: 'Offre', Applied_header: 'Postulé', 'Follow up_header': 'Relance', Pay: 'Rémunération',
  'Decide in two minutes whether this offer deserves your time.': 'Décide en deux minutes si cette offre mérite ton temps.',
  'Send a tailored application within a few days. Fresh offers get read first.': 'Envoie une candidature personnalisée sous quelques jours. Les offres récentes sont lues en premier.',
  'Stay visible without being pushy.': 'Reste visible sans insister.', 'Have 3 strong stories ready and ask sharp questions.': 'Prépare 3 histoires fortes et pose des questions pertinentes.',
  'Decide calmly and get the paperwork right.': 'Décide sereinement et fais les démarches correctement.', 'Learn something and keep the door open.': 'Retiens une leçon et garde la porte ouverte.',
  'Nothing to do.': 'Rien à faire.', 'No internships yet': 'Pas encore d’offre', 'No saved search yet.': 'Aucune recherche enregistrée pour l’instant.',
  'Your list is saved in this Chrome profile only. Click': 'Ta liste est enregistrée uniquement dans ce profil Chrome. Clique sur',
  'now and then: removing the extension erases its data.': 'de temps en temps : supprimer l’extension efface ses données.',
  'Open the offer': 'Ouvrir l’offre', 'Load it now': 'La charger maintenant', 'No description saved yet.': 'Aucune description enregistrée pour l’instant.',

  Starts: 'Début', 'Show the full description': 'Voir toute la description', 'Show less': 'Voir moins', 'Hide the details': 'Masquer les détails',
  'Show the details': 'Voir les détails', 'Steps, CV & letter, messages': 'Étapes, CV & lettre, messages', 'No description saved yet.': 'Aucune description enregistrée pour l’instant.',
  'Few applicants so far': 'Peu de candidats pour l’instant',

  Archived: 'Archivées', Restore: 'Restaurer', 'Bring it back to Discover (it won’t be archived again)': 'La remettre dans Découvrir (elle ne sera plus archivée)',
  'See them': 'Les voir',

  'More filters': 'Plus de filtres', 'Fewer filters': 'Moins de filtres',

  'Follow companies': 'Suivre des entreprises', Follow: 'Suivre',
  'Follow a startup and Swipely watches its own job board every day, adding only the offers that fit you.': 'Suis une startup et Swipely surveille son site d’offres chaque jour, en n’ajoutant que les offres qui te correspondent.',
  'Click to stop following': 'Cliquer pour ne plus suivre', 'Follow this company': 'Suivre cette entreprise',

  'Right after you apply': 'Juste après ta candidature', '10 days after applying, if no answer': '10 jours après ta candidature, sans réponse',
  'Within 24 hours of an interview': 'Dans les 24 h après un entretien', 'After a rejection': 'Après un refus', 'Open in Mail': 'Ouvrir dans Mail',
  'LinkedIn note': 'Note LinkedIn', 'Follow-up email': 'E-mail de relance', 'Thank-you email': 'E-mail de remerciement', 'Feedback request': 'Demande de retour',

  Calendar: 'Calendrier', 'Add all to my calendar': 'Tout ajouter à mon calendrier', 'Apple / Outlook': 'Apple / Outlook', 'All dates to my calendar': 'Toutes les dates dans mon calendrier',
  'Interview date & time': 'Date et heure de l’entretien', Interview_: 'Entretien', 'Follow-up': 'Relance', 'Application deadline': 'Date limite de candidature',
  'Nothing dated yet. ': 'Aucune date pour l’instant. ', 'Add an interview date': 'Ajouter une date d’entretien',
  'No dated offer yet: add an interview date, a follow-up or a deadline first.': 'Aucune date pour l’instant : ajoute d’abord une date d’entretien, de relance ou une date limite.',

  'Add the interview date': 'Ajouter la date d’entretien', 'Interview date and calendar': 'Date d’entretien et calendrier', Interview_title: 'Entretien',
  'Date and time of the interview': 'Date et heure de l’entretien', 'Remove the date': 'Retirer la date',
  'Interview saved. Add it to your calendar below, or later from the offer.': 'Entretien enregistré. Ajoute-le à ton calendrier ci-dessous, ou plus tard depuis l’offre.',

  'Apply, or let go': 'Postuler, ou laisser tomber', 'Apply before the deadline': 'Postuler avant la date limite',
  'Update after the interview': 'Mettre à jour après l’entretien', 'No news: update the step': 'Sans nouvelles : mets l’étape à jour', 'Actions to do': 'Actions à faire',

  Archive: 'Archive', 'Back to all offers': 'Retour à toutes les offres',

  'Offers you hadn’t sorted that were published more than 4 weeks ago. They’re archived automatically; Restore brings one back.': 'Offres que tu n’avais pas triées, publiées il y a plus de 4 semaines. Elles sont archivées automatiquement ; « Restaurer » en remet une dans Découvrir.',

  'Learn from my likes and passes (the score adjusts itself)': 'Apprendre de mes « j’aime » et de mes refus (le score s’ajuste tout seul)',
  'What Swipely learned from your swipes': 'Ce que Swipely a appris de tes choix', 'You tend to like': 'Tu aimes plutôt', 'You tend to pass on': 'Tu passes plutôt sur',
  'Swipe on at least 5 offers you like and 5 you pass on, and Swipely starts learning your taste.': 'Aime au moins 5 offres et passes-en au moins 5, et Swipely commence à apprendre tes goûts.',

  Roles: 'Postes', Places: 'Lieux', Words: 'Mots', 'Score & learning': 'Score et apprentissage', Logos: 'Logos', 'Back to my CV settings': 'Revenir aux réglages de mon CV',
  "What you're looking for. Every offer gets a score from 0 to 100 from these settings. Hover a score to see why.": 'Ce que tu cherches. Chaque offre reçoit un score de 0 à 100 d’après ces réglages. Survole un score pour voir pourquoi.',
  'The kinds of jobs you want. Offers whose title contains one of these words score highest. The first 6 words of each family are used for the LinkedIn searches.': 'Les types de postes que tu veux. Les offres dont le titre contient un de ces mots ont le meilleur score. Les 6 premiers mots de chaque famille servent aux recherches LinkedIn.',
  'Add a job title word': 'Ajoute un mot de titre de poste', 'Add a word, then Enter': 'Ajoute un mot, puis Entrée', 'Add a bonus word': 'Ajoute un mot bonus', 'Add a word to avoid': 'Ajoute un mot à éviter',
  'Add a city, a country or a region': 'Ajoute une ville, un pays ou une région', 'e.g. France, United Kingdom': 'ex. France, Royaume-Uni',
  'Where you want to work': 'Où tu veux travailler', 'An offer elsewhere gets fewer points.': 'Une offre ailleurs a moins de points.',
  'LinkedIn regions to search': 'Régions LinkedIn à chercher', 'One search per role family and region, posted in the last 7 days.': 'Une recherche par famille de postes et par région, publiée dans les 7 derniers jours.',
  'What kind of offers': 'Quel type d’offres', 'Stages and internships': 'Stages', 'First jobs': 'Premiers emplois', 'Entry level, graduate programs': 'Débutant, programmes jeunes diplômés',
  'Bonus words': 'Mots bonus', 'In the title, the company or the description: each one adds points.': 'Dans le titre, l’entreprise ou la description : chacun ajoute des points.',
  'Words to avoid': 'Mots à éviter', 'In the title: each one lowers the score.': 'Dans le titre : chacun fait baisser le score.',
  Learning: 'Apprentissage', 'Swipely compares what you like and pass on, and adjusts the score by up to 20 points.': 'Swipely compare ce que tu aimes et ce que tu passes, et ajuste le score de 20 points au maximum.',
  'Learn from my likes and passes': 'Apprendre de mes « j’aime » et de mes refus', 'The score adjusts itself': 'Le score s’ajuste tout seul',
  'Weak matches': 'Correspondances faibles', 'Offers below this score can be left out of the new offers.': 'Les offres sous ce score peuvent être écartées des nouvelles offres.',
  'Skip new offers scoring under': 'Ignorer les nouvelles offres sous',
  'Company logos': 'Logos des entreprises', 'Optional. A free logo.dev key gives the exact logo of each company.': 'Facultatif. Une clé logo.dev gratuite donne le logo exact de chaque entreprise.',
  'Sign up at logo.dev (free, no card)': 'Inscris-toi sur logo.dev (gratuit, sans carte)', 'Open “API keys”': 'Ouvre « API keys »', 'Copy the key that starts with pk_ and paste it here': 'Copie la clé qui commence par pk_ et colle-la ici',
  'Like at least 5 offers and pass on at least 5, and Swipely starts learning your taste.': 'Aime au moins 5 offres et passes-en au moins 5, et Swipely commence à apprendre tes goûts.',
  'Learning is turned off.': 'L’apprentissage est désactivé.',

  'Regions to search': 'Régions à chercher', 'Used for LinkedIn and for the company sites (Google, Amazon, Nvidia…), posted in the last 7 days.': 'Utilisées pour LinkedIn et pour les sites d’entreprises (Google, Amazon, Nvidia…), publiées dans les 7 derniers jours.',
  'Preferences saved. They apply to all your searches: LinkedIn, company sites and the startups you follow.': 'Préférences enregistrées. Elles s’appliquent à toutes tes recherches : LinkedIn, sites d’entreprises et startups que tu suis.',

  "What you're looking for. These criteria apply to all your searches (LinkedIn, company sites, startups you follow): an offer that doesn't fit is left out, and every offer gets a score from 0 to 100.": 'Ce que tu cherches. Ces critères s’appliquent à toutes tes recherches (LinkedIn, sites d’entreprises, startups que tu suis) : une offre qui ne convient pas est écartée, et chaque offre reçoit un score de 0 à 100.',

  'Check the dates against your own availability (see My CV)': 'Vérifie les dates par rapport à ta disponibilité (voir Mon CV)',
  'Find one person to contact: the hiring manager, a founder (startups), or an alumnus of your school working there': 'Trouve une personne à contacter : le manager qui recrute, un fondateur (startups) ou un alumni de ton école qui y travaille',
  'Prepare 3 STAR stories from the best results on your CV (see the Interview prep tab)': 'Prépare 3 histoires STAR à partir des meilleurs résultats de ton CV',
  'Internship? Ask your school about the internship agreement (convention de stage) now: after graduation an internship may not be allowed': 'Un stage ? Demande dès maintenant la convention de stage à ton école : après ton diplôme, un stage peut ne plus être possible',
  'Sales / BizDev: be ready to pitch their product in 2 minutes and to explain your best sales result with numbers.': 'Ventes / BizDev : sois prêt à pitcher leur produit en 2 minutes et à expliquer ton meilleur résultat commercial, chiffres à l’appui.',
  'Founder Associate / Chief of Staff: show ownership. Prepare an example where you took a messy problem from zero to done (a hire, an automation, an event you organised).': 'Founder Associate / Chief of Staff : montre que tu prends les choses en main. Prépare un exemple où tu as mené un sujet flou de zéro à terminé (un recrutement, une automatisation, un événement organisé).',

  'Auto-fill from my CV': 'Remplir depuis mon CV', 'Paste your CV or open a Word file: Swipely fills in every tab for you.': 'Colle ton CV ou ouvre un fichier Word : Swipely remplit chaque onglet pour toi.',
  'Paste the text of your CV below, or open a Word (.docx) or text file. For a PDF: open it, select all (⌘A), copy (⌘C) and paste here. If your Mac supports Chrome’s free AI, it fills everything in English and French. Nothing leaves your computer, and nothing is saved until you press “Save my CV”.': 'Colle le texte de ton CV ci-dessous, ou ouvre un fichier Word (.docx) ou texte. Pour un PDF : ouvre-le, sélectionne tout (⌘A), copie (⌘C) et colle ici. Si ton Mac gère l’IA gratuite de Chrome, elle remplit tout en anglais et en français. Rien ne quitte ton ordinateur, et rien n’est enregistré tant que tu n’appuies pas sur « Enregistrer mon CV ».',
  'Open a file': 'Ouvrir un fichier', 'Fill in my CV': 'Remplir mon CV', 'Welcome to Swipely': 'Bienvenue sur Swipely', Later: 'Plus tard',
  'Swipely finds internships and jobs that fit you and writes your CV and cover letter for each one. First, tell it who you are.': 'Swipely trouve les stages et emplois qui te correspondent et écrit ton CV et ta lettre de motivation pour chacun. D’abord, dis-lui qui tu es.',
  'Fill in your CV (it can fill itself from your CV text or a Word file).': 'Remplis ton CV (il peut se remplir tout seul à partir du texte de ton CV ou d’un fichier Word).',
  'Check your Preferences: the jobs, places and words you want.': 'Vérifie tes Préférences : les postes, lieux et mots que tu veux.', 'Swipe the offers that arrive every day.': 'Balaie les offres qui arrivent chaque jour.',
  'Fill in your CV to get tailored CVs and letters.': 'Remplis ton CV pour obtenir des CV et lettres personnalisés.', ' It takes a minute: paste your CV and Swipely fills it in.': ' Ça prend une minute : colle ton CV et Swipely le remplit.',

  'Per page': 'Par page', 'Previous page': 'Page précédente', 'Next page': 'Page suivante',

  People: 'Personnes', 'People in this role now': 'Personnes à ce poste aujourd’hui', 'Interns and juniors there': 'Stagiaires et juniors sur place', 'They know the day-to-day best': 'Ce sont eux qui connaissent le mieux le quotidien',
  'The team’s manager': 'Le manager de l’équipe', 'Who you would likely work for': 'La personne pour qui tu travaillerais sans doute', Recruiters: 'Recruteurs', 'Talent acquisition at the company': 'Le recrutement de l’entreprise',
  'People from your school working there': 'Des gens de ton école qui y travaillent', 'Find someone to ask about the role': 'Trouver quelqu’un à qui poser des questions sur le poste',
  'Each search opens when you click it. LinkedIn shows the most results when you’re signed in; Google works without signing in.': 'Chaque recherche s’ouvre quand tu cliques dessus. LinkedIn montre le plus de résultats si tu es connecté ; Google marche sans connexion.',
  'Found someone? Copy their LinkedIn profile link and paste it here.': 'Tu as trouvé quelqu’un ? Copie le lien de son profil LinkedIn et colle-le ici.',
  'Paste a LinkedIn profile link, or a name': 'Colle le lien d’un profil LinkedIn, ou un nom', 'Their role (optional)': 'Son poste (facultatif)', Add: 'Ajouter', Profile: 'Profil',
  'Copy a note': 'Copier un message', 'Use in messages': 'Utiliser dans les messages', 'Use this name in the Messages tab': 'Utiliser ce nom dans l’onglet Messages', 'used in your messages': 'utilisé dans tes messages',
  'Click to move to the next step': 'Clique pour passer à l’étape suivante', 'To contact': 'À contacter', Contacted: 'Contacté', Replied: 'A répondu', Meeting: 'Rendez-vous', Someone: 'Quelqu’un',
  'This person is already in your list.': 'Cette personne est déjà dans ta liste.',
  'Find one person to contact: someone in this role, the hiring manager, a founder (startups) or an alumnus of your school (see the People tab)': 'Trouve une personne à contacter : quelqu’un à ce poste, le manager qui recrute, un fondateur (startups) ou un alumni de ton école (voir l’onglet Personnes)',

  'Change the photo': 'Changer la photo', 'Add a photo: on LinkedIn, right-click their photo → Copy image, then click here': 'Ajouter une photo : sur LinkedIn, clic droit sur sa photo → Copier l’image, puis clique ici',

  'Suggested person to contact': 'Personne suggérée à contacter',
  'Found on the web from public profiles: check their profile before writing': 'Trouvée sur le web à partir de profils publics : vérifie son profil avant d’écrire',

  'To do': 'À faire', Next: 'Ensuite', 'Next date': 'Prochaine date', Filters: 'Filtres', Posted: 'Publiée', Starts: 'Début',
  'My CV, Preferences, Searches and more': 'Mon CV, Préférences, Recherches et plus',
  'Decide whether this offer deserves your time.': 'Décide si cette offre vaut ton temps.', 'Like it': 'J’aime',
  'Add the date of your interview.': 'Ajoute la date de ton entretien.', 'Add the date': 'Ajouter la date', 'Write the follow-up': 'Écrire la relance', 'Update the step': 'Mettre l’étape à jour',
  'Check your tailored CV and letter, then apply on the site.': 'Vérifie ton CV et ta lettre personnalisés, puis postule sur le site.', 'Open my CV & letter': 'Ouvrir mon CV et ma lettre',
  Done: 'Fait', 'Nothing to do right now.': 'Rien à faire pour l’instant.', 'Open the offer': 'Ouvrir l’offre', 'The kinds of jobs you want.': 'Les types de postes que tu veux.',
  'Offers whose title contains one of these words score highest. The first 6 words of each family are used for the LinkedIn searches.': 'Les offres dont le titre contient un de ces mots ont le meilleur score. Les 6 premiers mots de chaque famille servent aux recherches LinkedIn.',
  "These criteria apply to all your searches (LinkedIn, company sites, startups you follow): an offer that doesn't fit is left out, and every offer gets a score from 0 to 100.": 'Ces critères s’appliquent à toutes tes recherches (LinkedIn, sites d’entreprises, startups que tu suis) : une offre qui ne convient pas est écartée, et chaque offre reçoit un score de 0 à 100.',

  'No answer yet: send your follow-up email.': 'Pas de réponse : envoie ton e-mail de relance.', 'Liked a few days ago: apply now, or let it go.': 'Aimée il y a quelques jours : postule maintenant, ou laisse tomber.',
  'Three weeks without news: update the step.': 'Trois semaines sans nouvelles : mets l’étape à jour.', 'While you wait: find someone at the company to talk to.': 'En attendant : trouve quelqu’un dans l’entreprise à qui parler.', 'Find someone': 'Trouver quelqu’un',
  'Wait for their answer.': 'Attends leur réponse.', 'How did it go? Update the step after the interview.': 'Comment ça s’est passé ? Mets l’étape à jour après l’entretien.', 'Write a thank-you': 'Écrire un remerciement',
  'How to prepare': 'Comment se préparer', 'Check pay, dates and place, then answer in writing.': 'Vérifie le salaire, les dates et le lieu, puis réponds par écrit.', 'See the checklist': 'Voir la liste',
  'Ask for short feedback: it helps for the next ones.': 'Demande un court retour : ça aide pour les prochaines.', 'Write it': 'L’écrire',

  'From your CV': 'D’après ton CV', 'Filled in from your CV. Check each tab, then press Save.': 'Rempli d’après ton CV. Vérifie chaque onglet, puis appuie sur Enregistrer.',
  'Fill in from my CV': 'Remplir d’après mon CV', 'Rebuild your preferences from your CV? Your changes here will be lost.': 'Refaire tes préférences d’après ton CV ? Tes changements ici seront perdus.',
  'CV saved. Use it to set what Swipely looks for?': 'CV enregistré. L’utiliser pour régler ce que Swipely cherche ?', 'Fill in my preferences': 'Remplir mes préférences',

  // Offer window
  'Next steps': 'Prochaines étapes', 'CV & letter': 'CV & lettre', Messages: 'Messages', 'Edit details': 'Modifier les infos', Close: 'Fermer', Remove: 'Retirer',
  Tip: 'Conseil', 'Keywords of the offer': 'Mots-clés de l’offre', Copy: 'Copier', Copied: 'Copié', 'Ready, generated from your CV': 'Prêt, généré à partir de ton CV',
  'Edited, not saved as PDF yet': 'Modifié, pas encore enregistré en PDF',
  'Grey words are asked in the offer but missing from your CV: mention them in the letter only if they are true for you.': 'Les mots en gris sont demandés dans l’offre mais absents de ton CV : mentionne-les dans la lettre seulement s’ils sont vrais pour toi.',
  'In the offer but not in your CV. Add it only if it is true.': 'Dans l’offre mais pas dans ton CV. Ajoute-le seulement si c’est vrai.',
  'No usual skill keywords found in this offer.': 'Aucun mot-clé de compétence habituel trouvé dans cette offre.',
  'Load the description (Offer tab) to compare it with your CV.': 'Charge la description (onglet Offre) pour la comparer à ton CV.',
  'Tip: add the contact’s name in "Edit details" to personalise these.': 'Astuce : ajoute le nom du contact dans « Modifier les infos » pour personnaliser ces messages.',
  'LinkedIn note (under 300 characters)': 'Note LinkedIn (moins de 300 caractères)', 'Follow-up email (10 days after applying)': 'E-mail de relance (10 jours après la candidature)',
  'Thank-you email (within 24 h of an interview)': 'E-mail de remerciement (dans les 24 h après un entretien)', 'Feedback request (after a rejection)': 'Demande de retour (après un refus)',
  'Write my letter': 'Écrire ma lettre', 'Download & write': 'Télécharger et écrire',
  'Let Chrome’s free AI write the cover letter for this offer, from your CV.': 'Laisse l’IA gratuite de Chrome écrire la lettre de motivation pour cette offre, à partir de ton CV.',
  'Your cover letter was written for this offer by Chrome’s AI, from your CV. Read it before sending.': 'Ta lettre a été écrite pour cette offre par l’IA de Chrome, à partir de ton CV. Relis-la avant de l’envoyer.',
  'Chrome’s AI is writing your cover letter for this offer…': 'L’IA de Chrome écrit ta lettre de motivation pour cette offre…',
  'Chrome’s free AI needs a one-time download on this Mac to write letters for you.': 'L’IA gratuite de Chrome a besoin d’un téléchargement unique sur ce Mac pour écrire tes lettres.',
  'Chrome’s AI isn’t available on this Mac, so your letter uses the template: just write the yellow sentence about the company.': 'L’IA de Chrome n’est pas disponible sur ce Mac, ta lettre utilise donc le modèle : écris simplement la phrase en jaune sur l’entreprise.',

  // Step guides
  'Read the description and check why it got its match score': 'Lis la description et regarde pourquoi elle a obtenu ce score',
  'Look at the company: website, LinkedIn page, recent news or fundraising': 'Renseigne-toi sur l’entreprise : site, page LinkedIn, actualités ou levée de fonds récentes',
  'Move it to "To apply", or to "Not interested" (it helps tune your filter)': 'Passe-la en « À postuler », ou en « Pas intéressé » (ça aide à affiner ton filtre)',
  'Open your tailored CV, check it, then save it as PDF': 'Ouvre ton CV personnalisé, vérifie-le, puis enregistre-le en PDF',
  'Open your cover letter, add one sentence on why this company, then save it as PDF': 'Ouvre ta lettre, ajoute une phrase sur pourquoi cette entreprise, puis enregistre-la en PDF',
  'Apply on the site (click the site logo) before the deadline': 'Postule sur le site (clique sur le logo du site) avant la date limite',
  'Send a short LinkedIn note to your contact (see Messages)': 'Envoie une courte note LinkedIn à ton contact (voir Messages)',
  'Move the offer to "Applied"': 'Passe l’offre en « Postulé »', 'A follow-up date was set 10 days after you applied': 'Une date de relance a été fixée 10 jours après ta candidature',
  'No answer by then? Send the follow-up email (see Messages)': 'Pas de réponse d’ici là ? Envoie l’e-mail de relance (voir Messages)',
  'Connect on LinkedIn with someone from the team': 'Connecte-toi sur LinkedIn avec quelqu’un de l’équipe',
  'Get ready early: re-read the offer and pick your 3 best stories': 'Prépare-toi tôt : relis l’offre et choisis tes 3 meilleures histoires',
  'Research the product, business model, competitors, latest news and funding': 'Renseigne-toi sur le produit, le modèle économique, les concurrents, l’actualité et les levées de fonds',
  'Prepare your answers to "Why us?", "Why this role?" and "Why now?"': 'Prépare tes réponses à « Pourquoi nous ? », « Pourquoi ce poste ? » et « Pourquoi maintenant ? »',
  'Prepare the exercise for this kind of role (see the tip below)': 'Prépare l’exercice propre à ce type de poste (voir le conseil ci-dessous)',
  'Write down 3 questions to ask them': 'Note 3 questions à leur poser', 'Send a thank-you email within 24 hours (see Messages)': 'Envoie un e-mail de remerciement sous 24 heures (voir Messages)',
  'Check pay, start date, duration, place and remote days': 'Vérifie la rémunération, la date de début, la durée, le lieu et les jours de télétravail',
  'Compare with your other applications; asking for a few days to answer is normal': 'Compare avec tes autres candidatures ; demander quelques jours pour répondre est normal',
  'Negotiate politely if something doesn’t fit (start date, pay, remote)': 'Négocie poliment si quelque chose ne te convient pas (date, rémunération, télétravail)',
  'Answer in writing and thank the people you met': 'Réponds par écrit et remercie les personnes rencontrées',
  'Ask for short feedback (see Messages)': 'Demande un court retour (voir Messages)', 'Write down in Notes what you would do differently': 'Note dans Notes ce que tu ferais différemment',
  'Stay in touch with the people you met: new roles open often': 'Garde le contact avec les personnes rencontrées : de nouveaux postes s’ouvrent souvent',
  'Optional: note in Notes why it didn’t fit, so the filter can be tuned': 'Facultatif : note dans Notes pourquoi ça ne collait pas, pour affiner le filtre',
  "VC interviews: bring a one-page investment memo on a startup that fits the fund's thesis (market, team, traction, risks, why now).": 'Entretiens VC : apporte un mémo d’investissement d’une page sur une startup qui colle à la thèse du fonds (marché, équipe, traction, risques, pourquoi maintenant).',
  'Strategy / consulting: practise one case and one market sizing out loud, and structure every answer in 3 points.': 'Stratégie / conseil : entraîne-toi à voix haute sur un cas et une estimation de marché, et structure chaque réponse en 3 points.',
  'Product: prepare a 5-minute critique of their product: who it is for, what works, one thing you would improve and how you would measure it.': 'Produit : prépare une critique de 5 minutes de leur produit : pour qui, ce qui marche, une chose que tu améliorerais et comment tu le mesurerais.',
  'Big groups read CVs with software first: apply through the official site and keep the exact words of the offer in your CV.': 'Les grands groupes trient les CV avec un logiciel : postule via le site officiel et garde les mots exacts de l’offre dans ton CV.',
  'VC funds get hundreds of applications: a short, specific message to an associate of the fund often matters more than the letter.': 'Les fonds VC reçoivent des centaines de candidatures : un message court et précis à un associate du fonds compte souvent plus que la lettre.',
  'Startups move fast: a 5-line message to the founder or hiring manager often beats a long letter. Apply within 48 hours.': 'Les startups vont vite : un message de 5 lignes au fondateur ou au manager vaut souvent mieux qu’une longue lettre. Postule sous 48 heures.',
  'Applying in the first days after an offer is posted makes a big difference.': 'Postuler dans les premiers jours après la publication fait une grosse différence.',

  // Edit form fields
  'Job title': 'Intitulé du poste', Company: 'Entreprise', 'Work mode': 'Mode de travail', 'Application deadline': 'Date limite de candidature', Notes: 'Notes',
  'Link to the offer': 'Lien vers l’offre', 'Start date': 'Date de début', Duration: 'Durée', 'Applied on': 'Candidature envoyée le', 'Follow up on': 'Relancer le',
  'Contact name': 'Nom du contact', 'Contact email': 'E-mail du contact', 'Company website (for the logo)': 'Site de l’entreprise (pour le logo)',
  'CV / cover letter used': 'CV / lettre utilisés', 'On-site': 'Sur site', Hybrid: 'Hybride', 'More details (dates, contact, CV…)': 'Plus de détails (dates, contact, CV…)',
  'Edit internship': 'Modifier l’offre', 'Add an internship': 'Ajouter une offre', Cancel: 'Annuler', Save: 'Enregistrer', Delete: 'Supprimer',
  'Offer description (saved from the page)': 'Description de l’offre (enregistrée depuis la page)', 'Offer description': 'Description de l’offre',
  'e.g. 1 200 € / month': 'ex. 1 200 € / mois', 'e.g. 6 months': 'ex. 6 mois', 'e.g. CV_marketing_v2.pdf': 'ex. CV_marketing_v2.pdf', 'e.g. bpifrance.fr': 'ex. bpifrance.fr',
  'Add at least a company or a job title.': 'Ajoute au moins une entreprise ou un intitulé de poste.',

  // Preferences
  'My match profile': 'Mon profil de correspondance', 'Back to the CV defaults': 'Revenir aux réglages de mon CV',
  'Save & update my LinkedIn searches': 'Enregistrer et mettre à jour mes recherches LinkedIn',
  'Built from your CV. Every offer gets a match score from 0 to 100 from these words: your roles count most, then internship/junior words, location and bonus words; "avoid" words lower it. Hover a score in the list to see why it got it, then adjust the words here.': 'Construit à partir de ton CV. Chaque offre reçoit un score de 0 à 100 selon ces mots : tes postes comptent le plus, puis les mots stage/junior, le lieu et les mots bonus ; les mots « à éviter » le font baisser. Survole un score dans la liste pour voir pourquoi, puis ajuste les mots ici.',
  'Roles you want (comma-separated words; the first 6 are used for the LinkedIn search)': 'Postes recherchés (mots séparés par des virgules ; les 6 premiers servent à la recherche LinkedIn)',
  'Where and what level': 'Où et à quel niveau', 'LinkedIn regions to search (one search per role family and region)': 'Régions LinkedIn à chercher (une recherche par famille de postes et région)',
  'Bonus words (in the title, company or description)': 'Mots bonus (dans le titre, l’entreprise ou la description)', 'Avoid words (in the title)': 'Mots à éviter (dans le titre)',
  'Places you want (an offer elsewhere gets fewer points)': 'Lieux souhaités (une offre ailleurs a moins de points)', Internships: 'Stages', 'First jobs (entry level)': 'Premiers emplois (débutant)',
  'Skip new offers scoring under': 'Ignorer les nouvelles offres sous', '(off = keep everything, weak matches sorted last)': '(désactivé = tout garder, les moins bonnes en dernier)',
  'Company logos (optional)': 'Logos des entreprises (facultatif)',
  'Your free logo.dev publishable key: sign up at logo.dev, open "API keys" and copy the key that starts with pk_': 'Ta clé publique logo.dev gratuite : inscris-toi sur logo.dev, ouvre « API keys » et copie la clé qui commence par pk_',

  // Searches
  'Saved searches': 'Recherches enregistrées', 'Overview by site': 'Vue d’ensemble par site', 'All searches, site by site': 'Toutes les recherches, site par site',
  'Every day (from 8:00, while Chrome is open) the tracker checks these sites in the background and adds new offers to Discover. Nothing opens on your screen, and LinkedIn is checked logged out: your account is never used.': 'Chaque jour (dès 8 h, tant que Chrome est ouvert), Swipely vérifie ces sites en arrière-plan et ajoute les nouvelles offres dans Découvrir. Rien ne s’ouvre sur ton écran, et LinkedIn est consulté sans connexion : ton compte n’est jamais utilisé.',
  'Add a search': 'Ajouter une recherche', 'Address of the search page': 'Adresse de la page de recherche', 'Name (optional)': 'Nom (facultatif)',
  'Add search': 'Ajouter la recherche', 'Check all now': 'Tout vérifier maintenant', 'Check now': 'Vérifier', 'e.g. Marketing internships Paris': 'ex. Stages marketing Paris',
  "Do a search on LinkedIn, JobTeaser, Welcome to the Jungle (a company's jobs page) or a company's careers page, then copy the address from Chrome's address bar and paste it here.": 'Fais une recherche sur LinkedIn ou sur la page carrières d’une entreprise, puis copie l’adresse depuis la barre d’adresse de Chrome et colle-la ici.',
  'Toolbar button only': 'Bouton de la barre seulement', 'offers in your tracker': 'offres dans ton suivi', 'Not checked yet': 'Pas encore vérifiée',
  'Paused for a while, resumes by itself': 'En pause, reprend toute seule', 'Waiting for its first check': 'En attente de sa première vérification', 'Problem: see below': 'Problème : voir plus bas',
  'Paused, resumes by itself': 'En pause, reprend toute seule', 'Checking your searches in the background…': 'Vérification de tes recherches en arrière-plan…',
  'This site only shows its offers inside a browser window. Use the toolbar button when you’re on its page.': 'Ce site n’affiche ses offres que dans une fenêtre de navigateur. Utilise le bouton de la barre d’outils quand tu es sur sa page.',

  // My CV
  'Your master CV, in English and French. Tailored CVs and cover letters only reorder and pick from what\'s here: they never invent anything.': 'Ton CV principal, en anglais et en français. Les CV personnalisés et les lettres ne font que réordonner et choisir ce qui est ici : ils n’inventent jamais rien.',
  Contact: 'Contact', Summary: 'Résumé', Experience: 'Expérience', Education: 'Formation', Skills: 'Compétences', Preview: 'Aperçu', 'Save my CV': 'Enregistrer mon CV',
  'Back to the CV from my file': 'Revenir au CV de mon fichier', 'Full name': 'Nom complet', 'City / postcode': 'Ville / code postal', Email: 'E-mail', Phone: 'Téléphone',
  'LinkedIn link': 'Lien LinkedIn', 'Move up': 'Monter', 'Move down': 'Descendre', 'Remove this point': 'Retirer ce point', '+ Add a point': '+ Ajouter un point',
  '+ Add an experience': '+ Ajouter une expérience', '+ Add an other experience': '+ Ajouter une autre expérience', '+ Add a school': '+ Ajouter une école',
  '+ Add a skills group': '+ Ajouter un groupe de compétences', 'Other experience (short lines)': 'Autres expériences (lignes courtes)',
  'Company (as on the CV)': 'Entreprise (comme sur le CV)', 'Company (in sentences)': 'Entreprise (dans les phrases)', Place: 'Lieu', Organisation: 'Organisation', School: 'École',
  'Bullet points (EN)': 'Points (EN)', 'Bullet points (FR)': 'Points (FR)', 'In English': 'En anglais', 'En français': 'En français',
  'The short profile at the top of your CV. The tracker picks the one that fits each offer.': 'Le court profil en haut de ton CV. Swipely choisit celui qui convient à chaque offre.',
  'Separate skills with commas. Skills that an offer asks for are shown in bold on its CV.': 'Sépare les compétences par des virgules. Celles qu’une offre demande apparaissent en gras sur son CV.',
  'Remove this entry from your CV?': 'Retirer cette entrée de ton CV ?', 'CV saved. Every tailored CV and letter now uses it.': 'CV enregistré. Tous les CV et lettres personnalisés l’utilisent maintenant.',
  'Go back to the CV from your file (October 2026)? Your changes here will be lost.': 'Revenir au CV de ton fichier (octobre 2026) ? Tes modifications ici seront perdues.',

  // Suggestions and messages
  'Not now': 'Pas maintenant', 'Hide them': 'Les masquer', 'Lower their score': 'Baisser leur score', 'Show 60%+ only': 'Seulement 60 %+',
  'Only show 60%+ matches?': 'Afficher seulement les offres à 60 %+ ?', 'Got it, I won’t suggest that again.': 'Compris, je ne te le proposerai plus.',
  'Filter applied. You can remove it anytime with its ✕.': 'Filtre appliqué. Tu peux le retirer à tout moment avec sa ✕.', Undo: 'Annuler', 'Open CV': 'Ouvrir le CV',
  'Open letter': 'Ouvrir la lettre', 'Open it': 'L’ouvrir', 'Backup saved in your Downloads folder.': 'Sauvegarde enregistrée dans ton dossier Téléchargements.',
  'This backup also contains your CV, preferences and searches. Restore them too?': 'Cette sauvegarde contient aussi ton CV, tes préférences et tes recherches. Les restaurer aussi ?',
  "This file isn't a tracker backup.": 'Ce fichier n’est pas une sauvegarde de Swipely.',

  // Toolbar popup
  'Save to Swipely': 'Enregistrer dans Swipely', 'Open tracker': 'Ouvrir Swipely', 'Reading the page…': 'Lecture de la page…', Update: 'Mettre à jour',
  'Select all': 'Tout sélectionner', '← Back to single offer': '← Retour à l’offre', 'Saved to your tracker.': 'Enregistrée dans ton suivi.', 'Updated.': 'Mise à jour.',

  // Document window
  'Tailored CV': 'CV personnalisé', 'Cover letter': 'Lettre de motivation', Reset: 'Réinitialiser', 'Save as PDF / Print': 'Enregistrer en PDF / Imprimer',
  'Improve with Chrome AI': 'Améliorer avec l’IA de Chrome', 'Undo AI': 'Annuler l’IA', 'Changes saved.': 'Modifications enregistrées.', 'My CV (preview)': 'Mon CV (aperçu)',
  'Click anywhere in the page to edit it. Your changes are saved for this offer.': 'Clique n’importe où dans la page pour la modifier. Tes changements sont enregistrés pour cette offre.',
  'In the print window, choose "Save as PDF" as the destination.': 'Dans la fenêtre d’impression, choisis « Enregistrer au format PDF » comme destination.',
  'Done. Read it carefully and fix anything that isn’t true.': 'Terminé. Relis attentivement et corrige ce qui ne serait pas vrai.',
  'Written for this offer by Chrome’s AI. Read it carefully and fix anything that isn’t true.': 'Écrite pour cette offre par l’IA de Chrome. Relis attentivement et corrige ce qui ne serait pas vrai.',
  'Your master CV, before tailoring to an offer': 'Ton CV principal, avant personnalisation pour une offre', 'Starting Chrome’s AI…': 'Démarrage de l’IA de Chrome…',
};

// Texts with numbers or names inside.
const FR_PATTERNS = [
  [/^(\d+) offers? to review · best matches first$/, '$1 offre(s) à trier · meilleures correspondances d’abord'],
  [/^(\d+)% match$/, '$1 % compatible'], [/^(\d+)%\+ match$/, '$1 %+ de correspondance'], [/^Match: (\d+)%\+$/, 'Correspondance : $1 %+'],
  [/^(\d+)\/(\d+) steps$/, '$1/$2 étapes'], [/^Posted today$/, 'Publiée aujourd’hui'], [/^Posted yesterday$/, 'Publiée hier'],
  [/^Posted (\d+) days ago$/, 'Publiée il y a $1 jours'], [/^Posted (\d+) wk ago$/, 'Publiée il y a $1 sem.'], [/^Posted (.+)$/, 'Publiée le $1'],
  [/^today$/, 'aujourd’hui'], [/^yesterday$/, 'hier'], [/^(\d+) days ago$/, 'il y a $1 j'], [/^(\d+) wk ago$/, 'il y a $1 sem.'],
  [/^Early applicant · (\d+)$/, 'Parmi les premiers · $1'], [/^Early applicant \((\d+)\)$/, 'Parmi les premiers ($1)'],
  [/^Clear all · (\d+) of (\d+)$/, 'Tout effacer · $1 sur $2'], [/^Hiding (.+)$/, 'Masqué : $1'],
  [/^Role: (.+)$/, 'Poste : $1'], [/^Plus: (.+)$/, 'Bonus : $1'], [/^Avoid: (.+)$/, 'À éviter : $1'],
  [/^(.+) added to your board\. Your tailored CV and cover letter are ready\.$/, '$1 ajoutée à ton tableau. Ton CV et ta lettre personnalisés sont prêts.'],
  [/^Passed on (.+)\.$/, 'Offre $1 passée.'], [/^(.+) removed from your tracker\.$/, '$1 retirée de ton suivi.'],
  [/^Cover letter written for (.+)\.$/, 'Lettre de motivation écrite pour $1.'], [/^Restored (\d+) offers from the backup\.$/, '$1 offres restaurées depuis la sauvegarde.'],
  [/^“(.+)” added to your avoid words \(Preferences\)\.$/, '« $1 » ajouté à tes mots à éviter (Préférences).'],
  [/^Hide (location|contract|company type) “(.+)”\?$/, (m, k, v) => `Masquer « ${FR[v] || v} » ?`],
  [/^You passed on (\d+) offers with (location|contract|company type) “(.+)” and liked none\.$/, (m, n, k, v) => `Tu as passé ${n} offres « ${FR[v] || v} » et n’en as aimé aucune.`],
  [/^Lower the match score of offers with “(.+)”\?$/, 'Baisser le score des offres avec « $1 » ?'],
  [/^“(.+)” is in the title of (\d+) offers you passed on, and of none you liked\.$/, '« $1 » est dans le titre de $2 offres que tu as passées, et d’aucune que tu as aimée.'],
  [/^All (\d+) offers you liked score 60% or more, and you passed on (\d+) below that\.$/, 'Les $1 offres que tu as aimées ont 60 % ou plus, et tu en as passé $2 en dessous.'],
  [/^offers in your tracker · (\d+) search(es)?$/, 'offres dans ton suivi · $1 recherche(s)'], [/^(\d+) search(es)?$/, '$1 recherche(s)'],
  [/^(\d+)\/(\d+) checked$/, '$1/$2 vérifiées'], [/^Checked today (.+) · (\d+) offers seen · (\d+) new$/, 'Vérifiée aujourd’hui $1 · $2 offres vues · $3 nouvelles'],
  [/^Checked (.+) · (\d+) offers seen · (\d+) new$/, 'Vérifiée le $1 · $2 offres vues · $3 nouvelles'],
  [/^Tailored for: (.+)\. Same facts as your CV, with the most relevant first\.$/, 'Personnalisé pour : $1. Les mêmes faits que ton CV, les plus pertinents d’abord.'],
  [/^CV \((FR|EN)\)$/, 'CV ($1)'], [/^Cover letter \((FR|EN)\)$/, 'Lettre de motivation ($1)'], [/^(FR|EN) \(offer\)$/, '$1 (offre)'],
  [/^Duration: (.+)$/, (m, d) => `Durée : ${d.replace(/months?/, 'mois')}`], [/^Starts (.+)$/, 'Début le $1'],
  [/^(\d+) offers? published more than 4 weeks ago moved to the archive\.$/, '$1 offre(s) publiée(s) il y a plus de 4 semaines archivée(s).'],
  [/^(.+) is back in Discover\.$/, '$1 est de retour dans Découvrir.'],
  [/^More filters · (\d+)$/, 'Plus de filtres · $1'],
  [/^Archive · (\d+)$/, 'Archive · $1'],
  [/^Archive: (\d+) offers published more than 4 weeks ago\. Restore one to bring it back to Discover\.$/, 'Archive : $1 offres publiées il y a plus de 4 semaines. Restaure-en une pour la remettre dans Découvrir.'],
  [/^Learned: You tend to like (.+)$/, 'Appris : tu aimes plutôt $1'], [/^Learned: You tend to pass on (.+)$/, 'Appris : tu passes plutôt sur $1'],
  [/^What Swipely learned from your (\d+) likes and (\d+) passes:$/, 'Ce que Swipely a appris de tes $1 « j’aime » et $2 refus :'],
  [/^Remove “(.+)”$/, 'Retirer « $1 »'], [/^Clear (.+)$/, 'Effacer $1'],
  [/^(\d+)–(\d+) of (\d+)$/, '$1–$2 sur $3'],
  [/^Alumni of (.+)$/, 'Alumni de $1'], [/^Your contacts for this offer · (\d+)$/, 'Tes contacts pour cette offre · $1'], [/^Your contacts for this offer$/, 'Tes contacts pour cette offre'],
  [/^“(.+)” at (.+)$/, '« $1 » chez $2'], [/^Your messages are now addressed to (.+)\.$/, 'Tes messages sont maintenant adressés à $1.'],
  [/^(\d+) people to contact were added to your liked offers \(People tab\)\.$/, '$1 personnes à contacter ont été ajoutées à tes offres aimées (onglet Personnes).'],
  [/^Filters · (\d+)$/, 'Filtres · $1'], [/^Clear · (\d+) of (\d+)$/, 'Effacer · $1 sur $2'], [/^All steps for "(.+)"$/, (m, s) => `Toutes les étapes de « ${frText(s) || s} »`],
  [/^Wait for their answer\. Follow up on (.+) if nothing comes\.$/, 'Attends leur réponse. Relance le $1 si rien ne vient.'],
  [/^Interview on (.+) at (.+): prepare your 3 stories\.$/, 'Entretien le $1 à $2 : prépare tes 3 histoires.'],
  [/^Last saved as PDF: (.+)$/, 'Dernier PDF enregistré : $1'], [/^Addressed to (.+)\.$/, 'Adressés à $1.'], [/^Move to "(.+)" $/, 'Passer en « $1 » '],
  [/^(New|To apply|Applied|Interview|Offer|Rejected|Not interested):$/, (m, s) => `${FR[s]} :`],
  [/^Move to "(.+)"$/, (m, s) => `Passer en « ${FR[s] || s} »`],
  [/^(.+) role at (.+?)( in (.+))?\.$/, (m, role, co, _x, place) => `Poste ${role} chez ${co}${place ? ` à ${place}` : ''}.`],
  [/^(Offer|Internship|Full-time|Apprenticeship|VIE) at (.+?)( in (.+))?\.$/, (m, kind, co, _x, place) => `${FR[kind] || kind} chez ${co}${place ? ` à ${place}` : ''}.`],
  [/^This page lists (\d+) offers\. Add several at once →$/, 'Cette page liste $1 offres. En ajouter plusieurs →'], [/^Add (\d+) to tracker$/, 'Ajouter $1 au suivi'],
  [/^Added (\d+) to your tracker\.$/, '$1 ajoutée(s) à ton suivi.'], [/^Already in your tracker \(status: (.+)\)\. Change anything and press Update\.$/, (m, s) => `Déjà dans ton suivi (statut : ${FR[s] || s}). Modifie ce que tu veux et appuie sur Mettre à jour.`],
  [/^Skills \((EN|FR)\)$/, 'Compétences ($1)'], [/^(Summary|Team \/ what the company does|Your role|Dates|Degree|Role|Group name|Interests|Availability line) \((EN|FR)\)$/, (m, f, l) => `${{ Summary: 'Résumé', 'Team / what the company does': 'Équipe / activité de l’entreprise', 'Your role': 'Ton poste', Dates: 'Dates', Degree: 'Diplôme', Role: 'Poste', 'Group name': 'Nom du groupe', Interests: 'Centres d’intérêt', 'Availability line': 'Ligne de disponibilité' }[f]} (${l})`],
  [/^Stop checking "(.+)"\? Offers it already found stay in your tracker\.$/, 'Ne plus vérifier « $1 » ? Les offres déjà trouvées restent dans ton suivi.'],
  [/^Delete "(.+)"\? This can't be undone\.$/, 'Supprimer « $1 » ? Impossible d’annuler.'],
];

// Some words mean different things in a table header: they get their own translation there.
const FR_HEADERS = { Offer: 'Offre', Step: 'Étape', Place: 'Lieu', Dates: 'Dates', Internship: 'Offre', Match: 'Score', Status: 'Étape', Location: 'Lieu', Deadline: 'Date limite', Applied: 'Candidature', 'Follow up': 'Relance', Pay: 'Rémunération' };

// Never translated: your offers, their descriptions, your documents and what you type.
const NO_TRANSLATE = '.job, .swipe-title, .swipe-company, .card-title, .desc-full, .swipe-desc, .preview, .message-text, .sheet, .search-info a, .ws-title h2, .item-text, textarea, input, script, style, [contenteditable="true"]';

function frText(key) {
  if (Object.hasOwn(FR, key)) return FR[key];
  const counted = key.match(/^(.*\S)\s{2}(\d+)$/); // status chips: "New  172"
  if (counted && Object.hasOwn(FR, counted[1])) return `${FR[counted[1]]}  ${counted[2]}`;
  for (const [re, rep] of FR_PATTERNS) if (re.test(key)) return key.replace(re, rep);
  return null;
}

function translateTextNode(node) {
  const raw = node.nodeValue;
  const key = raw.replace(/\s+/g, ' ').trim(); // texts written over several lines in the page count as one line
  if (!key || node.parentElement?.closest(NO_TRANSLATE)) return;
  const fr = node.parentElement?.closest('th') && FR_HEADERS[key] ? FR_HEADERS[key] : frText(key);
  if (fr !== null && fr !== key) node.nodeValue = `${raw.match(/^\s*/)[0] ? ' ' : ''}${fr}${raw.match(/\s*$/)[0] ? ' ' : ''}`;
}

function translateTree(root) {
  if (UI_LANG !== 'fr' || !root) return;
  if (root.nodeType === Node.TEXT_NODE) return translateTextNode(root);
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) translateTextNode(n);
  const els = root.matches?.('[title], [placeholder], [aria-label]') ? [root] : [];
  els.push(...root.querySelectorAll('[title], [placeholder], [aria-label]'));
  for (const e of els) {
    for (const a of ['title', 'placeholder', 'aria-label']) {
      const v = e.getAttribute(a);
      const fr = v && frText(v.trim());
      if (fr) e.setAttribute(a, fr);
    }
  }
}

if (UI_LANG === 'fr') {
  document.documentElement.lang = 'fr';
  const start = () => {
    translateTree(document.body);
    new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === 'characterData') translateTextNode(m.target);
        else m.addedNodes.forEach(translateTree);
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  };
  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start);
}

// Switches the interface language (the page reloads in the new language).
function setUiLang(lang) {
  try {
    localStorage.setItem('uiLang', lang);
  } catch {}
  location.reload();
}
