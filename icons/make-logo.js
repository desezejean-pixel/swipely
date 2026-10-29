// Swipely logo: a tilted front card with a heart over a second card, on a blue → purple → pink squircle.
const fs = require('fs');
const out = process.argv[2];
function squircle(n = 5, steps = 240) {
  const pts = [];
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * 2 * Math.PI, c = Math.cos(t), s = Math.sin(t);
    pts.push(`${(512 + 512 * Math.sign(c) * Math.abs(c) ** (2 / n)).toFixed(1)},${(512 + 512 * Math.sign(s) * Math.abs(s) ** (2 / n)).toFixed(1)}`);
  }
  return `M${pts.join('L')}Z`;
}
const heart = (cx, cy, s) => `M${cx} ${cy + s * 0.92} C ${cx - s * 1.25} ${cy + s * 0.05}, ${cx - s * 1.05} ${cy - s * 0.95}, ${cx - s * 0.5} ${cy - s * 0.95} C ${cx - s * 0.2} ${cy - s * 0.95}, ${cx} ${cy - s * 0.72}, ${cx} ${cy - s * 0.5} C ${cx} ${cy - s * 0.72}, ${cx + s * 0.2} ${cy - s * 0.95}, ${cx + s * 0.5} ${cy - s * 0.95} C ${cx + s * 1.05} ${cy - s * 0.95}, ${cx + s * 1.25} ${cy + s * 0.05}, ${cx} ${cy + s * 0.92} Z`;
function svg({ pad = 0, small = false } = {}) {
  const k = (1024 - 2 * pad) / 1024;
  const W = small ? 430 : 400, H = small ? 540 : 500, R = small ? 78 : 70;
  const cx = 512, cy = small ? 520 : 530;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#4F8BFF"/><stop offset="0.5" stop-color="#7C5CFF"/><stop offset="1" stop-color="#F0529C"/>
    </linearGradient>
    <radialGradient id="shine" cx="0.3" cy="0" r="0.8"><stop offset="0" stop-color="#fff" stop-opacity="0.38"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <linearGradient id="card" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#F1EDFF"/></linearGradient>
    <linearGradient id="ink" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7C5CFF"/><stop offset="1" stop-color="#F0529C"/></linearGradient>
    <filter id="drop" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="${small ? 12 : 22}" stdDeviation="${small ? 12 : 26}" flood-color="#2A1170" flood-opacity="0.35"/></filter>
    <filter id="iconShadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="#000" flood-opacity="0.28"/></filter>
  </defs>
  <g transform="translate(${pad} ${pad}) scale(${k})">
    <g ${pad ? 'filter="url(#iconShadow)"' : ''}><path d="${squircle()}" fill="url(#bg)"/></g>
    <path d="${squircle()}" fill="url(#shine)"/>
    <path d="${squircle()}" fill="none" stroke="#fff" stroke-opacity="0.2" stroke-width="6"/>
    <!-- back card -->
    <rect x="${cx - W / 2}" y="${cy - H / 2}" width="${W}" height="${H}" rx="${R}" fill="#fff" fill-opacity="${small ? 0.42 : 0.38}" transform="rotate(-11 ${cx} ${cy}) translate(-${small ? 30 : 34} 6)"/>
    <!-- front card, tilted like a swipe -->
    <g filter="url(#drop)" transform="rotate(9 ${cx} ${cy}) translate(${small ? 26 : 30} -6)">
      <rect x="${cx - W / 2}" y="${cy - H / 2}" width="${W}" height="${H}" rx="${R}" fill="url(#card)"/>
      <path d="${heart(cx, cy - (small ? 4 : 10), small ? 118 : 104)}" fill="url(#ink)"/>
      ${small ? '' : `<rect x="${cx - 110}" y="${cy + 132}" width="220" height="26" rx="13" fill="#7C5CFF" fill-opacity="0.18"/><rect x="${cx - 70}" y="${cy + 176}" width="140" height="22" rx="11" fill="#7C5CFF" fill-opacity="0.12"/>`}
    </g>
  </g>
</svg>`;
}
fs.writeFileSync(`${out}/logo.svg`, svg());
fs.writeFileSync(`${out}/icon-padded.svg`, svg({ pad: 128 }));
fs.writeFileSync(`${out}/icon-small.svg`, svg({ small: true }));
fs.writeFileSync(`${out}/icon-mac.svg`, svg({ pad: 100 }));
