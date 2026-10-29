// Shared by the popup, the tracker page and the background worker.

const STATUSES = ['New', 'To apply', 'Applied', 'Interview', 'Offer', 'Rejected', 'Not interested'];
const FOLLOW_UP_DAYS = 10; // suggested follow-up date after applying
const DEADLINE_WARNING_DAYS = 3;

// Every field of an internship, in form and CSV order.
// `more` fields are folded under "More details" in the popup.
const FIELDS = [
  { key: 'title', label: 'Job title', wide: true },
  { key: 'company', label: 'Company' },
  { key: 'status', label: 'Status', type: 'select', options: STATUSES },
  { key: 'location', label: 'Location' },
  { key: 'workMode', label: 'Work mode', type: 'select', options: ['', 'On-site', 'Hybrid', 'Remote'] },
  { key: 'pay', label: 'Pay', placeholder: 'e.g. 1 200 € / month' },
  { key: 'deadline', label: 'Application deadline', type: 'date' },
  { key: 'interviewAt', label: 'Interview date & time', type: 'datetime-local' },
  { key: 'notes', label: 'Notes', type: 'textarea', wide: true },
  { key: 'url', label: 'Link to the offer', type: 'url', wide: true, more: true },
  { key: 'startDate', label: 'Start date', type: 'date', more: true },
  { key: 'duration', label: 'Duration', placeholder: 'e.g. 6 months', more: true },
  { key: 'appliedDate', label: 'Applied on', type: 'date', more: true },
  { key: 'followUpDate', label: 'Follow up on', type: 'date', more: true },
  { key: 'contactName', label: 'Contact name', more: true },
  { key: 'contactEmail', label: 'Contact email', type: 'email', more: true },
  { key: 'companyWebsite', label: 'Company website (for the logo)', placeholder: 'e.g. bpifrance.fr', more: true },
  { key: 'cvUsed', label: 'CV / cover letter used', placeholder: 'e.g. CV_marketing_v2.pdf', wide: true, more: true },
];

// ---- Dates (stored as YYYY-MM-DD, in local time) ----

function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function today() {
  return isoDate(new Date());
}

function addDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  return isoDate(new Date(y, m - 1, d + n));
}

function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

// ---- Links ----

// Same offer, same link: drops tracking parameters and LinkedIn's many URL shapes.
function normalizeUrl(raw) {
  try {
    const u = new URL(raw);
    u.hash = '';
    if (u.hostname.endsWith('linkedin.com')) {
      const id = u.searchParams.get('currentJobId') || (u.pathname.match(/\/jobs\/view\/(?:[^/]*-)?(\d+)/) || [])[1];
      if (id) return `https://www.linkedin.com/jobs/view/${id}/`;
    }
    for (const k of [...u.searchParams.keys()]) {
      if (/^(utm_|ref$|refid|trk|tracking|gh_src|source$|src$|origin$)/i.test(k)) u.searchParams.delete(k);
    }
    return u.toString();
  } catch {
    return raw;
  }
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

// ---- Storage ----

async function loadAll() {
  const { internships = [] } = await chrome.storage.local.get('internships');
  return internships;
}

async function saveAll(list) {
  await chrome.storage.local.set({ internships: list });
}

// Fills in dates when the status changes: applied date, and a follow-up reminder.
function applyStatusRules(item) {
  // Back to a step before applying: the application dates no longer apply.
  if (['New', 'To apply', 'Not interested'].includes(item.status)) {
    item.appliedDate = '';
    item.followUpDate = '';
  }
  if (['Applied', 'Interview', 'Offer'].includes(item.status) && !item.appliedDate) item.appliedDate = today();
  if (item.status === 'Applied' && !item.followUpDate) item.followUpDate = addDays(item.appliedDate, FOLLOW_UP_DAYS);
}

async function saveInternship(data) {
  const list = await loadAll();
  const now = new Date().toISOString();
  const item = { ...data, url: data.url ? normalizeUrl(data.url) : '', updatedAt: now };
  if (!item.source) item.source = hostOf(item.url);
  item.contract = contractOf(item);
  const i = list.findIndex((x) => x.id && x.id === item.id);
  if (i < 0 || list[i].status !== item.status) {
    applyStatusRules(item);
    // Each step change is remembered (for the progress dashboard: answer times, weekly counts…).
    item.history = [...((i >= 0 && list[i].history) || []), { status: item.status, at: now }];
  }
  if (i >= 0) {
    list[i] = { ...list[i], ...item };
  } else {
    item.id = crypto.randomUUID();
    item.createdAt = now;
    list.push(item);
  }
  await saveAll(list);
  return i >= 0 ? list[i] : item;
}

// ---- Archive: new offers published more than 4 weeks ago ----

const ARCHIVE_AFTER_DAYS = 28;
// Only offers you haven't sorted yet; "Restore" marks an offer so it's never archived again.
function isStale(item) {
  const date = item.postedAt || (item.createdAt || '').slice(0, 10);
  return item.status === 'New' && !item.keepFresh && !item.archived && Boolean(date) && date < addDays(today(), -ARCHIVE_AFTER_DAYS);
}

async function archiveStale() {
  const list = await loadAll();
  const now = new Date().toISOString();
  let n = 0;
  for (const i of list) {
    if (isStale(i)) {
      i.archived = true;
      i.archivedAt = now;
      n++;
    }
  }
  if (n) await saveAll(list);
  return n;
}

// Extra facts kept from search results when the site shows them.
const OFFER_EXTRAS = ['logo', 'logoFrom', 'companyUrl', 'postedAt', 'early', 'applicants', 'industry', 'description'];

// Internship / Apprenticeship / VIE / Full-time… from a contract label or an offer title.
function normContract(text) {
  const t = norm(text).replace(/_/g, ' ');
  if (/(^|[^a-z])v\.?i\.?e([^a-z]|$)|volontariat international/.test(t)) return 'VIE';
  if (/alternance|apprenti|apprenticeship|work[- ]study/.test(t)) return 'Apprenticeship';
  if (/(^|[^a-z])(stage|stagiaire|intern|internship|trainee|summer associate)([^a-z]|$)/.test(t)) return 'Internship';
  if (/full[- ]?time|(^|[^a-z])cdi([^a-z]|$)|temps plein|permanent/.test(t)) return 'Full-time';
  if (/(^|[^a-z])cdd([^a-z]|$)|fixed[- ]term|temporary|contract([^a-z]|$)/.test(t)) return 'Fixed-term';
  if (/part[- ]time|temps partiel/.test(t)) return 'Part-time';
  if (/freelance/.test(t)) return 'Freelance';
  return '';
}

// The offer's contract, from its contract field or else its title ('' if unknown).
function contractOf(item) {
  return normContract(item.contract || '') || normContract(item.title || '');
}

// "Posted today", "3 days ago", "2 wk ago"…
function postedLabel(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  const days = Math.round((new Date(today()) - new Date(Date.UTC(y, m - 1, d))) / 86400000);
  if (days <= 0) return 'Posted today';
  if (days === 1) return 'Posted yesterday';
  if (days < 14) return `Posted ${days} days ago`;
  if (days < 60) return `Posted ${Math.round(days / 7)} wk ago`;
  return `Posted ${formatDate(iso)}`;
}

// Adds several offers at once, skipping any already in the tracker. Returns how many were added.
// The same offer seen on two sites: same company and same title (ignoring "H/F", "Stage -"…).
function dupKey(item) {
  const company = norm(item.company).replace(/\b(sas|sa|inc|ltd|llc|group|groupe)\b/g, '').replace(/[^a-z0-9]/g, '');
  const title = norm(item.title)
    .replace(/\((h\/f|f\/h|m\/f(\/d)?|f\/m(\/[dx])?|x\/f\/m|h\/f\/x|w\/m\/d|m\/w\/d|all genders?)\)|(^|\s)(h\/f|f\/h)(\s|$)/g, ' ')
    .replace(/^\s*(stage|stagiaire|internship|intern|alternance)\s*[-–:|]\s*/, '')
    .replace(/[^a-z0-9]/g, '');
  return company && title ? `${company}|${title}` : '';
}

async function addMany(offers, fields = {}) {
  const list = await loadAll();
  const known = new Set(list.flatMap((i) => [i.url, ...(i.altUrls || [])]));
  const twins = new Map(list.map((i) => [dupKey(i), i]).filter(([k]) => k));
  const now = new Date().toISOString();
  let added = 0;
  let merged = 0;
  for (const o of offers) {
    const url = normalizeUrl(o.url || '');
    if (!url || known.has(url)) continue;
    known.add(url);
    // Already found on another site: keep one offer, remember this link as "also on".
    const twin = twins.get(dupKey(o));
    if (twin) {
      twin.altUrls = [...new Set([...(twin.altUrls || []), url])];
      if (!twin.description && o.description) twin.description = o.description;
      merged++;
      continue;
    }
    const extra = Object.fromEntries(OFFER_EXTRAS.filter((k) => o[k]).map((k) => [k, o[k]]));
    if (extra.logo) extra.logoFrom = o.logoFrom || 'card'; // the logo shown next to the offer in search results
    const item = {
      title: o.title || '', company: o.company || '', location: o.location || '', ...extra, ...fields,
      contract: normContract(o.contract || o.title),
      url, source: hostOf(url), id: crypto.randomUUID(), createdAt: now, updatedAt: now,
    };
    Object.assign(item, missingDates(item));
    item.history = [{ status: item.status || 'New', at: now }];
    if (isStale(item)) {
      item.archived = true; // already more than 4 weeks old when found
      item.archivedAt = now;
    }
    list.push(item);
    twins.set(dupKey(item), item);
    added++;
  }
  if (added || merged) await saveAll(list);
  return added;
}

// Offers already saved twice (found before duplicates were merged): keep the one you worked on.
function mergeDuplicates(list) {
  const rank = (i) => (['New', 'Not interested'].includes(i.status) ? 0 : 1);
  const byKey = new Map();
  const drop = new Set();
  for (const i of list) {
    const k = dupKey(i);
    if (!k) continue;
    const other = byKey.get(k);
    if (!other) { byKey.set(k, i); continue; }
    const [keep, lose] = rank(i) > rank(other) ? [i, other] : [other, i];
    keep.altUrls = [...new Set([...(keep.altUrls || []), lose.url, ...(lose.altUrls || [])])].filter((u) => u && u !== keep.url);
    if (!keep.description && lose.description) keep.description = lose.description;
    drop.add(lose.id);
    byKey.set(k, keep);
  }
  return { list: list.filter((i) => !drop.has(i.id)), merged: drop.size };
}

// ---- Dates written in the offer (deadline, start date) ----

const MONTHS = {
  janvier: 1, january: 1, jan: 1, fevrier: 2, february: 2, feb: 2, fev: 2, mars: 3, march: 3, mar: 3, avril: 4, april: 4, apr: 4, avr: 4,
  mai: 5, may: 5, juin: 6, june: 6, jun: 6, juillet: 7, july: 7, jul: 7, juil: 7, aout: 8, august: 8, aug: 8,
  septembre: 9, september: 9, sept: 9, sep: 9, octobre: 10, october: 10, oct: 10, novembre: 11, november: 11, nov: 11,
  decembre: 12, december: 12, dec: 12,
};
const MONTH_RE = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join('|');

// The first date written in a short piece of text: 15/01/2027, 15 janvier 2027, January 15, 2027, janvier 2027…
function firstDate(text) {
  const iso = (y, m, d) => (y >= 2025 && y <= 2030 && m >= 1 && m <= 12 && d >= 1 && d <= 31 ? `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` : '');
  const found = [
    [/\b(\d{1,2})[/.-](\d{1,2})[/.-](20\d{2})\b/, (m) => iso(+m[3], +m[2], +m[1])],
    [new RegExp(`\\b(\\d{1,2})(?:er|st|nd|rd|th)?\\s+(${MONTH_RE})\\.?\\s+(20\\d{2})\\b`), (m) => iso(+m[3], MONTHS[m[2]], +m[1])],
    [new RegExp(`\\b(${MONTH_RE})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(20\\d{2})\\b`), (m) => iso(+m[3], MONTHS[m[1]], +m[2])],
    [new RegExp(`\\b(${MONTH_RE})\\.?\\s+(20\\d{2})\\b`), (m) => iso(+m[2], MONTHS[m[1]], 1)],
  ].map(([re, toIso]) => {
    const m = text.match(re);
    return m ? { at: m.index, date: toIso(m) } : null;
  }).filter((x) => x && x.date);
  // The date closest to the keyword wins.
  return found.sort((a, b) => a.at - b.at)[0]?.date || '';
}

// Deadline and start date found near words like "deadline", "date limite", "start date", "à partir de"…
function parseOfferDates(text) {
  const t = norm(text);
  const near = (re) => {
    for (const hit of t.matchAll(re)) {
      const d = firstDate(t.slice(hit.index + hit[0].length, hit.index + hit[0].length + 60));
      if (d) return d;
    }
    return '';
  };
  return {
    deadline: near(/(deadline|apply (by|before)|applications? (close|due)|closing date|date limite|candidatures? (jusqu'au|avant le)|avant le|jusqu'au)/g),
    startDate: near(/(start date|starting date|starting( in| on)?|start( in| on)|date de debut|date de demarrage|demarrage|prise de poste|a partir de|des le|a pourvoir)/g),
  };
}

// Only the dates the offer doesn't have yet (a deadline already passed isn't kept).
function missingDates(item) {
  if (!item.description) return {};
  const found = parseOfferDates(item.description);
  const out = {};
  if (found.deadline && !item.deadline && found.deadline >= today()) out.deadline = found.deadline;
  if (found.startDate && !item.startDate && found.startDate >= today()) out.startDate = found.startDate;
  return out;
}

async function updateInternship(id, fields) {
  const list = await loadAll();
  const i = list.findIndex((x) => x.id === id);
  if (i < 0) return null;
  // Nothing new: don't rewrite the whole list (that would also redraw every open page).
  if (Object.entries(fields).every(([k, v]) => JSON.stringify(list[i][k]) === JSON.stringify(v))) return list[i];
  list[i] = { ...list[i], ...fields, updatedAt: new Date().toISOString() };
  await saveAll(list);
  return list[i];
}

function guessDuration(text) {
  const m = norm(text).match(/\b(\d{1,2})\s*(mois|months?)\b/);
  return m && Number(m[1]) <= 12 ? `${m[1]} months` : '';
}

async function deleteInternship(id) {
  await saveAll((await loadAll()).filter((x) => x.id !== id));
}

// What needs doing now, or '' if nothing.
// Days since the offer last changed step (or since it was liked / found).
function daysInStep(item) {
  const last = (item.history || []).at(-1)?.at || item.likedAt || item.updatedAt || item.createdAt;
  if (!last) return 0;
  return Math.max(0, Math.round((new Date(today()) - new Date(last.slice(0, 10))) / 86400000));
}

// "An action to do", like the red badge on Apple Messages: what to do next, or '' if nothing.
function attention(item) {
  if (item.archived) return '';
  const t = today();
  const days = daysInStep(item);
  if (item.status === 'To apply' && days >= 3 && !(item.deadline && item.deadline < t)) return item.deadline ? 'Apply before the deadline' : 'Apply, or let go';
  if (item.status === 'Interview' && item.interviewAt && item.interviewAt.slice(0, 10) < t) return 'Update after the interview';
  if (item.status === 'Applied' && days >= 21) return 'No news: update the step';
  if (item.status === 'To apply' && item.deadline) {
    if (item.deadline < t) return 'Deadline passed';
    if (item.deadline <= addDays(t, DEADLINE_WARNING_DAYS)) return 'Deadline soon';
  }
  if ((item.status === 'Applied' || item.status === 'Interview') && item.followUpDate && item.followUpDate <= t) {
    return 'Follow up';
  }
  return '';
}

// ---- Saved searches (checked automatically every day) ----

async function loadSearches() {
  const { searches = [] } = await chrome.storage.local.get('searches');
  return searches;
}

async function saveSearches(searches) {
  await chrome.storage.local.set({ searches });
}

function isLinkedin(url) {
  return hostOf(url).endsWith('linkedin.com');
}

// A readable default name, e.g. "linkedin.com – stage marketing".
function searchName(url) {
  try {
    const p = new URL(url).searchParams;
    const words = p.get('keywords') || p.get('q') || p.get('query') || p.get('search');
    return words ? `${hostOf(url)} – ${words}` : hostOf(url);
  } catch {
    return url;
  }
}

// LinkedIn's public job search, which works logged out. Keeps the filters of a normal search link.
function linkedinGuestUrl(searchUrl, start = 0) {
  const to = new URLSearchParams();
  for (const [k, v] of new URL(searchUrl).searchParams) {
    if (/^(keywords|location|geoId|distance|sortBy|f_[A-Za-z]+)$/.test(k)) to.set(k, v);
  }
  to.set('start', String(start));
  return `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?${to}`;
}

// HTML to plain text without a DOM (the background worker has none). Keeps line breaks when asked.
function htmlText(html, keepLines = false) {
  let s = String(html || '');
  if (keepLines) s = s.replace(/<li[^>]*>/gi, '\n• ').replace(/<br\s*\/?>|<\/(p|div|li|ul|ol|h\d)>/gi, '\n');
  s = s.replace(/<[^>]+>/g, '')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
  if (!keepLines) return s.replace(/\s+/g, ' ').trim();
  return s.split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

// LinkedIn's public page for one offer: the description and the criteria (seniority, type…).
function parseLinkedinJob(html) {
  const desc = html.match(/show-more-less-html__markup[^>]*>([\s\S]*?)<\/div>/)?.[1];
  const criteria = [...html.matchAll(/job-criteria-subheader">([\s\S]*?)<\/h3>\s*<span[^>]*>([\s\S]*?)<\/span>/g)]
    .map((m) => `${htmlText(m[1])}: ${htmlText(m[2])}`);
  const crit = Object.fromEntries(criteria.map((c) => c.split(': ')));
  const applicants = htmlText(html.match(/num-applicants__caption[^>]*>([\s\S]*?)<\/(span|figcaption)>/)?.[1]);
  const ago = htmlText(html.match(/posted-time-ago__text[^>]*>([\s\S]*?)<\/span>/)?.[1]);
  const out = {
    description: htmlText(desc, true).slice(0, 8000),
    criteria: criteria.join(' · '),
    industry: crit.Industries || '',
    contract: normContract(crit['Employment type'] || ''),
    applicants,
    early: /first \d+ applicants|early applicant/i.test(applicants) || Number(applicants.match(/^(\d+) applicants?/)?.[1] ?? 99) < 25,
    postedAgo: ago,
    logo: htmlText(html.match(/top-card-layout__entity-image[\s\S]{0,400}?data-delayed-url="([^"]+)"/)?.[1] || html.match(/data-delayed-url="(https:\/\/media\.licdn\.com\/[^"]*company-logo[^"]*)"/)?.[1] || ''),
    companyUrl: html.match(/topcard__org-name-link[^>]*href="([^"?]+)/)?.[1] || '',
  };
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v !== '' && v !== false));
}

// "1 week ago", "3 days ago"… → YYYY-MM-DD
function agoToDate(text) {
  const t = norm(text);
  const m = t.match(/(\d+)\s*(minute|hour|day|week|month|year)/);
  if (!m && !/just now|today/.test(t)) return '';
  const n = m ? Number(m[1]) : 0;
  const days = !m ? 0 : { minute: 0, hour: 0, day: 1, week: 7, month: 30, year: 365 }[m[2]] * n;
  return addDays(today(), -days);
}

function linkedinJobId(url) {
  return String(url).match(/linkedin\.com\/jobs\/view\/(\d+)/)?.[1] || '';
}

function parseLinkedinGuest(html) {
  const decode = (s) => htmlText(s);
  const pick = (chunk, cls) => {
    const m = chunk.match(new RegExp(`class="[^"]*\\b${cls}\\b[^"]*"[^>]*>([\\s\\S]*?)</(h3|h4|span|div)>`));
    return m ? decode(m[1]) : '';
  };
  return html.split('<li').slice(1).map((chunk) => {
    const id = chunk.match(/urn:li:jobPosting:(\d+)/)?.[1];
    if (!id) return null;
    return {
      url: `https://www.linkedin.com/jobs/view/${id}/`,
      title: pick(chunk, 'base-search-card__title'),
      company: pick(chunk, 'base-search-card__subtitle'),
      location: pick(chunk, 'job-search-card__location'),
      logo: htmlText(chunk.match(/data-delayed-url="(https:\/\/media\.licdn\.com\/[^"]*company-logo[^"]*)"/)?.[1] || ''),
      companyUrl: chunk.match(/base-search-card__subtitle[\s\S]*?href="([^"?]+)/)?.[1] || '',
      postedAt: chunk.match(/datetime="(\d{4}-\d{2}-\d{2})"/)?.[1] || '',
      early: /early applicant/i.test(chunk),
    };
  }).filter((o) => o && o.title);
}

// ---- Match profile (how well an offer fits your CV) ----

const DEFAULT_PROFILE = {
  roles: [
    { name: 'Founder Associate / Chief of Staff / BizOps', keywords: 'founder associate, founders associate, chief of staff, bizops, business operations, strategy and operations, strategy & operations, bras droit, office of the ceo, ceo office' },
    { name: 'Product', keywords: 'product manager, product owner, product operations, product ops, product analyst, product management' },
    { name: 'Business development / Sales / GTM', keywords: 'business developer, business development, sales development, account executive, growth, partnerships, go-to-market, gtm, bizdev, sdr, bdr, partenariats' },
    { name: 'Strategy / Innovation / Transformation', keywords: 'strategy, stratégie, innovation, transformation, corporate development, consulting, consultant, business analyst, chargé de mission' },
    { name: 'Venture capital / Investment', keywords: 'venture capital, vc analyst, vc intern, investment analyst, investment associate, venture associate, venture analyst, private equity, analyste investissement, deal flow' },
  ],
  regions: 'France, European Union, United Kingdom, United States, Canada, Latin America',
  levels: { internship: true, entry: true },
  boost: 'startup, start-up, scale-up, scaleup, saas, b2b, ai, ia, artificial intelligence, intelligence artificielle, tech, software, internet, fintech, deeptech, venture capital, private equity, seed, series a, series b, automation, automatisation, power bi, python, servicenow, data, international, founder, ceo',
  avoid: 'senior, sr, lead, head of, principal, director, directeur, directrice, vp, vice president, software engineer, développeur, developpeur, full stack, fullstack, backend, frontend, devops, data engineer, data scientist, machine learning engineer, alternance, apprentissage, apprenti, comptable, accountant, juriste',
  places: 'france, paris, ile-de-france, lyon, marseille, lille, bordeaux, toulouse, nantes, remote, télétravail, europe, emea, european union, london, united kingdom, uk, berlin, munich, germany, amsterdam, netherlands, brussels, belgium, madrid, barcelona, spain, milan, italy, lisbon, portugal, dublin, ireland, luxembourg, new york, san francisco, united states, usa, canada, montreal, toronto, latin america, latam, mexico, santiago, chile, são paulo, brazil, buenos aires, argentina, bogota, colombia, lima, peru',
  hideWeak: false,
  minScore: 40,
  learn: true, // the score also learns from your likes and passes
  logoDevKey: '', // free publishable key from logo.dev (starts with pk_)
};

// Words in a title that hint at a related role, when none of your role keywords match.
const ROLE_HINTS = 'business, product, program, programme, strategy, stratégie, growth, sales, vente, commercial, partnership, partenariat, innovation, operations, opérations, transformation, consultant, conseil, project, projet, venture, digital, marketing, analyst, account';
const LEVEL_WORDS = /(^|[^a-z])(stage|stagiaire|intern|internship|graduate|junior|vie|v\.i\.e|fin d'etudes|end of studies|new grad|entry level|cdi|associate|trainee)([^a-z]|$)/;

const BIG_TECH_NAMES = 'google, alphabet, amazon, aws, apple, microsoft, meta, nvidia, salesforce, stripe, ibm, oracle, sap, adobe, netflix, uber, airbnb, spotify, servicenow, cisco, intel, openai, anthropic, mistral ai, datadog';

// Companies tagged "Big group" in the tracker.
const BIG_GROUPS = "l'oreal, lvmh, kering, hermes, chanel, danone, pernod ricard, nestle, unilever, procter & gamble, p&g, sanofi, servier, bnp paribas, societe generale, credit agricole, natixis, bpce, axa, allianz, generali, cnp assurances, amundi, totalenergies, engie, edf, veolia, suez, saint-gobain, schneider electric, legrand, air liquide, michelin, renault, stellantis, valeo, forvia, safran, thales, airbus, dassault, capgemini, atos, sopra steria, orange, sfr, bouygues, vinci, eiffage, alstom, accor, carrefour, auchan, decathlon, leroy merlin, publicis, havas, vivendi, canal+, ubisoft, sodexo, essilorluxottica, arkema, google, alphabet, meta, microsoft, amazon, aws, apple, salesforce, oracle, sap, ibm, servicenow, adobe, nvidia, intel, cisco, uber, airbnb, spotify, netflix, mckinsey, boston consulting group, bcg, bain, roland berger, oliver wyman, kearney, accenture, deloitte, pwc, ey, ernst & young, kpmg, forvis mazars, mazars, wavestone, sia partners, goldman sachs, jpmorgan, j.p. morgan, morgan stanley, lazard, rothschild, hsbc, barclays, ubs, citi, santander, bbva, ing, deutsche bank, siemens, bosch, bmw, mercedes-benz, volkswagen, philips, ab inbev, heineken, diageo, coca-cola, pepsico, mars, nespresso, rentokil, bpifrance, caisse des depots, la poste, sncf, ratp, ministere, banque de france, bnp, natixis";

function norm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’`]/g, "'");
}

// Word lists and word patterns are built once and reused (they're checked thousands of times per screen).
const WORDS_CACHE = new Map();
function words(s) {
  const key = String(s || '');
  let list = WORDS_CACHE.get(key);
  if (!list) {
    list = key.split(/[,\n]/).map((w) => w.trim()).filter(Boolean);
    if (WORDS_CACHE.size > 500) WORDS_CACHE.clear();
    WORDS_CACHE.set(key, list);
  }
  return list;
}

const WORD_RE = new Map();
function has(text, word) {
  let re = WORD_RE.get(word);
  if (!re) {
    const w = norm(word).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    re = new RegExp(`(^|[^a-z0-9])${w}($|[^a-z0-9])`);
    WORD_RE.set(word, re);
  }
  return re.test(text);
}

async function loadProfile() {
  const { profile } = await chrome.storage.local.get('profile');
  return { ...DEFAULT_PROFILE, ...profile };
}

async function saveProfile(profile) {
  await chrome.storage.local.set({ profile });
}

// 0–100, with the reasons, so the filter can be tuned by looking at why.
// Remembered per offer and profile, since sorting and filtering ask for it many times.
const SCORE_CACHE = new WeakMap();
function matchScore(item, p = DEFAULT_PROFILE) {
  const hit = SCORE_CACHE.get(item);
  if (hit && hit.p === p) return hit.r;
  const r = computeMatchScore(item, p);
  SCORE_CACHE.set(item, { p, r });
  return r;
}

// ---- Learning your taste from your swipes ----

const TASTE_MIN = 5; // at least this many likes and this many passes before it starts to count
const TASTE_SKIP = new Set(norm('intern internship stage stagiaire junior with pour dans les des une that this from your team 2026 2027 2028 summer fall winter spring program programme months mois'));

// What an offer is made of: title words, company, kind, contract, place, site.
function itemFeatures(item) {
  const f = new Set();
  norm(item.title).split(/[^a-z0-9+#]+/).filter((w) => w.length >= 4 && !/^\d+$/.test(w) && !TASTE_SKIP.has(w)).forEach((w) => f.add(`t:${w}`));
  if (item.company) f.add(`c:${norm(item.company)}`);
  const kind = companyTag(item);
  if (kind) f.add(`k:${kind}`);
  const contract = contractOf(item);
  if (contract) f.add(`ct:${contract}`);
  locationGroups(item).filter((g) => g !== 'Not specified').forEach((g) => f.add(`l:${g}`));
  f.add(`s:${siteName(item)}`);
  return [...f];
}

// How much each feature goes with liked offers (positive) or passed ones (negative).
function buildTaste(items, protect = new Set()) {
  const liked = items.filter((i) => LIKED_STEPS.includes(i.status));
  const passed = items.filter((i) => i.status === 'Not interested');
  if (liked.length < TASTE_MIN || passed.length < TASTE_MIN) return { ready: false, nLiked: liked.length, nPassed: passed.length, w: {}, top: [] };
  const L = {};
  const P = {};
  // Your main role words (Preferences) are never learned away: only the rest of the title counts.
  const keep = (k) => !(k.startsWith('t:') && protect.has(k.slice(2)));
  liked.forEach((i) => itemFeatures(i).filter(keep).forEach((k) => (L[k] = (L[k] || 0) + 1)));
  passed.forEach((i) => itemFeatures(i).filter(keep).forEach((k) => (P[k] = (P[k] || 0) + 1)));
  const w = {};
  const top = [];
  for (const k of new Set([...Object.keys(L), ...Object.keys(P)])) {
    const l = L[k] || 0;
    const q = P[k] || 0;
    if (l + q < 3) continue; // too little to say anything
    w[k] = Math.log((l + 1) / (liked.length + 2)) - Math.log((q + 1) / (passed.length + 2));
    top.push({ key: k, w: w[k], liked: l, passed: q });
  }
  return { ready: true, nLiked: liked.length, nPassed: passed.length, w, top: top.sort((a, b) => Math.abs(b.w) - Math.abs(a.w)) };
}

const TASTE_NAMES = { t: (v) => `“${v}”`, c: (v) => v, k: (v) => v, ct: (v) => v, l: (v) => v, s: (v) => v };
function tasteLabel(key) {
  const [type, ...rest] = key.split(':');
  return (TASTE_NAMES[type] || ((v) => v))(rest.join(':'));
}

// Up to ±20 points, from the 5 signals that count most for this offer.
function tasteDelta(item, taste) {
  if (!taste?.ready) return { delta: 0, why: '' };
  const hits = itemFeatures(item).filter((k) => taste.w[k] !== undefined).sort((a, b) => Math.abs(taste.w[b]) - Math.abs(taste.w[a])).slice(0, 5);
  const delta = Math.max(-20, Math.min(20, Math.round(hits.reduce((n, k) => n + taste.w[k], 0) * 8)));
  const strong = hits.find((k) => Math.sign(taste.w[k]) === Math.sign(delta) && Math.abs(taste.w[k]) >= 0.4);
  return { delta, why: delta && strong ? `${delta > 0 ? 'You tend to like' : 'You tend to pass on'} ${tasteLabel(strong)}` : '' };
}

function computeMatchScore(item, p) {
  const title = norm(item.title);
  const all = norm([item.title, item.company, item.description, item.criteria].join(' '));
  const place = norm(item.location);
  const why = [];
  let score = 0;
  const role = p.roles.find((r) => words(r.keywords).some((k) => has(title, k)));
  if (role) {
    score += 60;
    why.push(`Role: ${role.name}`);
  } else if (words(ROLE_HINTS).some((k) => has(title, k))) {
    score += 25;
    why.push('Related role');
  }
  const criteria = norm(item.criteria);
  if (LEVEL_WORDS.test(`${title} ${criteria}`)) {
    score += 10;
    why.push('Internship / junior');
  }
  const avoid = words(p.avoid).filter((k) => has(title, k));
  if (avoid.length) {
    score -= 45;
    why.push(`Avoid: ${avoid.join(', ')}`);
  }
  if (/mid-senior|director|executive/.test(criteria)) {
    score -= 30;
    why.push('Seniority: too senior');
  }
  const plus = words(p.boost).filter((k) => has(all, k));
  if (plus.length) {
    score += Math.min(16, plus.length * 4);
    why.push(`Plus: ${plus.slice(0, 5).join(', ')}`);
  }
  if (/stationf|venturecapitalcareers/.test(item.source || '')) {
    score += 8;
    why.push('Startup / VC job board');
  }
  if (place) {
    if (words(p.places).some((k) => has(place, k)) || wantedRegion(item, p)) score += 10;
    else {
      score -= 15;
      why.push('Location not in your list');
    }
  }
  if (p.learn !== false && p.taste?.ready) {
    const t = tasteDelta(item, p.taste);
    if (t.delta) {
      score += t.delta;
      if (t.why) why.push(`Learned: ${t.why}`);
    }
  }
  return { score: Math.max(0, Math.min(100, score)), why };
}

// "Big group", "VC", "Startup" or "Tech", from the company name, the site and LinkedIn's industry.
const TAG_CACHE = new WeakMap();
// True when the offer's place falls in a region your places cover (e.g. "Clichy, FRA" → France).
const REGION_WORDS = {
  'Paris area': ['france', 'paris'], 'Rest of France': ['france'], Europe: ['europe', 'european union', 'emea', 'germany', 'spain', 'italy'],
  'United Kingdom': ['united kingdom', 'uk', 'london'], 'USA & Canada': ['united states', 'usa', 'canada', 'new york'],
  'Latin America': ['latin america', 'latam', 'mexico', 'brazil', 'chile'], Remote: ['remote', 'télétravail'],
};
function wantedRegion(item, p) {
  const places = norm(p.places);
  return locationGroups(item).some((g) => (REGION_WORDS[g] || []).some((w) => has(places, w)));
}

function companyTag(item) {
  if (TAG_CACHE.has(item)) return TAG_CACHE.get(item);
  const tag = computeCompanyTag(item);
  TAG_CACHE.set(item, tag);
  return tag;
}

function computeCompanyTag(item) {
  const c = norm(item.company);
  const industry = norm(`${item.industry || ''} ${item.criteria || ''}`);
  if (c && words(BIG_TECH_NAMES).some((g) => has(c, g))) return 'Big tech';
  if (c && words(BIG_GROUPS).some((g) => has(c, g))) return 'Big group';
  if (/venturecapitalcareers/.test(item.source || '') || /venture capital|private equity/.test(industry)) return 'VC';
  if (/stationf/.test(item.source || '')) return 'Startup';
  if (/software|internet|technology|it services|computer/.test(industry)) return 'Tech';
  return '';
}

// Startups whose job boards can be followed (Lever, Greenhouse and Ashby publish free public job data).
const FOLLOW_SUGGESTIONS = [
  ['Qonto', 'https://jobs.ashbyhq.com/qonto'], ['Alan', 'https://jobs.ashbyhq.com/alan'], ['Pennylane', 'https://jobs.ashbyhq.com/pennylane'],
  ['Doctolib', 'https://jobs.ashbyhq.com/doctolib'], ['Back Market', 'https://jobs.ashbyhq.com/backmarket'], ['Ledger', 'https://jobs.ashbyhq.com/ledger'],
  ['Photoroom', 'https://jobs.ashbyhq.com/photoroom'], ['Dust', 'https://jobs.ashbyhq.com/dust'], ['Hexa (eFounders)', 'https://jobs.ashbyhq.com/hexa'],
  ['lemlist', 'https://jobs.ashbyhq.com/lemlist'], ['Sorare', 'https://jobs.ashbyhq.com/sorare'], ['Ankorstore', 'https://jobs.ashbyhq.com/ankorstore'],
  ['Pigment', 'https://jobs.lever.co/pigment'], ['Aircall', 'https://jobs.lever.co/aircall'], ['Swile', 'https://jobs.lever.co/swile'],
  ['Agicap', 'https://jobs.lever.co/agicap'], ['Malt', 'https://jobs.lever.co/malt'], ['Brevo', 'https://jobs.lever.co/brevo'],
  ['Contentsquare', 'https://jobs.lever.co/contentsquare'], ['Dataiku', 'https://job-boards.greenhouse.io/dataiku'], ['Algolia', 'https://job-boards.greenhouse.io/algolia'],
];

// Startup and VC job boards, searched with the first words of each role family.
// (Station F and JobTeaser only show offers inside a browser window, so they aren't checked automatically.)
const BOARDS = [];
const VC_BOARD_QUERIES = ['intern', 'analyst', 'associate'];

// Big tech careers sites (internships in France), plus LinkedIn filtered on big tech companies for abroad
// and for Microsoft / Meta, whose own sites can't be read automatically.
const BIG_TECH_LINKEDIN_IDS = '1441,1586,162479,1035,10667,3608,3185,2135371'; // Google, Amazon, Apple, Microsoft, Meta, Nvidia, Salesforce, Stripe
// One gate for every search (LinkedIn, big tech, VC boards, followed startups): your Preferences decide what comes in.
// strict = a broad source (any job of a company): the offer must clearly fit you, not only the place and level.
function fitsPreferences(o, p, { strict = false } = {}) {
  const title = norm(o.title).replace('chief of staff', '');
  const contract = contractOf(o);
  if (words(p.avoid).some((k) => has(title, k))) return false; // your words to avoid
  if (/(^|[^a-z])(senior|sr|principal|head of|director|directeur|directrice|vp|manager ii|expert)([^a-z]|$)/.test(title)) return false;
  if (contract === 'Internship' && p.levels?.internship === false) return false;
  if (contract === 'Full-time' && p.levels?.entry === false) return false;
  // The place must be one you want (when the offer says where it is).
  const where = { ...p, places: `${p.places}, ${p.regions}` };
  if (o.location && !words(where.places).some((k) => has(norm(o.location), k)) && !wantedRegion(o, where)) return false;
  if (!strict) return true;
  if (/(^|[^a-z])(freelance|apprentice|apprenticeship|alternance|apprenti|apprentissage|lead|staff)([^a-z]|$)/.test(`${title} ${norm(o.contract)}`)) return false;
  const junior = LEVEL_WORDS.test(norm(`${o.title} ${o.contract || ''}`));
  if (!junior && /(^|[^a-z])manager([^a-z]|$)/.test(title) && !/(product|program|programme|project) manager/.test(title)) return false;
  const score = matchScore(o, p).score;
  return (junior && score >= 30) || score >= 55;
}

function bigTechSearches(p = DEFAULT_PROFILE) {
  const regions = words(p.regions);
  const isFrance = (r) => /^france$/i.test(r);
  const li = (name, location, companies = BIG_TECH_LINKEDIN_IDS) => ({
    name,
    url: `https://www.linkedin.com/jobs/search/?${new URLSearchParams({ keywords: 'intern OR internship OR stage OR graduate', location, f_C: companies, f_TPR: 'r604800' })}`,
    auto: true,
  });
  const q = p.levels?.internship === false ? 'graduate' : 'intern';
  const perRegion = regions.flatMap((r) => [
    { name: `Google careers · ${q} · ${r}`, url: `https://www.google.com/about/careers/applications/jobs/results/?${new URLSearchParams({ q, location: r })}`, auto: true },
    { name: `Amazon jobs · ${q} · ${r}`, url: `https://www.amazon.jobs/en/search?${new URLSearchParams({ base_query: q, loc_query: r, ...(isFrance(r) ? { country: 'FRA' } : {}) })}`, auto: true },
    { name: `Nvidia careers · ${q} · ${r}`, url: `https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite?${new URLSearchParams({ q: `${q} ${r}` })}`, auto: true },
    ...(isFrance(r) ? [] : [li(`Big tech (LinkedIn) · ${r}`, r)]),
  ]);
  const fixed = [
    ...(regions.some(isFrance) || !regions.length ? [
      { name: 'Apple jobs · intern · France', url: 'https://jobs.apple.com/en-us/search?search=intern&location=france-FRAC', auto: true },
      li('Microsoft & Meta (LinkedIn) · France', 'France', '1035,10667'),
      { name: 'L’Oréal (LinkedIn) · France', url: `https://www.linkedin.com/jobs/search/?${new URLSearchParams({ keywords: '"L\'Oréal" stage OR intern OR internship OR graduate OR VIE', location: 'France', f_TPR: 'r604800' })}`, auto: true },
    ] : []),
    { name: `Stripe jobs · ${q}`, url: `https://stripe.com/jobs/search?query=${q}`, auto: true },
  ];
  return [...perRegion, ...fixed];
}

// One LinkedIn search per role family and region (posted in the last 7 days), plus the job boards.
function profileSearches(p) {
  const levels = [p.levels?.internship && '1', p.levels?.entry && '2'].filter(Boolean).join(',') || '1';
  const out = [];
  for (const r of p.roles) {
    const query = words(r.keywords).slice(0, 6).map((k) => (k.includes(' ') ? `"${k}"` : k)).join(' OR ');
    if (!query) continue;
    for (const region of words(p.regions)) {
      const q = new URLSearchParams({ keywords: query, location: region, f_E: levels, f_TPR: 'r604800' });
      out.push({ name: `${r.name} · ${region}`, url: `https://www.linkedin.com/jobs/search/?${q}`, auto: true });
    }
    const first = words(r.keywords)[0];
    if (first) for (const b of BOARDS) out.push({ name: `${b.name} · ${first}`, url: b.search(first), auto: true });
  }
  for (const q of VC_BOARD_QUERIES) {
    out.push({ name: `VC Careers · ${q}`, url: `https://venturecapitalcareers.com/jobs?query=${q}`, auto: true });
  }
  return [...out, ...bigTechSearches(p)];
}

// ---- Cleaning descriptions ----

// Removes invisible characters, broken symbols, decorative lines and extra spacing.
function cleanDescription(text) {
  return String(text || '')
    .replace(/Ã©/g, 'é').replace(/Ã¨/g, 'è').replace(/Ã /g, 'à ').replace(/Ã§/g, 'ç').replace(/Ã´/g, 'ô').replace(/Ã®/g, 'î').replace(/Ãª/g, 'ê')
    .replace(/â€™/g, '’').replace(/â€œ|â€\x9d/g, '"').replace(/â€“/g, '–').replace(/â€”/g, '—').replace(/â€¢/g, '•').replace(/â€¦/g, '…')
    .replace(/Â(?=[\s\u00a0])/g, '')
    .replace(/[\u200b-\u200f\u2028\u2029\u202a-\u202e\u2060-\u2064\ufeff\u00ad\ufffd]/g, '')
    .replace(/[\u00a0\u2007\u202f\t]/g, ' ')
    .replace(/\*\*|__/g, '')
    .split('\n')
    .map((l) => l.replace(/ {2,}/g, ' ').trim())
    .filter((l) => !/^[-–—_=*•·~#.]{3,}$/.test(l) && !/^(show (more|less)|voir (plus|moins)|see more|lire la suite|…\s*see more)$/i.test(l))
    .map((l) => l.replace(/^[*·▪●◦‣∙-]\s+/, '• '))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// The sentence that says what the job is (not the company presentation), to show first.
function leadSentence(description) {
  const text = cleanDescription(description || '');
  if (!text) return '';
  const intro = /^(about|a propos|qui sommes|description de l.entreprise|company description|our company|l.entreprise|who we are|nous sommes)/;
  const lines = text.split('\n').map((l) => l.replace(/^•\s*/, '').trim()).filter((l) => l.length > 40 && !/:$/.test(l));
  const sentences = lines.flatMap((l) => l.split(/(?<=[.!?])\s+(?=[A-ZÀ-Ý])/)).map((x) => x.trim()).filter((x) => x.length > 40);
  // Clearest phrases first ("as a…", "you will…", "en tant que…"), then weaker ones ("au sein de…", "join…").
  const strong = /(en tant que|as an? |you will|you'll|in this role|we are looking for|we're looking for|vous serez|tu seras|nous recherchons|nous cherchons|your mission|votre mission|ta mission|vos missions|tes missions)/;
  const weak = /(your role|the role|rattache|au sein de|you would|join our|rejoins|rejoignez|recrute|is hiring)/;
  const heading = (x) => !/[.!?…]$/.test(x) && x.length < 90; // "Vos missions", "About the role"…
  const ok = (x) => !intro.test(norm(x)) && !heading(x);
  const pick = sentences.find((x) => strong.test(norm(x)) && ok(x)) || sentences.find((x) => weak.test(norm(x)) && ok(x)) || sentences.find(ok) || sentences[0] || '';
  return pick.length > 260 ? `${pick.slice(0, 257).trim()}…` : pick;
}

// ---- Filters (location, contract, company type, freshness, site) ----

const LOCATION_GROUPS = [
  ['Paris area', /paris|ile-de-france|hauts-de-seine|boulogne|neuilly|clichy|la defense|issy|levallois|saint-denis|courbevoie|puteaux|nanterre|montrouge|maisons-alfort|aubervilliers|vincennes|saint-ouen|rueil|velizy|massy|saclay/],
  ['Rest of France', /france|(^|[^a-z])fr([^a-z]|$)|(^|[^a-z])fra([^a-z]|$)|lyon|marseille|lille|bordeaux|toulouse|nantes|nice|montpellier|rennes|strasbourg|grenoble|sophia|aix-en|saint-priest/],
  ['Europe', /europe|emea|european union|germany|berlin|munich|hamburg|frankfurt|netherlands|amsterdam|belgium|brussels|bruxelles|spain|madrid|barcelona|italy|milan|milano|rome|portugal|lisbon|ireland|dublin|switzerland|zurich|geneva|lausanne|luxembourg|sweden|stockholm|denmark|copenhagen|austria|vienna|poland|warsaw|czech|prague|norway|oslo|finland|helsinki/],
  ['United Kingdom', /united kingdom|(^|[^a-z])uk([^a-z]|$)|england|london|manchester|edinburgh|cambridge|oxford|(^|[^a-z])gbr([^a-z]|$)/],
  ['USA & Canada', /united states|(^|[^a-z])usa?([^a-z]|$)|new york|san francisco|california|boston|seattle|texas|austin|chicago|washington|virginia|canada|toronto|montreal|vancouver|ontario|quebec|(^|[^a-z])ny([^a-z]|$)|(^|[^a-z])ca([^a-z]|$)/],
  ['Latin America', /latin america|latam|mexico|brazil|brasil|sao paulo|argentina|buenos aires|chile|santiago|colombia|bogota|peru|lima|uruguay|montevideo/],
  ['Remote', /remote|teletravail|a distance|anywhere/],
];

function locationGroups(item) {
  const t = norm(`${item.location || ''} ${item.workMode || ''}`);
  const found = LOCATION_GROUPS.filter(([, re]) => re.test(t)).map(([name]) => name);
  // "Paris, France" is Paris area, not rest of France.
  const out = found.includes('Paris area') ? found.filter((g) => g !== 'Rest of France') : found;
  if (out.length) return out;
  return (item.location || '').trim() ? ['Other places'] : ['Not specified'];
}

const SITE_NAMES = [
  [/linkedin\.com/, 'LinkedIn'], [/stationf\.co/, 'Station F'], [/jobteaser\.com/, 'JobTeaser'], [/venturecapitalcareers\.com/, 'VC Careers'],
  [/google\.com/, 'Google'], [/amazon\.jobs/, 'Amazon'], [/apple\.com/, 'Apple'], [/salesforce\.com/, 'Salesforce'],
  [/myworkdayjobs\.com/, 'Workday sites'], [/stripe\.com/, 'Stripe'], [/welcometothejungle\.com/, 'Welcome to the Jungle'],
];
function siteName(item) {
  const host = item.source || hostOf(item.url);
  // Workday hosts each company's careers site: show the company (nvidia.wd5.myworkdayjobs.com → Nvidia).
  if (/myworkdayjobs\.com$/.test(host)) return host.split('.')[0].replace(/^\w/, (c) => c.toUpperCase());
  return SITE_NAMES.find(([re]) => re.test(host))?.[1] || host || 'Other';
}

const FILTERS = [
  { key: 'location', label: 'Location', values: (i) => locationGroups(i) },
  { key: 'contract', label: 'Contract', values: (i) => [contractOf(i) || 'Not specified'] },
  { key: 'kind', label: 'Company type', values: (i) => [companyTag(i) || 'Other'] },
  { key: 'site', label: 'Site', values: (i) => [siteName(i)] },
];
const POSTED_WITHIN = [['', 'Any time'], ['1', 'Last 24 h'], ['7', 'Last 7 days'], ['30', 'Last 30 days']];

function passesFilters(item, f) {
  for (const def of FILTERS) {
    const picked = f[def.key] || [];
    if (picked.length && !def.values(item).some((v) => picked.includes(v))) return false;
    const hidden = f[`${def.key}Not`] || [];
    if (hidden.length && def.values(item).every((v) => hidden.includes(v))) return false;
  }
  if (f.posted) {
    // Sites that don't show a posting date: use the day the tracker found the offer.
    const date = item.postedAt || (item.createdAt || '').slice(0, 10);
    if (!date || date < addDays(today(), -Number(f.posted))) return false;
  }
  if (f.early && !item.early) return false;
  if (f.minMatch && matchScore(item, currentProfile).score < Number(f.minMatch)) return false;
  return true;
}
// The profile used by the "Match" filter (set by the tracker once loaded).
let currentProfile = DEFAULT_PROFILE;
const MATCH_LEVELS = [['', 'Match: any'], ['40', 'Match: 40%+'], ['60', 'Match: 60%+'], ['80', 'Match: 80%+']];

// ---- Suggestions learned from your swipes ----

const LIKED_STEPS = ['To apply', 'Applied', 'Interview', 'Offer', 'Rejected'];
const SUGGEST_SKIP_WORDS = new Set(norm(`intern internship interns stage stagiaire stages junior senior associate analyst manager
  with pour dans les des une that this from your team 2026 2027 2028 paris france london remote hybrid summer winter
  fall spring program programme months mois`).split(/\s+/).filter(Boolean));

// Up to a few suggestions, most useful first. Needs a handful of swipes before saying anything.
function computeSuggestions(items, f = {}, p = DEFAULT_PROFILE, dismissed = []) {
  const liked = items.filter((i) => LIKED_STEPS.includes(i.status));
  const passed = items.filter((i) => i.status === 'Not interested');
  const out = [];
  if (passed.length < 5) return out;
  const vague = (v) => v === 'Not specified' || v === 'Other' || v === 'Other places';

  // A place, contract or company type you always pass on.
  for (const def of FILTERS.filter((d) => ['location', 'contract', 'kind'].includes(d.key))) {
    const likedValues = new Set(liked.flatMap((i) => def.values(i)));
    const counts = {};
    passed.forEach((i) => def.values(i).forEach((v) => (counts[v] = (counts[v] || 0) + 1)));
    const hidden = f[`${def.key}Not`] || [];
    const [value, n] = Object.entries(counts)
      .filter(([v, c]) => c >= 4 && !likedValues.has(v) && !vague(v) && !hidden.includes(v) && !(f[def.key] || []).length)
      .sort((a, b) => b[1] - a[1])[0] || [];
    if (value) {
      out.push({
        key: `${def.key}Not:${value}`,
        text: `You passed on ${n} offers with ${def.label.toLowerCase()} “${value}” and liked none.`,
        question: `Hide ${def.label.toLowerCase()} “${value}”?`,
        label: 'Hide them',
        action: { type: 'filter', patch: { [`${def.key}Not`]: [...hidden, value] } },
      });
    }
  }

  // A word in titles you always pass on.
  const avoid = new Set(words(p.avoid).map(norm));
  const roleWords = new Set(p.roles.flatMap((r) => words(r.keywords)).flatMap((k) => norm(k).split(/\s+/)));
  const tokens = (t) => [...new Set(norm(t).split(/[^a-z0-9+#]+/).filter((w) => w.length >= 4 && !/^\d+$/.test(w) && !SUGGEST_SKIP_WORDS.has(w) && !roleWords.has(w)))];
  const likedWords = new Set(liked.flatMap((i) => tokens(i.title)));
  const wordCounts = {};
  passed.forEach((i) => tokens(i.title).forEach((w) => (wordCounts[w] = (wordCounts[w] || 0) + 1)));
  const [word, wn] = Object.entries(wordCounts).filter(([w, c]) => c >= 4 && !likedWords.has(w) && !avoid.has(w)).sort((a, b) => b[1] - a[1])[0] || [];
  if (word) {
    out.push({
      key: `avoid:${word}`,
      text: `“${word}” is in the title of ${wn} offers you passed on, and of none you liked.`,
      question: `Lower the match score of offers with “${word}”?`,
      label: 'Lower their score',
      action: { type: 'avoid', word },
    });
  }

  // You only like good matches.
  if (!f.minMatch && liked.length >= 3) {
    const score = (i) => matchScore(i, p).score;
    const lowestLiked = Math.min(...liked.map(score));
    const lowPassed = passed.filter((i) => score(i) < 60).length;
    if (lowestLiked >= 60 && lowPassed >= 5) {
      out.push({
        key: 'minMatch:60',
        text: `All ${liked.length} offers you liked score 60% or more, and you passed on ${lowPassed} below that.`,
        question: 'Only show 60%+ matches?',
        label: 'Show 60%+ only',
        action: { type: 'filter', patch: { minMatch: '60' } },
      });
    }
  }
  return out.filter((s) => !dismissed.includes(s.key));
}

// ---- Company logos ----

const JOB_SITES = /linkedin\.com|jobteaser\.com|stationf\.co|venturecapitalcareers\.com|welcometothejungle\.com|indeed\.|glassdoor\.|lever\.co|greenhouse\.io|workable\.com|smartrecruiters\.com|myworkdayjobs\.com|teamtailor\.com/i;

// Offers read on a company's own careers site: the company's main domain (jobs.apple.com → apple.com).
const CAREERS_SITES = [[/(^|\.)google\.com$/, 'google.com'], [/(^|\.)apple\.com$/, 'apple.com'], [/amazon\.jobs$/, 'amazon.com'],
  [/(^|\.)stripe\.com$/, 'stripe.com'], [/(^|\.)salesforce\.com$/, 'salesforce.com'], [/^nvidia\.wd\d+\.myworkdayjobs\.com$/, 'nvidia.com']];
function careersSiteDomain(item) {
  const host = item.source || hostOf(item.url);
  return CAREERS_SITES.find(([re]) => re.test(host))?.[1] || '';
}
// Where the company logo leads: its page on the job site, its website, or else its LinkedIn page.
function companyPageUrl(item) {
  if (/^https?:/.test(item.companyUrl || '')) return item.companyUrl;
  const domain = companyDomain(item) || careersSiteDomain(item);
  if (domain) return `https://${domain}`;
  return `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(item.company || item.title || '')}`;
}

// The company's own website domain, when we know it (e.g. "bpifrance.fr").
function companyDomain(item) {
  for (const raw of [item.companyWebsite, item.companyUrl]) {
    if (!raw) continue;
    try {
      const host = new URL(/^https?:/.test(raw) ? raw : `https://${raw}`).hostname.replace(/^www\./, '');
      if (host.includes('.') && !JOB_SITES.test(host)) return host;
    } catch {}
  }
  return '';
}

// Logo addresses to try in order; the page falls back to the next one if an image doesn't load.
function logoCandidates(item, p = DEFAULT_PROFILE) {
  const key = (p.logoDevKey || '').trim();
  const dev = (path) => `https://img.logo.dev/${path}?token=${encodeURIComponent(key)}&size=128&format=png&retina=true&fallback=404`;
  // An offer from a company's own careers site (Apple, Amazon, Google…): the company is the site itself.
  const careers = careersSiteDomain(item);
  const domain = companyDomain(item) || careers;
  // Logo hosts of the job sites' search results: those images are the companies' real logos.
  const knownLogoHost = /media\.licdn\.com\/.*company-logo|cdn-images\.welcometothejungle\.com|jobteasercdn\.com|assets\.cavuno\.com/.test(item.logo || '');
  const fromCard = item.logo && !careers && (item.logoFrom === 'card' || knownLogoHost || (!item.logoFrom && item.foundBy));
  const list = [];
  if (key && domain) list.push(dev(encodeURIComponent(domain)));
  if (careers) list.push(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(careers)}&sz=128`);
  if (fromCard) list.push(item.logo);
  if (key && item.company) list.push(dev(`name/${encodeURIComponent(item.company)}`));
  // Logos read from an offer page are often the job site's or the school's, so they're not used.
  if (domain && !careers) list.push(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`);
  return list.filter((u) => /^https?:/.test(u));
}

// ---- Calendar (Apple Calendar, Google Calendar, Outlook: a standard .ics file) ----

// The dated things to put in a calendar for one offer.
function calendarEvents(item) {
  const who = `${item.company || 'Offer'} · ${cleanOfferTitle(item.title)}`;
  const note = [item.url, item.contactName && `Contact: ${item.contactName}`, item.contactEmail].filter(Boolean).join('\n');
  const events = [];
  if (item.interviewAt) events.push({ key: 'interview', label: 'Interview', title: `Interview: ${who}`, start: item.interviewAt, minutes: 60, note, alarm: 60 });
  if (item.followUpDate && ['Applied', 'Interview'].includes(item.status)) events.push({ key: 'followup', label: 'Follow-up', title: `Follow up: ${who}`, date: item.followUpDate, note, alarm: 0 });
  if (item.deadline && ['New', 'To apply'].includes(item.status)) events.push({ key: 'deadline', label: 'Application deadline', title: `Apply before: ${who}`, date: item.deadline, note, alarm: 24 * 60 });
  return events;
}

const icsEscape = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
const icsDate = (d) => d.replace(/-/g, '');
const icsLocal = (dt) => `${dt.replace(/[-:]/g, '').slice(0, 13)}00`; // 2026-11-05T14:30 → 20261105T143000
// The same local date and time, some minutes later, in the same compact form.
function icsLocalPlus(dt, minutes) {
  const d = new Date(new Date(dt).getTime() + minutes * 60000); // "YYYY-MM-DDTHH:MM" is read as local time
  return `${icsDate(isoDate(d))}T${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}00`;
}

function icsFor(events, itemId = 'swipely') {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Swipely//EN', 'CALSCALE:GREGORIAN'];
  for (const e of events) {
    lines.push('BEGIN:VEVENT', `UID:${itemId}-${e.key}-${e.date || e.start}@swipely`, `DTSTAMP:${stamp}`, `SUMMARY:${icsEscape(e.title)}`, `DESCRIPTION:${icsEscape(e.note)}`);
    if (e.start) {
      lines.push(`DTSTART:${icsLocal(e.start)}`, `DTEND:${icsLocalPlus(e.start, e.minutes)}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${icsDate(e.date)}`, `DTEND;VALUE=DATE:${icsDate(addDays(e.date, 1))}`);
    }
    lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEscape(e.title)}`, `TRIGGER:-PT${e.alarm || 15}M`, 'END:VALARM', 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

// A "add to Google Calendar" link for one event.
function googleCalendarUrl(e) {
  const dates = e.start
    ? `${icsLocal(e.start)}/${icsLocalPlus(e.start, e.minutes)}`
    : `${icsDate(e.date)}/${icsDate(addDays(e.date, 1))}`;
  return `https://calendar.google.com/calendar/render?${new URLSearchParams({ action: 'TEMPLATE', text: e.title, dates, details: e.note || '' })}`;
}

// ---- Export ----

// Semicolon-separated with a BOM so French Excel opens it with accents and columns intact.
function toCsv(list) {
  const cell = (v) => {
    let s = String(v ?? '');
    if (/^[=+@\t\r]|^-\D/.test(s)) s = "'" + s; // stop Excel treating text as a formula
    return `"${s.replace(/"/g, '""')}"`;
  };
  const cols = [...FIELDS.map((f) => [f.key, f.label]), ['source', 'Site'], ['createdAt', 'Added on']];
  const rows = [
    cols.map(([, label]) => cell(label)),
    ...list.map((i) => cols.map(([k]) => cell(k === 'createdAt' ? (i[k] || '').slice(0, 10) : i[k]))),
  ];
  return '﻿' + rows.map((r) => r.join(';')).join('\r\n');
}

// ---- Is this Swipely set up for someone? ----

// The example CV (or no CV at all) means the person hasn't filled in their own yet.
function cvIsSet() {
  return Boolean(CV_DATA?.name) && !/^your name$/i.test(CV_DATA.name) && Boolean(CV_DATA.experience?.length || CV_DATA.education?.length);
}

// ---- Updates ----

// Chrome keeps running the old version of an unpacked extension until it's reloaded.
// Pages read files straight from the folder, so they can tell when the folder has a newer version.
async function applyUpdateIfAny() {
  try {
    const onDisk = await (await fetch(chrome.runtime.getURL('manifest.json'), { cache: 'no-store' })).json();
    if (onDisk.version === chrome.runtime.getManifest().version) return false;
    await chrome.storage.local.set({ reopenTracker: true });
    chrome.runtime.reload();
    return true;
  } catch {
    return false;
  }
}

// ---- Page helpers (popup and tracker only) ----

function el(tag, props = {}, children = []) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...[].concat(children));
  return node;
}

function slug(s) {
  return String(s || '').toLowerCase().replace(/\s+/g, '-');
}

function renderFields(container, item, { collapseMore = false } = {}) {
  const main = el('div', { className: 'grid' });
  const more = el('div', { className: 'grid' });
  for (const f of FIELDS) {
    let input;
    if (f.type === 'select') {
      input = el('select', {}, f.options.map((o) => el('option', { value: o, textContent: o || '—' })));
    } else if (f.type === 'textarea') {
      input = el('textarea', { rows: 3 });
    } else {
      input = el('input', { type: f.type || 'text', placeholder: f.placeholder || '' });
    }
    input.name = f.key;
    input.value = item[f.key] ?? '';
    const field = el('label', { className: 'field' + (f.wide ? ' wide' : '') }, [el('span', { textContent: f.label }), input]);
    (collapseMore && f.more ? more : main).append(field);
  }
  container.replaceChildren(main);
  if (collapseMore) {
    const details = el('details', { className: 'more' }, [el('summary', { textContent: 'More details (dates, contact, CV…)' }), more]);
    details.open = FIELDS.some((f) => f.more && f.key !== 'url' && item[f.key]);
    container.append(details);
  }
}

function readFields(container) {
  return Object.fromEntries([...container.querySelectorAll('[name]')].map((i) => [i.name, i.value.trim()]));
}
