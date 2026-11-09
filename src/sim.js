// Pure battle simulation (no DOM). Real-time; the UI drives update(dt) and may pause.
import { UNIT_TYPES, WORLD, XP_LEVELS, DIFFICULTY, terrainAt, elevAt, setWorld, riverShift } from './data.js';
import { MAX_TIER } from './perks.js';

const TAU = Math.PI * 2;
export const norm = (a) => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
export const levelFor = (xp) => { let l = 0; for (let i = 0; i < XP_LEVELS.length; i++) if (xp >= XP_LEVELS[i]) l = i; return l; };

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Global lethality dial: lower = longer, more tactical fights.
const COMBAT_PACE = 0.25;
// Missiles are tuned separately from melee so longer fights do not turn archers into decoration.
const RANGED_PACE = 0.55;
// Friendly units never shove each other. A moving unit marches through friends at this fraction of its speed.
const PASS_SPEED = 0.3;
// Melee geometry. Fighting a unit head-on is a slow grind; hitting its side or rear, or surrounding it, is decisive.
const FRONT_GRIND = 0.8, FLANK_DMG = 1.5, REAR_DMG = 2.2;
const FLANK_MORALE = 1.0, REAR_MORALE = 2.0, SURROUND_MORALE = 1.2;
// Command: the general's banner sets a radius inside which Roman cohorts recover and rally well. Charges need fresh, steady men.
const CMD_R = 240, GEN_SPEED = 75, ALL_ORDERS = ['hold', 'fallback', 'holdfire', 'extend', 'testudo', 'sprint', 'guard', 'rally', 'relieve', 'pursue', 'wedge', 'orbis'];
const hgt = (b, u) => elevAt(b.scn, u.x, u.y) / 40;   // height in 'hill units': 1 is an ordinary hilltop
const SIGHT = 520, SPRINT = 1.45;
let UID = 1;

export class Unit {
  constructor(spec) {
    this.id = UID++;
    this.side = spec.side;
    this.typeKey = spec.type;
    this.type = UNIT_TYPES[spec.type];
    this.name = spec.name || this.type.name;
    this.cohortId = spec.cohortId ?? null;
    this.men = spec.men; this.maxMen = spec.maxMen || spec.men; this.startMen = spec.men;
    this.xp = spec.xp || 0; this.lvl = levelFor(this.xp);
    this.drill = spec.drill || 0;
    this.officer = spec.officer || null;
    this.x = spec.x; this.y = spec.y; this.f = spec.f ?? (spec.side === 'rome' ? -Math.PI / 2 : Math.PI / 2);
    this.upg = { armour: 0, weapon: 0, ...(spec.upg || {}) };
    this.perks = (spec.officer && spec.officer.perks) || [];
    const P = (id) => this.perks.includes(id);
    this.maxMorale = this.type.morale + this.lvl * 3 + this.drill * 0.12 + (spec.moraleBonus || 0) + (P('inspire') ? 4 : 0) + (P('discipline') ? 8 : 0) + (this.lvl >= 5 ? 5 : 0);
    const cond = spec.condition ?? 100;
    this.morale = this.maxMorale * (0.88 + 0.12 * cond / 100);
    this.fatigue = (100 - cond) * 0.4;
    this.state = 'idle';
    this.order = { kind: 'none' };
    this.stance = spec.stance || 'aggressive';
    this.post = { x: spec.x, y: spec.y }; this.leash = 130;   // Roman units defend a post: they fight what comes near, then return
    this.formation = 'normal';
    this.ai = spec.ai || null;
    this.contacts = []; this.prevIds = new Set();
    this.pending = 0; this.moralePending = 0; this.bodyAcc = 0;
    this.pilumLeft = this.type.pilum ? this.type.pilum + (this.upg.weapon >= 2 ? 1 : 0) + (this.lvl >= 5 ? 1 : 0) : 0; this.pilumCd = 0;
    this.ammo = this.type.ammo || 0; this.fireAcc = 0; this.fxCd = 0;
    this.disrupted = 0; this.runT = 0; this.kills = 0; this.casualties = 0;
    this.fled = false; this.exited = false; this.blocked = false; this.fighting = false; this.shooting = false;
    this.alerted = false; this.spotted = true; this.updateDims();
  }
  get active() { return this.state !== 'routing' && this.state !== 'gone' && this.state !== 'dead'; }
  get present() { return this.state !== 'gone' && this.state !== 'dead'; }
  updateDims() {
    const t = this.type;
    const baseFront = Math.max(3, Math.sqrt(this.men * 3 * t.space)), wide = this.formation === 'normal' ? this.wide || 1 : 1;   // an extended line is wider and so thinner
    this.baseW = Math.max(14, baseFront * 2.7); this.front = baseFront * wide; this.effFront = baseFront * (1 + 0.55 * (wide - 1));   // extra frontage helps, but with diminishing returns
    const rows = Math.max(1, this.men / this.front);
    this.w = Math.max(14, this.front * 2.7 * (this.formation === 'close' ? 0.8 : 1));
    this.d = Math.max(12, rows * 3.6 * (t.cat === 'cav' ? 2.3 : 1) * (this.formation === 'close' ? 1.25 : 1));   // a horse is about four times as long as a man is wide
    if (this.formation === 'wedge') { this.w *= 0.72; this.d *= 1.35; }
    if (this.formation === 'orb') { const q = Math.sqrt(this.w * this.d) * 1.05; this.w = q; this.d = q; }   // a hollow square: no front, no flank
  }
  fwd() { return [Math.cos(this.f), Math.sin(this.f)]; }
}

export class Battle {
  constructor(scn, romeSpecs, opts = {}) {
    this.scn = scn; setWorld(scn);
    this.fogOn = scn.fog === true || (!!scn.act && scn.id !== 'prologue' && scn.fog !== false);   // you must find the enemy in every real battle
    this.diff = DIFFICULTY[opts.difficulty || 'normal'];
    this.rand = mulberry32(opts.seed ?? (Date.now() & 0xffffff));
    this.t = 0; this.units = []; this.bodies = []; this.fx = []; this.log = [];
    this.result = null; this.endTimer = null; this.pendingOutcome = null;
    this.clearT = 0; this.fieldClear = false; this.callDelay = scn.callDelay || 12;   // breather before the next wave comes on its own
    this.retreating = false; this.broken = { rome: false, gaul: false };
    this.reinf = (scn.reinforcements || []).map(r => ({ ...r, done: false }));
    this.floats = [];
    this.stats = { flankTime: 0, rearTime: 0, rangedKills: 0, pilum: 0, routs: { rome: 0, gaul: 0 }, outCmd: 0, engaged: 0, k: { rome: {}, gaul: {} }, rallied: 0, relieved: 0 };
    this.rep = { series: [], events: [], nextSample: 0 };      // battle report: army strength over time and the moments that mattered
    this.objectives = (scn.objectives || []).map(o => ({ ...o, contested: false, presence: { rome: false, gaul: false } }));
    this.rule = scn.rule || null; this.hold = { rome: 0, gaul: 0 };
    this.fortLevel = opts.fort || 0; this.scouted = !!opts.scouted; this.shake = 0;
    this.favour = opts.favour || 0;
    // enemy strength modifiers: difficulty + local favour (informants and divided tribes)
    const favMult = this.favour >= 2 ? 0.9 : this.favour <= -2 ? 1.1 : 1;
    this.powerScale = opts.forceScale || 1; this.rewardScale = Math.pow(this.powerScale, 0.75);   // bigger hosts carry bigger spoils
    this.enemyScale = this.diff.enemyMult * favMult * (scn.id === 'prologue' || scn.practice ? 1 : 0.9);   // real battles are meant to be a fight
    this.recoveryMult = opts.recovery ?? 1;
    const rb = this.diff.romeMorale + Math.min(12, this.fortLevel * 4) + (opts.suppliesLow ? -8 : 0) + (opts.moraleBonus || 0);
    this.romeBonus = rb;
    for (const s of romeSpecs) this.units.push(new Unit({ ...s, side: 'rome', moraleBonus: rb }));
    this.orders = new Set(opts.orders || ALL_ORDERS);          // formation orders the army has learned in camp
    this.cmdR = CMD_R + (opts.cmdBonus || 0); this.rallyCd = 0; this.general = null;
    const rs = this.units.filter(u => u.side === 'rome');
    if (rs.length && opts.general !== false) this.general = { x: rs.reduce((a, u) => a + u.x, 0) / rs.length, y: Math.min(WORLD.h - 20, Math.max(...rs.map(u => u.y)) + 55), f: -Math.PI / 2, goal: null, wound: 0 };
    for (const e of scn.enemy) this.spawnEnemy(e);
    this.startRome = this.sumMen('rome'); this.startGaul = this.sumMen('gaul');
    this.smartAI = scn.id !== 'prologue'; this.aiS = { surge: false, surgeT: 0, commit: false, t0: null };
    this.say('Your army deploys. Press SPACE to begin the battle; you may issue orders while paused.', 'info');
  }

  // One authored enemy unit becomes as many units as the host needs to match your army: a warband never grows past about 520 men, so a
  // bigger army meets more warbands, in ranks, not a handful of monsters. Returns the men spawned.
  spawnEnemy(e) {
    const total = Math.round(e.men * this.enemyScale * this.powerScale);
    const cap = { warband: 520, gaul_elite: 330, gaul_skirm: 190, gaul_cav: 95 }[e.type] || 400, n = Math.max(1, Math.min(14, Math.ceil(total / cap)));
    let spawned = 0;
    for (let i = 0; i < n; i++) {
      const men = Math.round(total / n), row = Math.floor(i / 8), per = Math.min(8, n - row * 8);
      let x = e.x + ((i % 8) - (per - 1) / 2) * 115 * (n > 1 ? 1 : 0), y = e.y - row * 110 * (n > 1 ? 1 : 0);
      if (y < 40) y = e.y + row * 110; x = Math.max(40, Math.min(WORLD.w - 40, x)); y = Math.min(WORLD.h - 40, y);
      const ai = { ...e.ai }; if (ai.delay != null) ai.delay += (i % 4) * 1.5;
      const u = new Unit({ side: 'gaul', type: e.type, men, x, y, ai, stance: e.ai && e.ai.kind === 'idle' ? 'hold' : 'aggressive', moraleBonus: this.diff.enemyMorale, xp: 40 + (this.diff.enemyMult > 1 ? 60 : 0) });
      if (this.fogOn) { u.spotted = false; u.seenUntil = this.t === 0 && this.scouted ? 40 : 0; if (u.seenUntil) u.spotted = true; }   // scouts have told you where they are, for a while
      this.units.push(u); spawned += men;
    }
    return spawned;
  }
  addFx(f) { if (this.fx.length < 600) this.fx.push(f); }
  // ---------- sight ----------
  // Ridges and woods hide armies. A unit sees farther from high ground; the sight line is blocked where the ground (or tree canopy)
  // rises above the line between the eyes of the viewer and the target.
  sightOf(v) { return SIGHT * (1 + 0.6 * clamp(hgt(this, v), 0, 1.5)) * (v.type && v.type.cat === 'cav' ? 1.15 : 1); }
  los(v, t) {
    const ev = elevAt(this.scn, v.x, v.y) + 6, et = elevAt(this.scn, t.x, t.y) + 3;
    const vf = this.terr(v).kind === 'forest', tf = this.terr(t).kind === 'forest';
    for (let k = 1; k < 8; k++) {
      const f = k / 8, x = v.x + (t.x - v.x) * f, y = v.y + (t.y - v.y) * f;
      let h = elevAt(this.scn, x, y);
      if (!vf && !tf && terrainAt(this.scn, x, y).kind === 'forest') h += 11;
      if (h > ev + (et - ev) * f + 0.8) return false;
    }
    return true;
  }
  updateVision() {
    if (!this.fogOn) return;
    const viewers = this.units.filter(u => u.side === 'rome' && u.active);
    if (this.general) viewers.push({ x: this.general.x, y: this.general.y, type: null, general: true });
    for (const e of this.units) {
      if (e.side !== 'gaul' || !e.present) continue;
      let seen = e.contacts.some(c => c.active && c.side === 'rome');
      if (!seen) {
        const inWood = this.terr(e).kind === 'forest';
        for (const v of viewers) {
          const R = (v.general ? 700 : this.sightOf(v)) * (inWood ? 0.4 : 1);
          if (Math.hypot(v.x - e.x, v.y - e.y) <= R && this.los(v, e)) { seen = true; break; }
        }
      }
      if (seen) { e.seenUntil = this.t + 6; if (!e.sighted) { e.sighted = true; this.say(`Enemy sighted: ${e.name} (about ${Math.round(e.men / 10) * 10} men).`, 'warn'); } }
      e.spotted = this.t < (e.seenUntil || 0);
    }
  }
  say(msg, kind = 'info') { this.log.push({ t: this.t, msg, kind }); }
  mark(kind, text, side, extra) { if (this.rep.events.length < 120) this.rep.events.push({ t: this.t, kind, text, side, ...extra }); }
  mloss(u, cause, v) { if (v > 0) { u.mc = u.mc || {}; u.mc[cause] = (u.mc[cause] || 0) + v; } }
  sampleReport() {
    if (this.t < this.rep.nextSample) return;
    this.rep.nextSample = this.t + 6;
    let rr = 0, gr = 0;
    for (const u of this.units) if (u.state === 'routing') { if (u.side === 'rome') rr++; else gr++; }
    this.rep.series.push({ t: Math.round(this.t), rome: Math.round(this.activeMen('rome')), gaul: Math.round(this.activeMen('gaul')), rr, gr });
  }
  sumMen(side) { return this.units.filter(u => u.side === side).reduce((a, u) => a + u.men, 0); }
  activeMen(side) { return this.units.filter(u => u.side === side && u.active).reduce((a, u) => a + u.men, 0); }
  byId(id) { return this.units.find(u => u.id === id); }
  terr(u) { return terrainAt(this.scn, u.x, u.y); }

  // ---------- geometry ----------
  ext(u, dx, dy, d) { // half extent of u's rectangle along direction (dx,dy)/d
    const fx = Math.cos(u.f), fy = Math.sin(u.f);
    const along = Math.abs((dx * fx + dy * fy) / d), side = Math.abs((-dx * fy + dy * fx) / d);
    return along * u.d / 2 + side * u.w / 2;
  }
  gapAt(u, x, y, e) {
    const dx = e.x - x, dy = e.y - y, d = Math.hypot(dx, dy);
    if (d < 0.01) return -1;
    const fx = Math.cos(u.f), fy = Math.sin(u.f);
    const eu = Math.abs((dx * fx + dy * fy) / d) * u.d / 2 + Math.abs((-dx * fy + dy * fx) / d) * u.w / 2;
    return d - eu - this.ext(e, dx, dy, d);
  }
  gap(u, e) { return this.gapAt(u, u.x, u.y, e); }
  nearestEnemy(u, filter = (e) => e.active) {
    let best = null, bg = Infinity;
    for (const e of this.units) {
      if (e.side === u.side || !filter(e)) continue;
      const g = this.gap(u, e);
      if (g < bg) { bg = g; best = e; }
    }
    return best ? { e: best, gap: bg } : null;
  }
  // angle class of attacker position relative to defender facing: 1 front, 2 flank, 3 rear
  angleMult(att, def) {
    if (def.formation === 'orb') return { m: 1, c: 1, g: FRONT_GRIND };
    const dx = att.x - def.x, dy = att.y - def.y, d = Math.hypot(dx, dy) || 1;
    const c = (dx * Math.cos(def.f) + dy * Math.sin(def.f)) / d;
    const wv = def.formation === 'wedge' ? 1.25 : 1;                                   // a wedge is exposed on its flanks
    return c > 0.6 ? { m: 1, c: 1, g: FRONT_GRIND } : c > -0.35 ? { m: 1.5 * wv, c: 2, g: FLANK_DMG * wv } : { m: 2.2 * wv, c: 3, g: REAR_DMG * wv };
  }

  // ---------- orders ----------
  // Orders never change a unit's stance. A move order sets its new post; an attack ends with the unit holding where it finished.
  setMove(u, x, y, tf = null, ignore = false, sprint = false) { if (!u.active) return; u.order = { kind: 'move', x, y, tf, ignore, sprint: sprint && this.orders.has('sprint') }; u.post = { x, y }; }
  setAttack(u, tgt, sprint = false) { if (!u.active) return; u.order = { kind: 'attack', targetId: tgt.id, sprint: sprint && this.orders.has('sprint') }; }
  setHold(u) { if (!u.active) return; u.order = { kind: 'none' }; u.stance = 'hold'; u.post = { x: u.x, y: u.y }; }
  setEngage(u) { if (!u.active) return; u.stance = 'aggressive'; if (u.order.kind === 'none') u.post = { x: u.x, y: u.y }; }
  toggleFormation(u) {
    if (!u.active || u.type.cat !== 'inf' || !this.orders.has('testudo')) return;
    u.formation = u.formation === 'close' ? 'normal' : 'close'; u.wide = 1;
    u.updateDims();
  }
  // Extended line: the same men spread over more frontage, so more of them fight at once (more damage) and the unit covers more ground, but it is
  // thinner in depth: casualties shake it more, and charges bite deeper into it. `w` runs from 1 (normal) to 2.4.
  setWide(u, w) {
    if (!u.active || u.type.cat !== 'inf' || !this.orders.has('extend')) return false;
    if (u.formation !== 'normal') u.formation = 'normal';
    u.wide = clamp(Math.round(w * 20) / 20, 1, 2.4); u.updateDims(); return true;
  }
  cycleWide(u) { const L = [1, 1.6, 2.2], i = L.findIndex(v => Math.abs(v - (u.wide || 1)) < 0.12); return this.setWide(u, L[(i + 1) % L.length]); }
  toggleWedge(u) {
    if (!u.active || u.type.cat !== 'inf' || !this.orders.has('wedge')) return;
    u.formation = u.formation === 'wedge' ? 'normal' : 'wedge'; u.wide = 1;
    u.updateDims();
  }
  toggleOrbis(u) {
    if (!u.active || u.type.cat !== 'inf' || !this.orders.has('orbis')) return;
    u.formation = u.formation === 'orb' ? 'normal' : 'orb'; u.wide = 1;
    u.updateDims();
  }
  // ---------- command ----------
  cmdNow() { return this.cmdR * (this.general && this.general.wound > 0 ? 0.5 : 1); }
  inCommand(u) { const g = this.general; return u.side !== 'rome' || !g || Math.hypot(u.x - g.x, u.y - g.y) <= this.cmdNow(); }
  moveGeneral(x, y) { if (this.general) this.general.goal = { x: clamp(x, 15, WORLD.w - 15), y: clamp(y, 15, WORLD.h - 15) }; }
  stepGeneral(dt) {
    const g = this.general; if (!g) return;
    if (this.rallyCd > 0) this.rallyCd -= dt;
    if (g.wound > 0) { g.wound -= dt; if (g.wound <= 0) this.say('The general has recovered; the command radius is restored.', 'good'); }
    if (g.goal) {
      const dx = g.goal.x - g.x, dy = g.goal.y - g.y, d = Math.hypot(dx, dy);
      if (d < 3) g.goal = null; else { const st = Math.min(d, GEN_SPEED * dt); g.x += dx / d * st; g.y += dy / d * st; g.f = Math.atan2(dy, dx); }
    }
    // a general who rides into the melee can be hit
    if (g.wound <= 0) for (const e of this.units) if (e.side === 'gaul' && e.active && Math.hypot(e.x - g.x, e.y - g.y) < Math.max(e.w, e.d) / 2 + 12 && this.rand() < dt * 0.015) { g.wound = 60; this.say('Your general is wounded! The command radius is halved for a time.', 'bad'); break; }
  }
  // Rally: the general rides the line. Wavering cohorts steady, routers turn about. Needs the doctrine; then a 90 s cooldown.
  rally() {
    if (!this.orders.has('rally') || !this.general || this.rallyCd > 0 || this.result) return false;
    const R = this.cmdNow() * 1.1, g = this.general;
    for (const u of this.units) {
      if (u.side !== 'rome' || !u.present || Math.hypot(u.x - g.x, u.y - g.y) > R) continue;
      if (u.state === 'routing') { u.morale = Math.max(u.morale, u.maxMorale * 0.58); this.rallyUnit(u); }
      else if (u.active) { u.morale = Math.min(u.maxMorale, u.morale + u.maxMorale * 0.18); u.disrupted = 0; }
    }
    this.rallyCd = 90; this.say('The general rides the line - the cohorts steady!', 'good'); this.mark('rally', 'The general rides the line', 'rome'); this.stats.rallied++; return true;
  }
  rallyUnit(u) {
    u.mc = {}; this.mark('unitrally', u.name, u.side);
    u.state = 'idle'; u.stance = 'hold'; u.fatigue = Math.max(u.fatigue, 40);
    if (u.side === 'rome') u.order = { kind: 'move', x: u.post.x, y: u.post.y, tf: null };
    else { u.order = { kind: 'none' }; u.post = { x: u.x, y: u.y }; }
    this.say(`${u.name} rallies!`, u.side === 'rome' ? 'good' : 'info');
    if (u.ai) u.ai.kind = 'rush';
  }
  // Relieve: a fresher cohort behind the line steps up while the tired one falls back through it.
  relieve(u) {
    if (!this.orders.has('relieve') || !u.active || u.type.cat !== 'inf') return false;
    const fx = Math.cos(u.f), fy = Math.sin(u.f); let best = null, bs = -1e9;
    for (const f of this.units) {
      if (f === u || f.side !== u.side || !f.active || f.type.cat !== 'inf' || f.contacts.some(e => e.active)) continue;
      const dx = f.x - u.x, dy = f.y - u.y, d = Math.hypot(dx, dy) || 1;
      if (d > 260 || (dx * fx + dy * fy) / d > -0.2 || f.fatigue > u.fatigue - 10) continue;
      const sc = (u.fatigue - f.fatigue) + 20 * f.morale / f.maxMorale - d * 0.05;
      if (sc > bs) { bs = sc; best = f; }
    }
    if (!best) { this.say(`No fresher cohort stands behind ${u.name} to relieve it.`, 'info'); return false; }
    const ux = u.x, uy = u.y, uf = u.f, bx = best.x, by = best.y;
    this.setMove(best, ux, uy, uf, true); best.stance = u.stance === 'hold' ? 'hold' : 'aggressive';
    this.setMove(u, bx, by, uf, true); u.order.back = true; u.stance = 'hold';
    this.say(`${best.name} relieves ${u.name}.`, 'info'); this.mark('relieve', `${best.name} relieves ${u.name}`, 'rome'); this.stats.relieved++; return true;
  }
  // Pursuit is an order, never a reflex: cavalry only ride down routers when you tell them to.
  pursue(u) {
    if (!u.active || u.type.cat !== 'cav' || !this.orders.has('pursue')) return false;
    let best = null, bg = 600;
    for (const e of this.units) if (e.side === 'gaul' && e.state === 'routing' && e.present && e.spotted !== false) { const g = this.gap(u, e); if (g < bg) { bg = g; best = e; } }
    if (!best) { this.say(`${u.name} sees no routers within reach.`, 'info'); return false; }
    this.setAttack(u, best, true); this.say(`${u.name} rides down the fugitives.`, 'info'); return true;
  }
  // Guard: stay with a friendly unit and fight whatever threatens it.
  setGuard(u, f) { if (!u.active || !f || f === u || f.side !== u.side || !this.orders.has('guard')) return false; u.order = { kind: 'guard', targetId: f.id }; return true; }
  toggleHoldFire(u) { if (u.type.cat !== 'ranged') return; u.holdFire = !u.holdFire; }
  // Pull a unit back from the nearest enemy to rest and re-form, facing the enemy.
  fallBack(u) {
    if (!u.active) return;
    const n = this.nearestEnemy(u); if (!n) return;
    const dx = u.x - n.e.x, dy = u.y - n.e.y, d = Math.hypot(dx, dy) || 1;
    this.setMove(u, clamp(u.x + dx / d * 150, 20, WORLD.w - 20), clamp(u.y + dy / d * 150, 20, WORLD.h - 20), Math.atan2(-dy, -dx));
    u.order.back = true; u.order.ignore = true;   // an orderly withdrawal: walk backward, keep facing the enemy, no rout
    u.stance = 'hold';
  }
  retreatAll() {
    if (this.retreating || this.result) return;
    this.retreating = true;
    for (const u of this.units) if (u.side === 'rome' && u.active) u.order = { kind: 'retreat' };
    this.say('The signal to withdraw is sounded!', 'warn');
  }

  pendingWaves() { return this.reinf.filter(r => !r.done && r.side !== 'rome'); }
  nextWaveEta() { const p = this.pendingWaves(); return p.length ? Math.max(0, Math.min(...p.map(r => r.at)) - this.t) : null; }
  // Bring the next enemy wave forward to now (everything due within 8 seconds of it comes with it).
  callNextWave(auto = false) {
    const p = this.pendingWaves(); if (!p.length || this.result) return false;
    const first = Math.min(...p.map(r => r.at));
    for (const r of p) if (r.at <= first + 8) { r.at = this.t; if (!r.msg) r.msg = 'More enemies appear on the horizon!'; }
    this.clearT = 0; return true;
  }

  // ---------- AI ----------
  // ---------- the Gallic commander ----------
  // The host is not a swarm. Warbands form a line short of your army and surge together; a quarter swing wide to take your flank; the
  // champions are held back as a reserve and thrown in once the fight turns. Every unit picks targets that hurt: missile troops,
  // flanked cohorts, men who are wavering.
  romeCentre() {
    const rs = this.units.filter(u => u.side === 'rome' && u.active); if (!rs.length) return null;
    const m = rs.reduce((a, u) => a + u.men, 0) || 1;
    return { x: rs.reduce((a, u) => a + u.x * u.men, 0) / m, y: rs.reduce((a, u) => a + u.y * u.men, 0) / m };
  }
  assignRoles() {
    let n = 0;
    for (const u of this.units) {
      if (u.side !== 'gaul' || !u.active || !u.ai || u.role || u.ai.kind !== 'rush') continue;
      if (u.type.cat !== 'inf') continue;
      if (u.ai.burst) { u.role = 'burst'; continue; }
      if (u.typeKey === 'gaul_elite') u.role = 'reserve';
      else { u.role = (++n % 4 === 0 && this.sumMen('gaul') > 600) ? 'wing' : 'line'; }
    }
  }
  smartTarget(u) {
    let best = null, bs = 1e9;
    for (const e of this.units) {
      if (e.side === u.side || !e.active) continue;
      let sc = this.gap(u, e) + this.rand() * 30;
      if (e.type.cat === 'ranged') sc -= 90;
      if (e.flanked || e.surrounded) sc -= 60;
      if (e.formation !== 'normal') sc += 70;
      if (e.morale < e.maxMorale * 0.5) sc -= 40;
      sc += 60 * Math.max(0, hgt(this, e) - hgt(this, u));
      sc += 70 * Math.max(0, ((this._tcount && this._tcount[e.id]) || 0) - 1);        // do not all pile onto one target
      if (sc < bs) { bs = sc; best = e; }
    }
    return best;
  }
  smartMove(u) {
    const rc = this.romeCentre(); if (!rc) return;
    if (u.contacts.some(e => e.active)) return;                                    // fighting: let the melee run
    const dx = rc.x - u.x, dy = rc.y - u.y, d = Math.hypot(dx, dy) || 1, a = { x: dx / d, y: dy / d }, S = this.aiS;
    const attack = () => { const cur = u.order.kind === 'attack' ? this.byId(u.order.targetId) : null; if (!cur || !cur.active) { const t = this.smartTarget(u); if (t) this.setAttack(u, t); } };
    if (u.role === 'line') {
      if (S.surge || !u.slot) { attack(); return; }
      // advance as one line: every unit holds its own place in a moving battle line, and the line marches at the pace of its slowest unit
      const ds = Math.hypot(u.slot.x - u.x, u.slot.y - u.y);
      if (ds > 36) this.setMove(u, u.slot.x, u.slot.y, S.fa, true); else { if (u.order.kind === 'move') u.order = { kind: 'none' }; this.faceSmooth(u, S.fa, 0.4, 1); }
      u.staged = !!S.lineHalted && ds < 70;
    } else if (u.role === 'wing') {
      if (!u.wp) { const side = ((u.x - rc.x) * -a.y + (u.y - rc.y) * a.x) >= 0 ? 1 : -1; u.wp = { x: rc.x - a.y * side * -1 * 0 + (-a.y) * side * 720 - a.x * 40, y: rc.y + a.x * side * 720 - a.y * 40 }; if (!this._wingSaid) { this._wingSaid = true; this.say('Gallic warbands are swinging wide around your flank!', 'warn'); this.mark('wing', 'Gallic warbands swing wide round your flank', 'gaul'); } }
      if (Math.hypot(u.wp.x - u.x, u.wp.y - u.y) > 160 && !u.wpDone) this.setMove(u, u.wp.x, u.wp.y, null, true);
      else { u.wpDone = true; if (S.surge || this.t - (S.t0 ?? this.t) > 60) attack(); else if (u.order.kind === 'move') u.order = { kind: 'none' }; }
    } else if (u.role === 'reserve') {
      const rp = { x: rc.x - a.x * 800, y: rc.y - a.y * 800 };
      if (d > 900) this.setMove(u, rp.x, rp.y, null, true); else if (u.order.kind === 'move') u.order = { kind: 'none' };
      if (S.commit) { u.role = 'line'; }
    }
  }
  // The Gallic battle line: units are given slots side by side across the axis of advance (a second and third rank if the host is wide), the line
  // front marches toward a halt short of your army at the pace of its slowest unit, and every unit keeps its place in it.
  formLine(lines) {
    const S = this.aiS, rc = this.romeCentre(); if (!rc || !lines.length) return;
    const gc = { x: lines.reduce((q, u) => q + u.x, 0) / lines.length, y: lines.reduce((q, u) => q + u.y, 0) / lines.length };
    const dx = rc.x - gc.x, dy = rc.y - gc.y, dd = Math.hypot(dx, dy) || 1, a = { x: dx / dd, y: dy / dd }, perp = { x: -a.y, y: a.x };
    S.fa = Math.atan2(a.y, a.x);
    if (!S.F) S.F = { x: gc.x, y: gc.y };
    const stage = { x: rc.x - a.x * 520, y: rc.y - a.y * 520 }, dF = Math.hypot(stage.x - S.F.x, stage.y - S.F.y);
    if (dF > 10) { const v = Math.min(...lines.map(u => u.type.speed)) * 0.85 * 0.4; S.F.x += (stage.x - S.F.x) / dF * Math.min(dF, v); S.F.y += (stage.y - S.F.y) / dF * Math.min(dF, v); S.lineHalted = false; }
    else { S.lineHalted = true; if (S.t0 === null) S.t0 = this.t; }
    const slotW = Math.max(...lines.map(u => u.w)) + 24, depth = Math.max(...lines.map(u => u.d)) + 30, perRank = Math.max(1, Math.floor(1900 / slotW)), n = lines.length;
    const sig = lines.map(u => u.id).sort((p1, p2) => p1 - p2).join();
    if (sig !== S.sig || this.t > (S.resortT || 0)) {            // give the units nearest your army the front rank, then order each rank by where its men stand, so nobody has to cross through a friend
      S.sig = sig; S.resortT = this.t + 5;
      const fwd = (u) => (u.x - gc.x) * a.x + (u.y - gc.y) * a.y, lat = (u) => (u.x - gc.x) * perp.x + (u.y - gc.y) * perp.y;
      const byFront = [...lines].sort((p1, p2) => fwd(p2) - fwd(p1));
      for (let r = 0; r * perRank < n; r++) byFront.slice(r * perRank, (r + 1) * perRank).sort((p1, p2) => lat(p1) - lat(p2)).forEach((u, k) => { u.slotIdx = r * perRank + k; });
    }
    for (const u of lines) {
      const i = u.slotIdx ?? 0, rank = Math.floor(i / perRank), k = i % perRank, cnt = Math.min(perRank, n - rank * perRank), off = (k - (cnt - 1) / 2) * slotW;
      u.slot = { x: S.F.x + perp.x * off - a.x * rank * depth, y: S.F.y + perp.y * off - a.y * rank * depth };
    }
    // how many of our units are already going for each of your units (so the host spreads its attack instead of piling onto one)
    this._tcount = {}; for (const u of this.units) if (u.side === 'gaul' && u.active && u.order.kind === 'attack') this._tcount[u.order.targetId] = (this._tcount[u.order.targetId] || 0) + 1;
  }
  updateSurge() {
    const S = this.aiS; this.assignRoles();
    const lines = this.units.filter(u => u.side === 'gaul' && u.active && u.role === 'line');
    this.formLine(lines);
    if (!S.surge) {
      const staged = lines.filter(u => u.staged || u.contacts.some(e => e.active)).length;
      if (!lines.length || (S.lineHalted && staged >= lines.length * 0.85) || (S.t0 !== null && this.t - S.t0 > 25)) { S.surge = true; S.surgeT = this.t; if (lines.length > 2) this.say('The Gallic line howls and surges forward!', 'warn'); this.mark('surge', 'The Gallic line surges forward', 'gaul'); }
    } else if (!S.commit) {
      const rs = this.units.filter(u => u.side === 'rome');
      const turned = this.stats.routs.gaul > 0 || this.stats.routs.rome > 0 || this.activeMen('rome') < this.startRome * 0.85;
      if ((turned && this.t - S.surgeT > 20) || this.t - S.surgeT > 90) { S.commit = true; if (this.units.some(u => u.side === 'gaul' && u.active && u.role === 'reserve')) this.say('The Gallic champions are committed to the fight!', 'warn'); this.mark('commit', 'The Gallic champions are committed', 'gaul'); }
    }
  }
  aiThink() {
    if (this.smartAI) this.updateSurge();
    for (const u of this.units) {
      if (u.side !== 'gaul' || !u.active || !u.ai) continue;
      const ai = u.ai;
      const near = this.nearestEnemy(u);
      if (!near) continue;
      if (ai.kind === 'ambush') {
        if (near.gap < ai.trigger || this.t > ai.maxDelay) { ai.kind = 'rush'; ai.burst = true; ai.delay = this.t + 1 + this.rand() * 3; if (!u.alerted) { u.alerted = true; if (!ai.quiet) this.say('A Gallic warband bursts from the treeline!', 'warn'); } }
      } else if (ai.kind === 'rush') {
        if (this.t < ai.delay) continue;
        if (this.smartAI && u.role && u.role !== 'burst') { this.smartMove(u); continue; }
        const cur = u.order.kind === 'attack' ? this.byId(u.order.targetId) : null;
        if (!cur || !cur.active) this.setAttack(u, this.smartAI ? this.smartTarget(u) : this.pickTarget(u));
      } else if (ai.kind === 'skirm') {
        const tgt = near.e;
        if (u.ammo <= 0) { ai.kind = 'rush'; ai.delay = 0; continue; }
        if (near.gap < 38 && tgt.type.cat !== 'ranged') {
          const dx = u.x - tgt.x, dy = u.y - tgt.y, d = Math.hypot(dx, dy) || 1;
          this.setMove(u, clamp(u.x + dx / d * 90, 20, WORLD.w - 20), clamp(u.y + dy / d * 90, 20, WORLD.h - 20));
        } else if (near.gap > u.type.range * 0.9) this.setMove(u, tgt.x, tgt.y);
        else u.order = { kind: 'none' };
      } else if (ai.kind === 'raid') {
        if (this.t < (ai.delay || 0)) continue;
        const o = this.objectives.find(x => x.id === ai.obj);
        if (near.gap < 70) { ai.kind = 'rush'; ai.burst = true; ai.delay = 0; continue; }
        if (o && !u.fighting) { if (Math.hypot(u.x - o.x, u.y - o.y) > 25) this.setMove(u, o.x, o.y); else u.order = { kind: 'none' }; }
      } else if (ai.kind === 'flank') {
        if (this.t < ai.delay) continue;
        let tgt = u.order.targetId ? this.byId(u.order.targetId) : null;
        if (!tgt || !tgt.active) { tgt = this.pickTarget(u, (e) => e.type.cat !== 'cav'); if (!tgt) continue; u.order = { kind: 'none', targetId: tgt.id }; }
        const bx = tgt.x - Math.cos(tgt.f) * (tgt.d / 2 + 70), by = tgt.y - Math.sin(tgt.f) * (tgt.d / 2 + 70);
        if (Math.hypot(u.x - bx, u.y - by) > 60 && !u.fighting) { const o = u.order; if (o.kind !== 'move' || Math.hypot(o.x - bx, o.y - by) > 50) u.order = { kind: 'move', x: bx, y: by, tf: null, targetId: tgt.id }; }   // only re-aim when the target has really moved
        else { const id = tgt.id; this.setAttack(u, tgt); u.ai.kind = 'rush'; u.ai.delay = 0; u.order.targetId = id; }
      }
    }
  }
  pickTarget(u, filter = (e) => e.active) {
    let best = null, bs = Infinity;
    for (const e of this.units) {
      if (e.side === u.side || !filter(e) || !e.active) continue;
      const g = this.gap(u, e) + (e.type.cat === 'ranged' ? -40 : 0) + this.rand() * 25;
      if (g < bs) { bs = g; best = e; }
    }
    return best;
  }

  // ---------- main step ----------
  update(dt) {
    if (this.result) return;
    this.t += dt; this.sampleReport();
    for (const r of this.reinf) if (!r.done && this.t >= r.at) {
      r.done = true;
      if (r.side === 'rome') {
        const u = new Unit({ ...r.unit, side: 'rome', xp: r.unit.xp ?? 30, drill: 25, moraleBonus: this.romeBonus, stance: 'aggressive' });
        this.units.push(u); this.startRome += u.men;
        const n = this.nearestEnemy(u); if (n) this.setAttack(u, n.e);
        if (r.msg) this.say(r.msg, 'good');
      } else {
        this.startGaul += this.spawnEnemy(r.unit);
        if (r.msg) this.say(r.msg, 'warn');
      }
    }
    // If the field is cleared before a scripted surprise has sprung, it springs at once (there is no waiting around).
    if (this.pendingWaves().length && this.activeMen('gaul') === 0) { this.clearT += dt; if (this.clearT >= 3) this.callNextWave(true); } else this.clearT = 0;
    this.updateObjectives(dt);
    this.floats = this.floats.filter(f => (f.life -= dt) > 0);
    this._ai = (this._ai || 0) + dt;
    this.stepGeneral(dt);
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 5);
    this._vis = (this._vis || 0) + dt; if (this._vis >= 0.4) { this._vis = 0; this.updateVision(); }
    if (this._ai >= 0.4) { this._ai = 0; this.updateFront(); this.aiThink(); }
    this.computeContacts();
    this.markExposure();
    for (const u of this.units) if (u.present) this.stepUnit(u, dt);
    this.separate(dt);
    for (const u of this.units) if (u.present) this.combat(u, dt);
    for (const u of this.units) if (u.present) this.applyDamage(u, dt);
    this.armyMorale();
    this.fx = this.fx.filter(f => (f.life -= dt) > 0);
    this.checkEnd(dt);
  }

  computeContacts() {
    for (const u of this.units) { u.prevIds = new Set(u.contacts.map(c => c.id)); u.contacts = []; }
    const us = this.units.filter(u => u.present);
    for (let i = 0; i < us.length; i++) for (let j = i + 1; j < us.length; j++) {
      const a = us[i], b = us[j];
      if (a.side === b.side) continue;
      if (Math.abs(a.x - b.x) > 120 || Math.abs(a.y - b.y) > 120) continue;
      if (this.gap(a, b) <= (a.prevIds.has(b.id) ? 7 : 3)) { a.contacts.push(b); b.contacts.push(a); }   // a little hysteresis: locked units stay locked, so they do not flicker in and out of combat
    }
  }

  // A unit is flanked when an enemy in contact stands at its side or rear, and surrounded when enemies press it from opposite sides.
  markExposure() {
    for (const u of this.units) {
      u.flanked = 0; u.frontCount = 0; const was = u.surrounded; u.surrounded = false;
      if (!u.present || u.state === 'routing') continue;
      const act = u.contacts.filter(e => e.active);
      for (const e of act) if (this.angleMult(e, u).c > 1) u.flanked++; else u.frontCount++;
      if (act.length >= 2) {
        const br = act.map(e => Math.atan2(e.y - u.y, e.x - u.x)); let spread = 0;
        for (let i = 0; i < br.length; i++) for (let j = i + 1; j < br.length; j++) spread = Math.max(spread, Math.abs(norm(br[i] - br[j])));
        u.surrounded = spread > 2.0;
      }
      if (u.surrounded && !was && !u.notedSurround) { u.notedSurround = true; this.say(`${u.name} is surrounded!`, u.side === 'rome' ? 'bad' : 'good'); }
      if (!u.surrounded) u.notedSurround = false;
    }
  }

  stepUnit(u, dt) {
    const t = u.type, W = WORLD.w, H = WORLD.h;
    u.blocked = false; u.fighting = false; u.shooting = false;
    if (u.pilumCd > 0) u.pilumCd -= dt;
    if (u.disrupted > 0) u.disrupted -= dt;
    if (u.skCd > 0) u.skCd -= dt;
    if (u.state === 'routing') return this.stepRout(u, dt);
    const engaged = u.contacts.some(e => e.active);
    const pursuit = !engaged && u.contacts.length > 0;
    let goal = null, speedMul = 1, breakoff = false, backing = false;

    if (u.order.kind === 'retreat') goal = { x: u.x, y: H + 90 };
    else if (u.order.kind === 'move') {
      const dx = u.order.x - u.x, dy = u.order.y - u.y, dist = Math.hypot(dx, dy);
      // a marching missile unit stops to fire the moment an enemy is in range ahead (Ctrl+right-click moves ignore this)
      if (t.cat === 'ranged' && !u.order.ignore && u.ammo > 0 && dist > 4 && !engaged) {
        const hx = dx / dist, hy = dy / dist;
        for (const e of this.units) {
          if (e.side === u.side || !e.active) continue;
          const ex = e.x - u.x, ey = e.y - u.y, ed = Math.hypot(ex, ey) || 1;
          if (this.gap(u, e) <= t.range * 0.9 && (ex * hx + ey * hy) / ed > 0.25) { u.order = { kind: 'none' }; u.post = { x: u.x, y: u.y }; break; }
        }
      }
      if (u.order.kind === 'move') {
        if (dist < 4 || (u.order.back && dist < 6)) {
          if (u.order.tf != null && !u.order.back) this.turnTo(u, u.order.tf, dt);
          if (u.order.targetId == null) u.order = { kind: 'none' };
        } else if (u.order.back) backing = true;
        else goal = { x: u.order.x, y: u.order.y };
      }
    } else if (u.order.kind === 'attack') {
      const tg = this.byId(u.order.targetId);
      if (!tg || !tg.present) { u.order = { kind: 'none' }; u.post = { x: u.x, y: u.y }; }
      else if (t.cat === 'ranged' && tg.active && this.gap(u, tg) <= t.range * 0.85 && u.ammo > 0) { this.turnToward(u, tg, dt); }
      else if (t.cat === 'ranged' && u.ammo <= 0) { u.order = { kind: 'none' }; u.post = { x: u.x, y: u.y }; }   // an empty skirmisher never walks into melee on its own
      else goal = { x: tg.x, y: tg.y };
    } else if (u.order.kind === 'guard') {
      const gd = this.byId(u.order.targetId);
      if (!gd || !gd.present || gd.state === 'routing') { u.order = { kind: 'none' }; u.post = { x: u.x, y: u.y }; }
      else {
        let thr = null, tgp = 1e9;
        for (const e of this.units) { if (e.side === u.side || !e.active) continue; const g2 = this.gap(gd, e); if (g2 < tgp) { tgp = g2; thr = e; } }
        if (thr && tgp < 90 && t.cat !== 'ranged') goal = { x: thr.x, y: thr.y };            // fight what threatens the guarded unit
        else {
          const behind = t.cat === 'ranged', sd = (u.id & 1) ? 1 : -1, off = behind ? gd.d / 2 + u.d / 2 + 16 : gd.w / 2 + u.w / 2 + 14;
          const sx = behind ? gd.x - Math.cos(gd.f) * off : gd.x - Math.sin(gd.f) * sd * off, sy = behind ? gd.y - Math.sin(gd.f) * off : gd.y + Math.cos(gd.f) * sd * off;
          if (Math.hypot(sx - u.x, sy - u.y) > 12) goal = { x: sx, y: sy }; else this.turnTo(u, gd.f, dt);
        }
      }
    }
    if (u.order.kind === 'none' && u.stance === 'aggressive' && !engaged) {
      const n = this.nearestEnemy(u, (e) => e.active);
      const aggro = t.cat === 'ranged' ? t.range * 1.25 : 60;
      const leashed = u.side === 'rome' && u.post, lim = u.leash + (t.cat === 'ranged' ? t.range * 0.5 : 0);
      const inReach = n && n.gap < aggro && (!leashed || Math.hypot(n.e.x - u.post.x, n.e.y - u.post.y) < lim + aggro);
      if (inReach) {
        if (t.cat === 'ranged') { if (u.ammo > 0 && !u.holdFire) { if (n.gap <= t.range * 0.85) this.turnToward(u, n.e, dt); else goal = { x: n.e.x, y: n.e.y }; } else this.turnToward(u, n.e, dt, 0.5); }
        else goal = { x: n.e.x, y: n.e.y };
      } else {
        const dp = leashed ? Math.hypot(u.x - u.post.x, u.y - u.post.y) : 0;
        if (leashed) { if (dp > 26) u.returning = true; else if (dp < 7) u.returning = false; }          // hysteresis: no hunting around the post
        if (leashed && u.returning) goal = { x: u.post.x, y: u.post.y };   // return to the post
        else if (n && n.gap < 150) { const fa = this.front && this.front.rome; this.faceSmooth(u, u.side === 'rome' && fa != null ? fa : Math.atan2(n.e.y - u.y, n.e.x - u.x), dt, 0.5); }
      }
    }

    // skirmishers step back from melee troops that reach them (through their own line) instead of standing and dying
    if (t.cat === 'ranged' && engaged && u.ammo > 0 && !u.holdFire && u.order.kind === 'none' && u.stance !== 'hold' && !(u.skCd > 0)) {
      const c = u.contacts.filter(e => e.active && e.type.cat !== 'ranged').sort((a, b) => this.gap(u, a) - this.gap(u, b))[0];
      if (c) { const dx = u.x - c.x, dy = u.y - c.y, d = Math.hypot(dx, dy) || 1; this.setMove(u, clamp(u.x + dx / d * 110, 20, WORLD.w - 20), clamp(u.y + dy / d * 110, 20, WORLD.h - 20), null, true); u.skCd = 6; }
    }
    if (goal && u.order.kind !== 'retreat') goal = this.pathGoal(u, goal);
    if (goal && u.order.sprint && u.fatigue < 78) speedMul = SPRINT;
    if (engaged) {
      // fight unless deliberately breaking off
      const away = goal && (u.order.kind === 'move' || u.order.kind === 'retreat') && Math.hypot(goal.x - u.x, goal.y - u.y) > 15;
      if (away) breakoff = true; else { goal = null; }
    }
    if (backing) {
      this.walkBack(u, dt); u.state = 'moving';
      if (engaged) breakoff = true;
    } else if (goal && !(t.cat === 'ranged' && u.order.kind === 'none' && u.shooting)) {
      const moved = this.moveToward(u, goal.x, goal.y, dt, speedMul);
      u.state = 'moving';
      u.dustCd = (u.dustCd || 0) - dt;
      if (moved > 0.4 && u.dustCd <= 0 && this.fx.length < 450) {
        u.dustCd = 0.16;
        this.fx.push({ kind: 'dust', x: u.x - Math.cos(u.f) * u.d / 2 + (this.rand() - 0.5) * u.w * 0.6, y: u.y - Math.sin(u.f) * u.d / 2 + (this.rand() - 0.5) * u.w * 0.6, life: 1.1, max: 1.1, r: 3 + this.rand() * 3 });
      }
      if (moved < 0.1 && u.blocked) u.state = 'idle';
    } else u.state = 'idle';

    if (engaged && !breakoff) {
      // face the weighted centre of everything pressing on the unit, not whichever enemy is nearest this instant (that flips every tick)
      const act = u.contacts.filter(e => e.active); let sx = 0, sy = 0, sw = 0;
      for (const e of act) { const w = 1 / (Math.max(0, this.gap(u, e)) + 12), bg = Math.atan2(e.y - u.y, e.x - u.x); sx += Math.cos(bg) * w; sy += Math.sin(bg) * w; sw += w; }
      if (sw > 0) { const mag = Math.hypot(sx, sy) / sw; if (mag > 0.35) this.faceSmooth(u, Math.atan2(sy, sx), dt, 0.8); else if (u.faceId == null || !act.some(e => e.id === u.faceId)) u.faceId = act.sort((a, b) => this.gap(u, a) - this.gap(u, b))[0].id; }
      if (sw > 0 && Math.hypot(sx, sy) / sw <= 0.35) { const f = this.byId(u.faceId); if (f) this.faceSmooth(u, Math.atan2(f.y - u.y, f.x - u.x), dt, 0.8); }
    } else if (!engaged && u.side === 'rome' && u.order.kind === 'none' && !goal && !backing && !(t.cat === 'ranged' && u.ammo > 0 && !u.holdFire && (this.nearestEnemy(u) || { gap: 1e9 }).gap < t.range * 1.3)) {
      // idle troops dress their ranks: face the enemy as one line (or square up with the neighbours) instead of each turning on its own
      const fa = this.front && this.front.rome;
      if (fa != null) this.faceSmooth(u, fa, dt, 0.5);
    }
    u.fighting = (engaged && (!breakoff || u.blocked)) || pursuit && !breakoff;
    if (u.fighting) u.state = 'fighting';
    // fatigue
    if (u.fighting) u.fatigue = Math.min(100, u.fatigue + 0.9 * dt);
    else if (u.state === 'moving') u.fatigue = Math.min(100, u.fatigue + (speedMul > 1 ? 1.9 : 0.45) * dt);
    else u.fatigue = Math.max(0, u.fatigue - 2.2 * dt);
    // exit by retreat
    if (u.order.kind === 'retreat' && u.y >= H + 60) { u.state = 'gone'; u.exited = true; this.say(`${u.name} has withdrawn from the field.`, 'info'); }
  }

  stepRout(u, dt) {
    // flee away from nearest enemy, toward the nearer map edge on the side away from threat
    const n = this.nearestEnemy(u, (e) => e.active);
    let dx, dy;
    if (n) { dx = u.x - n.e.x; dy = u.y - n.e.y; } else { dx = 0; dy = u.side === 'rome' ? 1 : -1; }
    const d = Math.hypot(dx, dy) || 1;
    dx = dx / d; dy = dy / d + (u.side === 'rome' ? 0.6 : -0.6);
    const dd = Math.hypot(dx, dy) || 1;
    if (u.fleeH == null || this.t >= (u.fleeT || 0)) { u.fleeH = Math.atan2(dy / dd, dx / dd); u.fleeT = this.t + 1.2; }   // pick a direction and hold it for a moment
    const diffH = norm(u.fleeH - u.f), mH = u.type.turn * 1.6 * dt; u.f = norm(u.f + clamp(diffH, -mH, mH));
    const h = u.f;
    const sp = this.speedOf(u) * 1.15;
    let rx = u.x + Math.cos(h) * sp * dt, ry = u.y + Math.sin(h) * sp * dt;
    if (this.waterAt(rx, ry) && !this.waterAt(u.x, u.y)) { if (!this.waterAt(rx, u.y)) ry = u.y; else if (!this.waterAt(u.x, ry)) rx = u.x; else { rx = u.x; ry = u.y; } }   // routers cannot swim either
    u.x = rx; u.y = ry;
    u.state = 'routing';
    // recover
    const safe = !n || n.gap > 140;
    if (safe) u.morale += 3 * dt * (u.side === 'rome' ? (this.inCommand(u) ? 1.3 : 0.6) : 1);
    if (u.morale > u.maxMorale * 0.55 && safe && u.x > 0 && u.x < WORLD.w && u.y > 0 && u.y < WORLD.h) this.rallyUnit(u);   // rallied units walk back to their post
    if (u.x < -60 || u.x > WORLD.w + 60 || u.y < -60 || u.y > WORLD.h + 60) { u.state = 'gone'; u.fled = true; }
  }

  waterAt(x, y) { return terrainAt(this.scn, x, y).kind === 'water'; }
  // Where a unit should actually head: straight for its goal, unless a river lies between, in which case via the nearest ford.
  pathGoal(u, g) {
    const fords = this._fords || (this._fords = this.scn.terrain.filter(f => f.kind === 'ford'));
    if (!fords.length) return g;
    const dx = g.x - u.x, dy = g.y - u.y, d = Math.hypot(dx, dy); if (d < 60) return g;
    let wet = false; const n = Math.min(40, Math.ceil(d / 30));
    for (let i = 1; i < n; i++) if (this.waterAt(u.x + dx * i / n, u.y + dy * i / n)) { wet = true; break; }
    if (wet) u.wetT = this.t + 4; else if (!(this.t < (u.wetT || 0))) return g;      // once a river is in the way, keep the plan for a few seconds so the route does not flicker
    let best = null, bc = 1e18;
    for (const f of fords) { const cx = f.x + f.w / 2, cy = f.y + riverShift(f, cx) + f.h / 2, c = Math.hypot(cx - u.x, cy - u.y) + Math.hypot(g.x - cx, g.y - cy); if (c < bc) { bc = c; best = { f, cx, cy }; } }
    const { f, cx, cy } = best, dir = Math.sign(g.y - cy) || 1, half = f.h / 2 + 45;
    const A = { x: cx, y: cy - dir * half }, B = { x: cx, y: cy + dir * half };
    if (Math.abs(u.y - cy) <= f.h / 2 + 15 && Math.abs(u.x - cx) <= f.w / 2 + 10) { u.crossing = true; return B; }
    if ((u.y - cy) * dir < 0) { if (u.crossing) return B; if (Math.hypot(A.x - u.x, A.y - u.y) > 35) return A; u.crossing = true; return B; }   // once at the ford, commit to crossing (no dithering between the two banks)
    u.crossing = false; return g;
  }
  speedOf(u) {
    const tr = this.terr(u);
    const terr = u.type.cat === 'cav' ? tr.cav : tr.speed;
    const e0 = elevAt(this.scn, u.x, u.y), grade = (elevAt(this.scn, u.x + Math.cos(u.f) * 12, u.y + Math.sin(u.f) * 12) - e0) / 12;   // uphill slows, downhill helps
    const slope = clamp(1 - (u.type.cat === 'cav' ? 2.2 : 1.5) * grade, 0.5, 1.15);
    return u.type.speed * terr * slope * (1 - u.fatigue / 250) * (u.formation === 'close' ? 0.55 : u.formation === 'orb' ? 0.4 : u.formation === 'wedge' ? 0.92 : 1) * (1 - 0.06 * ((u.wide || 1) - 1));
  }
  // Turning with a dead zone: small errors are ignored, so units settle instead of trembling.
  faceSmooth(u, ang, dt, k = 1) {
    const diff = norm(ang - u.f); if (Math.abs(diff) < 0.1) return;
    const m = u.type.turn * (0.7 + u.drill / 200) * dt * k; u.f = norm(u.f + clamp(diff, -m, m));
  }
  updateFront() {
    const f = this.front = this.front || { rome: null, gaul: null };
    const rs = this.units.filter(u => u.side === 'rome' && u.active), gs = this.units.filter(u => u.side === 'gaul' && u.active && u.spotted !== false);
    if (!rs.length || !gs.length) return;
    const rc = { x: rs.reduce((a, u) => a + u.x, 0) / rs.length, y: rs.reduce((a, u) => a + u.y, 0) / rs.length }, gc = { x: gs.reduce((a, u) => a + u.x, 0) / gs.length, y: gs.reduce((a, u) => a + u.y, 0) / gs.length };
    f.rome = Math.atan2(gc.y - rc.y, gc.x - rc.x); f.gaul = f.rome + Math.PI;
  }
  turnTo(u, ang, dt) { const diff = norm(ang - u.f), m = u.type.turn * dt; u.f = norm(u.f + clamp(diff, -m, m)); }
  turnToward(u, e, dt, k = 1) { const ang = Math.atan2(e.y - u.y, e.x - u.x); const diff = norm(ang - u.f); if (Math.abs(diff) < 0.07) return; const m = u.type.turn * (0.7 + u.drill / 200) * dt * k; u.f = norm(u.f + clamp(diff, -m, m)); }

  // Orderly fall back: face the enemy and walk straight backward to the order's point.
  walkBack(u, dt) {
    const dx = u.order.x - u.x, dy = u.order.y - u.y, d = Math.hypot(dx, dy) || 1, n = this.nearestEnemy(u);
    if (n) this.turnToward(u, n.e, dt, 0.8);
    const sp = this.speedOf(u) * 0.9 * (this.overlapsFriend(u, dx / d, dy / d) ? PASS_SPEED : 1), step = Math.min(d, sp * dt);
    u.x += dx / d * step; u.y += dy / d * step; u.runT = 0;
  }
  // True while a unit is actually marching through a friendly unit: it has pushed well into the friend's footprint and the friend
  // lies ahead of it (or the two are nearly on top of each other). Units standing shoulder to shoulder do not count.
  overlapsFriend(u, hx, hy) {
    for (const f of this.units) {
      if (f === u || f.side !== u.side || !f.present || f.state === 'routing') continue;
      if (Math.abs(f.x - u.x) > 130 || Math.abs(f.y - u.y) > 130) continue;
      const g = this.gap(u, f); if (g > -8) continue;
      const dx = f.x - u.x, dy = f.y - u.y, d = Math.hypot(dx, dy) || 1;
      if (d < Math.min(u.w, f.w) * 0.35 || (dx * hx + dy * hy) / d > 0.3) return true;
    }
    return false;
  }
  moveToward(u, tx, ty, dt, speedMul) {
    const dx = tx - u.x, dy = ty - u.y, dist = Math.hypot(dx, dy);
    if (dist < 0.5) return 0;
    const h = Math.atan2(dy, dx), diff = norm(h - u.f);
    const m = u.type.turn * (0.7 + u.drill / 200) * (u.perks.includes('discipline') ? 1.2 : 1) * dt;
    if (dist >= 30) u.f = norm(u.f + clamp(diff, -m, m));              // a short shuffle is a sidestep, not a turn
    const ad = Math.abs(norm(h - u.f));
    const align = dist < 30 ? 1 : ad < 0.6 ? 1 : ad < 1.5 ? 0.4 : 0.12;
    u.passing = this.overlapsFriend(u, Math.cos(h), Math.sin(h));          // marching through friendly units is slow going
    const sp = this.speedOf(u) * speedMul * align * (u.passing ? PASS_SPEED : 1);
    const step = Math.min(dist, sp * dt);
    let nx = u.x + Math.cos(h) * step, ny = u.y + Math.sin(h) * step;
    if (u.order.kind !== 'retreat' && this.waterAt(nx, ny) && !this.waterAt(u.x, u.y)) {   // deep water cannot be crossed: slide along the bank
      let ok = false; const sg = u.slideSign || 1;
      for (const a of [0.6, -0.6, 1.2, -1.2, 1.8, -1.8]) { const hh = h + a * sg, tx = u.x + Math.cos(hh) * step, ty = u.y + Math.sin(hh) * step; if (!this.waterAt(tx, ty)) { nx = tx; ny = ty; ok = true; if (a < 0) u.slideSign = -sg; break; } }
      if (!ok) { u.blocked = true; return 0; }
    }
    for (const e of this.units) {
      if (e.side === u.side || !e.active) continue;
      const g = this.gapAt(u, nx, ny, e);
      if (g < 0.5 && g < this.gap(u, e)) { u.blocked = true; u.runT = 0; return 0; }
    }
    u.x = u.order.kind === 'retreat' ? nx : clamp(nx, 5, WORLD.w - 5);
    u.y = u.order.kind === 'retreat' ? ny : clamp(ny, 5, WORLD.h - 5);
    if (step >= sp * dt * 0.7 && sp > u.type.speed * 0.45) u.runT += dt; else u.runT = Math.max(0, u.runT - dt);
    return step;
  }

  separate(dt) {
    // Friendly units never shove each other (see PASS_SPEED). Only two idle units sharing the same spot drift slowly apart.
    const us = this.units.filter(u => u.present && u.state === 'idle' && u.order.kind === 'none' && !u.fighting);
    for (let i = 0; i < us.length; i++) for (let j = i + 1; j < us.length; j++) {
      const a = us[i], b = us[j];
      if (a.side !== b.side || Math.abs(a.x - b.x) > 110 || Math.abs(a.y - b.y) > 110) continue;
      const g = this.gap(a, b);
      if (g < -Math.min(a.d, b.d) * 0.5) {
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, push = 6 * dt;
        a.x -= dx / d * push; a.y -= dy / d * push; b.x += dx / d * push; b.y += dy / d * push;
      }
    }
  }


  // ---------- combat ----------
  atkMult(u) {
    const tr = this.terr(u), t = u.type;
    const moraleF = clamp(0.6 + 0.4 * (u.morale / u.maxMorale), 0.5, 1);
    const off = u.officer ? 1 + 0.03 * (u.officer.tactics || 0) : 1;
    const terr = tr.atk * (t.cat === 'cav' ? tr.cav : 1);
    const pk = (id) => u.perks.includes(id);
    const gear = (1 + 0.10 * Math.min(MAX_TIER, u.upg.weapon)) * (u.lvl >= 4 ? 1.08 : 1) * (pk('shock') ? 1.05 : 1) * (pk('cadre') ? 1.1 : 1);
    return COMBAT_PACE * gear * (1 + 0.07 * u.lvl) * (1 + 0.12 * u.drill / 100) * moraleF * (1 - u.fatigue / 200) * off * terr * (u.formation === 'close' ? 0.6 : u.formation === 'orb' ? 0.55 : 1);
  }
  defOf(e, frontal) {
    let d = e.type.def + e.lvl * 0.01 + (e.lvl >= 3 ? 0.02 : 0) + 0.06 * Math.min(MAX_TIER, e.upg.armour) - (e.surrounded ? 0.15 : 0);
    if (e.formation === 'close' && frontal) d += 0.2;
    if (e.formation === 'orb') d += 0.1;
    return Math.min(0.88, d) ;
  }

  hit(att, def, n, ranged = false, cause = null) {
    n = Math.min(n, def.men);
    if (n <= 0) return;
    cause = cause || (ranged ? 'missile' : 'frontal');
    const kk = this.stats.k[att.side]; kk[cause] = (kk[cause] || 0) + n;
    if (ranged && att.side === 'rome') this.stats.rangedKills += n;
    def.men -= n; def.casualties += n; att.kills += n; def.flash = 0.22; def.floatAcc = (def.floatAcc || 0) + n;
    let loss = n / def.maxMen * 130 * def.type.fragile * (ranged ? 0.55 : 1);
    if (def.officer) loss *= 1 - 0.04 * (def.officer.tactics || 0);
    if (def.perks.includes('steadfast')) loss *= 0.8;
    loss *= 1 - 0.15 * clamp(hgt(this, def), 0, 1.3);          // men on high ground hold their nerve
    { const th = (def.wide || 1) - 1; loss *= 1 + 0.7 * th + 0.6 * th * th; }                  // a thin line has no depth to absorb its losses: casualties shake it harder
    if (def.lvl >= 2) loss *= 0.9;
    def.moralePending += loss; this.mloss(def, cause, loss);
    def.bodyAcc += n / def.type.perDot;
    while (def.bodyAcc >= 1) {
      def.bodyAcc -= 1;
      const lat = (this.rand() - 0.5) * def.w, dep = (this.rand() - 0.5) * def.d;
      const c = Math.cos(def.f), sn = Math.sin(def.f);
      if (this.bodies.length < 1800) this.bodies.push({ x: def.x + c * dep - sn * lat, y: def.y + sn * dep + c * lat, side: def.side, a: this.rand() * 3.14 });
    }
    if (def.men <= 0) { def.men = 0; def.state = 'dead'; this.mark('dead', def.name, def.side); this.say(`${def.name} is annihilated.`, def.side === 'rome' ? 'bad' : 'good'); }
  }

  combat(u, dt) {
    const t = u.type;
    if (u.state === 'routing') return;
    // ranged fire
    if (t.range && u.ammo > 0 && !u.holdFire && !u.contacts.some(e => e.active) && (u.state !== 'moving' || u.order.kind === 'none')) {
      let tgt = u.order.kind === 'attack' ? this.byId(u.order.targetId) : null;
      if (!tgt || !tgt.active || this.gap(u, tgt) > t.range) { const n = this.nearestEnemy(u, u.side === 'rome' ? (e) => e.active && e.spotted !== false : undefined); tgt = n && n.gap <= t.range ? n.e : null; }
      if (tgt) {
        const g = this.gap(u, tgt);
        u.shooting = true;
        const am = this.angleMult(u, tgt).c;
        const prot = this.defOf(tgt, am === 1) * (tgt.formation === 'close' && am === 1 ? 2.2 : tgt.formation === 'orb' ? 1.2 : 0.6);
        const falloff = 1 - 0.4 * clamp(g / t.range, 0, 1);
        u.fireAcc += u.men * t.rate * dt * (this.atkMult(u) / COMBAT_PACE) * RANGED_PACE * falloff * (1 - Math.min(0.9, prot)) * (this.terr(tgt).kind === 'forest' ? 0.6 : 1) * (1 + 0.15 * clamp(hgt(this, u) - hgt(this, tgt), -1, 1));
        u.ammo -= dt;
        while (u.fireAcc >= 1) { u.fireAcc -= 1; this.hit(u, tgt, 1, true); }
        u.fxCd -= dt;
        if (u.fxCd <= 0) { u.fxCd = 0.3; for (let i = 0; i < 3; i++) this.fx.push({ x1: u.x + (this.rand() - 0.5) * u.w, y1: u.y, x2: tgt.x + (this.rand() - 0.5) * tgt.w, y2: tgt.y + (this.rand() - 0.5) * tgt.d, life: 0.5, max: 0.5, kind: 'shot' }); }
      }
    }
    // pilum volley
    if (u.pilumLeft > 0 && u.pilumCd <= 0 && u.state !== 'routing') {
      const n = this.nearestEnemy(u, (e) => e.active && e.type.cat !== 'ranged');
      if (n && n.gap > 1 && n.gap <= 30) {
        u.pilumLeft--; u.pilumCd = 3; if (u.side === 'rome') this.stats.pilum++;
        const ang = this.angleMult(u, n.e);
        const kills = Math.round(u.men * 0.05 * (this.atkMult(u) / COMBAT_PACE) * (1 - n.e.type.def * 0.5) * (n.e.formation === 'close' ? 0.5 : 1));
        this.hit(u, n.e, kills, false, 'pilum'); n.e.moralePending += 3; this.mloss(n.e, 'pilum', 3); n.e.disrupted = 6;
        for (let i = 0; i < 8; i++) this.fx.push({ x1: u.x + (this.rand() - 0.5) * u.w, y1: u.y, x2: n.e.x + (this.rand() - 0.5) * n.e.w, y2: n.e.y + (this.rand() - 0.5) * n.e.d, life: 0.45, max: 0.45, kind: 'pilum' });
        if (u.side === 'rome') this.say(`${u.name} hurls its pila!`, 'info');
      }
    }
    // melee
    if (!u.fighting || !u.contacts.length) return;
    const targets = u.contacts.filter(e => e.present);
    if (!targets.length) return;
    const fighters = Math.min(u.men, u.effFront * 2.4) * (t.cat === 'ranged' ? 0.5 : 1);
    const share = fighters / targets.length;
    const am = this.atkMult(u);
    u.sparkCd = (u.sparkCd || 0) - dt;
    if (u.sparkCd <= 0) { u.sparkCd = 0.22 + this.rand() * 0.25; const e0 = targets[0], ang0 = this.angleMult(u, e0); this.addFx({ kind: 'spark', x: (u.x + e0.x) / 2 + (this.rand() - 0.5) * Math.min(u.w, e0.w) * 0.6, y: (u.y + e0.y) / 2 + (this.rand() - 0.5) * Math.min(u.d, e0.d) * 0.4, life: 0.4, max: 0.4, hot: ang0.c > 1 }); }
    for (const e of targets) {
      const ang = this.angleMult(u, e);
      // impact on new contact
      if (!u.prevIds.has(e.id) && e.state !== 'routing' && u.runT > 1.2 && t.charge > 0.3) {
        let imp = u.men * t.charge * 0.035 * ang.m * (u.formation === 'wedge' ? 1.4 : 1) * (u.disrupted > 0 ? 0.5 : 1) * (u.perks.includes('shock') ? 1.25 : 1);
        imp *= e.formation === 'close' && ang.c === 1 ? 0.7 : 1;
        imp *= 1 - Math.max(0, (e.type.antiCharge || 0) * (1 - 0.35 * ((e.wide || 1) - 1))) * (e.state === 'idle' || e.stance === 'hold' ? 1 : 0.4);
        imp *= 1 + 0.3 * ((e.wide || 1) - 1);                    // a charge into a thin line goes deeper
        imp *= this.terr(e).def;
        imp *= 1 + 0.3 * clamp(hgt(this, u) - hgt(this, e), -1, 1);   // charging downhill hits harder, uphill softer
        if (u.morale < u.maxMorale * 0.5 || u.fatigue > 60) {        // spent or shaken men cannot deliver a charge
          imp *= 0.4; u.disrupted = Math.max(u.disrupted, 3);
          if (u.side === 'rome' && !u.notedFalter) { u.notedFalter = true; this.say(`${u.name}'s charge falters - the men are spent.`, 'warn'); }
        } else u.notedFalter = false;
        if (!this.inCommand(u)) imp *= 0.7;                          // out of the general's sight, a charge goes in ragged
        this.hit(u, e, Math.round(imp), false, 'charge');
        if (imp > 6) { this.addFx({ kind: 'clash', x: (u.x + e.x) / 2, y: (u.y + e.y) / 2, life: 0.6, max: 0.6, r: clamp(imp / 5, 9, 30) }); this.shake = Math.max(this.shake, Math.min(3, imp / 25)); }
        e.moralePending += t.charge * 3 * ang.m; this.mloss(e, 'charge', t.charge * 3 * ang.m);
        if (u.side === 'gaul' && e.side === 'rome' && imp > 8) this.say(`${u.name} crashes into ${e.name}!`, 'warn');
        u.runT = 0;
      }
      const routingMult = e.state === 'routing' ? (t.cat === 'cav' ? 2.2 : 1.6) : 1;
      const def = e.state === 'routing' ? 0 : this.defOf(e, ang.c === 1);
      // head-on is a grind; flank and rear hits are decisive; a unit hit from the side or behind, or surrounded, fights back less
      const pressed = u.surrounded ? 0.7 : 1 - 0.15 * Math.min(3, u.flanked || 0);
      const room = ang.c === 1 ? Math.min(1, 3 * (e.wide || 1) / Math.max(1, e.frontCount || 1)) : 1;   // only so many men can fight on one front
      u.pending += share * (1 + 0.25 * ((e.wide || 1) - 1)) * t.atk * dt * am * ang.g * room * pressed * (1 - def) * routingMult * this.terr(e).def;
      if (ang.c > 1 && e.state !== 'routing') { const ml = (ang.c === 3 ? REAR_MORALE : FLANK_MORALE) * dt / targets.length; e.morale -= ml; this.mloss(e, ang.c === 3 ? 'rear' : 'flank', ml); }
      if (u.side === 'rome' && ang.c > 1 && e.state !== 'routing') this.stats[ang.c === 3 ? 'rearTime' : 'flankTime'] += dt / targets.length;
    }
    // allocate the accumulated kills across targets evenly
    while (u.pending >= 1) {
      u.pending -= 1;
      const e = targets[Math.floor(this.rand() * targets.length)];
      const ac = this.angleMult(u, e).c;
      this.hit(u, e, 1, false, ac === 3 ? 'rear' : ac === 2 ? 'flank' : 'frontal');
    }
  }

  applyDamage(u, dt) {
    if (u.flash > 0) u.flash -= dt;
    u.floatCd = (u.floatCd || 0) - dt;
    if (u.floatAcc >= 2 && u.floatCd <= 0) {
      this.floats.push({ x: u.x + (this.rand() - 0.5) * u.w * 0.6, y: u.y - 4, text: '-' + Math.round(u.floatAcc), side: u.side, life: 1.5, max: 1.5 });
      u.floatAcc = 0; u.floatCd = 0.9;
    }
    if (u.surrounded && u.state !== 'routing') { u.morale -= SURROUND_MORALE * dt; this.mloss(u, 'surround', SURROUND_MORALE * dt); }
    if (u.side === 'rome' && u.state !== 'routing' && u.contacts.some(e => e.active)) { this.stats.engaged += dt; if (!this.inCommand(u)) this.stats.outCmd += dt; }
    if (u.moralePending > 0) {
      u.morale -= u.moralePending; u.moralePending = 0;
    }
    u.updateDims();
    if (u.state === 'dead' || u.state === 'gone') return;
    if (u.state !== 'routing') {
      if (!u.contacts.some(e => e.active)) u.morale = Math.min(u.maxMorale, u.morale + (2.2 + (u.officer ? 0.35 * (u.officer.tactics || 0) : 0) + (u.perks.includes('inspire') ? 1.1 : 0)) * dt * (u.side === 'rome' ? (this.inCommand(u) ? 1.2 : 0.45) : 1));
      if (u.morale <= Math.max(12, u.maxMorale * 0.2)) {
        u.state = 'routing'; u.order = { kind: 'none' }; this.stats.routs[u.side]++;
        this.addFx({ kind: 'ring', x: u.x, y: u.y, life: 1, max: 1, r: Math.max(u.w, u.d) });
        this.say(`${u.name} breaks and flees!`, u.side === 'rome' ? 'bad' : 'good');
        { const mc = u.mc || {}, tot = Object.values(mc).reduce((a, b) => a + b, 0) || 1; const top = Object.entries(mc).sort((a, b) => b[1] - a[1]); this.mark('rout', u.name, u.side, { x: u.x, y: u.y, men: u.men, cause: top.length ? top[0][0] : 'frontal', share: top.length ? top[0][1] / tot : 1, cause2: top[1] ? top[1][0] : null, cmd: this.inCommand(u), neigh: !!u.mc && (u.mc.neighbour || 0) / tot > 0.25 }); }
        for (const o of this.units) {
          if (!o.active || o === u) continue;
          if (Math.hypot(o.x - u.x, o.y - u.y) < 170) { o.morale += o.side === u.side ? -4 : 3; if (o.side === u.side) this.mloss(o, 'neighbour', 4); }   // a rout shakes its neighbours, but does not guarantee a cascade
        }
      }
    }
  }

  updateObjectives(dt) {
    if (!this.objectives.length) return;
    for (const o of this.objectives) {
      const pr = { rome: false, gaul: false };
      for (const u of this.units) if (u.active && Math.hypot(u.x - o.x, u.y - o.y) < o.r + Math.max(u.w, u.d) / 3) pr[u.side] = true;
      o.presence = pr; o.contested = pr.rome && pr.gaul;
      if (pr.rome && !pr.gaul) o.owner = 'rome'; else if (pr.gaul && !pr.rome) o.owner = 'gaul';
    }
    if (!this.rule) return;
    const att = this.rule.attacker, def = att === 'rome' ? 'gaul' : 'rome';
    const holding = this.objectives.every(o => o.presence[att] && !o.presence[def]);
    this.hold[att] = holding ? this.hold[att] + dt : Math.max(0, this.hold[att] - dt * 2);
  }

  armyMorale() {
    for (const side of ['rome', 'gaul']) {
      if (this.broken[side]) continue;
      const start = side === 'rome' ? this.startRome : this.startGaul;
      if (this.activeMen(side) < start * 0.4) {
        this.broken[side] = true;
        for (const u of this.units) if (u.side === side && u.active) u.morale -= 5;
        this.say(side === 'rome' ? 'Your army wavers - the line is cracking!' : 'The Gallic host wavers!', side === 'rome' ? 'bad' : 'good'); this.mark('waver', side === 'rome' ? 'Your army wavers' : 'The Gallic host wavers', side);
      }
    }
  }

  checkEnd(dt) {
    if (this.endTimer !== null) {
      this.endTimer -= dt;
      if (this.endTimer <= 0) this.resolve(this.pendingOutcome);
      return;
    }
    const gaulActive = this.activeMen('gaul'), romeActive = this.activeMen('rome');
    const romeInField = this.units.some(u => u.side === 'rome' && u.present);
    const finish = (o, delay) => { this.pendingOutcome = o; this.endTimer = delay; };
    const waiting = this.pendingWaves().length > 0;
    if (this.rule && !(waiting && this.rule.attacker === 'rome') && this.hold[this.rule.attacker] >= this.rule.holdSecs) {
      if (this.rule.attacker === 'rome') { this.say('The objective is taken - the enemy lines collapse!', 'good'); for (const u of this.units) if (u.side === 'gaul' && u.active) u.state = 'routing'; return finish('victory', 4); }
      this.say('The enemy has seized the objective. The convoy is lost!', 'bad'); return finish('defeat', 3);
    }
    if (!waiting && gaulActive < this.startGaul * 0.25) {
      for (const u of this.units) if (u.side === 'gaul' && u.active) { u.state = 'routing'; }
      this.say('The Gallic host is broken. Victory!', 'good'); return finish('victory', 4);
    }
    if (!this.retreating && (romeActive < this.startRome * 0.2 || !this.units.some(u => u.side === 'rome' && u.active))) {
      this.say('Your army is shattered.', 'bad'); return finish('defeat', 3);
    }
    if (this.retreating && !this.units.some(u => u.side === 'rome' && u.present && u.state !== 'routing')) {
      return finish(this.preserved() >= this.startRome * this.retreatFloor() ? 'draw' : 'defeat', 1);
    }
    if (this.t >= this.scn.timeLimit) {
      this.say('Night falls and both sides disengage.', 'info');
      return finish(this.preserved() >= this.startRome * this.retreatFloor() && gaulActive > this.startGaul * 0.25 ? 'draw' : 'defeat', 1);
    }
    if (!romeInField) finish(this.retreating && this.preserved() >= this.startRome * this.retreatFloor() ? 'draw' : 'defeat', 1);
  }
  // Share of the army that must survive a withdrawal for it to count as a draw; fortifications help.
  retreatFloor() { return Math.max(0.3, 0.45 - 0.05 * this.fortLevel); }
  preserved() { // men Rome keeps if the battle ended now
    let n = 0;
    for (const u of this.units) if (u.side === 'rome') n += u.state === 'routing' ? u.men * 0.5 : u.state === 'gone' ? (u.exited ? u.men : u.men * 0.5) : u.men;
    return n;
  }

  resolve(outcome) {
    const rw = this.scn.rewards, dm = this.diff;
    const rows = [];
    let enemyDead = 0;
    for (const u of this.units) if (u.side === 'gaul') enemyDead += u.casualties;
    const enemyStart = this.startGaul;
    for (const u of this.units) {
      if (u.side !== 'rome') continue;
      let survivors = u.men;
      if (u.state === 'routing' || (u.state === 'gone' && !u.exited)) survivors = Math.round(u.men * 0.5);
      const casualties = u.startMen - survivors;
      const recovered = Math.round(Math.max(0, casualties) * (outcome === 'defeat' ? 0.1 : 0.22) * this.recoveryMult);
      const endMen = Math.min(u.maxMen, survivors + recovered);
      const xpMult = outcome === 'victory' ? 1 : outcome === 'draw' ? 0.75 : 0.5;
      const xpGain = Math.round((rw.xpBase * xpMult + u.kills * 0.3) * (u.state === 'routing' ? 0.6 : 1));
      let fate = null;
      if (u.officer) {
        const r = casualties / Math.max(1, u.startMen);
        const chance = (0.03 + r * 0.4 + (u.state === 'routing' ? 0.12 : 0) + (u.state === 'dead' ? 0.4 : 0) + (outcome === 'defeat' ? 0.08 : 0)) * dm.officerRisk;
        fate = this.rand() < chance ? 'killed' : 'survived';
      }
      rows.push({ cohortId: u.cohortId, name: u.name, startMen: u.startMen, endMen, casualties, kills: u.kills, xpGain, officerId: u.officer ? u.officer.id : null, officerFate: fate });
    }
    const mult = outcome === 'victory' ? 1 : outcome === 'draw' ? 0.45 : 0;
    const rewardMult = (this.scn.rewardMult || 1) * dm.reward * this.rewardScale;
    this.sampleReport(); this.rep.nextSample = 0; this.rep.series.push({ t: Math.round(this.t), rome: Math.round(this.activeMen('rome')), gaul: Math.round(this.activeMen('gaul')), rr: 0, gr: 0 });
    this.result = {
      outcome, time: this.t, rows, enemyDead, enemyStart, report: { series: this.rep.series, events: this.rep.events, stats: this.stats, startRome: this.startRome, startGaul: this.startGaul },
      spoils: {
        gold: Math.round(rw.gold * mult * rewardMult),
        supplies: Math.round(rw.supplies * mult * rewardMult),
        recruits: Math.round(rw.recruits * mult * rewardMult)
      },
      officerXp: Math.round(rw.officerXp * (outcome === 'victory' ? 1 : outcome === 'draw' ? 0.7 : 0.4))
    };
  }
}

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
