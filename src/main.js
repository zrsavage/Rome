import { SCENARIOS, DIFFICULTY, UNIT_TYPES } from './data.js';
import { newCampaign, romeSpecs, applyResult } from './state.js';
import { Camp, totalMen } from './camp.js';
import { BattleUI } from './battleui.js';
import { renderMap } from './map.js';
import { artSrc, initArt } from './art.js';
import { ask } from './ui.js';
import { Tutorial } from './tutorial.js';
import { buildTutorial, buildPractice, PRACTICE_OPTIONS, PRACTICE_DEFAULTS } from './practice.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const TUT_KEY = 'legio_tutorial_done', PRAC_KEY = 'legio_practice_v1';
const SLOTS = 3, key = (n) => `legio_slot_${n}_v2`, preKey = (n) => `legio_pre_${n}_v2`;
let campaign = null;

function show(id) { document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id)); }
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } }
};
const save = () => { if (campaign) store.set(key(campaign.slot), campaign); };

const camp = new Camp($('screen-camp'), { save, map: () => showMap(), march: () => showBrief() });
const battle = new BattleUI();

// ----- menu with save slots -----
const diffSel = $('diff');
diffSel.innerHTML = Object.entries(DIFFICULTY).map(([k, d]) => `<option value="${k}" ${k === 'normal' ? 'selected' : ''}>${d.name}</option>`).join('');
const diffDesc = () => { $('diff-desc').textContent = DIFFICULTY[diffSel.value].desc; };
diffSel.onchange = diffDesc; diffDesc();

function refreshMenu() {
  const el = $('slots'); el.innerHTML = '';
  for (let n = 1; n <= SLOTS; n++) {
    const c = store.get(key(n)), d = document.createElement('div'); d.className = 'slot';
    if (c) {
      const scn = SCENARIOS[c.scenario];
      d.innerHTML = `<div><b>Slot ${n}</b> - ${esc(DIFFICULTY[c.difficulty].name)}<small>${scn ? `Battle ${c.scenario + 1}/${SCENARIOS.length}: ${esc(scn.name)}` : 'Act I complete'} - ${totalMen(c)} men - day ${c.day}</small></div>
        <div class="row"><button class="primary" data-a="load">Continue</button><button data-a="del">Delete</button></div>`;
      d.querySelector('[data-a=load]').onclick = () => openCampaign(c, n);
      d.querySelector('[data-a=del]').onclick = async () => { if (await ask(`Delete the campaign in slot ${n}? This cannot be undone.`, 'Delete', 'Keep')) { store.del(key(n)); store.del(preKey(n)); refreshMenu(); } };
    } else {
      d.innerHTML = `<div><b>Slot ${n}</b><small>Empty</small></div><button class="primary" data-a="new">New Campaign</button>`;
      d.querySelector('[data-a=new]').onclick = () => { const c2 = newCampaign(diffSel.value); openCampaign(c2, n); save(); };
    }
    el.appendChild(d);
  }
}
function openCampaign(c, n) { campaign = c; campaign.slot = n; camp.msgs = []; camp.sel = c.cohorts[0].id; showMap(); }
function toMenu() { show('screen-menu'); refreshMenu(); $('tut-hint').classList.toggle('hidden', !!store.get(TUT_KEY)); }
refreshMenu();
initArt().then(() => { /* real art, if any, is picked up on the next render */ });

// ----- map -----
function showMap() {
  renderMap($('screen-map'), campaign, {
    camp: () => { camp.show(campaign); show('screen-camp'); },
    march: () => showBrief(),
    menu: () => toMenu(),
    undo: async () => { const snap = store.get(preKey(campaign.slot)); if (snap && await ask('Restore the army to how it was before the last battle?', 'Restore', 'Cancel')) { campaign = snap; save(); showMap(); } }
  });
  show('screen-map');
}

// ----- briefing -----
function showBrief() {
  const c = campaign, scn = SCENARIOS[c.scenario];
  if (!scn) return showMap();
  const diff = DIFFICULTY[c.difficulty];
  const favMult = c.favour >= 2 ? 0.9 : c.favour <= -2 ? 1.1 : 1, scale = diff.enemyMult * favMult;
  const groups = {};
  [...scn.enemy, ...scn.reinforcements.filter(r => r.side !== 'rome').map(r => r.unit)].forEach(e => { groups[e.type] = (groups[e.type] || 0) + e.men * scale; });
  const total = Object.values(groups).reduce((a, b) => a + b, 0);
  const rnd = (n) => Math.max(0, Math.round(n / 50) * 50);
  const list = Object.entries(groups).map(([t, n]) => c.scouted ? `<li>${UNIT_TYPES[t].name}: <b>${Math.round(n)}</b> men</li>` : `<li>${UNIT_TYPES[t].name}: roughly <b>${rnd(n * 0.75)}-${rnd(n * 1.35)}</b></li>`).join('');
  const rome = totalMen(c);
  $('screen-brief').innerHTML = `<div class="panel-page"><div class="muted">Act ${scn.act} - ${esc(scn.theater)}, ${esc(scn.year)} - Battle ${c.scenario + 1} of ${SCENARIOS.length}${scn.kind === 'named' ? ' - NAMED BATTLE' : ''}</div>
    <h2>${esc(scn.name)}</h2><img class="banner" alt="" src="${artSrc('scenario', scn.id, 800, 240, { scn })}"><p>${esc(scn.briefing)}</p>
    <div class="card"><h3>Objective</h3>${esc(scn.objective)}<br><span class="muted small">Time limit ${Math.round(scn.timeLimit / 60)} minutes. A well-ordered withdrawal (keeping at least ${Math.round((0.45 - 0.05 * c.fort) * 100)}% of your men; fortifications lower this) counts as a draw and earns partial spoils.${scn.rewardMult > 1.4 ? ' Historically a dark day for Rome: survival or victory pays handsomely.' : ''}</span></div>
    <div class="row" style="align-items:flex-start;margin-top:12px"><div class="card" style="flex:1"><h3>Your force (${rome} men)</h3><ul>${c.cohorts.map(h => `<li>${esc(h.name)} - ${h.men}</li>`).join('')}</ul></div>
    <div class="card" style="flex:1"><h3>Enemy${c.scouted ? ' (scouted)' : ' (estimated)'} ~${c.scouted ? Math.round(total) : '?'}</h3><ul>${list}</ul>${c.scouted ? '<div class="muted small">Scouts warn that reinforcements may arrive during the battle.</div>' : '<div class="muted small">Without scouts, expect surprises.</div>'}</div></div>
    <p class="muted small">Goodwill ${c.favour}. Fort ${c.fort}. Supplies ${c.supplies}${c.supplies < totalMen(c) / 60 * 2 ? ' - LOW, morale will suffer' : ''}.</p>
    <div class="row"><button class="primary" id="go">Deploy</button><button id="back">Back to map</button></div></div>`;
  $('go').onclick = () => startBattle(scn);
  $('back').onclick = () => showMap();
  show('screen-brief');
}

function startBattle(scn) {
  const c = campaign;
  store.set(preKey(c.slot), c);
  show('screen-battle');
  const low = c.supplies < totalMen(c) / 60 * 2;
  battle.start(scn, romeSpecs(c, scn), { difficulty: c.difficulty, fort: c.fort, favour: c.favour, suppliesLow: low }, (res) => showResult(res, scn));
}

// ----- result -----
function showResult(res, scn) {
  battle.stop();
  const c = campaign;
  const notes = applyResult(c, res, scn);
  c.cohorts.forEach(h => { h.condition = Math.max(35, h.condition); });
  save();
  const o = res.outcome, title = { victory: 'VICTORY', draw: 'DRAW', defeat: 'DEFEAT' }[o];
  const flavour = { victory: 'The enemy breaks and scatters. The field is yours.', draw: 'Neither side can claim the field, but your legion marches away intact.', defeat: 'The line has broken. You live to fight another day, but the loss is bitter.' }[o];
  const rows = res.rows.map(r => `<tr><td>${esc(r.name)}</td><td>${r.startMen}</td><td>${r.endMen}</td><td>${r.casualties}</td><td>${r.kills}</td><td>+${r.xpGain}</td></tr>`).join('');
  const s = res.spoils, next = SCENARIOS[c.scenario];
  $('screen-result').innerHTML = `<div class="panel-page"><img class="banner" alt="" src="${artSrc('outcome', o, 800, 200)}"><div class="big ${o}">${title}</div><p>${flavour}</p>
    <div class="card"><h3>Casualties</h3><table><tr><th>Unit</th><th>Before</th><th>After</th><th>Lost</th><th>Kills</th><th>XP</th></tr>${rows}</table>
    <p class="muted small">Enemy dead: about ${res.enemyDead} of ${res.enemyStart}. Wounded men who can march are counted in the 'after' column.</p></div>
    <div class="card" style="margin-top:12px"><h3>Spoils</h3>${o === 'defeat' ? 'None. The enemy keeps the field; you may try again.' : `+${s.gold} denarii, +${s.supplies} supplies, +${s.recruits} fresh recruits`}</div>
    ${notes.length ? `<div class="card" style="margin-top:12px"><h3>Dispatches</h3>${notes.map(n => `<div>${esc(n)}</div>`).join('')}</div>` : ''}
    <div class="row" style="margin-top:16px"><button class="primary" id="cont">${o !== 'defeat' && !next ? 'Finish Act I' : 'Return to the map'}</button><button id="retry">Retry this battle (undo)</button></div></div>`;
  $('cont').onclick = () => { camp.msgs = []; camp.note(`After the ${o}, the army makes camp.`); showMap(); };
  $('retry').onclick = () => { const snap = store.get(preKey(c.slot)); if (snap) { campaign = snap; save(); } showMap(); };
  show('screen-result');
}

// test hooks for automated checks



// ===== tutorial =====
let tutorial = null;
function startTutorial() {
  const { scn, campaign: c } = buildTutorial();
  show('screen-battle');
  tutorial = new Tutorial(battle, { onExit: () => { stopTutorial(); battle.stop(); toMenu(); } });
  battle.start(scn, romeSpecs(c, scn), { difficulty: 'easy', seed: 7 }, (res) => tutorialDone(res));
  tutorial.start();
}
function stopTutorial() { if (tutorial) { tutorial.stop(); tutorial = null; } }
function tutorialDone(res) {
  stopTutorial(); battle.stop(); store.set(TUT_KEY, true);
  const o = res.outcome;
  $('screen-result').innerHTML = `<div class="panel-page"><img class="banner" alt="" src="${artSrc('outcome', o, 800, 200)}"><div class="big ${o}">${o === 'defeat' ? 'TRY AGAIN' : 'WELL FOUGHT'}</div>
    <p>${o === 'defeat' ? 'Your line broke in the training ground. Hold the line, use your slingers and hit the flanks, then try again.' : 'You have the basics: orders, battle lines, pause and plan, formations, flanking and morale. Out in Gaul the Gauls will not wait for you.'}</p>
    <div class="row" style="margin-top:16px"><button class="primary" id="t-menu">Start a campaign</button><button id="t-prac">Practice battle</button><button id="t-again">Replay tutorial</button></div></div>`;
  $('t-menu').onclick = () => toMenu(); $('t-prac').onclick = () => showPractice(); $('t-again').onclick = () => startTutorial();
  show('screen-result');
}
$('btn-tutorial').onclick = () => startTutorial();

// ===== practice battle =====
function showPractice() {
  const o = { ...PRACTICE_DEFAULTS, ...(store.get(PRAC_KEY) || {}) };
  const sel = (id, label) => `<label for="${id}">${label}</label><select id="${id}">${Object.entries(PRACTICE_OPTIONS[id.replace('p-', '')]).map(([k, v]) => `<option value="${k}" ${o[id.replace('p-', '')] === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select>`;
  $('screen-practice').innerHTML = `<div class="panel-page"><h2>Practice Battle</h2><p class="muted">A free sandbox. Nothing here touches your campaign: no rewards, no losses, no saves. Try new tactics against any enemy.</p>
    <div class="pform">${sel('p-army', 'Your army')}${sel('p-enemy', 'Enemy force')}${sel('p-terrain', 'Terrain')}${sel('p-tactics', 'Enemy tactics')}${sel('p-difficulty', 'Difficulty')}</div>
    <div class="row"><button class="primary" id="p-go">Begin battle</button><button id="p-back">Back</button></div></div>`;
  $('p-go').onclick = () => { const v = {}; for (const k of Object.keys(PRACTICE_DEFAULTS)) v[k] = $('p-' + k).value; store.set(PRAC_KEY, v); startPractice(v); };
  $('p-back').onclick = () => toMenu();
  show('screen-practice');
}
function startPractice(v) {
  const { scn, campaign: c, opts } = buildPractice(v);
  show('screen-battle');
  battle.start(scn, romeSpecs(c, scn), { difficulty: opts.difficulty, fort: 0, favour: 0 }, (res) => practiceResult(res, v));
}
function practiceResult(res, v) {
  battle.stop();
  const o = res.outcome, title = { victory: 'VICTORY', draw: 'DRAW', defeat: 'DEFEAT' }[o];
  const rows = res.rows.map(r => `<tr><td>${esc(r.name)}</td><td>${r.startMen}</td><td>${r.endMen}</td><td>${r.casualties}</td><td>${r.kills}</td></tr>`).join('');
  $('screen-result').innerHTML = `<div class="panel-page"><img class="banner" alt="" src="${artSrc('outcome', o, 800, 200)}"><div class="big ${o}">${title}</div>
    <p class="muted">Practice battle: nothing is saved. Time ${Math.floor(res.time / 60)}:${String(Math.floor(res.time % 60)).padStart(2, '0')}. Enemy dead about ${res.enemyDead} of ${res.enemyStart}.</p>
    <div class="card"><h3>Your units</h3><table><tr><th>Unit</th><th>Before</th><th>After</th><th>Lost</th><th>Kills</th></tr>${rows}</table></div>
    <div class="row" style="margin-top:16px"><button class="primary" id="r-again">Fight again</button><button id="r-setup">Change setup</button><button id="r-menu">Main menu</button></div></div>`;
  $('r-again').onclick = () => startPractice(v); $('r-setup').onclick = () => showPractice(); $('r-menu').onclick = () => toMenu();
  show('screen-result');
}
$('btn-practice').onclick = () => showPractice();
$('tut-hint').classList.toggle('hidden', !!store.get(TUT_KEY));

window.__legio = { get campaign() { return campaign; }, battle, show, store, get tutorial() { return tutorial; } };
