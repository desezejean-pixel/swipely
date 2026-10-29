// "My CV": edit your master CV (English + French). Every tailored CV and cover letter uses it.
let cvDraft = null;
let cvTab = 'contact';

const CV_TABS = [
  ['contact', 'user', 'Contact'],
  ['summary', 'pen', 'Summary'],
  ['experience', 'briefcase', 'Experience'],
  ['education', 'graduation', 'Education'],
  ['skills', 'award', 'Skills'],
];
const ROLE_LABELS = { founder: 'Founder Associate / Chief of Staff', product: 'Product', bd: 'Business development / Sales', strategy: 'Strategy / Innovation', vc: 'Venture capital / Investment' };

function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}
function setPath(obj, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  const target = keys.reduce((o, k) => (o[k] ??= {}), obj);
  target[last] = value;
}

function cvInput(path, label, { area = false, rows = 2, placeholder = '' } = {}) {
  const input = area ? el('textarea', { rows }) : el('input', { type: 'text', placeholder });
  input.value = getPath(cvDraft, path) ?? '';
  input.addEventListener('input', () => setPath(cvDraft, path, input.value));
  return el('label', { className: 'field' }, [el('span', { textContent: label }), input]);
}

function pair(path, label, opts) {
  return el('div', { className: 'pair' }, [cvInput(`${path}.en`, `${label} (EN)`, opts), cvInput(`${path}.fr`, `${label} (FR)`, opts)]);
}

// Bullet points: one row per point, English and French side by side.
function bulletsEditor(listPath) {
  if (!getPath(cvDraft, listPath)) setPath(cvDraft, listPath, []);
  const list = getPath(cvDraft, listPath);
  const rows = list.map((b, n) => {
    const box = (lang) => {
      const t = el('textarea', { rows: 3, placeholder: lang === 'en' ? 'In English' : 'En français' });
      t.value = b[lang] || '';
      t.addEventListener('input', () => {
        const changed = b[lang] !== t.value.trim();
        b[lang] = t.value.trim();
        if (changed) b.tags = inferTags(`${b.en || ''} ${b.fr || ''}`);
      });
      return t;
    };
    return el('div', { className: 'bullet-row' }, [
      el('span', { className: 'bullet-dot', textContent: '•' }),
      box('en'),
      box('fr'),
      el('button', { type: 'button', className: 'bullet-del', title: 'Remove this point', onclick: () => { list.splice(n, 1); renderCvEditor(); } }, icon('x')),
    ]);
  });
  return el('div', { className: 'bullets' }, [
    el('div', { className: 'bullet-head' }, [el('span'), el('span', { textContent: 'Bullet points (EN)' }), el('span', { textContent: 'Bullet points (FR)' }), el('span')]),
    ...rows,
    el('button', { type: 'button', className: 'link', textContent: '+ Add a point', onclick: () => { list.push({ en: '', fr: '', tags: [] }); renderCvEditor(); } }),
  ]);
}

function entryTools(listPath, n) {
  const move = (d) => {
    const list = getPath(cvDraft, listPath);
    const [x] = list.splice(n, 1);
    list.splice(Math.max(0, Math.min(list.length, n + d)), 0, x);
    renderCvEditor();
  };
  return el('div', { className: 'entry-tools' }, [
    el('button', { type: 'button', title: 'Move up', disabled: n === 0, onclick: () => move(-1) }, icon('arrowUp')),
    el('button', { type: 'button', title: 'Move down', disabled: n === getPath(cvDraft, listPath).length - 1, onclick: () => move(1) }, icon('arrowDown')),
    el('button', { type: 'button', className: 'danger', textContent: 'Remove', onclick: () => {
      if (!confirm('Remove this entry from your CV?')) return;
      getPath(cvDraft, listPath).splice(n, 1);
      renderCvEditor();
    } }),
  ]);
}

const cvTabs = {
  contact: () => [
    el('div', { className: 'pair' }, [cvInput('name', 'Full name'), cvInput('contact.city', 'City / postcode')]),
    el('div', { className: 'pair' }, [cvInput('contact.email', 'Email'), cvInput('contact.phone', 'Phone')]),
    cvInput('contact.linkedin', 'LinkedIn link', { placeholder: 'https://www.linkedin.com/in/…' }),
    pair('availability', 'Availability line', { placeholder: 'e.g. available from June 2027' }),
  ],
  summary: () => [
    el('p', { className: 'muted', textContent: 'The short profile at the top of your CV. The tracker picks the one that fits each offer.' }),
    ...Object.entries(ROLE_LABELS).map(([key, label]) => el('div', { className: 'cv-card' }, [el('b', { textContent: label }), pair(`profile.${key}`, 'Summary', { area: true, rows: 3 })])),
  ],
  experience: () => [
    ...cvDraft.experience.map((_, n) => el('div', { className: 'cv-card' }, [
      el('div', { className: 'cv-card-head' }, [el('b', { textContent: cvDraft.experience[n].org || 'New experience' }), entryTools('experience', n)]),
      el('div', { className: 'pair' }, [cvInput(`experience.${n}.org`, 'Company (as on the CV)'), cvInput(`experience.${n}.short`, 'Company (in sentences)', { placeholder: 'e.g. L’Oréal' })]),
      pair(`experience.${n}.what`, 'Team / what the company does'),
      el('div', { className: 'pair' }, [cvInput(`experience.${n}.place`, 'Place'), el('span')]),
      pair(`experience.${n}.role`, 'Your role'),
      pair(`experience.${n}.dates`, 'Dates'),
      bulletsEditor(`experience.${n}.bullets`),
    ])),
    el('button', { type: 'button', className: 'add-entry', textContent: '+ Add an experience', onclick: () => {
      cvDraft.experience.unshift({ org: '', short: '', what: { en: '', fr: '' }, place: '', role: { en: '', fr: '' }, dates: { en: '', fr: '' }, bullets: [] });
      renderCvEditor();
    } }),
    el('h3', { textContent: 'Other experience (short lines)' }),
    ...cvDraft.other.map((_, n) => el('div', { className: 'cv-card' }, [
      el('div', { className: 'cv-card-head' }, [el('b', { textContent: cvDraft.other[n].org || 'New line' }), entryTools('other', n)]),
      el('div', { className: 'pair' }, [cvInput(`other.${n}.org`, 'Organisation'), cvInput(`other.${n}.place`, 'Place')]),
      pair(`other.${n}.role`, 'Role'),
      pair(`other.${n}.dates`, 'Dates'),
    ])),
    el('button', { type: 'button', className: 'add-entry', textContent: '+ Add an other experience', onclick: () => {
      cvDraft.other.push({ org: '', place: '', role: { en: '', fr: '' }, dates: { en: '', fr: '' } });
      renderCvEditor();
    } }),
  ],
  education: () => [
    ...cvDraft.education.map((_, n) => el('div', { className: 'cv-card' }, [
      el('div', { className: 'cv-card-head' }, [el('b', { textContent: cvDraft.education[n].org || 'New school' }), entryTools('education', n)]),
      el('div', { className: 'pair' }, [cvInput(`education.${n}.org`, 'School'), cvInput(`education.${n}.place`, 'Place')]),
      pair(`education.${n}.degree`, 'Degree'),
      pair(`education.${n}.dates`, 'Dates'),
      bulletsEditor(`education.${n}.bullets`),
    ])),
    el('button', { type: 'button', className: 'add-entry', textContent: '+ Add a school', onclick: () => {
      cvDraft.education.unshift({ org: '', place: '', degree: { en: '', fr: '' }, dates: { en: '', fr: '' }, bullets: [] });
      renderCvEditor();
    } }),
  ],
  skills: () => [
    el('p', { className: 'muted', textContent: 'Separate skills with commas. Skills that an offer asks for are shown in bold on its CV.' }),
    ...cvDraft.skills.map((g, n) => {
      const items = (lang) => {
        const t = el('input', { type: 'text' });
        t.value = (g.items[lang] || []).join(', ');
        t.addEventListener('input', () => (g.items[lang] = t.value.split(',').map((x) => x.trim()).filter(Boolean)));
        return el('label', { className: 'field' }, [el('span', { textContent: `Skills (${lang.toUpperCase()})` }), t]);
      };
      return el('div', { className: 'cv-card' }, [
        el('div', { className: 'cv-card-head' }, [el('b', { textContent: g.label.en || 'New group' }), entryTools('skills', n)]),
        pair(`skills.${n}.label`, 'Group name'),
        el('div', { className: 'pair' }, [items('en'), items('fr')]),
      ]);
    }),
    el('button', { type: 'button', className: 'add-entry', textContent: '+ Add a skills group', onclick: () => {
      cvDraft.skills.push({ key: `custom-${Date.now()}`, tags: [], label: { en: '', fr: '' }, items: { en: [], fr: [] } });
      renderCvEditor();
    } }),
    pair('interests', 'Interests'),
  ],
};

function renderCvEditor() {
  $('cvTabs').replaceChildren(...CV_TABS.map(([key, iconName, label]) => el('button', {
    type: 'button',
    className: cvTab === key ? 'on' : '',
    onclick: () => { cvTab = key; renderCvEditor(); },
  }, [icon(iconName), label])));
  $('cvBody').replaceChildren(...cvTabs[cvTab]());
}

async function openCvEditor() {
  await useSavedCv();
  cvDraft = JSON.parse(JSON.stringify(CV_DATA));
  cvDraft.other ||= [];
  cvTab = 'contact';
  renderCvEditor();
  $('cvDialog').showModal();
}

$('cvBtn').addEventListener('click', openCvEditor);
$('cvClose').addEventListener('click', () => $('cvDialog').close());
$('cvPreview').addEventListener('click', async () => {
  await saveCv(dropEmptyPoints(cvDraft));
  chrome.windows.create({ url: chrome.runtime.getURL('doc.html?type=cv&id=preview'), width: 980, height: 1000, focused: true });
});
$('cvReset').addEventListener('click', () => {
  if (!confirm('Go back to the CV from your file (October 2026)? Your changes here will be lost.')) return;
  cvDraft = JSON.parse(JSON.stringify(ORIGINAL_CV));
  renderCvEditor();
});
function dropEmptyPoints(cv) {
  for (const e of [...cv.experience, ...cv.education]) e.bullets = (e.bullets || []).filter((b) => (b.en || '').trim() || (b.fr || '').trim());
  return cv;
}

$('cvSave').addEventListener('click', async () => {
  await saveCv(dropEmptyPoints(cvDraft));
  $('cvDialog').close();
  // A CV just filled in from a file: offer to build the preferences (job titles, keywords) from it.
  if (cvImported) {
    cvImported = false;
    toast('CV saved. Use it to set what Swipely looks for?', [['Fill in my preferences', () => preferencesFromCv()]], 'sparkles');
  } else toast('CV saved. Every tailored CV and letter now uses it.');
});
