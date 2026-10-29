// Tailors your CV and cover letter to one offer, using only what's in cv-data.js.

const ROLE_KEYS = ['founder', 'product', 'bd', 'strategy', 'vc']; // same order as the profile's role families

const STOP_WORDS = new Set(norm(`
  with your that this from will have their they them what when where which while about into over more most such than then
  also very work team role offer job jobs candidate profile company years year experience skills strong good great able
  avec pour dans vous nous votre notre leur leurs sont sera être avoir plus tres cette ces des les une sur par pas mais
  ainsi entre chez poste profil mission missions equipe entreprise stage stagiaire annee annees experience competences
`).split(/\s+/).filter(Boolean));

// Skill words worth checking between an offer and your CV.
const SKILL_TERMS = [
  'sales', 'vente', 'b2b', 'saas', 'crm', 'salesforce', 'hubspot', 'prospecting', 'prospection', 'lead generation', 'pipeline',
  'negotiation', 'négociation', 'partnerships', 'partenariats', 'business development', 'growth', 'marketing', 'go-to-market',
  'product', 'produit', 'roadmap', 'agile', 'scrum', 'jira', 'notion', 'figma', 'user research', 'prototyping', 'prototypage',
  'python', 'sql', 'power bi', 'excel', 'powerpoint', 'data', 'analytics', 'dashboard', 'servicenow', 'posthog',
  'ai', 'ia', 'machine learning', 'automation', 'automatisation', 'no-code', 'zapier', 'make', 'clay', 'apollo',
  'strategy', 'stratégie', 'consulting', 'conseil', 'innovation', 'transformation', 'market research', 'étude de marché',
  'due diligence', 'financial modeling', 'modélisation financière', 'investment', 'investissement', 'fundraising', 'levée de fonds',
  'venture capital', 'private equity', 'deal flow', 'startup', 'operations', 'opérations', 'project management', 'gestion de projet',
  'recruiting', 'recrutement', 'hiring', 'events', 'événements', 'english', 'anglais', 'spanish', 'espagnol', 'italian', 'italien',
];

// "Stage - Founder Associate (H/F)" → "Founder Associate"
function cleanOfferTitle(title) {
  return String(title || '')
    .replace(/\((h\/f|f\/h|m\/f(\/d)?|f\/m(\/d)?|x\/f\/m|h\/f\/x|w\/m\/d|m\/w\/d|all genders?)\)/gi, '')
    .replace(/\b(h\/f|f\/h|m\/f\/d|f\/m\/x)\b/gi, '')
    .replace(/^\s*(stage|stagiaire|internship|intern|alternance)\s*[-–:|]\s*/i, '')
    .replace(/\s*[-–|]\s*(stage|internship|cdi|cdd)(\s+\d+\s*mois)?\s*$/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim() || String(title || '').trim();
}

// French or English, from the offer's own words.
function offerLang(item) {
  const t = ` ${norm(`${item.title} ${item.description || ''}`)} `;
  const count = (list) => list.reduce((n, w) => n + (t.split(` ${w} `).length - 1), 0);
  const fr = count(['le', 'la', 'les', 'des', 'vous', 'nous', 'et', 'pour', 'avec', 'une', 'du', 'sur', 'au', 'est', 'stage']);
  const en = count(['the', 'and', 'you', 'we', 'for', 'with', 'our', 'your', 'are', 'to', 'of', 'is', 'internship']);
  return fr > en ? 'fr' : 'en';
}

// Which of your role families this offer belongs to.
function roleKeyFor(item, p = DEFAULT_PROFILE) {
  const title = norm(item.title);
  let idx = p.roles.findIndex((r) => words(r.keywords).some((k) => has(title, k)));
  if (idx < 0) {
    const desc = norm(item.description);
    const hits = p.roles.map((r) => words(r.keywords).filter((k) => has(desc, k)).length);
    const best = Math.max(...hits);
    idx = best > 0 ? hits.indexOf(best) : -1;
  }
  if (idx < 0) return companyTag(item) === 'VC' ? 'vc' : 'founder';
  return ROLE_KEYS[idx] || 'founder';
}

function offerWords(item) {
  return new Set(norm(`${item.title} ${item.title} ${item.description || ''} ${item.criteria || ''}`)
    .split(/[^a-z0-9€+#]+/).filter((w) => w.length >= 4 && !STOP_WORDS.has(w)));
}

function bulletScore(b, roleKey, terms) {
  const own = norm(`${b.en} ${b.fr}`).split(/[^a-z0-9€+#]+/).filter((w) => w.length >= 4);
  const overlap = new Set(own.filter((w) => terms.has(w))).size;
  return (b.tags?.includes(roleKey) ? 3 : 0) + overlap;
}

// The CV for one offer: same facts, the most relevant ones first.
function tailoredCv(item, lang, p = DEFAULT_PROFILE) {
  const roleKey = roleKeyFor(item, p);
  const terms = offerWords(item);
  const offerText = norm(`${item.title} ${item.description || ''}`);
  const experience = CV_DATA.experience.map((e) => ({
    ...e,
    bullets: e.bullets
      .map((b, i) => ({ b, i, s: bulletScore(b, roleKey, terms) }))
      .sort((x, y) => y.s - x.s || x.i - y.i)
      .map((x) => x.b[lang] || x.b.en || x.b.fr),
  }));
  const skills = [...CV_DATA.skills].sort((a, b) => {
    const rank = (g) => (g.key === 'languages' ? 0 : g.tags?.includes(roleKey) ? 1 : 2);
    return rank(a) - rank(b);
  }).map((g) => ({
    label: g.label[lang] || g.label.en || '',
    items: (g.items[lang]?.length ? g.items[lang] : g.items.en || []).map((s) => ({ text: s, match: has(offerText, s.replace(/\s*\(.*\)$/, '')) })),
  }));
  return {
    lang,
    roleKey,
    headline: cleanOfferTitle(item.title),
    availability: CV_DATA.availability?.[lang] || CV_DATA.availability?.en || '',
    profile: CV_DATA.profile?.[roleKey]?.[lang] || CV_DATA.profile?.[roleKey]?.en || '',
    experience,
    skills,
  };
}

// Words of the offer that your CV covers, and those it doesn't.
function keywordCoverage(item) {
  const offerText = norm(`${item.title} ${item.description || ''}`);
  const cvText = norm(JSON.stringify(CV_DATA));
  const asked = SKILL_TERMS.filter((t) => has(offerText, t));
  const unique = (list) => list.filter((t, i) => list.findIndex((x) => norm(x) === norm(t)) === i);
  return {
    matched: unique(asked.filter((t) => has(cvText, t))),
    missing: unique(asked.filter((t) => !has(cvText, t))),
  };
}

// A cover letter draft: real facts from your CV, linked to this offer.
function coverLetter(item, lang, p = DEFAULT_PROFILE) {
  const cv = tailoredCv(item, lang, p);
  const kind = companyTag(item);
  const title = cv.headline;
  const company = item.company || (lang === 'fr' ? 'votre entreprise' : 'your company');
  const terms = offerWords(item);
  // The two experiences that fit best, each with its two best lines.
  const ranked = CV_DATA.experience
    .filter((e) => e.bullets.length)
    .map((e) => {
      const best = e.bullets.map((b) => ({ b, s: bulletScore(b, cv.roleKey, terms) })).sort((x, y) => y.s - x.s).slice(0, 2);
      return { e, best, s: best.reduce((n, x) => n + x.s, 0) };
    })
    .sort((x, y) => y.s - x.s)
    .slice(0, 2);
  const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1).replace(/\.$/, '');
  const matchedSkills = cv.skills.filter((g) => !/lang/i.test(g.label)).flatMap((g) => g.items.filter((i) => i.match).map((i) => i.text));
  const ownSkills = cv.skills.filter((g) => !/lang/i.test(g.label)).flatMap((g) => g.items.map((i) => i.text));
  const skillList = (matchedSkills.length ? matchedSkills : ownSkills).slice(0, 4);
  const join = (list, and) => (list.length > 1 ? `${list.slice(0, -1).join(', ')} ${and} ${list.at(-1)}` : list[0] || '');
  const langItems = (CV_DATA.skills.find((g) => g.key === 'languages')?.items?.[lang] || []).map((x) => x.replace(/\s*\(.*\)$/, '').toLowerCase());
  const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1);
  const avail = (x) => (x ? cap(x.split('·').map((y) => y.trim()).pop()) : '');
  const myLangs = langItems.length > 1 ? `${langItems.slice(0, -1).join(', ')} ${lang === 'fr' ? 'et' : 'and'} ${langItems.at(-1)}` : langItems[0] || '';
  const first = (item.contactName || '').trim();
  const formal = kind === 'Big group';

  if (lang === 'fr') {
    const why = {
      Startup: `Rejoindre une équipe en forte croissance, où l'on prend des responsabilités très tôt, correspond exactement à ce que je recherche.`,
      VC: `Travailler au croisement des startups et de l'investissement est pour moi la suite logique de mon expérience d'opérationnel en startup.`,
      'Big group': `L'envergure de ${company} et l'impact de ses équipes rendent ce poste particulièrement attirant pour moi.`,
      Tech: `L'ambition produit et technologique de ${company} correspond exactement à l'environnement dans lequel je veux évoluer.`,
    }[kind] || `Ce poste correspond précisément à ce que je recherche pour la suite de mon parcours.`;
    return {
      lang,
      subject: `Objet : Candidature au poste de ${title}`,
      greeting: first ? `Bonjour ${first},` : formal ? 'Madame, Monsieur,' : 'Bonjour,',
      paragraphs: [
        `Je vous adresse ma candidature au poste de ${title} chez ${company}. ${why}`,
        `[Ajoutez ici une phrase sur ce qui vous attire précisément chez ${company} : un produit, une actualité, sa mission.]`,
        ...ranked.map(({ e, best }, n) =>
          `${n === 0 ? 'Chez' : 'Auparavant, chez'} ${e.short || e.org} (${e.role.fr || e.role.en}), mes principales réalisations : ${best.map((x) => lower(x.b.fr || x.b.en)).join(' ; ')}.`),
        `J'apporte également une maîtrise de ${join(skillList, 'et')}${myLangs ? `, et je travaille en ${myLangs}` : ''}.${avail(CV_DATA.availability?.fr) ? ` ${avail(CV_DATA.availability.fr)}.` : ''}`,
        `Je serais ravi d'échanger avec vous sur la manière dont je pourrais contribuer au développement de ${company}.`,
      ],
      closing: formal ? "Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées." : 'Bien cordialement,',
    };
  }
  const why = {
    Startup: 'Joining a fast-growing team where I can take ownership early is exactly what I am looking for.',
    VC: 'Working where startups and investment meet is the natural next step after my experience as a startup operator.',
    'Big group': `The scale of ${company} and the impact of its teams make this role especially appealing to me.`,
    Tech: `${company}'s product and technology ambition is exactly the environment I want to grow in.`,
  }[kind] || 'This role matches exactly what I am looking for next.';
  return {
    lang,
    subject: `Application: ${title}`,
    greeting: first ? `Dear ${first},` : 'Dear Hiring Team,',
    paragraphs: [
      `I am applying for the ${title} position at ${company}. ${why}`,
      `[Add one sentence on what specifically attracts you to ${company}: a product, recent news, its mission.]`,
      ...ranked.map(({ e, best }, n) =>
        `${n === 0 ? 'At' : 'Before that, at'} ${e.short || e.org} as ${e.role.en || e.role.fr}, I ${best.map((x) => lower(x.b.en || x.b.fr)).join(', and ')}.`),
      `I also bring ${join(skillList, 'and')}${myLangs ? `, and I work in ${cap(myLangs)}` : ''}.${avail(CV_DATA.availability?.en) ? ` ${avail(CV_DATA.availability.en)}.` : ''}`,
      `I would be glad to discuss how I can contribute to ${company}.`,
    ],
    closing: 'Best regards,',
  };
}

// ---- Your saved master CV (edited in "My CV") ----

const ORIGINAL_CV = JSON.parse(JSON.stringify(CV_DATA));

async function useSavedCv() {
  const { cvData } = await chrome.storage.local.get('cvData');
  if (cvData) CV_DATA = cvData;
  return CV_DATA;
}

async function saveCv(data) {
  CV_DATA = data;
  await chrome.storage.local.set({ cvData: data });
}

// Which role families a CV line speaks to, for lines you add yourself.
function inferTags(text) {
  const t = norm(text);
  const rules = {
    founder: /ceo|founder|hiring|recrut|operations|operation|ownership|event|right hand|bras droit|automat|growth stage|developpement de l'entreprise/,
    product: /product|produit|dashboard|power bi|prototyp|servicenow|user|utilisateur|roadmap|feature|data/,
    bd: /sales|vente|pipeline|prospect|partnership|partenariat|negoti|client|distribution|lead|closing|commercial/,
    strategy: /strateg|innovation|consult|conseil|transformation|recommend|process|standardi|proof of concept|poc/,
    vc: /invest|financ|market|marche|fund|fonds|opportunit|startup|due diligence/,
  };
  return Object.entries(rules).filter(([, re]) => re.test(t)).map(([k]) => k);
}

// ---- Rendering (shared by the document window and the tracker) ----

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function contactLine() {
  const c = CV_DATA.contact;
  return [c.city, c.email, c.phone].filter(Boolean).map(esc).join(' | ') + (c.linkedin ? ` | <a href="${esc(c.linkedin)}">LinkedIn</a>` : '');
}

function cvHtml(cv) {
  const L = cv.lang === 'fr'
    ? { exp: 'Expériences professionnelles', edu: 'Formation', other: 'Autres expériences', skills: 'Compétences', interests: "Centres d'intérêt", profile: 'Profil' }
    : { exp: 'Experience', edu: 'Education', other: 'Other experience', skills: 'Skills', interests: 'Interests', profile: 'Profile' };
  const colon = cv.lang === 'fr' ? ' :' : ':';
  const entry = (left, right, sub, subRight, bullets = []) => `
    <div class="entry">
      <div class="row"><b>${esc(left)}</b><span>${esc(right)}</span></div>
      ${sub ? `<div class="row sub"><i>${esc(sub)}</i><span>${esc(subRight)}</span></div>` : ''}
      ${bullets.length ? `<ul>${bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}
    </div>`;
  return `
    <header class="cv-head">
      <h1>${esc(CV_DATA.name)}</h1>
      <p class="contact">${contactLine()}</p>
      <p class="target">${cv.headline ? `<b>${esc(cv.headline)}</b> · ` : ''}${esc(cv.availability)}</p>
    </header>
    ${cv.profile ? `<section><h2>${L.profile}</h2><p class="profile">${esc(cv.profile)}</p></section>` : ''}
    <section><h2>${L.exp}</h2>
      ${cv.experience.map((e) => entry(e.what?.[cv.lang] ? `${e.org} – ${e.what[cv.lang]}` : e.org, e.place, e.role[cv.lang], e.dates[cv.lang], e.bullets)).join('')}
    </section>
    <section><h2>${L.edu}</h2>
      ${CV_DATA.education.map((e) => entry(e.org, e.place, e.degree[cv.lang], e.dates[cv.lang], (e.bullets || []).map((b) => b[cv.lang]).filter(Boolean))).join('')}
    </section>
    ${CV_DATA.other?.length ? `<section><h2>${L.other}</h2>${CV_DATA.other.map((e) => entry(e.org, e.place, e.role[cv.lang], e.dates[cv.lang])).join('')}</section>` : ''}
    <section><h2>${L.skills}</h2>
      ${cv.skills.map((g) => `<p class="skills"><b>${esc(g.label)}${colon}</b> ${g.items.map((s) => (s.match ? `<strong>${esc(s.text)}</strong>` : esc(s.text))).join(' · ')}</p>`).join('')}
      ${CV_DATA.interests?.[cv.lang] ? `<p class="skills"><b>${L.interests}${colon}</b> ${esc(CV_DATA.interests[cv.lang])}</p>` : ''}
    </section>`;
}

function letterHtml(l, item) {
  const date = new Date().toLocaleDateString(l.lang === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const c = CV_DATA.contact;
  return `
    <header class="letter-head">
      <div class="from"><b>${esc(CV_DATA.name)}</b><br>${esc(c.city)}<br>${esc(c.email)}<br>${esc(c.phone)}</div>
      <div class="to"><b>${esc(item.company || '')}</b>${item.contactName ? `<br>${l.lang === 'fr' ? "À l'attention de " : 'Attn: '}${esc(item.contactName)}` : ''}${item.location ? `<br>${esc(item.location)}` : ''}</div>
    </header>
    <p class="date">${l.lang === 'fr' ? `Paris, le ${date}` : `Paris, ${date}`}</p>
    <p class="subject"><b>${esc(l.subject)}</b></p>
    <p>${esc(l.greeting)}</p>
    <div id="body">${l.paragraphs.map((p) => `<p${p.startsWith('[') ? ' class="todo"' : ''}>${esc(p)}</p>`).join('')}</div>
    <p>${esc(l.closing)}</p>
    <p class="signature">${esc(CV_DATA.name)}</p>`;
}

// ---- Chrome's built-in AI (free, runs on this Mac) ----

function aiOptions(lang) {
  return { expectedInputs: [{ type: 'text', languages: ['en', lang] }], expectedOutputs: [{ type: 'text', languages: [lang] }] };
}

// 'available', 'downloadable', 'downloading' or 'unavailable'
async function chromeAiStatus(lang) {
  if (!('LanguageModel' in self)) return 'unavailable';
  try {
    return await LanguageModel.availability(aiOptions(lang));
  } catch {
    return 'unavailable';
  }
}

// Rewrites a cover letter body for one offer. Returns the paragraphs.
async function aiWriteLetter(item, lang, draft, onProgress = () => {}) {
  const session = await LanguageModel.create({
    ...aiOptions(lang),
    monitor(m) {
      m.addEventListener('downloadprogress', (e) => onProgress(`Downloading Chrome’s AI model (one time only)… ${Math.round(e.loaded * 100)}%`));
    },
    initialPrompts: [{
      role: 'system',
      content: `You improve cover letters for ${CV_DATA.name}. Use ONLY facts found in the CV facts and the draft; never invent experience, numbers, skills or company facts that are not in the job offer. Write ${lang === 'fr' ? 'in French, formal, using "vous"' : 'in English'}. Return only 4 or 5 short paragraphs separated by a blank line: no greeting, no sign-off, no title.`,
    }],
  });
  try {
    onProgress('Writing… (this can take 20–60 seconds)');
    const facts = CV_DATA.experience.flatMap((e) => e.bullets.map((b) => `${e.short || e.org} (${e.role.en}): ${b.en}`)).join('\n');
    const prompt = `JOB OFFER\nTitle: ${item.title}\nCompany: ${item.company}\nDescription:\n${cleanDescription(item.description || '').slice(0, 2500)}\n\nCV FACTS\n${facts}\n\nDRAFT\n${draft}\n\nRewrite the draft so it is specific to this offer: refer to one or two concrete things from the offer and connect them to matching CV facts. Replace any text in [brackets] with a real sentence based on the offer, or remove it.`;
    const out = await session.prompt(prompt);
    return out.split(/\n\s*\n/).map((p) => p.replace(/^\s*[-*]\s*/, '').trim()).filter(Boolean);
  } finally {
    session.destroy();
  }
}
