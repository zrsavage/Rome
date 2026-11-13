// Between-battle camp phase: training, foraging, fortifying, diplomacy, recruiting. Nothing here is limited by time, only by denarii,
// supplies and men; a few returns fall off when repeated in the same camp.
import { LEVEL_NAMES, SCENARIOS, DIFFICULTY, UNIT_TYPES, RAISE, XP_LEVELS } from './data.js';
import { PERKS, perkById, LEVEL_TRAITS, UPGRADES, MAX_TIER, upgradeCost } from './perks.js';
const upCost = (c, x, k) => { const u = upgradeCost(x, k); return { ...u, gold: Math.round(u.gold * costMult(c)) }; };   // Economy makes equipment cheaper
import { levelFor } from './sim.js';
import { TEMPERS, temperOf, rivalOf, tierOf, rankFor, TIER_TEXT } from './officers.js';
import { CAREER, CAREER_MAX, careerLv, careerPoints, careerOffer, chooseCareer, costMult, legionsOf, legateOf, setLegate, ROMAN, currentScn } from './campaign.js';
import { heroesOf, DECORATIONS, decoMorale } from './heroes.js';
import { officerPending, chooseOfficer, officerTrack, officerKind, OFFICER_KINDS, unitPending, chooseUnit, unitChosen, unitRecord, standsOut, unitTrack } from './promote.js';
import { officerById, modsOf, hasPerk, commandLimit, unlockedTypes, COMMAND_PER_WIN, COMMAND_PER_ORG } from './state.js';
import { artSrc } from './art.js';
import { inform } from './ui.js';
import { DOCTRINES, winsOf } from './doctrine.js';
import { icon } from './icons.js';
import { BUILDINGS, sceneSvg, advice, unlockedBuildings } from './campscene.js';

const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pct = (v, m) => Math.max(0, Math.min(100, v / m * 100));
export const totalMen = (c) => c.cohorts.reduce((a, h) => a + h.men, 0);
export const dailyFood = (c) => Math.ceil(totalMen(c) / 60 * modsOf(c).supplyUse);
// The march to the next battle is the only thing that takes time: the army eats on the road. Paid once per battle, when you march.
export const marchDays = (scn) => (scn && scn.daysToPrepare) || 3;
export const rationsDue = (c, scn) => (scn && !(scn.phaseIdx > 0) && scn.id !== 'prologue' && c.rationsPaid !== scn.id) ? dailyFood(c) * marchDays(scn) : 0;
// Breaking camp: pay the march rations, and instructors put their cohorts through a last few days of drill on the way. Returns a note, or ''.
export function breakCamp(c, scn) {
  const due = rationsDue(c, scn); if (!due) return '';
  c.rationsPaid = scn.id; let msg = '';
  if (c.supplies >= due) c.supplies -= due;
  else { c.supplies = 0; c.cohorts.forEach(h => h.condition = Math.max(20, h.condition - 8)); msg = 'The army marches hungry: condition drops. '; }
  for (const h of c.cohorts) {
    const ins = officerById(c, h.instructorId); if (!ins || c.supplies < 6) continue;
    c.supplies -= 6; const q = 0.35 + 0.08 * ins.drill, bonus = (ins.perks || []).includes('drillmaster') ? 1.25 : 1;
    h.xp += Math.round(30 * q * bonus); h.drill = Math.min(100, h.drill + Math.round(9 * q * bonus));
  }
  c.day = (c.day || 1) + marchDays(scn); c.campUse = {};
  return msg;
}
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
  bibracte: 'A long day with wave after wave of enemies. Build both skill and stamina, and keep the men fit.',
  anquillaria: 'Their horse will ride round you throwing javelins. A line that keeps its shape under missiles and does not chase wins this.',
  castra: 'Holding a crest is about cohesion. Drill them to turn and close up quickly.',
  utica: 'Romans against Romans: the same pila, the same drill. Experience and a fresh reserve decide it.',
  water: 'More missiles than melee. Keep the men steady, and do not wear them out chasing horsemen in this heat.',
  bagradas: 'If this is the fight the deserters warn of, every man must be fit and steady. Rest them, and drill cohesion over killing.',
  pharsalus: 'Romans against Romans again, and more of them. Experience wins this: the men must hold their nerve longer than Pompey\'s.',
  comana: 'A straightforward fight. Sharpen their weapons work.',
  steppe: 'Horse archers wear a line down from a distance. Steady, well-drilled men who will not break under arrows matter most.',
  nicopolis: 'An attack on trenches, and the new men will be shaky. Drill and rest them, and keep a reserve for when the green legion wavers.',
  zela: 'They will come uphill at us. Steady men with full pila, and every cohort drilled to open its ranks for the chariots.',
  ruspina: 'If we are caught in the open by their horse, only cohorts that can turn about and face both ways will live. Drill formations.',
  uzitta: 'Uphill against men who know our drill. Seasoned troops, fit enough for the climb.',
  thapsus: 'Elephants on both wings again. Drill the men to open their ranks, and keep them steady: the veterans are too eager as it is.',
  ategua: 'A winter assault on walls. Fit, well-fed men with good armour; rest them before we go.',
  munda: 'The longest, hardest day of the war. Every cohort fit, every reserve fresh. Rotation will win it, not the first charge.'
};
// What the next enemy is made of, in words the player can act on.
const ENEMY_NAMES = { warband: 'warbands', gaul_elite: 'armoured champions', gaul_skirm: 'javelineers', gaul_cav: 'horsemen', suebi: 'Suebi warbands', german_cav: 'Germanic horse and runners', laager: 'wagon laagers', numid_cav: 'Numidian horse', numid_inf: 'Numidian foot', elephant: 'war elephants', pompeian: 'Pompeian legionaries', pomp_cav: 'Pompeian horse', pomp_missile: 'archers and slingers', pontic: 'Pontic infantry', horse_archer: 'Sarmatian horse archers', lancer: 'Sarmatian lancers', chariot: 'scythed chariots', pomp_levy: 'Pompeian levies' };
function enemyProfile(scn) {
  const all = [...scn.enemy, ...scn.reinforcements.filter(r => r.side !== 'rome').map(r => r.unit)], tot = all.reduce((a, e) => a + e.men, 0), by = {};
  all.forEach(e => { by[e.type] = (by[e.type] || 0) + e.men; });
  return { tot, parts: Object.entries(by).map(([t, n]) => [ENEMY_NAMES[t] || t, Math.round(n / tot * 100), t]).sort((a, b) => b[1] - a[1]) };
}
const enemyLine = (p) => `The enemy will be mostly ${p.parts.slice(0, 3).map(([n, pc]) => `${n} (${pc}%)`).join(', ')}.`;
// Advisers only know what the enemy brings once you have scouted, or once your career in Reconnaissance gives you informers everywhere.
const knowsEnemy = (c) => !!c.scouted || careerLv(c, 'recon') >= 1;
const enemyHint = (c, p) => knowsEnemy(c) ? enemyLine(p) + ' ' : '';
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

const flagIcon = () => '<svg class="flagico" viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path d="M5 22V2" stroke="#3a2a14" stroke-width="2.4" stroke-linecap="round"/><path d="M6 3h13l-3.2 4.2L19 11.5H6z" fill="#b3261e" stroke="#5a120e" stroke-width="1"/></svg>';
// Temperament, rival and promotion tags shown under an officer in the Officers panel.
function officerTags(c, o) {
  if (!o.alive) return '';
  const t = temperOf(o), tm = TEMPERS[t], rv = rivalOf(o) != null ? c.officers.find(x => x.id === rivalOf(o) && x.alive) : null, tier = tierOf(o);
  return `<div class="row small" style="gap:4px;margin-top:3px;flex-wrap:wrap"><span class="pill" title="${esc(tm.text)}">${esc(tm.name)}</span>${rv ? `<span class="pill" title="Rivals fight harder when side by side in a fight, each determined not to be outdone.">Rival: ${esc(rv.name.split(' ').pop())}</span>` : ''}${tier ? `<span class="pill" title="${esc(TIER_TEXT[tier])}">${tier === 1 ? 'Rallying point' : 'Immovable'}</span>` : ''}</div>`;
}
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

  // Nothing in camp costs time: every action is paid for in denarii, supplies or men. Some returns fall off when repeated in one camp
  // (the countryside is stripped, the nobles are squeezed dry), so the budget is what limits you, not a calendar.
  used(k) { const u = this.c.campUse || (this.c.campUse = {}); return u[k] || 0; }
  bump(k) { const u = this.c.campUse || (this.c.campUse = {}); u[k] = (u[k] || 0) + 1; }
  done() { this.api.save(); this.render(); }
  canAct() { return true; }
  // A drill costs food and kit; drilling the same unit again in one camp costs more each time (the men need feeding up and re-equipping).
  drillCost(x, key) { return Math.round(REGIMENS[key].sup * 2 * (1 + 0.5 * this.used('d' + x.id))); }
  // The best man for the drill leads it, you or the officer whose skill suits it: no need to choose.
  bestLeader(h, key) { let best = 'self', top = -1; for (const id of ['self', ...this.c.officers.filter(o => o.alive).map(o => o.id)]) { const p = planDrill(this.c, h, key, id); if (p.xp + p.dr > top + 0.01) { top = p.xp + p.dr; best = id; } } return best; }
  forageYield(kind) { const lg = bestOfficer(this.c, 'logistics'), fm = modsOf(this.c).forage, k = Math.pow(0.7, this.used('forage')); return Math.round((kind === 'wide' ? 70 + 12 * lg : kind === 'requisition' ? 60 + 10 * lg : 35 + 8 * lg) * fm * k); }
  grainPrice() { return Math.round(90 * (1 + 0.25 * this.used('buy'))); }
  tributeYield() { return Math.round((90 + 15 * bestOfficer(this.c, 'diplomacy')) * (hasPerk(this.c, 'tribute') ? 1.3 : 1) * Math.pow(0.6, this.used('tribute'))); }
  restCost() { return dailyFood(this.c); }
  scoutCost() { return hasPerk(this.c, 'spymaster') ? 0 : 40; }

  selected() { return this.c.cohorts.find(h => h.id === this.sel); }
  // With a big army you cannot do everything one unit at a time: orders can cover every unit of the same kind at once.
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
    const p = this.drillPlan(h, key, this.bestLeader(h, key)), tg = this.targets(h), cost = tg.reduce((a, x) => a + this.drillCost(x, key), 0);
    if (c.supplies < cost) return;
    const who = p.leader ? `${p.leader.rank} ${p.leader.name}` : 'You';
    this.drillScene(h, p, () => {
      c.supplies -= cost; tg.forEach(x => this.bump('d' + x.id)); let hurtTotal = 0;
      for (const x of tg) {
        const q = this.drillPlan(x, key, this.bestLeader(x, key));
        x.xp += q.xp; x.drill = Math.min(100, x.drill + q.dr); x.condition = Math.max(25, x.condition + q.cond);
        if (q.risk && Math.random() < q.risk) { const n = Math.max(2, Math.round(x.men * (0.01 + Math.random() * 0.02))); x.men = Math.max(10, x.men - n); hurtTotal += n; }
      }
      const hurt = hurtTotal ? ` ${hurtTotal} men were hurt in the practice.` : '';
      this.note(`${who} ran ${p.r.name.toLowerCase()} for ${tg.length > 1 ? `${tg.length} units` : h.name}: +${p.xp} XP, +${p.dr} drill each.${hurt}`, hurt ? '' : 'good');
      this.regimen = null; this.done();
    });
  }
  // Four ways to feed the army, each with a different price: risk, goodwill or coin. The land near camp is stripped as you go:
  // each foraging party in the same camp brings back less, and merchants raise their price.
  forageDo(kind) {
    const c = this.c, lg = bestOfficer(c, 'logistics'); let got = 0, extra = '', text;
    if (kind === 'buy') { const pr = this.grainPrice(); if (c.gold < pr) return; c.gold -= pr; got = 60; this.bump('buy'); text = `Merchants sell you grain for ${pr} denarii`; }
    else {
      got = this.forageYield(kind); this.bump('forage');
      if (kind === 'requisition') { c.favour = Math.max(-3, c.favour - 1); text = 'Requisitioned grain arrives; the villagers are not pleased (goodwill -1)'; }
      else {
        text = 'Foraging party returns';
        if (kind === 'wide' && Math.random() < 0.35 - 0.03 * lg) { const h = c.cohorts[Math.floor(Math.random() * c.cohorts.length)], lost = Math.max(2, Math.round(h.men * (0.03 + Math.random() * 0.05))); h.men -= lost; h.condition = Math.max(25, h.condition - 8); extra = ` Gallic raiders ambushed ${h.name}: ${lost} men lost.`; }
      }
    }
    c.supplies += got; this.note(`${text} with ${got} supplies.${extra}`, extra || kind === 'requisition' ? 'bad' : 'good'); this.done();
  }
  fortify() {
    const c = this.c; if (c.supplies < 25 || c.fort >= 3) return;
    c.supplies -= 25; c.fortWork = (c.fortWork || 0) + 1 + (bestOfficer(c, 'logistics') >= 4 ? 1 : 0);
    let msg = 'The ditch and palisade grow.';
    while (c.fortWork >= 2 && c.fort < 3) { c.fortWork -= 2; c.fort++; msg = `Camp fortifications reach level ${c.fort}.`; }
    this.note(msg, 'good'); this.done();
  }
  tribute(demand) {
    const c = this.c;
    if (demand) { const g = this.tributeYield(); this.bump('tribute'); c.gold += g; c.favour = Math.max(-3, c.favour - 1); this.note(`Gallic nobles are made to pay ${g} denarii. They are not pleased.`, ''); }
    else { if (c.gold < 60 || c.favour >= 3) return; c.gold -= 60; c.favour = Math.min(3, c.favour + (hasPerk(c, 'allies') ? 2 : 1)); this.note('Gifts to friendly chieftains win goodwill; scouts and rivals speak in your favour.', 'good'); }
    this.done();
  }
  // Rest: everyone recovers condition for a day's rations. The first rest in a camp also brings the lightly wounded back (15% of the men still missing).
  restBack() { const c = this.c; if (this.used('rest')) return 0; return Math.min(c.cohorts.reduce((x, u) => x + Math.round((u.maxMen - u.men) * 0.15), 0), Math.max(0, c.cohorts.reduce((x, u) => x + u.maxMen - u.men, 0) - (c.manpower || 0) - (c.vets || 0))); }
  rest() {
    const c = this.c, cost = this.restCost(); if (c.supplies < cost) return; let back = 0; const first = !this.used('rest');
    c.supplies -= cost; this.bump('rest');
    c.cohorts.forEach(h => { h.condition = Math.min(100, h.condition + 20); if (first) back += Math.round((h.maxMen - h.men) * 0.15); });
    back = Math.min(back, Math.max(0, c.cohorts.reduce((a, h) => a + h.maxMen - h.men, 0) - (c.manpower || 0) - (c.vets || 0)));   // places already covered by waiting soldiers cannot be filled twice
    c.vets = (c.vets || 0) + back;                              // the lightly wounded are your own veterans: they go back into the pool and do not dilute a unit's experience
    this.note(`The men rest and mend their kit.${back ? ` ${back} lightly wounded are fit to serve again and join the pool as veterans.` : ''}`, 'good'); this.done();
  }
  // Hiring volunteers puts men into the pool of available soldiers; you place them with the sliders.
  hire() {
    const c = this.c, n = this.hireN || 50, cost = Math.round(n * 3 * costMult(c)); if (c.gold < cost) return;
    c.gold -= cost; c.manpower = (c.manpower || 0) + n;
    this.note(`${n} volunteers sign on. Assign them to units with the sliders.`, 'good'); this.done();
  }
  // Veterans cost far more than raw volunteers, but they know their trade: they do not dilute a unit's experience.
  vetCost(n) { return Math.round(n * 8 * costMult(this.c) * (1 - 0.1 * careerLv(this.c, 'training'))); }
  hirevets() {
    const c = this.c, n = this.hireN || 50, cost = this.vetCost(n); if (c.gold < cost) return;
    c.gold -= cost; c.vets = (c.vets || 0) + n;
    this.note(`${n} time-served veterans re-enlist. Assign them to units with the sliders.`, 'good'); this.done();
  }
  // ----- the muster roll: sliders move soldiers between the pool and your units (free) -----
  onSlide(id, val) {
    const c = this.c, h = c.cohorts.find(x => x.id === id); if (!h) return;
    c.manpower = c.manpower || 0; c.vets = c.vets || 0;
    this.snap = this.snap || { pool: c.manpower, vets: c.vets, u: {} };
    const sn = this.snap.u[id] || (this.snap.u[id] = { men0: h.men, xp0: h.xp, vet: 0, raw: 0 });
    let v = Math.min(h.maxMen, Math.max(Math.min(30, h.men), Math.round(val))), delta = v - h.men;
    if (delta > 0) {                                            // veterans go first: they are the ones worth placing with care
      delta = Math.min(delta, c.vets + c.manpower); v = h.men + delta;
      const dv = Math.min(delta, c.vets); c.vets -= dv; c.manpower -= delta - dv; sn.vet += dv; sn.raw += delta - dv;
    } else if (delta < 0) {
      let back = -delta; const r = Math.min(back, sn.raw); sn.raw -= r; c.manpower += r; back -= r;
      const vv = Math.min(back, sn.vet); sn.vet -= vv; c.vets += vv; back -= vv; c.manpower += back;
    }
    h.men = v;
    h.xp = sn.raw > 0 ? Math.round(sn.xp0 * (sn.men0 + sn.vet) / (sn.men0 + sn.vet + sn.raw)) : sn.xp0;   // raw men dilute experience; veterans do not
    const row = this.root.querySelector(`.mrow[data-id="${id}"]`);
    if (row) { row.querySelector('input').value = v; row.querySelector('.mval').textContent = `${v}/${h.maxMen}`; const lv = levelFor(h.xp); row.querySelector('.mxp').innerHTML = `${LEVEL_NAMES[lv]}${h.xp < sn.xp0 ? ` <span class="b">(diluted by ${Math.round((1 - h.xp / Math.max(1, sn.xp0)) * 100)}%)</span>` : ''}`; row.classList.toggle('chg', v !== sn.men0); }
    for (const el of this.root.querySelectorAll('.poolN')) el.textContent = c.manpower;
    for (const el of this.root.querySelectorAll('.vetN')) el.textContent = c.vets;
  }
  fillEvenly() {
    const c = this.c, need = c.cohorts.filter(h => h.men < h.maxMen), M = need.reduce((a, h) => a + (h.maxMen - h.men), 0), pool = (c.manpower || 0) + (c.vets || 0); if (!M || !pool) return;
    let left = pool; const plan = need.map(h => ({ h, add: pool >= M ? h.maxMen - h.men : Math.floor(pool * (h.maxMen - h.men) / M) }));
    left -= plan.reduce((a, q) => a + q.add, 0); for (const q of plan.sort((a, b) => (b.h.maxMen - b.h.men) - (a.h.maxMen - a.h.men))) { if (left <= 0) break; if (q.h.men + q.add < q.h.maxMen) { q.add++; left--; } }
    for (const q of plan) this.onSlide(q.h.id, q.h.men + q.add);
    this.api.save(); this.render();
  }
  undoMuster() {
    if (!this.snap) return; const c = this.c;
    for (const [id, sn] of Object.entries(this.snap.u)) { const h = c.cohorts.find(x => x.id === +id); if (h) { h.men = sn.men0; h.xp = sn.xp0; } }
    c.manpower = this.snap.pool; c.vets = this.snap.vets || 0; this.snap = null; this.api.save(); this.render();
  }
  musterHtml(act) {
    const c = this.c, pool = c.manpower || 0, vets = c.vets || 0, big = c.cohorts.length > 8;
    const rank = (x) => ({ inf: 0, ranged: 1, cav: 2 }[UNIT_TYPES[x.type].cat] ?? 3) * 10 + (x.type === 'legionary' ? 0 : 1);
    const list = big ? [...c.cohorts].sort((a, b) => rank(a) - rank(b) || a.id - b.id) : c.cohorts; let last = null;
    const rows = list.map(h => {
      const sn = this.snap && this.snap.u[h.id], lv = levelFor(h.xp), grp = big && h.type !== last ? `<div class="mgrp">${esc(UNIT_TYPES[h.type].name)}</div>` : ''; last = h.type;
      return grp + `<div class="mrow ${sn && sn.men0 !== h.men ? 'chg' : ''}" data-id="${h.id}"><div class="mname"><img class="uicon" alt="" src="${artSrc('unit', h.type, 40, 40)}"><div>${esc(h.name)}<div class="muted small">${esc(UNIT_TYPES[h.type].name)}</div></div></div>
        <input class="mslide" type="range" min="${Math.min(30, h.men)}" max="${h.maxMen}" step="1" value="${h.men}" data-id="${h.id}" aria-label="Men in ${esc(h.name)}"><div class="mval">${h.men}/${h.maxMen}</div><div class="mxp small">${LEVEL_NAMES[lv]}${sn && h.xp < sn.xp0 ? ` <span class="b">(diluted by ${Math.round((1 - h.xp / Math.max(1, sn.xp0)) * 100)}%)</span>` : ''}</div><div class="mcond small muted">${Math.round(h.condition)}% fit</div></div>`;
    }).join('');
    const missing = c.cohorts.reduce((a, h) => a + (h.maxMen - h.men), 0);
    return `<div class="muster"><div class="mhead"><div><b class="poolN big2">${pool}</b> <span>recruits</span> &nbsp; <b class="vetN big2">${vets}</b> <span>veterans</span><div class="small muted">Recruits and levies arrive after battles; you can also hire more. Drag a slider right to send men to a unit, left to take them back. Veterans are placed first and keep a unit's experience; raw recruits dilute it. ${missing} places are empty across the army.</div></div>
      <div class="row"><button id="m-fill" ${pool + vets > 0 && missing > 0 ? '' : 'disabled'}>Fill evenly</button><button id="m-undo" ${this.snap ? '' : 'disabled'}>Undo changes</button></div></div><div class="mlist">${rows}</div></div>`;
  }
  scout() { const c = this.c, cost = this.scoutCost(); if (c.scouted || c.gold < cost) return; c.gold -= cost; c.scouted = true; this.note(cost ? `Scouts report the enemy dispositions (${cost} denarii).` : 'Your spies report the enemy dispositions, free of charge.', 'good'); this.done(); }
  // ----- management depth -----
  learn(spec) {
    const [oid, pid] = spec.split(':'), o = this.c.officers.find(x => x.id === +oid), pend = o && officerPending(o), k = pend && pend.options.find(x => x.id === pid);
    if (!k || !chooseOfficer(o, pid)) return;
    this.note(`${o.name}: ${k.name}.`, 'good'); this.api.save(); this.render();
  }
  upgrade(kind) {
    const c = this.c, h = this.selected(), names = UPGRADES[UNIT_TYPES[h.type].cat], tg = this.targets(h).filter(x => upCost(this.c, x, kind).tier < MAX_TIER);
    const gold = tg.reduce((a, x) => a + upCost(this.c, x, kind).gold, 0), sup = tg.reduce((a, x) => a + upCost(this.c, x, kind).supplies, 0);
    if (!tg.length || c.gold < gold || c.supplies < sup) return;
    c.gold -= gold; c.supplies -= sup; for (const x of tg) { x.upg = { armour: 0, weapon: 0, ...(x.upg || {}) }; x.upg[kind]++; }
    this.note(tg.length > 1 ? `${tg.length} units: ${names[kind]} upgraded.` : `${h.name}: ${names[kind]} upgraded to tier ${h.upg[kind]}.`, 'good'); this.done();
  }
  raise(type) {
    const c = this.c, r = RAISE[type], k = Math.max(1, Math.min(this.raiseN || 1, commandLimit(c) - c.cohorts.length));
    if (!r || c.cohorts.length >= commandLimit(c) || c.gold < Math.round(r.gold * costMult(c)) * k || c.supplies < r.supplies * k) return;
    c.gold -= Math.round(r.gold * costMult(c)) * k; c.supplies -= r.supplies * k;
    for (let q = 0; q < k; q++) {
    const id = Math.max(0, ...c.cohorts.map(x => x.id)) + 1, n = c.cohorts.filter(x => x.type === type).length + 1;
    const name = { legionary: `${roman(c.cohorts.filter(x => x.type === 'legionary').length + 1)} Cohort`, slinger: `Slingers ${n}`, archer: `Archers ${n}`, equites: `Turma ${n}`, aux_cav: `Allied Horse ${n}`, aux_inf: `Allied Infantry ${n}` }[type];
    c.cohorts.push({ id, name, type, men: r.men, maxMen: r.max, xp: 0, drill: 10, condition: 100, officerId: null });
    this.sel = id; if (q === k - 1) this.note(k > 1 ? `${k} new units are raised: ${name} and its sisters.` : `${name} is raised (${r.men} men).`, 'good');
    }
    this.done();
  }
  hospital() {
    const c = this.c, lvl = c.hospital || 0, gold = 120 * (lvl + 1), sup = 20;
    if (lvl >= 3 || c.gold < gold || c.supplies < sup) return;
    c.gold -= gold; c.supplies -= sup; c.hospital = lvl + 1; this.note(`Field hospital reaches level ${c.hospital}: wounded recover better.`, 'good'); this.done();
  }
  learnDoctrine(id) {
    const c = this.c, d = DOCTRINES.find(x => x.id === id); c.doctrines = c.doctrines || [];
    const teacher = c.officers.filter(o => o.alive && o[d.trait] >= d.req).sort((a, b) => b[d.trait] - a[d.trait])[0];
    if (!d || c.doctrines.includes(id) || winsOf(c) < d.wins || c.gold < d.gold || !teacher) return;
    c.gold -= d.gold; c.doctrines.push(id);
    this.note(`${teacher.rank} ${teacher.name} drills the army in ${d.name}. In battle, press ${d.key}.`, 'good'); this.done();
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
  // The commander's own career: a point for every battle won or drawn, one choice at a time from three skills on offer.
  careerHtml() {
    const c = this.c, offer = careerOffer(c), lv = CAREER.filter(k => careerLv(c, k.id) > 0).map(k => `<span class="pill" title="${esc(k.text)}">${esc(k.name)} ${careerLv(c, k.id)}</span>`).join(' ');
    const head = offer ? `<div class="decision"><div class="dhead">${flagIcon()}<div><b>Your career:</b> you have earned an advancement <span class="pill">${careerPoints(c)} to choose</span><div class="small muted">Every battle won or drawn brings one. Three paths are offered each time; the others come round again.</div></div></div>
      <div class="choice3">${offer.map(k => `<button class="regimen" data-pick="career:0:${k.id}"><b>${esc(k.name)} ${careerLv(c, k.id) + 1}</b><span class="t">${esc(k.text)}</span></button>`).join('')}</div></div>` : '';
    return head + (lv ? `<div class="small" style="margin-bottom:8px"><span class="muted">Your career:</span> ${lv}</div>` : '');
  }
  // Legions: with more than ten legionary cohorts the army is in several legions, and each can be given a legate with a command ring of his own.
  legionHtml() {
    const c = this.c, lg = legionsOf(c); if (lg.count < 2) return `<h4 class="sect">Legions</h4><div class="small muted">Your army is one legion, under your own command. When you have more than ten legionary cohorts it will form a second, and you can give each a legate.</div>`;
    const free = c.officers.filter(o => o.alive), rows = [];
    for (let k = 1; k <= lg.count; k++) { const n = c.cohorts.filter(h => lg.of[h.id] === k).length, cur = legateOf(c, k);
      rows.push(`<div class="row small" style="margin-top:4px"><b>Legio ${ROMAN[k] || k}</b><span class="muted">${n} units</span><span class="muted">legate</span><select data-legate="${k}"><option value="">- you, from the general's ring -</option>${free.map(o => `<option value="${o.id}" ${cur && cur.id === o.id ? 'selected' : ''}>${esc(o.name)} (tactics ${o.tactics})</option>`).join('')}</select></div>`); }
    return `<h4 class="sect">Legions</h4><div class="small muted">A legate rides behind his legion; its units inside his ring count as in command. An officer made legate leaves his cohort. In battle, Alt+1, Alt+2... select a legion.</div>${rows.join('')}`;
  }
  // A cohort that has gained a rank chooses one of two improvements. Only the first waiting cohort is shown: one decision at a time.
  promoHtml() {
    const c = this.c, waiting = c.cohorts.filter(x => unitPending(x)), h1 = waiting[0]; if (!h1) return '';
    const p = unitPending(h1);
    return `<div class="decision"><div class="dhead">${flagIcon()}<div><b>${esc(h1.name)}</b> has reached the rank of <b>${esc(p.rank)}</b> <span class="pill">choice ${p.row + 1} of ${unitTrack(h1).length}</span><div class="small muted">Every ${esc(UNIT_TYPES[h1.type].cat === 'inf' ? 'cohort of foot' : UNIT_TYPES[h1.type].cat === 'cav' ? 'squadron of horse' : 'unit of missile troops')} gets the same choice at this rank. Pick one; the other is given up.${waiting.length > 1 ? ` ${waiting.length - 1} more unit${waiting.length > 2 ? 's are' : ' is'} waiting.` : ''}</div></div></div>
      <div class="choice2">${p.options.map(k => `<button class="regimen" data-pick="unit:${h1.id}:${k.id}"><b>${esc(k.name)}</b><span class="t">${esc(k.text)}</span></button>`).join('<div class="or">or</div>')}</div></div>`;
  }
  // The unit record: what this cohort's numbers are, what it is best at and where it stands out from the others like it.
  recordHtml(h) {
    const c = this.c, off = (x) => officerById(c, x.officerId), r = unitRecord(h, off(h)), so = standsOut(h, c.cohorts, off), ups = unitChosen(h), lv = levelFor(h.xp), nextLv = lv < 5 ? LEVEL_NAMES[lv + 1] : null;
    const bars = r.stats.map(st => { const w = Math.max(3, Math.min(100, st.value / st.max * 100)), b0 = Math.max(0, Math.min(100, st.base / st.max * 100)), up = st.value > st.base * 1.005;
      return `<div class="statrow"><span>${st.name}</span><div class="statbar"><i style="width:${w}%" class="${up ? 'up' : ''}"></i><em style="left:${b0}%" title="A raw unit of this type"></em></div><b>${st.show}</b></div>`; }).join('');
    return `<div class="card unitrec"><div class="row" style="justify-content:space-between;align-items:flex-start"><div><b>${esc(h.name)}</b> <span class="muted small">- ${esc(UNIT_TYPES[h.type].name)}, ${esc(LEVEL_NAMES[lv])}</span><div class="small">${esc(r.best)}</div></div></div>
      <div class="stats">${bars}</div>
      <div class="small" style="margin-top:6px">${so.better.length ? `<span style="color:var(--green)">Better than your other ${r.cat === 'inf' ? 'foot' : r.cat === 'cav' ? 'horse' : 'missile troops'} at: ${so.better.join(', ')}.</span> ` : ''}${so.worse.length ? `<span style="color:#ee9a8e">Behind them in: ${so.worse.join(', ')}.</span>` : ''}${!so.better.length && !so.worse.length ? '<span class="muted">About level with your other units of its kind.</span>' : ''}</div>
      <div class="small" style="margin-top:6px">${ups.length ? 'Rank improvements: ' + ups.map(k => `<span class="pill" title="${esc(k.text)}">${esc(k.name)}</span>`).join(' ') : '<span class="muted">No rank improvements yet.</span>'}${unitPending(h) ? ' <span class="pill" style="border-color:var(--gold);color:var(--gold)">a choice is waiting</span>' : nextLv ? ` <span class="muted">Next choice at ${esc(nextLv)}.</span>` : ''}</div>
      ${this.heroLine(h)}</div>`;
  }
  // Notable men in one line: names and decorations only; their deeds show on hover.
  heroLine(h) {
    const hs = heroesOf(h).filter(m => m.dec.length || m.deeds.length).slice(0, 3); if (!hs.length) return '';
    return `<div class="small" style="margin-top:6px"><span class="muted">Notable men${decoMorale(h) ? ` (+${decoMorale(h)} morale)` : ''}:</span> ${hs.map(m => `<span title="${esc(m.deeds.slice(-3).join(' / ') || 'No battles yet.')}"><b>${esc(m.name)}</b>${m.dec.length ? ' ' + m.dec.map(d => `<span class="pill dec" title="${esc(DECORATIONS[d].text)}">${esc(DECORATIONS[d].name)}</span>`).join(' ') : ''}</span>`).join(', ')}</div>`;
  }
  pick(spec) {
    const [kind, id, what] = spec.split(':'), c = this.c;
    if (kind === 'officer') return this.learn(`${id}:${what}`);
    if (kind === 'career') { const k = CAREER.find(x => x.id === what); if (chooseCareer(c, what)) { this.note(`Your career: ${k.name} ${careerLv(c, what)}.`, 'good'); this.api.save(); this.render(); } return; }
    const h = c.cohorts.find(x => x.id === +id), p = h && unitPending(h), k = p && p.options.find(o => o.id === what);
    if (!k || !chooseUnit(h, what)) return;
    this.sel = h.id; this.note(`${h.name}: ${k.name}.`, 'good'); this.api.save(); this.render();
  }
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
      return `<button class="act" data-a="doctrine" data-m="${d.id}" ${act && !why ? '' : 'disabled'}>${esc(d.name)}<small>${esc(d.text)}</small><small>${d.gold} denarii. ${t ? `Taught by ${esc(t.name)}.` : esc(why)}</small></button>`; }).join('');
    if (!learned && !cards && !next) return '';
    return `<h4 class="sect">Battle orders</h4><div class="small muted">New formation orders are learned here as the campaign goes on. At first your army knows only how to march and attack; even holding a position has to be taught.</div>
      ${learned ? `<div class="row" style="margin:6px 0">${learned}</div>` : ''}${cards ? `<div class="actions">${cards}</div>` : ''}
      ${next ? `<div class="small muted" style="margin-top:6px">Another order will be ready to learn after ${next.wins - wins} more victor${next.wins - wins === 1 ? 'y' : 'ies'}.</div>` : ''}`;
  }

  panelBody(id) {
    const c = this.c, h = this.selected(), act = this.canAct(), offs = c.officers.filter(o => o.alive), scn = currentScn(c) || SCENARIOS[SCENARIOS.length - 1];
    const off = act ? '' : 'disabled', btn = (attrs, label, sub, ok = true) => `<button class="act" ${attrs} ${act && ok ? '' : 'disabled'}>${label}<small>${sub}</small></button>`;
    const note = '';
    switch (id) {
      case 'praetorium': return `${this.careerHtml()}<p><b>${esc(scn.name)}</b>${scn.kind === 'named' ? ' <span class="pill">Named battle</span>' : ''}<br><span class="small muted">${esc(scn.geo ? scn.geo.place : '')}</span></p><p class="muted">${esc(scn.briefing)}</p><p class="small">${esc(scn.objective)}</p>
        <div class="row"><button class="primary" id="march2">March to battle</button><button id="tomap2">Back to the map</button></div>
        <h4 class="sect">Your army</h4>${this.unitList(['str', 'cond'])}${this.recordHtml(h)}`;
      case 'training': {
        const drillers = offs.filter(o => o.drill >= 1), insOpts = '<option value="">- none -</option>' + drillers.map(o => `<option value="${o.id}" ${h.instructorId === o.id ? 'selected' : ''}>${esc(o.name)} (drill ${o.drill})</option>`).join('');
        const adv = TRAINING_ADVICE[scn.id] || 'Decide what your men need most.', tgs = this.targets(h);
        const nT = tgs.length, cards = Object.entries(REGIMENS).map(([k, r]) => { const lead = this.bestLeader(h, k), p = this.drillPlan(h, k, lead), cost = tgs.reduce((a, x) => a + this.drillCost(x, k), 0), ok = c.supplies >= cost;
          return `<button class="regimen ${this.regimen === k ? 'sel' : ''}" data-regimen="${k}" ${act && ok ? '' : 'disabled'}><b>${r.name}</b><span class="t">${esc(r.text)}</span>
            <div class="eff"><span class="g">+${p.xp} experience</span><span class="g">+${p.dr} drill</span><span class="${r.cond <= -9 ? 'b' : ''}">condition ${r.cond}</span><span class="${r.risk ? 'b' : ''}">${r.risk ? `${Math.round(r.risk * 100)}% risk of hurt men` : 'no risk'}</span><span class="b">${cost} supplies</span></div></button>`; }).join('');
        const lid = this.regimen ? this.bestLeader(h, this.regimen) : null, lo = lid && lid !== 'self' ? officerById(c, +lid) : null;
        const ledBy = this.regimen ? `Led by ${lo ? `${esc(lo.rank)} ${esc(lo.name)}` : 'you in person'}, the best man in camp for ${esc(REGIMENS[this.regimen].name.toLowerCase())}.` : '';
        return `${this.promoHtml()}<div class="advicebox"><b>The centurion's advice.</b> ${esc(adv)}</div><p class="muted">Drilling costs supplies, and drilling the same unit again in this camp costs more each time. Hard drills also tire the men, so rest them at the Barracks. Click a unit to see its record.</p>${this.unitList(['str', 'exp', 'drill', 'cond'])}${this.recordHtml(h)}${this.scopeChips(h)}
          <h4 class="sect">1. What should ${esc(nT > 1 ? 'these units' : h.name)} practise?</h4><div class="regimens">${cards}</div>
          ${ledBy ? `<div class="small muted" style="margin-top:6px">${ledBy}</div>` : ''}
          <div class="row" style="margin-top:12px"><button class="primary" id="run-drill" ${act && this.regimen ? '' : 'disabled'}>${this.regimen ? 'Run the drill' : 'Choose a drill first'}</button></div>
          ${this.doctrineHtml(act)}
          <h4 class="sect">Instructor</h4><div class="row small"><span class="muted">Drills ${esc(h.name)} on the march to every battle, for 6 supplies (a modest, steady gain):</span><select id="instr">${insOpts}</select></div>${note}`;
      }
      case 'depot': {
        const food = dailyFood(c), low = Math.ceil(totalMen(c) / 60 * 2), due = rationsDue(c, scn), proj = c.supplies - due, lg = bestOfficer(c, 'logistics'), nf = this.used('forage'), gp = this.grainPrice();
        const adv = `The march to the next battle takes ${marchDays(scn)} days and eats ${due} supplies, taken when you march. After that you would have about ${Math.max(0, proj)}. ${proj < low ? `Below ${low} your men fight at -8 morale, so you need more.` : `That is above the ${low} you need, so more food is spare for drills and rest.`}${nf ? ` The land near camp is being stripped: each party brings back less (${Math.round(Math.pow(0.7, nf) * 100)}% now).` : ''}`;
        const opts = [
          ['cautious', 'Cautious sweep', 'Foragers stay close to camp.', [[`+${this.forageYield('cautious')} supplies`, 'g'], ['no risk', '']], true],
          ['wide', 'Wide sweep', 'Parties range far across the countryside.', [[`+${this.forageYield('wide')} supplies`, 'g'], [`${Math.round((0.35 - 0.03 * lg) * 100)}% risk of an ambush`, 'b']], true],
          ['requisition', 'Requisition from the villages', 'Take grain from nearby Gallic farms by order.', [[`+${this.forageYield('requisition')} supplies`, 'g'], ['goodwill -1', 'b'], ['no ambush', '']], true],
          ['buy', 'Buy grain from merchants', 'Pay traders in coin and ask no questions. They raise the price each time.', [['+60 supplies', 'g'], [`${gp} denarii`, 'b'], ['no risk', '']], c.gold >= gp]
        ];
        return `<div class="advicebox"><b>The quartermaster's advice.</b> ${esc(adv)}</div><div class="sumtiles"><div><b>${c.supplies}</b><span>Supplies</span></div><div><b>${food}</b><span>Eaten per day</span></div><div><b>${due}</b><span>Rations for the march</span></div><div><b>${c.favour > 0 ? '+' : ''}${c.favour}</b><span>Goodwill</span></div></div>
          <h4 class="sect">How will you feed the army?</h4><div class="regimens two">${opts.map(([k, n, t, effs, ok]) => `<button class="regimen" data-forage="${k}" ${act && ok ? '' : 'disabled'}><b>${n}</b><span class="t">${t}</span><div class="eff">${effs.map(([x, cl]) => `<span class="${cl}">${x}</span>`).join('')}</div></button>`).join('')}</div>${note}`; }
      case 'barracks': {
        const prof = enemyProfile(scn), weary = c.cohorts.filter(x => x.condition < 75), thin = c.cohorts.slice().sort((a, b2) => a.men / a.maxMen - b2.men / b2.maxMen)[0];
        const adv = `${enemyHint(c, prof)}${weary.length ? `${weary.length} unit${weary.length === 1 ? ' is' : 's are'} below 75% condition and will fight badly. ` : 'Your men are in good condition. '}${thin.men < thin.maxMen * 0.85 ? `${thin.name} is the thinnest at ${thin.men}/${thin.maxMen}.` : ''}`;
        const room = commandLimit(c) - c.cohorts.length, hn = this.hireN || 50, hcost = Math.round(hn * 3 * costMult(c)), vcost = this.vetCost(hn), rk = Math.max(1, Math.min(this.raiseN || 1, room));
        const floor = Math.round((0.45 - 0.05 * c.fort) * 100), nextFloor = Math.round((0.45 - 0.05 * Math.min(3, c.fort + 1)) * 100);
        const card = (attrs, name, text, effs, ok) => `<button class="regimen act" ${attrs} ${act && ok ? '' : 'disabled'}><b>${name}</b><span class="t">${text}</span><div class="eff">${effs.map(([x, cl]) => `<span class="${cl}">${x}</span>`).join('')}</div></button>`;
        const have = { ranged: c.cohorts.filter(x => UNIT_TYPES[x.type].cat === 'ranged').length, cav: c.cohorts.filter(x => UNIT_TYPES[x.type].cat === 'cav').length, inf: c.cohorts.filter(x => UNIT_TYPES[x.type].cat === 'inf').length };
        const sug = (t) => { const cat = UNIT_TYPES[t].cat; return (cat === 'ranged' && have.ranged < 1) || (cat === 'cav' && have.cav < 2) || (cat === 'inf' && have.inf < 4); };
        const raise = unlockedTypes(c).map(t => { const r = RAISE[t], ok = room > 0 && c.gold >= Math.round(r.gold * costMult(c)) * rk && c.supplies >= r.supplies * rk;
          return card(`data-a="raise" data-m="${t}"`, `${esc(UNIT_TYPES[t].name)}${sug(t) ? ' <span class="pill">your army lacks this</span>' : ''}`, esc(TYPE_ROLE[t] || ''), [[`${r.men * rk} men${rk > 1 ? ` in ${rk} units` : ''}`, 'g'], [`${Math.round(r.gold * costMult(c)) * rk} denarii`, 'b'], [`${r.supplies * rk} supplies`, '']], ok); }).join('');
        return `<div class="advicebox"><b>The camp prefect's advice.</b> ${esc(adv)}</div><h4 class="sect">Muster roll</h4>${this.musterHtml(act)}
          <h4 class="sect">Rest and dig</h4><div class="regimens two">
          ${card('data-a="rest"', 'Rest the army', 'Everyone sleeps, eats and mends kit.', [['+20 condition, every unit', 'g'], ...(this.restBack() ? [[`about ${this.restBack()} lightly wounded return as veterans`, 'g']] : []), [`${this.restCost()} supplies (a day's rations)`, 'b'], [`${weary.length} unit${weary.length === 1 ? '' : 's'} below 75% would benefit`, '']], c.supplies >= this.restCost())}
          ${card('data-a="fortify"', `Fortify the camp (level ${c.fort}/3)`, 'The men dig ditch and palisade. Two rounds of digging make a level.', [['+4 battle morale per level', 'g'], [`withdrawal draw needs ${floor}% -> ${nextFloor}% of your army`, 'g'], ['25 supplies', 'b']], c.supplies >= 25 && c.fort < 3)}</div>
          <h4 class="sect">Hire soldiers</h4><div class="small muted">Pick how many men to hire. The number sets the size of both offers below; hired men wait in the pool until you place them on the muster roll above.</div>
          <div class="row small" style="margin:6px 0"><span class="muted">Men to hire:</span><div class="chips">${[20, 50, 100, 200].map(k => `<button class="chip ${hn === k ? 'sel' : ''}" data-hiren="${k}">${k} men</button>`).join('')}</div></div>
          <div class="regimens two">
          ${card('data-a="hire"', `Hire ${hn} volunteers`, 'Raw recruits sign on for pay. Cheap, but they dilute a unit\'s experience.', [[`+${hn} recruits`, 'g'], [`${hcost} denarii (${(hcost / hn).toFixed(1)} each)`, 'b']], c.gold >= hcost)}
          ${card('data-a="hirevets"', `Hire ${hn} veterans`, 'Time-served men re-enlist. They cost far more, but they do not dilute a unit\'s experience.', [[`+${hn} veterans`, 'g'], [`${vcost} denarii (${(vcost / hn).toFixed(1)} each)`, 'b']], c.gold >= vcost)}</div>
          <h4 class="sect">Raise a unit <span class="pill">${c.cohorts.length}/${commandLimit(c)} units</span></h4><div class="small muted">Your command limit grows by ${COMMAND_PER_WIN} with every battle you win or draw, and by ${COMMAND_PER_ORG} with each level of Army organisation in your career. More than ten legionary cohorts form a second legion under a legate.${room <= 0 ? ' <b>You are at the limit.</b>' : ''}</div>${room > 1 ? `<div class="row small" style="margin-top:6px"><span class="muted">Raise how many at once?</span><div class="chips">${[1, 5, 10].filter(k => k <= room || k === 1).map(k => `<button class="chip ${rk === k ? 'sel' : ''}" data-raisen="${k}">${k} unit${k > 1 ? 's' : ''}</button>`).join('')}</div></div>` : ''}<div class="regimens" style="margin-top:6px">${raise}</div>${note}`; }
      case 'officers': {
        // one decision at a time: the first officer with a step waiting on his ladder
        const waiting = offs.filter(o => officerPending(o)), o1 = waiting[0], pend = o1 && officerPending(o1);
        const decision = o1 ? `<div class="decision"><div class="dhead">${flagIcon()}<div><b>${esc(rankFor(o1))} ${esc(o1.name)}</b> has earned an advancement <span class="pill">step ${pend.row + 1} of ${officerTrack(o1).length}</span><div class="small muted">${esc(OFFICER_KINDS[officerKind(o1)])}: every officer of this kind chooses from the same ladder. Pick one; the other is given up.${waiting.length > 1 ? ` ${waiting.length - 1} more decision${waiting.length > 2 ? 's' : ''} after this.` : ''}</div></div></div>
          <div class="choice2">${pend.options.map(k => `<button class="regimen" data-pick="officer:${o1.id}:${k.id}"><b>${esc(k.name)}</b><span class="t">${esc(k.text)}</span></button>`).join('<div class="or">or</div>')}</div></div>`
          : `<div class="advicebox">No advancement is waiting. An officer earns one step on his ladder each time he gains a level.</div>`;
        const rows = c.officers.map(o => { const kind = officerKind(o), track = officerTrack(o), got = track.map(r => r.find(k => (o.perks || []).includes(k.id))).filter(Boolean), nx = o.alive ? track.findIndex(r => !r.some(k => (o.perks || []).includes(k.id))) : -1;
          return `<tr class="${o.alive ? '' : 'dead'}"><td><div class="cellflex"><img class="portrait" alt="" src="${artSrc('officer', o.id, 80, 100, { title: o.name, rank: o.rank })}"><div>${esc(rankFor(o))} ${esc(o.name)} <span class="muted small">- ${esc(OFFICER_KINDS[kind])}, level ${o.level}</span>${officerTags(c, o)}
            <div class="small" style="margin-top:3px">${got.length ? got.map(k => `<span class="pill" title="${esc(k.text)}">${esc(k.name)}</span>`).join(' ') : '<span class="muted">No advancements yet.</span>'}${o.alive && nx >= 0 && !officerPending(o) ? ` <span class="muted">Next choice at level ${nx + 1}: ${track[nx].map(k => esc(k.name)).join(' or ')}.</span>` : ''}</div></div></div></td></tr>`; }).join('');
        const assign = `<option value="">- none -</option>` + offs.map(o => `<option value="${o.id}" ${h.officerId === o.id ? 'selected' : ''}>${esc(o.name)}</option>`).join('');
        const unitOpts = c.cohorts.map(x => `<option value="${x.id}" ${x.id === this.sel ? 'selected' : ''}>${esc(x.name)}</option>`).join('');
        return `${decision}<h4 class="sect">Your officers</h4><table class="offtable">${rows}</table>
          <h4 class="sect">Attach an officer to a unit</h4><div class="row small"><select id="assign-unit">${unitOpts}</select><span class="muted">is led by</span><select id="assign">${assign}</select></div>
          <div class="small muted" style="margin-top:6px">A centurion's and a prefect's advancements help the unit he leads; a staff officer's mostly help the whole army.</div>${this.legionHtml()}`; }
      case 'forge': { const cat = UNIT_TYPES[h.type].cat, names = UPGRADES[cat], lt = LEVEL_TRAITS[levelFor(h.xp)], u = { armour: 0, weapon: 0, ...(h.upg || {}) }, prof = enemyProfile(scn);
        const heavy = prof.parts.find(x => x[2] === 'warband') ? prof.parts.find(x => x[2] === 'warband')[1] : 0;
        const adv = `${enemyHint(c, prof)}${knowsEnemy(c) && heavy > 50 ? 'Warbands are lightly armoured and win by charging: armour blunts their charge, better weapons win the melee. ' : ''}Spend on the units that will take the brunt, usually the front line, not on every cohort.`;
        const effect = { armour: `+6% armour per tier: every enemy blow does about 6% less damage`, weapon: `+10% attack per tier${cat === 'inf' ? '; tier 2 adds an extra pilum volley' : ''}` };
        const tgf = this.targets(h), gear = ['armour', 'weapon'].map(k => { const el = tgf.filter(x => upCost(this.c, x, k).tier < MAX_TIER), cost = { tier: upCost(this.c, h, k).tier, gold: el.reduce((a, x) => a + upCost(this.c, x, k).gold, 0), supplies: el.reduce((a, x) => a + upCost(this.c, x, k).supplies, 0) }, maxed = !el.length, ok = !maxed && c.gold >= cost.gold && c.supplies >= cost.supplies;
          return `<button class="regimen act" data-a="upgrade" data-m="${k}" ${act && ok ? '' : 'disabled'}><b>${esc(names[k])}: tier ${u[k]}/${MAX_TIER}</b><span class="t">${esc(effect[k])}</span><div class="eff">${maxed ? '<span class="g">Fully equipped</span>' : `<span class="g">tier ${u[k] + 1}</span><span class="b">${cost.gold} denarii</span><span>${cost.supplies} supplies</span><span class="muted">${(cost.gold / Math.max(1, tgf.reduce((a, x) => a + x.men, 0))).toFixed(1)} denarii per man${tgf.length > 1 ? `, ${el.length} unit${el.length === 1 ? '' : 's'}` : ''}</span>`}</div></button>`; }).join('');
        return `<div class="advicebox"><b>The armourer's advice.</b> ${esc(adv)}</div><p class="muted">Pick a unit, then decide where its money goes.</p>${this.unitList(['str', 'gear'])}${this.scopeChips(h)}<h4 class="sect">Equip ${esc(tgf.length > 1 ? `${tgf.length} units` : h.name)}</h4><div class="small muted" style="margin-bottom:6px">${lt ? `Veteran trait: <b style="color:var(--gold)">${esc(lt.name)}</b> - ${esc(lt.text)}` : 'No veteran trait yet. Reach Veteran (level 2) for the first.'}</div><div class="regimens two">${gear}</div>${note}`; }
      case 'hospital': { const hosp = c.hospital || 0, cost = 120 * (hosp + 1), cur = modsOf(c).recovery, nxt = cur / (1 + 0.3 * hosp) * (1 + 0.3 * (hosp + 1));
        const lost = c.lastLoss || 0, back = c.lastBack || 0, more = lost ? Math.round(back * nxt / Math.max(0.01, cur)) - back : 0;
        const adv = lost ? `In your last battle you lost ${lost} men and ${back} returned to the ranks. ${hosp < 3 ? `A level ${hosp + 1} hospital would have returned about ${more} more.` : 'The hospital is fully built.'} Weigh that against what else ${cost} denarii could buy.` : 'You have not fought a campaign battle yet. A hospital pays off only after battles with heavy casualties.';
        return `<div class="advicebox"><b>The physician's advice.</b> ${esc(adv)}</div><div class="sumtiles"><div><b>${hosp}/3</b><span>Hospital level</span></div><div><b>${Math.round(cur * 100)}%</b><span>Wounded recovery</span></div><div><b>${lost}</b><span>Lost last battle</span></div><div><b>${back}</b><span>Returned</span></div></div>
          <div class="regimens two"><button class="regimen act" data-a="hospital" ${act && hosp < 3 && c.gold >= cost && c.supplies >= 20 ? '' : 'disabled'}><b>${hosp >= 3 ? 'Hospital complete' : `Build level ${hosp + 1}`}</b><span class="t">Physicians, clean water and a place to lie down.</span><div class="eff">${hosp >= 3 ? '' : `<span class="g">wounded recovery ${Math.round(cur * 100)}% -> ${Math.round(nxt * 100)}%</span><span class="b">${cost} denarii</span><span>20 supplies</span>`}</div></button></div>${note}`; }
      case 'hall': { const lg = bestOfficer(c, 'diplomacy'), sc = enemyScaleFor(c.favour), gain = hasPerk(c, 'allies') ? 2 : 1, tr = Math.round((90 + 15 * lg) * (hasPerk(c, 'tribute') ? 1.3 : 1)), prof = enemyProfile(scn);
        const sizeAt = (f) => `${Math.round(enemyScaleFor(f) * 100)}%`;
        const adv = `The next enemy is at ${sizeAt(c.favour)} of its normal size because of your goodwill (${c.favour > 0 ? '+' : ''}${c.favour}). Goodwill of +2 or more shrinks it by 10%; -2 or less swells it by 10%. Gold now can cost you men later.`;
        const card = (attrs, name, text, effs, ok) => `<button class="regimen act" ${attrs} ${act && ok ? '' : 'disabled'}><b>${name}</b><span class="t">${text}</span><div class="eff">${effs.map(([x, cl]) => `<span class="${cl}">${x}</span>`).join('')}</div></button>`;
        return `<div class="advicebox"><b>The interpreter's advice.</b> ${esc(adv)}</div><div class="sumtiles"><div><b>${c.favour > 0 ? '+' : ''}${c.favour}</b><span>Goodwill</span></div><div><b>${c.gold}</b><span>Denarii</span></div><div><b>${sizeAt(c.favour)}</b><span>Enemy size</span></div></div>
          <h4 class="sect">How will you deal with the locals?</h4><div class="regimens">
          ${card('data-a="tribute" data-m="1"', 'Demand tribute', 'Squeeze the nobles for coin. Each demand in the same camp brings in less.', [[`+${this.tributeYield()} denarii`, 'g'], [`goodwill ${c.favour} -> ${Math.max(-3, c.favour - 1)}`, 'b'], [Math.max(-3, c.favour - 1) <= -2 ? `enemy grows to ${sizeAt(Math.max(-3, c.favour - 1))}` : `${Math.max(-3, c.favour - 1) + 2} more goodwill lost before the enemy grows`, Math.max(-3, c.favour - 1) <= -2 ? 'b' : '']], true)}
          ${card('data-a="tribute" data-m="0"', 'Gifts to the chieftains', 'Win friends; they speak well of you and weaken your enemies.', [[`goodwill ${c.favour} -> ${Math.min(3, c.favour + gain)}`, 'g'], [Math.min(3, c.favour + gain) >= 2 ? `enemy shrinks to ${sizeAt(Math.min(3, c.favour + gain))}` : `${2 - Math.min(3, c.favour + gain)} more goodwill needed to shrink the enemy`, Math.min(3, c.favour + gain) >= 2 ? 'g' : ''], ['60 denarii', 'b']], c.gold >= 60 && c.favour < 3)}
          ${card('data-a="scout"', c.scouted ? 'Enemy scouted' : 'Send scouts', 'Learn exactly what you will face.', [['exact enemy numbers', 'g'], ['when reinforcements will arrive', 'g'], [this.scoutCost() ? `${this.scoutCost()} denarii` : 'free (your spymaster)', this.scoutCost() ? 'b' : ''], ['your advisers learn what the enemy is made of', 'g']], !c.scouted && c.gold >= this.scoutCost())}</div>${note}`; }
      default: return '';
    }
  }

  render() {
    const c = this.c, scn = SCENARIOS[Math.min(c.scenario, SCENARIOS.length - 1)], diff = DIFFICULTY[c.difficulty];
    const flags = { praetorium: careerOffer(c) ? careerPoints(c) : 0, training: c.cohorts.filter(x => unitPending(x)).length, officers: c.officers.filter(o => officerPending(o)).length };   // a raised flag over a building: decisions are waiting there
    const visited = c.visitedBuildings = c.visitedBuildings || [], adv = advice(c, visited, flags);
    const meta = this.open === 'praetorium' ? { name: 'Command Tent', sub: 'Your next battle and the march' } : BUILDINGS.find(b => b.id === this.open);
    const food = dailyFood(c), due = rationsDue(c, currentScn(c));
    const res = `<span>${icon('coin')} Denarii <b>${c.gold}</b></span>${(c.manpower || 0) > 0 ? `<span title="Assign them at the Barracks">${icon('helmet')} Soldiers available <b class="poolN">${c.manpower}</b></span>` : ''}<span title="${food} a day; the march to the next battle takes ${due} when you leave">${icon('grain')} Supplies <b>${c.supplies}</b>${due ? ` <span class="muted small">(march: -${due})</span>` : ''}</span>`;
    this.root.innerHTML = `<div class="camp2"><header><h2>Camp - ${esc(scn.theater)}, ${esc(scn.year)}</h2><div class="res">${res}<span>${icon('fort')} Fort <b>${c.fort}/3</b></span><span>${icon('laurel')} Goodwill <b>${c.favour > 0 ? '+' : ''}${c.favour}</b></span><span class="pill">${esc(diff.name)}</span></div></header>
      <div class="advice">${adv.text}</div>
      <div class="scenewrap">${sceneSvg(c, { visited, focus: adv.focus, flags })}</div>
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
    R.querySelectorAll('[data-legate]').forEach(sel => sel.onchange = () => { setLegate(c, +sel.dataset.legate, sel.value ? +sel.value : null); this.api.save(); this.render(); });
    R.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => this.pick(b.dataset.pick));
    R.querySelectorAll('[data-regimen]').forEach(b => b.onclick = () => { this.regimen = b.dataset.regimen; this.render(); });
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
