// Battle screen controller: input, HUD, fixed-step loop around the pure Battle sim.
import { Battle, levelFor } from './sim.js';
import { Renderer } from './render.js';
import { WORLD, LEVEL_NAMES } from './data.js';
import { artSrc } from './art.js';
import { ask } from './ui.js';

const $ = (id) => document.getElementById(id);

export class BattleUI {
  constructor() {
    this.canvas = $('canvas'); this.r = new Renderer(this.canvas);
    this.b = null; this.paused = true; this.speed = 1; this.running = false; this.keys = new Set();
    this.onEnd = null; this.ended = false; this.logShown = 0; this.groups = {}; this.listeners = []; this.frameHooks = [];
    this.bindInput();
    window.addEventListener('resize', () => { if (this.running) this.r.resize(); });
  }

  start(scn, specs, opts, onEnd) {
    this.scn = scn; this.b = new Battle(scn, specs, opts); this.onEnd = onEnd; this.ended = false;
    this.paused = true; this.speed = 1; this.r.selection.clear(); this.logShown = 0; this.running = true; this.groups = {}; this.listeners = []; this.frameHooks = []; this.r.markers = []; this.genSel = false; this.r.genSel = false;
    $('hud-title').textContent = scn.name;
    $('hud-log').innerHTML = '';
    this.r.buildBackground(scn); this.r.fit();
    { const rs = this.b.units.filter(u => u.side === 'rome'); if (rs.length) { this.r.cam.zoom = Math.max(this.r.minZoom, Math.min(0.9, this.r.cam.zoom * 3)); this.r.cam.x = rs.reduce((a, u) => a + u.x, 0) / rs.length; this.r.cam.y = rs.reduce((a, u) => a + u.y, 0) / rs.length - 160 / this.r.cam.zoom; this.r.clampCam(); } }
    this.refreshBottom(); this.setPause(true); this.setSpeed(1);
    $('help-orders').innerHTML = [['sprint', '<b>Shift+right-click</b> sprint / charge'], ['guard', '<b>right-click a friendly unit</b> to guard it'], ['testudo', '<b>T</b> testudo'], ['orbis', '<b>O</b> orbis (hollow square)'], ['relieve', '<b>Y</b> relieve a tired cohort'], ['pursue', '<b>P</b> cavalry pursue routers'], ['rally', '<b>F</b> rally the line']].filter(([id]) => this.b.orders.has(id)).map(x => x[1]).join(' &middot; ');
    $('btn-retreat').disabled = false;
    this.showBanner('DEPLOYMENT - press SPACE', 2500);
    this.last = performance.now(); this.acc = 0; this.hudT = 0;
    if (!this.raf) this.raf = requestAnimationFrame((t) => this.frame(t));
  }
  stop() { this.running = false; cancelAnimationFrame(this.raf); this.raf = null; }

  on(fn) { this.listeners.push(fn); }
  emit(name, data = {}) { for (const fn of this.listeners) fn(name, data); }
  setPause(p) { const was = this.paused; this.paused = p; if (was !== p) this.emit('pause', { paused: p }); $('btn-pause').textContent = p ? 'Resume (Space)' : 'Pause (Space)'; }
  stepSpeed(d) { const L = [0.5, 1, 2, 4], i = Math.max(0, Math.min(L.length - 1, L.indexOf(this.speed) + d)); this.setSpeed(L[i]); }
  callWave() { if (this.b && this.b.callNextWave()) { this.showBanner('Next wave called', 800); this.setPause(false); } }
  setSpeed(s) { this.speed = s; this.emit('speed', { speed: s }); document.querySelectorAll('.spd').forEach(b => b.classList.toggle('on', +b.dataset.s === s)); }
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
    for (const f of this.frameHooks) f(real);
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
  selectGeneral() { if (!this.b.general) return; this.r.selection.clear(); this.genSel = true; this.r.genSel = true; this.refreshBottom(); this.refreshHud(); this.emit('general-select'); }
  select(ids, add = false) { this.genSel = false; this.r.genSel = false; if (!add) this.r.selection.clear(); ids.forEach(i => this.r.selection.add(i)); this.refreshBottom(); this.refreshHud(); this.emit('select', { ids }); }

  issueMove(wx, wy, drag, ignore = false, sprint = false) {
    if (this.genSel && this.b.general) { const g = drag ? { x: (drag.x0 + drag.x1) / 2, y: (drag.y0 + drag.y1) / 2 } : { x: wx, y: wy }; this.b.moveGeneral(g.x, g.y); this.emit('general-move'); return; }
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
    us.forEach((u, i) => b.setMove(u, Math.max(8, Math.min(WORLD.w - 8, pts[i].x)), Math.max(8, Math.min(WORLD.h - 8, pts[i].y)), ang, ignore, sprint));
    this.emit('move', { drag: !!drag, count: us.length });
  }
  issueGuard(f) { const us = this.selected().filter(u => u !== f); let n = 0; us.forEach(u => { if (this.b.setGuard(u, f)) n++; }); if (n) { this.showBanner(`Guarding ${f.name}`, 800); this.emit('guard', { count: n }); } return n > 0; }
  issueAttack(target, sprint = false) { const us = this.selected(); us.forEach(u => this.b.setAttack(u, target, sprint)); if (us.length) this.emit('attack', { target: target.id, count: us.length }); }

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
          const u = this.r.unitAt(this.b, w.x, w.y), gn = this.b.general;
          if (gn && !u && Math.hypot(w.x - gn.x, w.y - gn.y) < 18) this.selectGeneral();
          else if (u && u.side === 'rome') this.select([u.id], left.shift);
          else if (u) { this.inspect = u.id; this.refreshHud(); }
          else { this.inspect = null; this.select([], false); }
        }
        this.r.box = null; left = null;
      } else if (e.button === 2 && right) {
        const dl = this.r.dragLine;
        if (dl) this.issueMove(0, 0, dl, e.ctrlKey, e.shiftKey);
        else {
          const u = this.r.unitAt(this.b, w.x, w.y);
          if (u && u.side === 'gaul' && !this.genSel) this.issueAttack(u, e.shiftKey);
          else if (u && u.side === 'rome' && !this.genSel && this.selected().length && !this.selected().includes(u) && this.b.orders.has('guard') && this.issueGuard(u)) { /* guard order given */ }
          else this.issueMove(w.x, w.y, null, e.ctrlKey, e.shiftKey);
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
      if (k === '-' || k === '_') this.stepSpeed(-1); if (k === '=' || k === '+') this.stepSpeed(1);
      if (k === 'n') this.callWave();
      if (k === 'z') this.setSpeed(1); if (k === 'x') this.setSpeed(2); if (k === 'c') this.setSpeed(4);
      if (k === 'v') { this.r.showRange = !this.r.showRange; this.emit('range', { on: this.r.showRange }); }
      if (/^[1-9]$/.test(k) && !e.altKey) this.controlGroup(+k, e.ctrlKey || e.metaKey);
      if (['a', 'w', 's', 'd', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(k) && !e.ctrlKey) this.keys.add(k);
      const keyCmd = { h: 'hold', g: 'defend', r: 'fallback', t: 'testudo', o: 'orbis', y: 'relieve', p: 'pursue', j: 'holdfire', f: 'rally' }[k];
      if (keyCmd && !e.ctrlKey && !e.metaKey) this.cmd(keyCmd);
      if (k === 'e') this.selectGeneral();
      if (k === 'escape') this.select([]);
      if (e.key === '?' || e.key === '/') $('hud-help').classList.toggle('hidden');
      if (k === 'q') this.select(this.b.units.filter(u => u.side === 'rome' && u.active).map(u => u.id));
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    $('btn-pause').onclick = () => this.setPause(!this.paused);
    $('btn-wave').onclick = () => this.callWave();
    document.querySelectorAll('.spd').forEach(b => b.onclick = () => this.setSpeed(+b.dataset.s));
    $('btn-help').onclick = () => $('hud-help').classList.toggle('hidden');
    $('btn-retreat').onclick = async () => {
      if (!this.b) return;
      const floor = Math.round(this.b.retreatFloor() * 100);
      if (await ask(`Sound the retreat? You keep your surviving men, and the withdrawal counts as a draw only if at least ${floor}% of your army gets away.`, 'Sound retreat', 'Keep fighting')) { this.b.retreatAll(); this.setPause(false); $('btn-retreat').disabled = true; }
    };
  }

  controlGroup(n, set) {
    if (set) { this.groups[n] = this.selected().map(u => u.id); this.showBanner(`Group ${n} set`, 700); this.refreshHud(); this.emit('group-set', { n }); return; }
    const ids = (this.groups[n] || []).filter(id => { const u = this.b.byId(id); return u && u.active; });
    if (!ids.length) return;
    const now = performance.now();
    if (this.lastGroup === n && now - this.lastGroupT < 450) { // double tap: centre camera
      const us = ids.map(id => this.b.byId(id)); this.r.cam.x = us.reduce((a, u) => a + u.x, 0) / us.length; this.r.cam.y = us.reduce((a, u) => a + u.y, 0) / us.length; this.r.clampCam();
    }
    this.lastGroup = n; this.lastGroupT = now; this.select(ids);
  }

  // One place for every unit command, used by both the keyboard and the command bar.
  cmd(name) {
    const b = this.b, sel = this.selected(), inf = sel.filter(u => u.type.cat === 'inf');
    const need = (id) => { if (b.orders.has(id)) return true; if (sel.length || id === 'rally') this.showBanner('You have not learned that order yet. Train it at camp.', 1400); return false; };
    switch (name) {
      case 'hold': sel.forEach(u => b.setHold(u)); if (sel.length) { this.emit('hold', { count: sel.length }); this.showBanner('Hold position', 600); } break;
      case 'defend': sel.forEach(u => b.setEngage(u)); if (sel.length) { this.emit('engage', { count: sel.length }); this.showBanner('Defend post', 600); } break;
      case 'fallback': sel.forEach(u => b.fallBack(u)); if (sel.length) this.emit('fallback', { count: sel.length }); break;
      case 'testudo': if (need('testudo') && inf.length) { inf.forEach(u => b.toggleFormation(u)); this.emit('formation', { count: inf.length }); } break;
      case 'orbis': if (need('orbis') && inf.length) { inf.forEach(u => b.toggleOrbis(u)); this.emit('formation', { count: inf.length }); } break;
      case 'relieve': if (need('relieve') && inf.length) inf.forEach(u => b.relieve(u)); break;
      case 'pursue': if (need('pursue')) sel.filter(u => u.type.cat === 'cav').forEach(u => b.pursue(u)); break;
      case 'holdfire': sel.filter(u => u.type.cat === 'ranged').forEach(u => b.toggleHoldFire(u)); if (sel.some(u => u.type.cat === 'ranged')) this.showBanner(sel.find(u => u.type.cat === 'ranged').holdFire ? 'Hold fire' : 'Fire at will', 700); break;
      case 'rally': if (!need('rally')) break; if (b.rallyCd > 0) this.showBanner(`The line was just rallied (${Math.ceil(b.rallyCd)}s)`, 900); else if (b.rally()) this.showBanner('Rally!', 700); break;
    }
    this.cmdSig = null;
  }
  // The command bar shows only what the selected units can do, and only orders the army has learned.
  refreshCmds() {
    const b = this.b, sel = this.selected(), el = $('hud-cmds');
    const has = (c) => sel.some(u => u.type.cat === c);
    const list = [['hold', 'Hold', 'H', true], ['defend', 'Defend post', 'G', true], ['fallback', 'Fall back', 'R', true],
      ['testudo', 'Testudo', 'T', b.orders.has('testudo') && has('inf')], ['orbis', 'Orbis', 'O', b.orders.has('orbis') && has('inf')], ['relieve', 'Relieve', 'Y', b.orders.has('relieve') && has('inf')],
      ['pursue', 'Pursue', 'P', b.orders.has('pursue') && has('cav')], ['holdfire', 'Hold fire', 'J', has('ranged')]]
      .filter(x => x[3]).map(x => ({ id: x[0], label: x[1], key: x[2] }));
    if (this.genSel && b.orders.has('rally')) list.push({ id: 'rally', label: 'Rally', key: 'F' });
    const sig = (sel.length || this.genSel ? list.map(x => x.id).join() : '') + '|' + sel.map(u => (u.holdFire ? 'f' : '') + u.formation + u.stance).join();
    if (sig === this.cmdSig) return; this.cmdSig = sig;
    el.innerHTML = ''; if (!sel.length && !this.genSel) return;
    for (const c of list) {
      const btn = document.createElement('button'); btn.className = 'cmd'; btn.innerHTML = `${c.label}<kbd>${c.key}</kbd>`;
      const on = (c.id === 'hold' && sel.length && sel.every(u => u.stance === 'hold')) || (c.id === 'defend' && sel.length && sel.every(u => u.stance !== 'hold')) || (c.id === 'testudo' && sel.some(u => u.formation === 'close')) || (c.id === 'orbis' && sel.some(u => u.formation === 'orb')) || (c.id === 'holdfire' && sel.some(u => u.holdFire));
      if (on) btn.classList.add('on');
      btn.onclick = () => this.cmd(c.id); el.appendChild(btn);
    }
  }

  // ----- HUD -----
  refreshBottom() {
    const el = $('hud-bottom'); el.innerHTML = '';
    if (this.b.general) { const d = document.createElement('div'); d.className = 'ucard'; d.dataset.gen = '1'; d.innerHTML = '<b>General (E)</b><div class="muted" style="font-size:12px">command ring</div>'; d.onclick = () => this.selectGeneral(); el.appendChild(d); }
    this.b.units.filter(u => u.side === 'rome').forEach(u => {
      const d = document.createElement('div'); d.className = 'ucard'; d.dataset.id = u.id;
      d.innerHTML = `<img class="uicon" alt="" src="${artSrc('unit', u.typeKey, 52, 52)}"><b></b><div class="bar x"><i></i></div><div class="bar m" style="margin-top:3px"><i></i></div>`;
      d.querySelector('b').textContent = u.name;
      d.onclick = (e) => this.select([u.id], e.shiftKey);
      el.appendChild(d);
    });
  }
  refreshHud() {
    const b = this.b; if (!b) return;
    const mm = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    const gs = Object.keys(this.groups).filter(n => (this.groups[n] || []).some(id => { const u = b.byId(id); return u && u.active; })).map(n => `[${n}]`).join(' ');
    let objTxt = '';
    if (b.objectives.length) {
      const o = b.objectives[0], att = b.rule ? b.rule.attacker : null;
      objTxt = `   |  ${o.name}: ${o.contested ? 'CONTESTED' : o.owner === 'rome' ? 'Roman' : 'Gallic'}` + (att ? ` - ${att === 'rome' ? 'you hold' : 'enemy holds'} ${Math.floor(b.hold[att])}/${b.rule.holdSecs}s` : '');
    }
    const eta = b.nextWaveEta(), clear = eta !== null && b.activeMen('gaul') === 0;
    $('btn-wave').classList.toggle('hidden', !clear);
    const waveTxt = clear ? `   |  Field clear. Next wave in ${mm(Math.max(0, Math.min(eta, b.callDelay - b.clearT)))}` : '';
    $('hud-time').textContent = `${mm(b.t)} / ${mm(this.scn.timeLimit)}   Rome ${Math.round(b.activeMen('rome'))}   Foe ${b.fogOn && b.units.some(u => u.side === 'gaul' && u.active && !u.spotted) ? '?' : Math.round(b.activeMen('gaul'))}   ${gs}`;
    $('hud-sub').textContent = (objTxt + waveTxt).replace(/^\s*\|\s*/, '').replace(/\s+\|\s+/g, '   |   ').trim();
    document.querySelectorAll('.ucard').forEach(d => {
      if (d.dataset.gen) { d.classList.toggle('sel', this.genSel); return; }
      const u = b.byId(+d.dataset.id); if (!u) return;
      d.dataset.stance = u.stance; d.classList.toggle('sel', this.r.selection.has(u.id)); d.classList.toggle('gone', !u.present);
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
    this.refreshCmds();
    const sel = this.selected(), ins = this.inspect ? b.byId(this.inspect) : null;
    const u = sel.length === 1 ? sel[0] : (!sel.length && ins ? ins : null);
    const L = $('hud-left');
    if (this.genSel && b.general) { const g = b.general; L.innerHTML = `<h3>Your general</h3><div class="muted">The gold ring is your command radius. Cohorts inside it recover morale and rally faster and charge with full force; outside it they are slow to recover. Right-click to move the general.</div>` + (g.wound > 0 ? `<div class="kv"><span>Wounded</span><span>${Math.ceil(g.wound)}s</span></div>` : '') + (b.orders.has('rally') ? `<div class="kv"><span>Rally (F)</span><span>${b.rallyCd > 0 ? Math.ceil(b.rallyCd) + 's' : 'ready'}</span></div>` : ''); return; }
    if (!sel.length && !ins) { L.innerHTML = '<h3>No selection</h3><div class="muted">Click a cohort, or drag a box. Right-click to order. Press ? for controls.</div>'; return; }
    if (sel.length > 1) { L.innerHTML = `<h3>${sel.length} units selected</h3><div class="muted">Right-click to move in a line; right-drag to set a battle line and facing. H to hold.</div>`; return; }
    if (!u) return;
    const t = u.type, lvl = LEVEL_NAMES[u.lvl];
    const kv = (a, v) => `<div class="kv"><span>${a}</span><span>${v}</span></div>`;
    L.innerHTML = `<img class="uicon" alt="" src="${artSrc('unit', u.typeKey, 88, 88)}"><h3>${u.name}</h3><div class="muted">${t.blurb}</div>` +
      kv('Men', `${u.men} / ${u.maxMen}`) + kv('Morale', `${Math.round(u.morale)} / ${Math.round(u.maxMorale)}`) + kv('Fatigue', Math.round(u.fatigue) + '%') +
      kv('Experience', lvl) + kv('Drill', Math.round(u.drill)) +
      (u.side === 'rome' ? kv('Officer', u.officer ? `${u.officer.name} (T${u.officer.tactics})` : 'none') + kv('Stance', u.stance === 'hold' ? 'Hold (never leaves)' : 'Defend post') + kv('Formation', u.formation === 'close' ? 'Testudo' : u.formation === 'orb' ? 'Orbis' : 'Normal') + kv('Command', b.inCommand(u) ? 'in command' : 'OUT OF COMMAND') : '') +
      (t.pilum ? kv('Pila volleys', u.pilumLeft) : '') + (t.range ? kv('Ammo', Math.max(0, Math.round(u.ammo / t.ammo * 100)) + '%') : '') +
      kv('State', u.state);
  }
}
