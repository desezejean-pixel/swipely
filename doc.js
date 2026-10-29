// Tailored CV or cover letter for one offer: doc.html?type=cv|letter&id=<offer id>[&lang=fr|en]
// doc.html?type=cv&id=preview shows your master CV as it is, without an offer.
const $ = (id) => document.getElementById(id);
drawIcons();
const params = new URLSearchParams(location.search);
const type = params.get('type') === 'letter' ? 'letter' : 'cv';
const preview = params.get('id') === 'preview';
let item = null;
let lang = 'en';
let saveTimer = null;
let beforeAi = '';

const draftKey = () => `${type}_${lang}`;

async function render() {
  const profile = await loadProfile();
  const drafts = preview ? {} : item.docs || {};
  $('page').className = `sheet ${type}`;
  if (preview) {
    const cv = tailoredCv(item, lang, profile);
    $('page').innerHTML = cvHtml({ ...cv, headline: '', profile: '' });
  } else {
    $('page').innerHTML = drafts[draftKey()] || (type === 'cv' ? cvHtml(tailoredCv(item, lang, profile)) : letterHtml(coverLetter(item, lang, profile), item));
  }
  $('page').contentEditable = String(!preview);
  $('langFr').classList.toggle('on', lang === 'fr');
  $('langEn').classList.toggle('on', lang === 'en');
  $('reset').hidden = preview;
  $('reset').disabled = !drafts[draftKey()];
  document.title = preview ? 'My CV – preview' : `${type === 'cv' ? 'CV' : 'Cover letter'} – ${item.company || item.title}`;
  $('docKind').textContent = preview ? 'My CV (preview)' : type === 'cv' ? 'Tailored CV' : 'Cover letter';
  $('docFor').textContent = preview ? 'Your master CV, before tailoring to an offer' : `${cleanOfferTitle(item.title)}${item.company ? ` · ${item.company}` : ''}`;
  if (preview) status('This is your master CV. Change it in the tracker under "My CV".');
  else if (drafts[draftKey()] && type === 'letter' && item.aiLetter === 'done') status('Written for this offer by Chrome’s AI. Read it carefully and fix anything that isn’t true.');
  $('undoAi').hidden = true;
  setupAi();
}

async function saveDraft() {
  if (preview) return;
  item.docs = { ...(item.docs || {}), [draftKey()]: $('page').innerHTML };
  await updateInternship(item.id, { docs: item.docs });
  $('reset').disabled = false;
  status('Changes saved.');
}

function status(text) {
  $('status').textContent = text;
}

$('page').addEventListener('input', () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveDraft, 600);
});

$('langFr').addEventListener('click', () => { lang = 'fr'; render(); });
$('langEn').addEventListener('click', () => { lang = 'en'; render(); });

$('reset').addEventListener('click', async () => {
  if (!confirm('Go back to the generated version? Your edits for this language will be lost.')) return;
  const docs = { ...(item.docs || {}) };
  delete docs[draftKey()];
  item.docs = docs;
  await updateInternship(item.id, { docs, ...(type === 'letter' ? { aiLetter: '' } : {}) });
  render();
  status('Back to the generated version.');
});

$('print').addEventListener('click', async () => {
  if (!preview) {
    const label = `${type === 'cv' ? 'Tailored CV' : 'Cover letter'} (${lang.toUpperCase()}), ${formatDate(today())}`;
    await updateInternship(item.id, { [type === 'cv' ? 'cvUsed' : 'letterUsed']: label });
  }
  status('In the print window, choose "Save as PDF" as the destination.');
  window.print();
});

// ---- Chrome's built-in AI ----

async function setupAi() {
  $('ai').hidden = preview || type !== 'letter' || (await chromeAiStatus(lang)) === 'unavailable';
}

$('ai').addEventListener('click', async () => {
  const body = $('page').querySelector('#body');
  if (!body) return;
  $('ai').disabled = true;
  status('Starting Chrome’s AI…');
  try {
    const paragraphs = await aiWriteLetter(item, lang, body.innerText, status);
    beforeAi = $('page').innerHTML;
    body.innerHTML = paragraphs.map((p) => `<p>${esc(p)}</p>`).join('');
    $('undoAi').hidden = false;
    await saveDraft();
    await updateInternship(item.id, { aiLetter: 'done' });
    status('Done. Read it carefully and fix anything that isn’t true.');
  } catch (e) {
    status(`Chrome’s AI couldn’t write this one: ${e.message || e}`);
  } finally {
    $('ai').disabled = false;
  }
});

$('undoAi').addEventListener('click', async () => {
  if (!beforeAi) return;
  $('page').innerHTML = beforeAi;
  $('undoAi').hidden = true;
  await saveDraft();
});

(async () => {
  await useSavedCv();
  item = preview ? { id: 'preview', title: '', description: '' } : (await loadAll()).find((i) => i.id === params.get('id'));
  if (!item) {
    document.body.textContent = 'This offer is no longer in your tracker.';
    return;
  }
  lang = params.get('lang') || (preview ? 'en' : offerLang(item));
  render();
})();
