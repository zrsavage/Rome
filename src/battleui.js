// Battle screen controller: input, HUD, fixed-step loop around the pure Battle sim.
import { Battle, levelFor } from './sim.js';
import { Renderer } from './render.js';
import { WORLD, LEVEL_NAMES } from './data.js';

const $ = (id) => document.getElementById(id);

export class BattleUI {
  constructor() {
    this.canvas = $('canvas'); this.r = new Renderer(this.canvas);
    this.b = null; this.paused = true; this.speed = 1; this.running = false; this.keys = new Set();
    this.onEnd = null; this.ended = false; this.logShown = 0;
    this.bindInput();
    window.addEventListener('resize', () => { if (this.running) this.r.resize(); });
  }

  start(scn, specs, opts, onEnd) {
    this.scn = scn; this.b = new Battle(scn, specs, opts); this.onEnd = onEnd; this.ended = false;
    this.paused = true; this.speed = 1; this.r.selection.clear(); this.logShown = 0; this.running = true;
    $('hud-title').textContent = scn.name;
    $('hud-log').innerHTML = '';
    this.r.buildBackground(scn); this.r.fit();
    this.refreshBottom(); this.setPause(true); this.setSpeed(1);
    $('btn-retreat').disabled = false;
    this.showBanner('DEPLOYMENT - press SPACE', 2500);
    this.last = performance.now(); this.acc = 0; this.hudT = 0;
    if (!this.raf) this.raf = requestAnimationFrame((t) => this.frame(t));
  }
  stop() { this.running = false; cancelAnimationFrame(this.raf); this.raf = null; }

  setPause(p) { this.paused = p; $('btn-pause').textContent = p ? 'Resume (Space)' : 'Pause (Space)'; }
  setSpeed(s) { this.speed = s; document.querySelectorAll('.spd').forEach(b => b.classList.toggle('on', +b.dataset.s === s)); }
  showBanner(t, ms) { const b = $('banner'); b.textContent = t; b.classList.remove('hidden'); clearTimeout(this._bt); this._bt = setTimeout(() => b.classList.add('hidden'), ms); }

  frame(now) {
    if (!this.running) { this.raf = null; return; }
    const real = Math.min(0.1, (now - this.last) / 1000); this.last = now;
    if (!this.paused && !this.b.result) {
      this.acc += real * this.speed;
      let n = 0;
      while (this.acc >= 0.05 && n++ < 24) { this.b.update(0.05); this.acc -= 0.05; }
    }
    this.pan(real);
    this.r.draw(this.b);
    this.hudT += real;
    if (this.hudT > 0.15) { this.hudT = 0; this.refreshHud(); }
    if (this.b.result && !this.ended) { this.ended = true; this.setPause(true); this.showBanner(this.b.result.outcome.toUpperCase(), 2200); setTimeout(() => this.onEnd && this.onEnd(this.b.result), 2300); }
    this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  pan(dt) {
    const k = this.keys, sp = 600 / this.r.cam.zoom * dt;
    if (k.has('a') || k.has('arrowleft')) this.r.cam.x -= sp;
    if (k.has('d') || k.has('arrowright')) this.r.cam.x += sp;
    if (k.has('w') || k.has('arrowup')) this.r.cam.y -= sp;
    if (k.has('s') || k.has('arrowdown')) this.r.cam.y += sp;
    if (k.size) this.r.clampCam();
  }

  // ----- selection / orders -----
  selected() { return [...this.r.selection].map(id => this.b.byId(id)).filter(u => u && u.active && u.side === 'rome'); }
  select(ids, add = false) { if (!add) this.r.selection.clear(); ids.forEach(i => this.r.selection.add(i)); this.refreshBottom(); this.refreshHud(); }

  issueMove(wx, wy, drag) {
    const us = this.selected(); if (!us.length) return;
    const b = this.b;
    let mx = 0, my = 0, fx = 0, fy = 0;
    us.forEach(u => { mx += u.x; my += u.y; fx += Math.cos(u.f); fy += Math.sin(u.f); });
    mx /= us.length; my /= us.length;
    let ang, pts = [];
    us.sort((a, c) => (a.x - c.x));
    if (drag) {
      const dx = drag.x1 - drag.x0, dy = drag.y1 - drag.y0, L = Math.hypot(dx, dy) || 1;
      let nx = -dy / L, ny = dx / L;
      if (nx * fx + ny * fy < 0) { nx = -nx; ny = -ny; }
      ang = Math.atan2(ny, nx);
      us.forEach((u, i) => { const t = us.length === 1 ? 0.5 : i / (us.length - 1); pts.push({ x: drag.x0 + dx * t, y: drag.y0 + dy * t }); });
      if (us.length === 1) pts[0] = { x: (drag.x0 + drag.x1) / 2, y: (drag.y0 + drag.y1) / 2 };
    } else {
      const dx = wx - mx, dy = wy - my, d = Math.hypot(dx, dy);
      ang = d > 30 ? Math.atan2(dy, dx) : Math.atan2(fy, fx);
      const px = -Math.sin(ang), py = Math.cos(ang), gap = 14;
      let total = us.reduce((a, u) => a + u.w + gap, -gap), off = -total / 2;
      us.forEach(u => { off += u.w / 2; pts.push({ x: wx + px * off, y: wy + py * off }); off += u.w / 2 + gap; });
    }
    us.forEach((u, i) => b.setMove(u, Math.max(8, Math.min(WORLD.w - 8, pts[i].x)), Math.max(8, Math.min(WORLD.h - 8, pts[i].y)), ang));
  }
  issueAttack(target) { this.selected().forEach(u => this.b.setAttack(u, target)); }

  bindInput() {
    const c = this.canvas; let left = null, right = null;
    const pos = (e) => { const r = c.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    c.addEventListener('contextmenu', e => e.preventDefault());
    c.addEventListener('mousedown', (e) => {
      if (!this.b) return; const p = pos(e);
      if (e.button === 0) left = { ...p, shift: e.shiftKey };
      else if (e.button === 2) right = { ...p };
      else if (e.button === 1) { this.pd = { ...p, cx: this.r.cam.x, cy: this.r.cam.y }; e.preventDefault(); }
    });
    c.addEventListener('mousemove', (e) => {
      if (!this.b) return; const p = pos(e);
      const w = this.r.toWorld(p.x, p.y), hu = this.r.unitAt(this.b, w.x, w.y);
      this.r.hover = hu ? hu.id : null;
      c.style.cursor = hu && hu.side === 'gaul' && this.selected().length ? 'pointer' : 'crosshair';
      if (left && (Math.abs(p.x - left.x) > 6 || Math.abs(p.y - left.y) > 6)) this.r.box = { x0: left.x, y0: left.y, x1: p.x, y1: p.y };
      if (right && Math.hypot(p.x - right.x, p.y - right.y) > 14) { const a = this.r.toWorld(right.x, right.y); this.r.dragLine = { x0: a.x, y0: a.y, x1: w.x, y1: w.y }; }
      if (this.pd) { this.r.cam.x = this.pd.cx - (p.x - this.pd.x) / this.r.cam.zoom; this.r.cam.y = this.pd.cy - (p.y - this.pd.y) / this.r.cam.zoom; this.r.clampCam(); }
    });
    window.addEventListener('mouseup', (e) => {
      if (!this.b || !this.running) return; const p = pos(e), w = this.r.toWorld(p.x, p.y);
      if (e.button === 0 && left) {
        if (this.r.box) {
          const b = this.r.box, x0 = Math.min(b.x0, b.x1), x1 = Math.max(b.x0, b.x1), y0 = Math.min(b.y0, b.y1), y1 = Math.max(b.y0, b.y1);
          const ids = this.b.units.filter(u => u.side === 'rome' && u.active).filter(u => { const s = this.r.toScreen(u.x, u.y); return s.x >= x0 && s.x <= x1 && s.y >= y0 && s.y <= y1; }).map(u => u.id);
          this.select(ids, left.shift);
        } else {
          const u = this.r.unitAt(this.b, w.x, w.y);
          if (u && u.side === 'rome') this.select([u.id], left.shift);
          else if (u) { this.inspect = u.id; this.refreshHud(); }
          else { this.inspect = null; this.select([], false); }
        }
        this.r.box = null; left = null;
      } else if (e.button === 2 && right) {
        const dl = this.r.dragLine;
        if (dl) this.issueMove(0, 0, dl);
        else {
          const u = this.r.unitAt(this.b, w.x, w.y);
          if (u && u.side === 'gaul') this.issueAttack(u); else this.issueMove(w.x, w.y, null);
        }
        this.r.dragLine = null; right = null;
      } else if (e.button === 1) this.pd = null;
    });
    c.addEventListener('wheel', (e) => {
      e.preventDefault(); const p = pos(e), before = this.r.toWorld(p.x, p.y);
      this.r.cam.zoom = Math.max(this.r.minZoom, Math.min(3, this.r.cam.zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
      const after = this.r.toWorld(p.x, p.y); this.r.cam.x += before.x - after.x; this.r.cam.y += before.y - after.y; this.r.clampCam();
    }, { passive: false });
    window.addEventListener('keydown', (e) => {
      if (!this.running) return; const k = e.key.toLowerCase();
      if (k === ' ') { e.preventDefault(); this.setPause(!this.paused); return; }
      if (k === '1') this.setSpeed(1); if (k === '2') this.setSpeed(2); if (k === '3') this.setSpeed(4);
      if (['a', 'w', 's', 'd', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(k) && !e.ctrlKey) this.keys.add(k);
      if (k === 'h') this.selected().forEach(u => { this.b.setHold(u); });
      if (k === 't') this.selected().forEach(u => this.b.toggleFormation(u));
      if (k === 'escape') this.select([]);
      if (k === 'q') this.select(this.b.units.filter(u => u.side === 'rome' && u.active).map(u => u.id));
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    $('btn-pause').onclick = () => this.setPause(!this.paused);
    document.querySelectorAll('.spd').forEach(b => b.onclick = () => this.setSpeed(+b.dataset.s));
    $('btn-help').onclick = () => $('hud-help').classList.toggle('hidden');
    $('btn-retreat').onclick = () => { if (this.b && confirm('Sound the retreat? You keep your surviving men and a partial reward only if you leave with at least 45% of your army.')) { this.b.retreatAll(); this.setPause(false); $('btn-retreat').disabled = true; } };
  }

  // ----- HUD -----
  refreshBottom() {
    const el = $('hud-bottom'); el.innerHTML = '';
    this.b.units.filter(u => u.side === 'rome').forEach(u => {
      const d = document.createElement('div'); d.className = 'ucard'; d.dataset.id = u.id;
      d.innerHTML = `<b></b><div class="bar x"><i></i></div><div class="bar m" style="margin-top:3px"><i></i></div>`;
      d.querySelector('b').textContent = u.name;
      d.onclick = (e) => this.select([u.id], e.shiftKey);
      el.appendChild(d);
    });
  }
  refreshHud() {
    const b = this.b; if (!b) return;
    const mm = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    $('hud-time').textContent = `${mm(b.t)} / ${mm(this.scn.timeLimit)}   Rome ${Math.round(b.activeMen('rome'))}   Foe ${Math.round(b.activeMen('gaul'))}`;
    document.querySelectorAll('.ucard').forEach(d => {
      const u = b.byId(+d.dataset.id); if (!u) return;
      d.classList.toggle('sel', this.r.selection.has(u.id)); d.classList.toggle('gone', !u.present);
      d.querySelector('.x i').style.width = Math.max(0, u.men / u.maxMen * 100) + '%';
      d.querySelector('.m i').style.width = Math.max(0, Math.min(100, u.morale / u.maxMorale * 100)) + '%';
      d.title = `${u.men} men` + (u.state === 'routing' ? ' (routing)' : u.state === 'gone' ? ' (withdrawn)' : '');
    });
    // log
    const lg = $('hud-log');
    while (this.logShown < b.log.length) {
      const m = b.log[this.logShown++], d = document.createElement('div'); d.className = m.kind; d.textContent = m.msg; lg.appendChild(d);
      while (lg.children.length > 7) lg.removeChild(lg.firstChild);
    }
    // left panel
    const sel = this.selected(), ins = this.inspect ? b.byId(this.inspect) : null;
    const u = sel.length === 1 ? sel[0] : (!sel.length && ins ? ins : null);
    const L = $('hud-left');
    if (!sel.length && !ins) { L.innerHTML = '<h3>No selection</h3><div class="muted">Click a cohort, or drag a box. Right-click to order. Press ? for controls.</div>'; return; }
    if (sel.length > 1) { L.innerHTML = `<h3>${sel.length} units selected</h3><div class="muted">Right-click to move in a line; right-drag to set a battle line and facing. H to hold, T for testudo.</div>`; return; }
    if (!u) return;
    const t = u.type, lvl = LEVEL_NAMES[u.lvl];
    const kv = (a, v) => `<div class="kv"><span>${a}</span><span>${v}</span></div>`;
    L.innerHTML = `<h3>${u.name}</h3><div class="muted">${t.blurb}</div>` +
      kv('Men', `${u.men} / ${u.maxMen}`) + kv('Morale', `${Math.round(u.morale)} / ${Math.round(u.maxMorale)}`) + kv('Fatigue', Math.round(u.fatigue) + '%') +
      kv('Experience', lvl) + kv('Drill', Math.round(u.drill)) +
      (u.side === 'rome' ? kv('Officer', u.officer ? `${u.officer.name} (T${u.officer.tactics})` : 'none') + kv('Stance', u.stance === 'hold' ? 'Hold' : 'Aggressive') + kv('Formation', u.formation === 'close' ? 'Close order' : 'Normal') : '') +
      (t.pilum ? kv('Pila volleys', u.pilumLeft) : '') + (t.range ? kv('Ammo', Math.max(0, Math.round(u.ammo / t.ammo * 100)) + '%') : '') +
      kv('State', u.state);
  }
}
