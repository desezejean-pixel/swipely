// Line icons drawn for the tracker (24×24, rounded strokes), used instead of emojis.
const ICON_PATHS = {
  heart: '<path d="M12 20.3s-7.4-4.5-9.2-9.1C1.5 7.9 3.5 4.6 7 4.6c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.5 0 5.5 3.3 4.2 6.6-1.8 4.6-9.2 9.1-9.2 9.1z"/>',
  x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><circle cx="12" cy="7.6" r="0.6" fill="currentColor"/>',
  board: '<rect x="3" y="4" width="5" height="16" rx="1.6"/><rect x="10" y="4" width="5" height="11" rx="1.6"/><rect x="17" y="4" width="4" height="7" rx="1.4"/>',
  list: '<path d="M9 6h12M9 12h12M9 18h12"/><circle cx="4.5" cy="6" r="0.9" fill="currentColor"/><circle cx="4.5" cy="12" r="0.9" fill="currentColor"/><circle cx="4.5" cy="18" r="0.9" fill="currentColor"/>',
  file: '<path d="M14 3H7.5A2.5 2.5 0 0 0 5 5.5v13A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',
  sliders: '<path d="M4 7h9M17 7h3M4 12h3M11 12h9M4 17h11M19 17h1"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="17" r="2"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  more: '<circle cx="5.5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="18.5" cy="12" r="1.4" fill="currentColor"/>',
  sparkles: '<path d="M11 3.5l1.7 4.6 4.6 1.7-4.6 1.7L11 16.1l-1.7-4.6-4.6-1.7 4.6-1.7z"/><path d="M18.5 14.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3.5 7l8.5 6 8.5-6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  checklist: '<path d="M11 6.5h9M11 12h9M11 17.5h9"/><path d="M3.5 6.5l1.5 1.5L7.5 5.2M3.5 12l1.5 1.5 2.5-2.8M3.5 17.5l1.5 1.5 2.5-2.8"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c.6-3.8 3.7-6.5 7.5-6.5s6.9 2.7 7.5 6.5"/>',
  pen: '<path d="M4 20h4L19.5 8.5a2.8 2.8 0 0 0-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 13h18"/>',
  graduation: '<path d="M2.5 9.5L12 5l9.5 4.5L12 14z"/><path d="M6.5 11.5v4.3c0 1.4 2.5 2.7 5.5 2.7s5.5-1.3 5.5-2.7v-4.3M21.5 9.5V15"/>',
  award: '<circle cx="12" cy="9" r="5"/><path d="M8.7 12.8L7.5 20.5l4.5-2.6 4.5 2.6-1.2-7.7"/>',
  download: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 20h14"/>',
  alert: '<path d="M10.3 4.3L2.6 17.6A2 2 0 0 0 4.3 20.6h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0z"/><path d="M12 9.5v4"/><circle cx="12" cy="16.8" r="0.6" fill="currentColor"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.4c-.6.3-1 .8-1 1.5v.7"/><circle cx="12" cy="16.9" r="0.6" fill="currentColor"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
  bolt: '<path d="M13 2.5L4.5 13.5h6.5l-1 8 8.5-11h-6.5z"/>',
  external: '<path d="M14 4h6v6M20 4l-8.5 8.5"/><path d="M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/>',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  arrowLeft: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  arrowUp: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  arrowDown: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 12a2 2 0 0 0 2 1.8h6a2 2 0 0 0 2-1.8L18 7"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
  wand: '<path d="M4 20L15 9"/><path d="M14 4l1 2.5L17.5 7.5 15 8.5 14 11l-1-2.5L10.5 7.5 13 6.5z"/><path d="M19 13l.6 1.4L21 15l-1.4.6L19 17l-.6-1.4L17 15l1.4-.6z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  archive: '<rect x="3" y="4" width="18" height="5" rx="1.6"/><path d="M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9M10 13h4"/>',
  chevronLeft: '<path d="M14.5 6.5L9 12l5.5 5.5"/>',
  chevronRight: '<path d="M9.5 6.5L15 12l-5.5 5.5"/>',
  chevronDown: '<path d="M6.5 9.5l5.5 5.5 5.5-5.5"/>',
  bulb: '<path d="M9.5 18h5M10.5 21h3"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.6.4.9 1.1.9 1.8v.4h5.4v-.4c0-.7.3-1.4.9-1.8A6 6 0 0 0 12 3z"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="M8 12.3l2.8 2.8L16.3 9.5"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2.2"/><path d="M16 8V6.2A2.2 2.2 0 0 0 13.8 4H6.2A2.2 2.2 0 0 0 4 6.2v7.6A2.2 2.2 0 0 0 6.2 16H8"/>',
  filter: '<path d="M4 5h16l-6.2 7.5V19l-3.6-1.8v-4.7z"/>',
};

function iconSvg(name) {
  const fill = name === 'heart-filled';
  const body = ICON_PATHS[fill ? 'heart' : name] || '';
  return `<svg class="ic${fill ? ' ic-fill' : ''}" viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" fill="${fill ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}

// An icon as an element, to put in el(…) children.
function icon(name) {
  const span = document.createElement('span');
  span.className = 'ic-wrap';
  span.innerHTML = iconSvg(name);
  return span.firstChild;
}

// Static pages: <span data-icon="search"></span> becomes the icon.
function drawIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((e) => {
    e.innerHTML = iconSvg(e.dataset.icon);
    e.removeAttribute('data-icon');
  });
}
