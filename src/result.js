// The screen after a battle, laid out in a fixed order so it reads the same every time:
//   the outcome and a row of numbers; any decisions waiting (prisoners, a bonus); then tabs for the detail
//   (what happened, your units, honours, the replay, dispatches). Nothing is shown that has nothing in it.
import { esc } from './ui.js';
import { reportParts } from './report.js';
import { replayHtml, mountReplay } from './replay.js';
import { DECORATIONS } from './heroes.js';

const TITLE = { victory: 'Victory', draw: 'Draw', defeat: 'Defeat' };
const tile = (big, small, cls = '') => `<div class="rtile ${cls}"><b>${big}</b><span>${small}</span></div>`;

export function resultHtml({ res, o, flavour, banner, spoils, mid, practice, picks = [], pris = [], notes = [], contLabel, extraButtons = '' }) {
  const lost = res.rows.reduce((a, r) => a + r.casualties, 0), start = res.rows.reduce((a, r) => a + r.startMen, 0) || 1;
  const kills = res.rows.reduce((a, r) => a + r.kills, 0), mm = `${Math.floor(res.time / 60)}:${String(Math.floor(res.time % 60)).padStart(2, '0')}`;
  const tiles = [
    tile(mm, 'of fighting'),
    tile(`${lost}`, `your men lost (${Math.round(100 * lost / start)}%)`, lost / start > 0.3 ? 'bad' : ''),
    tile(`${res.enemyDead}`, `of ${res.enemyStart} enemy fell`, 'good'),
    res.prisoners ? tile(`${res.prisoners}`, 'prisoners taken') : '',
    !practice && !mid && o !== 'defeat' ? tile(`+${spoils.gold}`, `denarii, +${spoils.supplies} supplies, +${spoils.recruits} recruits`) : ''
  ].join('');
  const decisions = [
    pris.length ? `<div class="rdec" id="pris"><h4>${res.prisoners} prisoners: what is to be done with them?</h4><div class="rchoices">${pris.map((p, i) => `<button class="ocard" data-p="${i}"><b>${esc(p.name)}</b><span class="t">${esc(p.text)}</span></button>`).join('')}</div></div>` : '',
    picks.length ? `<div class="rdec" id="bonus"><h4>Choose a bonus</h4><div class="rchoices">${picks.map((p, i) => `<button class="ocard" data-i="${i}"><b>${esc(p.name)}</b><span class="t">${esc(p.text)}</span></button>`).join('')}</div></div>` : ''
  ].join('');
  const rp = reportParts(res), honours = res.honours || [], proms = res.promotions || [];
  const sect = (title, items) => items.length ? `<section class="rsect"><h4>${title}</h4><ul>${items.map(x => `<li>${x}</li>`).join('')}</ul></section>` : '';
  const what = rp ? `<div class="rgrid"><div>${rp.chart}</div><div>${sect('How the fight turned', rp.P.turn)}${rp.P.lesson.length ? `<div class="rlesson"><b>Lesson.</b> ${rp.P.lesson[0]}</div>` : ''}</div></div>
      <div class="rgrid2">${sect('How your army fought', rp.P.yours)}${sect('What the enemy did', rp.P.enemy)}${sect('Conditions', rp.P.cond)}</div>
      ${rp.moments.length ? `<details class="rmoments"><summary>Key moments (${rp.moments.length})</summary><div class="rmlist">${rp.moments.map(m => `<div><span class="muted">${m.t}</span> ${m.html}</div>`).join('')}</div></details>` : ''}` : '<p class="muted">No report.</p>';
  const units = `<table class="rtable"><tr><th>Unit</th><th>Before</th><th>After</th><th>Lost</th><th>Kills</th>${practice ? '' : '<th>Experience</th>'}</tr>${res.rows.map(r => `<tr${r.routed ? ' class="routed"' : ''}><td>${esc(r.name)}${r.routed ? ' <span class="muted small">(broke)</span>' : ''}</td><td>${r.startMen}</td><td>${r.endMen}</td><td>${r.casualties}</td><td>${r.kills}</td>${practice ? '' : `<td>+${r.xpGain}</td>`}</tr>`).join('')}</table>
    <p class="muted small">Wounded men who can still march are counted in the "after" column.</p>`;
  const hon = `${honours.length ? `<div class="rhon">${honours.map(h => `<div class="rmedal"><div class="medal m-${h.key}"></div><div><b>${esc(h.hero)}</b> of ${esc(h.unit)}<div class="small"><b>${esc(h.name)}</b>: ${esc(h.why)}</div><div class="small muted">${esc(DECORATIONS[h.key].text)}</div></div></div>`).join('')}</div>` : '<p class="muted">No decorations were awarded for this fight.</p>'}
    ${proms.length ? `<h4 class="sect">Promoted from the ranks</h4>${proms.map(p => `<div>${esc(p.name)} of ${esc(p.unit)} takes the place of ${esc(p.fallen)} as ${esc(p.rank)}.</div>`).join('')}` : ''}
    <p class="small muted" style="margin-top:8px">Each decoration adds 1 to its cohort's morale (up to 5). See a cohort's men in its record at camp.</p>`;
  const tabs = [['what', 'What happened', what], ['units', 'Your units', units], practice ? null : ['honours', `Honours${honours.length ? ` (${honours.length})` : ''}`, hon], ['replay', 'Replay', replayHtml(res)], notes.length ? ['notes', `Dispatches (${notes.length})`, notes.map(n => `<div class="rnote">${esc(n)}</div>`).join('')] : null].filter(Boolean);
  return `<div class="panel-page result">
    <div class="rhead"><img class="banner" alt="" src="${banner}"><div class="rtitle ${o}">${TITLE[o]}</div><p>${esc(flavour)}</p></div>
    <div class="rtiles">${tiles}</div>
    ${decisions ? `<div class="card rdecs">${decisions}</div>` : ''}
    <div class="rtabs" role="tablist">${tabs.map((t, i) => `<button role="tab" class="rtab ${i ? '' : 'on'}" data-tab="${t[0]}">${t[1]}</button>`).join('')}</div>
    ${tabs.map((t, i) => `<div class="rpanel card ${i ? 'hidden' : ''}" data-panel="${t[0]}">${t[2]}</div>`).join('')}
    <div class="row rfoot"><button class="primary" id="cont">${contLabel}</button>${extraButtons}</div></div>`;
}
// Tabs, the replay and the decisions. onDecide(kind, index) is called for each choice; the continue button opens when every decision is made.
export function mountResult(root, res, { picks = [], pris = [], onPick, onPris } = {}) {
  let stopReplay = null;
  root.querySelectorAll('.rtab').forEach(b => b.onclick = () => {
    root.querySelectorAll('.rtab').forEach(x => x.classList.toggle('on', x === b));
    root.querySelectorAll('.rpanel').forEach(p => p.classList.toggle('hidden', p.dataset.panel !== b.dataset.tab));
    if (b.dataset.tab === 'replay' && !stopReplay) stopReplay = mountReplay(root, res);
  });
  const cont = root.querySelector('#cont'); let need = (picks.length ? 1 : 0) + (pris.length ? 1 : 0);
  if (need) { cont.disabled = true; cont.title = 'Make your choices above first'; }
  const done = () => { if (--need <= 0) { cont.disabled = false; cont.title = ''; } };
  const wire = (sel, attr, fn) => root.querySelectorAll(`${sel} .ocard`).forEach(b => b.onclick = () => { fn(+b.dataset[attr]); root.querySelectorAll(`${sel} .ocard`).forEach(x => { x.disabled = true; x.classList.toggle('sel', x === b); }); done(); });
  wire('#bonus', 'i', (i) => onPick && onPick(i)); wire('#pris', 'p', (i) => onPris && onPris(i));
  return () => stopReplay && stopReplay();
}
