const $ = (id) => document.getElementById(id);
drawIcons();
let all = [];
let filter = 'All';
let editing = null;
let profile = DEFAULT_PROFILE;
const openIds = new Set(); // offers showing their details
const loading = new Set(); // offers whose description is being fetched
const autoTried = new Set(); // offers whose description was already fetched automatically once
let view = 'discover'; // like / pass new offers first; the board holds the liked ones
try {
  view = localStorage.getItem('trackerView') || 'discover';
} catch {}
let lastSwipe = null; // for Undo
let refreshTimer = null;
let filters = {}; // location, contract, kind, site, posted, early
try {
  filters = JSON.parse(localStorage.getItem('trackerFilters') || '{}');
} catch {}
let ws = null; // offer open in the workspace
let wsTab = 'steps';
let wsLang = '';

// Archived offers (new offers published more than 4 weeks ago) live apart, seen only with the "Archived" chip.
let archivedList = [];
async function refresh() {
  let full;
  [full, profile] = await Promise.all([loadAll(), loadProfile()]);
  archivedList = full.filter((i) => i.archived);
  all = full.filter((i) => !i.archived);
  // The score also learns from what you liked and passed on (unless you turned it off in Preferences).
  const roleWords = new Set(profile.roles.flatMap((r) => words(r.keywords)).flatMap((k) => norm(k).split(/\s+/)));
  profile = { ...profile, taste: profile.learn === false ? null : buildTaste(full, roleWords) };
  currentProfile = profile;
  render();
}

// While the CV isn't filled in: a reminder at the top.
function cvBanner() {
  const b = $('cvBanner');
  b.hidden = cvIsSet();
  if (b.hidden) return;
  b.replaceChildren(
    el('span', { className: 'suggest-icon' }, icon('file')),
    el('div', { className: 'suggest-text' }, [el('b', { textContent: 'Fill in your CV to get tailored CVs and letters.' }), el('span', { textContent: ' It takes a minute: paste your CV and Swipely fills it in.' })]),
    el('button', { type: 'button', className: 'primary', textContent: 'Fill in my CV', onclick: () => openCvEditor() }),
  );
}

function render() {
  cvBanner();
  archiveBanner();
  renderChips();
  renderFilterBar();
  renderSuggestion();
  renderTable();
  // Only one message at the top at a time, the most important first.
  let shown = false;
  for (const id of ['intro', 'archiveBanner', 'cvBanner', 'suggest']) {
    if (shown) $(id).hidden = true;
    else shown = !$(id).hidden;
  }
}

function renderChips() {
  const counts = { All: all.length, 'Needs attention': all.filter(attention).length };
  for (const s of STATUSES) counts[s] = all.filter((i) => i.status === s).length;
  counts.Archived = archivedList.length;
  $('chips').replaceChildren(...Object.entries(counts).map(([name, n]) => {
    let cls = 'chip';
    if (STATUSES.includes(name)) cls += ' st-' + slug(name);
    if (name === 'Needs attention' && n) cls += ' warn';
    if (name === filter) cls += ' active';
    return el('button', { type: 'button', className: cls, textContent: `${name}  ${n}`, onclick: () => { filter = name; if (view !== 'list' && name !== 'All') setView('list'); render(); } });
  }));
}

const SORTS = {
  match: (a, b) => matchScore(b, profile).score - matchScore(a, profile).score,
  posted: (a, b) => (b.postedAt || b.createdAt || '').localeCompare(a.postedAt || a.createdAt || ''),
  added: (a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''),
  deadline: (a, b) => (a.deadline || '9999').localeCompare(b.deadline || '9999'),
  followUp: (a, b) => (a.followUpDate || '9999').localeCompare(b.followUpDate || '9999'),
  company: (a, b) => (a.company || '').localeCompare(b.company || '', undefined, { sensitivity: 'base' }),
  status: (a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status),
};

function archiveBanner() {
  const b = $('archiveBanner');
  b.hidden = !(view === 'list' && filter === 'Archived');
  if (b.hidden) return;
  b.replaceChildren(icon('archive'), el('span', { textContent: `Archive: ${archivedList.length} offers published more than 4 weeks ago. Restore one to bring it back to Discover.` }),
    el('button', { type: 'button', className: 'small', textContent: 'Back to all offers', onclick: () => { filter = 'All'; filterBarState = ''; render(); } }));
}

function visible() {
  const q = $('search').value.trim().toLowerCase();
  return (filter === 'Archived' ? archivedList : all)
    .filter((i) => filter === 'All' || filter === 'Archived' || (filter === 'Needs attention' ? attention(i) : i.status === filter))
    .filter((i) => passesFilters(i, filters))
    .filter((i) => !q || [i.title, i.company, i.location, i.notes, i.contactName, i.source].join(' ').toLowerCase().includes(q))
    .sort(SORTS[$('sort').value]);
}

function renderTable() {
  $('viewList').classList.toggle('on', view === 'list');
  $('viewBoard').classList.toggle('on', view === 'board');
  $('viewDiscover').classList.toggle('on', view === 'discover');
  const toReview = all.filter((i) => i.status === 'New').length;
  $('discoverCount').textContent = toReview ? String(toReview) : '';
  // Red badge on Board: how many applications need an action (like unread messages).
  const todo = all.filter((i) => BOARD_STEPS.includes(i.status) && attention(i)).length;
  $('boardCount').textContent = todo ? String(todo) : '';
  $('board').hidden = view !== 'board' || !all.length;
  $('discover').hidden = view !== 'discover';
  // Each view only shows the controls that matter there.
  $('chips').hidden = true; // replaced by the "Step" menu in the filter bar
  $('note').hidden = view !== 'list';
  $('sort').hidden = view === 'discover';
  renderIntro();
  $('table').closest('.table-wrap').hidden = view !== 'list';
  $('pager').hidden = true; // pages only exist in the List (shown again below when needed)
  if (view === 'discover') {
    $('empty').hidden = true;
    $('noMatch').hidden = true;
    return renderDiscover();
  }
  if (view === 'board') {
    $('empty').hidden = all.length > 0;
    $('noMatch').hidden = true;
    return renderBoard();
  }
  const found = visible();
  // The List shows one page at a time: 10, 20, 50 or 100 offers (your choice, remembered).
  const sig = JSON.stringify([filter, filters, $('search').value, $('sort').value]);
  if (sig !== pagerSig) {
    pagerSig = sig;
    listPage = 1;
  }
  const pages = Math.max(1, Math.ceil(found.length / pageSize));
  listPage = Math.min(listPage, pages);
  const rows = found.slice((listPage - 1) * pageSize, listPage * pageSize);
  renderPager(found.length, pages);
  $('empty').hidden = all.length > 0;
  $('table').hidden = all.length === 0;
  $('noMatch').hidden = !all.length || rows.length > 0;
  $('noMatch').textContent = 'No offer matches these filters.';
  const wrap = $('table').closest('.table-wrap');
  const scrollTop = wrap.scrollTop;
  $('rows').replaceChildren(...rows.flatMap(row));
  wrap.scrollTop = scrollTop;
}

let listPage = 1;
let pagerSig = '';
let pageSize = 20;
try {
  pageSize = [10, 20, 50, 100].includes(Number(localStorage.getItem('pageSize'))) ? Number(localStorage.getItem('pageSize')) : 20;
} catch {}

function goToPage(n) {
  listPage = n;
  renderTable();
  $('table').closest('.table-wrap').scrollTop = 0;
}

// "1–20 of 168" · ‹ 1 2 3 … 9 › · "Per page: 10 20 50 100"
function renderPager(total, pages) {
  const bar = $('pager');
  bar.hidden = view !== 'list' || total <= 10;
  if (bar.hidden) return;
  const from = (listPage - 1) * pageSize + 1;
  const to = Math.min(total, listPage * pageSize);
  const shown = [...new Set([1, listPage - 1, listPage, listPage + 1, pages].filter((n) => n >= 1 && n <= pages))].sort((a, b) => a - b);
  const nav = [el('button', { type: 'button', className: 'page-btn', title: 'Previous page', disabled: listPage === 1, onclick: () => goToPage(listPage - 1) }, icon('chevronLeft'))];
  shown.forEach((n, k) => {
    if (k && n - shown[k - 1] > 1) nav.push(el('span', { className: 'page-gap', textContent: '…' }));
    nav.push(el('button', { type: 'button', className: 'page-btn' + (n === listPage ? ' on' : ''), onclick: () => goToPage(n), textContent: String(n) }));
  });
  nav.push(el('button', { type: 'button', className: 'page-btn', title: 'Next page', disabled: listPage === pages, onclick: () => goToPage(listPage + 1) }, icon('chevronRight')));
  bar.replaceChildren(
    el('span', { className: 'pager-count', textContent: `${from}–${to} of ${total}` }),
    el('div', { className: 'pager-nav' }, nav),
    el('div', { className: 'pager-size' }, [
      el('span', { className: 'muted', textContent: 'Per page' }),
      el('div', { className: 'seg' }, [10, 20, 50, 100].map((n) => el('button', {
        type: 'button',
        className: n === pageSize ? 'on' : '',
        textContent: String(n),
        onclick: () => {
          pageSize = n;
          try {
            localStorage.setItem('pageSize', String(n));
          } catch {}
          listPage = 1;
          goToPage(1);
        },
      }))),
    ]),
  );
}

// The one date that matters now for this offer.
function nextDate(i) {
  if (i.status === 'Interview' && i.interviewAt) return ['Interview', `${formatDate(i.interviewAt.slice(0, 10))} · ${i.interviewAt.slice(11, 16)}`];
  if (['Applied', 'Interview'].includes(i.status) && i.followUpDate) return ['Follow up', formatDate(i.followUpDate)];
  if (['New', 'To apply'].includes(i.status) && i.deadline) return ['Deadline', formatDate(i.deadline)];
  if (i.startDate) return ['Starts', formatDate(i.startDate)];
  if (i.postedAt && i.status === 'New') return ['Posted', formatDate(i.postedAt)];
  return null;
}

function row(i) {
  const warn = attention(i);
  const name = i.title || '(no title)';
  const title = /^https?:/.test(i.url || '')
    ? el('a', { href: i.url, target: '_blank', rel: 'noopener', textContent: name })
    : el('span', { textContent: name });
  const open = openIds.has(i.id);
  const next = nextDate(i);
  const main = el('tr', { className: 'offer-row' + (warn ? ' attention' : '') + (open ? ' open' : '') }, [
    el('td', { className: 'offer-cell' }, [el('div', { className: 'logos' }, [companyLogo(i), siteLogo(i)]), el('div', { className: 'offer-text' }, [
      el('div', { className: 'job' }, title),
      el('div', { className: 'muted', textContent: [i.company, i.location].filter(Boolean).join(' · ') }),
    ])]),
    el('td', {}, scorePill(i)),
    el('td', {}, [statusMenu(i), warn ? el('div', { className: 'tag action', textContent: warn }) : '']),
    el('td', { className: 'dates-cell' }, next
      ? el('div', { className: 'date-line' }, [el('span', { className: 'date-label', textContent: next[0] }), el('span', { textContent: next[1] })])
      : el('span', { className: 'muted', textContent: '—' })),
    el('td', { className: 'actions' }, el('div', { className: 'actions-inner' }, [
      i.archived
        ? el('button', { type: 'button', className: 'small', title: 'Bring it back to Discover (it won’t be archived again)', onclick: () => restoreArchived(i) }, 'Restore')
        : el('button', { type: 'button', className: 'primary small', title: 'Steps, CV & letter, messages', onclick: () => openWorkspace(i) }, 'Open'),
      el('button', { type: 'button', className: 'card-delete hover-only', title: 'Remove this offer', ariaLabel: 'Remove this offer', onclick: () => removeOffer(i) }, icon('trash')),
    ])),
  ]);
  // A click anywhere on the row (except links, buttons and menus) shows or hides the details.
  main.addEventListener('click', (e) => {
    if (e.target.closest('a, button, details, summary, select, input')) return;
    toggleDetails(i);
  });
  return open ? [main, detailRow(i)] : [main];
}

// Opens a page in its own window, beside the tracker.
function openWindow(url) {
  chrome.windows.create({ url, width: 1180, height: 900, focused: true });
}

// Same colour for the same company, for logos we can't find.
function letterTile(name) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return el('span', { className: 'letter', textContent: (name.trim()[0] || '?').toUpperCase(), style: `--h:${h}` });
}

// Tries each logo address in turn, then shows the fallback.
function logoImage(urls, fallback) {
  if (!urls.length) return fallback();
  const img = el('img', { alt: '', referrerPolicy: 'no-referrer' });
  let n = 0;
  img.onerror = () => {
    n += 1;
    if (n < urls.length) img.src = urls[n];
    else img.replaceWith(fallback());
  };
  img.src = urls[0];
  return img;
}

// The company's logo; a click opens the company's page (or a web search for it) in its own window.
function companyLogo(i) {
  const name = i.company || i.title || '?';
  const page = companyPageUrl(i);
  const tile = el('button', {
    type: 'button',
    className: 'company-logo',
    title: i.company ? `${i.company}: open the company page` : 'Company',
    onclick: () => openWindow(page),
  });
  tile.append(logoImage(logoCandidates(i, profile), () => letterTile(name)));
  return tile;
}

// The logo of the site the offer comes from; a click opens the offer in its own window.
function siteLogo(i) {
  const host = i.source || hostOf(i.url);
  const tile = el('button', {
    type: 'button',
    className: 'site-logo',
    title: host ? `Open this offer on ${host}${i.foundBy ? ` (found by: ${i.foundBy})` : ''}` : 'No link for this offer',
    disabled: !/^https?:/.test(i.url || ''),
    onclick: () => openWindow(i.url),
  });
  if (host) {
    // The main domain's logo (jobs.stationf.co → stationf.co); sub-sites often have none of their own.
    const labels = host.split('.');
    const site = labels.slice(/^(co|com|ac|gov|org)$/.test(labels.at(-2)) ? -3 : -2).join('.');
    const img = el('img', { src: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(site)}&sz=64`, alt: '', width: 20, height: 20 });
    img.onerror = () => img.replaceWith(el('span', { textContent: host[0].toUpperCase() }));
    tile.append(img);
  }
  return tile;
}

// The offer's text with real headings, tight bullet points and paragraphs.
function formatDescription(text, lead = '') {
  // The summary sentence is already shown above: don't repeat it in the text.
  const same = (a, b) => norm(a).replace(/[^a-z0-9]/g, '') === norm(b).replace(/[^a-z0-9]/g, '');
  let dropped = false;
  const lines = cleanDescription(text).split('\n').map((l) => l.trim()).filter(Boolean)
    .filter((l) => {
      if (lead && !dropped && same(l.replace(/^•\s*/, ''), lead)) { dropped = true; return false; }
      return true;
    });
  const out = el('div', { className: 'desc-rich' });
  let list = null;
  lines.forEach((line, n) => {
    if (line.startsWith('• ')) {
      if (!list) out.append((list = el('ul')));
      list.append(el('li', { textContent: line.slice(2) }));
      return;
    }
    list = null;
    const heading = line.length < 70 && !/[.!?;,]$/.test(line) && n < lines.length - 1;
    out.append(el(heading ? 'h4' : 'p', { textContent: line.replace(/:$/, '') }));
  });
  return out;
}

function detailRow(i, asBox = false) {
  // Only useful, short labels: no repeats, no vague seniority words, at most two industries.
  const contract = contractOf(i);
  const industries = (i.industry || (i.criteria || '').split(' · ').find((c) => /^(Industries|Secteurs?)/i.test(c))?.split(': ')[1] || '')
    .split(/,\s*(?=[A-ZÀ-Ý])/).map((x) => x.trim()).filter(Boolean).slice(0, 2);
  const longTerm = ['Internship', 'Apprenticeship', 'VIE'].includes(contract);
  const chips = [contract, longTerm && i.duration && `Duration: ${i.duration}`, i.pay, i.workMode, i.startDate && `Starts ${formatDate(i.startDate)}`, ...industries]
    .filter((v, n, a) => v && a.findIndex((x) => norm(x) === norm(v)) === n);
  let body;
  if (i.description) {
    const rich = formatDescription(i.description, leadSentence(i.description));
    const more = el('button', { type: 'button', className: 'link show-more', textContent: 'Show the full description' });
    more.onclick = () => {
      const full = rich.classList.toggle('full');
      more.textContent = full ? 'Show less' : 'Show the full description';
    };
    body = el('div', {}, [rich, more]);
  } else if (loading.has(i.id)) body = el('p', { className: 'desc-note', textContent: 'Loading the description…' });
  else {
    body = el('p', { className: 'desc-note' }, [
      'No description saved yet. ',
      el('button', { type: 'button', className: 'link', textContent: 'Load it now', onclick: () => loadDescription(i) }),
    ]);
  }
  const lead = i.description ? leadSentence(i.description) : '';
  const box = el('div', { className: 'detail-box' }, [
    el('div', { className: 'detail-head' }, [
      el('div', { className: 'detail-chips' }, chips.map((c) => el('span', { className: 'fact', textContent: c }))),
      el('div', { className: 'detail-actions' }, [
        /^https?:/.test(i.url || '') ? el('button', { type: 'button', className: 'primary small', onclick: () => openWindow(i.url) }, ['Open the offer ', icon('external')]) : '',
        asBox ? '' : el('button', { type: 'button', className: 'small', onclick: () => openWorkspace(i, 'docs') }, [icon('file'), 'CV & letter']),
      ]),
    ]),
    lead ? el('p', { className: 'swipe-lead', textContent: lead }) : '',
    body,
  ]);
  return asBox ? box : el('tr', { className: 'detail' }, el('td', { colSpan: 5 }, box));
}

function toggleDetails(i) {
  if (openIds.has(i.id)) openIds.delete(i.id);
  else {
    openIds.add(i.id);
    if (!i.description && !i.describedAt) return loadDescription(i);
  }
  renderTable();
}

async function loadDescription(i, auto = false) {
  let origin = '';
  try {
    origin = linkedinJobId(i.url) ? 'https://www.linkedin.com/*' : `${new URL(i.url).origin}/*`;
  } catch {
    return auto ? undefined : alert('This offer has no link to read the description from.');
  }
  // Automatic loads only use sites already allowed, and are tried once per offer while the page is open;
  // a click may ask Chrome for permission and always tries again.
  if (auto) {
    if (loading.has(i.id) || autoTried.has(i.id)) return;
    autoTried.add(i.id);
    if (!(await chrome.permissions.contains({ origins: [origin] }))) return;
  } else if (!(await chrome.permissions.request({ origins: [origin] }))) return;
  loading.add(i.id);
  renderTable();
  const res = await chrome.runtime.sendMessage({ type: 'describe', id: i.id });
  loading.delete(i.id);
  if (res?.error) await updateInternship(i.id, { describeError: res.error });
  refresh();
}

function scorePill(item) {
  const { score, why } = matchScore(item, profile);
  const level = score >= 60 ? 'high' : score >= profile.minScore ? 'mid' : 'low';
  return el('span', { className: `score ${level}`, textContent: String(score), title: why.join('\n') || 'No match with your profile words' });
}

// ---- Filter bar ----

function saveFilters() {
  try {
    localStorage.setItem('trackerFilters', JSON.stringify(filters));
  } catch {}
  chrome.storage.local.set({ filters });
  render();
}

// The offers the current view works on: new ones in Discover, liked ones on the board, all in the list.
function viewPool() {
  if (view === 'discover') return all.filter((i) => i.status === 'New');
  if (view === 'board') return all.filter((i) => BOARD_STEPS.includes(i.status));
  return all;
}

let filterBarState = '';
let moreFilters = false; // "More filters" open or not

// One pill per filter. Click it to open its menu; an active pill shows its value and a ✕ to clear it.
function filterPill(key, label, valueText, active, options, multi, onPick, onClear) {
  const pop = el('details', { className: 'filter-pop' + (active ? ' active' : '') });
  pop.dataset.key = key;
  const summary = el('summary', {}, [
    el('span', { className: 'pill-text', textContent: active ? valueText : label }),
    active
      ? el('span', { className: 'pill-x', title: `Clear ${label}`, onclick: (e) => { e.preventDefault(); e.stopPropagation(); onClear(); } }, icon('x'))
      : el('span', { className: 'pill-chevron' }, icon('chevronDown')),
  ]);
  const menu = el('div', { className: 'menu' }, [
    el('div', { className: 'menu-title', textContent: label }),
    ...options.map(([value, text, count, picked, hint]) => el('button', {
      type: 'button',
      className: 'menu-item' + (picked ? ' picked' : ''),
      onclick: () => onPick(value),
    }, [
      el('span', { className: 'menu-check' }, picked ? icon('check') : ''),
      el('span', { className: 'menu-text', textContent: text }),
      hint ? el('span', { className: 'menu-info', title: hint, 'aria-label': hint }, icon('info')) : '',
      count === null ? '' : el('span', { className: 'menu-count', textContent: String(count) }),
    ])),
    multi && active ? el('button', { type: 'button', className: 'menu-clear', textContent: 'Clear', onclick: onClear }) : '',
  ]);
  pop.append(summary, menu);
  return pop;
}

function renderFilterBar() {
  const openKey = document.querySelector('.filter-pop[open]')?.dataset.key;
  const pool = viewPool();
  // Don't rebuild the bar when nothing changed (it would also close an open menu for nothing).
  const state = JSON.stringify([filters, view, pool.map((i) => i.id + i.status + (i.early ? 1 : 0)).join(), openKey, profile, $('sort').value, filter, moreFilters, archivedList.length]);
  if (state === filterBarState) return;
  filterBarState = state;
  const set = (patch) => { filters = { ...filters, ...patch }; saveFilters(); };

  const pills = FILTERS.map((def) => {
    const counts = {};
    (filters[def.key] || []).forEach((v) => (counts[v] = 0));
    pool.forEach((i) => def.values(i).forEach((v) => (counts[v] = (counts[v] || 0) + 1)));
    const picked = filters[def.key] || [];
    const options = Object.entries(counts)
      .sort((a, b) => (a[0] === 'Not specified' || a[0] === 'Other') - (b[0] === 'Not specified' || b[0] === 'Other') || b[1] - a[1])
      .map(([v, n]) => [v, v, n, picked.includes(v)]);
    const value = picked.length > 1 ? `${def.label} · ${picked.length}` : picked[0];
    return filterPill(def.key, def.label, value, picked.length > 0, options, true, (v) => {
      const next = new Set(picked);
      next.has(v) ? next.delete(v) : next.add(v);
      set({ [def.key]: [...next] });
    }, () => set({ [def.key]: [] }));
  });
  const single = (key, label, choices) => {
    const current = filters[key] || '';
    const pickedText = choices.find(([v]) => v === current)?.[1];
    return filterPill(key, label, pickedText, Boolean(current), choices.map(([v, text]) => [v, text, null, v === current]), false,
      (v) => { set({ [key]: v }); document.querySelectorAll('.filter-pop[open]').forEach((d) => (d.open = false)); },
      () => set({ [key]: '' }));
  };
  const earlyCount = pool.filter((i) => i.early).length;
  const early = el('button', {
    type: 'button',
    className: 'filter-toggle' + (filters.early ? ' active' : ''),
    disabled: !earlyCount && !filters.early,
    title: earlyCount ? 'Only offers with few applicants so far' : 'No offer here is flagged "early applicant" yet',
    onclick: () => set({ early: !filters.early }),
  }, [icon('bolt'), `Early applicant${earlyCount ? ` · ${earlyCount}` : ''}`]);
  const any = FILTERS.some((d) => (filters[d.key] || []).length || (filters[`${d.key}Not`] || []).length) || filters.posted || filters.early || filters.minMatch;
  const shown = pool.filter((i) => passesFilters(i, filters)).length;
  const sortChoices = [...$('sort').options].map((o) => [o.value, o.textContent]);
  const sortLabel = sortChoices.find(([v]) => v === $('sort').value)?.[1] || 'Best match';
  const sortPop = filterPill('sort', 'Sort by', '', false, sortChoices.map(([v, t]) => [v, t, null, v === $('sort').value]), false, (v) => {
    $('sort').value = v;
    try {
      localStorage.setItem('sortBy', v);
    } catch {}
    document.querySelectorAll('.filter-pop[open]').forEach((d) => (d.open = false));
    filterBarState = '';
    render();
  }, () => {});
  sortPop.classList.add('sort-pop');
  sortPop.querySelector('.pill-text').replaceChildren(icon('list'), sortLabel);
  const hiddenPills = FILTERS.flatMap((def) => (filters[`${def.key}Not`] || []).map((v) => el('button', {
    type: 'button',
    className: 'filter-toggle active hidden-pill',
    title: `Offers with ${def.label.toLowerCase()} “${v}” are hidden. Click to show them again.`,
    onclick: () => set({ [`${def.key}Not`]: (filters[`${def.key}Not`] || []).filter((x) => x !== v) }),
  }, [`Hiding ${v}`, el('span', { className: 'pill-x' }, icon('x'))])));
  // List: one "Step" menu instead of a row of chips.
  const stepCounts = { All: all.length, 'Needs attention': all.filter(attention).length };
  for (const s of STATUSES) stepCounts[s] = all.filter((i) => i.status === s).length;
  stepCounts.Archived = archivedList.length;
  const stepPop = filterPill('step', 'Step', filter, filter !== 'All',
    Object.entries(stepCounts).map(([s, n]) => [s, s, n, s === filter,
      s === 'Archived' ? 'Offers you hadn’t sorted that were published more than 4 weeks ago. They’re archived automatically; Restore brings one back.' : '']), false,
    (s) => {
      filter = s;
      document.querySelectorAll('.filter-pop[open]').forEach((d) => (d.open = false));
      filterBarState = '';
      if (view !== 'list' && s !== 'All') setView('list'); // a step or the archive is shown in the List
      render();
    },
    () => { filter = 'All'; filterBarState = ''; render(); });
  stepPop.classList.add('step-pop');
  // Main filters always visible; the others behind "More filters" unless in use.
  const byKey = Object.fromEntries(FILTERS.map((def, n) => [def.key, pills[n]]));
  const matchPop = single('minMatch', 'Match', MATCH_LEVELS.map(([v]) => [v, v ? `${v}%+ match` : 'Any match']));
  const postedPop = single('posted', 'Posted', POSTED_WITHIN.map(([v, t]) => [v, t]));
  const secondary = [
    [byKey.kind, (filters.kind || []).length], [byKey.site, (filters.site || []).length],
    [postedPop, filters.posted], [early, filters.early],
  ];
  const activeSecondary = secondary.filter(([, on]) => on).length;
  // All filters behind one "Filters" button, with how many are on.
  const activeCount = [
    ...FILTERS.map((d) => (filters[d.key] || []).length + (filters[`${d.key}Not`] || []).length > 0),
    filters.minMatch, filters.posted, filters.early,
  ].filter(Boolean).length;
  void activeSecondary;
  const moreBtn = el('button', {
    type: 'button',
    className: 'filter-toggle more-filters' + (moreFilters ? ' on' : '') + (activeCount ? ' active' : ''),
    onclick: () => { moreFilters = !moreFilters; filterBarState = ''; renderFilterBar(); },
  }, [icon('filter'), activeCount ? `Filters · ${activeCount}` : 'Filters', icon(moreFilters ? 'chevronDown' : 'chevronRight')]);
  $('filterBar').replaceChildren(
    stepPop,
    view === 'discover' ? '' : sortPop,
    moreBtn,
    any ? el('button', { type: 'button', className: 'clear-all', onclick: () => { filters = {}; saveFilters(); } }, [`Clear · ${shown} of ${pool.length}`]) : '',
    moreFilters ? el('div', { className: 'filter-panel' }, [byKey.location, byKey.contract, matchPop, ...secondary.map(([p]) => p), ...hiddenPills]) : '',
  );
  if (openKey) {
    const d = $('filterBar').querySelector(`.filter-pop[data-key="${openKey}"]`);
    if (d) d.open = true;
  }
}

// Close a filter menu when clicking elsewhere.
document.addEventListener('click', (e) => {
  if (!e.target.isConnected) return; // the click was on a menu that was just redrawn
  document.querySelectorAll('.filter-pop[open]').forEach((d) => { if (!d.contains(e.target)) d.open = false; });
});
document.addEventListener('toggle', (e) => {
  if (e.target.matches?.('.filter-pop[open]')) document.querySelectorAll('.filter-pop[open]').forEach((d) => { if (d !== e.target) d.open = false; });
}, true);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') document.querySelectorAll('.filter-pop[open]').forEach((d) => (d.open = false));
});

// ---- Board: drag offers between the steps ----

const NEXT_STEP = { New: 'To apply', 'To apply': 'Applied', Applied: 'Interview', Interview: 'Offer' };
// The board only holds offers you liked; new ones are reviewed in Discover.
const BOARD_STEPS = STATUSES.filter((s) => s !== 'New' && s !== 'Not interested');

function renderBoard() {
  const q = $('search').value.trim().toLowerCase();
  const items = all
    .filter((i) => filter !== 'Needs attention' || attention(i))
    .filter((i) => passesFilters(i, filters))
    .filter((i) => !q || [i.title, i.company, i.location, i.notes, i.source].join(' ').toLowerCase().includes(q))
    .sort(SORTS[$('sort').value] || SORTS.match);
  const liked = all.filter((i) => BOARD_STEPS.includes(i.status));
  const newMatching = all.filter((i) => i.status === 'New' && passesFilters(i, filters)).length;
  if (!items.length) {
    $('board').hidden = true;
    $('noMatch').hidden = false;
    $('noMatch').replaceChildren(
      liked.length ? `None of the ${liked.length} offers you liked matches these filters. ` : 'You haven’t liked any offer yet: the board only shows the ones you like. ',
      newMatching ? el('button', { type: 'button', className: 'link', textContent: `See the ${newMatching} new offers that match in Discover →`, onclick: () => setView('discover') }) : '',
    );
    return;
  }
  $('noMatch').hidden = true;
  const columnScroll = [...$('board').querySelectorAll('.column-cards')].map((c) => c.scrollTop);
  requestAnimationFrame(() => $('board').querySelectorAll('.column-cards').forEach((c, n) => (c.scrollTop = columnScroll[n] || 0)));
  $('board').replaceChildren(...BOARD_STEPS.map((status) => {
    const cards = items.filter((i) => i.status === status);
    const column = el('section', { className: `column st-${slug(status)}` }, [
      el('header', { className: 'column-head' }, [
        el('div', { className: 'column-title' }, [el('span', { className: 'dot' }), status,
          cards.some(attention) ? el('span', { className: 'badge', title: 'Actions to do', textContent: String(cards.filter(attention).length) }) : '',
          el('span', { className: 'count', textContent: String(cards.length) })]),
        el('p', { className: 'column-goal', textContent: STEP_GUIDES[status]?.goal || '' }),
      ]),
      el('div', { className: 'column-cards' }, cards.length ? cards.map(boardCard) : el('p', { className: 'column-empty', textContent: 'Drop an offer here' })),
    ]);
    column.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (!column.classList.contains('drop')) {
        document.querySelectorAll('.column.drop').forEach((c) => c.classList.remove('drop'));
        column.classList.add('drop');
      }
    });
    column.addEventListener('dragleave', (e) => {
      if (!column.contains(e.relatedTarget)) column.classList.remove('drop');
    });
    column.addEventListener('drop', (e) => {
      e.preventDefault();
      column.classList.remove('drop');
      const item = all.find((x) => x.id === e.dataTransfer.getData('text/plain'));
      if (!item || item.status === status) return;
      // The card jumps to its new column right away; saving happens behind the scenes.
      const card = document.querySelector(`.card[data-id="${CSS.escape(item.id)}"]`);
      const from = card?.closest('.column');
      const cards = column.querySelector('.column-cards');
      cards.querySelector('.column-empty')?.remove();
      if (card) cards.prepend(card);
      card?.classList.add('landed');
      for (const col of [from, column]) {
        if (!col) continue;
        const n = col.querySelectorAll('.card').length;
        col.querySelector('.count').textContent = String(n);
        const holder = col.querySelector('.column-cards');
        if (!n && !holder.querySelector('.column-empty')) holder.append(el('p', { className: 'column-empty', textContent: 'Drop an offer here' }));
      }
      item.status = status;
      saveInternship({ ...item, status });
      if (status === 'Interview') setTimeout(() => openInterview(item), 220); // the calendar appears as it lands
    });
    return column;
  }));
}

// The calendar chip on cards in the Interview column.
function interviewChip(i) {
  const text = i.interviewAt ? `${formatDate(i.interviewAt.slice(0, 10))} · ${i.interviewAt.slice(11, 16)}` : 'Add the interview date';
  return el('button', { type: 'button', className: 'docs-chip cal-chip' + (i.interviewAt ? ' set' : ''), title: 'Interview date and calendar', onclick: (e) => { e.stopPropagation(); openInterview(i); } }, [icon('calendar'), text]);
}

let intItem = null;
function showCalendarButtons(i) {
  const events = calendarEvents(i);
  $('intAdd').hidden = !events.length;
  $('intAdd').replaceChildren(...events.flatMap((e) => [
    el('button', { type: 'button', className: 'small', onclick: () => downloadIcs([e], `swipely-${e.key}-${slug(i.company || 'offer')}`, i.id) }, [icon('calendar'), `${e.label}: Apple / Outlook`]),
    el('a', { className: 'button-link small', href: googleCalendarUrl(e), target: '_blank', rel: 'noopener' }, [icon('external'), 'Google']),
  ]));
}

function openInterview(i) {
  intItem = all.find((x) => x.id === i.id) || i;
  $('intFor').textContent = `${intItem.company || ''} · ${cleanOfferTitle(intItem.title)}`;
  $('intAt').value = intItem.interviewAt || '';
  showCalendarButtons(intItem);
  $('intDialog').showModal();
  $('intAt').focus();
}

$('intForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const saved = await updateInternship(intItem.id, { interviewAt: $('intAt').value });
  if (saved) intItem = saved;
  showCalendarButtons(intItem);
  if ($('intAt').value) toast('Interview saved. Add it to your calendar below, or later from the offer.', [], 'calendar');
});
$('intClear').addEventListener('click', async () => {
  $('intAt').value = '';
  const saved = await updateInternship(intItem.id, { interviewAt: '' });
  if (saved) intItem = saved;
  showCalendarButtons(intItem);
});
$('intClose').addEventListener('click', () => $('intDialog').close());

function stepProgress(i) {
  const tasks = STEP_GUIDES[i.status]?.tasks || [];
  const done = (i.steps?.[i.status] || []).filter(Boolean).length;
  return { done: Math.min(done, tasks.length), total: tasks.length };
}

function boardCard(i) {
  const warn = attention(i);
  const card = el('article', { className: 'card' + (warn ? ' needs-action' : ''), draggable: true, onclick: () => openWorkspace(i) }, [
    el('div', { className: 'card-top' }, [
      el('div', { className: 'logos' }, [companyLogo(i), siteLogo(i)]),
      el('span', { className: 'card-top-right' }, [warn ? el('span', { className: 'action-dot', title: warn }) : '', scorePill(i)]),
    ]),
    el('div', { className: 'card-title', textContent: i.title || '(no title)' }),
    el('div', { className: 'muted', textContent: [i.company, i.location].filter(Boolean).join(' · ') }),
    // One line at most: what to do, or the interview date. Everything else is in the offer window.
    warn ? el('div', { className: 'card-foot' }, el('span', { className: 'tag action', textContent: warn })) : i.status === 'Interview' ? interviewChip(i) : '',
    el('button', { type: 'button', className: 'card-delete hover-only', title: 'Remove this offer', ariaLabel: 'Remove this offer', onclick: () => removeOffer(i) }, icon('trash')),
  ]);
  card.dataset.id = i.id;
  // The logos keep their own click (company page / the offer).
  card.querySelectorAll('button').forEach((b) => b.addEventListener('click', (e) => e.stopPropagation()));
  card.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', i.id);
    e.dataTransfer.effectAllowed = 'move';
    // Fade the original only after the browser has taken the picture that follows the pointer.
    requestAnimationFrame(() => {
      card.classList.add('dragging');
      document.body.classList.add('is-dragging');
    });
  });
  card.addEventListener('dragend', () => {
    card.classList.remove('dragging');
    document.body.classList.remove('is-dragging');
    document.querySelectorAll('.column.drop').forEach((c) => c.classList.remove('drop'));
  });
  return card;
}

function setView(v) {
  view = v;
  try {
    localStorage.setItem('trackerView', v);
  } catch {}
  render(); // the filter bar and the message at the top depend on the view too
}
$('viewList').addEventListener('click', () => setView('list'));
$('viewDiscover').addEventListener('click', () => setView('discover'));
$('viewBoard').addEventListener('click', () => setView('board'));

// ---- Discover: like or pass new offers, one at a time ----

function renderDiscover() {
  const q = $('search').value.trim().toLowerCase();
  const deck = all
    .filter((i) => i.status === 'New')
    .filter((i) => passesFilters(i, filters))
    .filter((i) => !q || [i.title, i.company, i.location, i.source].join(' ').toLowerCase().includes(q))
    .sort((a, b) => matchScore(b, profile).score - matchScore(a, profile).score);
  const undo = el('button', { type: 'button', className: 'round undo', title: 'Undo (U)', disabled: !lastSwipe, onclick: undoSwipe }, icon('undo'));
  if (!deck.length && all.some((i) => i.status === 'New')) {
    $('discover').replaceChildren(el('div', { className: 'deck-empty' }, [
      el('div', { className: 'deck-empty-icon' }, icon('filter')),
      el('h2', { textContent: 'No new offer matches these filters' }),
      el('p', { className: 'muted', textContent: 'Loosen a filter, or reset them to see every new offer.' }),
      el('div', { className: 'deck-actions' }, [el('button', { type: 'button', className: 'primary', textContent: 'Reset filters', onclick: () => { filters = {}; saveFilters(); } })]),
    ]));
    return;
  }
  if (!deck.length) {
    $('discover').replaceChildren(el('div', { className: 'deck-empty' }, [
      el('div', { className: 'deck-empty-icon' }, icon('checkCircle')),
      el('h2', { textContent: 'All caught up' }),
      el('p', { className: 'muted', textContent: 'New offers from your saved searches will show up here. The ones you like are on the board.' }),
      el('div', { className: 'deck-actions' }, [undo, el('button', { type: 'button', className: 'primary', textContent: 'Open the board', onclick: () => setView('board') })]),
    ]));
    return;
  }
  const [top, ...rest] = deck;
  if (!top.description && !top.describedAt) loadDescription(top, true);
  if (rest[0] && !rest[0].description && !rest[0].describedAt) loadDescription(rest[0], true);
  $('discover').replaceChildren(
    el('p', { className: 'deck-count muted', textContent: `${deck.length} offer${deck.length > 1 ? 's' : ''} to review · best matches first` }),
    el('div', { className: 'deck' }, [
      el('div', { className: 'swipe-hint left' }, [icon('arrowLeft'), ' Dislike']),
      el('div', { className: 'swipe-hint right' }, ['Like ', icon('arrowRight')]),
      ...rest.slice(0, 2).reverse().map((_, n, arr) => el('div', { className: `ghost-card g${arr.length - n}` })),
      swipeCard(top),
    ]),
    el('div', { className: 'deck-actions' }, [
      el('button', { type: 'button', className: 'round pass', title: 'Dislike (swipe left or ←)', onclick: () => swipe(top, 'pass') }, icon('x')),
      undo,
      el('button', { type: 'button', className: 'round info', title: 'Open the offer’s window', onclick: () => openWorkspace(top) }, icon('info')),
      el('button', { type: 'button', className: 'round like', title: 'Like (swipe right or →)', onclick: () => swipe(top, 'like') }, icon('heart-filled')),
    ]),
    swipeCount() < 5 ? el('p', { className: 'deck-help muted', textContent: 'Swipe with two fingers on the trackpad, drag the card, or use the ← → keys.' }) : '',
  );
}

function swipeCard(i) {
  const { score, why } = matchScore(i, profile);
  const tag = companyTag(i);
  const like = el('div', { className: 'stamp stamp-like', textContent: 'LIKE' });
  const nope = el('div', { className: 'stamp stamp-nope', textContent: 'DISLIKE' });
  let body;
  if (i.description) {
    // The sentence that says what the job is comes first, then the full text.
    const lead = leadSentence(i.description);
    body = el('div', { className: 'swipe-desc' }, [
      lead ? el('p', { className: 'swipe-lead', textContent: lead }) : '',
      el('div', { className: 'swipe-full', textContent: cleanDescription(i.description) }),
    ]);
  } else {
    // No description yet: what we already know, in one line.
    const role = matchScore(i, profile).why.find((w) => w.startsWith('Role: '))?.slice(6);
    const glance = [role ? `${role} role` : contractOf(i) || 'Offer', i.company && `at ${i.company}`, i.location && `in ${i.location}`].filter(Boolean).join(' ');
    const waiting = !i.describeError || /slow down|paused|didn.t answer|limit/i.test(i.describeError);
    body = el('div', {}, [
      el('p', { className: 'swipe-lead glance', textContent: `${glance}.` }),
      loading.has(i.id)
        ? el('p', { className: 'desc-note', textContent: 'Loading the description…' })
        : el('p', { className: 'desc-note' }, waiting
          ? ['The full description will appear here by itself in a few minutes. ', el('button', { type: 'button', className: 'link', textContent: 'Try now', onclick: () => loadDescription(i) })]
          : ['The description couldn’t be read from this site. ', el('a', { href: i.url, target: '_blank', rel: 'noopener', textContent: 'Read it on the site' })]),
    ]);
  }
  const card = el('article', { className: 'swipe-card', id: 'topCard' }, [
    like, nope,
    el('div', { className: 'swipe-head' }, [
      el('div', { className: 'logos big' }, [companyLogo(i), siteLogo(i)]),
      el('div', { className: 'swipe-score' }, [el('span', { className: `score ${score >= 60 ? 'high' : score >= profile.minScore ? 'mid' : 'low'}`, textContent: `${score}% match` })]),
    ]),
    el('h2', { className: 'swipe-title', textContent: i.title || '(no title)' }),
    el('div', { className: 'swipe-company', textContent: [i.company, i.location].filter(Boolean).join(' · ') }),
    el('div', { className: 'facts-line' }, [
      tag ? el('span', { className: `kind kind-${slug(tag)}`, textContent: tag }) : '',
      i.industry ? el('span', { className: 'fact', textContent: i.industry }) : '',
      contractOf(i) ? el('span', { className: `fact contract-${slug(contractOf(i))}`, textContent: contractOf(i) }) : '',
      i.postedAt ? el('span', { className: 'fact', textContent: postedLabel(i.postedAt) }) : '',
      i.early ? el('span', { className: 'fact early' }, [icon('bolt'), 'Early applicant']) : '',
    ]),
    why.length ? el('ul', { className: 'why' }, why.map((w) => el('li', { textContent: w }))) : '',
    body,
  ]);
  // Swipe the card: drag it, or two-finger swipe on the trackpad. Right = like, left = dislike.
  let startX = null;
  let dx = 0;
  const follow = (x) => {
    dx = x;
    card.style.transform = `translateX(${dx}px) rotate(${dx / 18}deg)`;
    like.style.opacity = Math.max(0, Math.min(1, dx / 110));
    nope.style.opacity = Math.max(0, Math.min(1, -dx / 110));
  };
  const settle = () => {
    card.classList.remove('dragging');
    if (dx > 110) return swipe(i, 'like');
    if (dx < -110) return swipe(i, 'pass');
    dx = 0;
    card.style.transform = '';
    like.style.opacity = nope.style.opacity = 0;
  };
  let wheelTimer = null;
  card.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return; // vertical scroll reads the description
    e.preventDefault(); // stops Chrome's "swipe to go back"
    card.classList.add('dragging');
    follow(dx - e.deltaX);
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(settle, 140);
  }, { passive: false });
  card.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button, a, .swipe-desc')) return;
    startX = e.clientX;
    dx = 0;
    card.setPointerCapture(e.pointerId);
    card.classList.add('dragging');
  });
  card.addEventListener('pointermove', (e) => {
    if (startX !== null) follow(e.clientX - startX);
  });
  const release = () => {
    if (startX === null) return;
    startX = null;
    settle();
  };
  card.addEventListener('pointerup', release);
  card.addEventListener('pointercancel', release);
  return card;
}

function swipeCount() {
  try {
    return Number(localStorage.getItem('swipes') || 0);
  } catch {
    return 0;
  }
}

let swiping = false;
async function swipe(i, choice) {
  if (swiping) return;
  swiping = true;
  const card = $('topCard');
  if (card) {
    card.classList.add('fly', choice);
    card.querySelector(choice === 'like' ? '.stamp-like' : '.stamp-nope').style.opacity = 1;
  }
  lastSwipe = { id: i.id, status: i.status };
  try {
    localStorage.setItem('swipes', String(swipeCount() + 1));
  } catch {}
  await new Promise((r) => setTimeout(r, 260));
  await saveInternship({ ...i, status: choice === 'like' ? 'To apply' : 'Not interested', likedAt: choice === 'like' ? new Date().toISOString() : '' });
  swiping = false;
  if (choice === 'like') {
    toast(`${i.company || 'Offer'} added to your board. Your tailored CV and cover letter are ready.`, [
      ['Open CV', () => openDoc(i, 'cv')],
      ['Open letter', () => openDoc(i, 'letter')],
      ['Undo', undoSwipe],
    ], 'heart');
    queueLetters();
  } else {
    toast(`Passed on ${i.company || 'this offer'}.`, [['Undo', undoSwipe]], 'x');
  }
}

async function undoSwipe() {
  if (!lastSwipe) return;
  const item = all.find((x) => x.id === lastSwipe.id);
  const prev = lastSwipe.status;
  lastSwipe = null;
  if (item) await saveInternship({ ...item, status: prev });
}

document.addEventListener('keydown', (e) => {
  if (view !== 'discover' || document.querySelector('dialog[open]') || /input|textarea|select/i.test(e.target.tagName)) return;
  const top = all.filter((i) => i.status === 'New' && passesFilters(i, filters)).sort((a, b) => matchScore(b, profile).score - matchScore(a, profile).score)[0];
  if (e.key === 'ArrowRight' && top) swipe(top, 'like');
  else if (e.key === 'ArrowLeft' && top) swipe(top, 'pass');
  else if (e.key.toLowerCase() === 'u') undoSwipe();
});

// ---- Suggestions (learned from your swipes) ----

let dismissedSuggestions = [];
chrome.storage.local.get('dismissedSuggestions').then(({ dismissedSuggestions: d = [] }) => {
  dismissedSuggestions = d;
  if (all.length) renderSuggestion();
});

function renderSuggestion() {
  const s = view === 'list' ? null : computeSuggestions(all, filters, profile, dismissedSuggestions)[0];
  $('suggest').hidden = !s;
  if (!s) return;
  $('suggest').replaceChildren(
    el('span', { className: 'suggest-icon' }, icon('wand')),
    el('div', { className: 'suggest-text' }, [el('b', { textContent: s.question }), el('span', { textContent: ` ${s.text}` })]),
    el('button', { type: 'button', className: 'primary', textContent: s.label, onclick: () => applySuggestion(s) }),
    el('button', { type: 'button', textContent: 'Not now', onclick: () => dismissSuggestion(s) }),
  );
}

async function applySuggestion(s) {
  if (s.action.type === 'filter') {
    filters = { ...filters, ...s.action.patch };
    saveFilters();
    toast('Filter applied. You can remove it anytime with its ✕.', [], 'wand');
  } else if (s.action.type === 'avoid') {
    const { taste, ...saved } = profile; // the learned taste is computed, never stored
    await saveProfile({ ...saved, avoid: [profile.avoid, s.action.word].filter(Boolean).join(', ') });
    toast(`“${s.action.word}” added to your avoid words (Preferences).`, [], 'wand');
  }
  await dismissSuggestion(s, true);
}

async function dismissSuggestion(s, quiet = false) {
  dismissedSuggestions = [...new Set([...dismissedSuggestions, s.key])];
  await chrome.storage.local.set({ dismissedSuggestions });
  if (!quiet) toast('Got it, I won’t suggest that again.', [], 'check');
  render();
}

// ---- Status menu (same look as the filter menus) ----

function statusMenu(i) {
  const pop = el('details', { className: `filter-pop status-pop floating st-${slug(i.status)}` });
  pop.append(
    el('summary', { title: 'Change the step' }, [el('span', { className: 'sdot' }), el('span', { className: 'pill-text', textContent: i.status }), el('span', { className: 'pill-chevron' }, icon('chevronDown'))]),
    el('div', { className: 'menu' }, [
      el('div', { className: 'menu-title', textContent: 'Step' }),
      ...STATUSES.map((s) => el('button', {
        type: 'button',
        className: `menu-item st-${slug(s)}` + (s === i.status ? ' picked' : ''),
        onclick: () => {
          pop.open = false;
          if (s !== i.status) saveInternship({ ...i, status: s });
        },
      }, [el('span', { className: 'menu-check' }, s === i.status ? icon('check') : ''), el('span', { className: 'sdot' }), el('span', { className: 'menu-text', textContent: s })])),
    ]),
  );
  return pop;
}

// Menus inside scrolling areas (the list, windows) float above everything so they're never cut off.
document.addEventListener('toggle', (e) => {
  const d = e.target;
  if (!d.matches?.('.filter-pop.floating[open]')) return;
  const r = d.querySelector('summary').getBoundingClientRect();
  const menu = d.querySelector('.menu');
  menu.style.position = 'fixed';
  menu.style.left = `${Math.min(r.left, innerWidth - 240)}px`;
  const below = innerHeight - r.bottom;
  if (below < 300 && r.top > below) {
    menu.style.top = '';
    menu.style.bottom = `${innerHeight - r.top + 6}px`;
  } else {
    menu.style.bottom = '';
    menu.style.top = `${r.bottom + 6}px`;
  }
}, true);
document.addEventListener('scroll', () => document.querySelectorAll('.filter-pop.floating[open]').forEach((d) => (d.open = false)), true);

// ---- Archived offers ----

async function restoreArchived(i) {
  await updateInternship(i.id, { archived: false, archivedAt: '', keepFresh: true });
  toast(`${i.company || 'Offer'} is back in Discover.`, [], 'undo');
}

// ---- Removing an offer (with Undo) ----

async function removeOffer(i) {
  const saved = (await loadAll()).find((x) => x.id === i.id);
  if (!saved) return;
  openIds.delete(i.id);
  await deleteInternship(i.id);
  toast(`${i.company || 'Offer'} removed from your tracker.`, [['Undo', async () => {
    const list = await loadAll();
    if (!list.some((x) => x.id === saved.id)) await saveAll([...list, saved]);
  }]], 'trash');
}

// ---- Messages at the bottom of the screen ----

function toast(text, actions = [], iconName = 'check') {
  const box = el('div', { className: 'toast' }, [
    el('span', { className: 'toast-icon' }, icon(iconName)),
    el('span', { className: 'toast-text', textContent: text }),
    ...actions.map(([label, fn]) => el('button', { type: 'button', className: 'link', textContent: label, onclick: () => { fn(); box.remove(); } })),
    el('button', { type: 'button', className: 'toast-close', title: 'Close', onclick: () => box.remove() }, icon('x')),
  ]);
  $('toasts').append(box);
  setTimeout(() => box.classList.add('out'), 7000);
  setTimeout(() => box.remove(), 7400);
}

// ---- First-time guide ----

function renderIntro() {
  let done = false;
  try {
    done = localStorage.getItem('introDone') === '1';
  } catch {}
  const show = !done && view === 'discover';
  $('intro').hidden = !show;
  if (!show) return;
  const step = (name, title, text) => el('div', { className: 'intro-step' }, [el('div', { className: 'intro-icon' }, icon(name)), el('b', { textContent: title }), el('p', { textContent: text })]);
  $('intro').replaceChildren(
    el('div', { className: 'intro-steps' }, [
      step('heart', '1. Swipe the offers', 'Offers that fit your CV arrive here every day. Swipe right to like, left to pass.'),
      step('file', '2. Your documents are ready', 'Each offer you like gets a tailored CV and a cover letter, written for it.'),
      step('board', '3. Follow the board', 'Drag each application through the steps. Every step tells you what to do next.'),
    ]),
    el('button', { type: 'button', className: 'primary', textContent: 'Got it', onclick: () => {
      try {
        localStorage.setItem('introDone', '1');
      } catch {}
      renderIntro();
    } }),
  );
}
// Interface language: the button offers the other one.
$('langLabel').textContent = UI_LANG === 'fr' ? 'English' : 'Français';
$('langBtn').addEventListener('click', () => setUiLang(UI_LANG === 'fr' ? 'en' : 'fr'));

$('help').addEventListener('click', () => {
  try {
    localStorage.removeItem('introDone');
  } catch {}
  setView('discover');
});

// ---- Cover letters written by Chrome's AI for liked offers ----

const aiQueue = [];
let aiBusy = false;

function queueLetters() {
  for (const i of all) {
    if (i.status === 'To apply' && !i.aiLetter && !i.docs?.[`letter_${offerLang(i)}`] && !aiQueue.includes(i.id)) aiQueue.push(i.id);
  }
  runAiQueue();
}

async function runAiQueue() {
  if (aiBusy) return;
  aiBusy = true;
  try {
    while (aiQueue.length) {
      const id = aiQueue.shift();
      let item = (await loadAll()).find((x) => x.id === id);
      if (!item || item.aiLetter) continue;
      const lang = offerLang(item);
      const state = await chromeAiStatus(lang);
      if (state !== 'available') {
        await updateInternship(id, { aiLetter: state === 'unavailable' ? 'unavailable' : 'needs-download' });
        continue;
      }
      if (!item.description && !item.describedAt) {
        await chrome.runtime.sendMessage({ type: 'describe', id });
        item = (await loadAll()).find((x) => x.id === id) || item;
      }
      await updateInternship(id, { aiLetter: 'writing' });
      try {
        await writeAiLetter(item, lang);
        toast(`Cover letter written for ${item.company || 'this offer'}.`, [['Open it', () => openDoc(item, 'letter')]], 'sparkles');
      } catch (e) {
        await updateInternship(id, { aiLetter: 'error', aiError: String(e.message || e) });
      }
    }
  } finally {
    aiBusy = false;
  }
}

async function writeAiLetter(item, lang, onProgress) {
  const letter = coverLetter(item, lang, profile);
  const paragraphs = await aiWriteLetter(item, lang, letter.paragraphs.join('\n\n'), onProgress);
  const fresh = (await loadAll()).find((x) => x.id === item.id) || item;
  await updateInternship(item.id, { aiLetter: 'done', aiError: '', docs: { ...(fresh.docs || {}), [`letter_${lang}`]: letterHtml({ ...letter, paragraphs }, item) } });
}

// The CV / letter status shown on board cards.
function docsChip(i) {
  if (!BOARD_STEPS.includes(i.status)) return '';
  const [name, text] = {
    writing: ['sparkles', 'Writing your letter…'],
    done: ['sparkles', 'CV + AI letter ready'],
  }[i.aiLetter] || ['file', 'CV + letter ready'];
  return el('button', {
    type: 'button',
    className: 'docs-chip' + (i.aiLetter === 'writing' ? ' busy' : ''),
    onclick: (e) => {
      e.stopPropagation();
      openWorkspace(i, 'docs');
    },
  }, [icon(name), text]);
}

function aiPanel(i, lang) {
  const state = i.aiLetter || '';
  const line = (name, text, button) => el('div', { className: 'ai-panel' }, [el('span', { className: 'ai-icon' }, icon(name)), el('p', { textContent: text }), button || '']);
  const writeNow = (label) => el('button', { type: 'button', className: 'primary', textContent: label, onclick: async (e) => {
    const btn = e.target;
    btn.disabled = true;
    await updateInternship(i.id, { aiLetter: 'writing' });
    try {
      await writeAiLetter(i, lang, (msg) => (btn.textContent = msg));
      toast(`Cover letter written for ${i.company || 'this offer'}.`, [['Open it', () => openDoc(i, 'letter')]], 'sparkles');
    } catch (err) {
      await updateInternship(i.id, { aiLetter: 'error', aiError: String(err.message || err) });
    }
  } });
  if (state === 'done') return line('sparkles', 'Your cover letter was written for this offer by Chrome’s AI, from your CV. Read it before sending.');
  if (state === 'writing') return line('clock', 'Chrome’s AI is writing your cover letter for this offer…');
  if (state === 'needs-download') return line('download', 'Chrome’s free AI needs a one-time download on this Mac to write letters for you.', writeNow('Download & write'));
  if (state === 'unavailable') return line('file', 'Chrome’s AI isn’t available on this Mac, so your letter uses the template: just write the yellow sentence about the company.');
  if (state === 'error') return line('alert', `Chrome’s AI couldn’t write this letter (${i.aiError || 'unknown error'}).`, writeNow('Try again'));
  return line('sparkles', 'Let Chrome’s free AI write the cover letter for this offer, from your CV.', writeNow('Write my letter'));
}

// ---- Workspace: everything for one offer ----

function openWorkspace(i, tab = 'steps') {
  ws = i;
  wsTab = tab;
  wsLang = '';
  renderWorkspace();
  $('workspace').showModal();
}

function renderWorkspace() {
  const i = all.find((x) => x.id === ws.id) || ws;
  ws = i;
  const status = statusMenu(i);
  const tag = companyTag(i);
  $('wsHead').replaceChildren(
    el('div', { className: 'logos big' }, [companyLogo(i), siteLogo(i)]),
    el('div', { className: 'ws-title' }, [
      el('h2', { textContent: i.title || '(no title)' }),
      el('div', { className: 'muted', textContent: [i.company, i.location, i.source].filter(Boolean).join(' · ') }),
      el('div', { className: 'facts-line' }, [
        tag ? el('span', { className: `kind kind-${slug(tag)}`, textContent: tag }) : '',
        i.industry ? el('span', { className: 'fact', textContent: i.industry }) : '',
        contractOf(i) ? el('span', { className: `fact contract-${slug(contractOf(i))}`, textContent: contractOf(i) }) : '',
        i.postedAt ? el('span', { className: 'fact', textContent: postedLabel(i.postedAt) }) : '',
        i.early ? el('span', { className: 'fact early' }, [icon('bolt'), 'Early applicant']) : '',
      ]),
    ]),
    el('div', { className: 'ws-side' }, [scorePill(i), status]),
  );
  // People: only for the offers you liked.
  const liked = LIKED_STEPS.includes(i.status);
  if (wsTab === 'people' && !liked) wsTab = 'steps';
  $('wsTabs').querySelectorAll('button').forEach((b) => {
    b.classList.toggle('on', b.dataset.tab === wsTab);
    if (b.dataset.tab === 'people') {
      b.hidden = !liked;
      b.querySelector('.badge')?.remove();
      if (i.people?.length) b.append(el('span', { className: 'badge soft', textContent: String(i.people.length) }));
    }
  });
  const render = { steps: wsSteps, docs: wsDocs, messages: wsMessages, people: wsPeople, offer: (x) => detailRow(x, true) }[wsTab];
  $('wsBody').replaceChildren(render(i));
}

// ---- People: who to ask about the role ----
// LinkedIn doesn't show who holds a role to logged-out visitors, so Swipely never looks people up by itself:
// it prepares the searches (you open them with a click, in your own browser) and keeps the contacts you add.

const PEOPLE_STEPS = ['To contact', 'Contacted', 'Replied', 'Meeting'];

// "Business Analyst Intern (F/H) - Summer 2027" → "Business Analyst"
function roleCore(title) {
  const strip = (x) => x
    .replace(/\b(intern(ship)?|stage|stagiaire|alternance|alternant|apprenti\w*|trainee|graduate|junior|summer|winter|spring|fall|vie|v\.i\.e|cdi|cdd|[hfm]\s*\/\s*[hfm]|20\d\d|\d+\s*(mois|months?))\b/gi, ' ')
    .replace(/\s+/g, ' ').trim();
  // The first part of the title that still says something once "intern", "VIE", dates… are removed.
  return cleanOfferTitle(title || '').replace(/\(.*?\)|\[.*?\]/g, ' ').split(/\s[-–—|·]\s|,/).map(strip).find((x) => x.length > 2) || '';
}

function mySchool() {
  const small = new Set(['de', 'des', 'du', 'la', 'le', 'of', 'and', 'et', 'd’', "d'"]);
  return (CV_DATA.education?.[0]?.org || '').split(/\s[–-]\s/)[0].toLowerCase().split(/\s+/)
    .map((w, n) => (n && small.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(' ').trim();
}

function peopleSearches(i) {
  const company = (i.company || '').trim();
  const role = roleCore(i.title);
  const school = mySchool();
  const li = (q) => `https://www.linkedin.com/search/results/people/?${new URLSearchParams({ keywords: q, origin: 'GLOBAL_SEARCH_HEADER' })}`;
  const google = (q) => `https://www.google.com/search?${new URLSearchParams({ q: `site:linkedin.com/in ${q}` })}`;
  return [
    role && { key: 'role', icon: 'user', label: 'People in this role now', hint: `“${role}” at ${company}`, li: li(`${role} ${company}`), google: google(`"${company}" "${role}"`) },
    { key: 'interns', icon: 'graduation', label: 'Interns and juniors there', hint: 'They know the day-to-day best', li: li(`${company} intern ${role}`.trim()), google: google(`"${company}" (intern OR stagiaire OR stage) ${role ? `"${role}"` : ''}`) },
    { key: 'manager', icon: 'briefcase', label: 'The team’s manager', hint: 'Who you would likely work for', li: li(`${company} head of ${role}`.trim()), google: google(`"${company}" ("head of" OR manager OR lead) ${role ? `"${role}"` : ''}`) },
    { key: 'recruiter', icon: 'search', label: 'Recruiters', hint: 'Talent acquisition at the company', li: li(`${company} recruiter talent acquisition`), google: google(`"${company}" (recruiter OR "talent acquisition" OR recruteur)`) },
    school && { key: 'alumni', icon: 'award', label: `Alumni of ${school}`, hint: 'People from your school working there', li: li(`${company} ${school}`), google: google(`"${company}" "${school}"`) },
  ].filter(Boolean);
}

// linkedin.com/in/jane-doe-1a2b3c → "Jane Doe"
function nameFromProfile(url) {
  const slug = (url.match(/linkedin\.com\/in\/([^/?#]+)/i) || [])[1];
  if (!slug) return '';
  return decodeURIComponent(slug).split('-').filter((w) => !/\d/.test(w) || !/^[0-9a-f]{4,}$/i.test(w)).filter((w) => !/^\d+$/.test(w))
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// A short note to ask about the role (under 300 characters, for a LinkedIn invitation).
function askMessage(i, person, lang) {
  const first = (person.name || '').split(/\s+/)[0];
  const me = (CV_DATA.name || '').split(/\s+/)[0];
  const title = roleCore(i.title) || cleanOfferTitle(i.title);
  const company = i.company || '';
  const text = lang === 'fr'
    ? `Bonjour${first ? ` ${first}` : ''}, je m'intéresse au poste de ${title} chez ${company}. Vous connaissez bien ce rôle : auriez-vous 10 minutes pour m'en parler ? Cela m'aiderait beaucoup pour ma candidature. Merci ! ${me}`
    : `Hi${first ? ` ${first}` : ''}, I'm interested in the ${title} role at ${company}. You know this role well: would you have 10 minutes to tell me about it? It would really help my application. Thanks! ${me}`;
  return text.length <= 300 ? text : text.replace(' Cela m\'aiderait beaucoup pour ma candidature.', '').replace(' It would really help my application.', '');
}

// A photo you give for a contact: copied from LinkedIn (right-click the photo → Copy image) or a file.
// Kept small (96 px) so it stays light in your data.
async function shrinkImage(blob) {
  const bmp = await createImageBitmap(blob);
  const size = 96;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const side = Math.min(bmp.width, bmp.height);
  c.getContext('2d').drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, size, size);
  return c.toDataURL('image/jpeg', 0.85);
}

async function pickPhoto(i, person) {
  let blob = null;
  try {
    for (const item of await navigator.clipboard.read()) {
      const type = item.types.find((t) => t.startsWith('image/'));
      if (type) blob = await item.getType(type);
    }
  } catch {}
  if (!blob) {
    blob = await new Promise((resolve) => {
      const input = el('input', { type: 'file', accept: 'image/*' });
      input.onchange = () => resolve(input.files[0] || null);
      input.click();
    });
  }
  if (!blob) return;
  const photo = await shrinkImage(blob);
  await savePeople(i, (i.people || []).map((x) => (x.id === person.id ? { ...x, photo } : x)));
}

async function savePeople(i, people) {
  const saved = await updateInternship(i.id, { people });
  if (saved) ws = saved;
  renderWorkspace();
}

function wsPeople(i) {
  const lang = docLang(i);
  const people = i.people || [];
  const searches = peopleSearches(i);
  const link = (href, iconName, text) => el('a', { className: 'button-link small', href, target: '_blank', rel: 'noopener' }, [icon(iconName), text]);

  const urlIn = el('input', { type: 'text', placeholder: 'Paste a LinkedIn profile link, or a name', autocomplete: 'off', spellcheck: false });
  const roleIn = el('input', { type: 'text', placeholder: 'Their role (optional)', autocomplete: 'off' });
  const add = async () => {
    const v = urlIn.value.trim();
    if (!v) return urlIn.focus();
    const isUrl = /linkedin\.com\/in\//i.test(v);
    const url = isUrl ? (/^https?:/.test(v) ? v : `https://${v.replace(/^\/+/, '')}`).split('?')[0] : '';
    if (url && people.some((p) => p.url === url)) return toast('This person is already in your list.', [], 'user');
    await savePeople(i, [...people, { id: crypto.randomUUID(), name: isUrl ? nameFromProfile(v) : v, role: roleIn.value.trim(), url, status: 'To contact', addedAt: new Date().toISOString() }]);
  };
  urlIn.addEventListener('keydown', (e) => e.key === 'Enter' && (e.preventDefault(), add()));
  roleIn.addEventListener('keydown', (e) => e.key === 'Enter' && (e.preventDefault(), add()));

  const personRow = (p) => {
    const copy = el('button', { type: 'button', className: 'small' }, [icon('copy'), 'Copy a note']);
    copy.onclick = async () => {
      await navigator.clipboard.writeText(askMessage(i, p, lang));
      copy.replaceChildren(icon('check'), 'Copied');
      setTimeout(() => copy.replaceChildren(icon('copy'), 'Copy a note'), 1500);
    };
    const step = PEOPLE_STEPS.indexOf(p.status);
    // Found on the web, not by you: we can't be sure it's the right person, so it says so.
    const suggested = p.suggested || (typeof PEOPLE_FOUND !== 'undefined' && (PEOPLE_FOUND[i.id] || []).some((x) => x.url === p.url));
    return el('div', { className: 'person' }, [
      el('button', {
        type: 'button',
        className: 'person-avatar' + (p.photo ? ' has-photo' : ''),
        title: p.photo ? 'Change the photo' : 'Add a photo: on LinkedIn, right-click their photo → Copy image, then click here',
        onclick: () => pickPhoto(i, p),
      }, p.photo ? el('img', { src: p.photo, alt: '' }) : [(p.name || '?').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase(), el('span', { className: 'avatar-plus' }, icon('plus'))]),
      el('div', { className: 'person-text' }, [
        el('span', { className: 'person-name' }, [
          el('b', { textContent: p.name || 'Someone' }),
          suggested ? el('span', { className: 'suggested-tag', title: 'Found on the web from public profiles: check their profile before writing' }, [icon('sparkles'), 'Suggested person to contact']) : '',
        ]),
        el('span', { className: 'muted', textContent: [p.role, i.contactName && i.contactName === p.name ? 'used in your messages' : ''].filter(Boolean).join(' · ') || ' ' }),
      ]),
      el('button', {
        type: 'button',
        className: `person-step ps-${step}`,
        title: 'Click to move to the next step',
        onclick: () => savePeople(i, people.map((x) => (x.id === p.id ? { ...x, status: PEOPLE_STEPS[(step + 1) % PEOPLE_STEPS.length] } : x))),
      }, p.status),
      el('div', { className: 'person-actions' }, [
        p.url ? link(p.url, 'external', 'Profile') : '',
        copy,
        el('button', { type: 'button', className: 'small', title: 'Use this name in the Messages tab', onclick: async () => { const s = await updateInternship(i.id, { contactName: p.name }); if (s) ws = s; renderWorkspace(); toast(`Your messages are now addressed to ${p.name}.`, [], 'mail'); } }, 'Use in messages'),
        el('button', { type: 'button', className: 'card-delete', title: 'Remove', ariaLabel: 'Remove', onclick: () => savePeople(i, people.filter((x) => x.id !== p.id)) }, icon('trash')),
      ]),
    ]);
  };

  return el('div', { className: 'ws-people' }, [
    el('section', { className: 'p-section' }, [
      el('h3', {}, ['Find someone to ask about the role', infoTip('Each search opens when you click it. LinkedIn shows the most results when you’re signed in; Google works without signing in.')]),
      ...searches.map((s) => el('div', { className: 'people-search' }, [
        el('span', { className: 'people-icon' }, icon(s.icon)),
        el('div', { className: 'person-text' }, [el('b', { textContent: s.label }), el('span', { className: 'muted', textContent: s.hint })]),
        el('div', { className: 'person-actions' }, [link(s.li, 'external', 'LinkedIn'), link(s.google, 'search', 'Google')]),
      ])),
    ]),
    el('section', { className: 'p-section' }, [
      el('h3', { textContent: `Your contacts for this offer${people.length ? ` · ${people.length}` : ''}` }),
      people.length ? '' : el('p', { className: 'muted', textContent: 'Found someone? Copy their LinkedIn profile link and paste it here.' }),
      ...people.map(personRow),
      el('div', { className: 'people-add' }, [urlIn, roleIn, el('button', { type: 'button', className: 'primary small', onclick: add }, [icon('plus'), 'Add'])]),
    ]),
  ]);
}

function downloadIcs(events, name, id) {
  download(`${name}.ics`, icsFor(events, id), 'text/calendar;charset=utf-8');
}

// The dated things of this offer, ready for your calendar.
function calendarBlock(i) {
  const events = calendarEvents(i);
  const when = (e) => (e.start ? `${formatDate(e.start.slice(0, 10))} · ${e.start.slice(11, 16)}` : formatDate(e.date));
  return el('div', { className: 'cal-block' }, [
    el('div', { className: 'cal-head' }, [icon('calendar'), el('b', { textContent: 'Calendar' }),
      events.length > 1 ? el('button', { type: 'button', className: 'link', textContent: 'Add all to my calendar', onclick: () => downloadIcs(events, `swipely-${slug(i.company || 'offer')}`, i.id) }) : '']),
    ...(events.length ? events.map((e) => el('div', { className: 'cal-row' }, [
      el('span', { className: 'cal-label', textContent: e.label }),
      el('span', { className: 'cal-when', textContent: when(e) }),
      el('button', { type: 'button', className: 'small', onclick: () => downloadIcs([e], `swipely-${e.key}-${slug(i.company || 'offer')}`, i.id) }, [icon('plus'), 'Apple / Outlook']),
      el('a', { className: 'button-link small', href: googleCalendarUrl(e), target: '_blank', rel: 'noopener' }, [icon('external'), 'Google']),
    ])) : [el('p', { className: 'muted cal-empty' }, [
      'Nothing dated yet. ',
      el('button', { type: 'button', className: 'link', textContent: 'Add an interview date', onclick: () => { $('workspace').close(); openEditor(i); } }),
    ])]),
  ]);
}

// A small "i": the explanation shows on hover, instead of a paragraph.
function infoTip(text) {
  return el('span', { className: 'info-tip', title: text, tabIndex: 0 }, icon('info'));
}

// What to do now for this offer: one sentence and one button.
function nextAction(i) {
  const guide = STEP_GUIDES[i.status] || { tasks: [] };
  const checks = i.steps?.[i.status] || [];
  const warn = attention(i);
  const task = guide.tasks.find((_, n) => !checks[n]);
  const go = (tab) => () => { wsTab = tab; renderWorkspace(); };
  const open = /^https?:/.test(i.url || '') ? () => openWindow(i.url) : null;
  const next = NEXT_STEP[i.status];
  const move = next ? () => saveInternship({ ...i, status: next }) : null;
  const pick = (text, label, run) => ({ text, label, run });
  const showSteps = () => document.querySelector('.all-steps')?.setAttribute('open', '');
  void task;
  if (i.status === 'New') return pick('Decide whether this offer deserves your time.', 'Like it', () => saveInternship({ ...i, status: 'To apply', likedAt: new Date().toISOString() }));
  if (warn === 'Follow up') return pick('No answer yet: send your follow-up email.', 'Write the follow-up', go('messages'));
  if (i.status === 'To apply') return pick(warn === 'Apply, or let go' ? 'Liked a few days ago: apply now, or let it go.' : 'Check your tailored CV and letter, then apply on the site.', 'Open my CV & letter', go('docs'));
  if (i.status === 'Applied') {
    if (warn) return pick('Three weeks without news: update the step.', 'Update the step', () => document.querySelector('#wsHead .status-pop summary')?.click());
    if (!(i.people || []).length) return pick('While you wait: find someone at the company to talk to.', 'Find someone', go('people'));
    return pick(i.followUpDate ? `Wait for their answer. Follow up on ${formatDate(i.followUpDate)} if nothing comes.` : 'Wait for their answer.', '', null);
  }
  if (i.status === 'Interview') {
    if (!i.interviewAt) return pick('Add the date of your interview.', 'Add the date', () => openInterview(i));
    if (warn) return pick('How did it go? Update the step after the interview.', 'Write a thank-you', go('messages'));
    return pick(`Interview on ${formatDate(i.interviewAt.slice(0, 10))} at ${i.interviewAt.slice(11, 16)}: prepare your 3 stories.`, 'How to prepare', showSteps);
  }
  if (i.status === 'Offer') return pick('Check pay, dates and place, then answer in writing.', 'See the checklist', showSteps);
  if (i.status === 'Rejected') return pick('Ask for short feedback: it helps for the next ones.', 'Write it', go('messages'));
  return pick(guide.goal || 'Nothing to do right now.', open ? 'Open the offer' : '', open);
}

function wsSteps(i) {
  const guide = STEP_GUIDES[i.status] || { goal: '', tasks: [] };
  const checks = i.steps?.[i.status] || [];
  const next = NEXT_STEP[i.status];
  const done = guide.tasks.filter((_, n) => checks[n]).length;
  const action = nextAction(i);
  const events = calendarEvents(i);
  return el('div', { className: 'ws-steps' }, [
    el('div', { className: 'next-action' }, [
      el('span', { className: 'next-icon' }, icon(attention(i) ? 'alert' : 'arrowRight')),
      el('div', { className: 'next-text' }, [el('span', { className: 'muted', textContent: 'Next' }), el('b', { textContent: action.text })]),
      action.label && action.run ? el('button', { type: 'button', className: 'primary', onclick: action.run }, action.label) : '',
    ]),
    guide.tasks.length ? el('details', { className: 'all-steps' }, [
      el('summary', {}, [`All steps for "${i.status}"`, el('span', { className: 'count', textContent: `${done}/${guide.tasks.length}` })]),
      el('ol', { className: 'checklist' }, guide.tasks.map((task, n) => el('li', {}, el('label', {}, [
        el('input', {
          type: 'checkbox',
          checked: Boolean(checks[n]),
          onchange: (e) => {
            const list = guide.tasks.map((_, k) => Boolean(checks[k]));
            list[n] = e.target.checked;
            updateInternship(i.id, { steps: { ...(i.steps || {}), [i.status]: list } });
          },
        }),
        el('span', { textContent: task }),
      ])))),
      el('p', { className: 'tip' }, [icon('bulb'), ' ', stepTip(i, roleKeyFor(i, profile))]),
    ]) : '',
    events.length || i.status === 'Interview' ? calendarBlock(i) : '',
    el('div', { className: 'ws-actions' }, [
      /^https?:/.test(i.url || '') ? el('button', { type: 'button', onclick: () => openWindow(i.url) }, ['Open the offer ', icon('external')]) : '',
      el('span', { className: 'spacer' }),
      next ? el('button', { type: 'button', onclick: () => saveInternship({ ...i, status: next }) }, [`Move to "${next}" `, icon('arrowRight')]) : '',
    ]),
  ]);
}

function docLang(i) {
  return wsLang || offerLang(i);
}

function langSwitch(i) {
  const auto = offerLang(i);
  return el('div', { className: 'seg' }, ['fr', 'en'].map((l) => el('button', {
    type: 'button',
    className: docLang(i) === l ? 'on' : '',
    textContent: `${l.toUpperCase()}${l === auto ? ' (offer)' : ''}`,
    onclick: () => { wsLang = l; renderWorkspace(); },
  })));
}

function openDoc(i, type) {
  chrome.windows.create({ url: chrome.runtime.getURL(`doc.html?type=${type}&id=${i.id}&lang=${docLang(i)}`), width: 980, height: 1000, focused: true });
}

function wsDocs(i) {
  const lang = docLang(i);
  const roleIdx = ROLE_KEYS.indexOf(roleKeyFor(i, profile));
  const cov = keywordCoverage(i);
  const docCard = (type, iconName, name, used, edited) => el('div', { className: 'doc-card' }, [
    el('div', { className: 'doc-icon' }, icon(iconName)),
    el('div', { className: 'doc-text' }, [
      el('b', { textContent: name }),
      el('div', { className: 'muted', textContent: used ? `Last saved as PDF: ${used}` : edited ? 'Edited, not saved as PDF yet' : 'Ready, generated from your CV' }),
    ]),
    el('button', { type: 'button', className: 'primary', textContent: 'Open', onclick: () => openDoc(i, type) }),
  ]);
  return el('div', { className: 'ws-docs' }, [
    aiPanel(i, lang),
    el('div', { className: 'ws-row' }, [
      el('p', { className: 'muted', textContent: `Tailored for: ${profile.roles[roleIdx]?.name || 'your profile'}. Same facts as your CV, with the most relevant first.` }),
      langSwitch(i),
    ]),
    docCard('cv', 'file', `CV (${lang.toUpperCase()})`, i.cvUsed, i.docs?.[`cv_${lang}`]),
    docCard('letter', 'pen', `Cover letter (${lang.toUpperCase()})`, i.letterUsed, i.docs?.[`letter_${lang}`]),
    el('div', { className: 'coverage' }, [
      el('b', { textContent: 'Keywords of the offer' }),
      cov.matched.length || cov.missing.length
        ? el('div', { className: 'facts-line' }, [
          ...cov.matched.map((k) => el('span', { className: 'fact early' }, [icon('check'), k])),
          ...cov.missing.map((k) => el('span', { className: 'fact', textContent: k, title: 'In the offer but not in your CV. Add it only if it is true.' })),
        ])
        : el('p', { className: 'muted', textContent: i.description ? 'No usual skill keywords found in this offer.' : 'Load the description (Offer tab) to compare it with your CV.' }),
      cov.missing.length ? el('p', { className: 'muted', textContent: 'Grey words are asked in the offer but missing from your CV: mention them in the letter only if they are true for you.' }) : '',
    ]),
  ]);
}

// One look per message: the four messages always come in this order.
const MESSAGE_KINDS = [
  { cls: 'mk-linkedin', logo: 'linkedin.com', icon: 'user', when: 'Right after you apply' },
  { cls: 'mk-followup', icon: 'clock', when: '10 days after applying, if no answer' },
  { cls: 'mk-thanks', icon: 'heart', when: 'Within 24 hours of an interview' },
  { cls: 'mk-feedback', icon: 'pen', when: 'After a rejection' },
];

function wsMessages(i) {
  const lang = docLang(i);
  return el('div', { className: 'ws-messages' }, [
    el('div', { className: 'ws-row' }, [
      el('p', { className: 'muted', textContent: i.contactName ? `Addressed to ${i.contactName}.` : 'Tip: add the contact’s name in "Edit details" to personalise these.' }),
      langSwitch(i),
    ]),
    ...messageTemplates(i, lang).map((m, n) => {
      const kind = MESSAGE_KINDS[n] || MESSAGE_KINDS[0];
      const btn = el('button', { type: 'button', className: 'small' }, 'Copy');
      btn.onclick = async () => {
        await navigator.clipboard.writeText(m.text);
        btn.replaceChildren(icon('check'), 'Copied');
        setTimeout(() => btn.replaceChildren('Copy'), 1500);
      };
      // E-mails can also open straight in your mail app.
      const lines = m.text.split('\n');
      const subject = /^(Objet|Subject)\s*:/i.test(lines[0]) ? lines[0].replace(/^[^:]+:\s*/, '') : '';
      const mail = subject
        ? el('a', { className: 'button-link small', href: `mailto:${i.contactEmail || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.slice(2).join('\n'))}` }, [icon('mail'), 'Open in Mail'])
        : '';
      const tile = el('div', { className: `message-tile ${kind.cls}` });
      if (kind.logo) {
        const img = el('img', { src: `https://www.google.com/s2/favicons?domain=${kind.logo}&sz=64`, alt: '' });
        img.onerror = () => img.replaceWith(icon(kind.icon));
        tile.append(img);
      } else tile.append(icon(kind.icon));
      return el('div', { className: `message ${kind.cls}` }, [
        el('div', { className: 'message-head' }, [
          tile,
          el('div', { className: 'message-title' }, [el('b', { textContent: m.name.replace(/\s*\(.*\)$/, '') }), el('span', { className: 'muted', textContent: kind.when })]),
          el('div', { className: 'message-actions' }, [mail, btn]),
        ]),
        el('div', { className: 'message-text', textContent: m.text }),
      ]);
    }),
  ]);
}

$('wsTabs').addEventListener('click', (e) => {
  const tab = e.target.closest('button')?.dataset.tab;
  if (!tab) return;
  wsTab = tab;
  renderWorkspace();
  if (tab === 'offer' && !ws.description && !ws.describedAt) loadDescription(ws);
});
$('wsClose').addEventListener('click', () => $('workspace').close());
$('wsDelete').addEventListener('click', () => {
  $('workspace').close();
  removeOffer(ws);
});
$('wsEdit').addEventListener('click', () => {
  $('workspace').close();
  openEditor(ws);
});

function openEditor(item) {
  editing = item;
  $('dlgTitle').textContent = item.id ? 'Edit internship' : 'Add an internship';
  renderFields($('fields'), item);
  $('delete').hidden = !item.id;
  $('descBox').hidden = !item.description;
  $('descBox').open = false;
  $('desc').textContent = item.description || '';
  $('dialog').showModal();
}

$('editForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = readFields($('fields'));
  if (!data.company && !data.title) return alert('Add at least a company or a job title.');
  await saveInternship({ ...editing, ...data });
  $('dialog').close();
});

$('cancel').addEventListener('click', () => $('dialog').close());

$('delete').addEventListener('click', async () => {
  if (!confirm(`Delete "${editing.title || editing.company}"? This can't be undone.`)) return;
  await deleteInternship(editing.id);
  $('dialog').close();
});

$('add').addEventListener('click', () => openEditor({ status: 'To apply' }));
$('search').addEventListener('input', renderTable);
$('sort').addEventListener('change', renderTable);

// ---- Export, backup, restore ----

function download(name, content, type) {
  const a = el('a', { href: URL.createObjectURL(new Blob([content], { type })), download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

$('csv').addEventListener('click', () => download(`internships-${today()}.csv`, toCsv(visible()), 'text/csv;charset=utf-8'));

// A backup file holds everything: offers (with their CVs and letters), your CV, preferences and searches.
$('backup').addEventListener('click', async () => {
  const { searches = [], profile: savedProfile, cvData } = await chrome.storage.local.get(['searches', 'profile', 'cvData']);
  const json = JSON.stringify({ exportedAt: new Date().toISOString(), internships: all, searches, profile: savedProfile, cvData }, null, 2);
  download(`internship-tracker-backup-${today()}.json`, json, 'application/json');
  toast('Backup saved in your Downloads folder.', [], 'check');
});

$('calAll').addEventListener('click', () => {
  const events = all.flatMap(calendarEvents);
  if (!events.length) return toast('No dated offer yet: add an interview date, a follow-up or a deadline first.', [], 'calendar');
  download(`swipely-${today()}.ics`, icsFor(events), 'text/calendar;charset=utf-8');
  toast(`${events.length} date${events.length > 1 ? 's' : ''} saved: open the file to add them to your calendar.`, [], 'calendar');
});

$('restore').addEventListener('click', () => $('restoreFile').click());
// Close the ⋯ menu after a choice or a click elsewhere.
document.addEventListener('click', (e) => {
  const menu = document.querySelector('.more-menu');
  if (menu.open && (!menu.contains(e.target) || e.target.closest('.menu button'))) menu.open = false;
});

$('restoreFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    const incoming = Array.isArray(parsed) ? parsed : parsed.internships;
    if (!Array.isArray(incoming)) throw new Error('not a backup');
    const byId = new Map(all.map((i) => [i.id, i]));
    for (const i of incoming) {
      if (!i || typeof i !== 'object') continue;
      const id = i.id || crypto.randomUUID();
      byId.set(id, { status: 'To apply', ...i, id });
    }
    await saveAll([...byId.values()]);
    const extra = {};
    if (Array.isArray(parsed.searches) && parsed.searches.length) extra.searches = parsed.searches;
    if (parsed.profile) extra.profile = parsed.profile;
    if (parsed.cvData) extra.cvData = parsed.cvData;
    if (Object.keys(extra).length && confirm('This backup also contains your CV, preferences and searches. Restore them too?')) await chrome.storage.local.set(extra);
    toast(`Restored ${incoming.length} offers from the backup.`, [], 'check');
  } catch {
    alert("This file isn't a tracker backup.");
  }
});

// ---- Saved searches ----

// Sites that can only be read inside a real browser window: not checked automatically.
const MANUAL_SITES = [
  ['Station F', 'stationf.co'], ['JobTeaser', 'jobteaser.com'], ['Welcome to the Jungle', 'welcometothejungle.com'],
  ['Microsoft careers', 'microsoft.com'], ['Meta careers', 'metacareers.com'], ['Salesforce careers', 'salesforce.com'],
];

function siteFavicon(host) {
  const labels = host.split('.');
  const site = labels.slice(/^(co|com|ac|gov|org)$/.test(labels.at(-2)) ? -3 : -2).join('.');
  return el('img', { className: 'site-fav', src: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(site)}&sz=64`, alt: '' });
}

function searchStatus(s) {
  if (s.lastError && /slow down|paused|didn.t answer/i.test(s.lastError)) return ['paused', 'Paused for a while, resumes by itself'];
  if (s.lastError) return ['error', s.lastError];
  if (!s.lastRun) return ['waiting', 'Not checked yet'];
  const when = isoDate(new Date(s.lastRun)) === today()
    ? `today ${new Date(s.lastRun).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
    : formatDate(s.lastRun.slice(0, 10));
  return ['ok', `Checked ${when} · ${s.lastFound ?? 0} offers seen · ${s.lastAdded ?? 0} new`];
}

function renderFollow(searches) {
  const followed = new Map(searches.filter((s) => s.follow).map((s) => [s.url, s]));
  const pills = FOLLOW_SUGGESTIONS.map(([name, url]) => {
    const on = followed.has(url);
    return el('button', { type: 'button', className: 'follow-pill' + (on ? ' on' : ''), title: on ? 'Click to stop following' : 'Follow this company', onclick: async () => {
      const list = await loadSearches();
      if (on) await saveSearches(list.filter((s) => s.url !== url));
      else await saveSearches([...list, { id: crypto.randomUUID(), name, url, seen: [], auto: false, follow: true }]);
    } }, [on ? icon('check') : icon('plus'), name]);
  });
  // Companies followed from a pasted link (not in the suggestions).
  const custom = [...followed.values()].filter((s) => !FOLLOW_SUGGESTIONS.some(([, u]) => u === s.url))
    .map((s) => el('button', { type: 'button', className: 'follow-pill on', title: 'Click to stop following', onclick: async () => saveSearches((await loadSearches()).filter((x) => x.id !== s.id)) }, [icon('check'), s.name]));
  $('followList').replaceChildren(...pills, ...custom);
}

async function renderSearches() {
  const [searches, { scanState = {} }] = await Promise.all([loadSearches(), chrome.storage.local.get('scanState')]);
  const running = scanState.running && Date.now() - scanState.startedAt < 10 * 60 * 1000;
  $('scanStatus').textContent = running ? 'Checking your searches in the background…' : '';
  $('scanAll').disabled = running || !searches.length;
  renderFollow(searches);

  // Group the searches by site (all LinkedIn searches together).
  const groups = new Map();
  for (const s of searches) {
    const name = siteName({ source: hostOf(s.url) });
    if (!groups.has(name)) groups.set(name, { name, host: hostOf(s.url), searches: [] });
    groups.get(name).searches.push(s);
  }
  const rank = { error: 0, paused: 1, waiting: 2, ok: 3 };
  const tiles = [...groups.values()].map((g) => {
    const states = g.searches.map(searchStatus);
    const worst = states.reduce((w, st) => (rank[st[0]] < rank[w[0]] ? st : w), ['ok', '']);
    const okCount = states.filter((st) => st[0] === 'ok').length;
    const inTracker = all.filter((i) => siteName(i) === g.name).length;
    const label = { ok: `${okCount}/${g.searches.length} checked`, paused: 'Paused, resumes by itself', waiting: 'Waiting for its first check', error: 'Problem: see below' }[worst[0]];
    return el('button', { type: 'button', className: `site-tile st-${worst[0]}`, title: worst[1], onclick: () => {
      const d = document.querySelector(`.site-group[data-site="${CSS.escape(g.name)}"]`);
      if (d) { d.open = true; d.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    } }, [
      el('div', { className: 'tile-head' }, [siteFavicon(g.host), el('b', { textContent: g.name }), el('span', { className: 'dot' })]),
      el('div', { className: 'tile-num', textContent: String(inTracker) }),
      el('div', { className: 'muted', textContent: `offers in your tracker · ${g.searches.length} search${g.searches.length > 1 ? 'es' : ''}` }),
      el('div', { className: 'tile-state', textContent: label }),
    ]);
  });
  const manual = MANUAL_SITES.map(([name, host]) => el('div', { className: 'site-tile manual', title: 'This site only shows its offers inside a browser window. Use the toolbar button when you’re on its page.' }, [
    el('div', { className: 'tile-head' }, [siteFavicon(host), el('b', { textContent: name })]),
    el('div', { className: 'tile-num', textContent: String(all.filter((i) => (i.source || '').endsWith(host)).length) }),
    el('div', { className: 'muted', textContent: 'offers in your tracker' }),
    el('div', { className: 'tile-state', textContent: 'Toolbar button only' }),
  ]));
  $('siteOverview').replaceChildren(...tiles, ...manual);

  if (!searches.length) {
    $('searchList').replaceChildren(el('p', { className: 'empty-small', textContent: 'No saved search yet.' }));
    return;
  }
  const row = (s) => {
    const [state, text] = searchStatus(s);
    return el('div', { className: 'search-row' }, [
      el('span', { className: `dot st-${state}` }),
      el('div', { className: 'search-info' }, [
        el('a', { href: s.url, target: '_blank', rel: 'noopener', textContent: s.name }),
        el('div', { className: state === 'error' ? 'error-text' : 'muted', textContent: text }),
      ]),
      el('button', { type: 'button', textContent: 'Check now', disabled: running, onclick: () => scan([s.id]) }),
      el('button', { type: 'button', className: 'danger', textContent: 'Remove', onclick: () => removeSearch(s) }),
    ]);
  };
  const open = new Set([...document.querySelectorAll('.site-group[open]')].map((d) => d.dataset.site));
  $('searchList').replaceChildren(...[...groups.values()].map((g) => {
    const d = el('details', { className: 'site-group', open: open.has(g.name) }, [
      el('summary', {}, [siteFavicon(g.host), el('b', { textContent: g.name }), el('span', { className: 'muted', textContent: `${g.searches.length} search${g.searches.length > 1 ? 'es' : ''}` })]),
      ...g.searches.map(row),
    ]);
    d.dataset.site = g.name;
    return d;
  }));
}

function scan(ids) {
  chrome.runtime.sendMessage({ type: 'scan', ids });
}

async function removeSearch(s) {
  if (!confirm(`Stop checking "${s.name}"? Offers it already found stay in your tracker.`)) return;
  await saveSearches((await loadSearches()).filter((x) => x.id !== s.id));
}

$('searchesBtn').addEventListener('click', () => {
  renderSearches();
  $('searchDialog').showModal();
});
$('closeSearches').addEventListener('click', () => $('searchDialog').close());
$('scanAll').addEventListener('click', () => scan());

$('followForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  let u;
  try {
    u = new URL($('followUrl').value.trim());
  } catch {
    return toast('Paste the full address of the job board, starting with https://', [], 'alert');
  }
  const token = u.pathname.split('/').filter(Boolean)[0] || u.searchParams.get('for');
  if (!/(lever\.co|greenhouse\.io|ashbyhq\.com)$/.test(u.hostname) || !token) {
    return toast('This works with Lever, Greenhouse and Ashby job boards (the link ends with the company’s name).', [], 'alert');
  }
  const name = token.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  await saveSearches([...(await loadSearches()), { id: crypto.randomUUID(), name, url: u.origin + u.pathname.split('/').slice(0, 2).join('/'), seen: [], auto: false, follow: true }]);
  e.target.reset();
  toast(`You follow ${name}. Its offers that fit you will appear in Discover.`, [], 'check');
});

$('searchForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  let url;
  try {
    url = new URL($('sUrl').value.trim());
    if (!/^https?:$/.test(url.protocol)) throw new Error();
  } catch {
    return alert('Paste the full address of the page, starting with https://');
  }
  // Chrome asks you once to let the tracker read this site.
  const origin = isLinkedin(url.href) ? 'https://www.linkedin.com/*' : `${url.origin}/*`;
  if (!(await chrome.permissions.request({ origins: [origin] }))) {
    return alert("Without this permission the tracker can't check that site.");
  }
  const search = { id: crypto.randomUUID(), name: $('sName').value.trim() || searchName(url.href), url: url.href, seen: [] };
  await saveSearches([...(await loadSearches()), search]);
  e.target.reset();
  scan([search.id]);
});

// Refresh when the popup or the daily check changes something while this page is open.
chrome.storage.onChanged.addListener((changes) => {
  if (changes.cvData) useSavedCv().then(() => cvBanner());
  // Background updates come in bursts: redraw once, a moment after the last one.
  if (changes.internships || changes.profile) {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => refresh().then(() => $('workspace').open && renderWorkspace()), 350);
  }
  if ((changes.searches || changes.scanState) && $('searchDialog').open) renderSearches();
});

// ---- Match profile ----

// ---- Preferences: organised in tabs, words as removable tags ----

let pDraft = null; // the preferences being edited (saved only when you press Save)
let pTab = 'roles';
let pFromCv = false; // the draft was just filled in from your CV
const PROFILE_TABS = [
  ['roles', 'briefcase', 'Roles'],
  ['places', 'globe', 'Places'],
  ['words', 'sliders', 'Words'],
  ['scoring', 'sparkles', 'Score & learning'],
  ['logos', 'file', 'Logos'],
];

// A list of words as removable tags: type a word, press Enter or comma to add it.
function tagField(get, set, { tone = '', placeholder = 'Add a word, then Enter' } = {}) {
  const box = el('div', { className: `tags ${tone}` });
  const input = el('input', { type: 'text', placeholder, className: 'tag-input', autocomplete: 'off', spellcheck: false });
  const draw = () => {
    box.replaceChildren(...words(get()).map((w) => el('span', { className: 'tag-chip' }, [
      w,
      el('button', { type: 'button', title: `Remove “${w}”`, ariaLabel: `Remove ${w}`, onclick: () => { set(words(get()).filter((x) => x !== w).join(', ')); draw(); } }, icon('x')),
    ])), input);
  };
  const add = () => {
    const fresh = input.value.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);
    if (!fresh.length) return;
    set([...new Set([...words(get()), ...fresh])].join(', '));
    input.value = '';
    draw();
    box.querySelector('.tag-input').focus();
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); }
    else if (e.key === 'Backspace' && !input.value && words(get()).length) { set(words(get()).slice(0, -1).join(', ')); draw(); box.querySelector('.tag-input').focus(); }
  });
  input.addEventListener('blur', add);
  box.addEventListener('click', () => box.querySelector('.tag-input')?.focus());
  draw();
  return box;
}

const pCheck = (label, hint, checked, onchange) => el('label', { className: 'switch-row' }, [
  el('span', { className: 'switch-text' }, [el('b', { textContent: label }), hint ? el('span', { className: 'muted', textContent: hint }) : '']),
  el('input', { type: 'checkbox', className: 'switch', checked, onchange: (e) => onchange(e.target.checked) }),
]);
const pSection = (title, hint, ...children) => el('section', { className: 'p-section' }, [el('h3', {}, [title, hint ? infoTip(hint) : '']), ...children]);

const profileTabs = {
  roles: () => [
    el('p', { className: 'muted p-lead' }, ['The kinds of jobs you want.', infoTip('Offers whose title contains one of these words score highest. The first 6 words of each family are used for the LinkedIn searches.')]),
    ...pDraft.roles.map((r) => pSection(r.name, '', tagField(() => r.keywords, (v) => (r.keywords = v), { placeholder: 'Add a job title word' }))),
  ],
  places: () => [
    pSection('Where you want to work', 'An offer elsewhere gets fewer points.', tagField(() => pDraft.places, (v) => (pDraft.places = v), { placeholder: 'Add a city, a country or a region' })),
    pSection('Regions to search', 'Used for LinkedIn and for the company sites (Google, Amazon, Nvidia…), posted in the last 7 days.', tagField(() => pDraft.regions, (v) => (pDraft.regions = v), { placeholder: 'e.g. France, United Kingdom' })),
    pSection('What kind of offers', '',
      pCheck('Internships', 'Stages and internships', pDraft.levels.internship, (v) => (pDraft.levels.internship = v)),
      pCheck('First jobs', 'Entry level, graduate programs', pDraft.levels.entry, (v) => (pDraft.levels.entry = v))),
  ],
  words: () => [
    pSection('Bonus words', 'In the title, the company or the description: each one adds points.', tagField(() => pDraft.boost, (v) => (pDraft.boost = v), { tone: 'good', placeholder: 'Add a bonus word' })),
    pSection('Words to avoid', 'In the title: each one lowers the score.', tagField(() => pDraft.avoid, (v) => (pDraft.avoid = v), { tone: 'bad', placeholder: 'Add a word to avoid' })),
  ],
  scoring: () => {
    const value = el('b', { className: 'range-value', textContent: `${pDraft.minScore}%` });
    const range = el('input', { type: 'range', min: 0, max: 100, step: 5, value: pDraft.minScore, className: 'range', oninput: (e) => { pDraft.minScore = Number(e.target.value); value.textContent = `${pDraft.minScore}%`; } });
    return [
      pSection('Learning', 'Swipely compares what you like and pass on, and adjusts the score by up to 20 points.',
        pCheck('Learn from my likes and passes', 'The score adjusts itself', pDraft.learn !== false, (v) => (pDraft.learn = v)),
        learnedPanel(profile)),
      pSection('Weak matches', 'Offers below this score can be left out of the new offers.',
        pCheck('Skip new offers scoring under', '', pDraft.hideWeak, (v) => (pDraft.hideWeak = v)),
        el('div', { className: 'range-row' }, [range, value])),
    ];
  },
  logos: () => [
    pSection('Company logos', 'Optional. A free logo.dev key gives the exact logo of each company.',
      el('ol', { className: 'steps-mini' }, ['Sign up at logo.dev (free, no card)', 'Open “API keys”', 'Copy the key that starts with pk_ and paste it here'].map((t) => el('li', { textContent: t }))),
      el('input', { type: 'text', className: 'key-input', value: pDraft.logoDevKey || '', placeholder: 'pk_…', autocomplete: 'off', spellcheck: false, oninput: (e) => (pDraft.logoDevKey = e.target.value.trim()) })),
  ],
};

function renderProfile(p) {
  if (p) {
    const { taste, ...rest } = p;
    pDraft = JSON.parse(JSON.stringify(rest));
    pDraft.levels ||= { internship: true, entry: true };
  }
  $('profileTabs').replaceChildren(...PROFILE_TABS.map(([key, iconName, label]) => el('button', {
    type: 'button',
    className: pTab === key ? 'on' : '',
    onclick: () => { pTab = key; renderProfile(); },
  }, [icon(iconName), label])));
  $('profileFields').replaceChildren(
    pFromCv ? el('div', { className: 'from-cv' }, [icon('sparkles'), el('span', { textContent: 'Filled in from your CV. Check each tab, then press Save.' })]) : '',
    ...profileTabs[pTab](),
  );
}

function learnedPanel(p) {
  const t = p.taste;
  if (!t?.ready) {
    return el('p', { className: 'muted learned-empty', textContent: p.learn === false ? 'Learning is turned off.' : 'Like at least 5 offers and pass on at least 5, and Swipely starts learning your taste.' });
  }
  const chip = (x, good) => el('span', { className: 'fact ' + (good ? 'early' : ''), title: `${x.liked} liked · ${x.passed} passed` }, `${tasteLabel(x.key)} · ${x.liked}↑ ${x.passed}↓`);
  const likes = t.top.filter((x) => x.w > 0.2).slice(0, 6);
  const passes = t.top.filter((x) => x.w < -0.2).slice(0, 6);
  return el('div', { className: 'learned' }, [
    el('p', { className: 'muted', textContent: `What Swipely learned from your ${t.nLiked} likes and ${t.nPassed} passes:` }),
    likes.length ? el('div', { className: 'learned-row' }, [el('b', { textContent: 'You tend to like' }), el('div', { className: 'facts-line' }, likes.map((x) => chip(x, true)))]) : '',
    passes.length ? el('div', { className: 'learned-row' }, [el('b', { textContent: 'You tend to pass on' }), el('div', { className: 'facts-line' }, passes.map((x) => chip(x, false)))]) : '',
  ]);
}

// ---- Preferences built from your CV ----
// Your job titles become a role family, your skills become bonus words, your city is added to your places,
// the role families your CV speaks to are kept, and words to avoid that describe your own job are removed.
const FAMILY_TAGS = ['founder', 'product', 'bd', 'strategy', 'vc']; // same order as DEFAULT_PROFILE.roles

function profileFromCv(cv, base = DEFAULT_PROFILE) {
  const low = (x) => String(x || '').toLowerCase().replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
  const uniq = (list) => [...new Set(list.map(low).filter((w) => w.length > 1))];
  const titles = uniq((cv.experience || []).flatMap((e) => [e.role?.en, e.role?.fr]).map((t) => roleCore(t || '')));
  const skills = uniq((cv.skills || []).filter((g) => g.key !== 'languages' && !/lang/i.test(g.label?.en || '')).flatMap((g) => g.items?.en || []));
  const fields = uniq((cv.experience || []).flatMap((e) => String(e.what?.en || '').split(/[,·&/]| and /)).filter((w) => w.split(/\s+/).length <= 3));
  // Which families your CV speaks to: tags of its lines, or your titles matching a family's words.
  const text = norm([...titles, ...(cv.experience || []).flatMap((e) => (e.bullets || []).map((b) => b.en || b.fr))].join(' · '));
  const tagCount = Object.fromEntries(FAMILY_TAGS.map((t) => [t, 0]));
  (cv.experience || []).forEach((e) => (e.bullets || []).forEach((b) => (b.tags || inferTags(`${b.en} ${b.fr}`)).forEach((t) => t in tagCount && tagCount[t]++)));
  const families = base.roles.filter((r, n) => tagCount[FAMILY_TAGS[n]] >= 2 || words(r.keywords).some((k) => text.includes(norm(k))));
  // Words to avoid that describe your own work (your titles, skills, CV lines) are dropped; seniority words always stay.
  const cvText = ` ${norm([...titles, ...skills, text].join(' · ')).replace(/[^a-z0-9+#]+/g, ' ')} `;
  const keepAvoid = (w) => /^(senior|sr|lead|head of|principal|director|directeur|directrice|vp|vice president|expert|manager ii)$/.test(norm(w))
    || !cvText.includes(` ${norm(w).replace(/[^a-z0-9+#]+/g, ' ').trim()} `);
  const city = (cv.contact?.city || '').replace(/^\d{4,5}\s*/, '').trim().toLowerCase();
  return {
    ...base,
    roles: [
      ...(titles.length ? [{ name: 'From your CV', keywords: titles.join(', ') }] : []),
      ...families,
    ],
    boost: [...new Set([...skills, ...fields].concat(skills.length + fields.length >= 5 ? [] : words(base.boost)))].slice(0, 40).join(', '),
    avoid: words(base.avoid).filter(keepAvoid).join(', '),
    places: city && !words(base.places).map(norm).includes(norm(city)) ? `${city}, ${base.places}` : base.places,
  };
}

// Opens Preferences filled in from your CV, to check before saving.
function preferencesFromCv() {
  pTab = 'roles';
  pFromCv = true;
  renderProfile(profileFromCv(CV_DATA, profile));
  $('profileDialog').showModal();
}

function readProfile() {
  return {
    ...pDraft,
    minScore: Math.max(0, Math.min(100, Number(pDraft.minScore) || 0)),
    logoDevKey: (pDraft.logoDevKey || '').trim(),
  };
}

$('profileBtn').addEventListener('click', () => {
  pTab = 'roles';
  pFromCv = false;
  renderProfile(profile);
  $('profileDialog').showModal();
});
$('closeProfile').addEventListener('click', () => $('profileDialog').close());
$('resetProfile').addEventListener('click', () => {
  if (!confirm('Rebuild your preferences from your CV? Your changes here will be lost.')) return;
  pFromCv = true;
  renderProfile(profileFromCv(CV_DATA, DEFAULT_PROFILE));
});

// Saving applies your preferences to every search: the searches are rebuilt from them (history kept), and
// everything found by any site (LinkedIn, big tech, VC boards, followed startups) is checked against them.
$('profileForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const p = readProfile();
  await saveProfile(p);
  const current = await loadSearches();
  const byUrl = new Map(current.map((s) => [s.url, s]));
  const auto = profileSearches(p).map((w) => ({ id: crypto.randomUUID(), seen: [], ...byUrl.get(w.url), ...w }));
  await saveSearches([...current.filter((s) => !s.auto), ...auto]);
  chrome.runtime.sendMessage({ type: 'scanDue' });
  $('profileDialog').close();
  toast('Preferences saved. They apply to all your searches: LinkedIn, company sites and the startups you follow.', [], 'check');
});

// tracker.html#New opens on that filter (used by the "new offers" notification).
const fromHash = decodeURIComponent(location.hash.slice(1));
if (STATUSES.includes(fromHash) || fromHash === 'Needs attention') filter = fromHash;

try {
  const saved = localStorage.getItem('sortBy');
  if (saved && [...$('sort').options].some((o) => o.value === saved)) $('sort').value = saved;
} catch {}

// People found on the web for your liked offers (people-found.js, optional): added once to each offer.
async function addFoundPeople() {
  if (typeof PEOPLE_FOUND === 'undefined') return;
  const list = await loadAll();
  let added = 0;
  for (const item of list) {
    const found = PEOPLE_FOUND[item.id];
    if (!found || item.peopleFoundAt) continue;
    const known = new Set((item.people || []).map((p) => p.url));
    const fresh = found.filter((p) => !known.has(p.url)).map((p) => ({ id: crypto.randomUUID(), ...p, suggested: true, status: 'To contact', addedAt: new Date().toISOString() }));
    item.people = [...(item.people || []), ...fresh];
    item.peopleFoundAt = new Date().toISOString(); // once: people you remove don't come back
    added += fresh.length;
  }
  if (!added) return;
  await saveAll(list);
  toast(`${added} people to contact were added to your liked offers (People tab).`, [], 'user');
}

applyUpdateIfAny().then(async (updating) => {
  if (updating) return;
  await useSavedCv();
  await addFoundPeople();
  // First time (no CV yet): a welcome window, once.
  let welcomed = false;
  try {
    welcomed = localStorage.getItem('welcomed') === '1';
  } catch {}
  if (!cvIsSet() && !welcomed) {
    try {
      localStorage.setItem('welcomed', '1');
    } catch {}
    $('welcomeDialog').showModal();
  }
  const archived = await archiveStale();
  // Letters left half-written when the tracker was closed get written again.
  for (const i of await loadAll()) {
    if (i.aiLetter === 'writing') await updateInternship(i.id, { aiLetter: '' });
    // Offers moved back before "Applied" kept their application dates (fixed): clear them.
    if (['New', 'To apply', 'Not interested'].includes(i.status) && (i.appliedDate || i.followUpDate)) await updateInternship(i.id, { appliedDate: '', followUpDate: '' });
  }
  await refresh();
  if (archived) toast(`${archived} offer${archived > 1 ? 's' : ''} published more than 4 weeks ago moved to the archive.`, [['See them', () => { filter = 'Archived'; setView('list'); render(); }]], 'clock');
  queueLetters();
});

$('welcomeLater').addEventListener('click', () => $('welcomeDialog').close());
$('welcomeStart').addEventListener('click', async () => {
  $('welcomeDialog').close();
  await openCvEditor();
  openCvImport();
});
