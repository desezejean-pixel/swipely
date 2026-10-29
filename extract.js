// Injected into the current tab when the popup opens: reads the offer's details from the page.
// The value of the last expression is sent back to the popup.
(() => {
  const out = { url: location.href, title: '', company: '', location: '', workMode: '', pay: '', duration: '', description: '', logo: '', companyUrl: '', postedAt: '', contract: '', early: false };
  const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();
  const text = (selectors) => {
    for (const s of [].concat(selectors)) {
      const t = clean(document.querySelector(s)?.textContent);
      if (t) return t;
    }
    return '';
  };
  const meta = (name) => clean(document.querySelector(`meta[property="${name}"], meta[name="${name}"]`)?.content);
  const tidy = (s) => String(s || '').split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  // Keeps paragraphs and bullet points of the offer's description.
  const htmlToText = (html) => {
    const withBreaks = String(html || '').replace(/<li[^>]*>/gi, '\n• ').replace(/<br\s*\/?>|<\/(p|div|li|ul|ol|h\d)>/gi, '\n');
    return tidy(new DOMParser().parseFromString(withBreaks, 'text/html').body.textContent);
  };
  const host = location.hostname.replace(/^www\./, '');

  // 1. Structured data (schema.org JobPosting): Welcome to the Jungle, JobTeaser and most career sites.
  const findJob = (node) => {
    if (!node || typeof node !== 'object') return null;
    if (Array.isArray(node)) {
      for (const n of node) {
        const found = findJob(n);
        if (found) return found;
      }
      return null;
    }
    const type = [].concat(node['@type'] || []);
    if (type.includes('JobPosting')) return node;
    return findJob(node['@graph']);
  };
  let job = null;
  for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      job = findJob(JSON.parse(s.textContent));
    } catch {}
    if (job) break;
  }
  if (job) {
    out.title = clean(job.title);
    const org = [].concat(job.hiringOrganization || [])[0];
    out.company = clean(typeof org === 'string' ? org : org?.name);
    if (org && typeof org === 'object') {
      const logo = [].concat(org.logo || [])[0];
      out.logo = typeof logo === 'string' ? logo : logo?.url || '';
      out.companyUrl = [].concat(org.sameAs || org.url || [])[0] || '';
      out.companyWebsite = [].concat(org.url || org.sameAs || []).find((u) => !/linkedin|jobteaser|welcometothejungle|stationf|indeed|glassdoor/i.test(u)) || '';
    }
    out.postedAt = String(job.datePosted || '').slice(0, 10);
    out.contract = [].concat(job.employmentType || []).join(', ');
    const places = [].concat(job.jobLocation || []).map((l) => {
      const a = l?.address || {};
      if (typeof a === 'string') return clean(a);
      return [a.addressLocality, a.addressCountry?.name || a.addressCountry].filter((x) => typeof x === 'string' && x).join(', ');
    });
    out.location = [...new Set(places.filter(Boolean))].join(' / ');
    if (/TELECOMMUTE/i.test(JSON.stringify(job.jobLocationType || ''))) out.workMode = 'Remote';
    const salary = job.baseSalary;
    if (salary && typeof salary === 'object') {
      const v = salary.value;
      const amount = v && typeof v === 'object'
        ? (v.minValue && v.maxValue && v.minValue !== v.maxValue ? `${v.minValue}–${v.maxValue}` : v.value ?? v.minValue ?? v.maxValue)
        : v;
      const unit = typeof v === 'object' && v?.unitText ? `/ ${String(v.unitText).toLowerCase()}` : '';
      if (amount) out.pay = [amount, salary.currency, unit].filter(Boolean).join(' ');
    }
    out.description = htmlToText(job.description);
  }

  // 2. LinkedIn (no structured data when you're logged in).
  if (host.endsWith('linkedin.com')) {
    out.title ||= text(['.job-details-jobs-unified-top-card__job-title', '.jobs-unified-top-card__job-title', '.top-card-layout__title']);
    out.company ||= text(['.job-details-jobs-unified-top-card__company-name', '.jobs-unified-top-card__company-name', '.topcard__org-name-link']);
    out.location ||= text(['.job-details-jobs-unified-top-card__tertiary-description-container span', '.job-details-jobs-unified-top-card__bullet', '.topcard__flavor--bullet']).split('·')[0].trim();
    const top = text(['.job-details-jobs-unified-top-card__container--two-pane', '.jobs-unified-top-card', '.top-card-layout']);
    const mode = top.match(/\b(Remote|Hybrid|On-site|À distance|Hybride|Sur site)\b/i)?.[1].toLowerCase();
    if (mode && !out.workMode) out.workMode = { remote: 'Remote', 'à distance': 'Remote', hybrid: 'Hybrid', hybride: 'Hybrid' }[mode] || 'On-site';
    out.description ||= tidy(document.querySelector('#job-details, .jobs-description__content, .show-more-less-html__markup')?.innerText);
    const card = document.querySelector('.job-details-jobs-unified-top-card__container--two-pane, .jobs-unified-top-card, .top-card-layout') || document;
    out.logo ||= [...card.querySelectorAll('img')].map((i) => i.getAttribute('data-delayed-url') || i.currentSrc || i.src).find((u) => /media\.licdn\.com.*company-logo/.test(u)) || '';
    out.companyUrl ||= (card.querySelector('a[href*="/company/"]')?.href || '').split('?')[0];
    out.early = /early applicant|among the first \d+|parmi les \d+ premiers/i.test(top);
    out.contract ||= top.match(/\b(Internship|Stage|Full-time|Temps plein|CDI|Apprenticeship|Alternance|Contract|Part-time)\b/i)?.[1] || '';
    const ago = top.match(/(\d+)\s*(minute|hour|day|week|month)s?\s*ago|il y a\s*(\d+)\s*(minute|heure|jour|semaine|mois)/i);
    if (ago && !out.postedAt) {
      const n = Number(ago[1] || ago[3]);
      const unit = (ago[2] || ago[4]).toLowerCase();
      const days = /day|jour/.test(unit) ? n : /week|semaine/.test(unit) ? n * 7 : /month|mois/.test(unit) ? n * 30 : 0;
      const d = new Date();
      d.setDate(d.getDate() - days);
      out.postedAt = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    // Page title looks like "Job title | Company | LinkedIn".
    const parts = document.title.replace(/^\(\d+\)\s*/, '').split(' | ');
    if (parts.length >= 3) {
      out.title ||= parts[0];
      out.company ||= parts[1];
    }
  }

  // 3. Any other page.
  out.title ||= text('h1') || meta('og:title') || clean(document.title);
  const siteName = meta('og:site_name');
  const platforms = /linkedin|welcome to the jungle|jobteaser|indeed|lever|greenhouse|workday|smartrecruiters|teamtailor|workable|glassdoor|hellowork/i;
  if (!out.company && siteName && !platforms.test(siteName)) out.company = siteName;
  if (!out.company && /(lever\.co|greenhouse\.io|workable\.com|smartrecruiters\.com)$/.test(host)) {
    out.company = decodeURIComponent(location.pathname.split('/')[1] || '');
  }
  out.description ||= meta('og:description') || meta('description');

  // Guesses from the offer's text (you can correct them before saving).
  const body = `${out.title} ${out.description}`.toLowerCase();
  if (!out.workMode) {
    if (/full remote|100\s?% (remote|télétravail)|télétravail (total|complet)/.test(body)) out.workMode = 'Remote';
    else if (/hybrid|hybride|télétravail partiel|\d jours? de télétravail/.test(body)) out.workMode = 'Hybrid';
  }
  const months = body.match(/\b(\d{1,2})\s*(mois|months?)\b/);
  if (months) out.duration = `${months[1]} months`;

  out.description = out.description.slice(0, 8000);
  if (out.logo) out.logoFrom = /media\.licdn\.com\/.*company-logo/.test(out.logo) ? 'card' : 'page';
  out.selection = clean(getSelection()?.toString()).slice(0, 1000); // highlighted text goes into Notes
  return out;
})();
