// Auto-fill "My CV" from a CV: paste its text, or open a Word (.docx) / text file.
// Chrome's free AI does the filling when your Mac supports it (and translates to English and French);
// otherwise a built-in reader splits the text into contact, experience, education and skills.

// ---- Reading a file ----

async function readDocx(file) {
  const buf = new Uint8Array(await file.arrayBuffer());
  const dv = new DataView(buf.buffer);
  let end = buf.length - 22;
  while (end >= 0 && dv.getUint32(end, true) !== 0x06054b50) end--;
  if (end < 0) throw new Error('This isn’t a Word file.');
  let pos = dv.getUint32(end + 16, true);
  const entries = dv.getUint16(end + 10, true);
  for (let n = 0; n < entries; n++) {
    const method = dv.getUint16(pos + 10, true);
    const compressed = dv.getUint32(pos + 20, true);
    const nameLen = dv.getUint16(pos + 28, true);
    const extraLen = dv.getUint16(pos + 30, true);
    const commentLen = dv.getUint16(pos + 32, true);
    const offset = dv.getUint32(pos + 42, true);
    const name = new TextDecoder().decode(buf.slice(pos + 46, pos + 46 + nameLen));
    if (name === 'word/document.xml') {
      const start = offset + 30 + dv.getUint16(offset + 26, true) + dv.getUint16(offset + 28, true);
      let data = buf.slice(start, start + compressed);
      if (method === 8) data = new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
      const xml = new TextDecoder().decode(data);
      return xml.split(/<w:p[ >]/).slice(1).map((p) => {
        const text = p.replace(/<w:tab\/>/g, '\t').replace(/<w:br\/>/g, '\n').replace(/<[^>]+>/g, '')
          .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
        return /<w:numPr>/.test(p) && text.trim() ? `• ${text.trim()}` : text;
      }).join('\n');
    }
    pos += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error('No text found in this Word file.');
}

async function fileToText(file) {
  if (/\.docx$/i.test(file.name)) return readDocx(file);
  if (/\.pdf$/i.test(file.name)) throw new Error('For a PDF: open it, select all (⌘A), copy (⌘C) and paste the text here.');
  return file.text();
}

// ---- The built-in reader (no AI) ----

const CV_HEADINGS = [
  ['experience', /^(work )?(professional )?experiences?( professionnelles?)?|expériences?( professionnelles?)?|parcours professionnel$/i],
  ['education', /^(education|formations?|études|parcours académique|academic background)$/i],
  ['skills', /^(skills|compétences|competences|technical skills|outils)$/i],
  ['languages', /^(languages|langues)$/i],
  ['interests', /^(interests|hobbies|centres? d['’]intérêts?|loisirs)$/i],
  ['other', /^(other experience|autres expériences|projects|projets|volunteering|bénévolat|certifications?)$/i],
  ['summary', /^(summary|profile|profil|about( me)?|à propos|résumé)$/i],
];
const MONTH_WORD = '(?:jan(?:uary|vier)?|feb(?:ruary)?|f[ée]v(?:rier)?|mar(?:ch|s)?|apr(?:il)?|avr(?:il)?|may|mai|jun(?:e)?|juin|jul(?:y)?|juil(?:let)?|aug(?:ust)?|ao[uû]t|sep(?:t(?:ember|embre)?)?|oct(?:ober|obre)?|nov(?:ember|embre)?|d[ée]c(?:ember|embre)?|dec(?:ember)?)\\.?';
const DATE_PART = `(?:${MONTH_WORD}\\s+)?(?:19|20)\\d{2}`;
const DATE_RANGE = new RegExp(`(${DATE_PART})\\s*(?:[-–—]|to|à|au)\\s*(${DATE_PART}|present|présent|aujourd['’]hui|now|ongoing|en cours|current)`, 'i');

function headingOf(line) {
  const t = line.replace(/[:：]\s*$/, '').trim();
  if (!t || t.length > 40) return '';
  for (const [key, re] of CV_HEADINGS) if (re.test(t)) return key;
  return '';
}

function splitEntries(lines) {
  const entries = [];
  let cur = null;
  lines.forEach((raw, n) => {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim()) return;
    const bullet = /^\s*[•●▪◦‣∙*·-]\s+/.test(line);
    const dateMatch = !bullet && line.match(DATE_RANGE);
    if (dateMatch) {
      const rest = line.replace(DATE_RANGE, '').replace(/[\t|·]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
      // The line before is usually "COMPANY      City"; the dated line carries the role.
      const prev = cur && !cur.locked ? null : lines.slice(0, n).reverse().find((l) => l.trim());
      const prevIsHeader = prev && !/^\s*[•●▪◦‣∙*·-]\s+/.test(prev) && !DATE_RANGE.test(prev) && prev.trim().length < 90 && !headingOf(prev);
      let org = '';
      let role = rest;
      let place = '';
      if (prevIsHeader) {
        const parts = prev.trim().split(/\s{2,}|\t+/);
        org = parts[0];
        place = parts[1] || '';
        if (entries.length && entries.at(-1).org === org && !entries.at(-1).bullets.length) entries.pop();
      } else if (!rest) {
        org = '';
      }
      // "Company – Role" on one line
      if (!org && /\s[-–—|]\s/.test(rest)) [org, role] = rest.split(/\s[-–—|]\s/, 2);
      cur = { org: org || rest, role: org ? role : '', place, dates: `${dateMatch[1]} – ${dateMatch[2]}`, bullets: [], locked: true };
      entries.push(cur);
    } else if (cur && bullet) {
      cur.bullets.push(line.replace(/^\s*[•●▪◦‣∙*·-]\s+/, '').trim());
    } else if (cur && cur.bullets.length && !bullet && /^\s*[a-zà-ÿ(,;]/.test(line)) {
      cur.bullets[cur.bullets.length - 1] += ` ${line.trim()}`; // a bullet that runs onto the next line (starts in lowercase)
    }
  });
  return entries.map(({ locked, ...e }) => e);
}

function parseCvText(text) {
  const lines = text.replace(/\r/g, '').split('\n');
  const sections = { top: [] };
  let key = 'top';
  for (const line of lines) {
    const h = headingOf(line);
    if (h) {
      key = h;
      sections[key] ||= [];
    } else sections[key].push(line);
  }
  const all = text;
  const email = all.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';
  // A phone number: starts with + or 0, at least 9 digits (not a postcode).
  const phone = (all.match(/(?:\+\d{1,3}[\s.]?|\b0)\(?\d\)?(?:[\s.-]?\d{2}){3,5}\b/g) || []).find((x) => x.replace(/\D/g, '').length >= 9)?.trim() || '';
  const linkedin = all.match(/https?:\/\/(?:[a-z]+\.)?linkedin\.com\/in\/[^\s)]+/i)?.[0] || (all.match(/linkedin\.com\/in\/[^\s)]+/i)?.[0] ? `https://www.${all.match(/linkedin\.com\/in\/[^\s)]+/i)[0]}` : '');
  const name = (sections.top.find((l) => l.trim() && !/[@\d]/.test(l) && l.trim().split(/\s+/).length <= 4) || '').trim();
  const city = all.match(/\b\d{5}\s+[A-ZÀ-Ý][\p{L}-]+/u)?.[0] || '';
  const same = (v) => ({ en: v, fr: v });
  const experience = splitEntries(sections.experience || []).map((e) => ({
    org: e.org, short: e.org, what: same(''), place: e.place, role: same(e.role), dates: same(e.dates),
    bullets: e.bullets.map((b) => ({ en: b, fr: b, tags: inferTags(b) })),
  }));
  const other = splitEntries(sections.other || []).map((e) => ({ org: e.org, place: e.place, role: same(e.role), dates: same(e.dates) }));
  const education = splitEntries(sections.education || []).map((e) => ({
    org: e.org, place: e.place, degree: same(e.role), dates: same(e.dates), bullets: e.bullets.map((b) => ({ en: b, fr: b })),
  }));
  const skills = [];
  const skillLines = (sections.skills || []).filter((l) => l.trim());
  for (const l of skillLines) {
    const m = l.replace(/^\s*[•●▪◦‣∙*·-]\s+/, '').match(/^([^:]{2,40}):\s*(.+)$/);
    const items = (m ? m[2] : l).split(/[,;·|•]/).map((x) => x.trim()).filter(Boolean);
    if (items.length) skills.push({ key: `s${skills.length}`, tags: [], label: same(m ? m[1].trim() : 'Skills'), items: { en: items, fr: items } });
  }
  const langLines = (sections.languages || []).join(',').split(/[,;·|•\n]/).map((x) => x.trim()).filter(Boolean);
  if (langLines.length) skills.unshift({ key: 'languages', label: { en: 'Languages', fr: 'Langues' }, items: { en: langLines, fr: langLines } });
  const summary = (sections.summary || []).join(' ').replace(/\s+/g, ' ').trim();
  return {
    name, contact: { city, email, phone, linkedin }, availability: same(''), summary: same(summary),
    experience, education, other, skills, interests: same((sections.interests || []).join(', ').replace(/\s+/g, ' ').trim()),
  };
}

// ---- Chrome's free AI (structured answer, in English and French) ----

const CV_SCHEMA = (() => {
  const both = { type: 'object', properties: { en: { type: 'string' }, fr: { type: 'string' } }, required: ['en', 'fr'] };
  return {
    type: 'object',
    properties: {
      name: { type: 'string' },
      contact: { type: 'object', properties: { city: { type: 'string' }, email: { type: 'string' }, phone: { type: 'string' }, linkedin: { type: 'string' } }, required: ['city', 'email', 'phone', 'linkedin'] },
      summary: both,
      experience: { type: 'array', items: { type: 'object', properties: { org: { type: 'string' }, place: { type: 'string' }, role: both, dates: both, bullets: { type: 'array', items: both } }, required: ['org', 'role', 'dates', 'bullets'] } },
      education: { type: 'array', items: { type: 'object', properties: { org: { type: 'string' }, place: { type: 'string' }, degree: both, dates: both }, required: ['org', 'degree', 'dates'] } },
      skills: { type: 'array', items: { type: 'object', properties: { label: both, items: { type: 'object', properties: { en: { type: 'array', items: { type: 'string' } }, fr: { type: 'array', items: { type: 'string' } } }, required: ['en', 'fr'] } }, required: ['label', 'items'] } },
    },
    required: ['name', 'contact', 'experience', 'education', 'skills'],
  };
})();

async function aiParseCv(text, onProgress) {
  const session = await LanguageModel.create({
    ...aiOptions('en'),
    expectedOutputs: [{ type: 'text', languages: ['en', 'fr'] }],
    monitor(m) {
      m.addEventListener('downloadprogress', (e) => onProgress(`Downloading Chrome’s AI model (one time only)… ${Math.round(e.loaded * 100)}%`));
    },
    initialPrompts: [{ role: 'system', content: 'You read a CV and copy its content into the requested JSON. Copy facts exactly; never invent anything. Every text field has an English and a French version: translate faithfully when the CV is in only one language. Keep numbers, names of companies and schools as written. Dates like "Mar 2026 – Aug 2026" / "mars 2026 – août 2026". Bullet points are one achievement each.' }],
  });
  try {
    onProgress('Reading your CV… (20–60 seconds)');
    const out = await session.prompt(`CV:\n\n${text.slice(0, 9000)}`, { responseConstraint: CV_SCHEMA });
    return JSON.parse(out);
  } finally {
    session.destroy();
  }
}

// ---- To the shape of "My CV" ----

function toCvData(r, keep) {
  const same = (v) => ({ en: v || '', fr: v || '' });
  const both = (v) => (typeof v === 'string' ? same(v) : { en: v?.en || v?.fr || '', fr: v?.fr || v?.en || '' });
  const summary = both(r.summary);
  return {
    name: r.name || keep.name,
    contact: { city: r.contact?.city || '', email: r.contact?.email || '', phone: r.contact?.phone || '', linkedin: r.contact?.linkedin || '' },
    availability: keep.availability || same(''),
    profile: Object.fromEntries(['founder', 'product', 'bd', 'strategy', 'vc'].map((k) => [k, { ...summary }])),
    experience: (r.experience || []).map((e) => ({
      org: e.org || '', short: e.short || (e.org || '').toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase()), what: both(e.what), place: e.place || '',
      role: both(e.role), dates: both(e.dates),
      bullets: (e.bullets || []).map((b) => { const x = both(b); return { ...x, tags: inferTags(`${x.en} ${x.fr}`) }; }),
    })),
    education: (r.education || []).map((e) => ({ org: e.org || '', place: e.place || '', degree: both(e.degree), dates: both(e.dates), bullets: (e.bullets || []).map(both) })),
    other: (r.other || []).map((e) => ({ org: e.org || '', place: e.place || '', role: both(e.role), dates: both(e.dates) })),
    skills: (r.skills || []).map((g, n) => ({
      key: g.key || (/lang/i.test(g.label?.en || g.label) ? 'languages' : `s${n}`), tags: [], label: both(g.label),
      items: { en: g.items?.en || [], fr: g.items?.fr || g.items?.en || [] },
    })),
    interests: both(r.interests),
  };
}

// ---- The window ----

let importBusy = false;
let cvImported = false; // read by "Save my CV": offers to build the preferences from it

async function runCvImport() {
  if (importBusy) return;
  const status = (msg, error = false) => {
    $('cvImportMsg').textContent = msg;
    $('cvImportMsg').className = 'msg' + (error ? ' error' : '');
  };
  const text = $('cvImportText').value.trim();
  if (text.length < 80) return status('Paste your CV text first (or choose a file).', true);
  importBusy = true;
  $('cvImportGo').disabled = true;
  try {
    let parsed = null;
    let how = 'built-in reader';
    if ((await chromeAiStatus('en')) !== 'unavailable') {
      try {
        parsed = await aiParseCv(text, status);
        how = 'Chrome’s AI';
      } catch (e) {
        console.warn('AI could not read the CV, using the built-in reader', e);
      }
    }
    if (!parsed) parsed = parseCvText(text);
    cvDraft = toCvData(parsed, cvDraft);
    cvImported = true;
    renderCvEditor();
    $('cvImportDialog').close();
    toast(`Your CV was filled in with ${how}. Check each tab: nothing is saved until you press “Save my CV”.`, [], 'sparkles');
  } catch (e) {
    status(`This didn’t work: ${e.message || e}`, true);
  } finally {
    importBusy = false;
    $('cvImportGo').disabled = false;
  }
}

function openCvImport() {
  $('cvImportText').value = '';
  $('cvImportMsg').textContent = '';
  $('cvImportDialog').showModal();
}

$('cvImportBtn').addEventListener('click', openCvImport);
$('cvImportClose').addEventListener('click', () => $('cvImportDialog').close());
$('cvImportGo').addEventListener('click', runCvImport);
$('cvImportFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    $('cvImportText').value = await fileToText(file);
    $('cvImportMsg').textContent = `${file.name} read. Check the text, then press “Fill in my CV”.`;
    $('cvImportMsg').className = 'msg';
  } catch (err) {
    $('cvImportMsg').textContent = err.message;
    $('cvImportMsg').className = 'msg error';
  }
});
