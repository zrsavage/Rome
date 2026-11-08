// Canvas renderer for the battle: terrain, soldier dots, effects, order lines.
import { WORLD } from './data.js';
import { mulberry32 } from './sim.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.cam = { x: WORLD.w / 2, y: WORLD.h / 2, zoom: 1 };
    this.bg = null; this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.selection = new Set(); this.box = null; this.hover = null; this.dragLine = null; this.showRange = false;
  }
  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.max(1, Math.floor(r.width * this.dpr)); this.canvas.height = Math.max(1, Math.floor(r.height * this.dpr));
    this.vw = r.width; this.vh = r.height;
    this.minZoom = Math.min(this.vw / WORLD.w, this.vh / WORLD.h) * 0.98;
    this.cam.zoom = Math.max(this.minZoom, Math.min(3, this.cam.zoom));
    this.clampCam();
  }
  fit() { this.resize(); this.cam.zoom = this.minZoom; this.cam.x = WORLD.w / 2; this.cam.y = WORLD.h / 2; this.clampCam(); }
  clampCam() {
    const hw = this.vw / this.cam.zoom / 2, hh = this.vh / this.cam.zoom / 2;
    this.cam.x = hw * 2 >= WORLD.w ? WORLD.w / 2 : Math.max(hw, Math.min(WORLD.w - hw, this.cam.x));
    this.cam.y = hh * 2 >= WORLD.h ? WORLD.h / 2 : Math.max(hh, Math.min(WORLD.h - hh, this.cam.y));
  }
  toWorld(sx, sy) { return { x: (sx - this.vw / 2) / this.cam.zoom + this.cam.x, y: (sy - this.vh / 2) / this.cam.zoom + this.cam.y }; }
  toScreen(wx, wy) { return { x: (wx - this.cam.x) * this.cam.zoom + this.vw / 2, y: (wy - this.cam.y) * this.cam.zoom + this.vh / 2 }; }

  buildBackground(scn) {
    const S = 0.8, c = document.createElement('canvas');
    c.width = WORLD.w * S; c.height = WORLD.h * S;
    const g = c.getContext('2d'); g.scale(S, S);
    const rnd = mulberry32(7);
    g.fillStyle = '#6f9150'; g.fillRect(0, 0, WORLD.w, WORLD.h);
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = rnd() > 0.5 ? 'rgba(90,125,60,0.35)' : 'rgba(135,160,90,0.3)';
      const x = rnd() * WORLD.w, y = rnd() * WORLD.h, r = 6 + rnd() * 22;
      g.beginPath(); g.ellipse(x, y, r, r * 0.6, 0, 0, 7); g.fill();
    }
    for (const f of scn.terrain) {
      if (f.kind === 'water') {
        g.fillStyle = '#3d6f96'; g.fillRect(f.x, f.y, f.w, f.h);
        g.fillStyle = 'rgba(190,225,240,0.25)';
        for (let i = 0; i < f.w / 22; i++) { g.fillRect(f.x + rnd() * f.w, f.y + 6 + rnd() * (f.h - 12), 10 + rnd() * 18, 1.4); }
        g.fillStyle = 'rgba(80,60,30,0.35)'; g.fillRect(f.x, f.y - 3, f.w, 3); g.fillRect(f.x, f.y + f.h, f.w, 3);
      } else if (f.kind === 'ford') {
        g.fillStyle = '#7fa8b8'; g.fillRect(f.x, f.y, f.w, f.h);
        g.fillStyle = 'rgba(214,196,150,0.8)';
        for (let i = 0; i < 90; i++) { g.beginPath(); g.ellipse(f.x + rnd() * f.w, f.y + rnd() * f.h, 4 + rnd() * 5, 3 + rnd() * 3, rnd() * 3, 0, 7); g.fill(); }
      } else if (f.kind === 'hill') {
        for (let i = 4; i >= 0; i--) {
          g.fillStyle = `rgba(${150 + i * 12},${158 + i * 12},${92 + i * 10},${0.55})`;
          g.beginPath(); g.ellipse(f.cx, f.cy - i * 4, f.rx * (1 - i * 0.16), f.ry * (1 - i * 0.16), 0, 0, 7); g.fill();
          g.strokeStyle = 'rgba(70,80,40,0.35)'; g.stroke();
        }
      } else if (f.kind === 'forest') {
        g.fillStyle = 'rgba(30,58,30,0.55)'; g.beginPath(); g.ellipse(f.cx, f.cy, f.rx, f.ry, 0, 0, 7); g.fill();
        const n = Math.round(f.rx * f.ry / 120);
        for (let i = 0; i < n; i++) {
          const a = rnd() * 7, rr = Math.sqrt(rnd());
          const x = f.cx + Math.cos(a) * f.rx * rr * 0.95, y = f.cy + Math.sin(a) * f.ry * rr * 0.95, r = 7 + rnd() * 6;
          g.fillStyle = `rgb(${34 + rnd() * 20},${78 + rnd() * 34},${38 + rnd() * 18})`;
          g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
          g.fillStyle = 'rgba(255,255,255,0.08)'; g.beginPath(); g.arc(x - 2, y - 2, r * 0.5, 0, 7); g.fill();
        }
      }
    }
    // map edge vignette
    const grd = g.createRadialGradient(WORLD.w / 2, WORLD.h / 2, WORLD.h * 0.5, WORLD.w / 2, WORLD.h / 2, WORLD.w * 0.75);
    grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(0,0,0,0.35)');
    g.fillStyle = grd; g.fillRect(0, 0, WORLD.w, WORLD.h);
    this.bg = c;
  }

  draw(b) {
    const ctx = this.ctx, z = this.cam.zoom;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = '#1b1a14'; ctx.fillRect(0, 0, this.vw, this.vh);
    ctx.save();
    ctx.translate(this.vw / 2, this.vh / 2); ctx.scale(z, z); ctx.translate(-this.cam.x, -this.cam.y);
    if (this.bg) ctx.drawImage(this.bg, 0, 0, WORLD.w, WORLD.h);
    // retreat edge
    if (b.retreating) { ctx.fillStyle = 'rgba(232,195,106,0.25)'; ctx.fillRect(0, WORLD.h - 16, WORLD.w, 16); }
    // bodies
    for (const d of b.bodies) { ctx.fillStyle = d.side === 'rome' ? 'rgba(120,30,25,0.8)' : 'rgba(30,50,90,0.8)'; ctx.fillRect(d.x - 1, d.y - 1, 2.2, 2.2); }
    const order = b.units.filter(u => u.present).sort((a, b2) => a.y - b2.y);
    this.drawObjectives(ctx, b);
    for (const f of b.fx) if (f.kind === 'dust') this.drawDust(ctx, f);
    for (const id of new Set([...this.selection, this.hover])) { const u = b.byId(id); if (u && u.present && u.state !== 'routing') this.drawArcs(ctx, u); }
    for (const u of order) if (this.showRange || this.selection.has(u.id)) this.drawRange(ctx, u);
    for (const u of order) this.drawUnit(ctx, u, b);
    for (const f of b.fx) if (f.kind !== 'dust') this.drawFx(ctx, f);
    this.drawOrders(ctx, b);
    this.drawFloats(ctx, b);
    ctx.restore();
    for (const u of order) this.drawLabel(ctx, u);
    if (this.box) { ctx.strokeStyle = '#e8c36a'; ctx.fillStyle = 'rgba(232,195,106,0.12)'; const bx = this.box; ctx.fillRect(bx.x0, bx.y0, bx.x1 - bx.x0, bx.y1 - bx.y0); ctx.strokeRect(bx.x0, bx.y0, bx.x1 - bx.x0, bx.y1 - bx.y0); }
    if (this.dragLine) {
      const d = this.dragLine, a = this.toScreen(d.x0, d.y0), c = this.toScreen(d.x1, d.y1);
      ctx.strokeStyle = '#e8c36a'; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 1;
    }
  }

  drawUnit(ctx, u, b) {
    const t = u.type, rome = u.side === 'rome', sel = this.selection.has(u.id);
    ctx.save(); ctx.translate(u.x, u.y); ctx.rotate(u.f);
    const routing = u.state === 'routing';
    ctx.globalAlpha = routing ? 0.6 : 1;
    // footprint
    ctx.fillStyle = (rome ? 'rgba(180,40,30,' : 'rgba(40,90,170,') + (sel ? 0.28 : 0.13) + ')';
    ctx.fillRect(-u.d / 2, -u.w / 2, u.d, u.w);
    if (u.formation === 'close') { ctx.strokeStyle = 'rgba(232,195,106,0.9)'; ctx.lineWidth = 1.4; ctx.strokeRect(-u.d / 2, -u.w / 2, u.d, u.w); }
    // dots: front row at +x
    const n = Math.max(1, Math.ceil(u.men / t.perDot));
    const cols = Math.max(1, Math.min(n, Math.round(Math.sqrt(n * u.w / Math.max(1, u.d))))), rows = Math.ceil(n / cols);
    const sx = u.d / rows, sy = u.w / cols, r = Math.max(1.1, Math.min(t.cat === 'cav' ? 3 : 2.3, Math.min(sx, sy) * 0.42));
    let k = 0;
    for (let row = 0; row < rows && k < n; row++) {
      const x = u.d / 2 - sx * (row + 0.5);
      const inRow = Math.min(cols, n - k);
      for (let c = 0; c < inRow; c++, k++) {
        const y = (c - (inRow - 1) / 2) * sy;
        ctx.fillStyle = t.color; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
        ctx.fillStyle = t.trim; ctx.fillRect(x + r * 0.15, y - r * 0.4, r * 0.8, r * 0.8);
      }
    }
    // standard
    ctx.fillStyle = '#3a2a18'; ctx.fillRect(-u.d / 2 - 5, -0.8, 5, 1.6);
    ctx.fillStyle = t.color; ctx.fillRect(-u.d / 2 - 11, -4, 6, 8);
    if (sel) { ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = 2.2; ctx.strokeRect(-u.d / 2 - 2, -u.w / 2 - 2, u.d + 4, u.w + 4); }
    else if (this.hover === u.id) { ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.5; ctx.strokeRect(-u.d / 2 - 1, -u.w / 2 - 1, u.d + 2, u.w + 2); }
    if (u.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${Math.min(0.4, u.flash / 0.22 * 0.4)})`; ctx.fillRect(-u.d / 2, -u.w / 2, u.d, u.w); }
    if (u.fighting) { ctx.strokeStyle = 'rgba(255,90,60,0.85)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(u.d / 2 + 1.5, -u.w / 2); ctx.lineTo(u.d / 2 + 1.5, u.w / 2); ctx.stroke(); }
    ctx.restore();
  }

  drawLabel(ctx, u) {
    const p = this.toScreen(u.x, u.y - u.w / 2 - 4), z = this.cam.zoom;
    const yy = this.toScreen(u.x, u.y).y - Math.max(u.w, u.d) * z / 2 - 8;
    const rome = u.side === 'rome', fs = Math.max(10, Math.min(14, 11 * z + 3));
    const text = String(u.men), w = Math.max(30, 24 + text.length * 6);
    const x = p.x, y = yy;
    ctx.globalAlpha = u.state === 'routing' ? 0.7 : 1;
    ctx.fillStyle = 'rgba(15,12,8,0.78)'; ctx.fillRect(x - w / 2, y - 13, w, 15);
    ctx.fillStyle = rome ? '#f0d9a8' : '#bcd6f2'; ctx.font = `bold ${fs}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y - 5.5);
    const m = Math.max(0, Math.min(1, u.morale / u.maxMorale));
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - w / 2, y + 2, w, 3);
    ctx.fillStyle = m > 0.6 ? '#6fcf6f' : m > 0.35 ? '#e0c050' : '#d65a4a'; ctx.fillRect(x - w / 2, y + 2, w * m, 3);
    if (u.state === 'routing') { ctx.fillStyle = '#ffd36a'; ctx.fillText('ROUT', x, y - 20); }
    else if (rome && u.officer && this.cam.zoom > 0.6) { ctx.fillStyle = '#e8c36a'; ctx.font = `${Math.max(9, fs - 3)}px system-ui, sans-serif`; ctx.fillText(u.officer.name.split(' ').pop(), x, y - 21); }
    ctx.globalAlpha = 1;
  }

  drawFx(ctx, f) {
    const a = f.life / f.max;
    if (f.kind === 'pilum') { ctx.strokeStyle = `rgba(60,40,20,${a})`; ctx.lineWidth = 1.2; }
    else { ctx.strokeStyle = `rgba(240,230,200,${a * 0.9})`; ctx.lineWidth = 0.9; }
    const t = 1 - a, x = f.x1 + (f.x2 - f.x1) * t, y = f.y1 + (f.y2 - f.y1) * t - Math.sin(t * Math.PI) * 14;
    const t0 = Math.max(0, t - 0.12), x0 = f.x1 + (f.x2 - f.x1) * t0, y0 = f.y1 + (f.y2 - f.y1) * t0 - Math.sin(t0 * Math.PI) * 14;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x, y); ctx.stroke();
  }

  drawOrders(ctx, b) {
    ctx.lineWidth = 1.6;
    for (const id of this.selection) {
      const u = b.byId(id); if (!u || !u.present) continue;
      let tx = null, ty = null, col = 'rgba(255,233,168,0.85)', tf = null;
      if (u.order.kind === 'move') { tx = u.order.x; ty = u.order.y; tf = u.order.tf; }
      else if (u.order.kind === 'attack') { const e = b.byId(u.order.targetId); if (e && e.present) { tx = e.x; ty = e.y; col = 'rgba(255,100,80,0.95)'; } }
      if (tx == null) continue;
      ctx.strokeStyle = col; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(u.x, u.y); ctx.lineTo(tx, ty); ctx.stroke(); ctx.setLineDash([]);
      if (u.order.kind === 'attack') {
        const e = b.byId(u.order.targetId);
        ctx.beginPath(); ctx.arc(tx, ty, Math.max(e.w, e.d) / 2 + 8, 0, 7); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(tx - 10, ty); ctx.lineTo(tx + 10, ty); ctx.moveTo(tx, ty - 10); ctx.lineTo(tx, ty + 10); ctx.stroke();
      } else {
        // destination ghost + flag + facing arrow
        ctx.save(); ctx.translate(tx, ty); ctx.rotate(tf ?? u.f);
        ctx.fillStyle = 'rgba(255,233,168,0.12)'; ctx.fillRect(-u.d / 2, -u.w / 2, u.d, u.w); ctx.strokeRect(-u.d / 2, -u.w / 2, u.d, u.w);
        ctx.beginPath(); ctx.moveTo(u.d / 2 + 4, 0); ctx.lineTo(u.d / 2 + 26, 0); ctx.moveTo(u.d / 2 + 19, -5); ctx.lineTo(u.d / 2 + 26, 0); ctx.lineTo(u.d / 2 + 19, 5); ctx.stroke();
        ctx.restore();
        ctx.fillStyle = col; ctx.fillRect(tx - 0.8, ty - 16, 1.6, 16); ctx.beginPath(); ctx.moveTo(tx + 0.8, ty - 16); ctx.lineTo(tx + 11, ty - 12); ctx.lineTo(tx + 0.8, ty - 8); ctx.fill();
      }
    }
  }

  // Flank arcs: green front, yellow flanks, red rear (matches the sim's angle classes).
  drawArcs(ctx, u) {
    const R = Math.max(u.w, u.d) / 2 + 26, a1 = Math.acos(0.6), a2 = Math.acos(-0.35);
    const sector = (from, to, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(u.x, u.y); ctx.arc(u.x, u.y, R, u.f + from, u.f + to); ctx.closePath(); ctx.fill(); };
    sector(-a1, a1, 'rgba(90,210,90,0.17)'); sector(a1, a2, 'rgba(235,205,70,0.2)'); sector(-a2, -a1, 'rgba(235,205,70,0.2)'); sector(a2, Math.PI * 2 - a2, 'rgba(225,70,60,0.22)');
  }
  drawRange(ctx, u) {
    const t = u.type, ext = Math.max(u.w, u.d) / 2; let r = null, col = 'rgba(255,255,255,0.35)';
    if (t.range) r = t.range + ext; else if (t.cat === 'cav') { r = 110 + ext; col = 'rgba(255,170,120,0.35)'; } else if (t.pilum && u.pilumLeft > 0) { r = 30 + ext; col = 'rgba(255,225,150,0.4)'; }
    if (!r) return;
    ctx.strokeStyle = col; ctx.lineWidth = 1.3; ctx.setLineDash([5, 6]); ctx.beginPath(); ctx.arc(u.x, u.y, r, 0, 7); ctx.stroke(); ctx.setLineDash([]);
  }
  drawDust(ctx, f) {
    const a = f.life / f.max;
    ctx.fillStyle = `rgba(200,180,140,${a * 0.3})`; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1.6 - a * 0.6), 0, 7); ctx.fill();
  }
  drawFloats(ctx, b) {
    const z = this.cam.zoom, fs = Math.max(11, 14 / Math.max(0.6, z));
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `bold ${fs}px system-ui, sans-serif`;
    for (const f of b.floats) {
      const a = f.life / f.max, y = f.y - (1 - a) * 26;
      ctx.fillStyle = `rgba(0,0,0,${a * 0.7})`; ctx.fillText(f.text, f.x + 1, y + 1);
      ctx.fillStyle = f.side === 'rome' ? `rgba(255,130,115,${a})` : `rgba(170,215,255,${a})`; ctx.fillText(f.text, f.x, y);
    }
  }
  drawObjectives(ctx, b) {
    for (const o of b.objectives) {
      const col = o.contested ? '240,200,60' : o.owner === 'rome' ? '210,60,50' : o.owner === 'gaul' ? '60,110,190' : '200,200,200';
      ctx.fillStyle = `rgba(${col},0.13)`; ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, 7); ctx.fill();
      ctx.strokeStyle = `rgba(${col},0.8)`; ctx.lineWidth = 2; ctx.setLineDash([10, 8]); ctx.stroke(); ctx.setLineDash([]);
      if (b.rule) {
        const att = b.rule.attacker, fr = Math.min(1, b.hold[att] / b.rule.holdSecs);
        if (fr > 0) { ctx.strokeStyle = att === 'rome' ? '#ff6a5a' : '#6aa8ff'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(o.x, o.y, o.r + 6, -Math.PI / 2, -Math.PI / 2 + fr * Math.PI * 2); ctx.stroke(); }
      }
      ctx.fillStyle = '#3a2a18'; ctx.fillRect(o.x - 1, o.y - 30, 2, 30);
      ctx.fillStyle = `rgb(${col})`; ctx.beginPath(); ctx.moveTo(o.x + 1, o.y - 30); ctx.lineTo(o.x + 20, o.y - 24); ctx.lineTo(o.x + 1, o.y - 18); ctx.fill();
      ctx.fillStyle = 'rgba(240,228,200,0.95)'; ctx.font = 'bold 13px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(o.name, o.x, o.y + o.r + 16);
    }
  }

  unitAt(b, wx, wy, side) {
    let best = null, bd = Infinity;
    for (const u of b.units) {
      if (!u.present || (side && u.side !== side)) continue;
      const dx = wx - u.x, dy = wy - u.y, c = Math.cos(-u.f), s = Math.sin(-u.f);
      const lx = dx * c - dy * s, ly = dx * s + dy * c, pad = 7 / this.cam.zoom;
      if (Math.abs(lx) <= u.d / 2 + pad && Math.abs(ly) <= u.w / 2 + pad) {
        const d = Math.hypot(dx, dy); if (d < bd) { bd = d; best = u; }
      }
    }
    return best;
  }
}
