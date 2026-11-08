import { SCENARIOS, DIFFICULTY, UNIT_TYPES, PROLOGUE } from './data.js';
import { romeSpecs, applyResult, modsOf } from './state.js';
import { ORIGINS, RECOMMENDED, DEFAULT_NAME, buildCampaign, describe } from './origins.js';
import { Camp, totalMen } from './camp.js';
import { BattleUI } from './battleui.js';
import { renderMap } from './map.js';
import { artSrc, initArt } from './art.js';
import { ask, inform } from './ui.js';
import { Coach } from './coach.js';
import { rewardOptions } from './rewards.js';
import { buildPractice, PRACTICE_OPTIONS, PRACTICE_DEFAULTS } from './practice.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const PRAC_KEY = 'legio_practice_v1';
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
      d.querySelector('[data-a=new]').onclick = () => showOrigins(n);
    }
    el.appendChild(d);
  }
}
function openCampaign(c, n) { campaign = c; campaign.slot = n; camp.msgs = []; camp.sel = c.cohorts[0].id; if (c.prologueDone === false) showBrief(PROLOGUE); else showMap(); }
function toMenu() { show('screen-menu'); refreshMenu(); }
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
function showBrief(scnArg) {
  const c = campaign, scn = scnArg || SCENARIOS[c.scenario];
  if (!scn) return showMap();
  const opening = scn.id === 'prologue';
  const diff = DIFFICULTY[c.difficulty];
  const favMult = c.favour >= 2 ? 0.9 : c.favour <= -2 ? 1.1 : 1, scale = diff.enemyMult * favMult;
  const groups = {};
  [...scn.enemy, ...scn.reinforcements.filter(r => r.side !== 'rome').map(r => r.unit)].forEach(e => { groups[e.type] = (groups[e.type] || 0) + e.men * scale; });
  const total = Object.values(groups).reduce((a, b) => a + b, 0);
  const rnd = (n) => Math.max(0, Math.round(n / 50) * 50);
  const list = Object.entries(groups).map(([t, n]) => c.scouted ? `<li>${UNIT_TYPES[t].name}: <b>${Math.round(n)}</b> men</li>` : `<li>${UNIT_TYPES[t].name}: roughly <b>${rnd(n * 0.75)}-${rnd(n * 1.35)}</b></li>`).join('');
  const rome = totalMen(c);
  $('screen-brief').innerHTML = `<div class="panel-page"><div class="muted">${opening ? 'Opening battle' : `Act ${scn.act} - ${esc(scn.theater)}, ${esc(scn.year)} - Battle ${c.scenario + 1} of ${SCENARIOS.length}${scn.kind === 'named' ? ' - NAMED BATTLE' : ''}`}</div>
    <h2>${esc(scn.name)}</h2><img class="banner" alt="" src="${artSrc('scenario', scn.id, 800, 240, { scn })}"><p>${esc(scn.briefing)}</p>
    <div class="card"><h3>Objective</h3>${esc(scn.objective)}<br><span class="muted small">Time limit ${Math.round(scn.timeLimit / 60)} minutes. A well-ordered withdrawal (keeping at least ${Math.round((0.45 - 0.05 * c.fort) * 100)}% of your men; fortifications lower this) counts as a draw and earns partial spoils.${scn.rewardMult > 1.4 ? ' Historically a dark day for Rome: survival or victory pays handsomely.' : ''}</span></div>
    <div class="row" style="align-items:flex-start;margin-top:12px"><div class="card" style="flex:1"><h3>Your force (${rome} men)</h3><ul>${c.cohorts.map(h => `<li>${esc(h.name)} - ${h.men}</li>`).join('')}</ul></div>
    <div class="card" style="flex:1"><h3>Enemy${c.scouted ? ' (scouted)' : ' (estimated)'} ~${c.scouted ? Math.round(total) : '?'}</h3><ul>${list}</ul>${c.scouted ? '<div class="muted small">Scouts warn that reinforcements may arrive during the battle.</div>' : '<div class="muted small">Without scouts, expect surprises.</div>'}</div></div>
    <p class="muted small">Goodwill ${c.favour}. Fort ${c.fort}. Supplies ${c.supplies}${c.supplies < totalMen(c) / 60 * 2 ? ' - LOW, morale will suffer' : ''}.</p>
    ${opening ? '<p class="small" style="color:var(--gold)">After this fight you will see your army management screen, where you spend days between battles.</p>' : ''}
    <div class="row"><button class="primary" id="go">Deploy</button>${opening ? '<button id="back">Main menu</button>' : '<button id="back">Back to map</button>'}</div></div>`;
  $('go').onclick = () => startBattle(scn);
  $('back').onclick = () => (opening ? toMenu() : showMap());
  show('screen-brief');
}

function startBattle(scn) {
  const c = campaign;
  store.set(preKey(c.slot), c);
  show('screen-battle');
  const low = c.supplies < totalMen(c) / 60 * 2, m = modsOf(c), opening = scn.id === 'prologue';
  battle.start(scn, romeSpecs(c, scn), { difficulty: opening ? 'easy' : c.difficulty, fort: c.fort, favour: c.favour, suppliesLow: low, recovery: m.recovery, moraleBonus: m.morale }, (res) => showResult(res, scn));
  if (opening) startCoach(); else stopCoach();
}

// ----- result -----
function showResult(res, scn) {
  stopCoach(); battle.stop();
  const c = campaign, opening = scn.id === 'prologue', sm = modsOf(c).spoils;
  res.spoils = { gold: Math.round(res.spoils.gold * sm), supplies: Math.round(res.spoils.supplies * sm), recruits: Math.round(res.spoils.recruits * sm) };
  const notes = applyResult(c, res, scn);
  c.cohorts.forEach(h => { h.condition = Math.max(35, h.condition); });
  save();
  const o = res.outcome, title = { victory: 'VICTORY', draw: 'DRAW', defeat: 'DEFEAT' }[o];
  const flavour = { victory: 'The enemy breaks and scatters. The field is yours.', draw: 'Neither side can claim the field, but your legion marches away intact.', defeat: 'The line has broken. You live to fight another day, but the loss is bitter.' }[o];
  const rows = res.rows.map(r => `<tr><td>${esc(r.name)}</td><td>${r.startMen}</td><td>${r.endMen}</td><td>${r.casualties}</td><td>${r.kills}</td><td>+${r.xpGain}</td></tr>`).join('');
  const s = res.spoils, next = SCENARIOS[c.scenario], picks = rewardOptions(c, scn, o);
  $('screen-result').innerHTML = `<div class="panel-page"><img class="banner" alt="" src="${artSrc('outcome', o, 800, 200)}"><div class="big ${o}">${title}</div><p>${flavour}</p>
    <div class="card"><h3>Casualties</h3><table><tr><th>Unit</th><th>Before</th><th>After</th><th>Lost</th><th>Kills</th><th>XP</th></tr>${rows}</table>
    <p class="muted small">Enemy dead: about ${res.enemyDead} of ${res.enemyStart}. Wounded men who can march are counted in the 'after' column.</p></div>
    <div class="card" style="margin-top:12px"><h3>Spoils</h3>${o === 'defeat' ? 'None. The enemy keeps the field; you may try again.' : `+${s.gold} denarii, +${s.supplies} supplies, +${s.recruits} fresh recruits`}</div>
    ${picks.length ? `<div class="card" style="margin-top:12px"><h3>Choose a bonus <span class="pill">pick one</span></h3><div class="ocards">${picks.map((p, i) => `<button class="ocard" data-i="${i}"><b>${esc(p.name)}</b><span class="t">${esc(p.text)}</span></button>`).join('')}</div></div>` : ''}
    ${notes.length ? `<div class="card" style="margin-top:12px"><h3>Dispatches</h3>${notes.map(n => `<div>${esc(n)}</div>`).join('')}</div>` : ''}
    <div class="row" style="margin-top:16px"><button class="primary" id="cont">${opening && o !== 'defeat' ? 'Continue to army management' : o !== 'defeat' && !next ? 'Finish Act I' : opening ? 'Try the opening battle again' : 'Return to the map'}</button><button id="retry">Retry this battle (undo)</button></div></div>`;
  $('cont').onclick = () => { camp.msgs = []; if (opening && o === 'defeat') { const snap = store.get(preKey(c.slot)); if (snap) { campaign = snap; save(); } showBrief(PROLOGUE); return; } camp.note(`After the ${o}, the army makes camp.`); showMap(); if (opening && !c.introShown) { c.introShown = true; save(); showManagementIntro(); } };
  $('retry').onclick = () => { const snap = store.get(preKey(c.slot)); if (snap) { campaign = snap; save(); } if (opening) showBrief(PROLOGUE); else showMap(); };
  if (picks.length) {
    const cont = $('cont'); cont.disabled = true; cont.title = 'Choose a bonus first';
    document.querySelectorAll('#screen-result .ocard').forEach(b => b.onclick = () => { picks[+b.dataset.i].apply(c); save(); document.querySelectorAll('#screen-result .ocard').forEach(x => { x.disabled = true; x.classList.toggle('sel', x === b); }); cont.disabled = false; cont.title = ''; });
  }
  show('screen-result');
}

// ----- opening battle helpers -----
let coach = null;
function startCoach() { stopCoach(); coach = new Coach(battle); coach.start(); }
function stopCoach() { if (coach) { coach.stop(); coach = null; } }
function showManagementIntro() {
  inform('Army management', [
    'This is your <b>campaign map</b>. Each battle is a place on the real map of Gaul; the glowing marker is your next fight.',
    '<b>Make camp</b> to spend days before the battle: drill your cohorts, forage, fortify, recruit, or deal with local nobles. You only have a few days, so choose carefully.',
    'Your <b>background</b> (shown on the map screen) affects how fast wounded men recover, how much your army eats, and how much plunder you win.',
    'Winning or drawing a battle brings spoils, experience and new units. You can always <b>March at once</b> if you are ready.'
  ], 'Begin the campaign');
}

// ----- Your Origins (character creation): one question per screen -----
function showOrigins(slot) {
  const keys = Object.keys(ORIGINS), picks = { ...RECOMMENDED }; let name = DEFAULT_NAME, diff = diffSel.value, step = 0;
  const total = keys.length + 2;               // name, each choice, review
  const root = $('screen-origins');
  const go = (p) => { const c = buildCampaign(p, name, diff); c.slot = slot; campaign = c; save(); store.set(preKey(slot), c); openCampaign(c, slot); };
  const draw = () => {
    const c = buildCampaign(picks, name, diff), d = describe(c);
    const dots = Array.from({ length: total }, (_, i) => `<span class="dot ${i < step ? 'done' : i === step ? 'now' : ''}"></span>`).join('');
    const summary = `<div class="card"><h3>Your starting position</h3><div class="sumtiles">${d.numbers.map(([a2, b2]) => `<div><b>${esc(b2)}</b><span>${esc(a2)}</span></div>`).join('')}</div>${d.lines.map(([a2, b2]) => `<div class="kvl"><span>${esc(a2)}</span><span>${esc(b2)}</span></div>`).join('')}<p class="muted small" style="margin-top:8px">This updates as you choose. Next: a short opening battle, then army management.</p></div>`;
    let main = '';
    if (step === 0) {
      main = `<div class="card"><p class="q">Who are you?</p><p class="muted">You are a Roman officer taking command of a legion on the edge of the Province. You will answer three short questions about your past. Each one changes how your army starts.</p>
        <div class="namerow" style="margin-top:12px"><label for="o-name">Your name</label><input id="o-name" maxlength="28" value="${esc(name)}"></div>
        <div class="namerow" style="margin-top:10px"><label for="o-diff">Difficulty</label><select id="o-diff">${Object.entries(DIFFICULTY).map(([k, v]) => `<option value="${k}" ${k === diff ? 'selected' : ''}>${v.name}</option>`).join('')}</select></div><div class="muted small" style="margin-top:6px">${esc(DIFFICULTY[diff].desc)} Miles is the intended experience.</div></div>
        <div class="card"><p class="muted small">No tutorial needed: your first battle is a small, gentle fight that teaches the basics as you play.</p><div class="row"><button id="o-quick" title="Use the recommended answers and skip the questions">Skip the questions (quick start)</button></div></div>`;
    } else if (step <= keys.length) {
      const k = keys[step - 1], g = ORIGINS[k];
      main = `<div class="card"><p class="q">${esc(g.title)}</p><div class="muted small">${esc(g.blurb)}</div><div class="ocards" style="margin-top:10px">${g.options.map(o => `<button class="ocard ${picks[k] === o.id ? 'sel' : ''}" data-k="${k}" data-id="${o.id}">${RECOMMENDED[k] === o.id ? '<span class="rec">Recommended</span>' : ''}<b>${esc(o.name)}</b><span class="t">${esc(o.text)}</span><ul>${o.fx.map(f => `<li>${esc(f)}</li>`).join('')}</ul></button>`).join('')}</div></div>`;
    } else {
      main = `<div class="card review"><p class="q">Your story</p><div class="muted small">Check your choices. You cannot change them once the campaign begins.</div>
        ${keys.map((k, i) => { const o = ORIGINS[k].options.find(x => x.id === picks[k]); return `<div class="kvl" style="padding:8px 0"><span>${esc(ORIGINS[k].title)}</span><span><b>${esc(o.name)}</b> <button data-edit="${i + 1}" style="padding:2px 8px;margin-left:8px">Change</button></span></div>`; }).join('')}
        <div class="kvl" style="padding:8px 0"><span>Name / difficulty</span><span><b>${esc(name)}</b>, ${esc(DIFFICULTY[diff].name)} <button data-edit="0" style="padding:2px 8px;margin-left:8px">Change</button></span></div></div>`;
    }
    const last = step === total - 1;
    root.innerHTML = `<div class="origins wiz"><header><h2>Your Origins</h2><div class="stepbar">${dots}<span class="muted small">Step ${step + 1} of ${total}</span></div></header>
      <div class="main">${main}<div class="nav"><button id="o-back">${step === 0 ? 'Back to menu' : 'Back'}</button><button class="primary" id="o-next">${last ? 'Begin the campaign' : 'Next'}</button></div></div>
      <div class="col">${step === 0 ? '' : summary}</div></div>`;
    root.querySelectorAll('.ocard').forEach(b2 => b2.onclick = () => { picks[b2.dataset.k] = b2.dataset.id; draw(); });
    root.querySelectorAll('[data-edit]').forEach(b2 => b2.onclick = () => { step = +b2.dataset.edit; draw(); });
    const nm = root.querySelector('#o-name'); if (nm) nm.oninput = (e) => { name = e.target.value; };
    const df = root.querySelector('#o-diff'); if (df) df.onchange = (e) => { diff = e.target.value; draw(); };
    const q = root.querySelector('#o-quick'); if (q) q.onclick = () => go(RECOMMENDED);
    root.querySelector('#o-back').onclick = () => { if (step === 0) toMenu(); else { step--; draw(); } };
    root.querySelector('#o-next').onclick = () => { if (last) go(picks); else { step++; draw(); } };
  };
  draw(); show('screen-origins');
}


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

window.__legio = { get campaign() { return campaign; }, battle, show, store, get coach() { return coach; } };
