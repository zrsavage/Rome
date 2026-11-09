// Pure battle simulation (no DOM). Real-time; the UI drives update(dt) and may pause.
import { UNIT_TYPES, WORLD, XP_LEVELS, DIFFICULTY, terrainAt } from './data.js';
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
const CMD_R = 240, GEN_SPEED = 75, ALL_ORDERS = ['testudo', 'relieve', 'rally', 'orbis'];
const hillOf = (b, u) => (b.terr(u).kind === 'hill' ? 1 : 0);
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
    this.alerted = false; this.updateDims();
  }
  get active() { return this.state !== 'routing' && this.state !== 'gone' && this.state !== 'dead'; }
  get present() { return this.state !== 'gone' && this.state !== 'dead'; }
  updateDims() {
    const t = this.type;
    this.front = Math.max(3, Math.sqrt(this.men * 3 * t.space));
    const rows = Math.max(1, this.men / this.front);
    this.w = Math.max(14, this.front * 2.7 * (this.formation === 'close' ? 0.8 : 1));
    this.d = Math.max(12, rows * 3.6 * (this.formation === 'close' ? 1.25 : 1));
    if (this.formation === 'orb') { const q = Math.sqrt(this.w * this.d) * 1.05; this.w = q; this.d = q; }   // a hollow square: no front, no flank
  }
  fwd() { return [Math.cos(this.f), Math.sin(this.f)]; }
}

export class Battle {
  constructor(scn, romeSpecs, opts = {}) {
    this.scn = scn;
    this.diff = DIFFICULTY[opts.difficulty || 'normal'];
    this.rand = mulberry32(opts.seed ?? (Date.now() & 0xffffff));
    this.t = 0; this.units = []; this.bodies = []; this.fx = []; this.log = [];
    this.result = null; this.endTimer = null; this.pendingOutcome = null;
    this.clearT = 0; this.fieldClear = false; this.callDelay = scn.callDelay || 12;   // breather before the next wave comes on its own
    this.retreating = false; this.broken = { rome: false, gaul: false };
    this.reinf = (scn.reinforcements || []).map(r => ({ ...r, done: false }));
    this.floats = [];
    this.stats = { flankTime: 0, rearTime: 0, rangedKills: 0, pilum: 0, routs: { rome: 0, gaul: 0 } };
    this.objectives = (scn.objectives || []).map(o => ({ ...o, contested: false, presence: { rome: false, gaul: false } }));
    this.rule = scn.rule || null; this.hold = { rome: 0, gaul: 0 };
    this.fortLevel = opts.fort || 0;
    this.favour = opts.favour || 0;
    // enemy strength modifiers: difficulty + local favour (informants and divided tribes)
    const favMult = this.favour >= 2 ? 0.9 : this.favour <= -2 ? 1.1 : 1;
    this.enemyScale = this.diff.enemyMult * favMult;
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
    this.say('Your army deploys. Press SPACE to begin the battle; you may issue orders while paused.', 'info');
  }

  spawnEnemy(e) {
    const men = Math.round(e.men * this.enemyScale);
    this.units.push(new Unit({ side: 'gaul', type: e.type, men, x: e.x, y: e.y, ai: { ...e.ai }, stance: e.ai && e.ai.kind === 'idle' ? 'hold' : 'aggressive', moraleBonus: this.diff.enemyMorale, xp: 40 + (this.diff.enemyMult > 1 ? 60 : 0) }));
  }
  say(msg, kind = 'info') { this.log.push({ t: this.t, msg, kind }); }
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
    return c > 0.6 ? { m: 1, c: 1, g: FRONT_GRIND } : c > -0.35 ? { m: 1.5, c: 2, g: FLANK_DMG } : { m: 2.2, c: 3, g: REAR_DMG };
  }

  // ---------- orders ----------
  // Orders never change a unit's stance. A move order sets its new post; an attack ends with the unit holding where it finished.
  setMove(u, x, y, tf = null, ignore = false) { if (!u.active) return; u.order = { kind: 'move', x, y, tf, ignore }; u.post = { x, y }; }
  setAttack(u, tgt) { if (!u.active) return; u.order = { kind: 'attack', targetId: tgt.id }; }
  setHold(u) { if (!u.active) return; u.order = { kind: 'none' }; u.stance = 'hold'; u.post = { x: u.x, y: u.y }; }
  setEngage(u) { if (!u.active) return; u.stance = 'aggressive'; if (u.order.kind === 'none') u.post = { x: u.x, y: u.y }; }
  toggleFormation(u) {
    if (!u.active || u.type.cat !== 'inf' || !this.orders.has('testudo')) return;
    u.formation = u.formation === 'close' ? 'normal' : 'close';
    u.updateDims();
  }
  toggleOrbis(u) {
    if (!u.active || u.type.cat !== 'inf' || !this.orders.has('orbis')) return;
    u.formation = u.formation === 'orb' ? 'normal' : 'orb';
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
    this.rallyCd = 90; this.say('The general rides the line - the cohorts steady!', 'good'); return true;
  }
  rallyUnit(u) {
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
    this.say(`${best.name} relieves ${u.name}.`, 'info'); return true;
  }
  // Cavalry ride down routers inside their reach (the reason a rout is so costly).
  pursue() {
    for (const u of this.units) {
      if (u.side !== 'rome' || u.type.cat !== 'cav' || !u.active || u.stance !== 'aggressive' || u.order.kind !== 'none' || u.contacts.some(e => e.active)) continue;
      let best = null, bg = 220;
      for (const e of this.units) if (e.side === 'gaul' && e.state === 'routing' && e.present) { const g = this.gap(u, e); if (g < bg) { bg = g; best = e; } }
      if (best) { this.setAttack(u, best); u.fatigue = Math.min(100, u.fatigue + 6); }
    }
  }
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
    for (const r of p) if (r.at <= first + 8) { r.at = this.t; if (!r.msg) r.msg = auto ? 'More enemies appear on the horizon!' : 'You call the next wave forward.'; }
    this.clearT = 0; return true;
  }

  // ---------- AI ----------
  aiThink() {
    for (const u of this.units) {
      if (u.side !== 'gaul' || !u.active || !u.ai) continue;
      const ai = u.ai;
      const near = this.nearestEnemy(u);
      if (!near) continue;
      if (ai.kind === 'ambush') {
        if (near.gap < ai.trigger || this.t > ai.maxDelay) { ai.kind = 'rush'; ai.delay = this.t + 1 + this.rand() * 3; if (!u.alerted) { u.alerted = true; if (!ai.quiet) this.say('A Gallic warband bursts from the treeline!', 'warn'); } }
      } else if (ai.kind === 'rush') {
        if (this.t < ai.delay) continue;
        const cur = u.order.kind === 'attack' ? this.byId(u.order.targetId) : null;
        if (!cur || !cur.active) {
          // a host that outnumbers you tries to wrap your line instead of meeting it head on
          if (!u.wrapped && u.type.cat === 'inf' && this.activeMen('gaul') > this.activeMen('rome') * 1.25 && this.rand() < 0.3) {
            u.wrapped = true; u.ai = { kind: 'flank', delay: 0 };
            if (!this._wrapSaid) { this._wrapSaid = true; this.say('Gallic warbands swing wide to wrap your line!', 'warn'); }
            continue;
          }
          this.setAttack(u, this.pickTarget(u));
        }
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
        if (near.gap < 70) { ai.kind = 'rush'; ai.delay = 0; continue; }
        if (o && !u.fighting) { if (Math.hypot(u.x - o.x, u.y - o.y) > 25) this.setMove(u, o.x, o.y); else u.order = { kind: 'none' }; }
      } else if (ai.kind === 'flank') {
        if (this.t < ai.delay) continue;
        let tgt = u.order.targetId ? this.byId(u.order.targetId) : null;
        if (!tgt || !tgt.active) { tgt = this.pickTarget(u, (e) => e.type.cat !== 'cav'); if (!tgt) continue; u.order = { kind: 'none', targetId: tgt.id }; }
        const bx = tgt.x - Math.cos(tgt.f) * (tgt.d / 2 + 70), by = tgt.y - Math.sin(tgt.f) * (tgt.d / 2 + 70);
        if (Math.hypot(u.x - bx, u.y - by) > 60 && !u.fighting) { u.order = { kind: 'move', x: bx, y: by, tf: null, targetId: tgt.id }; }
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
    this.t += dt;
    for (const r of this.reinf) if (!r.done && this.t >= r.at) {
      r.done = true;
      if (r.side === 'rome') {
        const u = new Unit({ ...r.unit, side: 'rome', xp: r.unit.xp ?? 30, drill: 25, moraleBonus: this.romeBonus, stance: 'aggressive' });
        this.units.push(u); this.startRome += u.men;
        const n = this.nearestEnemy(u); if (n) this.setAttack(u, n.e);
        if (r.msg) this.say(r.msg, 'good');
      } else {
        this.spawnEnemy(r.unit); this.startGaul += Math.round(r.unit.men * this.enemyScale);
        if (r.msg) this.say(r.msg, 'warn');
      }
    }
    // An empty field never means waiting: the next wave is called after a short breather (or the player can call it now).
    if (this.pendingWaves().length && this.activeMen('gaul') === 0) {
      this.clearT += dt;
      if (!this.fieldClear && this.clearT > 1) { this.fieldClear = true; this.say('The field is clear. More enemies are on their way.', 'info'); }
      if (this.clearT >= this.callDelay) this.callNextWave(true);
    } else { this.clearT = 0; this.fieldClear = false; }
    this.updateObjectives(dt);
    this.floats = this.floats.filter(f => (f.life -= dt) > 0);
    this._ai = (this._ai || 0) + dt;
    this.stepGeneral(dt);
    if (this._ai >= 0.4) { this._ai = 0; this.aiThink(); this.pursue(); }
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
      if (this.gap(a, b) <= 3) { a.contacts.push(b); b.contacts.push(a); }
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
      else goal = { x: tg.x, y: tg.y };
    }
    if (u.order.kind === 'none' && u.stance === 'aggressive' && !engaged) {
      const n = this.nearestEnemy(u, (e) => e.active);
      const aggro = t.cat === 'ranged' ? t.range * 1.25 : 60;
      const leashed = u.side === 'rome' && u.post, lim = u.leash + (t.cat === 'ranged' ? t.range * 0.5 : 0);
      const inReach = n && n.gap < aggro && (!leashed || Math.hypot(n.e.x - u.post.x, n.e.y - u.post.y) < lim + aggro);
      if (inReach) {
        if (t.cat === 'ranged' && n.gap <= t.range * 0.85 && u.ammo > 0) this.turnToward(u, n.e, dt);
        else goal = { x: n.e.x, y: n.e.y };
      } else {
        if (leashed && Math.hypot(u.x - u.post.x, u.y - u.post.y) > 14) goal = { x: u.post.x, y: u.post.y };   // return to the post
        else if (n && n.gap < 150) this.turnToward(u, n.e, dt, 0.5);
      }
    }

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
      // face the nearest live contact
      const c = u.contacts.filter(e => e.active).sort((a, b) => this.gap(u, a) - this.gap(u, b))[0];
      if (c) this.turnToward(u, c, dt);
    }
    u.fighting = (engaged && (!breakoff || u.blocked)) || pursuit && !breakoff;
    if (u.fighting) u.state = 'fighting';
    // fatigue
    if (u.fighting) u.fatigue = Math.min(100, u.fatigue + 0.9 * dt);
    else if (u.state === 'moving') u.fatigue = Math.min(100, u.fatigue + 0.45 * dt);
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
    const h = Math.atan2(dy / dd, dx / dd);
    u.f = h;
    const sp = this.speedOf(u) * 1.15;
    u.x += Math.cos(h) * sp * dt; u.y += Math.sin(h) * sp * dt;
    u.state = 'routing';
    // recover
    const safe = !n || n.gap > 140;
    if (safe) u.morale += 3 * dt * (u.side === 'rome' ? (this.inCommand(u) ? 1.3 : 0.6) : 1);
    if (u.morale > u.maxMorale * 0.55 && safe && u.x > 0 && u.x < WORLD.w && u.y > 0 && u.y < WORLD.h) this.rallyUnit(u);   // rallied units walk back to their post
    if (u.x < -60 || u.x > WORLD.w + 60 || u.y < -60 || u.y > WORLD.h + 60) { u.state = 'gone'; u.fled = true; }
  }

  speedOf(u) {
    const tr = this.terr(u);
    const terr = u.type.cat === 'cav' ? tr.cav : tr.speed;
    return u.type.speed * terr * (1 - u.fatigue / 250) * (u.formation === 'close' ? 0.55 : u.formation === 'orb' ? 0.4 : 1);
  }
  turnTo(u, ang, dt) { const diff = norm(ang - u.f), m = u.type.turn * dt; u.f = norm(u.f + clamp(diff, -m, m)); }
  turnToward(u, e, dt, k = 1) { const ang = Math.atan2(e.y - u.y, e.x - u.x); const diff = norm(ang - u.f), m = u.type.turn * (0.7 + u.drill / 200) * dt * k; u.f = norm(u.f + clamp(diff, -m, m)); }

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
    u.f = norm(u.f + clamp(diff, -m, m));
    const ad = Math.abs(norm(h - u.f));
    const align = ad < 0.6 ? 1 : ad < 1.5 ? 0.4 : 0.12;
    u.passing = this.overlapsFriend(u, Math.cos(h), Math.sin(h));          // marching through friendly units is slow going
    const sp = this.speedOf(u) * speedMul * align * (u.passing ? PASS_SPEED : 1);
    const step = Math.min(dist, sp * dt);
    const nx = u.x + Math.cos(h) * step, ny = u.y + Math.sin(h) * step;
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

  hit(att, def, n, ranged = false) {
    n = Math.min(n, def.men);
    if (n <= 0) return;
    if (ranged && att.side === 'rome') this.stats.rangedKills += n;
    def.men -= n; def.casualties += n; att.kills += n; def.flash = 0.22; def.floatAcc = (def.floatAcc || 0) + n;
    let loss = n / def.maxMen * 130 * def.type.fragile * (ranged ? 0.55 : 1);
    if (def.officer) loss *= 1 - 0.04 * (def.officer.tactics || 0);
    if (def.perks.includes('steadfast')) loss *= 0.8;
    if (hillOf(this, def)) loss *= 0.85;                       // men on high ground hold their nerve
    if (def.lvl >= 2) loss *= 0.9;
    def.moralePending += loss;
    def.bodyAcc += n / def.type.perDot;
    while (def.bodyAcc >= 1) {
      def.bodyAcc -= 1;
      const lat = (this.rand() - 0.5) * def.w, dep = (this.rand() - 0.5) * def.d;
      const c = Math.cos(def.f), sn = Math.sin(def.f);
      if (this.bodies.length < 1800) this.bodies.push({ x: def.x + c * dep - sn * lat, y: def.y + sn * dep + c * lat, side: def.side });
    }
    if (def.men <= 0) { def.men = 0; def.state = 'dead'; this.say(`${def.name} is annihilated.`, def.side === 'rome' ? 'bad' : 'good'); }
  }

  combat(u, dt) {
    const t = u.type;
    if (u.state === 'routing') return;
    // ranged fire
    if (t.range && u.ammo > 0 && !u.contacts.some(e => e.active) && (u.state !== 'moving' || u.order.kind === 'none')) {
      let tgt = u.order.kind === 'attack' ? this.byId(u.order.targetId) : null;
      if (!tgt || !tgt.active || this.gap(u, tgt) > t.range) { const n = this.nearestEnemy(u); tgt = n && n.gap <= t.range ? n.e : null; }
      if (tgt) {
        const g = this.gap(u, tgt);
        u.shooting = true;
        const am = this.angleMult(u, tgt).c;
        const prot = this.defOf(tgt, am === 1) * (tgt.formation === 'close' && am === 1 ? 2.2 : tgt.formation === 'orb' ? 1.2 : 0.6);
        const falloff = 1 - 0.4 * clamp(g / t.range, 0, 1);
        u.fireAcc += u.men * t.rate * dt * (this.atkMult(u) / COMBAT_PACE) * RANGED_PACE * falloff * (1 - Math.min(0.9, prot)) * (this.terr(tgt).kind === 'forest' ? 0.6 : 1) * (1 + 0.12 * (hillOf(this, u) - hillOf(this, tgt)));
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
        this.hit(u, n.e, kills); n.e.moralePending += 3; n.e.disrupted = 6;
        for (let i = 0; i < 8; i++) this.fx.push({ x1: u.x + (this.rand() - 0.5) * u.w, y1: u.y, x2: n.e.x + (this.rand() - 0.5) * n.e.w, y2: n.e.y + (this.rand() - 0.5) * n.e.d, life: 0.45, max: 0.45, kind: 'pilum' });
        if (u.side === 'rome') this.say(`${u.name} hurls its pila!`, 'info');
      }
    }
    // melee
    if (!u.fighting || !u.contacts.length) return;
    const targets = u.contacts.filter(e => e.present);
    if (!targets.length) return;
    const fighters = Math.min(u.men, u.front * 2.4) * (t.cat === 'ranged' ? 0.5 : 1);
    const share = fighters / targets.length;
    const am = this.atkMult(u);
    for (const e of targets) {
      const ang = this.angleMult(u, e);
      // impact on new contact
      if (!u.prevIds.has(e.id) && e.state !== 'routing' && u.runT > 1.2 && t.charge > 0.3) {
        let imp = u.men * t.charge * 0.035 * ang.m * (u.disrupted > 0 ? 0.5 : 1) * (u.perks.includes('shock') ? 1.25 : 1);
        imp *= e.formation === 'close' && ang.c === 1 ? 0.7 : 1;
        imp *= 1 - (e.type.antiCharge || 0) * (e.state === 'idle' || e.stance === 'hold' ? 1 : 0.4);
        imp *= this.terr(e).def;
        imp *= 1 + 0.2 * (hillOf(this, u) - hillOf(this, e));        // charging downhill hits harder, uphill softer
        if (u.morale < u.maxMorale * 0.5 || u.fatigue > 60) {        // spent or shaken men cannot deliver a charge
          imp *= 0.4; u.disrupted = Math.max(u.disrupted, 3);
          if (u.side === 'rome' && !u.notedFalter) { u.notedFalter = true; this.say(`${u.name}'s charge falters - the men are spent.`, 'warn'); }
        } else u.notedFalter = false;
        if (!this.inCommand(u)) imp *= 0.7;                          // out of the general's sight, a charge goes in ragged
        this.hit(u, e, Math.round(imp));
        e.moralePending += t.charge * 3 * ang.m;
        if (u.side === 'gaul' && e.side === 'rome' && imp > 8) this.say(`${u.name} crashes into ${e.name}!`, 'warn');
        u.runT = 0;
      }
      const routingMult = e.state === 'routing' ? (t.cat === 'cav' ? 2.2 : 1.6) : 1;
      const def = e.state === 'routing' ? 0 : this.defOf(e, ang.c === 1);
      // head-on is a grind; flank and rear hits are decisive; a unit hit from the side or behind, or surrounded, fights back less
      const pressed = u.surrounded ? 0.7 : 1 - 0.15 * Math.min(3, u.flanked || 0);
      const room = ang.c === 1 ? Math.min(1, 2 / Math.max(1, e.frontCount || 1)) : 1;   // only so many men can fight on one front
      u.pending += share * t.atk * dt * am * ang.g * room * pressed * (1 - def) * routingMult * this.terr(e).def;
      if (ang.c > 1 && e.state !== 'routing') e.morale -= (ang.c === 3 ? REAR_MORALE : FLANK_MORALE) * dt / targets.length;
      if (u.side === 'rome' && ang.c > 1 && e.state !== 'routing') this.stats[ang.c === 3 ? 'rearTime' : 'flankTime'] += dt / targets.length;
    }
    // allocate the accumulated kills across targets evenly
    while (u.pending >= 1) {
      u.pending -= 1;
      const e = targets[Math.floor(this.rand() * targets.length)];
      this.hit(u, e, 1);
    }
  }

  applyDamage(u, dt) {
    if (u.flash > 0) u.flash -= dt;
    u.floatCd = (u.floatCd || 0) - dt;
    if (u.floatAcc >= 2 && u.floatCd <= 0) {
      this.floats.push({ x: u.x + (this.rand() - 0.5) * u.w * 0.6, y: u.y - 4, text: '-' + Math.round(u.floatAcc), side: u.side, life: 1.5, max: 1.5 });
      u.floatAcc = 0; u.floatCd = 0.9;
    }
    if (u.surrounded && u.state !== 'routing') u.morale -= SURROUND_MORALE * dt;
    if (u.moralePending > 0) {
      u.morale -= u.moralePending; u.moralePending = 0;
    }
    u.updateDims();
    if (u.state === 'dead' || u.state === 'gone') return;
    if (u.state !== 'routing') {
      if (!u.contacts.some(e => e.active)) u.morale = Math.min(u.maxMorale, u.morale + (2.2 + (u.officer ? 0.35 * (u.officer.tactics || 0) : 0) + (u.perks.includes('inspire') ? 1.1 : 0)) * dt * (u.side === 'rome' ? (this.inCommand(u) ? 1.2 : 0.45) : 1));
      if (u.morale <= Math.max(12, u.maxMorale * 0.2)) {
        u.state = 'routing'; u.order = { kind: 'none' }; this.stats.routs[u.side]++;
        this.say(`${u.name} breaks and flees!`, u.side === 'rome' ? 'bad' : 'good');
        for (const o of this.units) {
          if (!o.active || o === u) continue;
          if (Math.hypot(o.x - u.x, o.y - u.y) < 170) o.morale += o.side === u.side ? -4 : 3;   // a rout shakes its neighbours, but does not guarantee a cascade
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
        this.say(side === 'rome' ? 'Your army wavers - the line is cracking!' : 'The Gallic host wavers!', side === 'rome' ? 'bad' : 'good');
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
    const rewardMult = (this.scn.rewardMult || 1) * dm.reward;
    this.result = {
      outcome, time: this.t, rows, enemyDead, enemyStart,
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
