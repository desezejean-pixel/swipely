// Runs in the background: the toolbar badge, and the daily check of saved searches.
importScripts('common.js');

const SCAN_HOUR = 8; // daily checks start at the first chance after 8:00
const PER_TICK = 5; // searches checked every 20 minutes, to stay gentle with the sites
const MAX_NEW_PER_SEARCH = 60;
const DESCRIBE_PER_TICK = 4; // descriptions fetched every 20 minutes
const LINKEDIN_GAP_MS = 20000; // LinkedIn's public search blocks quick series of requests
const LINKEDIN_PAUSE_MS = 3 * 60 * 60 * 1000;
const LINKEDIN_DAILY_CAP = 80; // requests a day (searches + descriptions), like one person browsing
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Waits while keeping the background worker awake (Chrome stops it after 30 s of silence).
async function pause(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    await sleep(Math.min(10000, end - Date.now()));
    await chrome.runtime.getPlatformInfo();
  }
}

// Badge = new offers to review + follow-ups/deadlines needing attention.
async function refreshBadge() {
  const n = (await loadAll()).filter((i) => !i.archived && (i.status === 'New' || attention(i))).length;
  await chrome.action.setBadgeBackgroundColor({ color: '#d9480f' });
  await chrome.action.setBadgeText({ text: n ? String(n) : '' });
}

class RetryLater extends Error {}

// ---- Reading a saved search ----

// LinkedIn: public pages, fetched without your cookies, so it's never your account.
// Requests are spaced out, and paused for a while if LinkedIn says to slow down.
let lastLinkedin = 0;
async function linkedinFetch(url) {
  const { linkedinPausedUntil = 0 } = await chrome.storage.local.get('linkedinPausedUntil');
  if (Date.now() < linkedinPausedUntil) {
    const at = new Date(linkedinPausedUntil).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    throw new RetryLater(`LinkedIn asked to slow down. Paused until ${at}, then it resumes by itself.`);
  }
  // A gentle daily cap: past it, LinkedIn waits until tomorrow.
  const { linkedinToday = {} } = await chrome.storage.local.get('linkedinToday');
  const used = linkedinToday.date === today() ? linkedinToday.n : 0;
  if (used >= LINKEDIN_DAILY_CAP) throw new RetryLater('Daily LinkedIn limit reached (to stay discreet). It continues tomorrow.');
  await pause(Math.max(0, lastLinkedin + LINKEDIN_GAP_MS + Math.random() * 8000 - Date.now()));
  lastLinkedin = Date.now();
  await chrome.storage.local.set({ linkedinToday: { date: today(), n: used + 1 } });
  let res;
  try {
    res = await fetch(url, { credentials: 'omit' });
  } catch {
    // LinkedIn sometimes drops connections for a while instead of answering "slow down".
    await chrome.storage.local.set({ linkedinPausedUntil: Date.now() + 30 * 60 * 1000 });
    throw new RetryLater("LinkedIn didn't answer (it sometimes blocks for a while). Retrying in 30 minutes.");
  }
  if (res.status === 429 || res.status === 999) {
    await chrome.storage.local.set({ linkedinPausedUntil: Date.now() + LINKEDIN_PAUSE_MS });
    throw new RetryLater('LinkedIn asked to slow down. Paused for 3 hours, then it resumes by itself.');
  }
  if (!res.ok) throw new Error(`LinkedIn answered ${res.status}`);
  return res.text();
}

async function fetchLinkedin(url) {
  const offers = [];
  for (const start of [0, 10]) {
    let page;
    try {
      page = parseLinkedinGuest(await linkedinFetch(linkedinGuestUrl(url, start)));
    } catch (e) {
      if (offers.length) break;
      throw e;
    }
    offers.push(...page);
    if (page.length < 10) break;
  }
  return offers;
}

// Other sites: downloaded in the background (no cookies, nothing opens on screen),
// then read by an invisible helper page, since this worker can't read HTML itself.
// Sites that only show offers inside a real browser window can't be read automatically.
const NOT_READABLE = /(^|\.)(jobteaser\.com|stationf\.co|salesforce\.com|metacareers\.com|careers\.microsoft\.com|welcometothejungle\.com)$/;
const CANT_READ = 'This site only shows its offers inside a browser window, so it can’t be checked automatically. Use the toolbar button when you’re on its page.';

async function fetchPage(url) {
  const res = await fetch(url, { credentials: 'omit' });
  if (!res.ok) throw new Error(`The site answered ${res.status}`);
  return res.text();
}

async function readInBackground(type, url) {
  const html = await fetchPage(url);
  if (!(await chrome.offscreen.hasDocument())) {
    await chrome.offscreen.createDocument({ url: 'offscreen.html', reasons: ['DOM_PARSER'], justification: 'Read job pages downloaded in the background' });
  }
  return chrome.runtime.sendMessage({ target: 'offscreen', type, html, url });
}

const isoFromText = (t) => {
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? '' : isoDate(d);
};

// Amazon: its public job search data.
async function amazonSearch(url) {
  const p = new URL(url).searchParams;
  const q = new URLSearchParams({ base_query: p.get('base_query') || 'intern', loc_query: p.get('loc_query') || '', country: p.get('country') || '', result_limit: '50' });
  const res = await fetch(`https://www.amazon.jobs/en/search.json?${q}`, { credentials: 'omit' });
  if (!res.ok) throw new Error(`Amazon answered ${res.status}`);
  return ((await res.json()).jobs || []).map((j) => ({
    url: `https://www.amazon.jobs${j.job_path}`,
    title: j.title,
    company: 'Amazon',
    location: j.normalized_location || j.location || '',
    postedAt: isoFromText(j.posted_date),
    description: htmlText([j.description, j.basic_qualifications, j.preferred_qualifications].filter(Boolean).join('<br><br>'), true).slice(0, 8000),
  }));
}

// Workday career sites (Nvidia…): their public job search data.
function workdayParts(url) {
  const u = new URL(url);
  const parts = u.pathname.split('/').filter(Boolean).filter((x) => !/^[a-z]{2}-[A-Z]{2}$/.test(x));
  return { host: u.host, tenant: u.hostname.split('.')[0], site: parts[0], rest: parts.slice(1).join('/'), q: u.searchParams.get('q') || '' };
}
async function workdaySearch(url) {
  const w = workdayParts(url);
  const res = await fetch(`https://${w.host}/wday/cxs/${w.tenant}/${w.site}/jobs`, {
    method: 'POST',
    credentials: 'omit',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ appliedFacets: {}, limit: 20, offset: 0, searchText: w.q }),
  });
  if (!res.ok) throw new Error(`The site answered ${res.status}`);
  const company = w.tenant.charAt(0).toUpperCase() + w.tenant.slice(1);
  return ((await res.json()).jobPostings || []).map((j) => ({
    url: `https://${w.host}/en-US/${w.site}${j.externalPath}`,
    title: j.title,
    company,
    location: j.locationsText || '',
    postedAt: /today/i.test(j.postedOn || '') ? today() : agoToDate(String(j.postedOn || '').replace(/\+/, '')),
  }));
}

// Startup job boards (Lever, Greenhouse, Ashby): their free public job data, with full descriptions.
function atsBoard(url) {
  const u = new URL(url);
  const first = u.pathname.split('/').filter(Boolean)[0] || '';
  if (/(^|\.)lever\.co$/.test(u.hostname)) return { type: 'lever', token: first };
  if (/greenhouse\.io$/.test(u.hostname)) return { type: 'greenhouse', token: u.searchParams.get('for') || first };
  if (/ashbyhq\.com$/.test(u.hostname)) return { type: 'ashby', token: first };
  return null;
}

async function atsSearch(b, company) {
  const get = async (url) => {
    const res = await fetch(url, { credentials: 'omit' });
    if (!res.ok) throw new Error(`The job board answered ${res.status}`);
    return res.json();
  };
  const name = company || b.token.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  if (b.type === 'lever') {
    return (await get(`https://api.lever.co/v0/postings/${b.token}?mode=json`)).map((j) => ({
      url: j.hostedUrl,
      title: j.text,
      company: name,
      location: j.categories?.location || (j.categories?.allLocations || []).join(', '),
      contract: j.categories?.commitment || '',
      postedAt: j.createdAt ? isoDate(new Date(j.createdAt)) : '',
      description: [j.descriptionPlain, ...(j.lists || []).map((l) => `${l.text}\n${htmlText(l.content, true)}`), j.additionalPlain].filter(Boolean).join('\n\n').slice(0, 8000),
    }));
  }
  if (b.type === 'greenhouse') {
    return ((await get(`https://boards-api.greenhouse.io/v1/boards/${b.token}/jobs?content=true`)).jobs || []).map((j) => ({
      url: j.absolute_url,
      title: j.title,
      company: j.company_name || name,
      location: j.location?.name || '',
      postedAt: String(j.first_published || j.updated_at || '').slice(0, 10),
      description: htmlText(htmlText(j.content || ''), true).slice(0, 8000), // the content is escaped HTML
    }));
  }
  return ((await get(`https://api.ashbyhq.com/posting-api/job-board/${b.token}`)).jobs || []).map((j) => ({
    url: j.jobUrl,
    title: j.title,
    company: name,
    location: j.location || '',
    contract: j.employmentType || '',
    postedAt: String(j.publishedAt || '').slice(0, 10),
    description: (j.descriptionPlain || '').slice(0, 8000),
  }));
}

// For followed companies: junior roles that fit your profile, or clearly good matches; never senior titles.
function fitsYou(o, profile) {
  return fitsPreferences(o, profile, { strict: true });
}

async function readSearch(url, name) {
  const host = hostOf(url);
  const board = atsBoard(url);
  if (board) return atsSearch(board, name);
  if (/amazon\.jobs$/.test(host)) return amazonSearch(url);
  if (/myworkdayjobs\.com$/.test(host)) return workdaySearch(url);
  if (NOT_READABLE.test(host)) throw new Error(CANT_READ);
  return (await readInBackground('scan', url))?.offers || [];
}

function friendlyError(e) {
  const msg = String(e?.message || e);
  if (/Cannot access|permission/i.test(msg)) return 'No permission to read this site. Remove this search and add it again.';
  if (/Failed to fetch/i.test(msg)) return 'Could not reach the site (offline?)';
  return msg;
}

// ---- Offer descriptions ----

// Fetches the full description of one saved offer and stores it.
async function describe(item) {
  const fields = { describedAt: new Date().toISOString(), describeError: '' };
  const jobId = linkedinJobId(item.url);
  if (jobId) {
    Object.assign(fields, parseLinkedinJob(await linkedinFetch(`https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${jobId}`)));
  } else if (/myworkdayjobs\.com$/.test(hostOf(item.url))) {
    const w = workdayParts(item.url);
    const res = await fetch(`https://${w.host}/wday/cxs/${w.tenant}/${w.site}/${w.rest}`, { credentials: 'omit', headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`The site answered ${res.status}`);
    fields.description = htmlText((await res.json()).jobPostingInfo?.jobDescription || '', true).slice(0, 8000);
  } else {
    if (NOT_READABLE.test(hostOf(item.url))) throw new Error('This site can’t be read automatically: open the offer to read it.');
    const page = (await readInBackground('describe', item.url)) || {};
    fields.description = page.description || '';
    for (const k of ['location', 'pay', 'logo', 'companyUrl', 'postedAt', 'contract']) if (page[k] && !item[k]) fields[k] = page[k];
  }
  if (fields.postedAgo && !item.postedAt) fields.postedAt = agoToDate(fields.postedAgo);
  delete fields.postedAgo;
  for (const k of ['logo', 'companyUrl', 'contract', 'postedAt']) if (item[k] && fields[k]) delete fields[k]; // keep what the search found
  fields.description = cleanDescription(fields.description);
  Object.assign(fields, missingDates({ ...item, ...fields }));
  if (!fields.description) fields.describeError = 'No description found on the page.';
  if (!item.duration && !fields.duration) fields.duration = guessDuration(fields.description);
  return updateInternship(item.id, fields);
}

// A few offers without a description, best matches first.
let enriching = null;
function runEnrich() {
  enriching ||= (async () => {
    const profile = await loadProfile();
    const todo = (await loadAll())
      .filter((i) => i.url && !i.description && !i.describedAt && ['New', 'To apply'].includes(i.status))
      .sort((a, b) => matchScore(b, profile).score - matchScore(a, profile).score)
      .slice(0, DESCRIBE_PER_TICK);
    for (const item of todo) {
      try {
        await describe(item);
      } catch (e) {
        if (e instanceof RetryLater) break;
        await updateInternship(item.id, { describedAt: new Date().toISOString(), describeError: friendlyError(e) });
      }
    }
  })().finally(() => (enriching = null));
  return enriching;
}

// ---- Checking saved searches ----

let scanning = null;
function runScan(ids) {
  scanning ||= doScan(ids).finally(() => (scanning = null));
  return scanning;
}

async function doScan(ids) {
  const todo = (await loadSearches()).filter((s) => !ids || ids.includes(s.id));
  if (!todo.length) return 0;
  const profile = await loadProfile();
  await chrome.storage.local.set({ scanState: { running: true, startedAt: Date.now() } });
  let total = 0;
  try {
    for (const s of todo) {
      const result = { lastError: '' };
      try {
        let offers;
        offers = isLinkedin(s.url) ? await fetchLinkedin(s.url) : await readSearch(s.url, s.follow ? s.name : '');
        // A followed company posts every kind of job: keep the ones that fit you (internships, junior roles, good matches).
        // Your Preferences apply to every search; broad sources (company boards, big tech, VC boards) must also fit you well.
        offers = offers.filter((o) => fitsPreferences(o, profile, { strict: !isLinkedin(s.url) }));
        const seen = new Set(s.seen || []);
        let fresh = offers.filter((o) => !seen.has(normalizeUrl(o.url)));
        if (profile.hideWeak) fresh = fresh.filter((o) => matchScore(o, profile).score >= profile.minScore);
        result.lastAdded = await addMany(fresh.slice(0, MAX_NEW_PER_SEARCH), { status: 'New', foundBy: s.name });
        result.lastFound = offers.length;
        result.seen = [...new Set([...seen, ...offers.map((o) => normalizeUrl(o.url))])].slice(-3000);
        result.lastRun = new Date().toISOString();
        total += result.lastAdded;
      } catch (e) {
        result.lastError = friendlyError(e);
        if (!(e instanceof RetryLater)) result.lastRun = new Date().toISOString();
      }
      // Re-read before saving, in case a search was added or removed meanwhile.
      const searches = await loadSearches();
      const i = searches.findIndex((x) => x.id === s.id);
      if (i >= 0) {
        searches[i] = { ...searches[i], ...result };
        await saveSearches(searches);
      }
    }
  } finally {
    await chrome.storage.local.set({ scanState: { running: false, finishedAt: Date.now() } });
  }
  if (total) {
    const { newToday = {} } = await chrome.storage.local.get('newToday');
    const n = (newToday.date === today() ? newToday.n : 0) + total;
    await chrome.storage.local.set({ newToday: { date: today(), n } });
    chrome.notifications.create('new-offers', {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Swipely',
      message: `${n} new offer${n > 1 ? 's' : ''} found today by your saved searches.`,
    });
  }
  return total;
}

// A few searches not yet checked today, every 20 minutes.
// Morning reminder: today's follow-ups, interviews coming up, deadlines close (once a day, nothing opens).
async function morningDigest() {
  const { digestOn } = await chrome.storage.local.get('digestOn');
  if (digestOn === today() || new Date().getHours() < SCAN_HOUR) return;
  const list = (await loadAll()).filter((i) => !i.archived);
  const t = today();
  const followUps = list.filter((i) => ['Applied', 'Interview'].includes(i.status) && i.followUpDate && i.followUpDate <= t);
  const actions = list.filter((i) => attention(i) && !followUps.includes(i) && !(i.status === 'To apply' && i.deadline && i.deadline <= addDays(t, 2)));
  const interviews = list.filter((i) => i.interviewAt && i.interviewAt.slice(0, 10) >= t && i.interviewAt.slice(0, 10) <= addDays(t, 1));
  const deadlines = list.filter((i) => i.status === 'To apply' && i.deadline && i.deadline >= t && i.deadline <= addDays(t, 2));
  await chrome.storage.local.set({ digestOn: t });
  const parts = [
    followUps.length && `${followUps.length} follow-up${followUps.length > 1 ? 's' : ''} to send`,
    interviews.length && `${interviews.length} interview${interviews.length > 1 ? 's' : ''} today or tomorrow (${interviews.map((i) => i.company).join(', ')})`,
    deadlines.length && `${deadlines.length} deadline${deadlines.length > 1 ? 's' : ''} in the next 2 days`,
    actions.length && `${actions.length} application${actions.length > 1 ? 's' : ''} waiting for an action (${actions.slice(0, 3).map((i) => i.company).join(', ')})`,
  ].filter(Boolean);
  if (parts.length) chrome.notifications.create('digest', { type: 'basic', iconUrl: 'icons/icon128.png', title: 'Swipely · today', message: parts.join(' · ') });
}

// Duplicates saved before they were merged, and dates still to read from descriptions.
async function tidyOffers() {
  const { list, merged } = mergeDuplicates(await loadAll());
  let dated = 0;
  for (const i of list) {
    const d = missingDates(i);
    if (Object.keys(d).length) {
      Object.assign(i, d);
      dated++;
    }
  }
  if (merged || dated) await saveAll(list);
}

// A suggestion from your swipes, sent as a notification at most once a day (it never opens anything by itself).
async function notifySuggestion() {
  const store = await chrome.storage.local.get(['filters', 'dismissedSuggestions', 'notifiedSuggestions', 'suggestNotifiedOn']);
  if (store.suggestNotifiedOn === today()) return;
  const notified = store.notifiedSuggestions || [];
  const s = computeSuggestions(await loadAll(), store.filters || {}, await loadProfile(), [...(store.dismissedSuggestions || []), ...notified])[0];
  if (!s) return;
  chrome.notifications.create('suggestion', { type: 'basic', iconUrl: 'icons/icon128.png', title: 'Swipely · suggestion', message: `${s.question} ${s.text}` });
  await chrome.storage.local.set({ notifiedSuggestions: [...notified, s.key], suggestNotifiedOn: today() });
}

async function scanDue() {
  if (scanning || enriching || new Date().getHours() < SCAN_HOUR) return;
  const { linkedinPausedUntil = 0, linkedinToday = {} } = await chrome.storage.local.get(['linkedinPausedUntil', 'linkedinToday']);
  const linkedinDone = Date.now() < linkedinPausedUntil || (linkedinToday.date === today() && linkedinToday.n >= LINKEDIN_DAILY_CAP);
  const due = (await loadSearches()).filter((s) => {
    if (s.lastRun && isoDate(new Date(s.lastRun)) === today()) return false;
    return !(isLinkedin(s.url) && linkedinDone);
  });
  if (due.length) await runScan(due.slice(0, PER_TICK).map((s) => s.id));
  await runEnrich();
}

// ---- Events ----

// Picks up a new version from the folder by itself, without opening anything.
// Waits until no tracker window or popup is open, so nothing you're using closes.
async function selfUpdate() {
  try {
    const onDisk = await (await fetch(chrome.runtime.getURL('manifest.json'), { cache: 'no-store' })).json();
    if (onDisk.version === chrome.runtime.getManifest().version) return;
    const open = await chrome.runtime.getContexts({ contextTypes: ['TAB', 'POPUP'] });
    if (!open.length) chrome.runtime.reload();
  } catch {}
}

// First run: create the searches from the CV profile, so checking starts without any setup.
async function seedSearches() {
  const { seeded } = await chrome.storage.local.get('seeded');
  if (seeded) return;
  const searches = await loadSearches();
  const known = new Set(searches.map((s) => s.url));
  const auto = profileSearches(await loadProfile())
    .filter((s) => !known.has(s.url))
    .map((s) => ({ id: crypto.randomUUID(), seen: [], ...s }));
  await saveSearches([...searches, ...auto]);
  await chrome.storage.local.set({ seeded: true });
}

// Added after the first version: big tech careers sites.
async function addBigTechSearches() {
  const { seededBigTech } = await chrome.storage.local.get('seededBigTech');
  if (seededBigTech === 2) return;
  const searches = await loadSearches();
  const known = new Set(searches.map((x) => x.url));
  const extra = bigTechSearches(await loadProfile()).filter((x) => !known.has(x.url)).map((x) => ({ id: crypto.randomUUID(), seen: [], ...x }));
  await saveSearches([...searches, ...extra]);
  await chrome.storage.local.set({ seededBigTech: 2 });
}

// Searches on sites that can't be read without a window are removed (only those the tracker created).
async function dropUnreadableSearches() {
  const searches = await loadSearches();
  const keep = searches.filter((x) => !(x.auto && NOT_READABLE.test(hostOf(x.url))));
  if (keep.length !== searches.length) await saveSearches(keep);
}

async function start() {
  await chrome.storage.local.set({ runningVersion: chrome.runtime.getManifest().version });
  await chrome.storage.local.remove('reopenTracker'); // never reopen a window by itself
  chrome.alarms.create('tick', { periodInMinutes: 20 });
  refreshBadge();
  await seedSearches();
  await addBigTechSearches();
  await tidyOffers();
  await dropUnreadableSearches();
  // Searches that failed on a dropped connection get another try today.
  const searches = await loadSearches();
  const failed = searches.filter((x) => /Could not reach/.test(x.lastError || ''));
  failed.forEach((x) => {
    delete x.lastRun;
    x.lastError = '';
  });
  if (failed.length) await saveSearches(searches);
  scanDue();
}

chrome.runtime.onInstalled.addListener(start);
chrome.runtime.onStartup.addListener(start);
chrome.alarms.onAlarm.addListener(async () => {
  await archiveStale();
  morningDigest();
  selfUpdate();
  refreshBadge();
  notifySuggestion();
  scanDue();
});
chrome.storage.onChanged.addListener((changes) => {
  if (changes.internships) refreshBadge();
});
chrome.notifications.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('tracker.html#New') });
});
chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg?.type === 'scanDue') return void scanDue();
  if (msg?.type === 'describe') {
    loadAll()
      .then((list) => list.find((i) => i.id === msg.id))
      .then((item) => (item ? describe(item) : null))
      .then((item) => reply({ item }), (e) => reply({ error: friendlyError(e) }));
    return true;
  }
  if (msg?.type !== 'scan') return;
  runScan(msg.ids).then((added) => reply({ added }), (e) => reply({ error: friendlyError(e) }));
  return true;
});
