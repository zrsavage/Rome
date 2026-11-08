import { SCENARIOS, DIFFICULTY, UNIT_TYPES } from './data.js';
import { newCampaign, romeSpecs, applyResult } from './state.js';
import { Camp, totalMen } from './camp.js';
import { BattleUI } from './battleui.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const SAVE = 'legio_save_v1', PRE = 'legio_pre_v1';
let campaign = null;

function show(id) { document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id)); }
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } }
};
const save = () => store.set(SAVE, campaign);

const camp = new Camp($('screen-camp'), {
  save, menu: () => { show('screen-menu'); refreshMenu(); },
  march: () => showBrief()
});
const battle = new BattleUI();

// ----- menu -----
const diffSel = $('diff');
diffSel.innerHTML = Object.entries(DIFFICULTY).map(([k, d]) => `<option value="${k}" ${k === 'normal' ? 'selected' : ''}>${d.name}</option>`).join('');
const diffDesc = () => { $('diff-desc').textContent = DIFFICULTY[diffSel.value].desc; };
diffSel.onchange = diffDesc; diffDesc();
function refreshMenu() { $('btn-continue').disabled = !store.get(SAVE); }
$('btn-new').onclick = () => { campaign = newCampaign(diffSel.value); save(); camp.msgs = []; camp.sel = 1; camp.show(campaign); show('screen-camp'); };
$('btn-continue').onclick = () => { campaign = store.get(SAVE); if (!campaign) return; camp.show(campaign); show('screen-camp'); };
refreshMenu();

// ----- briefing -----
function showBrief() {
  const c = campaign, scn = SCENARIOS[c.scenario % SCENARIOS.length], diff = DIFFICULTY[c.difficulty];
  const favMult = c.favour >= 2 ? 0.9 : c.favour <= -2 ? 1.1 : 1, scale = diff.enemyMult * favMult;
  const groups = {};
  scn.enemy.forEach(e => { groups[e.type] = (groups[e.type] || 0) + e.men * scale; });
  const total = Object.values(groups).reduce((a, b) => a + b, 0);
  const list = Object.entries(groups).map(([t, n]) => c.scouted ? `<li>${UNIT_TYPES[t].name}: <b>${Math.round(n)}</b> men</li>` : `<li>${UNIT_TYPES[t].name}: roughly <b>${Math.round(n / 25) * 25 - 25}-${Math.round(n / 25) * 25 + 50}</b></li>`).join('');
  const rome = totalMen(c);
  $('screen-brief').innerHTML = `<div class="panel-page"><div class="muted">Act ${scn.act} - ${esc(scn.theater)}, ${esc(scn.year)}</div>
    <h2>${esc(scn.name)}</h2><p>${esc(scn.briefing)}</p>
    <div class="card"><h3>Objective</h3>${esc(scn.objective)}<br><span class="muted small">A time limit of ${Math.round(scn.timeLimit / 60)} minutes applies. A well-ordered withdrawal still counts as a draw and earns partial spoils.</span></div>
    <div class="row" style="align-items:flex-start;margin-top:12px"><div class="card" style="flex:1"><h3>Your force (${rome} men)</h3><ul>${c.cohorts.map(h => `<li>${esc(h.name)} - ${h.men}</li>`).join('')}</ul></div>
    <div class="card" style="flex:1"><h3>Enemy${c.scouted ? ' (scouted)' : ' (estimated)'} ~${c.scouted ? Math.round(total) : '?'}</h3><ul>${list}</ul>${c.scouted ? '<div class="muted small">Scouts warn of possible reinforcements from the forest.</div>' : '<div class="muted small">Without scouts, expect surprises.</div>'}</div></div>
    <p class="muted small">Goodwill ${c.favour}. Fort ${c.fort}. Supplies ${c.supplies}${c.supplies < totalMen(c) / 60 * 2 ? ' - LOW, morale will suffer' : ''}.</p>
    <div class="row"><button class="primary" id="go">Deploy</button><button id="back">Back to camp</button></div></div>`;
  $('go').onclick = () => startBattle(scn);
  $('back').onclick = () => { camp.show(campaign); show('screen-camp'); };
  show('screen-brief');
}

function startBattle(scn) {
  const c = campaign;
  store.set(PRE, c); // snapshot so a bad result can be retried
  show('screen-battle');
  const low = c.supplies < totalMen(c) / 60 * 2;
  battle.start(scn, romeSpecs(c), { difficulty: c.difficulty, fort: c.fort, favour: c.favour, suppliesLow: low }, (res) => showResult(res));
}

// ----- result -----
function showResult(res) {
  battle.stop();
  const c = campaign;
  const notes = applyResult(c, res);
  c.scouted = false; c.daysLeft = 3; c.battlesFought = (c.battlesFought || 0) + 1;
  c.cohorts.forEach(h => { h.condition = Math.max(35, h.condition); });
  save();
  const o = res.outcome, title = { victory: 'VICTORY', draw: 'DRAW', defeat: 'DEFEAT' }[o];
  const flavour = { victory: 'The Gauls break and scatter. The field is yours.', draw: 'Neither side can claim the field, but your legion marches away intact.', defeat: 'The line has broken. You live to fight another day, but the loss is bitter.' }[o];
  const rows = res.rows.map(r => `<tr><td>${esc(r.name)}</td><td>${r.startMen}</td><td>${r.endMen}</td><td>${r.casualties}</td><td>${r.kills}</td><td>+${r.xpGain}</td></tr>`).join('');
  const s = res.spoils;
  $('screen-result').innerHTML = `<div class="panel-page"><div class="big ${o}">${title}</div><p>${flavour}</p>
    <div class="card"><h3>Casualties</h3><table><tr><th>Unit</th><th>Before</th><th>After</th><th>Lost</th><th>Kills</th><th>XP</th></tr>${rows}</table>
    <p class="muted small">Enemy dead: about ${res.enemyDead} of ${res.enemyStart}. Wounded men who can march are counted in the 'after' column.</p></div>
    <div class="card" style="margin-top:12px"><h3>Spoils</h3>${o === 'defeat' ? 'None.' : `+${s.gold} denarii, +${s.supplies} supplies, +${s.recruits} fresh recruits`}</div>
    ${notes.length ? `<div class="card" style="margin-top:12px"><h3>Officers</h3>${notes.map(n => `<div>${esc(n)}</div>`).join('')}</div>` : ''}
    <div class="row" style="margin-top:16px"><button class="primary" id="cont">Return to camp</button><button id="retry">Retry this battle</button></div>
    <p class="muted small">This vertical slice has a single battle; after returning to camp you can march to the same fight again. Later battles are the next milestone.</p></div>`;
  $('cont').onclick = () => { camp.msgs = []; camp.note(`After the ${o}, the army makes camp.`); camp.show(campaign); show('screen-camp'); };
  $('retry').onclick = () => { campaign = store.get(PRE); save(); camp.show(campaign); show('screen-camp'); };
  show('screen-result');
}

// test hooks for automated checks
window.__legio = { get campaign() { return campaign; }, battle, show };
