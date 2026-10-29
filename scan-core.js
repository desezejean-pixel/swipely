// Lists every offer on a results page (search results, a company's careers page…), with the company logo,
// company page, posted date, contract and "early applicant" hint when the page shows them.
// Used on the page you're viewing (toolbar button) and on pages downloaded in the background.
function scanDocument(document, pageUrl) {
  const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();
  const text = (root, selectors) => {
    for (const s of [].concat(selectors)) {
      const t = clean(root.querySelector(s)?.textContent);
      if (t) return t;
    }
    return '';
  };
  const abs = (href) => {
    try {
      const u = new URL(href, document.baseURI);
      u.hash = '';
      return /^https?:$/.test(u.protocol) ? u.href : '';
    } catch {
      return '';
    }
  };
  const pretty = (slug) => decodeURIComponent(slug || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
  const host = new URL(pageUrl).hostname.replace(/^www\./, '');
  const isoDaysAgo = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // "il y a 3 heures", "2 days ago", "4 wk. ago", "hier"… → YYYY-MM-DD
  const parseAgo = (raw) => {
    const t = clean(raw).toLowerCase();
    if (!/ago|il y a|aujourd|today|hier|yesterday|just now|instant/.test(t)) return '';
    if (/aujourd|today|just now|instant|minute|\bmin\b|heure|hour|\bh\b|\bhr/.test(t)) return isoDaysAgo(0);
    if (/hier|yesterday/.test(t)) return isoDaysAgo(1);
    const m = t.match(/(\d+|un|une|an|a)\s*\+?\s*(jours?|days?|d\b|j\b|semaines?|weeks?|wks?\.?|w\b|mois|months?|mos?\.?|ans?|years?|yrs?|y\b)/);
    if (!m) return '';
    const n = /^\d+$/.test(m[1]) ? Number(m[1]) : 1;
    const unit = m[2];
    const days = /^(semaine|week|wk|w)/.test(unit) ? 7 : /^(mois|month|mo)/.test(unit) ? 30 : /^(an|year|yr|y)/.test(unit) ? 365 : 1;
    return isoDaysAgo(n * days);
  };

  // The company logo inside an offer card: an <img>, or a background image on a "logo" element.
  const srcOf = (i) => i.getAttribute('data-delayed-url') || i.currentSrc || i.src || '';
  const logoIn = (card, company) => {
    const imgs = [...card.querySelectorAll('img')].filter((i) => /^https?:/.test(srcOf(i)) && !/\.svg|static\.licdn\.com|sprite|icon/i.test(srcOf(i)));
    const named = imgs.find((i) => company && clean(i.alt).toLowerCase() === company.toLowerCase());
    const img = named || imgs.find((i) => /logo/i.test(`${i.className} ${i.alt} ${srcOf(i)} ${i.dataset.testid || ''}`)) || imgs[0];
    if (img) return srcOf(img);
    for (const e of card.querySelectorAll('[class*="logo" i], [style*="background-image"]')) {
      const bg = (e.getAttribute('style') || '').match(/background-image:\s*url\(['"]?([^'")]+)/i)?.[1] || '';
      if (/^https?:/.test(bg)) return bg;
    }
    return '';
  };

  const offers = [];
  const seen = new Set();
  const add = (o) => {
    const title = clean(o.title);
    if (!o.url || !title || seen.has(o.url)) return;
    seen.add(o.url);
    offers.push({
      url: o.url,
      title: title.slice(0, 200),
      company: clean(o.company).slice(0, 120),
      location: clean(o.location).replace(/^(place|location_on|locations?)\s*/i, '').slice(0, 120),
      logo: o.logo || '',
      companyUrl: o.companyUrl || '',
      postedAt: o.postedAt || '',
      contract: clean(o.contract).slice(0, 60),
      early: Boolean(o.early),
    });
  };
  const noQuery = (href) => {
    const u = abs(href);
    return u ? u.split('?')[0] : '';
  };

  // LinkedIn: public (logged-out) search, and the logged-in search list.
  if (host.endsWith('linkedin.com')) {
    document.querySelectorAll('.base-search-card').forEach((c) => {
      const id = (c.dataset.entityUrn || '').split(':').pop();
      const company = text(c, '.base-search-card__subtitle');
      add({
        url: /^\d+$/.test(id) ? `https://www.linkedin.com/jobs/view/${id}/` : abs(c.querySelector('a[href*="/jobs/view/"]')?.getAttribute('href')),
        title: text(c, '.base-search-card__title'),
        company,
        location: text(c, '.job-search-card__location'),
        logo: logoIn(c, company),
        companyUrl: noQuery(c.querySelector('.base-search-card__subtitle a')?.getAttribute('href')),
        postedAt: c.querySelector('time[datetime]')?.getAttribute('datetime') || '',
        early: /early applicant/i.test(c.textContent),
      });
    });
    document.querySelectorAll('[data-occludable-job-id], [data-job-id]').forEach((c) => {
      const id = c.dataset.occludableJobId || c.dataset.jobId;
      if (!/^\d+$/.test(id || '')) return;
      const company = text(c, ['.artdeco-entity-lockup__subtitle', '.job-card-container__primary-description', '.job-card-container__company-name']);
      add({
        url: `https://www.linkedin.com/jobs/view/${id}/`,
        title: text(c, ['.job-card-list__title--link strong', '.job-card-list__title', '.artdeco-entity-lockup__title', 'a[href*="/jobs/view/"]']),
        company,
        location: text(c, ['.artdeco-entity-lockup__caption', '.job-card-container__metadata-item']),
        logo: logoIn(c, company),
        postedAt: c.querySelector('time[datetime]')?.getAttribute('datetime') || '',
        early: /early applicant/i.test(c.textContent),
      });
    });
  }

  // JobTeaser (public site and school portals).
  document.querySelectorAll('[data-testid="jobad-card"]').forEach((c) => {
    const a = c.querySelector('h3 a, a[href*="/job-offers/"]');
    const company = text(c, '[data-testid="jobad-card-company-name"]');
    add({
      url: abs(a?.getAttribute('href')),
      title: a?.textContent,
      company,
      location: text(c, '[data-testid="jobad-card-location"]'),
      logo: c.querySelector('img[data-testid="jobad-card-company-logo"]')?.currentSrc || logoIn(c, company),
      contract: text(c, '[data-testid="jobad-card-contract"]'),
      postedAt: parseAgo(c.textContent.match(/(il y a[^·\n]{1,25}|[^·\n]{1,20} ago)/i)?.[0]),
    });
  });

  // Structured data listing several offers.
  const jobs = [];
  const walk = (n) => {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) return n.forEach(walk);
    if ([].concat(n['@type'] || []).includes('JobPosting')) jobs.push(n);
    walk(n['@graph']);
    walk(n.itemListElement);
    walk(n.item);
  };
  document.querySelectorAll('script[type="application/ld+json"]').forEach((s) => {
    try {
      walk(JSON.parse(s.textContent));
    } catch {}
  });
  if (jobs.length > 1) {
    for (const j of jobs) {
      const org = [].concat(j.hiringOrganization || [])[0];
      const a = [].concat(j.jobLocation || [])[0]?.address;
      add({
        url: abs(j.url),
        title: j.title,
        company: typeof org === 'string' ? org : org?.name,
        location: typeof a === 'string' ? a : a?.addressLocality,
        logo: typeof org === 'object' ? [].concat(org?.logo || [])[0]?.url || [].concat(org?.logo || [])[0] : '',
        companyUrl: typeof org === 'object' ? org?.sameAs || org?.url : '',
        postedAt: String(j.datePosted || '').slice(0, 10),
        contract: [].concat(j.employmentType || []).join(', '),
      });
    }
  }

  // Career sites whose offer links have their own shape (big tech): only these links are offers.
  const SITE_RULES = [
    { host: /google\.com$/, link: /\/jobs\/results\/\d+/, company: 'Google' },
    { host: /amazon\.jobs$/, link: /\/jobs\/\d+/, company: 'Amazon' },
    { host: /jobs\.apple\.com$/, link: /\/details\/\d+/, company: 'Apple' },
    { host: /careers\.microsoft\.com$/, link: /\/careers\/job\/\d+|\/job\/\d+/, company: 'Microsoft' },
    { host: /metacareers\.com$/, link: /\/jobs\/\d+/, company: 'Meta' },
    { host: /stripe\.com$/, link: /\/(careers|jobs)\/listing\//, company: 'Stripe' },
    { host: /myworkdayjobs\.com$/, link: /\/job\//, company: '' },
    { host: /salesforce\.com$/, link: /\/jobs\/JR\d+/i, company: 'Salesforce' },
  ];
  const rule = SITE_RULES.find((r) => r.host.test(host));

  // Any other site: links that look like a single job offer.
  if (!offers.length) {
    const ATS = /(lever\.co|greenhouse\.io|ashbyhq\.com|teamtailor\.com|myworkdayjobs\.com|smartrecruiters\.com|workable\.com|recruitee\.com|welcomekit\.co|personio\.(de|com)|breezy\.hr|jobteaser\.com|welcometothejungle\.com)$/i;
    const JOB_PATH = /\/(jobs?|job-offers?|offres?(-d-emploi)?|emplois?|careers?|carrieres?|postings?|positions?|vacanc(y|ies)|opportunit(y|ies)|stages?|annonces?|o|j)\/[^?#]*[^/?#]{4,}/i;
    const GENERIC = /^(apply|postuler|candidater|voir|view|see|details?|more|read more|learn more|en savoir plus|découvrir|discover)\b/i;
    const CONTRACT = /\b(internship|stage|stagiaire|intern|full[- ]time|part[- ]time|cdi|cdd|alternance|apprentissage|apprenticeship|v\.?i\.?e|freelance|temporary|contract)\b/i;
    const siteName = clean(document.querySelector('meta[property="og:site_name"]')?.content)
      .replace(/^(careers?|jobs?|carrières?|emplois?|recrutement)\s+(at|chez|@|-|\|)\s*/i, '')
      .replace(/\s*(-|\||·)?\s*(careers?|jobs?|carrières?|emplois?|recrutement)$/i, '');
    const PLATFORMS = /linkedin|welcome to the jungle|jobteaser|indeed|lever|greenhouse|workday|smartrecruiters|teamtailor|workable|glassdoor|hellowork|ashby|recruitee/i;

    const companyFor = (u) => {
      const h = u.hostname.replace(/^www\./, '');
      const parts = u.pathname.split('/').filter(Boolean);
      const board = u.pathname.match(/\/companies\/([^/]+)\/jobs\//);
      if (board) return pretty(board[1]);
      if (/(lever\.co|greenhouse\.io|ashbyhq\.com|workable\.com|smartrecruiters\.com)$/.test(h)) return pretty(parts[0] === 'embed' ? u.searchParams.get('for') : parts[0]);
      if (/(teamtailor\.com|recruitee\.com|myworkdayjobs\.com|personio\.(de|com)|breezy\.hr)$/.test(h)) return pretty(h.split('.')[0]);
      if (siteName && !PLATFORMS.test(siteName)) return siteName;
      const labels = h.split('.').filter((l) => !/^(www|careers?|jobs?|emplois?|recrutement|carrieres?|join|talent)$/.test(l));
      return pretty(labels.length > 1 ? labels[labels.length - 2] : labels[0]);
    };
    const isJobLink = (href) => {
      const url = abs(href);
      if (!url || url === abs(pageUrl)) return '';
      if (rule) return rule.link.test(new URL(url).pathname) ? url : '';
      const u = new URL(url);
      const h = u.hostname.replace(/^www\./, '');
      const parts = u.pathname.split('/').filter(Boolean);
      const sameSite = h.split('.').slice(-2).join('.') === host.split('.').slice(-2).join('.');
      const twoPartAts = /(lever\.co|ashbyhq\.com)$/.test(h) && parts.length === 2 && parts[1].length >= 8;
      if (!(sameSite || ATS.test(h)) || !(JOB_PATH.test(u.pathname) || twoPartAts)) return '';
      if (/\/(apply|login|signin|search|alerts?)\b/i.test(u.pathname)) return '';
      return url;
    };
    // The offer's card: the largest block around the link that holds no other offer.
    const cardOf = (a, url) => {
      let card = a;
      for (let i = 0; i < 6 && card.parentElement && card.parentElement !== document.body; i++) {
        const parent = card.parentElement;
        const others = [...parent.querySelectorAll('a[href]')].some((x) => {
          const u = isJobLink(x.getAttribute('href'));
          return u && u !== url;
        });
        if (others) break;
        card = parent;
      }
      return card;
    };

    for (const a of document.querySelectorAll('a[href]')) {
      const url = isJobLink(a.getAttribute('href'));
      if (!url || seen.has(url)) continue;
      const card = cardOf(a, url);
      let title = clean(a.querySelector('h1, h2, h3, h4, h5, [data-qa="posting-name"], [class*="title" i]')?.textContent);
      if (!title) title = clean((a.innerText || a.textContent).split('\n').find((l) => clean(l)));
      if (!title || title.length < 4 || GENERIC.test(title)) title = text(card, ['h1', 'h2', 'h3', 'h4', 'h5', '[class*="title" i]']);
      if (!title || title.length > 160 || GENERIC.test(title)) continue;

      // Small facts listed in the card (company, contract, place, date), e.g. on Station F and VC Careers.
      const bits = [...card.querySelectorAll('li, p, span, time')]
        .filter((e) => !e.querySelector('li, p, h1, h2, h3, h4'))
        .map((e) => clean(e.textContent))
        .filter((t) => t && t.length < 80 && t !== title);
      const imgAlt = clean(card.querySelector('img[alt]')?.alt);
      let company = /stationf\.co$/.test(host) ? bits[0] : imgAlt && imgAlt.length < 60 ? imgAlt : '';
      company ||= rule?.company || companyFor(new URL(url));
      if (rule?.company) company = rule.company;
      const placeEl = text(card, ['[class*="location" i]', '[data-testid*="location" i]', '[data-qa*="location" i]']);
      const placeRaw = placeEl.replace(/^(place|location_on|locations?)\s*/i, '').split(/\||job id/i)[0].trim();
      const place = placeRaw || bits.find((t) => t !== company && /,|\(hybrid\)|\(remote\)|paris|london|berlin|remote|télétravail/i.test(t) && !CONTRACT.test(t) && !/ago|il y a|€|\$|£/.test(t));
      const boardCompany = url.match(/^(https?:\/\/[^/]+\/companies\/[^/]+)\/jobs\//)?.[1];
      add({
        url,
        title,
        company,
        location: place || (/stationf\.co$/.test(host) ? bits[2] : ''),
        logo: logoIn(card, company),
        companyUrl: boardCompany || '',
        postedAt: card.querySelector('time[datetime]')?.getAttribute('datetime')?.slice(0, 10) || parseAgo(bits.find((t) => /ago|il y a|aujourd|hier|yesterday|today/i.test(t))),
        contract: bits.find((t) => CONTRACT.test(t) && t.length < 30) || '',
      });
    }
  }

  // Job boards that link each company's jobs as /companies/<name>/jobs/<offer>: keep only those.
  const companyJobs = offers.filter((o) => /\/companies\/[^/]+\/jobs\/[^/?#]+/.test(o.url));
  const result = companyJobs.length >= 3 ? companyJobs : offers;

  // A single company's careers page: every offer gets the logo shown at the top of the page.
  if (result.length && result.every((o) => !o.logo && o.company === result[0].company)) {
    const top = [...document.querySelectorAll('header img, nav img, [class*="logo" i] img, img[class*="logo" i], img[alt*="logo" i]')]
      .find((i) => /^https?:/.test(srcOf(i)));
    const og = document.querySelector('meta[property="og:image"]')?.content;
    const pageLogo = top ? srcOf(top) : og || '';
    result.forEach((o) => {
      o.logo = pageLogo;
      o.logoFrom = 'page'; // the site's logo, maybe not the company's
    });
  }
  return { offers: result.slice(0, 200) };
}
