// EXAMPLE CV, used until you fill in yours in the app (⋯ → My CV → Auto-fill from my CV).
// Developers can also put their own CV in a file named cv-data.js next to this one: it is loaded after this file
// and never goes to GitHub.
// `tags` say which role families a line speaks to: founder, product, bd, strategy, vc.

var CV_DATA = {
  name: 'Your Name',
  contact: { city: '75000 Paris', email: 'you@example.com', phone: '+33 6 00 00 00 00', linkedin: 'https://www.linkedin.com/in/your-profile' },
  availability: { en: "Master's graduate in 2027 · available from June 2027", fr: 'Diplômé en 2027 · disponible dès juin 2027' },
  profile: {
    founder: { en: 'Two sentences on what you bring to a startup.', fr: 'Deux phrases sur ce que tu apportes à une startup.' },
    product: { en: 'Two sentences on your product experience.', fr: 'Deux phrases sur ton expérience produit.' },
    bd: { en: 'Two sentences on your sales / business development experience.', fr: 'Deux phrases sur ton expérience commerciale.' },
    strategy: { en: 'Two sentences on your strategy / consulting experience.', fr: 'Deux phrases sur ton expérience en stratégie / conseil.' },
    vc: { en: 'Two sentences on why venture capital.', fr: 'Deux phrases sur ton intérêt pour le capital-risque.' },
  },
  experience: [
    {
      org: 'COMPANY NAME', short: 'Company', what: { en: 'What the company does', fr: 'Ce que fait l’entreprise' }, place: 'Paris, FR',
      role: { en: 'Your role', fr: 'Ton poste' }, dates: { en: 'Jan 2026 – Jun 2026', fr: 'janv. 2026 – juin 2026' },
      bullets: [
        { tags: ['bd', 'founder'], en: 'Something you achieved, with a number if possible.', fr: 'Une réalisation, avec un chiffre si possible.' },
        { tags: ['product'], en: 'Another achievement.', fr: 'Une autre réalisation.' },
      ],
    },
  ],
  education: [
    {
      org: 'YOUR SCHOOL', place: 'Paris, FR', degree: { en: "Master's degree", fr: 'Master' }, dates: { en: 'Sep 2024 – May 2027', fr: 'sept. 2024 – mai 2027' },
      bullets: [{ en: 'Main subjects.', fr: 'Matières principales.' }],
    },
  ],
  other: [],
  skills: [
    { key: 'languages', label: { en: 'Languages', fr: 'Langues' }, items: { en: ['French (native)', 'English (C1)'], fr: ['Français (natif)', 'Anglais (C1)'] } },
    { key: 'data', tags: ['product', 'strategy', 'vc'], label: { en: 'Data & product', fr: 'Data & produit' }, items: { en: ['Excel', 'Python'], fr: ['Excel', 'Python'] } },
  ],
  interests: { en: 'Your interests', fr: 'Tes centres d’intérêt' },
};
