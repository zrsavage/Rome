// The battle replay on the result screen: the field from above, every unit as a block in its colours, a slider to scrub through the fight,
// and marks on the slider where cohorts broke. Built from the frames the battle records every two seconds.
const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
export function replayHtml(res) {
  const rep = res.report; if (!rep || !rep.frames || rep.frames.length < 3) return '<p class="muted">No replay was recorded for this battle.</p>';
  return `<div class="replay"><canvas class="rp-canvas"></canvas><div class="rp-bar"><button class="rp-play" aria-label="Play">Play</button><div class="rp-track"><input type="range" class="rp-slider" min="0" max="${rep.frames.length - 1}" value="0" aria-label="Time in the battle"><div class="rp-marks"></div></div><span class="rp-time">0:00</span>
    <span class="rp-speeds">${[4, 8, 16].map(s => `<button class="chip rp-sp ${s === 8 ? 'sel' : ''}" data-s="${s}">${s}x</button>`).join('')}</span></div>
    <div class="small muted" style="margin-top:4px"><span style="color:#e0614f">Red</span> your units, <span style="color:#7fb3e6">blue</span> the enemy; a bright edge is a unit fighting, a faded one is running. Red marks on the slider: your cohorts broke; blue: theirs.</div></div>`;
}
export function mountReplay(root, res) {
  const rep = res.report, el = root.querySelector('.replay'); if (!el || !rep || !rep.frames) return () => {};
  const cv = el.querySelector('.rp-canvas'), sl = el.querySelector('.rp-slider'), play = el.querySelector('.rp-play'), tm = el.querySelector('.rp-time'), F = rep.frames, W = rep.world.w, H = rep.world.h;
  const bg = new Image(); if (rep.bg) bg.src = rep.bg;
  // frame the part of the field where the fighting was, not the whole map
  const xs = [], ys = []; for (const f of F) for (const u of f.units) if (u[6] !== 2) { xs.push(u[1]); ys.push(u[2]); }   // where the fighting units were (runaways ignored)
  xs.sort((p, q) => p - q); ys.sort((p, q) => p - q); const qt = (arr, q) => arr.length ? arr[Math.min(arr.length - 1, Math.floor(q * arr.length))] : 0;
  let X0 = qt(xs, 0.02), X1 = qt(xs, 0.98), Y0 = qt(ys, 0.02), Y1 = qt(ys, 0.98);
  const pad = 160; X0 = Math.max(0, X0 - pad); Y0 = Math.max(0, Y0 - pad); X1 = Math.min(W, X1 + pad); Y1 = Math.min(H, Y1 + pad);
  { const want = 0.62, cwid = X1 - X0, chei = Y1 - Y0; if (chei / cwid < want) { const add = (cwid * want - chei) / 2; Y0 = Math.max(0, Y0 - add); Y1 = Math.min(H, Y1 + add); } else { const add = (chei / want - cwid) / 2; X0 = Math.max(0, X0 - add); X1 = Math.min(W, X1 + add); } }
  const VW = X1 - X0, VH = Y1 - Y0;
  const T = F[F.length - 1].t || 1;
  el.querySelector('.rp-marks').innerHTML = rep.events.filter(e => e.kind === 'rout').map(e => `<i style="left:${(e.t / T * 100).toFixed(2)}%;background:${e.side === 'rome' ? '#e0614f' : '#7fb3e6'}" title="${mmss(e.t)} ${e.text} breaks"></i>`).join('');
  let pos = 0, playing = false, speed = 8, last = 0, raf = 0;
  const draw = () => {
    const r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1, cw = Math.max(200, r.width), ch = cw * VH / VW;
    if (cv.width !== Math.round(cw * dpr)) { cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr); cv.style.height = ch + 'px'; }
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (bg.complete && bg.naturalWidth) { const sx = bg.naturalWidth / W; g.drawImage(bg, X0 * sx, Y0 * sx, VW * sx, VH * sx, 0, 0, cw, ch); } else { g.fillStyle = '#4a6a34'; g.fillRect(0, 0, cw, ch); }
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, 0, cw, ch);
    const k = cw / VW, i0 = Math.floor(pos), i1 = Math.min(F.length - 1, i0 + 1), a = pos - i0, f0 = F[i0], f1 = F[i1], m1 = new Map(f1.units.map(u => [u[0], u]));
    for (const u of f0.units) {
      const v = m1.get(u[0]) || u, x = (u[1] + (v[1] - u[1]) * a - X0) * k, y = (u[2] + (v[2] - u[2]) * a - Y0) * k, meta = rep.meta[u[0]] || {}, rome = meta.side === 'rome';
      let ang = u[3] / 100, ang1 = v[3] / 100; let dA = ang1 - ang; while (dA > Math.PI) dA -= 2 * Math.PI; while (dA < -Math.PI) dA += 2 * Math.PI; ang += dA * a;
      const w = Math.max(3, u[4] * k), d = Math.max(2.5, u[5] * k);
      g.save(); g.translate(x, y); g.rotate(ang); g.globalAlpha = u[6] === 2 ? 0.45 : 1;
      g.fillStyle = rome ? (meta.cat === 'train' ? '#c9a46a' : '#c0392b') : (meta.cat === 'inf' && meta.name && /Laager/.test(meta.name) ? '#8a6a3a' : '#2f6fb0'); g.fillRect(-d / 2, -w / 2, d, w);
      g.strokeStyle = u[6] === 1 ? '#ffe9a8' : 'rgba(0,0,0,0.6)'; g.lineWidth = u[6] === 1 ? 1.6 : 0.8; g.strokeRect(-d / 2, -w / 2, d, w);
      g.fillStyle = rome ? '#ffd9a0' : '#d8e8ff'; g.fillRect(d / 2 - Math.max(1, d * 0.18), -w / 2, Math.max(1, d * 0.18), w);   // the front edge
      g.restore();
    }
    if (f0.g) { const gx = f0.g[0] + ((f1.g || f0.g)[0] - f0.g[0]) * a, gy = f0.g[1] + ((f1.g || f0.g)[1] - f0.g[1]) * a; g.fillStyle = '#e8c36a'; g.strokeStyle = '#2a1f0e'; g.lineWidth = 1.2; g.beginPath(); g.arc((gx - X0) * k, (gy - Y0) * k, 4.5, 0, 7); g.fill(); g.stroke(); }
    const t = f0.t + ((f1.t || f0.t) - f0.t) * a; tm.textContent = `${mmss(t)} / ${mmss(T)}`; sl.value = Math.round(pos);
  };
  const step = (now) => { if (!playing) return; const dt = Math.min(0.1, (now - last) / 1000); last = now; pos += dt * speed / 2; if (pos >= F.length - 1) { pos = F.length - 1; playing = false; play.textContent = 'Play'; } draw(); raf = requestAnimationFrame(step); };
  play.onclick = () => { playing = !playing; play.textContent = playing ? 'Pause' : 'Play'; if (playing) { if (pos >= F.length - 1) pos = 0; last = performance.now(); raf = requestAnimationFrame(step); } };
  sl.oninput = () => { pos = +sl.value; draw(); };
  el.querySelectorAll('.rp-sp').forEach(b => b.onclick = () => { speed = +b.dataset.s; el.querySelectorAll('.rp-sp').forEach(x => x.classList.toggle('sel', x === b)); });
  bg.onload = draw; draw();
  return () => { playing = false; cancelAnimationFrame(raf); };
}
