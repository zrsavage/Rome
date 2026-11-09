import { SCENARIOS, DIFFICULTY, UNIT_TYPES, PROLOGUE } from './data.js';
import { romeSpecs, applyResult, modsOf, forceScale } from './state.js';
import { ORIGINS, DEFAULT_NAME, buildCampaign, describe } from './origins.js';
import { Camp, totalMen } from './camp.js';
import { BattleUI } from './battleui.js';
import { renderMap } from './map.js';
import { artSrc, initArt } from './art.js';
import { ask, inform } from './ui.js';
import { reportHtml } from './report.js';
import { pickWeather, WEATHER } from './weather.js';
import { snapshot, backups, restoreBackup, clearBackups, exportCampaign, parseImport } from './saves.js';
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

const marchGuard = async () => { const n = (campaign && campaign.manpower) || 0; if (n > 0 && !(await ask(`You have ${n} soldiers waiting at camp who are not assigned to any unit. March without them?`, 'March anyway', 'Assign them first'))) return; showBrief(); };
const camp = new Camp($('screen-camp'), { save, map: () => showMap(), march: () => marchGuard() });
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
        <div class="row"><button class="primary" data-a="load">Continue</button><button data-a="exp" title="Download this campaign as a file">Export</button><button data-a="bak" title="Rolling backups taken after each battle and at camp">Backups</button><button data-a="del">Delete</button></div>`;
      d.querySelector('[data-a=exp]').onclick = () => exportCampaign(c);
      d.querySelector('[data-a=bak]').onclick = () => showBackups(n);
      d.querySelector('[data-a=load]').onclick = () => openCampaign(c, n);
      d.querySelector('[data-a=del]').onclick = async () => { if (await ask(`Delete the campaign in slot ${n}? This cannot be undone.`, 'Delete', 'Keep')) { store.del(key(n)); store.del(preKey(n)); clearBackups(n); refreshMenu(); } };
    } else {
      d.innerHTML = `<div><b>Slot ${n}</b><small>Empty</small></div><button class="primary" data-a="new">New Campaign</button>`;
      d.querySelector('[data-a=new]').onclick = () => showOrigins(n);
    }
    el.appendChild(d);
  }
}
// A list of rolling backups for a slot, newest first, each restorable.
function showBackups(n) {
  const list = backups(n), el = $('confirm'); el.classList.remove('hidden');
  const when = (t) => new Date(t).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  el.innerHTML = `<div class="box" style="text-align:left;max-width:560px"><h3 style="color:var(--gold);margin:0 0 6px">Backups: slot ${n}</h3><p class="muted small" style="margin:0 0 10px">A backup is kept after every battle and when you make camp (up to 6 are kept). Restoring replaces the slot's current campaign.</p>
    ${list.length ? `<div style="max-height:320px;overflow:auto">${list.map(b => `<div class="row" style="justify-content:space-between;border-bottom:1px solid var(--line);padding:6px 0"><div><b>${esc(b.why)}</b><div class="small muted">${esc(when(b.t))} - ${esc(b.summary)}</div></div><button data-i="${b.i}">Restore</button></div>`).join('')}</div>` : '<p>No backups yet. They are made after your first campaign battle.</p>'}
    <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="primary" id="bk-close">Close</button></div></div>`;
  el.querySelector('#bk-close').onclick = () => { el.classList.add('hidden'); el.innerHTML = ''; };
  el.querySelectorAll('[data-i]').forEach(b => b.onclick = async () => {
    const c = restoreBackup(n, +b.dataset.i); if (!c) return;
    if (!(await ask(`Restore this backup into slot ${n}? The current campaign in the slot will be replaced.`, 'Restore', 'Cancel'))) { showBackups(n); return; }
    store.set(key(n), c); el.classList.add('hidden'); el.innerHTML = ''; refreshMenu();
  });
}
// Import a campaign file into the first empty slot (or a slot you choose to overwrite).
async function importSave(file) {
  let c; try { c = parseImport(await file.text()); } catch (e) { await inform('Could not import', [e.message]); return; }
  let n = [1, 2, 3].find(i => !store.get(key(i)));
  if (!n) { if (!(await ask('All three slots are in use. Import over slot 3?', 'Replace slot 3', 'Cancel'))) return; n = 3; }
  c.slot = n; store.set(key(n), c); snapshot(n, c, 'Imported'); refreshMenu();
  await inform('Campaign imported', [`Loaded into slot ${n}: ${(c.player && c.player.name) || 'your commander'}, battle ${Math.min(c.scenario + 1, SCENARIOS.length)}.`]);
}
$('btn-import').onclick = () => $('file-import').click();
$('file-import').onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) importSave(f); };
function openCampaign(c, n) { campaign = c; campaign.slot = n; camp.msgs = []; camp.sel = c.cohorts[0].id; if (c.prologueDone === false) showBrief(PROLOGUE); else showMap(); }
function toMenu() { show('screen-menu'); refreshMenu(); }
refreshMenu();
initArt().then(() => { /* real art, if any, is picked up on the next render */ });

// ----- map -----
function showMap() {
  renderMap($('screen-map'), campaign, {
    camp: () => { snapshot(campaign.slot, campaign, 'Entering camp'); camp.show(campaign); show('screen-camp'); },
    march: () => marchGuard(),
    menu: () => toMenu()
  });
  show('screen-map');
}

// ----- briefing -----
function showBrief(scnArg) {
  const c = campaign, scn = scnArg || SCENARIOS[c.scenario];
  if (!scn) return showMap();
  const opening = scn.id === 'prologue';
  const diff = DIFFICULTY[c.difficulty];
  const favMult = c.favour >= 2 ? 0.9 : c.favour <= -2 ? 1.1 : 1, fs = forceScale(c, scn), scale = diff.enemyMult * favMult * (opening ? 1 : 1.1) * fs;
  const groups = {};
  [...scn.enemy, ...scn.reinforcements.filter(r => r.side !== 'rome').map(r => r.unit)].forEach(e => { groups[e.type] = (groups[e.type] || 0) + e.men * scale; });
  const total = Object.values(groups).reduce((a, b) => a + b, 0);
  const rnd = (n) => Math.max(0, Math.round(n / 50) * 50);
  const list = Object.entries(groups).map(([t, n]) => c.scouted ? `<li>${UNIT_TYPES[t].name}: <b>${Math.round(n)}</b> men</li>` : `<li>${UNIT_TYPES[t].name}: roughly <b>${rnd(n * 0.75)}-${rnd(n * 1.35)}</b></li>`).join('');
  const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, '0')}`;
  const waveMap = {}; scn.reinforcements.filter(r => r.side !== 'rome').forEach(r => { const k = Math.round(r.at / 10) * 10; waveMap[k] = (waveMap[k] || 0) + Math.round(r.unit.men * scale); });
  const waveKeys = Object.keys(waveMap).map(Number).sort((x, y) => x - y);
  const waveText = waveKeys.length ? `<div class="small" style="margin-top:6px"><b>Scouts report reinforcements:</b><br>${waveKeys.map(k => `about ${mmss(k)}: ~${Math.round(waveMap[k] / 10) * 10} men`).join('<br>')}<br><span class="muted">If you clear the field early, the next wave comes sooner.</span></div>` : '<div class="muted small">Scouts report no reinforcements.</div>';
  const rome = totalMen(c), wxk = opening ? 'clear' : pickWeather(scn, c), wxo = WEATHER[wxk];
  $('screen-brief').innerHTML = `<div class="panel-page"><div class="muted">${opening ? 'Opening battle' : `Act ${scn.act} - ${esc(scn.theater)}, ${esc(scn.year)} - Battle ${c.scenario + 1} of ${SCENARIOS.length}${scn.kind === 'named' ? ' - NAMED BATTLE' : ''}`}</div>
    <h2>${esc(scn.name)}</h2><img class="banner" alt="" src="${artSrc('scenario', scn.id, 800, 240, { scn })}"><p>${esc(scn.briefing)}</p>
    <div class="card"><h3>Weather: ${esc(wxo.name)}</h3><div class="small">${esc(wxo.text)}</div></div>
    <div class="card" style="margin-top:12px"><h3>Objective</h3>${esc(scn.objective)}<br><span class="muted small">Time limit ${Math.round(scn.timeLimit / 60)} minutes. A well-ordered withdrawal (keeping at least ${Math.round((0.45 - 0.05 * c.fort) * 100)}% of your men; fortifications lower this) counts as a draw and earns partial spoils.${scn.rewardMult > 1.4 ? ' Historically a dark day for Rome: survival or victory pays handsomely.' : ''}</span></div>
    <div class="row" style="align-items:flex-start;margin-top:12px"><div class="card" style="flex:1"><h3>Your force (${rome} men)</h3><ul>${c.cohorts.length > 10 ? Object.entries(c.cohorts.reduce((g, h) => { (g[h.type] = g[h.type] || { n: 0, men: 0 }).n++; g[h.type].men += h.men; return g; }, {})).map(([t, g]) => `<li>${g.n} x ${esc(UNIT_TYPES[t].name)} - ${g.men} men</li>`).join('') : c.cohorts.map(h => `<li>${esc(h.name)} - ${h.men}</li>`).join('')}</ul></div>
    <div class="card" style="flex:1"><h3>Enemy${c.scouted ? ` (scouted) ~${Math.round(total)}` : ' (estimated)'}</h3><ul>${list}</ul>${fs > 1.05 ? '<div class="muted small">The Gauls gather in proportion to the army you bring: the bigger your host, the bigger theirs.</div>' : ''}${c.scouted ? waveText : '<div class="muted small">Without scouts, expect surprises: you will not know how many reinforcements come, or when.</div>'}</div></div>
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
  battle.start(scn, romeSpecs(c, scn), { difficulty: opening ? 'easy' : c.difficulty, fort: c.fort, favour: c.favour, suppliesLow: low, recovery: m.recovery, moraleBonus: m.morale, orders: c.doctrines || [], scouted: !!c.scouted, forceScale: forceScale(c, scn), weather: opening ? 'clear' : pickWeather(scn, c) }, (res) => showResult(res, scn));
  if (opening) startCoach(); else stopCoach();
}

// ----- result -----
function showResult(res, scn) {
  stopCoach(); battle.stop();
  const c = campaign, opening = scn.id === 'prologue', sm = modsOf(c).spoils;
  res.spoils = { gold: Math.round(res.spoils.gold * sm), supplies: Math.round(res.spoils.supplies * sm), recruits: Math.round(res.spoils.recruits * sm) };
  const notes = applyResult(c, res, scn);
  c.cohorts.forEach(h => { h.condition = Math.max(35, h.condition); });
  save(); snapshot(c.slot, c, `After ${scn.name}: ${res.outcome}`);
  const o = res.outcome, title = { victory: 'VICTORY', draw: 'DRAW', defeat: 'DEFEAT' }[o];
  const flavour = { victory: 'The enemy breaks and scatters. The field is yours.', draw: 'Neither side can claim the field, but your legion marches away intact.', defeat: 'The line has broken. You live to fight another day, but the loss is bitter.' }[o];
  const rows = res.rows.map(r => `<tr><td>${esc(r.name)}</td><td>${r.startMen}</td><td>${r.endMen}</td><td>${r.casualties}</td><td>${r.kills}</td><td>+${r.xpGain}</td></tr>`).join('');
  const s = res.spoils, next = SCENARIOS[c.scenario], picks = rewardOptions(c, scn, o);
  $('screen-result').innerHTML = `<div class="panel-page"><img class="banner" alt="" src="${artSrc('outcome', o, 800, 200)}"><div class="big ${o}">${title}</div><p>${flavour}</p>
    <div class="card"><h3>Casualties</h3><table><tr><th>Unit</th><th>Before</th><th>After</th><th>Lost</th><th>Kills</th><th>XP</th></tr>${rows}</table>
    <p class="muted small">Enemy dead: about ${res.enemyDead} of ${res.enemyStart}. Wounded men who can march are counted in the 'after' column.</p></div>
    ${reportHtml(res)}
    <div class="card" style="margin-top:12px"><h3>Spoils</h3>${o === 'defeat' ? 'None. The enemy keeps the field; you may try again.' : `+${s.gold} denarii, +${s.supplies} supplies, +${s.recruits} fresh recruits`}</div>
    ${picks.length ? `<div class="card" style="margin-top:12px"><h3>Choose a bonus <span class="pill">pick one</span></h3><div class="ocards">${picks.map((p, i) => `<button class="ocard" data-i="${i}"><b>${esc(p.name)}</b><span class="t">${esc(p.text)}</span></button>`).join('')}</div></div>` : ''}
    ${notes.length ? `<div class="card" style="margin-top:12px"><h3>Dispatches</h3>${notes.map(n => `<div>${esc(n)}</div>`).join('')}</div>` : ''}
    <div class="row" style="margin-top:16px"><button class="primary" id="cont">${opening && o !== 'defeat' ? 'Continue to army management' : o !== 'defeat' && !next ? 'Finish Act I' : opening ? 'Try the opening battle again' : 'Return to the map'}</button></div></div>`;
  $('cont').onclick = () => { camp.msgs = []; if (opening && o === 'defeat') { const snap = store.get(preKey(c.slot)); if (snap) { campaign = snap; save(); } showBrief(PROLOGUE); return; } camp.note(`After the ${o}, the army makes camp.`); showMap(); if (opening && !c.introShown) { c.introShown = true; save(); showManagementIntro(); } };
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
    '<b>Make camp</b> to spend your few days before the battle. Your camp is a drawn fort: each building is one activity. You start with one building and a new one is built after every battle you win or draw.',
    'Your <b>background</b> (shown on the map screen) affects how fast wounded men recover, how much your army eats, and how much plunder you win.',
    'Winning or drawing a battle brings spoils, experience and new units. You can always <b>March at once</b> if you are ready.'
  ], 'Begin the campaign');
}

// ----- Your Origins (character creation): one question per screen -----
function showOrigins(slot) {
  const keys = Object.keys(ORIGINS), picks = {}; let name = DEFAULT_NAME, diff = diffSel.value, step = 0;
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
        <div class="card"><p class="muted small">There are no shortcuts here. Your first battle is a small, gentle fight that teaches the basics as you play, and every answer you give shapes your army.</p></div>`;
    } else if (step <= keys.length) {
      const k = keys[step - 1], g = ORIGINS[k];
      main = `<div class="card"><p class="q">${esc(g.title)}</p><div class="muted small">${esc(g.blurb)}</div><div class="ocards" style="margin-top:10px">${g.options.map(o => `<button class="ocard ${picks[k] === o.id ? 'sel' : ''}" data-k="${k}" data-id="${o.id}"><b>${esc(o.name)}</b><span class="t">${esc(o.text)}</span><ul>${o.fx.map(f => `<li>${esc(f)}</li>`).join('')}</ul></button>`).join('')}</div></div>`;
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
    const nm = root.querySelector('#o-name'); if (nm) nm.oninput = (e) => { name = e.target.value; root.querySelector('#o-next').disabled = name.trim().length < 2; };
    const df = root.querySelector('#o-diff'); if (df) df.onchange = (e) => { diff = e.target.value; draw(); };
    const can = step === 0 ? name.trim().length >= 2 : step <= keys.length ? !!picks[keys[step - 1]] : keys.every(k => picks[k]);
    const nx = root.querySelector('#o-next'); nx.disabled = !can; nx.title = can ? '' : (step === 0 ? 'Enter a name' : 'Choose an answer to continue');
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
    <div class="pform">${sel('p-army', 'Your army')}${sel('p-enemy', 'Enemy force')}${sel('p-terrain', 'Terrain')}${sel('p-tactics', 'Enemy tactics')}${sel('p-difficulty', 'Difficulty')}${sel('p-weather', 'Weather')}</div>
    <div class="row"><button class="primary" id="p-go">Begin battle</button><button id="p-back">Back</button></div></div>`;
  $('p-go').onclick = () => { const v = {}; for (const k of Object.keys(PRACTICE_DEFAULTS)) v[k] = $('p-' + k).value; store.set(PRAC_KEY, v); startPractice(v); };
  $('p-back').onclick = () => toMenu();
  show('screen-practice');
}
function startPractice(v) {
  const { scn, campaign: c, opts } = buildPractice(v);
  show('screen-battle');
  battle.start(scn, romeSpecs(c, scn), { difficulty: opts.difficulty, fort: 0, favour: 0, weather: opts.weather }, (res) => practiceResult(res, v));
}
function practiceResult(res, v) {
  battle.stop();
  const o = res.outcome, title = { victory: 'VICTORY', draw: 'DRAW', defeat: 'DEFEAT' }[o];
  const rows = res.rows.map(r => `<tr><td>${esc(r.name)}</td><td>${r.startMen}</td><td>${r.endMen}</td><td>${r.casualties}</td><td>${r.kills}</td></tr>`).join('');
  $('screen-result').innerHTML = `<div class="panel-page"><img class="banner" alt="" src="${artSrc('outcome', o, 800, 200)}"><div class="big ${o}">${title}</div>
    <p class="muted">Practice battle: nothing is saved. Time ${Math.floor(res.time / 60)}:${String(Math.floor(res.time % 60)).padStart(2, '0')}. Enemy dead about ${res.enemyDead} of ${res.enemyStart}.</p>
    <div class="card"><h3>Your units</h3><table><tr><th>Unit</th><th>Before</th><th>After</th><th>Lost</th><th>Kills</th></tr>${rows}</table></div>
    ${reportHtml(res)}
    <div class="row" style="margin-top:16px"><button class="primary" id="r-again">Fight again</button><button id="r-setup">Change setup</button><button id="r-menu">Main menu</button></div></div>`;
  $('r-again').onclick = () => startPractice(v); $('r-setup').onclick = () => showPractice(); $('r-menu').onclick = () => toMenu();
  show('screen-result');
}
$('btn-practice').onclick = () => showPractice();

window.__legio = { get campaign() { return campaign; }, battle, show, store, get coach() { return coach; } };
