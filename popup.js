const $ = (id) => document.getElementById(id);
let current = {};
let found = []; // every offer listed on the page (search results…)

async function inject(tabId, file) {
  try {
    const files = file === 'scan.js' ? ['scan-core.js', 'scan.js'] : [file];
    const [res] = await chrome.scripting.executeScript({ target: { tabId }, files });
    return res?.result;
  } catch (e) {
    console.warn(`Could not read this page (${file})`, e);
    return null;
  }
}

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let page = { url: tab?.url || '', title: tab?.title || '' };
  if (tab?.id && /^https?:/.test(tab.url || '')) {
    const [single, list] = await Promise.all([inject(tab.id, 'extract.js'), inject(tab.id, 'scan.js')]);
    if (single) page = single;
    found = list?.offers || [];
  }

  const url = page.url ? normalizeUrl(page.url) : '';
  const existing = url && (await loadAll()).find((i) => i.url === url);
  if (existing) {
    current = existing;
    $('banner').textContent = `Already in your tracker (status: ${existing.status}). Change anything and press Update.`;
    $('banner').hidden = false;
    $('save').textContent = 'Update';
  } else {
    const { selection, ...rest } = page;
    current = { ...rest, url, status: 'To apply', notes: selection || '' };
  }
  renderFields($('fields'), current, { collapseMore: true });
  $('desc').textContent = current.description || '';
  $('descBox').hidden = !current.description;
  $('fields').querySelector(current.title ? '[name=company]' : '[name=title]').focus();

  if (found.length >= 2) {
    $('listBanner').textContent = `This page lists ${found.length} offers. Add several at once →`;
    $('listBanner').hidden = false;
  }
}

function showMsg(text, isError = false) {
  $('msg').textContent = text;
  $('msg').className = 'msg' + (isError ? ' error' : '');
}

$('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = readFields($('fields'));
  if (!data.company && !data.title) return showMsg('Add at least a company or a job title.', true);
  const wasSaved = Boolean(current.id);
  current = await saveInternship({ ...current, ...data });
  showMsg(wasSaved ? 'Updated.' : 'Saved to your tracker.');
  setTimeout(() => window.close(), 900);
});

// ---- Several offers from a results page ----

async function showList() {
  const [list, profile] = await Promise.all([loadAll(), loadProfile()]);
  const saved = new Set(list.map((i) => i.url));
  found.forEach((o) => (o.match = matchScore(o, profile)));
  found.sort((a, b) => b.match.score - a.match.score);
  $('form').hidden = $('banner').hidden = $('listBanner').hidden = true;
  $('list').hidden = false;
  $('items').replaceChildren(...found.map((o, idx) => {
    const already = saved.has(normalizeUrl(o.url));
    const details = [o.company, o.location, normContract(o.contract || o.title), o.postedAt && postedLabel(o.postedAt), o.early && 'early applicant', already ? 'already saved' : ''].filter(Boolean).join(' · ');
    const level = o.match.score >= 60 ? 'high' : o.match.score >= profile.minScore ? 'mid' : 'low';
    return el('label', { className: 'item' + (already ? ' saved' : '') }, [
      el('input', { type: 'checkbox', value: String(idx), disabled: already, onchange: updateCount }),
      itemLogo(o, profile),
      el('span', { className: 'item-text' }, [el('b', { textContent: o.title }), el('small', { textContent: details })]),
      el('span', { className: `score ${level}`, textContent: String(o.match.score), title: o.match.why.join('\n') }),
    ]);
  }));
  updateCount();
}

function itemLogo(o, profile) {
  const box = el('span', { className: 'item-logo' });
  const letter = () => el('span', { className: 'letter', textContent: (o.company || o.title || '?')[0].toUpperCase(), style: '--h:220' });
  const urls = logoCandidates({ ...o, logoFrom: 'card' }, profile);
  if (!urls.length) return box.appendChild(letter()) && box;
  const img = el('img', { alt: '', referrerPolicy: 'no-referrer' });
  let n = 0;
  img.onerror = () => (++n < urls.length ? (img.src = urls[n]) : img.replaceWith(letter()));
  img.src = urls[0];
  box.append(img);
  return box;
}

function boxes() {
  return [...$('items').querySelectorAll('input:not(:disabled)')];
}

function updateCount() {
  const n = boxes().filter((b) => b.checked).length;
  $('addSelected').textContent = n ? `Add ${n} to tracker` : 'Add';
  $('addSelected').disabled = !n;
  $('checkAll').checked = n > 0 && n === boxes().length;
}

$('listBanner').addEventListener('click', showList);

$('back').addEventListener('click', () => {
  $('list').hidden = true;
  $('form').hidden = $('listBanner').hidden = false;
  $('banner').hidden = !current.id;
});

$('checkAll').addEventListener('change', (e) => {
  boxes().forEach((b) => (b.checked = e.target.checked));
  updateCount();
});

$('addSelected').addEventListener('click', async () => {
  const picked = boxes().filter((b) => b.checked).map((b) => found[Number(b.value)]);
  const added = await addMany(picked, { status: 'To apply' });
  $('listMsg').textContent = `Added ${added} to your tracker.`;
  setTimeout(() => window.close(), 1000);
});

$('open').addEventListener('click', () => chrome.tabs.create({ url: chrome.runtime.getURL('tracker.html') }));

applyUpdateIfAny().then((updating) => updating || init());
