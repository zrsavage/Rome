// A small set of line icons (24-unit grid, drawn in the current text colour) for the HUD, the camp and map headers, and the command bar.
const P = {
  coin: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5.6"/><path d="M10 14.6c.6.6 1.3.9 2 .9 1.2 0 2-.7 2-1.6 0-2.2-3.8-1.2-3.8-3.4 0-.9.8-1.6 1.9-1.6.7 0 1.3.3 1.7.7"/>',
  grain: '<path d="M12 21V8"/><path d="M12 8c-2.5-.5-3.5-2.5-3.5-4.5 2.5 0 3.5 2 3.5 4.5zM12 8c2.5-.5 3.5-2.5 3.5-4.5-2.5 0-3.5 2-3.5 4.5zM12 13c-2.5-.5-3.5-2.5-3.5-4.5 2.5 0 3.5 2 3.5 4.5zM12 13c2.5-.5 3.5-2.5 3.5-4.5-2.5 0-3.5 2-3.5 4.5zM12 18c-2.5-.5-3.5-2.5-3.5-4.5 2.5 0 3.5 2 3.5 4.5zM12 18c2.5-.5 3.5-2.5 3.5-4.5-2.5 0-3.5 2-3.5 4.5z"/>',
  day: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1"/>',
  helmet: '<path d="M4 16a8 8 0 0116 0v3H4z"/><path d="M12 8V4.5M9 19v2.5M15 19v2.5"/><path d="M4 16h16"/>',
  fort: '<path d="M3 20h18"/><path d="M4 20V9l2-3 2 3v11M10 20V7l2-3 2 3v13M16 20V9l2-3 2 3v11"/>',
  laurel: '<path d="M8 20C4 17 4 9 8 5M16 20c4-3 4-11 0-15"/><path d="M6 9l2-1M5.5 13l2.2-.3M7 17l2-1.5M18 9l-2-1M18.5 13l-2.2-.3M17 17l-2-1.5"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  play: '<path d="M8 5l11 7-11 7z" fill="currentColor"/>',
  retreat: '<path d="M20 12H6M11 6.5L5.5 12l5.5 5.5"/><path d="M20 6v12"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5c0-1.5 1-2.5 2.5-2.5s2.5 1 2.5 2.4c0 2-2.5 2-2.5 4M12 17v.2"/>',
  hold: '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M12 8v8M9 12h6"/>',
  defend: '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><circle cx="12" cy="12" r="2.6"/>',
  fallback: '<path d="M13 6l-6 6 6 6M19 6l-6 6 6 6"/>',
  sprint: '<path d="M5 6l6 6-6 6M11 6l6 6-6 6"/>',
  guard: '<path d="M8 5l4 1.5V11c0 3-2 5-4 6-2-1-4-3-4-6V6.5z"/><path d="M16 9l4 1.5V15c0 3-2 5-4 6"/>',
  holdfire: '<path d="M7 4c8 3 8 13 0 16"/><path d="M7 4v16M3 12h12"/><path d="M4 4l16 16"/>',
  testudo: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M9 6v12M15 6v12M3 12h18"/>',
  wedge: '<path d="M12 3L21 20H3z"/><path d="M12 9v6"/>',
  orbis: '<circle cx="12" cy="12" r="6"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
  relieve: '<path d="M4 8h14M14 4l4 4-4 4M20 16H6M10 12l-4 4 4 4"/>',
  pursue: '<path d="M3 12h13M12 7l5 5-5 5"/><path d="M3 7h6M3 17h6"/>',
  rally: '<path d="M6 21V4M6 5h12l-3 4 3 4H6"/>',
  general: '<path d="M12 3l2.4 5.2 5.6.6-4.2 3.8 1.2 5.6L12 15.4 7 18.2l1.2-5.6L4 8.8l5.6-.6z"/>',
  swords: '<path d="M5 5l14 14M19 5L5 19"/><path d="M4 8l4-4M16 20l4-4M20 8l-4-4M8 20l-4-4"/>',
  tent: '<path d="M2 20L12 4l10 16z"/><path d="M12 20l-3-7h6z"/>'
};
export const icon = (name, size = 16, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;
export const iconPaths = P;
