// Pure battle simulation (no DOM). Real-time; the UI drives update(dt) and may pause.
import { UNIT_TYPES, WORLD, XP_LEVELS, DIFFICULTY, terrainAt } from './data.js';

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
const COMBAT_PACE = 0.68;
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
    this.maxMorale = this.type.morale + this.lvl * 3 + this.drill * 0.12 + (spec.moraleBonus || 0);
    const cond = spec.condition ?? 100;
    this.morale = this.maxMorale * (0.88 + 0.12 * cond / 100);
    this.fatigue = (100 - cond) * 0.4;
    this.state = 'idle';
    this.order = { kind: 'none' };
    this.stance = spec.stance || 'aggressive';
    this.formation = 'normal';
    this.ai = spec.ai || null;
    this.contacts = []; this.prevIds = new Set();
    this.pending = 0; this.moralePending = 0; this.bodyAcc = 0;
    this.pilumLeft = this.type.pilum || 0; this.pilumCd = 0;
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
    this.retreating = false; this.broken = { rome: false, gaul: false };
    this.reinf = (scn.reinforcements || []).map(r => ({ ...r, done: false }));
    this.fortLevel = opts.fort || 0;
    this.favour = opts.favour || 0;
    // enemy strength modifiers: difficulty + local favour (informants and divided tribes)
    const favMult = this.favour >= 2 ? 0.9 : this.favour <= -2 ? 1.1 : 1;
    this.enemyScale = this.diff.enemyMult * favMult;
    const rb = this.diff.romeMorale + Math.min(8, this.fortLevel * 2) + (opts.suppliesLow ? -8 : 0);
    for (const s of romeSpecs) this.units.push(new Unit({ ...s, side: 'rome', moraleBonus: rb }));
    for (const e of scn.enemy) this.spawnEnemy(e);
    this.startRome = this.sumMen('rome'); this.startGaul = this.sumMen('gaul');
    this.say('Your army deploys. Press SPACE to begin the battle; you may issue orders while paused.', 'info');
  }

  spawnEnemy(e) {
    const men = Math.round(e.men * this.enemyScale);
    this.units.push(new Unit({ side: 'gaul', type: e.type, men, x: e.x, y: e.y, ai: { ...e.ai }, moraleBonus: this.diff.enemyMorale, xp: 40 + (this.diff.enemyMult > 1 ? 60 : 0) }));
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
    const dx = att.x - def.x, dy = att.y - def.y, d = Math.hypot(dx, dy) || 1;
    const c = (dx * Math.cos(def.f) + dy * Math.sin(def.f)) / d;
    return c > 0.6 ? { m: 1, c: 1 } : c > -0.35 ? { m: 1.4, c: 2 } : { m: 1.9, c: 3 };
  }

  // ---------- orders ----------
  setMove(u, x, y, tf = null) { if (!u.active) return; u.order = { kind: 'move', x, y, tf }; u.stance = 'aggressive'; }
  setAttack(u, tgt) { if (!u.active) return; u.order = { kind: 'attack', targetId: tgt.id }; u.stance = 'aggressive'; }
  setHold(u) { if (!u.active) return; u.order = { kind: 'none' }; u.stance = 'hold'; }
  toggleFormation(u) {
    if (!u.active || u.type.cat === 'cav') return;
    u.formation = u.formation === 'close' ? 'normal' : 'close';
    if (u.type.cat === 'ranged') u.formation = 'normal';
    u.updateDims();
  }
  retreatAll() {
    if (this.retreating || this.result) return;
    this.retreating = true;
    for (const u of this.units) if (u.side === 'rome' && u.active) u.order = { kind: 'retreat' };
    this.say('The signal to withdraw is sounded!', 'warn');
  }

  // ---------- AI ----------
  aiThink() {
    for (const u of this.units) {
      if (u.side !== 'gaul' || !u.active || !u.ai) continue;
      const ai = u.ai;
      const near = this.nearestEnemy(u);
      if (!near) continue;
      if (ai.kind === 'ambush') {
        if (near.gap < ai.trigger || this.t > ai.maxDelay) { ai.kind = 'rush'; ai.delay = this.t + 1 + this.rand() * 3; if (!u.alerted) { u.alerted = true; this.say('A Gallic warband bursts from the treeline!', 'warn'); } }
      } else if (ai.kind === 'rush') {
        if (this.t < ai.delay) continue;
        const cur = u.order.kind === 'attack' ? this.byId(u.order.targetId) : null;
        if (!cur || !cur.active) this.setAttack(u, this.pickTarget(u));
      } else if (ai.kind === 'skirm') {
        const tgt = near.e;
        if (u.ammo <= 0) { ai.kind = 'rush'; ai.delay = 0; continue; }
        if (near.gap < 38 && tgt.type.cat !== 'ranged') {
          const dx = u.x - tgt.x, dy = u.y - tgt.y, d = Math.hypot(dx, dy) || 1;
          this.setMove(u, clamp(u.x + dx / d * 90, 20, WORLD.w - 20), clamp(u.y + dy / d * 90, 20, WORLD.h - 20));
        } else if (near.gap > u.type.range * 0.9) this.setMove(u, tgt.x, tgt.y);
        else u.order = { kind: 'none' };
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
    for (const r of this.reinf) if (!r.done && this.t >= r.at) { r.done = true; this.spawnEnemy(r.unit); this.startGaul += Math.round(r.unit.men * this.enemyScale); this.say(r.msg, 'warn'); }
    this._ai = (this._ai || 0) + dt;
    if (this._ai >= 0.4) { this._ai = 0; this.aiThink(); }
    this.computeContacts();
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

  stepUnit(u, dt) {
    const t = u.type, W = WORLD.w, H = WORLD.h;
    u.blocked = false; u.fighting = false; u.shooting = false;
    if (u.pilumCd > 0) u.pilumCd -= dt;
    if (u.disrupted > 0) u.disrupted -= dt;
    if (u.state === 'routing') return this.stepRout(u, dt);
    const engaged = u.contacts.some(e => e.active);
    const pursuit = !engaged && u.contacts.length > 0;
    let goal = null, speedMul = 1, breakoff = false;

    if (u.order.kind === 'retreat') goal = { x: u.x, y: H + 90 };
    else if (u.order.kind === 'move') {
      const dx = u.order.x - u.x, dy = u.order.y - u.y;
      if (Math.hypot(dx, dy) < 4) {
        if (u.order.tf != null) this.turnTo(u, u.order.tf, dt);
        if (u.order.targetId == null || Math.abs(norm(u.order.tf ?? u.f) - u.f) < 0.05) { if (u.order.targetId == null) u.order = { kind: 'none' }; }
      } else goal = { x: u.order.x, y: u.order.y };
    } else if (u.order.kind === 'attack') {
      const tg = this.byId(u.order.targetId);
      if (!tg || !tg.present) u.order = { kind: 'none' };
      else if (t.cat === 'ranged' && tg.active && this.gap(u, tg) <= t.range * 0.85 && u.ammo > 0) { this.turnToward(u, tg, dt); }
      else goal = { x: tg.x, y: tg.y };
    }
    if (u.order.kind === 'none' && u.stance === 'aggressive' && !engaged) {
      const n = this.nearestEnemy(u, (e) => e.active);
      const aggro = t.cat === 'ranged' ? t.range * 1.25 : 60;
      if (n && n.gap < aggro) {
        if (t.cat === 'ranged' && n.gap <= t.range * 0.85 && u.ammo > 0) this.turnToward(u, n.e, dt);
        else goal = { x: n.e.x, y: n.e.y };
      } else if (n && n.gap < 150) this.turnToward(u, n.e, dt, 0.5);
    }

    if (engaged) {
      // fight unless deliberately breaking off
      const away = goal && (u.order.kind === 'move' || u.order.kind === 'retreat') && Math.hypot(goal.x - u.x, goal.y - u.y) > 15;
      if (away) breakoff = true; else { goal = null; }
    }
    if (goal && !(t.cat === 'ranged' && u.order.kind === 'none' && u.shooting)) {
      const moved = this.moveToward(u, goal.x, goal.y, dt, speedMul);
      u.state = 'moving';
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
    if (u.fighting) u.fatigue = Math.min(100, u.fatigue + 1.3 * dt);
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
    if (safe) u.morale += 3 * dt;
    if (u.morale > u.maxMorale * 0.55 && safe && u.x > 0 && u.x < WORLD.w && u.y > 0 && u.y < WORLD.h) {
      u.state = 'idle'; u.order = { kind: 'none' }; u.stance = 'hold'; u.fatigue = Math.max(u.fatigue, 40);
      this.say(`${u.name} rallies!`, u.side === 'rome' ? 'good' : 'info');
      if (u.ai) u.ai.kind = 'rush';
    }
    if (u.x < -60 || u.x > WORLD.w + 60 || u.y < -60 || u.y > WORLD.h + 60) { u.state = 'gone'; u.fled = true; }
  }

  speedOf(u) {
    const tr = this.terr(u);
    const terr = u.type.cat === 'cav' ? tr.cav : tr.speed;
    return u.type.speed * terr * (1 - u.fatigue / 250) * (u.formation === 'close' ? 0.55 : 1);
  }
  turnTo(u, ang, dt) { const diff = norm(ang - u.f), m = u.type.turn * dt; u.f = norm(u.f + clamp(diff, -m, m)); }
  turnToward(u, e, dt, k = 1) { const ang = Math.atan2(e.y - u.y, e.x - u.x); const diff = norm(ang - u.f), m = u.type.turn * (0.7 + u.drill / 200) * dt * k; u.f = norm(u.f + clamp(diff, -m, m)); }

  moveToward(u, tx, ty, dt, speedMul) {
    const dx = tx - u.x, dy = ty - u.y, dist = Math.hypot(dx, dy);
    if (dist < 0.5) return 0;
    const h = Math.atan2(dy, dx), diff = norm(h - u.f);
    const m = u.type.turn * (0.7 + u.drill / 200) * dt;
    u.f = norm(u.f + clamp(diff, -m, m));
    const ad = Math.abs(norm(h - u.f));
    const align = ad < 0.6 ? 1 : ad < 1.5 ? 0.4 : 0.12;
    const sp = this.speedOf(u) * speedMul * align;
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
    const us = this.units.filter(u => u.present && u.state !== 'routing');
    for (let i = 0; i < us.length; i++) for (let j = i + 1; j < us.length; j++) {
      const a = us[i], b = us[j];
      if (a.side !== b.side) continue;
      if (Math.abs(a.x - b.x) > 110 || Math.abs(a.y - b.y) > 110) continue;
      const g = this.gap(a, b);
      if (g < 0) {
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
        const push = Math.min(-g / 2, 25 * dt);
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
    return COMBAT_PACE * (1 + 0.07 * u.lvl) * (1 + 0.12 * u.drill / 100) * moraleF * (1 - u.fatigue / 200) * off * terr * (u.formation === 'close' ? 0.6 : 1);
  }
  defOf(e, frontal) {
    let d = e.type.def + e.lvl * 0.01;
    if (e.formation === 'close' && frontal) d += 0.2;
    return Math.min(0.88, d) ;
  }

  hit(att, def, n, ranged = false) {
    n = Math.min(n, def.men);
    if (n <= 0) return;
    def.men -= n; def.casualties += n; att.kills += n;
    let loss = n / def.maxMen * 130 * def.type.fragile * (ranged ? 0.55 : 1);
    if (def.officer) loss *= 1 - 0.04 * (def.officer.tactics || 0);
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
        const prot = this.defOf(tgt, am === 1) * (tgt.formation === 'close' && am === 1 ? 2.2 : 0.6);
        const falloff = 1 - 0.4 * clamp(g / t.range, 0, 1);
        u.fireAcc += u.men * t.rate * dt * this.atkMult(u) * falloff * (1 - Math.min(0.9, prot)) * (this.terr(tgt).kind === 'forest' ? 0.6 : 1);
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
        u.pilumLeft--; u.pilumCd = 3;
        const ang = this.angleMult(u, n.e);
        const kills = Math.round(u.men * 0.05 * (this.atkMult(u) / COMBAT_PACE) * (1 - n.e.type.def * 0.5) * (n.e.formation === 'close' ? 0.5 : 1));
        this.hit(u, n.e, kills); n.e.moralePending += 4; n.e.disrupted = 6;
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
        let imp = u.men * t.charge * 0.035 * ang.m * (u.disrupted > 0 ? 0.5 : 1);
        imp *= e.formation === 'close' && ang.c === 1 ? 0.7 : 1;
        imp *= 1 - (e.type.antiCharge || 0) * (e.state === 'idle' || e.stance === 'hold' ? 1 : 0.4);
        imp *= this.terr(e).def;
        this.hit(u, e, Math.round(imp));
        e.moralePending += t.charge * 5 * ang.m;
        if (u.side === 'gaul' && e.side === 'rome' && imp > 8) this.say(`${u.name} crashes into ${e.name}!`, 'warn');
        u.runT = 0;
      }
      const routingMult = e.state === 'routing' ? 1.6 : 1;
      const def = e.state === 'routing' ? 0 : this.defOf(e, ang.c === 1);
      u.pending += share * t.atk * dt * am * (1 - def) * routingMult * this.terr(e).def;
      if (ang.c > 1 && e.state !== 'routing') e.morale -= (ang.c === 3 ? 4 : 2) * dt / targets.length;
    }
    // allocate the accumulated kills across targets evenly
    while (u.pending >= 1) {
      u.pending -= 1;
      const e = targets[Math.floor(this.rand() * targets.length)];
      this.hit(u, e, 1);
    }
  }

  applyDamage(u, dt) {
    if (u.moralePending > 0) {
      u.morale -= u.moralePending; u.moralePending = 0;
    }
    u.updateDims();
    if (u.state === 'dead' || u.state === 'gone') return;
    if (u.state !== 'routing') {
      if (!u.contacts.some(e => e.active)) u.morale = Math.min(u.maxMorale, u.morale + (1.6 + (u.officer ? 0.35 * (u.officer.tactics || 0) : 0)) * dt);
      if (u.morale <= Math.max(14, u.maxMorale * 0.22)) {
        u.state = 'routing'; u.order = { kind: 'none' };
        this.say(`${u.name} breaks and flees!`, u.side === 'rome' ? 'bad' : 'good');
        for (const o of this.units) {
          if (!o.active || o === u) continue;
          if (Math.hypot(o.x - u.x, o.y - u.y) < 220) o.morale += o.side === u.side ? -10 : 5;
        }
      }
    }
  }

  armyMorale() {
    for (const side of ['rome', 'gaul']) {
      if (this.broken[side]) continue;
      const start = side === 'rome' ? this.startRome : this.startGaul;
      if (this.activeMen(side) < start * 0.4) {
        this.broken[side] = true;
        for (const u of this.units) if (u.side === side && u.active) u.morale -= 12;
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
    if (gaulActive < this.startGaul * 0.25 && !this.reinf.some(r => !r.done)) {
      for (const u of this.units) if (u.side === 'gaul' && u.active) { u.state = 'routing'; }
      this.say('The Gallic host is broken. Victory!', 'good'); return finish('victory', 4);
    }
    if (!this.retreating && (romeActive < this.startRome * 0.2 || !this.units.some(u => u.side === 'rome' && u.active))) {
      this.say('Your army is shattered.', 'bad'); return finish('defeat', 3);
    }
    if (this.retreating && !this.units.some(u => u.side === 'rome' && u.present && u.state !== 'routing')) {
      return finish(this.preserved() >= this.startRome * 0.45 ? 'draw' : 'defeat', 1);
    }
    if (this.t >= this.scn.timeLimit) {
      this.say('Night falls and both sides disengage.', 'info');
      return finish(this.preserved() >= this.startRome * 0.45 && gaulActive > this.startGaul * 0.25 ? 'draw' : 'defeat', 1);
    }
    if (!romeInField) finish(this.retreating && this.preserved() >= this.startRome * 0.45 ? 'draw' : 'defeat', 1);
  }
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
      const recovered = Math.round(Math.max(0, casualties - 0) * (outcome === 'defeat' ? 0.1 : 0.22));
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
