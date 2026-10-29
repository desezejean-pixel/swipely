// What to do at each step of an application, and ready-to-send messages.

const STEP_GUIDES = {
  New: {
    goal: 'Decide in two minutes whether this offer deserves your time.',
    tasks: [
      'Read the description and check why it got its match score',
      "Look at the company: website, LinkedIn page, recent news or fundraising",
      'Check the dates against your own availability (see My CV)',
      'Move it to "To apply", or to "Not interested" (it helps tune your filter)',
    ],
  },
  'To apply': {
    goal: 'Send a tailored application within a few days. Fresh offers get read first.',
    tasks: [
      'Find one person to contact: someone in this role, the hiring manager, a founder (startups) or an alumnus of your school (see the People tab)',
      'Open your tailored CV, check it, then save it as PDF',
      'Open your cover letter, add one sentence on why this company, then save it as PDF',
      'Apply on the site (click the site logo) before the deadline',
      'Send a short LinkedIn note to your contact (see Messages)',
      'Move the offer to "Applied"',
    ],
  },
  Applied: {
    goal: 'Stay visible without being pushy.',
    tasks: [
      'A follow-up date was set 10 days after you applied',
      'No answer by then? Send the follow-up email (see Messages)',
      'Connect on LinkedIn with someone from the team',
      'Get ready early: re-read the offer and pick your 3 best stories',
    ],
  },
  Interview: {
    goal: 'Have 3 strong stories ready and ask sharp questions.',
    tasks: [
      'Research the product, business model, competitors, latest news and funding',
      'Prepare 3 STAR stories from the best results on your CV (see the Interview prep tab)',
      'Prepare your answers to "Why us?", "Why this role?" and "Why now?"',
      'Prepare the exercise for this kind of role (see the tip below)',
      'Write down 3 questions to ask them',
      'Send a thank-you email within 24 hours (see Messages)',
    ],
  },
  Offer: {
    goal: 'Decide calmly and get the paperwork right.',
    tasks: [
      'Check pay, start date, duration, place and remote days',
      'Compare with your other applications; asking for a few days to answer is normal',
      'Negotiate politely if something doesn’t fit (start date, pay, remote)',
      'Internship? Ask your school about the internship agreement (convention de stage) now: after graduation an internship may not be allowed',
      'Answer in writing and thank the people you met',
    ],
  },
  Rejected: {
    goal: 'Learn something and keep the door open.',
    tasks: [
      'Ask for short feedback (see Messages)',
      'Write down in Notes what you would do differently',
      'Stay in touch with the people you met: new roles open often',
    ],
  },
  'Not interested': {
    goal: 'Nothing to do.',
    tasks: ['Optional: note in Notes why it didn’t fit, so the filter can be tuned'],
  },
};

// One line about you, from your CV: "Product Owner at Acme and Master's student at Some School".
function cvBlurb(lang) {
  const e = CV_DATA.experience?.[0];
  const ed = CV_DATA.education?.[0];
  const role = e?.role?.[lang] || e?.role?.en || '';
  const company = e?.short || e?.org || '';
  const degree = ed?.degree?.[lang] || ed?.degree?.en || '';
  const school = (ed?.org || '').split(' – ')[0].toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  const work = role && company ? (lang === 'fr' ? `${role} chez ${company}` : `${role} at ${company}`) : '';
  const study = degree && school ? (lang === 'fr' ? `étudiant (${degree}) à ${school}` : `${degree} student at ${school}`) : '';
  return [work, study].filter(Boolean).join(lang === 'fr' ? ' et ' : ' and ');
}

// A tip depending on the kind of company and role.
function stepTip(item, roleKey) {
  const kind = companyTag(item);
  if (item.status === 'Interview') {
    if (roleKey === 'vc' || kind === 'VC') return 'VC interviews: bring a one-page investment memo on a startup that fits the fund\'s thesis (market, team, traction, risks, why now).';
    if (roleKey === 'strategy') return 'Strategy / consulting: practise one case and one market sizing out loud, and structure every answer in 3 points.';
    if (roleKey === 'product') return 'Product: prepare a 5-minute critique of their product: who it is for, what works, one thing you would improve and how you would measure it.';
    if (roleKey === 'bd') return 'Sales / BizDev: be ready to pitch their product in 2 minutes and to explain your best sales result with numbers.';
    return 'Founder Associate / Chief of Staff: show ownership. Prepare an example where you took a messy problem from zero to done (a hire, an automation, an event you organised).';
  }
  if (kind === 'Big group') return 'Big groups read CVs with software first: apply through the official site and keep the exact words of the offer in your CV.';
  if (kind === 'VC') return 'VC funds get hundreds of applications: a short, specific message to an associate of the fund often matters more than the letter.';
  if (kind === 'Startup') return 'Startups move fast: a 5-line message to the founder or hiring manager often beats a long letter. Apply within 48 hours.';
  return 'Applying in the first days after an offer is posted makes a big difference.';
}

// Ready-to-send messages, filled with the offer's details.
function messageTemplates(item, lang) {
  const first = (item.contactName || '').trim().split(/\s+/)[0];
  const me = CV_DATA.name || '';
  const myFirst = me.split(/\s+/)[0];
  const intro = cvBlurb(lang);
  const title = cleanOfferTitle(item.title);
  const company = item.company || (lang === 'fr' ? 'votre entreprise' : 'your company');
  const hi = lang === 'fr' ? (first ? `Bonjour ${first},` : 'Bonjour,') : first ? `Hi ${first},` : 'Hello,';
  if (lang === 'fr') {
    return [
      { name: 'LinkedIn note (under 300 characters)', text: `${hi} je viens de postuler au poste de ${title} chez ${company}. ${intro ? `${intro}, j'aimerais` : "J'aimerais"} beaucoup échanger quelques minutes sur l'équipe. Merci ! ${myFirst}` },
      { name: 'Follow-up email (10 days after applying)', text: `Objet : Candidature – ${title}\n\n${hi}\n\nJe me permets de revenir vers vous au sujet de ma candidature au poste de ${title}, envoyée le ${formatDate(item.appliedDate) || '[date]'}. Le poste m'intéresse toujours beaucoup et je serais ravi d'échanger avec vous si mon profil correspond à vos attentes.\n\nJe reste à votre disposition pour toute information complémentaire.\n\nBien cordialement,\n${me}\n${CV_DATA.contact.phone}` },
      { name: 'Thank-you email (within 24 h of an interview)', text: `Objet : Merci pour notre échange – ${title}\n\n${hi}\n\nMerci pour le temps que vous m'avez accordé aujourd'hui. Notre échange sur [un sujet abordé] m'a conforté dans mon envie de rejoindre ${company}.\n\nJe reste disponible pour toute étape suivante.\n\nBien cordialement,\n${me}` },
      { name: 'Feedback request (after a rejection)', text: `${hi}\n\nMerci pour votre retour concernant le poste de ${title}. Si vous en avez le temps, je serais preneur de deux ou trois points d'amélioration sur ma candidature : cela m'aiderait beaucoup pour la suite.\n\nAu plaisir de recroiser ${company},\n${me}` },
    ];
  }
  return [
    { name: 'LinkedIn note (under 300 characters)', text: `${hi} I just applied for the ${title} role at ${company}. ${intro ? `${intro}, I'd` : "I'd"} love a quick chat about the team. Thanks! ${myFirst}` },
    { name: 'Follow-up email (10 days after applying)', text: `Subject: Application – ${title}\n\n${hi}\n\nI'm following up on my application for the ${title} role, sent on ${formatDate(item.appliedDate) || '[date]'}. I'm still very interested and would be glad to talk if my profile fits what you're looking for.\n\nHappy to share anything else that would help.\n\nBest regards,\n${me}\n${CV_DATA.contact.phone}` },
    { name: 'Thank-you email (within 24 h of an interview)', text: `Subject: Thank you – ${title}\n\n${hi}\n\nThank you for your time today. Our conversation about [a topic you discussed] made me even more excited about joining ${company}.\n\nI'm available for any next step.\n\nBest regards,\n${me}` },
    { name: 'Feedback request (after a rejection)', text: `${hi}\n\nThank you for letting me know about the ${title} role. If you have a minute, I'd really appreciate two or three points I could improve in my application.\n\nHope our paths cross again,\n${me}` },
  ];
}
