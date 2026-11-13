// Canvas renderer for the battle: terrain, soldier dots, effects, order lines.
import { WORLD, elevAt, terrainAt, forestIn, riverShift, vnoise } from './data.js';
import { soldierSprite, specialSprite, shieldTile } from './sprites.js';
import { dragLayout, compass } from './orders.js';
import { mulberry32 } from './sim.js';

// Hillshading and contour lines from the real height map, lit from the north-west.
function paintRelief(g, scn) {
  if (!scn.terrain.some(f => f.kind === 'hill')) return;
  const cell = Math.max(2, Math.round(1.2 * Math.sqrt(WORLD.w * WORLD.h / 1.6e6))), gw = Math.ceil(WORLD.w / cell), gh = Math.ceil(WORLD.h / cell), H = new Float32Array(gw * gh);
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) H[y * gw + x] = elevAt(scn, x * cell, y * cell);
  const c = document.createElement('canvas'); c.width = gw; c.height = gh;
  const cg = c.getContext('2d'), img = cg.createImageData(gw, gh), d = img.data;
  const at = (x, y) => H[Math.max(0, Math.min(gh - 1, y)) * gw + Math.max(0, Math.min(gw - 1, x))];
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
    const h = H[y * gw + x]; if (h < 0.4) continue;
    const lit = (at(x + 1, y + 1) - at(x - 1, y - 1)) * 0.9;                      // positive: slope faces the light
    // layers, composited bottom to top: warm height tint, light/shadow, contour line
    let r = 214, gg = 200, b = 138, a = Math.min(0.34, h / 70 * 0.34);
    const over = (cr, cgc, cb, ca) => { const na = ca + a * (1 - ca); if (na > 0) { r = (cr * ca + r * a * (1 - ca)) / na; gg = (cgc * ca + gg * a * (1 - ca)) / na; b = (cb * ca + b * a * (1 - ca)) / na; } a = na; };
    if (lit > 0) over(255, 248, 196, Math.min(0.42, lit * 0.07)); else over(24, 36, 18, Math.min(0.55, -lit * 0.09));
    const band = Math.floor(h / 7);
    if (Math.floor(at(x + 1, y) / 7) !== band || Math.floor(at(x, y + 1) / 7) !== band) over(70, 56, 26, 0.32);
    const i = (y * gw + x) * 4; d[i] = r; d[i + 1] = gg; d[i + 2] = b; d[i + 3] = a * 255;
  }
  cg.putImageData(img, 0, 0);
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(c, 0, 0, WORLD.w, WORLD.h);
}

export function paintTerrain(g, scn) {
  const rnd = mulberry32(7), A = WORLD.w * WORLD.h / 1.6e6;          // everything below scales with the size of the battlefield
  const dry = !!scn.dry;                                          // Africa: sun-bleached scrub, not the green fields of Gaul
  g.fillStyle = dry ? '#a99a63' : '#6f9150'; g.fillRect(0, 0, WORLD.w, WORLD.h);
  // soft colour variation, dry patches, then grass tufts, flowers and stones
  for (let i = 0; i < Math.round(2600 * A); i++) {
    g.fillStyle = dry ? (rnd() > 0.5 ? 'rgba(150,128,78,0.35)' : 'rgba(196,178,120,0.3)') : rnd() > 0.5 ? 'rgba(90,125,60,0.35)' : 'rgba(135,160,90,0.3)';
    const x = rnd() * WORLD.w, y = rnd() * WORLD.h, r = 6 + rnd() * 22;
    g.beginPath(); g.ellipse(x, y, r, r * 0.6, 0, 0, 7); g.fill();
  }
  for (let i = 0; i < Math.round(120 * A); i++) { g.fillStyle = 'rgba(176,160,96,0.22)'; const x = rnd() * WORLD.w, y = rnd() * WORLD.h, r = 18 + rnd() * 46; g.beginPath(); g.ellipse(x, y, r, r * 0.55, rnd() * 3, 0, 7); g.fill(); }
  g.lineCap = 'round';
  for (let i = 0; i < Math.round(5200 * A); i++) {
    const x = rnd() * WORLD.w, y = rnd() * WORLD.h, l = 2 + rnd() * 3;
    g.strokeStyle = dry ? (rnd() > 0.5 ? 'rgba(110,104,58,0.45)' : 'rgba(196,184,120,0.4)') : rnd() > 0.5 ? 'rgba(52,88,34,0.5)' : 'rgba(168,190,104,0.45)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 2, y - l); g.moveTo(x + 2, y); g.lineTo(x + 2 + (rnd() - 0.5) * 2, y - l * 0.8); g.stroke();
  }
  for (let i = 0; i < Math.round((dry ? 40 : 260) * A); i++) { const x = rnd() * WORLD.w, y = rnd() * WORLD.h; g.fillStyle = ['#f3e7a8', '#ffffff', '#d98cc4', '#e8b04a'][i & 3]; g.globalAlpha = 0.75; g.beginPath(); g.arc(x, y, 1.1, 0, 7); g.fill(); }
  g.globalAlpha = 1;
  for (let i = 0; i < Math.round(70 * A); i++) { const x = rnd() * WORLD.w, y = rnd() * WORLD.h, r = 2 + rnd() * 3.5; g.fillStyle = 'rgba(40,38,30,0.25)'; g.beginPath(); g.ellipse(x + 1, y + 1.5, r, r * 0.6, 0, 0, 7); g.fill(); g.fillStyle = '#a7a396'; g.beginPath(); g.ellipse(x, y, r, r * 0.65, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.ellipse(x - 0.8, y - 0.8, r * 0.5, r * 0.3, 0, 0, 7); g.fill(); }
  const trees = [];
  for (const f of scn.terrain) {
    // a river is a wandering strip: its banks follow riverShift, the same function the sim uses to decide where the water is
    const strip = (f, pad) => {
      const top = [], bot = [];
      for (let x = f.x; x <= f.x + f.w + 0.1; x += 10) { const sh = riverShift(f, x), wob = (vnoise(x / 55 + f.y, f.y) - 0.5) * 6; top.push([x, f.y + sh - pad + wob]); bot.push([x, f.y + f.h + sh + pad - wob * 0.7]); }
      g.beginPath(); g.moveTo(top[0][0], top[0][1]); for (const q of top) g.lineTo(q[0], q[1]); for (let i = bot.length - 1; i >= 0; i--) g.lineTo(bot[i][0], bot[i][1]); g.closePath();
    };
    if (f.kind === 'water') {
      const gr = g.createLinearGradient(0, f.y - 30, 0, f.y + f.h + 30); const ice = scn._wx === 'frost'; if (ice) { gr.addColorStop(0, '#9fc0d0'); gr.addColorStop(0.5, '#cfe3ec'); gr.addColorStop(1, '#9fc0d0'); } else { gr.addColorStop(0, '#4d7f9e'); gr.addColorStop(0.5, '#2f6288'); gr.addColorStop(1, '#4d7f9e'); }
      g.fillStyle = 'rgba(112,92,52,0.55)'; strip(f, 7); g.fill();          // muddy banks
      g.fillStyle = gr; strip(f, 0); g.fill();
      g.strokeStyle = 'rgba(205,232,244,0.3)'; g.lineWidth = 1.2;
      for (let i = 0; i < f.w / 14; i++) { const x = f.x + rnd() * f.w, y = f.y + riverShift(f, x) + 5 + rnd() * (f.h - 10), l = 8 + rnd() * 20; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y - 1.8, x + l, y); g.stroke(); }
      g.strokeStyle = 'rgba(70,96,40,0.85)'; g.lineWidth = 1.2;
      for (let i = 0; i < f.w / 9; i++) { const x = f.x + rnd() * f.w, up = rnd() > 0.5, y = (up ? f.y - 1 : f.y + f.h + 1) + riverShift(f, x); g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 3, y + (up ? -6 : 6) * (0.6 + rnd() * 0.7)); g.stroke(); }
    } else if (f.kind === 'ford') {
      g.fillStyle = 'rgba(112,92,52,0.5)'; strip(f, 7); g.fill();
      g.fillStyle = scn._wx === 'frost' ? '#c4dbe5' : '#86adbd'; strip(f, 0); g.fill();
      for (let i = 0; i < 70; i++) { const x = f.x + rnd() * f.w, y = f.y + riverShift(f, x) + rnd() * f.h, rx = 3.5 + rnd() * 5, ry = 2.5 + rnd() * 3; g.fillStyle = 'rgba(40,60,70,0.25)'; g.beginPath(); g.ellipse(x + 1, y + 1.5, rx, ry, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(196,184,150,0.8)'; g.beginPath(); g.ellipse(x, y, rx * 0.8, ry * 0.8, rnd() * 3, 0, 7); g.fill(); }
    } else if (f.kind === 'forest') {
      // trees are scattered inside the ragged woodland shape, with smaller outliers straggling past its edge
      const ts = Math.sqrt(f.sc || 1), n = Math.round(Math.PI * f.rx * f.ry * 0.8 / (95 * ts * ts));   // bigger woods get bigger trees, not endless ones
      let placed = 0, tries = 0;
      while (placed < n && tries++ < n * 8) { const x = f.cx + (rnd() * 2 - 1) * f.rx * 1.25, y = f.cy + (rnd() * 2 - 1) * f.ry * 1.25; if (!forestIn(f, x, y)) continue; placed++; trees.push({ x, y, r: (6.5 + rnd() * 7.5) * ts, k: rnd(), under: true }); }
      const out = Math.round(n * 0.07); placed = 0; tries = 0;
      while (placed < out && tries++ < out * 30) { const x = f.cx + (rnd() * 2 - 1) * f.rx * 1.5, y = f.cy + (rnd() * 2 - 1) * f.ry * 1.5; if (forestIn(f, x, y) || !forestIn(f, f.cx + (x - f.cx) * 0.8, f.cy + (y - f.cy) * 0.8)) continue; placed++; trees.push({ x, y, r: (4.5 + rnd() * 4) * ts, k: rnd() }); }
    }
  }
  paintRelief(g, scn);
  // trees last, far to near, so canopies overlap properly and stand over the hillshade
  for (let i = 0; i < Math.round((dry ? 30 : 70) * A); i++) {               // lone trees and thickets out in the open (fewer in Africa)
    const x = rnd() * WORLD.w, y = rnd() * WORLD.h, kind = terrainAt(scn, x, y).kind, k = rnd(), sz = 4 + rnd() * 5, cl = rnd() < 0.4 ? 3 : 1;
    if (kind !== 'grass') continue;
    for (let j = 0; j < cl; j++) trees.push({ x: x + (rnd() - 0.5) * 22 * (cl > 1), y: y + (rnd() - 0.5) * 16 * (cl > 1), r: sz * (0.7 + rnd() * 0.5), k });
  }
  for (let i = 0; i < Math.round(260 * A); i++) { const x = rnd() * WORLD.w, y = rnd() * WORLD.h; if (terrainAt(scn, x, y).kind !== 'grass') continue; g.fillStyle = dry ? 'rgba(98,96,52,0.5)' : 'rgba(52,84,34,0.55)'; g.beginPath(); g.ellipse(x, y, 3 + rnd() * 4, 2 + rnd() * 2.5, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(120,150,70,0.35)'; g.beginPath(); g.ellipse(x - 1, y - 1, 1.8, 1.2, 0, 0, 7); g.fill(); }
  for (const t of trees) if (t.under) { g.fillStyle = 'rgba(18,34,16,0.13)'; g.beginPath(); g.arc(t.x, t.y, t.r * 2.1, 0, 7); g.fill(); }   // the dark floor of a wood
  trees.sort((a, b) => a.y - b.y);
  for (const t of trees) {
    g.fillStyle = 'rgba(8,20,8,0.3)'; g.beginPath(); g.ellipse(t.x + t.r * 0.4, t.y + t.r * 0.55, t.r * 1.05, t.r * 0.7, 0, 0, 7); g.fill();
    g.fillStyle = dry ? `rgb(${78 + t.k * 20},${88 + t.k * 20},${52 + t.k * 12})` : `rgb(${28 + t.k * 16},${62 + t.k * 28},${30 + t.k * 14})`;   // olive and scrub in Africa g.beginPath(); g.arc(t.x, t.y, t.r, 0, 7); g.fill();
    g.fillStyle = `rgba(${86 + t.k * 30},${140 + t.k * 30},${70},0.55)`; g.beginPath(); g.arc(t.x - t.r * 0.28, t.y - t.r * 0.32, t.r * 0.62, 0, 7); g.fill();
    g.fillStyle = 'rgba(210,235,150,0.18)'; g.beginPath(); g.arc(t.x - t.r * 0.4, t.y - t.r * 0.45, t.r * 0.28, 0, 7); g.fill();
  }
  // map edge vignette
  const grd = g.createRadialGradient(WORLD.w / 2, WORLD.h / 2, WORLD.h * 0.5, WORLD.w / 2, WORLD.h / 2, WORLD.w * 0.75);
  grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(0,0,0,0.35)');
  g.fillStyle = grd; g.fillRect(0, 0, WORLD.w, WORLD.h);
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.cam = { x: WORLD.w / 2, y: WORLD.h / 2, zoom: 1 };
    this.bg = null; this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.selection = new Set(); this.box = null; this.hover = null; this.dragLine = null; this.showRange = false; this.markers = [];
  }
  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.max(1, Math.floor(r.width * this.dpr)); this.canvas.height = Math.max(1, Math.floor(r.height * this.dpr));
    this.vw = r.width; this.vh = r.height;
    this.fitZoom = Math.min(this.vw / WORLD.w, this.vh / WORLD.h) * 0.98; this.minZoom = this.fitZoom * 0.5;   // you can pull back past the whole field
    this.cam.zoom = Math.max(this.minZoom, Math.min(2.4, this.cam.zoom));
    this.clampCam();
  }
  fit() { this.resize(); this.cam.zoom = this.fitZoom; this.cam.x = WORLD.w / 2; this.cam.y = WORLD.h / 2; this.clampCam(); }
  // The range the camera centre may occupy so that the picture fills the screen (or is centred, when the whole field fits).
  bounds() {
    const hw = this.vw / this.cam.zoom / 2, hh = this.vh / this.cam.zoom / 2;
    return { minX: hw * 2 >= WORLD.w ? WORLD.w / 2 : hw, maxX: hw * 2 >= WORLD.w ? WORLD.w / 2 : WORLD.w - hw, minY: hh * 2 >= WORLD.h ? WORLD.h / 2 : hh, maxY: hh * 2 >= WORLD.h ? WORLD.h / 2 : WORLD.h - hh };
  }
  // margin (screen pixels) lets the camera drift a little past the edge; it springs back on its own (see BattleUI.pan)
  clampCam(margin = 0) {
    const b = this.bounds(), m = margin / this.cam.zoom;
    this.cam.x = Math.max(b.minX - m, Math.min(b.maxX + m, this.cam.x));
    this.cam.y = Math.max(b.minY - m, Math.min(b.maxY + m, this.cam.y));
  }
  toWorld(sx, sy) { return { x: (sx - this.vw / 2) / this.cam.zoom + this.cam.x, y: (sy - this.vh / 2) / this.cam.zoom + this.cam.y }; }
  toScreen(wx, wy) { return { x: (wx - this.cam.x) * this.cam.zoom + this.vw / 2, y: (wy - this.cam.y) * this.cam.zoom + this.vh / 2 }; }

  buildBackground(scn) {
    const S = Math.min(1, 4200 / WORLD.w), c = document.createElement('canvas');   // the ground texture is kept at full resolution, so it stays crisp when you zoom in
    c.width = WORLD.w * S; c.height = WORLD.h * S;
    const g = c.getContext('2d'); g.scale(S, S);
    paintTerrain(g, scn);
    this.bg = c;
  }
  // A small copy of the battlefield for the replay on the result screen.
  bgThumb(w = 720) { if (!this.bg) return null; const c = document.createElement('canvas'); c.width = w; c.height = Math.round(w * this.bg.height / this.bg.width); c.getContext('2d').drawImage(this.bg, 0, 0, c.width, c.height); try { return c.toDataURL('image/jpeg', 0.72); } catch { return null; } }

  draw(b) {
    const ctx = this.ctx, z = this.cam.zoom;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = '#232b1d'; ctx.fillRect(0, 0, this.vw, this.vh);
    ctx.save();
    ctx.translate(this.vw / 2, this.vh / 2); ctx.scale(z, z); ctx.translate(-this.cam.x, -this.cam.y);
    if (b.shake > 0.05) ctx.translate((Math.random() - 0.5) * b.shake * 2, (Math.random() - 0.5) * b.shake * 2);   // the thud of a charge
    if (this.bg) ctx.drawImage(this.bg, 0, 0, WORLD.w, WORLD.h);
    // retreat edge
    if (b.retreating && b.retreatOrder) {   // the way out: a band on the map edge the army is withdrawing toward
      const { dx, dy } = b.retreatOrder; ctx.fillStyle = 'rgba(232,195,106,0.25)';
      if (Math.abs(dy) >= Math.abs(dx)) ctx.fillRect(0, dy > 0 ? WORLD.h - 16 : 0, WORLD.w, 16); else ctx.fillRect(dx > 0 ? WORLD.w - 16 : 0, 0, 16, WORLD.h);
    }
    // bodies
    ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    for (const side of ['rome', 'gaul']) {          // the fallen, as small figures lying on the ground
      ctx.strokeStyle = side === 'rome' ? 'rgba(125,32,26,0.85)' : 'rgba(34,56,104,0.85)'; ctx.beginPath();
      for (const d of b.bodies) if (d.side === side) { const a = d.a || 0, c = Math.cos(a) * 1.9, sn = Math.sin(a) * 1.9; ctx.moveTo(d.x - c, d.y - sn); ctx.lineTo(d.x + c, d.y + sn); }
      ctx.stroke();
    }
    const order = b.units.filter(u => u.present && (u.side === 'rome' || u.spotted !== false)).sort((a, b2) => a.y - b2.y);
    this.drawFlood(ctx, b);
    this.drawDeployZone(ctx, b);
    this.drawObjectives(ctx, b);
    for (const f of b.fx) if (f.kind === 'dust') this.drawDust(ctx, f);
    for (const id of new Set([...this.selection, this.hover])) { const u = b.byId(id); if (u && u.present && u.state !== 'routing') this.drawArcs(ctx, u); }
    for (const u of order) if (this.showRange || this.selection.has(u.id)) this.drawRange(ctx, u);
    for (const u of order) this.drawUnit(ctx, u, b);
    for (const f of b.fx) if (f.kind !== 'dust') this.drawFx(ctx, f);
    this.drawLegates(ctx, b);
    this.drawGeneral(ctx, b);
    this.drawOrders(ctx, b);
    this.drawMessengers(ctx, b);
    this.drawFloats(ctx, b);
    this.drawMarkers(ctx);
    this.drawDragPreview(ctx, b);
    ctx.restore();
    this.drawWeather(ctx, b);
    const placed = [];                                      // label boxes already on screen, so labels never sit on top of each other
    for (const u of [...order].sort((a, b2) => b2.y - a.y)) this.drawLabel(ctx, u, placed);
    this.drawGeneralMarker(ctx, b);
    if (this.box) { ctx.strokeStyle = '#e8c36a'; ctx.fillStyle = 'rgba(232,195,106,0.12)'; const bx = this.box; ctx.fillRect(bx.x0, bx.y0, bx.x1 - bx.x0, bx.y1 - bx.y0); ctx.strokeRect(bx.x0, bx.y0, bx.x1 - bx.x0, bx.y1 - bx.y0); }
  }

  // While deploying, your zone is outlined in gold: units may be placed anywhere inside it.
  drawDeployZone(ctx, b) {
    const z = b.deploying && b.deployZone; if (!z) return;
    ctx.save(); ctx.fillStyle = 'rgba(232,195,106,0.09)'; ctx.fillRect(z.x0, z.y0, z.x1 - z.x0, z.y1 - z.y0);
    ctx.strokeStyle = 'rgba(232,195,106,0.9)'; ctx.lineWidth = 2 / this.cam.zoom; ctx.setLineDash([14 / this.cam.zoom, 9 / this.cam.zoom]); ctx.strokeRect(z.x0, z.y0, z.x1 - z.x0, z.y1 - z.y0); ctx.setLineDash([]);
    const fs = 15 / this.cam.zoom; ctx.font = `600 ${fs}px Cinzel, Georgia, serif`; ctx.fillStyle = 'rgba(232,195,106,0.95)'; ctx.textAlign = 'left';
    ctx.fillText('YOUR DEPLOYMENT ZONE', z.x0 + 10 / this.cam.zoom, z.y0 + fs + 6 / this.cam.zoom); ctx.restore();
  }
  // A storm raises the river: the ford is painted over with deeper, darker water as it fills.
  drawFlood(ctx, b) {
    const fl = b.scn.flood || 0; if (fl <= 0) return;
    for (const f of b.scn.terrain) {
      if (f.kind !== 'ford') continue;
      ctx.beginPath(); const grow = 5 * fl;
      for (let x = f.x; x <= f.x + f.w + 0.1; x += 10) { const y = f.y + riverShift(f, x) - grow; x === f.x ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      for (let x = f.x + f.w; x >= f.x - 0.1; x -= 10) ctx.lineTo(x, f.y + f.h + riverShift(f, x) + grow);
      ctx.closePath(); ctx.fillStyle = `rgba(38,86,122,${0.78 * fl})`; ctx.fill();
      ctx.strokeStyle = `rgba(215,235,245,${0.35 * fl})`; ctx.lineWidth = 1.2;
      const tt = performance.now() / 1000;
      for (let x = f.x + 8; x < f.x + f.w; x += 26) { const y = f.y + riverShift(f, x) + 8 + ((x * 7) % (f.h - 16)), o = Math.sin(tt * 1.4 + x) * 3; ctx.beginPath(); ctx.moveTo(x + o, y); ctx.quadraticCurveTo(x + 8 + o, y - 3, x + 16 + o, y); ctx.stroke(); }
    }
  }
  // Weather over the view (in screen space): rain streaks and mud-brown damp, drifting fog banks, a cold blue frost.
  drawWeather(ctx, b) {
    const k = b.wxKey; if (!k || k === 'clear') return;
    const w = this.vw, h = this.vh, tt = performance.now() / 1000;
    ctx.save(); ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (k === 'rain' || k === 'storm') {
      ctx.fillStyle = k === 'storm' ? 'rgba(18,26,44,0.26)' : 'rgba(60,52,34,0.10)'; ctx.fillRect(0, 0, w, h);
      const n = Math.round(w * h / (k === 'storm' ? 4200 : 7500)), slant = k === 'storm' ? 0.38 : 0.2, len = k === 'storm' ? 20 : 14, sp = k === 'storm' ? 1500 : 1000;
      ctx.strokeStyle = k === 'storm' ? 'rgba(200,215,235,0.38)' : 'rgba(200,215,230,0.3)'; ctx.lineWidth = 1; ctx.beginPath();
      for (let i = 0; i < n; i++) { const r1 = (Math.sin(i * 12.9898) * 43758.5453) % 1, r2 = (Math.sin(i * 78.233 + 1.7) * 24634.6345) % 1, ph = Math.abs(r2), x = ((Math.abs(r1) * (w + 120) + tt * sp * slant * (0.8 + ph * 0.4)) % (w + 120)) - 60, y = (ph * h + tt * sp * (0.8 + ph * 0.4)) % (h + 40) - 20; ctx.moveTo(x, y); ctx.lineTo(x - len * slant, y + len); }
      ctx.stroke();
    } else if (k === 'fog') {
      ctx.fillStyle = 'rgba(205,210,206,0.3)'; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 6; i++) { const cx = ((i * 0.23 + tt * 0.004 * (1 + i * 0.3)) % 1.4 - 0.2) * w, cy = (0.15 + ((i * 0.37) % 0.7)) * h, r = Math.max(w, h) * 0.32, g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, 'rgba(225,228,224,0.34)'); g.addColorStop(1, 'rgba(225,228,224,0)'); ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, r * 2, r * 2); }
    } else if (k === 'frost') {
      ctx.fillStyle = 'rgba(165,200,240,0.13)'; ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();
  }

  drawUnit(ctx, u, b) {
    const t = u.type, rome = u.side === 'rome', sel = this.selection.has(u.id);
    ctx.save(); ctx.translate(u.x, u.y); ctx.rotate(u.f);
    const routing = u.state === 'routing';
    ctx.globalAlpha = routing ? 0.6 : 1;
    // footprint
    ctx.fillStyle = (rome ? 'rgba(190,40,30,' : 'rgba(40,90,190,') + (sel ? 0.3 : 0.17) + ')';
    ctx.fillRect(-u.d / 2, -u.w / 2, u.d, u.w);
    if (rome && b.general && u.state !== 'routing' && !b.inCommand(u)) { ctx.strokeStyle = 'rgba(190,190,190,0.55)'; ctx.lineWidth = 1; ctx.setLineDash([3, 4]); ctx.strokeRect(-u.d / 2 - 2, -u.w / 2 - 2, u.d + 4, u.w + 4); ctx.setLineDash([]); }
    if (u.formation === 'wedge') { ctx.strokeStyle = 'rgba(255,176,70,0.95)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(u.d / 2 + 6, 0); ctx.lineTo(-u.d / 2, -u.w / 2 - 2); ctx.lineTo(-u.d / 2, u.w / 2 + 2); ctx.closePath(); ctx.stroke(); }
    if (u.formation === 'orb') { ctx.strokeStyle = 'rgba(150,200,255,0.95)'; ctx.lineWidth = 1.6; ctx.strokeRect(-u.d / 2, -u.w / 2, u.d, u.w); }
    if (u.lanes) { ctx.strokeStyle = 'rgba(232,195,106,0.8)'; ctx.lineWidth = 1.2; ctx.setLineDash([3, 3]); for (const f of [-1 / 6, 1 / 6]) { ctx.beginPath(); ctx.moveTo(-u.d / 2, f * u.w); ctx.lineTo(u.d / 2, f * u.w); ctx.stroke(); } ctx.setLineDash([]); }   // open ranks: the lanes
    if (u.formation === 'close') { ctx.strokeStyle = 'rgba(232,195,106,0.9)'; ctx.lineWidth = 1.4; ctx.strokeRect(-u.d / 2, -u.w / 2, u.d, u.w); }
    // soldiers: front row at +x. Each is a little figure with a shield; a testudo is a roof of locked shields; routers scatter.
    const lod = Math.max(u.w, u.d) * this.cam.zoom < 30;     // zoomed far out, a unit is one solid block rather than hundreds of figures
    if (lod) { ctx.fillStyle = rome ? 'rgba(176,46,36,0.82)' : 'rgba(46,96,190,0.82)'; ctx.fillRect(-u.d / 2, -u.w / 2, u.d, u.w); ctx.fillStyle = t.trim; ctx.fillRect(u.d / 2 - 3, -u.w / 2, 3, u.w); }
    const n = lod ? 0 : Math.max(1, Math.ceil(u.men / t.perDot));
    const cols = Math.max(1, Math.min(n, Math.round(Math.sqrt(n * u.w / Math.max(1, u.d))))), rows = Math.ceil(n / cols);
    const sx = u.d / rows, sy = u.w / cols, r = Math.max(1.1, Math.min(t.cat === 'cav' ? 3 : 2.3, Math.min(sx, sy) * 0.42));
    const now = b.t, roof = u.formation === 'close', helm = rome ? '#cfcfc4' : (u.typeKey === 'gaul_elite' ? '#e4c56a' : '#cfa96e');
    const shade = (k) => (u.typeKey === 'legionary' ? (k & 1 ? '#a52a22' : '#b9362c') : t.color);
    let k = 0;
    for (let row = 0; row < rows && k < n; row++) {
      const x = u.d / 2 - sx * (row + 0.5);
      const inRow = Math.min(cols, n - k);
      for (let c = 0; c < inRow; c++, k++) {
        let y = (c - (inRow - 1) / 2) * sy, xx = x;
        if (routing) { xx += Math.sin(now * 9 + k * 1.7) * 2.4; y += Math.cos(now * 8 + k * 2.3) * 2.4; }
        else if (u.fighting && row < 2) { xx += Math.sin(now * 6.5 + k * 1.9) * (row === 0 ? 1.3 : 0.7); y += Math.cos(now * 5.2 + k * 2.7) * 0.7; }     // the front ranks heave against the enemy
        if (roof) {   // a roof of locked shields, each one the real scutum
          ctx.drawImage(shieldTile(u.typeKey), xx - sx * 0.56, y - sy * 0.56, sx * 1.12, sy * 1.12);
          continue;
        }
        // each man is a real top-down figure (see sprites.js): helmet or hair, shoulders, shield and weapon, facing the way the unit faces
        const cav = t.cat === 'cav', sz = t.big ? 40 : t.wagon ? 36 : cav ? Math.min(Math.max(Math.min(sx * 1.08, sy * 2.7), 11), 32) : Math.min(Math.max(Math.max(sx, sy) * 1.18, 5.5), 18);
        ctx.drawImage(soldierSprite(u.typeKey, (k * 7 + u.id) % 3, !['legionary', 'pompeian', 'pontic'].includes(u.typeKey) || u.pilumLeft > 0), xx - sz / 2, y - sz / 2, sz, sz);   // a legionary who has thrown his pila draws the gladius
      }
    }
    if (!lod && rome && u.typeKey === 'legionary' && !roof) {     // the signifer stands in the front rank, the centurion at its right end
      const so = Math.min(Math.max(Math.max(sx, sy) * 1.3, 6.5), 20);
      ctx.drawImage(specialSprite('signifer'), u.d / 2 - sx * 0.2 - so / 2, -so / 2, so, so);
      if (u.officer) ctx.drawImage(specialSprite('centurion'), u.d / 2 - sx * 0.2 - so / 2, u.w / 2 + so * 0.05, so, so);
    }
    // standard: a Roman cohort's signum (pole hung with silver discs, a crossbar and a small hand or spearhead on top), or a Gallic boar standard
    ctx.fillStyle = '#4a3418'; ctx.fillRect(-u.d / 2 - 12, -0.9, 12, 1.8);
    if (rome) {
      ctx.fillStyle = '#cfd4da'; for (const dx of [-10.5, -7, -3.5]) { ctx.beginPath(); ctx.arc(-u.d / 2 + dx, 0, 1.9, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#e0bb55'; ctx.fillRect(-u.d / 2 - 12.5, -3.4, 1.6, 6.8); ctx.fillRect(-u.d / 2 - 8.5, -3, 1.2, 6);
      ctx.fillStyle = t.color; ctx.fillRect(-u.d / 2 - 6, 1.8, 4.6, 4);
    } else {
      ctx.fillStyle = '#d8c46a'; ctx.beginPath(); ctx.moveTo(-u.d / 2 - 12.5, 0); ctx.lineTo(-u.d / 2 - 15, -3.4); ctx.lineTo(-u.d / 2 - 11, -2); ctx.closePath(); ctx.fill();   // a boar's head
      ctx.fillStyle = t.color; ctx.beginPath(); ctx.moveTo(-u.d / 2 - 9, 0); ctx.lineTo(-u.d / 2 - 1, 4.5); ctx.lineTo(-u.d / 2 - 1, -4.5); ctx.closePath(); ctx.fill(); ctx.fillStyle = t.trim; ctx.fillRect(-u.d / 2 - 6, -0.9, 3.5, 1.8);
    }
    if (sel) { ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = 2.2; ctx.strokeRect(-u.d / 2 - 2, -u.w / 2 - 2, u.d + 4, u.w + 4); }
    else if (this.hover === u.id) { ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.5; ctx.strokeRect(-u.d / 2 - 1, -u.w / 2 - 1, u.d + 2, u.w + 2); }
    if (u.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${Math.min(0.4, u.flash / 0.22 * 0.4)})`; ctx.fillRect(-u.d / 2, -u.w / 2, u.d, u.w); }
    if (u.fighting) { ctx.strokeStyle = 'rgba(255,90,60,0.85)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(u.d / 2 + 1.5, -u.w / 2); ctx.lineTo(u.d / 2 + 1.5, u.w / 2); ctx.stroke(); }
    ctx.restore();
  }

  drawLabel(ctx, u, placed = []) {
    if (this.cam.zoom < 0.42 && !(this.selection.has(u.id) || this.hover === u.id || u.fighting || u.state === 'routing')) return;   // far out, label only what matters
    const p = this.toScreen(u.x, u.y - u.w / 2 - 4), z = this.cam.zoom;
    const yy = this.toScreen(u.x, u.y).y - Math.max(u.w, u.d) * z / 2 - 8;
    const rome = u.side === 'rome', fs = Math.max(10, Math.min(14, 11 * z + 3));
    const text = String(u.men) + (u.side === 'rome' && u.stance === 'hold' && u.active ? ' H' : '') + (u.side === 'rome' && u.rotate ? ' rot' : '') + (u.side === 'rome' && u.cycle ? ' hit' : '') + (u.side === 'rome' && u.prio ? ' >' + u.prio : ''), w = Math.max(30, 24 + text.length * 6);
    const x = p.x; let y = yy;
    const box = (yy2) => ({ x0: x - w / 2 - 2, x1: x + w / 2 + 2, y0: yy2 - 26, y1: yy2 + 7 });
    const clash = (b1) => placed.some(o => o.x0 < b1.x1 && o.x1 > b1.x0 && o.y0 < b1.y1 && o.y1 > b1.y0);
    for (const off of [0, -17, 17, -34, 34, -51]) { if (!clash(box(yy + off))) { y = yy + off; break; } }   // nudge to the nearest clear slot, never far
    placed.push(box(y));
    if (Math.abs(yy - y) > 8) { ctx.strokeStyle = 'rgba(240,230,200,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y + 6); ctx.lineTo(x, yy + 6); ctx.stroke(); }
    ctx.globalAlpha = u.state === 'routing' ? 0.7 : 1;
    ctx.fillStyle = 'rgba(15,12,8,0.78)'; ctx.fillRect(x - w / 2, y - 13, w, 15);
    ctx.fillStyle = rome ? '#f0d9a8' : '#bcd6f2'; ctx.font = `bold ${fs}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y - 5.5);
    const m = Math.max(0, Math.min(1, u.morale / u.maxMorale));
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - w / 2, y + 2, w, 3);
    ctx.fillStyle = m > 0.6 ? '#6fcf6f' : m > 0.35 ? '#e0c050' : '#d65a4a'; ctx.fillRect(x - w / 2, y + 2, w * m, 3);
    if (u.type.cat === 'ranged' && u.type.ammo) { const am = Math.max(0, Math.min(1, u.ammo / u.type.ammo)); ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - w / 2, y + 6, w, 3); ctx.fillStyle = am > 0.25 ? '#8fb4d8' : '#d2a23a'; ctx.fillRect(x - w / 2, y + 6, w * am, 3); }   // shot left
    if (u.state === 'routing') { ctx.fillStyle = '#ffd36a'; ctx.fillText('ROUT', x, y - 20); }
    else if (u.surrounded) { ctx.fillStyle = '#ff6a5a'; ctx.fillText('SURROUNDED', x, y - 20); }
    else if (u.flanked) { ctx.fillStyle = '#ffd36a'; ctx.fillText('FLANKED', x, y - 20); }
    else if (rome && u.officer && this.cam.zoom > 0.6) { ctx.fillStyle = '#e8c36a'; ctx.font = `${Math.max(9, fs - 3)}px system-ui, sans-serif`; ctx.fillText(u.officer.name.split(' ').pop(), x, y - 21); }
    ctx.globalAlpha = 1;
  }

  drawFx(ctx, f) {
    const a = f.life / f.max;
    if (f.kind === 'clash') { const t = 1 - a; ctx.fillStyle = `rgba(255,236,170,${a * 0.65})`; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.35 + t * 0.8), 0, 7); ctx.fill(); ctx.strokeStyle = `rgba(255,255,255,${a * 0.9})`; ctx.lineWidth = 1.6; ctx.beginPath(); for (let i = 0; i < 8; i++) { const an = i * 0.785 + f.x, r0 = f.r * 0.5, r1 = f.r * (0.9 + t * 0.9); ctx.moveTo(f.x + Math.cos(an) * r0, f.y + Math.sin(an) * r0); ctx.lineTo(f.x + Math.cos(an) * r1, f.y + Math.sin(an) * r1); } ctx.stroke(); return; }
    if (f.kind === 'spark') { const t = 1 - a; ctx.strokeStyle = f.hot ? `rgba(255,120,80,${a})` : `rgba(255,232,170,${a})`; ctx.lineWidth = f.hot ? 1.8 : 1.2; ctx.beginPath(); for (let i = 0; i < 3; i++) { const an = i * 2.1 + f.x * 3, r0 = 1 + t * 2, r1 = 3 + t * (f.hot ? 8 : 5); ctx.moveTo(f.x + Math.cos(an) * r0, f.y + Math.sin(an) * r0); ctx.lineTo(f.x + Math.cos(an) * r1, f.y + Math.sin(an) * r1); } ctx.stroke(); return; }
    if (f.kind === 'ring') { const t = 1 - a; ctx.strokeStyle = `rgba(255,216,120,${a * 0.8})`; ctx.lineWidth = 2.5 * a + 0.5; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.5 + t * 1.1), 0, 7); ctx.stroke(); return; }
    if (f.kind === 'pilum') { ctx.strokeStyle = `rgba(60,40,20,${a})`; ctx.lineWidth = 1.2; }
    else { ctx.strokeStyle = `rgba(240,230,200,${a * 0.9})`; ctx.lineWidth = 0.9; }
    const t = 1 - a, x = f.x1 + (f.x2 - f.x1) * t, y = f.y1 + (f.y2 - f.y1) * t - Math.sin(t * Math.PI) * 14;
    const t0 = Math.max(0, t - 0.12), x0 = f.x1 + (f.x2 - f.x1) * t0, y0 = f.y1 + (f.y2 - f.y1) * t0 - Math.sin(t0 * Math.PI) * 14;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x, y); ctx.stroke();
  }

  // Orders on their way to cohorts out of the general's sight: a rider crosses the field.
  drawMessengers(ctx, b) {
    if (!b.pending || !b.pending.length) return;
    ctx.save(); ctx.lineWidth = 1.2; ctx.setLineDash([3, 5]);
    for (const p of b.pending) {
      const k = Math.max(0, Math.min(1, (b.t - p.t0) / Math.max(0.1, p.at - p.t0))), tx = p.u.x, ty = p.u.y, x = p.x0 + (tx - p.x0) * k, y = p.y0 + (ty - p.y0) * k;
      ctx.strokeStyle = 'rgba(232,195,106,0.35)'; ctx.beginPath(); ctx.moveTo(p.x0, p.y0); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.fillStyle = '#e8c36a'; ctx.beginPath(); ctx.arc(x, y, 4.5, 0, 7); ctx.fill(); ctx.strokeStyle = '#2a1f0e'; ctx.setLineDash([]); ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([3, 5]);
    }
    ctx.restore();
  }
  drawOrders(ctx, b) {
    ctx.lineWidth = 1.6;
    for (const id of this.selection) {                                          // queued waypoints: a dotted route with numbered flags
      const u = b.byId(id); if (!u || !u.present || !u.queue || !u.queue.length) continue;
      let px = u.order.kind === 'move' ? u.order.x : u.x, py = u.order.kind === 'move' ? u.order.y : u.y;
      ctx.strokeStyle = 'rgba(255,233,168,0.7)'; ctx.fillStyle = 'rgba(255,233,168,0.9)'; ctx.setLineDash([3, 6]);
      u.queue.forEach((q, i) => { ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(q.x, q.y); ctx.stroke(); ctx.beginPath(); ctx.arc(q.x, q.y, 5, 0, 7); ctx.fill(); ctx.fillStyle = '#2a1f0e'; ctx.font = 'bold 8px system-ui'; ctx.textAlign = 'center'; ctx.fillText(String(i + 2), q.x, q.y + 3); ctx.fillStyle = 'rgba(255,233,168,0.9)'; px = q.x; py = q.y; });
      ctx.setLineDash([]);
    }
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

  // While a battle line is being drawn: the line, a ghost of each selected unit in its place, and an arrow showing which way they will face.
  drawDragPreview(ctx, b) {
    const d = this.dragLine; if (!d) return;
    const us = [...this.selection].map(id => b.byId(id)).filter(u => u && u.active && u.side === 'rome'); if (!us.length) return;
    const lay = dragLayout(us, d, d.fill), ca = Math.cos(lay.ang), sa = Math.sin(lay.ang), z = this.cam.zoom;
    ctx.save(); ctx.strokeStyle = 'rgba(232,195,106,0.9)'; ctx.lineWidth = 2.4 / z; ctx.setLineDash([9 / z, 7 / z]); ctx.beginPath(); ctx.moveTo(d.x0, d.y0); ctx.lineTo(d.x1, d.y1); ctx.stroke(); ctx.setLineDash([]);
    for (const p of lay.pts) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(lay.ang); ctx.fillStyle = 'rgba(255,233,168,0.16)'; ctx.strokeStyle = 'rgba(255,233,168,0.8)'; ctx.lineWidth = 1.4 / z; const gw = (p.u.baseW || p.u.w) * (p.wide || 1), gd = p.u.d * (p.u.wide || 1) / (p.wide || 1);       // an extended unit is wider and shallower
      ctx.fillRect(-gd / 2, -gw / 2, gd, gw); ctx.strokeRect(-gd / 2, -gw / 2, gd, gw);
      ctx.beginPath(); ctx.moveTo(gd / 2 + 2 / z, 0); ctx.lineTo(gd / 2 + 14 / z, 0); ctx.stroke(); ctx.restore(); }
    const mx = (d.x0 + d.x1) / 2, my = (d.y0 + d.y1) / 2, L = 46 / z, tipx = mx + ca * L, tipy = my + sa * L;
    ctx.strokeStyle = '#ffe9a8'; ctx.fillStyle = '#ffe9a8'; ctx.lineWidth = 3 / z; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(tipx, tipy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tipx + ca * 9 / z, tipy + sa * 9 / z); ctx.lineTo(tipx - sa * 7 / z, tipy + ca * 7 / z); ctx.lineTo(tipx + sa * 7 / z, tipy - ca * 7 / z); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // The general's banner and command ring.
  // The general is always easy to find: a gold standard pinned above him at a fixed size on screen, and an arrow at the
  // edge of the view when he is off screen. Both are click targets (see genHitTest).
  drawGeneralMarker(ctx, b) {
    const g = b.general; this.genHit = null; if (!g) return;
    const p = this.toScreen(g.x, g.y), M = 26, on = p.x > M && p.x < this.vw - M && p.y > M + 40 && p.y < this.vh - M - 70;
    const sel = this.genSel, hurt = g.wound > 0, gold = hurt ? '#e07a5f' : '#e8c36a', t = performance.now() / 1000;
    ctx.save(); ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const badge = (x, y, r) => {
      ctx.fillStyle = 'rgba(20,14,6,0.88)'; ctx.strokeStyle = gold; ctx.lineWidth = sel ? 3 : 2;
      ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = gold; ctx.beginPath();                                   // a five-pointed star
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.3 : r * 0.68; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill();
    };
    if (on) {
      const bob = sel ? 0 : Math.sin(t * 2.4) * 2, bx = p.x, by = p.y - 34 + bob, r = 13;
      ctx.strokeStyle = gold; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(p.x, p.y - 14); ctx.lineTo(bx, by + r); ctx.stroke();
      if (!sel) { ctx.strokeStyle = `rgba(232,195,106,${0.35 + 0.25 * Math.sin(t * 3)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, 20 + 3 * Math.sin(t * 3), 0, 7); ctx.stroke(); }
      badge(bx, by, r);
      ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const tx = hurt ? 'GENERAL (wounded)' : 'GENERAL', w = ctx.measureText(tx).width + 10;
      ctx.fillStyle = 'rgba(20,14,6,0.85)'; ctx.fillRect(bx - w / 2, by - r - 17, w, 14); ctx.fillStyle = gold; ctx.fillText(tx, bx, by - r - 10);
      this.genHit = { pts: [{ x: bx, y: by, r: r + 6 }, { x: p.x, y: p.y, r: Math.max(22, 20 * this.cam.zoom) }], off: false };
    } else {
      // off screen: a badge pinned to the edge, with an arrow pointing the way
      const cx = this.vw / 2, cy = this.vh / 2, dx = p.x - cx, dy = p.y - cy, top = 60, bot = this.vh - 120, left = 30, right = this.vw - 30;
      const k = Math.min(dx > 0 ? (right - cx) / dx : dx < 0 ? (left - cx) / dx : 1e9, dy > 0 ? (bot - cy) / dy : dy < 0 ? (top - cy) / dy : 1e9);
      const ex = cx + dx * k, ey = cy + dy * k, a = Math.atan2(dy, dx), r = 15;
      ctx.fillStyle = gold; ctx.beginPath(); ctx.moveTo(ex + Math.cos(a) * (r + 12), ey + Math.sin(a) * (r + 12)); ctx.lineTo(ex + Math.cos(a + 0.5) * (r + 2), ey + Math.sin(a + 0.5) * (r + 2)); ctx.lineTo(ex + Math.cos(a - 0.5) * (r + 2), ey + Math.sin(a - 0.5) * (r + 2)); ctx.closePath(); ctx.fill();
      badge(ex, ey, r);
      ctx.font = 'bold 10px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const ly = ey > this.vh / 2 ? ey - r - 9 : ey + r + 9, lw = ctx.measureText('GENERAL').width + 8; ctx.fillStyle = 'rgba(20,14,6,0.85)'; ctx.fillRect(ex - lw / 2, ly - 7, lw, 14); ctx.fillStyle = gold; ctx.fillText('GENERAL', ex, ly);
      this.genHit = { pts: [{ x: ex, y: ey, r: r + 8 }], off: true };
    }
    ctx.restore();
  }
  // Screen point -> 'on' (the general or his standard), 'off' (the edge arrow) or null.
  genHitTest(sx, sy) { const h = this.genHit; if (!h) return null; return h.pts.some(q => Math.hypot(sx - q.x, sy - q.y) <= q.r) ? (h.off ? 'off' : 'on') : null; }
  // Legates ride behind their legions, each with a smaller ring of his own.
  drawLegates(ctx, b) {
    for (const l of b.legates || []) {
      if (!l.placed) continue;
      ctx.save(); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(200,170,230,0.3)'; ctx.setLineDash([3, 8]); ctx.beginPath(); ctx.arc(l.x, l.y, l.r, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      ctx.translate(l.x, l.y); ctx.rotate(l.f); const gs = 30; ctx.drawImage(specialSprite('general'), -gs / 2, -gs / 2, gs, gs); ctx.rotate(-l.f);
      if (this.cam.zoom > 0.5) { ctx.fillStyle = 'rgba(15,12,8,0.75)'; const tx = `Legate ${l.name.split(' ').pop()}`; ctx.font = '10px system-ui, sans-serif'; const w = ctx.measureText(tx).width + 8; ctx.fillRect(-w / 2, -30, w, 13); ctx.fillStyle = '#d9c8f0'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(tx, 0, -23.5); }
      ctx.restore();
    }
  }
  drawGeneral(ctx, b) {
    const g = b.general; if (!g) return; const R = b.cmdNow(), sel = this.genSel, hurt = g.wound > 0;
    ctx.save(); ctx.lineWidth = sel ? 1.8 : 1;
    ctx.strokeStyle = hurt ? `rgba(220,110,90,${sel ? 0.7 : 0.3})` : `rgba(232,195,106,${sel ? 0.75 : 0.28})`; ctx.setLineDash(sel ? [10, 7] : [4, 9]);
    ctx.beginPath(); ctx.arc(g.x, g.y, R, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    if (g.goal) { ctx.strokeStyle = 'rgba(232,195,106,0.6)'; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(g.goal.x, g.goal.y); ctx.stroke(); ctx.setLineDash([]); }
    ctx.translate(g.x, g.y);
    ctx.rotate(g.f); const gs = 40; ctx.drawImage(specialSprite('general'), -gs / 2, -gs / 2, gs, gs);       // the general on his grey horse, in the red paludamentum
    if (sel) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, 0, 19, 0, 7); ctx.stroke(); }
    ctx.restore();
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
  // Pulsing guide rings (used for guidance markers).
  drawMarkers(ctx) {
    if (!this.markers || !this.markers.length) return;
    const t = performance.now() / 1000, z = this.cam.zoom;
    for (const m of this.markers) {
      const p = 1 + 0.18 * Math.sin(t * 4);
      ctx.strokeStyle = 'rgba(255,215,90,0.95)'; ctx.lineWidth = 3 / Math.max(0.7, z); ctx.beginPath(); ctx.arc(m.x, m.y, (m.r || 34) * p, 0, 7); ctx.stroke();
      ctx.fillStyle = 'rgba(255,215,90,0.14)'; ctx.fill();
      if (m.label) { ctx.font = `bold ${Math.max(13, 15 / Math.max(0.7, z))}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillText(m.label, m.x + 1, m.y - (m.r || 34) - 9); ctx.fillStyle = '#ffe9a8'; ctx.fillText(m.label, m.x, m.y - (m.r || 34) - 10); }
    }
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
      if (!u.present || (side && u.side !== side) || (u.side === 'gaul' && u.spotted === false)) continue;
      const dx = wx - u.x, dy = wy - u.y, c = Math.cos(-u.f), s = Math.sin(-u.f);
      const lx = dx * c - dy * s, ly = dx * s + dy * c, pad = 7 / this.cam.zoom;
      if (Math.abs(lx) <= u.d / 2 + pad && Math.abs(ly) <= u.w / 2 + pad) {
        const d = Math.hypot(dx, dy); if (d < bd) { bd = d; best = u; }
      }
    }
    return best;
  }
}
