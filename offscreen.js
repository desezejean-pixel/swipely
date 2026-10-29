// Reads a downloaded page without showing it: the list of offers, or one offer's description.
// Scripts in the page never run (it's only parsed).

function describeDocument(doc) {
  const out = {};
  const findJob = (n) => {
    if (!n || typeof n !== 'object') return null;
    if (Array.isArray(n)) return n.map(findJob).find(Boolean) || null;
    if ([].concat(n['@type'] || []).includes('JobPosting')) return n;
    return findJob(n['@graph']);
  };
  let job = null;
  for (const s of doc.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      job ||= findJob(JSON.parse(s.textContent));
    } catch {}
  }
  if (job) {
    out.description = htmlText(job.description || '', true);
    const org = [].concat(job.hiringOrganization || [])[0];
    if (org && typeof org === 'object') {
      const logo = [].concat(org.logo || [])[0];
      out.logo = typeof logo === 'string' ? logo : logo?.url || '';
      out.companyUrl = [].concat(org.sameAs || org.url || [])[0] || '';
    }
    out.postedAt = String(job.datePosted || '').slice(0, 10);
    out.contract = [].concat(job.employmentType || []).join(', ');
    const a = [].concat(job.jobLocation || [])[0]?.address;
    out.location = typeof a === 'string' ? a : [a?.addressLocality, a?.addressCountry?.name || a?.addressCountry].filter((x) => typeof x === 'string' && x).join(', ');
  }
  if (!out.description) {
    // No structured data: the main text block of the page.
    const main = doc.querySelector('[class*="job-description" i], [class*="jobdescription" i], [id*="job-description" i], [class*="description" i], main, article');
    out.description = main ? htmlText(main.innerHTML, true) : '';
  }
  if (!out.description) out.description = doc.querySelector('meta[property="og:description"], meta[name="description"]')?.content || '';
  out.description = (out.description || '').slice(0, 8000);
  return out;
}

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg?.target !== 'offscreen') return;
  const doc = new DOMParser().parseFromString(msg.html, 'text/html');
  const base = doc.createElement('base');
  base.href = msg.url;
  doc.head.prepend(base);
  try {
    reply(msg.type === 'scan' ? scanDocument(doc, msg.url) : describeDocument(doc));
  } catch (e) {
    reply({ offers: [], error: String(e.message || e) });
  }
});
