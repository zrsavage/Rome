// Screen audit: node tools/uiaudit.cjs [outDir]
// Opens a battle with armies of 5, 20 and 60 mixed units at three screen sizes, selects a unit (so the unit panel and the order bar
// show), and measures how much of the screen the battle interface covers. Saves a screenshot of each case. Exits 1 if any limit is broken.
// Limits: the whole interface under 18% of the screen, the unit-card strip under 8%, nothing off screen that is not in a scrolling strip.
// (Written after the unit cards grew to cover a fifth of the screen with a big army, which no earlier check measured.)
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), OUT = process.argv[2] || path.join(ROOT, 'tools', 'uiaudit-shots');
const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg' };
const SIZES = [[800, 600], [1366, 768], [1920, 1080]], ARMIES = [5, 20, 60];
const LIMIT_ALL = 0.18, LIMIT_STRIP = 0.08;
(async () => {
  const { newCampaign } = await import(path.join(ROOT, 'src/state.js')); const { SCENARIOS, RAISE } = await import(path.join(ROOT, 'src/data.js')); const { renameArmy } = await import(path.join(ROOT, 'src/names.js'));
  const sc = SCENARIOS.findIndex(s => s.id === 'ariovistus');           // an open battle: the whole army deploys at once
  const make = (n) => {
    const c = newCampaign('normal');
    Object.assign(c, { slot: 1, prologueDone: true, introShown: true, scenario: sc, gold: 3000, supplies: 3000, routeFor: SCENARIOS[sc].id, britain: 'go', actsSeen: ['II', 'B', 'G', 'III', 'IV', 'V', 'VI'], eventFor: sc, winterFor: SCENARIOS[sc].act, bonusCommand: 80,
      tipsSeen: ['pay', 'slots', 'stores', 'works', 'spec', 'medici', 'rome', 'evocati', 'ballista', 'codex'], doctrines: ['hold', 'fallback', 'testudo', 'relieve', 'rotate', 'orbis', 'lanes', 'extend', 'wedge'] });
    c.history = [{ id: 'prologue', outcome: 'victory' }, ...SCENARIOS.slice(0, sc).map(s => ({ id: s.id, outcome: 'victory' }))];
    const kinds = ['legionary', 'legionary', 'slinger', 'legionary', 'equites', 'archer', 'legionary', 'aux_cav', 'legionary', 'aux_inf'];
    c.cohorts = []; for (let i = 0; i < n; i++) { const t = kinds[i % kinds.length], m = (RAISE[t] && RAISE[t].max) || 300; c.cohorts.push({ id: i + 1, name: '', type: t, men: m, maxMen: m, xp: 300, drill: 30, condition: 90, officerId: null }); }
    c.cohorts[0].officerId = 1; renameArmy(c); c.version = 9; return JSON.stringify(c);
  };
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch(); let bad = 0; const rows = [];
  for (const [W, H] of SIZES) for (const n of ARMIES) {
    const p = await b.newPage({ viewport: { width: W, height: H } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.route('http://game.local/**', async r => { const u = new URL(r.request().url()); let f = path.join(ROOT, decodeURIComponent(u.pathname)); if (u.pathname === '/') f = path.join(ROOT, 'index.html'); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: '' }); r.fulfill({ status: 200, body: fs.readFileSync(f), headers: { 'content-type': types[path.extname(f)] || 'application/octet-stream' } }); });
    await p.route(/^https?:\/\/(?!game\.local)/, r => r.abort()); await p.route(/\.mp3$/, r => r.abort());
    await p.addInitScript(s => { localStorage.setItem('legio_slot_1_v2', s); }, make(n));
    const dismiss = async () => { for (let k = 0; k < 5; k++) { const bt = await p.$('#confirm:not(.hidden) .evchoice:not([disabled]), #confirm:not(.hidden) button, #modal:not(.hidden) button'); if (!bt) break; await bt.click(); await p.waitForTimeout(250); } };
    try {
      await p.goto('http://game.local/'); await p.waitForTimeout(900); await p.click('[data-a=load]'); await p.waitForTimeout(900); await dismiss();
      await p.click('#m-march'); await p.waitForTimeout(500); await dismiss(); await p.evaluate(() => document.getElementById('go').click()); await p.waitForTimeout(1300); await dismiss();
      await p.click('#hud-bottom .ucard[data-id] >> nth=0'); await p.waitForTimeout(400);
      await p.evaluate(() => { const bn = document.getElementById('banner'); if (bn) bn.classList.add('hidden'); });   // the deployment banner is a passing message
      const m = await p.evaluate(() => {
        const ids = ['hud-top', 'hud-left', 'hud-bottom', 'hud-cmds', 'hud-sel', 'hud-log'], rects = [];
        const push = (id, r) => { if (r.width > 2 && r.height > 2) rects.push({ id, x0: Math.max(0, r.left), y0: Math.max(0, r.top), x1: Math.min(innerWidth, r.right), y1: Math.min(innerHeight, r.bottom) }); };
        for (const id of ids) { const el = document.getElementById(id); if (!el) continue; const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
          // the top bar and the card strip are see-through bands: what covers the field is what is in them
          if (id === 'hud-top' || id === 'hud-bottom') { for (const ch of el.children) { const cc = getComputedStyle(ch); if (cc.display !== 'none' && cc.visibility !== 'hidden' && !ch.classList.contains('spacer')) push(id, ch.getBoundingClientRect()); } }
          else push(id, el.getBoundingClientRect()); }
        let hit = 0, tot = 0; const step = 6;
        for (let y = 0; y < innerHeight; y += step) for (let x = 0; x < innerWidth; x += step) { tot++; if (rects.some(r => x >= r.x0 && x < r.x1 && y >= r.y0 && y < r.y1)) hit++; }
        const area = (r) => r ? Math.max(0, r.x1 - r.x0) * Math.max(0, r.y1 - r.y0) / (innerWidth * innerHeight) : 0, sb = document.getElementById('hud-bottom').getBoundingClientRect(), strip = { x0: 0, y0: sb.top, x1: innerWidth, y1: sb.bottom };
        const off = [...document.querySelectorAll('#screen-battle button, #screen-battle .ucard')].filter(e => { const r = e.getBoundingClientRect(); if (!r.width) return false; const inStrip = e.closest('#hud-bottom'); return !inStrip && (r.right > innerWidth + 1 || r.bottom > innerHeight + 1 || r.left < -1); }).map(e => (e.id || e.className) + ' ' + e.textContent.trim().slice(0, 20));
        return { all: hit / tot, strip: area(strip), parts: rects.reduce((o, r) => (o[r.id] = +((o[r.id] || 0) + area(r) * 100).toFixed(1), o), {}), off, cards: document.querySelectorAll('#hud-bottom .ucard').length };
      });
      const shot = path.join(OUT, `battle_${W}x${H}_${n}units.png`); await p.screenshot({ path: shot });
      const probs = []; if (m.all > LIMIT_ALL) probs.push(`interface covers ${(m.all * 100).toFixed(1)}% (limit ${LIMIT_ALL * 100}%)`); if (m.strip > LIMIT_STRIP) probs.push(`card strip ${(m.strip * 100).toFixed(1)}% (limit ${LIMIT_STRIP * 100}%)`);
      if (m.off.length) probs.push('off screen: ' + m.off.slice(0, 3).join(', ')); if (errs.length) probs.push('page errors: ' + errs.slice(0, 2).join(' / '));
      if (probs.length) bad++;
      rows.push(`${String(W + 'x' + H).padEnd(10)} ${String(n).padStart(3)} units: interface ${(m.all * 100).toFixed(1).padStart(4)}%  strip ${(m.strip * 100).toFixed(1).padStart(4)}%  ${JSON.stringify(m.parts)}${probs.length ? '\n      BROKEN: ' + probs.join('; ') : ''}`);
    } catch (e) { bad++; rows.push(`${W}x${H} ${n} units: FAILED ${e.message.split('\n')[0]}`); }
    await p.close();
  }
  // the Barracks with a big mixed army: every kind of unit in one group, and a unit opened shows its record
  { const p = await b.newPage({ viewport: { width: 1366, height: 768 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.route('http://game.local/**', async r => { const u = new URL(r.request().url()); let f = path.join(ROOT, decodeURIComponent(u.pathname)); if (u.pathname === '/') f = path.join(ROOT, 'index.html'); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: '' }); r.fulfill({ status: 200, body: fs.readFileSync(f), headers: { 'content-type': types[path.extname(f)] || 'application/octet-stream' } }); });
    await p.route(/^https?:\/\/(?!game\.local)/, r => r.abort()); await p.route(/\.mp3$/, r => r.abort());
    await p.addInitScript(s => { localStorage.setItem('legio_slot_1_v2', s); }, make(40));
    const dismiss = async () => { for (let k = 0; k < 5; k++) { const bt = await p.$('#confirm:not(.hidden) .evchoice:not([disabled]), #confirm:not(.hidden) button, #modal:not(.hidden) button'); if (!bt) break; await bt.click(); await p.waitForTimeout(250); } };
    try {
      await p.goto('http://game.local/'); await p.waitForTimeout(900); await p.click('[data-a=load]'); await p.waitForTimeout(900); await dismiss();
      await p.click('#m-camp'); await p.waitForTimeout(800); await dismiss();
      const h = await p.$('.bld[data-b=barracks]'); await h.evaluate(e => e.dispatchEvent(new MouseEvent('click', { bubbles: true }))); await p.waitForTimeout(600);
      const groups = await p.$$eval('.mgrp', a => a.map(x => x.childNodes[0].textContent.trim())), dup = groups.filter((g, i) => groups.indexOf(g) !== i);
      await p.click('.mtile >> nth=0'); await p.waitForTimeout(400);
      const stats = await p.$$eval('.unitrec .statrow', a => a.length), facts = await p.$$eval('.mfacts > div', a => a.length);
      await p.screenshot({ path: path.join(OUT, 'barracks_unit.png') });
      const probs = []; if (dup.length) probs.push('unit kinds split into several groups: ' + [...new Set(dup)].join(', ')); if (!stats || !facts) probs.push(`an opened unit shows ${stats} stat rows and ${facts} facts`); if (errs.length) probs.push('page errors: ' + errs.slice(0, 2).join(' / '));
      if (probs.length) bad++;
      rows.push(`Barracks, 40 mixed units: ${groups.length} groups (${groups.join(', ')}); opened unit: ${stats} stat rows, ${facts} facts${probs.length ? '\n      BROKEN: ' + probs.join('; ') : ''}`);
    } catch (e) { bad++; rows.push('Barracks: FAILED ' + e.message.split('\n')[0]); }
    await p.close(); }
  await b.close();
  console.log(`SCREEN AUDIT (screenshots in ${OUT})\n  ` + rows.join('\n  ') + (bad ? `\n  ${bad} case(s) broke a limit` : '\n  ALL WITHIN LIMITS'));
  process.exit(bad ? 1 : 0);
})();
