// Between-battle camp phase: spend limited days on training, foraging, fortifying, diplomacy, recruiting.
import { LEVEL_NAMES, SCENARIOS, DIFFICULTY, UNIT_TYPES, RAISE, XP_LEVELS } from './data.js';
import { PERKS, perkById, LEVEL_TRAITS, UPGRADES, MAX_TIER, upgradeCost } from './perks.js';
import { levelFor } from './sim.js';
import { officerById, modsOf, hasPerk, commandLimit, unlockedTypes } from './state.js';
import { artSrc } from './art.js';
import { inform } from './ui.js';
import { DOCTRINES, winsOf } from './doctrine.js';
import { BUILDINGS, sceneSvg, advice, unlockedBuildings } from './campscene.js';

const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pct = (v, m) => Math.max(0, Math.min(100, v / m * 100));
export const totalMen = (c) => c.cohorts.reduce((a, h) => a + h.men, 0);
// What to drill is a real decision: each regimen pays off differently and costs something.
export const REGIMENS = {
  formation: { name: 'Formation drill', text: 'Close order, wheeling and the testudo. Builds discipline and cohesion, and spares the men.', xp: 0.9, dr: 2.4, cond: -3, risk: 0, trait: 'drill', sup: 8,
    seq: [['Procedite!', 'Advance!', 'advance'], ['Sinistrorsum!', 'Wheel left!', 'left'], ['Testudinem formate!', 'Form the testudo!', 'testudo'], ['State!', 'Halt!', 'halt']] },
  weapons: { name: 'Weapons practice', text: 'Pila, gladius and shield against stakes and each other. Builds experience fast, but it tires the men and some get hurt.', xp: 2.4, dr: 0.9, cond: -9, risk: 0.15, trait: 'tactics', sup: 8,
    seq: [['Pila mittite!', 'Throw pila!', 'volley'], ['Gladios stringite!', 'Draw swords!', 'jab'], ['Scuta!', 'Shields up!', 'testudo'], ['State!', 'Halt!', 'halt']] },
  field: { name: 'Field exercises', text: 'A mock engagement across rough ground. A bit of everything, but it is the most tiring and costs extra supplies.', xp: 1.7, dr: 1.7, cond: -13, risk: 0.1, trait: 'tactics', sup: 14,
    seq: [['Procedite!', 'Advance!', 'advance'], ['Pila mittite!', 'Throw pila!', 'volley'], ['Dextrorsum!', 'Wheel right!', 'right'], ['State!', 'Halt!', 'halt']] }
};
// The centurion's advice for the next battle, so the choice is informed.
const TRAINING_ADVICE = {
  ford: 'Warbands will test the fords and hit hard. A steady, well-drilled line decides this fight.',
  arar: 'You will catch them strung out. Experienced men cut them down fast and lose fewer of their own.',
  convoy: 'Raiders will strike from several sides at once. Cohesion matters more than killing power.',
  oppidum: 'Fighting uphill is costly. Seasoned troops matter, but do not send exhausted men up that slope.',
  silva: 'You will be ambushed on both flanks. A century that can turn and re-form quickly will survive it.',
  bibracte: 'A long day with wave after wave of enemies. Build both skill and stamina, and keep the men fit.'
};
// What the next enemy is made of, in words the player can act on.
const ENEMY_NAMES = { warband: 'warbands', gaul_elite: 'armoured champions', gaul_skirm: 'javelineers', gaul_cav: 'horsemen' };
function enemyProfile(scn) {
  const all = [...scn.enemy, ...scn.reinforcements.filter(r => r.side !== 'rome').map(r => r.unit)], tot = all.reduce((a, e) => a + e.men, 0), by = {};
  all.forEach(e => { by[e.type] = (by[e.type] || 0) + e.men; });
  return { tot, parts: Object.entries(by).map(([t, n]) => [ENEMY_NAMES[t] || t, Math.round(n / tot * 100), t]).sort((a, b) => b[1] - a[1]) };
}
const enemyLine = (p) => `The enemy will be mostly ${p.parts.slice(0, 3).map(([n, pc]) => `${n} (${pc}%)`).join(', ')}.`;
const enemyScaleFor = (favour) => favour >= 2 ? 0.9 : favour <= -2 ? 1.1 : 1;
const TYPE_ROLE = { legionary: 'Holds the line against charges.', slinger: 'Punishes massed warbands from behind the line.', archer: 'Long-range fire; outranges javelineers.', equites: 'Flank charges and running down routers.', aux_cav: 'Cheap flankers and pursuers.', aux_inf: 'Cheap and fierce, but less disciplined.' };
// Leading a drill yourself is the generalist choice: decent at everything (a little better if you rose through the ranks), but a specialist
// officer beats you at their own drill. An officer is judged on the trait the regimen needs.
export function selfQuality(c) { const p = c.player && c.player.picks; return p && p.career === 'ranks' ? 0.75 : 0.65; }
export function planDrill(c, h, key, leaderId) {
  const r = REGIMENS[key], leader = leaderId && leaderId !== 'self' ? officerById(c, +leaderId) : null;
  const q = leader ? 0.45 + 0.1 * leader[r.trait] : selfQuality(c), attached = officerById(c, h.officerId);
  const bonus = (1 + (attached ? 0.05 * attached.drill : 0)) * (leader && (leader.perks || []).includes('drillmaster') ? 1.25 : 1);
  return { r, leader, quality: q, xp: Math.round(24 * (0.6 + q) * r.xp * bonus), dr: Math.round(7 * (0.5 + q) * r.dr * bonus), cond: r.cond, risk: r.risk, sup: r.sup };
}
const roman = (n) => { const m = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]; let o = ''; for (const [v, t] of m) while (n >= v) { o += t; n -= v; } return o; };
const bestOfficer = (c, trait) => Math.max(0, ...c.officers.filter(o => o.alive).map(o => o[trait]));

export class Camp {
  constructor(root, api) { this.root = root; this.api = api; this.sel = 1; this.c = null; this.msgs = []; this.open = null; this.regimen = null; this.leader = 'self'; this.recruitN = 20; this.hireN = 50; this.snap = null; this.scope = 'one'; this.raiseN = 1;
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.open && this.root.classList.contains('active') && document.getElementById('modal').classList.contains('hidden') && document.getElementById('confirm').classList.contains('hidden')) { this.open = null; this.render(); } });
  }

  show(c) {
    this.c = c; this.open = null; this.snap = null; this.regimen = null; if (!c.cohorts.find(h => h.id === this.sel)) this.sel = c.cohorts[0].id;
    this.render();
    // Drip-fed buildings: introduce each new one once, in plain words.
    const seen = c.seenBuildings = c.seenBuildings || [], fresh = unlockedBuildings(c).filter(b => !seen.includes(b.id));
    if (fresh.length) { const b = fresh[0]; seen.push(b.id); this.api.save(); inform(`New in camp: the ${b.name}`, b.intro, 'Got it'); }
  }
  note(msg, kind = '') { this.msgs.unshift({ msg, kind }); this.msgs = this.msgs.slice(0, 30); }

  // Spend a day: pay upkeep, advance clock, save.
  endDay(cost = 1) {
    const c = this.c;
    for (let i = 0; i < cost; i++) {
      c.daysLeft = Math.max(0, c.daysLeft - 1); c.day++;
      const food = Math.ceil(totalMen(c) / 60 * modsOf(c).supplyUse);
      for (const h of c.cohorts) { // instructors drill their assigned cohort every day
        const ins = officerById(c, h.instructorId); if (!ins || c.supplies < 2) continue;
        c.supplies -= 2; const q = 0.35 + 0.08 * ins.drill, bonus = (ins.perks || []).includes('drillmaster') ? 1.25 : 1;
        h.xp += Math.round(10 * q * bonus); h.drill = Math.min(100, h.drill + Math.round(3 * q * bonus));
      }
      if (c.supplies >= food) c.supplies -= food;
      else { c.supplies = 0; c.cohorts.forEach(h => h.condition = Math.max(20, h.condition - 8)); this.note('The army goes hungry. Condition drops.', 'bad'); }
    }
    this.api.save();
  }
  canAct() { return this.c.daysLeft > 0; }

  selected() { return this.c.cohorts.find(h => h.id === this.sel); }
  // With a big army you cannot do everything one unit at a time: orders can cover every unit of the same kind in one day.
  targets(h = this.selected()) { return this.scope === 'group' ? this.c.cohorts.filter(x => x.type === h.type) : [h]; }
  scopeChips(h) {
    const n = this.c.cohorts.filter(x => x.type === h.type).length; if (n < 2) return '';
    return `<div class="row small" style="margin:8px 0 2px"><span class="muted">Applies to:</span><div class="chips"><button class="chip ${this.scope === 'one' ? 'sel' : ''}" data-scope="one">Just ${esc(h.name)}</button><button class="chip ${this.scope === 'group' ? 'sel' : ''}" data-scope="group">All ${esc(UNIT_TYPES[h.type].name.toLowerCase())} units (${n})</button></div></div>`;
  }

  // ----- actions -----
  selfQuality() { return selfQuality(this.c); }
  drillPlan(h, key, leaderId) { return planDrill(this.c, h, key, leaderId); }
  runDrill() {
    const c = this.c, h = this.selected(), key = this.regimen; if (!key) return;
    const p = this.drillPlan(h, key, this.leader || 'self'), tg = this.targets(h);
    if (!this.canAct() || c.supplies < p.sup * tg.length) return;
    const who = p.leader ? `${p.leader.rank} ${p.leader.name}` : 'You';
    this.drillScene(h, p, () => {
      c.supplies -= p.sup * tg.length; let hurtTotal = 0;
      for (const x of tg) {
        const q = this.drillPlan(x, key, this.leader || 'self');
        x.xp += q.xp; x.drill = Math.min(100, x.drill + q.dr); x.condition = Math.max(25, x.condition + q.cond);
        if (q.risk && Math.random() < q.risk) { const n = Math.max(2, Math.round(x.men * (0.01 + Math.random() * 0.02))); x.men = Math.max(10, x.men - n); hurtTotal += n; }
      }
      const hurt = hurtTotal ? ` ${hurtTotal} men were hurt in the practice.` : '';
      this.note(`${who} ran ${p.r.name.toLowerCase()} for ${tg.length > 1 ? `${tg.length} units` : h.name}: +${p.xp} XP, +${p.dr} drill each.${hurt}`, hurt ? '' : 'good');
      this.regimen = null; this.endDay(); this.render();
    });
  }
  // Four ways to feed the army, each with a different price: risk, goodwill or coin.
  forageDo(kind) {
    const c = this.c; if (!this.canAct()) return;
    const lg = bestOfficer(c, 'logistics'), fm = modsOf(c).forage; let got = 0, extra = '', text;
    if (kind === 'buy') { if (c.gold < 90) return; c.gold -= 90; got = 60; text = 'Merchants sell you grain for 90 denarii'; }
    else if (kind === 'requisition') { got = Math.round((60 + 10 * lg) * fm); c.favour = Math.max(-3, c.favour - 1); text = 'Requisitioned grain arrives; the villagers are not pleased (goodwill -1)'; }
    else {
      const wide = kind === 'wide'; got = Math.round((wide ? 70 + 12 * lg : 35 + 8 * lg) * fm); text = 'Foraging party returns';
      if (wide && Math.random() < 0.35 - 0.03 * lg) { const h = c.cohorts[Math.floor(Math.random() * c.cohorts.length)], lost = Math.max(2, Math.round(h.men * (0.03 + Math.random() * 0.05))); h.men -= lost; h.condition = Math.max(25, h.condition - 8); extra = ` Gallic raiders ambushed ${h.name}: ${lost} men lost.`; }
    }
    c.supplies += got; this.note(`${text} with ${got} supplies.${extra}`, extra || kind === 'requisition' ? 'bad' : 'good'); this.endDay(); this.render();
  }
  fortify() {
    const c = this.c; if (!this.canAct() || c.supplies < 10 || c.fort >= 3) return;
    c.supplies -= 10; c.fortWork = (c.fortWork || 0) + 1 + (bestOfficer(c, 'logistics') >= 4 ? 1 : 0);
    let msg = 'The ditch and palisade grow.';
    while (c.fortWork >= 2 && c.fort < 3) { c.fortWork -= 2; c.fort++; msg = `Camp fortifications reach level ${c.fort}.`; }
    this.note(msg, 'good'); this.endDay(); this.render();
  }
  tribute(demand) {
    const c = this.c; if (!this.canAct()) return;
    const dip = bestOfficer(c, 'diplomacy');
    if (demand) { const g = Math.round((90 + 15 * dip) * (hasPerk(c, 'tribute') ? 1.3 : 1)); c.gold += g; c.favour = Math.max(-3, c.favour - 1); this.note(`Gallic nobles are made to pay ${g} denarii. They are not pleased.`, ''); }
    else { if (c.gold < 60) return; c.gold -= 60; c.favour = Math.min(3, c.favour + (hasPerk(c, 'allies') ? 2 : 1)); this.note('Gifts to friendly chieftains win goodwill; scouts and rivals speak in your favour.', 'good'); }
    this.endDay(); this.render();
  }
  // Rest: everyone recovers condition, and the lightly wounded rejoin their units (15% of the men still missing).
  rest() {
    const c = this.c; if (!this.canAct()) return; let back = 0;
    c.cohorts.forEach(h => { h.condition = Math.min(100, h.condition + 20); back += Math.round((h.maxMen - h.men) * 0.15); });
    back = Math.min(back, Math.max(0, c.cohorts.reduce((a, h) => a + h.maxMen - h.men, 0) - (c.manpower || 0)));   // places already covered by waiting soldiers cannot be filled twice
    c.manpower = (c.manpower || 0) + back;                      // the lightly wounded go back into the pool; you decide where they serve
    this.note(`The men rest and mend their kit. ${back} lightly wounded are fit to serve again and join the pool of available soldiers.`, 'good'); this.endDay(); this.render();
  }
  // Hiring volunteers puts men into the pool of available soldiers; you place them with the sliders.
  hire() {
    const c = this.c, n = this.hireN || 50, cost = n * 3; if (!this.canAct() || c.gold < cost) return;
    c.gold -= cost; c.manpower = (c.manpower || 0) + n;
    this.note(`${n} volunteers sign on. Assign them to units with the sliders.`, 'good'); this.endDay(); this.render();
  }
  // ----- the muster roll: sliders move soldiers between the pool and your units (free, no day) -----
  onSlide(id, val) {
    const c = this.c, h = c.cohorts.find(x => x.id === id); if (!h) return;
    this.snap = this.snap || { pool: c.manpower || 0, u: {} };
    const sn = this.snap.u[id] || (this.snap.u[id] = { men0: h.men, xp0: h.xp }), cur = c.manpower || 0;
    let v = Math.min(h.maxMen, Math.max(Math.min(30, h.men), Math.round(val)));
    if (v - h.men > cur) v = h.men + cur;                       // you cannot assign men you do not have
    c.manpower = cur - (v - h.men); h.men = v;
    h.xp = v > sn.men0 ? Math.round(sn.xp0 * sn.men0 / v) : sn.xp0;   // new men are raw and dilute experience; taking men away does not cost the rest their training
    const row = this.root.querySelector(`.mrow[data-id="${id}"]`);
    if (row) { row.querySelector('input').value = v; row.querySelector('.mval').textContent = `${v}/${h.maxMen}`; const lv = levelFor(h.xp); row.querySelector('.mxp').innerHTML = `${LEVEL_NAMES[lv]}${h.xp < sn.xp0 ? ` <span class="b">(diluted by ${Math.round((1 - h.xp / Math.max(1, sn.xp0)) * 100)}%)</span>` : ''}`; row.classList.toggle('chg', v !== sn.men0); }
    for (const el of this.root.querySelectorAll('.poolN')) el.textContent = c.manpower;
  }
  fillEvenly() {
    const c = this.c, need = c.cohorts.filter(h => h.men < h.maxMen), M = need.reduce((a, h) => a + (h.maxMen - h.men), 0), pool = c.manpower || 0; if (!M || !pool) return;
    let left = pool; const plan = need.map(h => ({ h, add: pool >= M ? h.maxMen - h.men : Math.floor(pool * (h.maxMen - h.men) / M) }));
    left -= plan.reduce((a, q) => a + q.add, 0); for (const q of plan.sort((a, b) => (b.h.maxMen - b.h.men) - (a.h.maxMen - a.h.men))) { if (left <= 0) break; if (q.h.men + q.add < q.h.maxMen) { q.add++; left--; } }
    for (const q of plan) this.onSlide(q.h.id, q.h.men + q.add);
    this.api.save(); this.render();
  }
  undoMuster() {
    if (!this.snap) return; const c = this.c;
    for (const [id, sn] of Object.entries(this.snap.u)) { const h = c.cohorts.find(x => x.id === +id); if (h) { h.men = sn.men0; h.xp = sn.xp0; } }
    c.manpower = this.snap.pool; this.snap = null; this.api.save(); this.render();
  }
  musterHtml(act) {
    const c = this.c, pool = c.manpower || 0, big = c.cohorts.length > 8;
    const rank = (x) => ({ inf: 0, ranged: 1, cav: 2 }[UNIT_TYPES[x.type].cat] ?? 3) * 10 + (x.type === 'legionary' ? 0 : 1);
    const list = big ? [...c.cohorts].sort((a, b) => rank(a) - rank(b) || a.id - b.id) : c.cohorts; let last = null;
    const rows = list.map(h => {
      const sn = this.snap && this.snap.u[h.id], lv = levelFor(h.xp), grp = big && h.type !== last ? `<div class="mgrp">${esc(UNIT_TYPES[h.type].name)}</div>` : ''; last = h.type;
      return grp + `<div class="mrow ${sn && sn.men0 !== h.men ? 'chg' : ''}" data-id="${h.id}"><div class="mname"><img class="uicon" alt="" src="${artSrc('unit', h.type, 40, 40)}"><div>${esc(h.name)}<div class="muted small">${esc(UNIT_TYPES[h.type].name)}</div></div></div>
        <input class="mslide" type="range" min="${Math.min(30, h.men)}" max="${h.maxMen}" step="1" value="${h.men}" data-id="${h.id}" aria-label="Men in ${esc(h.name)}"><div class="mval">${h.men}/${h.maxMen}</div><div class="mxp small">${LEVEL_NAMES[lv]}${sn && h.xp < sn.xp0 ? ` <span class="b">(diluted by ${Math.round((1 - h.xp / Math.max(1, sn.xp0)) * 100)}%)</span>` : ''}</div><div class="mcond small muted">${Math.round(h.condition)}% fit</div></div>`;
    }).join('');
    const missing = c.cohorts.reduce((a, h) => a + (h.maxMen - h.men), 0);
    return `<div class="muster"><div class="mhead"><div><b class="poolN big2">${pool}</b> <span>soldiers available</span><div class="small muted">Volunteers and levies arrive after battles; you can also hire more. Drag a slider right to send men to a unit, left to take them back. New men are raw and dilute experience. ${missing} places are empty across the army.</div></div>
      <div class="row"><button id="m-fill" ${pool > 0 && missing > 0 ? '' : 'disabled'}>Fill evenly</button><button id="m-undo" ${this.snap ? '' : 'disabled'}>Undo changes</button></div></div><div class="mlist">${rows}</div></div>`;
  }
  scout() { const c = this.c, free = hasPerk(c, 'spymaster'); if ((!free && !this.canAct()) || c.scouted) return; c.scouted = true; this.note(free ? 'Your spies report the enemy dispositions (no day spent).' : 'Scouts report the enemy dispositions.', 'good'); if (free) this.api.save(); else this.endDay(); this.render(); }
  // ----- management depth -----
  learn(spec) {
    const [oid, pid] = spec.split(':'), o = this.c.officers.find(x => x.id === +oid), p = perkById(pid);
    if (!o || !p || (o.points || 0) < 1 || o[p.trait] < p.req || (o.perks || []).includes(pid)) return;
    o.points--; o.perks = [...(o.perks || []), pid]; this.note(`${o.name} learns ${p.name}.`, 'good'); this.api.save(); this.render();
  }
  upgrade(kind) {
    const c = this.c, h = this.selected(), names = UPGRADES[UNIT_TYPES[h.type].cat], tg = this.targets(h).filter(x => upgradeCost(x, kind).tier < MAX_TIER);
    const gold = tg.reduce((a, x) => a + upgradeCost(x, kind).gold, 0), sup = tg.reduce((a, x) => a + upgradeCost(x, kind).supplies, 0);
    if (!this.canAct() || !tg.length || c.gold < gold || c.supplies < sup) return;
    c.gold -= gold; c.supplies -= sup; for (const x of tg) { x.upg = { armour: 0, weapon: 0, ...(x.upg || {}) }; x.upg[kind]++; }
    this.note(tg.length > 1 ? `${tg.length} units: ${names[kind]} upgraded.` : `${h.name}: ${names[kind]} upgraded to tier ${h.upg[kind]}.`, 'good'); this.endDay(); this.render();
  }
  raise(type) {
    const c = this.c, r = RAISE[type], k = Math.max(1, Math.min(this.raiseN || 1, commandLimit(c) - c.cohorts.length));
    if (!this.canAct() || !r || c.cohorts.length >= commandLimit(c) || c.gold < r.gold * k || c.supplies < r.supplies * k) return;
    c.gold -= r.gold * k; c.supplies -= r.supplies * k;
    for (let q = 0; q < k; q++) {
    const id = Math.max(0, ...c.cohorts.map(x => x.id)) + 1, n = c.cohorts.filter(x => x.type === type).length + 1;
    const name = { legionary: `${roman(c.cohorts.filter(x => x.type === 'legionary').length + 1)} Cohort`, slinger: `Slingers ${n}`, archer: `Archers ${n}`, equites: `Turma ${n}`, aux_cav: `Allied Horse ${n}`, aux_inf: `Allied Infantry ${n}` }[type];
    c.cohorts.push({ id, name, type, men: r.men, maxMen: r.max, xp: 0, drill: 10, condition: 100, officerId: null });
    this.sel = id; if (q === k - 1) this.note(k > 1 ? `${k} new units are raised: ${name} and its sisters.` : `${name} is raised (${r.men} men).`, 'good');
    }
    this.endDay(); this.render();
  }
  hospital() {
    const c = this.c, lvl = c.hospital || 0, gold = 120 * (lvl + 1), sup = 20;
    if (!this.canAct() || lvl >= 3 || c.gold < gold || c.supplies < sup) return;
    c.gold -= gold; c.supplies -= sup; c.hospital = lvl + 1; this.note(`Field hospital reaches level ${c.hospital}: wounded recover better.`, 'good'); this.endDay(); this.render();
  }
  learnDoctrine(id) {
    const c = this.c, d = DOCTRINES.find(x => x.id === id); c.doctrines = c.doctrines || [];
    const teacher = c.officers.filter(o => o.alive && o[d.trait] >= d.req).sort((a, b) => b[d.trait] - a[d.trait])[0];
    if (!d || !this.canAct() || c.doctrines.includes(id) || winsOf(c) < d.wins || c.gold < d.gold || !teacher) return;
    c.gold -= d.gold; c.doctrines.push(id);
    this.note(`${teacher.rank} ${teacher.name} drills the army in ${d.name}. In battle, press ${d.key}.`, 'good'); this.endDay(); this.render();
  }
  setInstructor(oid) { const h = this.selected(); h.instructorId = oid || null; this.api.save(); this.render(); }
  assign(oid) {
    const c = this.c, h = this.selected();
    c.cohorts.forEach(x => { if (x.officerId === oid) x.officerId = null; });
    h.officerId = oid || null; this.api.save(); this.render();
  }

  // ----- a short scene of the chosen drill being run, by you or by the officer you chose (click or press a key to skip) -----
  drillScene(h, plan, done) {
    const c = this.c, modal = document.getElementById('modal'), leader = plan.leader; modal.classList.remove('hidden');
    const who = leader ? `${leader.rank} ${leader.name}` : (c.player && c.player.name) || 'You';
    const portrait = leader ? artSrc('officer', leader.id, 80, 100, { title: leader.name, rank: leader.rank }) : artSrc('officer', 'player', 80, 100, { title: (c.player && c.player.name) || 'You', rank: 'Legate' });
    const SEQ = plan.r.seq.map(([latin, en, kind], i) => ({ t: i, latin, en, kind })), END = 4.0, TOTAL = 5.0;
    modal.innerHTML = `<div class="box drill" id="sc-box"><div class="cellflex" style="justify-content:center;gap:10px"><img class="portrait" alt="" src="${portrait}"><div style="text-align:left"><h2 style="margin:0">${esc(plan.r.name)}: ${esc(h.name)}</h2><div class="muted small">${leader ? `${esc(who)} runs the drill` : `${esc(who)} leads the drill in person`}</div></div></div>
      <canvas id="dr-cv" width="520" height="190"></canvas><div id="dr-cmd">&nbsp;</div><div id="dr-en" class="muted">&nbsp;</div>
      <div class="drbar"><i id="dr-t"></i></div><div class="small muted">Click or press any key to skip</div></div>`;
    const g = modal.querySelector('#dr-cv').getContext('2d'), bar = modal.querySelector('#dr-t');
    const dots = []; for (let r = 0; r < 5; r++) for (let f = 0; f < 12; f++) dots.push({ r, f });
    const ease = (t) => 1 - (1 - t) * (1 - t), t0 = performance.now(); let raf = 0, finished = false;
    const draw = (t) => {
      // fold the sequence into a pose: each order eases in over 0.6 s and later orders build on earlier ones
      let y = 0, rot = 0, comp = 0, flash = 0, volley = 0, jab = 0;
      SEQ.forEach(st => { const p = Math.max(0, Math.min(1, (t - st.t) / 0.6)), e = ease(p); if (t < st.t) return;
        if (st.kind === 'advance') y -= 30 * e; else if (st.kind === 'left') rot -= 0.5 * e; else if (st.kind === 'right') rot += 0.5 * e; else if (st.kind === 'testudo') comp = e;
        else if (st.kind === 'halt') flash = t - st.t < 0.6 ? 1 - e : 0; else if (st.kind === 'volley') volley = (t - st.t) < 0.9 ? (t - st.t) / 0.9 : 0; else if (st.kind === 'jab') jab = (t - st.t) < 1 ? Math.sin((t - st.t) * 18) : 0; });
      if (t >= END) { const k = Math.max(0, 1 - (t - END) / 0.8); y *= k; rot *= k; comp *= k; }
      g.clearRect(0, 0, 520, 190); g.fillStyle = '#5c5230'; g.fillRect(0, 0, 520, 190); g.fillStyle = '#6b6038'; for (let i = 0; i < 18; i++) g.fillRect(i * 31 % 520, (i * 53) % 190, 22, 3);
      g.strokeStyle = 'rgba(255,255,255,.18)'; g.setLineDash([6, 6]); g.beginPath(); g.moveTo(10, 34); g.lineTo(510, 34); g.stroke(); g.setLineDash([]);
      if (plan.r.seq.some(x => x[2] === 'volley' || x[2] === 'jab')) { g.fillStyle = '#7a5a2a'; for (const x of [150, 270, 390]) { g.fillRect(x - 2, 20, 4, 24); g.fillStyle = '#c9b27a'; g.beginPath(); g.arc(x, 20, 5, 0, 7); g.fill(); g.fillStyle = '#7a5a2a'; } }   // practice stakes
      g.save(); g.translate(46, 150); g.fillStyle = '#3a2a14'; g.fillRect(9, -22, 3, 40); g.fillStyle = leader ? '#a8322a' : '#e8c36a'; g.beginPath(); g.arc(0, 0, 9, 0, 7); g.fill();
      g.fillStyle = '#c9a07a'; g.beginPath(); g.arc(0, -9, 5, 0, 7); g.fill(); g.fillStyle = leader ? '#d8d2b0' : '#e8c36a'; g.fillRect(-9, -17, 18, 5); g.restore();
      g.save(); g.translate(270, 112 + y); g.rotate(rot);
      const sx = 17 - 7 * comp, sy = 17 - 6 * comp;
      if (comp > 0.35) { g.fillStyle = `rgba(232,195,106,${0.16 * comp})`; g.fillRect(-6 * sx - 8, -2.5 * sy - 8, 12 * sx + 16, 5 * sy + 16); g.strokeStyle = `rgba(232,195,106,${0.9 * comp})`; g.lineWidth = 2; g.strokeRect(-6 * sx - 8, -2.5 * sy - 8, 12 * sx + 16, 5 * sy + 16); }
      for (const d of dots) { const x = (d.f - 5.5) * sx, yy = (d.r - 2) * sy - (d.r === 0 ? jab * 6 : 0); g.fillStyle = comp > 0.5 ? '#d8a03a' : '#b3261e'; g.beginPath(); g.arc(x, yy, 4.4, 0, 7); g.fill(); g.fillStyle = '#e8c36a'; g.fillRect(x, yy - 1.6, 3.4, 3.2); }
      if (volley > 0) { g.strokeStyle = '#2a1a0a'; g.lineWidth = 1.5; for (let f = 0; f < 12; f += 1) { const x = (f - 5.5) * sx, yy = -2 * sy - 10 - volley * 90 - (f % 3) * 8; g.beginPath(); g.moveTo(x, yy); g.lineTo(x, yy - 9); g.stroke(); } }
      g.restore();
      if (flash > 0.05) { g.fillStyle = `rgba(255,255,255,${flash * 0.25})`; g.fillRect(0, 0, 520, 190); }
    };
    const frame = (now) => {
      const t = (now - t0) / 1000; if (finished) return;
      draw(t); bar.style.width = Math.min(100, t / TOTAL * 100) + '%';
      const step = SEQ.filter(s => t >= s.t).pop(), cmd = modal.querySelector('#dr-cmd'), en = modal.querySelector('#dr-en');
      if (t < END && step) { cmd.textContent = step.latin; en.textContent = step.en; }
      else if (t >= END) { cmd.textContent = 'Dismissed.'; cmd.style.fontSize = '22px'; en.textContent = `+${plan.xp} experience, +${plan.dr} drill${plan.cond < 0 ? `, condition ${plan.cond}` : ''}`; en.style.color = '#9be09b'; }
      if (t >= TOTAL) return end(); raf = requestAnimationFrame(frame);
    };
    const end = () => { if (finished) return; finished = true; cancelAnimationFrame(raf); window.removeEventListener('keydown', skip, true); modal.classList.add('hidden'); modal.innerHTML = ''; done(); };
    const skip = (e) => { e.preventDefault(); e.stopPropagation(); end(); };
    window.addEventListener('keydown', skip, true); modal.querySelector('#sc-box').onclick = end; raf = requestAnimationFrame(frame);
  }

  // ---------- rendering: the camp is a place; each building opens one small panel ----------
  unitList(cols) {
    const c = this.c, bar = (v, m, cls = '') => `<div class="bar ${cls}"><i style="width:${pct(v, m)}%"></i></div>`, XP = [...XP_LEVELS, 4600];
    const head = { str: 'Strength', exp: 'Experience', drill: 'Drill', cond: 'Condition', gear: 'Equipment' };
    const big = c.cohorts.length > 8, rank = (x) => ({ inf: 0, ranged: 1, cav: 2 }[UNIT_TYPES[x.type].cat] ?? 3) * 10 + (x.type === 'legionary' ? 0 : 1);
    const ordered = big ? [...c.cohorts].sort((a, b) => rank(a) - rank(b) || a.id - b.id) : c.cohorts; let lastType = null;
    const hdr = (x) => { if (!big || x.type === lastType) return ''; lastType = x.type; return `<tr class="ugrp"><td colspan="${cols.length + 1}">${esc(UNIT_TYPES[x.type].name)} (${c.cohorts.filter(y => y.type === x.type).length})</td></tr>`; };
    return `<div class="ulist ${big ? 'scrolls' : ''}"><table><tr><th>Unit</th>${cols.map(k => `<th>${head[k]}</th>`).join('')}</tr>${ordered.map(x => {
      const o = officerById(c, x.officerId), lv = levelFor(x.xp), u = { armour: 0, weapon: 0, ...(x.upg || {}) };
      const cell = { str: `<td>${x.men}/${x.maxMen}${bar(x.men, x.maxMen)}</td>`, exp: `<td>${LEVEL_NAMES[lv]}${bar(x.xp - XP[lv], (XP[lv + 1] || 4600) - XP[lv], 'x')}</td>`, drill: `<td>${Math.round(x.drill)}${bar(x.drill, 100, 'm')}</td>`, cond: `<td>${Math.round(x.condition)}%${bar(x.condition, 100)}</td>`, gear: `<td class="small">Armour ${u.armour}/3<br>Weapons ${u.weapon}/3</td>` };
      return hdr(x) + `<tr class="clickable ${x.id === this.sel ? 'sel' : ''}" data-id="${x.id}"><td><div class="cellflex"><img class="uicon" alt="" src="${artSrc('unit', x.type, 68, 68)}"><div>${esc(x.name)}<div class="muted small">${esc(UNIT_TYPES[x.type].name)}${o ? ' - ' + esc(o.name) : ''}</div></div></div></td>${cols.map(k => cell[k]).join('')}</tr>`;
    }).join('')}</table></div>`;
  }

  // Formation orders, learned one at a time. Only what you can afford now, plus a single hint of the next, is ever shown.
  doctrineHtml(act) {
    const c = this.c, known = c.doctrines || [], wins = winsOf(c), offs = c.officers.filter(o => o.alive);
    const learned = DOCTRINES.filter(d => known.includes(d.id)).map(d => `<span class="pill" title="${esc(d.text)}">${esc(d.name)} (${d.key})</span>`).join(' ');
    const open = DOCTRINES.filter(d => !known.includes(d.id) && wins >= d.wins);
    const next = DOCTRINES.find(d => !known.includes(d.id) && wins < d.wins);
    const cards = open.map(d => {
      const t = offs.filter(o => o[d.trait] >= d.req).sort((a, b) => b[d.trait] - a[d.trait])[0];
      const why = !t ? `needs an officer with ${d.trait} ${d.req}` : c.gold < d.gold ? 'not enough denarii' : '';
      return `<button class="act" data-a="doctrine" data-m="${d.id}" ${act && !why ? '' : 'disabled'}>${esc(d.name)}<small>${esc(d.text)}</small><small>${d.gold} denarii, 1 day. ${t ? `Taught by ${esc(t.name)}.` : esc(why)}</small></button>`; }).join('');
    if (!learned && !cards && !next) return '';
    return `<h4 class="sect">Battle orders</h4><div class="small muted">New formation orders are learned here as the campaign goes on. At first your army knows only how to march and attack; even holding a position has to be taught.</div>
      ${learned ? `<div class="row" style="margin:6px 0">${learned}</div>` : ''}${cards ? `<div class="actions">${cards}</div>` : ''}
      ${next ? `<div class="small muted" style="margin-top:6px">Another order will be ready to learn after ${next.wins - wins} more victor${next.wins - wins === 1 ? 'y' : 'ies'}.</div>` : ''}`;
  }

  panelBody(id) {
    const c = this.c, h = this.selected(), act = this.canAct(), offs = c.officers.filter(o => o.alive), scn = SCENARIOS[Math.min(c.scenario, SCENARIOS.length - 1)];
    const off = act ? '' : 'disabled', btn = (attrs, label, sub, ok = true) => `<button class="act" ${attrs} ${act && ok ? '' : 'disabled'}>${label}<small>${sub}</small></button>`;
    const note = act ? '' : '<div class="small" style="color:#ee9a8e;margin-top:8px">No days remain. March to battle.</div>';
    switch (id) {
      case 'praetorium': return `<p><b>${esc(scn.name)}</b>${scn.kind === 'named' ? ' <span class="pill">Named battle</span>' : ''}<br><span class="small muted">${esc(scn.geo ? scn.geo.place : '')}</span></p><p class="muted">${esc(scn.briefing)}</p><p class="small">${esc(scn.objective)}</p>
        <div class="row"><button class="primary" id="march2">March to battle</button><button id="tomap2">Back to the map</button></div>
        <h4 class="sect">Your army</h4>${this.unitList(['str', 'cond'])}`;
      case 'training': {
        const drillers = offs.filter(o => o.drill >= 1), insOpts = '<option value="">- none -</option>' + drillers.map(o => `<option value="${o.id}" ${h.instructorId === o.id ? 'selected' : ''}>${esc(o.name)} (drill ${o.drill})</option>`).join('');
        const lead = this.leader || 'self', adv = TRAINING_ADVICE[scn.id] || 'Decide what your men need most.';
        const nT = this.targets(h).length, cards = Object.entries(REGIMENS).map(([k, r]) => { const p = this.drillPlan(h, k, lead), ok = c.supplies >= r.sup * nT;
          return `<button class="regimen ${this.regimen === k ? 'sel' : ''}" data-regimen="${k}" ${act && ok ? '' : 'disabled'}><b>${r.name}</b><span class="t">${esc(r.text)}</span>
            <div class="eff"><span class="g">+${p.xp} experience</span><span class="g">+${p.dr} drill</span><span class="${r.cond <= -9 ? 'b' : ''}">condition ${r.cond}</span><span class="${r.risk ? 'b' : ''}">${r.risk ? `${Math.round(r.risk * 100)}% risk of hurt men` : 'no risk'}</span><span>${r.sup * nT} supplies</span></div></button>`; }).join('');
        const leaders = [['self', 'You', 'a decent all-rounder']].concat(offs.map(o => [String(o.id), `${o.rank} ${o.name}`, this.regimen ? `${REGIMENS[this.regimen].trait} ${o[REGIMENS[this.regimen].trait]}` : `drill ${o.drill}, tactics ${o.tactics}`]));
        const chips = leaders.map(([id, n, sub]) => `<button class="chip ${String(lead) === id ? 'sel' : ''}" data-leader="${id}">${esc(n)}<small>${esc(sub)}</small></button>`).join('');
        return `<div class="advicebox"><b>The centurion's advice.</b> ${esc(adv)}</div><p class="muted">Each drill uses one day. You cannot do everything, so decide what ${esc(h.name)} needs most.</p>${this.unitList(['str', 'exp', 'drill', 'cond'])}${this.scopeChips(h)}
          <h4 class="sect">1. What should ${esc(nT > 1 ? 'these units' : h.name)} practise?</h4><div class="regimens">${cards}</div>
          <h4 class="sect">2. Who leads it?</h4><div class="chips">${chips}</div><div class="small muted" style="margin-top:4px">${this.regimen ? `For ${REGIMENS[this.regimen].name.toLowerCase()}, an officer is judged on ${REGIMENS[this.regimen].trait}.` : 'Officers are better at some drills than others.'}</div>
          <div class="row" style="margin-top:12px"><button class="primary" id="run-drill" ${act && this.regimen ? '' : 'disabled'}>${this.regimen ? 'Run the drill' : 'Choose a drill first'}</button></div>
          ${this.doctrineHtml(act)}
          <h4 class="sect">Instructor</h4><div class="row small"><span class="muted">Trains ${esc(h.name)} automatically every day for 2 supplies (a modest, steady gain):</span><select id="instr">${insOpts}</select></div>${note}`;
      }
      case 'depot': {
        const food = Math.ceil(totalMen(c) / 60 * modsOf(c).supplyUse), low = Math.ceil(totalMen(c) / 60 * 2), proj = c.supplies - food * c.daysLeft, lg = bestOfficer(c, 'logistics'), fm = modsOf(c).forage;
        const adv = `You eat ${food} a day. With ${c.daysLeft} day${c.daysLeft === 1 ? '' : 's'} left you will march with about ${Math.max(0, proj)} supplies if you do nothing else (training also uses some). ${proj < low ? `Below ${low}, your men fight at -8 morale, so you need more.` : `That is above the ${low} you need, so extra food is a luxury, not a necessity.`}`;
        const opts = [
          ['cautious', 'Cautious sweep', 'Foragers stay close to camp.', [[`+${Math.round((35 + 8 * lg) * fm)} supplies`, 'g'], ['no risk', '']], true],
          ['wide', 'Wide sweep', 'Parties range far across the countryside.', [[`+${Math.round((70 + 12 * lg) * fm)} supplies`, 'g'], [`${Math.round((0.35 - 0.03 * lg) * 100)}% risk of an ambush`, 'b']], true],
          ['requisition', 'Requisition from the villages', 'Take grain from nearby Gallic farms by order.', [[`+${Math.round((60 + 10 * lg) * fm)} supplies`, 'g'], ['goodwill -1', 'b'], ['no ambush', '']], true],
          ['buy', 'Buy grain from merchants', 'Pay traders in coin and ask no questions.', [['+60 supplies', 'g'], ['90 denarii', 'b'], ['no risk', '']], c.gold >= 90]
        ];
        return `<div class="advicebox"><b>The quartermaster's advice.</b> ${esc(adv)}</div><div class="sumtiles"><div><b>${c.supplies}</b><span>Supplies</span></div><div><b>${food}</b><span>Eaten per day</span></div><div><b>${Math.floor(c.supplies / Math.max(1, food))}</b><span>Days of food</span></div><div><b>${c.favour > 0 ? '+' : ''}${c.favour}</b><span>Goodwill</span></div></div>
          <h4 class="sect">How will you feed the army?</h4><div class="regimens two">${opts.map(([k, n, t, effs, ok]) => `<button class="regimen" data-forage="${k}" ${act && ok ? '' : 'disabled'}><b>${n}</b><span class="t">${t}</span><div class="eff">${effs.map(([x, cl]) => `<span class="${cl}">${x}</span>`).join('')}</div></button>`).join('')}</div>${note}`; }
      case 'barracks': {
        const prof = enemyProfile(scn), weary = c.cohorts.filter(x => x.condition < 75), thin = c.cohorts.slice().sort((a, b2) => a.men / a.maxMen - b2.men / b2.maxMen)[0];
        const adv = `${enemyLine(prof)} ${weary.length ? `${weary.length} unit${weary.length === 1 ? ' is' : 's are'} below 75% condition and will fight badly. ` : 'Your men are in good condition. '}${thin.men < thin.maxMen * 0.85 ? `${thin.name} is the thinnest at ${thin.men}/${thin.maxMen}.` : ''}`;
        const room = commandLimit(c) - c.cohorts.length, hn = this.hireN || 50, hcost = hn * 3, rk = Math.max(1, Math.min(this.raiseN || 1, room));
        const floor = Math.round((0.45 - 0.05 * c.fort) * 100), nextFloor = Math.round((0.45 - 0.05 * Math.min(3, c.fort + 1)) * 100);
        const card = (attrs, name, text, effs, ok) => `<button class="regimen act" ${attrs} ${act && ok ? '' : 'disabled'}><b>${name}</b><span class="t">${text}</span><div class="eff">${effs.map(([x, cl]) => `<span class="${cl}">${x}</span>`).join('')}</div></button>`;
        const have = { ranged: c.cohorts.filter(x => UNIT_TYPES[x.type].cat === 'ranged').length, cav: c.cohorts.filter(x => UNIT_TYPES[x.type].cat === 'cav').length, inf: c.cohorts.filter(x => UNIT_TYPES[x.type].cat === 'inf').length };
        const sug = (t) => { const cat = UNIT_TYPES[t].cat; return (cat === 'ranged' && have.ranged < 1) || (cat === 'cav' && have.cav < 2) || (cat === 'inf' && have.inf < 4); };
        const raise = unlockedTypes(c).map(t => { const r = RAISE[t], ok = room > 0 && c.gold >= r.gold * rk && c.supplies >= r.supplies * rk;
          return card(`data-a="raise" data-m="${t}"`, `${esc(UNIT_TYPES[t].name)}${sug(t) ? ' <span class="pill">your army lacks this</span>' : ''}`, esc(TYPE_ROLE[t] || ''), [[`${r.men * rk} men${rk > 1 ? ` in ${rk} units` : ''}`, 'g'], [`${r.gold * rk} denarii`, 'b'], [`${r.supplies * rk} supplies`, '']], ok); }).join('');
        return `<div class="advicebox"><b>The camp prefect's advice.</b> ${esc(adv)}</div><h4 class="sect">Muster roll</h4>${this.musterHtml(act)}
          <h4 class="sect">Spend the day on...</h4><div class="regimens">
          ${card('data-a="rest"', 'Rest the army', 'Everyone sleeps, eats and mends kit.', [['+20 condition, every unit', 'g'], [`about ${Math.min(c.cohorts.reduce((x, u) => x + Math.round((u.maxMen - u.men) * 0.15), 0), Math.max(0, c.cohorts.reduce((x, u) => x + u.maxMen - u.men, 0) - (c.manpower || 0)))} lightly wounded return to the pool`, 'g'], [`${weary.length} unit${weary.length === 1 ? '' : 's'} below 75% would benefit`, '']], true)}
          ${card('data-a="hire"', `Hire ${hn} volunteers`, 'Men sign on for pay. They join the pool of available soldiers; you place them with the sliders.', [[`+${hn} soldiers available`, 'g'], [`${hcost} denarii`, 'b'], ['takes a day', '']], c.gold >= hcost)}
          ${card('data-a="fortify"', `Fortify the camp (level ${c.fort}/3)`, 'The men dig ditch and palisade. Two days of work make a level.', [['+4 battle morale per level', 'g'], [`withdrawal draw needs ${floor}% -> ${nextFloor}% of your army`, 'g'], ['10 supplies', '']], c.supplies >= 10 && c.fort < 3)}</div>
          <div class="row small" style="margin-top:6px"><span class="muted">Hire how many?</span><div class="chips">${[20, 50, 100, 200].map(k => `<button class="chip ${hn === k ? 'sel' : ''}" data-hiren="${k}">${k} men</button>`).join('')}</div></div>
          <h4 class="sect">Raise a unit <span class="pill">${c.cohorts.length}/${commandLimit(c)} units</span></h4><div class="small muted">Your command limit grows with every battle you win or draw.${room <= 0 ? ' <b>You are at the limit.</b>' : ''}</div>${room > 1 ? `<div class="row small" style="margin-top:6px"><span class="muted">Raise how many at once?</span><div class="chips">${[1, 5, 10].filter(k => k <= room || k === 1).map(k => `<button class="chip ${rk === k ? 'sel' : ''}" data-raisen="${k}">${k} unit${k > 1 ? 's' : ''}</button>`).join('')}</div></div>` : ''}<div class="regimens" style="margin-top:6px">${raise}</div>${note}`; }
      case 'officers': { const pts = offs.reduce((a, o) => a + (o.points || 0), 0);
        const rows = c.officers.map(o => `<tr class="${o.alive ? '' : 'dead'}"><td><div class="cellflex"><img class="portrait" alt="" src="${artSrc('officer', o.id, 80, 100, { title: o.name, rank: o.rank })}"><div>${esc(o.rank)} ${esc(o.name)}<div class="muted small">${esc(o.bio)}</div></div></div></td><td>L${o.level}</td><td class="small">Tac ${o.tactics}<br>Drl ${o.drill}</td><td class="small">Log ${o.logistics}<br>Dip ${o.diplomacy}</td></tr>`).join('');
        const assign = `<option value="">- none -</option>` + offs.map(o => `<option value="${o.id}" ${h.officerId === o.id ? 'selected' : ''}>${esc(o.name)}</option>`).join('');
        const unitOpts = c.cohorts.map(x => `<option value="${x.id}" ${x.id === this.sel ? 'selected' : ''}>${esc(x.name)}</option>`).join('');
        const skills = offs.map(o => { const p = o.points || 0, learned = (o.perks || []).map(i => `<span class="pill" title="${esc(perkById(i).text)}">${esc(perkById(i).name)}</span>`).join(' ');
          const avail = PERKS.filter(k => !(o.perks || []).includes(k.id) && o[k.trait] >= k.req).map(k => `<button class="act" data-a="learn" data-m="${o.id}:${k.id}" ${p > 0 ? '' : 'disabled'}>${esc(k.name)}<small>${esc(k.text)}</small></button>`).join('');
          return `<div class="skillrow"><div class="row"><b>${esc(o.name)}</b><span class="pill">${p} skill point${p === 1 ? '' : 's'}</span>${learned}</div>${p > 0 && avail ? `<div class="actions">${avail}</div>` : ''}</div>`; }).join('');
        return `<table><tr><th>Officer</th><th>Lvl</th><th></th><th></th></tr>${rows}</table><h4 class="sect">Attach an officer to a unit</h4><div class="row small"><select id="assign-unit">${unitOpts}</select><span class="muted">is led by</span><select id="assign">${assign}</select></div>
          <h4 class="sect">Skills ${pts ? `<span class="pill">${pts} to spend</span>` : ''}</h4><div class="small muted">Each level earns a skill point. Perks need a high enough rating. Attached officers help their own unit; others help the whole army.</div>${skills}`; }
      case 'forge': { const cat = UNIT_TYPES[h.type].cat, names = UPGRADES[cat], lt = LEVEL_TRAITS[levelFor(h.xp)], u = { armour: 0, weapon: 0, ...(h.upg || {}) }, prof = enemyProfile(scn);
        const heavy = prof.parts.find(x => x[2] === 'warband') ? prof.parts.find(x => x[2] === 'warband')[1] : 0;
        const adv = `${enemyLine(prof)} ${heavy > 50 ? 'Warbands are lightly armoured and win by charging: armour blunts their charge, better weapons win the melee. ' : ''}Spend on the units that will take the brunt, usually the front line, not on every cohort.`;
        const effect = { armour: `+6% armour per tier: every enemy blow does about 6% less damage`, weapon: `+10% attack per tier${cat === 'inf' ? '; tier 2 adds an extra pilum volley' : ''}` };
        const tgf = this.targets(h), gear = ['armour', 'weapon'].map(k => { const el = tgf.filter(x => upgradeCost(x, k).tier < MAX_TIER), cost = { tier: upgradeCost(h, k).tier, gold: el.reduce((a, x) => a + upgradeCost(x, k).gold, 0), supplies: el.reduce((a, x) => a + upgradeCost(x, k).supplies, 0) }, maxed = !el.length, ok = !maxed && c.gold >= cost.gold && c.supplies >= cost.supplies;
          return `<button class="regimen act" data-a="upgrade" data-m="${k}" ${act && ok ? '' : 'disabled'}><b>${esc(names[k])}: tier ${u[k]}/${MAX_TIER}</b><span class="t">${esc(effect[k])}</span><div class="eff">${maxed ? '<span class="g">Fully equipped</span>' : `<span class="g">tier ${u[k] + 1}</span><span class="b">${cost.gold} denarii</span><span>${cost.supplies} supplies, 1 day</span><span class="muted">${(cost.gold / Math.max(1, tgf.reduce((a, x) => a + x.men, 0))).toFixed(1)} denarii per man${tgf.length > 1 ? `, ${el.length} unit${el.length === 1 ? '' : 's'}` : ''}</span>`}</div></button>`; }).join('');
        return `<div class="advicebox"><b>The armourer's advice.</b> ${esc(adv)}</div><p class="muted">Pick a unit, then decide where its money goes.</p>${this.unitList(['str', 'gear'])}${this.scopeChips(h)}<h4 class="sect">Equip ${esc(tgf.length > 1 ? `${tgf.length} units` : h.name)}</h4><div class="small muted" style="margin-bottom:6px">${lt ? `Veteran trait: <b style="color:var(--gold)">${esc(lt.name)}</b> - ${esc(lt.text)}` : 'No veteran trait yet. Reach Veteran (level 2) for the first.'}</div><div class="regimens two">${gear}</div>${note}`; }
      case 'hospital': { const hosp = c.hospital || 0, cost = 120 * (hosp + 1), cur = modsOf(c).recovery, nxt = cur / (1 + 0.3 * hosp) * (1 + 0.3 * (hosp + 1));
        const lost = c.lastLoss || 0, back = c.lastBack || 0, more = lost ? Math.round(back * nxt / Math.max(0.01, cur)) - back : 0;
        const adv = lost ? `In your last battle you lost ${lost} men and ${back} returned to the ranks. ${hosp < 3 ? `A level ${hosp + 1} hospital would have returned about ${more} more.` : 'The hospital is fully built.'} Weigh that against what else ${cost} denarii and a day could buy.` : 'You have not fought a campaign battle yet. A hospital pays off only after battles with heavy casualties.';
        return `<div class="advicebox"><b>The physician's advice.</b> ${esc(adv)}</div><div class="sumtiles"><div><b>${hosp}/3</b><span>Hospital level</span></div><div><b>${Math.round(cur * 100)}%</b><span>Wounded recovery</span></div><div><b>${lost}</b><span>Lost last battle</span></div><div><b>${back}</b><span>Returned</span></div></div>
          <div class="regimens two"><button class="regimen act" data-a="hospital" ${act && hosp < 3 && c.gold >= cost && c.supplies >= 20 ? '' : 'disabled'}><b>${hosp >= 3 ? 'Hospital complete' : `Build level ${hosp + 1}`}</b><span class="t">Physicians, clean water and a place to lie down.</span><div class="eff">${hosp >= 3 ? '' : `<span class="g">wounded recovery ${Math.round(cur * 100)}% -> ${Math.round(nxt * 100)}%</span><span class="b">${cost} denarii</span><span>20 supplies, 1 day</span>`}</div></button></div>${note}`; }
      case 'hall': { const lg = bestOfficer(c, 'diplomacy'), sc = enemyScaleFor(c.favour), gain = hasPerk(c, 'allies') ? 2 : 1, tr = Math.round((90 + 15 * lg) * (hasPerk(c, 'tribute') ? 1.3 : 1)), prof = enemyProfile(scn);
        const sizeAt = (f) => `${Math.round(enemyScaleFor(f) * 100)}%`;
        const adv = `The next enemy is about ${Math.round(prof.tot * sc * DIFFICULTY[c.difficulty].enemyMult / 50) * 50} strong, at ${sizeAt(c.favour)} of its normal size because of your goodwill (${c.favour > 0 ? '+' : ''}${c.favour}). Goodwill of +2 or more shrinks it by 10%; -2 or less swells it by 10%. Gold now can cost you men later.`;
        const card = (attrs, name, text, effs, ok) => `<button class="regimen act" ${attrs} ${act && ok ? '' : 'disabled'}><b>${name}</b><span class="t">${text}</span><div class="eff">${effs.map(([x, cl]) => `<span class="${cl}">${x}</span>`).join('')}</div></button>`;
        return `<div class="advicebox"><b>The interpreter's advice.</b> ${esc(adv)}</div><div class="sumtiles"><div><b>${c.favour > 0 ? '+' : ''}${c.favour}</b><span>Goodwill</span></div><div><b>${c.gold}</b><span>Denarii</span></div><div><b>${sizeAt(c.favour)}</b><span>Enemy size</span></div></div>
          <h4 class="sect">How will you deal with the locals?</h4><div class="regimens">
          ${card('data-a="tribute" data-m="1"', 'Demand tribute', 'Squeeze the nobles for coin.', [[`+${tr} denarii`, 'g'], [`goodwill ${c.favour} -> ${Math.max(-3, c.favour - 1)}`, 'b'], [Math.max(-3, c.favour - 1) <= -2 ? `enemy grows to ${sizeAt(Math.max(-3, c.favour - 1))}` : `${Math.max(-3, c.favour - 1) + 2} more goodwill lost before the enemy grows`, Math.max(-3, c.favour - 1) <= -2 ? 'b' : '']], true)}
          ${card('data-a="tribute" data-m="0"', 'Gifts to the chieftains', 'Win friends; they speak well of you and weaken your enemies.', [[`goodwill ${c.favour} -> ${Math.min(3, c.favour + gain)}`, 'g'], [Math.min(3, c.favour + gain) >= 2 ? `enemy shrinks to ${sizeAt(Math.min(3, c.favour + gain))}` : `${2 - Math.min(3, c.favour + gain)} more goodwill needed to shrink the enemy`, Math.min(3, c.favour + gain) >= 2 ? 'g' : ''], ['60 denarii', 'b']], c.gold >= 60)}
          ${card('data-a="scout"', c.scouted ? 'Enemy scouted' : 'Send scouts', 'Learn exactly what you will face.', [['exact enemy numbers', 'g'], ['when reinforcements will arrive', 'g'], [hasPerk(c, 'spymaster') ? 'costs no day' : 'costs a day', '']], !c.scouted)}</div>${note}`; }
      default: return '';
    }
  }

  render() {
    const c = this.c, scn = SCENARIOS[Math.min(c.scenario, SCENARIOS.length - 1)], diff = DIFFICULTY[c.difficulty];
    const visited = c.visitedBuildings = c.visitedBuildings || [], adv = advice(c, visited);
    const meta = this.open === 'praetorium' ? { name: 'Command Tent', sub: 'Your next battle and the march' } : BUILDINGS.find(b => b.id === this.open);
    const food = Math.ceil(totalMen(c) / 60 * modsOf(c).supplyUse);
    const res = `<span>Denarii <b>${c.gold}</b></span>${(c.manpower || 0) > 0 ? `<span title="Assign them at the Barracks">Soldiers available <b class="poolN">${c.manpower}</b></span>` : ''}<span>Supplies <b>${c.supplies}</b> <span class="muted small">(-${food}/day)</span></span><span title="Each activity uses one day">Days left <b>${c.daysLeft}</b> <span class="muted small">(1 per activity)</span></span>`;
    this.root.innerHTML = `<div class="camp2"><header><h2>Camp - ${esc(scn.theater)}, ${esc(scn.year)}</h2><div class="res">${res}<span>Fort <b>${c.fort}/3</b></span><span>Goodwill <b>${c.favour > 0 ? '+' : ''}${c.favour}</b></span><span class="pill">${esc(diff.name)}</span></div></header>
      <div class="advice">${adv.text}</div>
      <div class="scenewrap">${sceneSvg(c, { visited, focus: adv.focus })}</div>
      <div class="campbar"><div class="muted small">${unlockedBuildings(c).length} of ${BUILDINGS.length} buildings built. Win or draw battles to build more.</div><div class="row"><button class="primary" id="march">March to battle</button><button id="tomap">Back to map</button></div></div>
      ${this.open && meta ? `<div class="overlay" id="ov"><div class="panel" role="dialog" aria-label="${esc(meta.name)}"><div class="phead"><div><h2>${esc(meta.name)}</h2><div class="muted small">${esc(meta.sub)}</div></div><div class="pres">${res}</div><button id="p-close">Back to camp</button></div><div class="pbody">${this.panelBody(this.open)}</div>${this.msgs.length ? `<div class="plog">${this.msgs.slice(0, 3).map(m => `<div class="${m.kind}">${esc(m.msg)}</div>`).join('')}</div>` : ''}</div></div>` : ''}</div>`;
    const R = this.root, q = (s) => R.querySelector(s);
    R.querySelectorAll('.bld').forEach(g => { const open = () => { this.open = g.dataset.b; if (!visited.includes(this.open) && this.open !== 'praetorium') { visited.push(this.open); this.api.save(); } this.render(); }; g.onclick = open; g.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }; });
    if (q('#ov')) { q('#ov').onclick = (e) => { if (e.target.id === 'ov') { this.open = null; this.snap = null; this.render(); } }; q('#p-close').onclick = () => { this.open = null; this.snap = null; this.render(); }; }
    R.querySelectorAll('tr.clickable').forEach(tr => tr.onclick = () => { this.sel = +tr.dataset.id; this.render(); });
    if (q('#instr')) q('#instr').onchange = (e) => this.setInstructor(e.target.value ? +e.target.value : null);
    if (q('#assign')) q('#assign').onchange = (e) => this.assign(e.target.value ? +e.target.value : null);
    if (q('#assign-unit')) q('#assign-unit').onchange = (e) => { this.sel = +e.target.value; this.render(); };
    R.querySelectorAll('[data-forage]').forEach(b => b.onclick = () => this.forageDo(b.dataset.forage));
    R.querySelectorAll('[data-scope]').forEach(b => b.onclick = () => { this.scope = b.dataset.scope; this.render(); });
    R.querySelectorAll('[data-raisen]').forEach(b => b.onclick = () => { this.raiseN = +b.dataset.raisen; this.render(); });
    R.querySelectorAll('[data-hiren]').forEach(b => b.onclick = () => { this.hireN = +b.dataset.hiren; this.render(); });
    R.querySelectorAll('input.mslide').forEach(inp => { inp.oninput = () => this.onSlide(+inp.dataset.id, +inp.value); inp.onchange = () => this.api.save(); });
    if (q('#m-fill')) q('#m-fill').onclick = () => this.fillEvenly(); if (q('#m-undo')) q('#m-undo').onclick = () => this.undoMuster();
    R.querySelectorAll('[data-regimen]').forEach(b => b.onclick = () => { this.regimen = b.dataset.regimen; this.render(); });
    R.querySelectorAll('[data-leader]').forEach(b => b.onclick = () => { this.leader = b.dataset.leader; this.render(); });
    if (q('#run-drill')) q('#run-drill').onclick = () => this.runDrill();
    R.querySelectorAll('.act').forEach(b => b.onclick = () => {
      const a = b.dataset.a, m = b.dataset.m;
      if (a === 'learn') this.learn(m); else if (a === 'upgrade') this.upgrade(m); else if (a === 'raise') this.raise(m); else if (a === 'doctrine') this.learnDoctrine(m);
      else if (a === 'tribute') this.tribute(m === '1'); else this[a]();
    });
    q('#march').onclick = () => this.api.march(); q('#tomap').onclick = () => this.api.map();
    if (q('#march2')) q('#march2').onclick = () => this.api.march(); if (q('#tomap2')) q('#tomap2').onclick = () => this.api.map();
    const f = adv.focus && !this.open ? R.querySelector(`.bld[data-b="${adv.focus}"]`) : null; if (f) f.focus({ preventScroll: true });
  }
}
