// Small shared UI helpers.
export const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// In-page confirmation (artifact frames never show native confirm()). Resolves true/false.
export function ask(message, okLabel = 'Confirm', cancelLabel = 'Cancel') {
  return new Promise((resolve) => {
    const el = document.getElementById('confirm');
    el.classList.remove('hidden');
    el.innerHTML = `<div class="box"><p>${esc(message)}</p><div class="row" style="justify-content:center"><button class="primary" id="c-ok">${esc(okLabel)}</button><button id="c-no">${esc(cancelLabel)}</button></div></div>`;
    const done = (v) => { el.classList.add('hidden'); el.innerHTML = ''; window.removeEventListener('keydown', key, true); resolve(v); };
    const key = (e) => { if (e.key === 'Escape') { e.stopPropagation(); done(false); } };
    window.addEventListener('keydown', key, true);
    el.querySelector('#c-ok').onclick = () => done(true);
    el.querySelector('#c-no').onclick = () => done(false);
  });
}

// One-button information dialog with a bullet list. Resolves when dismissed.
// Re-rendering a screen with innerHTML throws away every scroll position. keepScroll(root) notes where the screen and its scrolling parts
// stand; calling the function it returns after the new HTML is in puts them back, so a click never jumps the view.
const SCROLLERS = ['#ov', '.ulist.scrolls', '.mlist', '.pbody', '.log'];
export function keepScroll(root) {
  const at = { root: root.scrollTop, win: window.scrollY }, parts = {};
  for (const sel of SCROLLERS) { const el = root.querySelector(sel); if (el) parts[sel] = el.scrollTop; }
  return (sameView = true) => {
    root.scrollTop = at.root; if (window.scrollY !== at.win) window.scrollTo(0, at.win);
    if (!sameView) return;
    for (const [sel, top] of Object.entries(parts)) { const el = root.querySelector(sel); if (el) el.scrollTop = top; }
  };
}
export function inform(title, bullets, okLabel = 'Got it') {
  return new Promise((resolve) => {
    const el = document.getElementById('confirm');
    el.classList.remove('hidden');
    el.innerHTML = `<div class="box" style="text-align:left"><h3 style="color:var(--gold);margin:0 0 8px">${esc(title)}</h3><ul style="margin:0 0 14px;padding-left:20px;line-height:1.5">${bullets.map(b => `<li>${b}</li>`).join('')}</ul><div class="row" style="justify-content:center"><button class="primary" id="c-ok">${esc(okLabel)}</button></div></div>`;
    el.querySelector('#c-ok').onclick = () => { el.classList.add('hidden'); el.innerHTML = ''; resolve(); };
  });
}
