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
export function inform(title, bullets, okLabel = 'Got it') {
  return new Promise((resolve) => {
    const el = document.getElementById('confirm');
    el.classList.remove('hidden');
    el.innerHTML = `<div class="box" style="text-align:left"><h3 style="color:var(--gold);margin:0 0 8px">${esc(title)}</h3><ul style="margin:0 0 14px;padding-left:20px;line-height:1.5">${bullets.map(b => `<li>${b}</li>`).join('')}</ul><div class="row" style="justify-content:center"><button class="primary" id="c-ok">${esc(okLabel)}</button></div></div>`;
    el.querySelector('#c-ok').onclick = () => { el.classList.add('hidden'); el.innerHTML = ''; resolve(); };
  });
}
