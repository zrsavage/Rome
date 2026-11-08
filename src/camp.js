// Between-battle camp phase: spend limited days on training, foraging, fortifying, diplomacy, recruiting.
import { LEVEL_NAMES, SCENARIOS, DIFFICULTY, UNIT_TYPES, RAISE } from './data.js';
import { PERKS, perkById, LEVEL_TRAITS, UPGRADES, MAX_TIER, upgradeCost } from './perks.js';
import { levelFor } from './sim.js';
import { officerById, modsOf, hasPerk, commandLimit, unlockedTypes } from './state.js';
import { artSrc } from './art.js';
import { inform } from './ui.js';
import { BUILDINGS, sceneSvg, advice, unlockedBuildings } from './campscene.js';

const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pct = (v, m) => Math.max(0, Math.min(100, v / m * 100));
export const totalMen = (c) => c.cohorts.reduce((a, h) => a + h.men, 0);
const bestOfficer = (c, trait) => Math.max(0, ...c.officers.filter(o => o.alive).map(o => o[trait]));

export class Camp {
  constructor(root, api) { this.root = root; this.api = api; this.sel = 1; this.c = null; this.msgs = []; this.open = null;
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.open && this.root.classList.contains('active') && document.getElementById('modal').classList.contains('hidden') && document.getElementById('confirm').classList.contains('hidden')) { this.open = null; this.render(); } });
  }

  show(c) {
    this.c = c; this.open = null; if (!c.cohorts.find(h => h.id === this.sel)) this.sel = c.cohorts[0].id;
    this.render();
    // Drip-fed buildings: introduce each new one once, in plain words.
    const seen = c.seenBuildings = c.seenBuildings || [], fresh = unlockedBuildings(c).filter(b => !seen.includes(b.id));
    if (fresh.length) { const b = fresh[0]; seen.push(b.id); this.api.save(); inform(`New in camp: the ${b.name}`, b.intro, 'Got it'); }
  }
  note(msg, kind = '') { this.msgs.unshift({ msg, kind }); this.msgs = this.msgs.slice(0, 30); }

  // Spend a day: pay upkeep, advance clock, save.
  endDay(cost = 1) {
    const c = this.c;
    for (let i = 0; i < cost; i++) {
      c.daysLeft = Math.max(0, c.daysLeft - 1); c.day++;
      const food = Math.ceil(totalMen(c) / 60 * modsOf(c).supplyUse);
      for (const h of c.cohorts) { // instructors drill their assigned cohort every day
        const ins = officerById(c, h.instructorId); if (!ins || c.supplies < 2) continue;
        c.supplies -= 2; const q = 0.35 + 0.08 * ins.drill, bonus = (ins.perks || []).includes('drillmaster') ? 1.25 : 1;
        h.xp += Math.round(10 * q * bonus); h.drill = Math.min(100, h.drill + Math.round(3 * q * bonus));
      }
      if (c.supplies >= food) c.supplies -= food;
      else { c.supplies = 0; c.cohorts.forEach(h => h.condition = Math.max(20, h.condition - 8)); this.note('The army goes hungry. Condition drops.', 'bad'); }
    }
    this.api.save();
  }
  canAct() { return this.c.daysLeft > 0; }

  selected() { return this.c.cohorts.find(h => h.id === this.sel); }

  // ----- actions -----
  // Leading the drill yourself gives a reliable good result (a little better if you rose through the ranks).
  selfQuality() { const p = this.c.player && this.c.player.picks; return p && p.career === 'ranks' ? 0.9 : 0.8; }
  drill(mode) {
    const c = this.c, h = this.selected();
    if (!this.canAct() || c.supplies < 8) return;
    const leader = mode === 'self' ? null : officerById(c, +mode);
    const quality = leader ? 0.45 + 0.1 * leader.drill : this.selfQuality();
    const who = leader ? `${leader.rank} ${leader.name}` : 'You';
    const attached = officerById(c, h.officerId);
    const bonus = (1 + (attached ? 0.05 * attached.drill : 0)) * (leader && (leader.perks || []).includes('drillmaster') ? 1.25 : 1);
    const xp = Math.round(24 * (0.6 + quality) * bonus), dr = Math.round(7 * (0.5 + quality) * bonus);
    this.drillScene(h, leader, { xp, dr }, () => {
      c.supplies -= 8; h.xp += xp; h.drill = Math.min(100, h.drill + dr); h.condition = Math.max(25, h.condition - 7);
      this.note(`${who} drilled ${h.name}: +${xp} XP, +${dr} drill.`, 'good');
      this.endDay(); this.render();
    });
  }
  forage(wide) {
    const c = this.c; if (!this.canAct()) return;
    const lg = bestOfficer(c, 'logistics');
    const got = Math.round((wide ? 70 + 12 * lg : 35 + 8 * lg) * modsOf(c).forage);
    c.supplies += got; let extra = '';
    if (wide && Math.random() < 0.35 - 0.03 * lg) {
      const h = c.cohorts[Math.floor(Math.random() * c.cohorts.length)], lost = Math.max(2, Math.round(h.men * (0.03 + Math.random() * 0.05)));
      h.men -= lost; h.condition = Math.max(25, h.condition - 8); extra = ` Gallic raiders ambushed ${h.name}: ${lost} men lost.`;
    }
    this.note(`Foraging party returns with ${got} supplies.${extra}`, extra ? 'bad' : 'good'); this.endDay(); this.render();
  }
  fortify() {
    const c = this.c; if (!this.canAct() || c.supplies < 10 || c.fort >= 3) return;
    c.supplies -= 10; c.fortWork = (c.fortWork || 0) + 1 + (bestOfficer(c, 'logistics') >= 4 ? 1 : 0);
    let msg = 'The ditch and palisade grow.';
    while (c.fortWork >= 2 && c.fort < 3) { c.fortWork -= 2; c.fort++; msg = `Camp fortifications reach level ${c.fort}.`; }
    this.note(msg, 'good'); this.endDay(); this.render();
  }
  tribute(demand) {
    const c = this.c; if (!this.canAct()) return;
    const dip = bestOfficer(c, 'diplomacy');
    if (demand) { const g = Math.round((90 + 15 * dip) * (hasPerk(c, 'tribute') ? 1.3 : 1)); c.gold += g; c.favour = Math.max(-3, c.favour - 1); this.note(`Gallic nobles are made to pay ${g} denarii. They are not pleased.`, ''); }
    else { if (c.gold < 60) return; c.gold -= 60; c.favour = Math.min(3, c.favour + (hasPerk(c, 'allies') ? 2 : 1)); this.note('Gifts to friendly chieftains win goodwill; scouts and rivals speak in your favour.', 'good'); }
    this.endDay(); this.render();
  }
  rest() { const c = this.c; if (!this.canAct()) return; c.cohorts.forEach(h => h.condition = Math.min(100, h.condition + 20)); this.note('The men rest and mend their kit.', 'good'); this.endDay(); this.render(); }
  recruit() {
    const c = this.c, h = this.selected(); if (!this.canAct()) return;
    const add = Math.min(40, h.maxMen - h.men), cost = add * 3;
    if (add <= 0 || c.gold < cost) return;
    c.gold -= cost; const old = h.men; h.men += add; h.xp = Math.round(h.xp * old / h.men);
    this.note(`${add} recruits join ${h.name} (new men dilute experience).`, ''); this.endDay(); this.render();
  }
  scout() { const c = this.c, free = hasPerk(c, 'spymaster'); if ((!free && !this.canAct()) || c.scouted) return; c.scouted = true; this.note(free ? 'Your spies report the enemy dispositions (no day spent).' : 'Scouts report the enemy dispositions.', 'good'); if (free) this.api.save(); else this.endDay(); this.render(); }
  // ----- management depth -----
  learn(spec) {
    const [oid, pid] = spec.split(':'), o = this.c.officers.find(x => x.id === +oid), p = perkById(pid);
    if (!o || !p || (o.points || 0) < 1 || o[p.trait] < p.req || (o.perks || []).includes(pid)) return;
    o.points--; o.perks = [...(o.perks || []), pid]; this.note(`${o.name} learns ${p.name}.`, 'good'); this.api.save(); this.render();
  }
  upgrade(kind) {
    const c = this.c, h = this.selected(), cost = upgradeCost(h, kind), names = UPGRADES[UNIT_TYPES[h.type].cat];
    if (!this.canAct() || cost.tier >= MAX_TIER || c.gold < cost.gold || c.supplies < cost.supplies) return;
    c.gold -= cost.gold; c.supplies -= cost.supplies; h.upg = { armour: 0, weapon: 0, ...(h.upg || {}) }; h.upg[kind]++;
    this.note(`${h.name}: ${names[kind]} upgraded to tier ${h.upg[kind]}.`, 'good'); this.endDay(); this.render();
  }
  raise(type) {
    const c = this.c, r = RAISE[type];
    if (!this.canAct() || !r || c.cohorts.length >= commandLimit(c) || c.gold < r.gold || c.supplies < r.supplies) return;
    c.gold -= r.gold; c.supplies -= r.supplies;
    const id = Math.max(0, ...c.cohorts.map(x => x.id)) + 1, n = c.cohorts.filter(x => x.type === type).length + 1;
    const name = { legionary: `${['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][c.cohorts.filter(x => x.type === 'legionary').length] || n} Cohort`, slinger: `Slingers ${n}`, archer: `Archers ${n}`, equites: `Turma ${n}`, aux_cav: `Allied Horse ${n}`, aux_inf: `Allied Infantry ${n}` }[type];
    c.cohorts.push({ id, name, type, men: r.men, maxMen: r.max, xp: 0, drill: 10, condition: 100, officerId: null });
    this.sel = id; this.note(`${name} is raised (${r.men} men).`, 'good'); this.endDay(); this.render();
  }
  hospital() {
    const c = this.c, lvl = c.hospital || 0, gold = 120 * (lvl + 1), sup = 20;
    if (!this.canAct() || lvl >= 3 || c.gold < gold || c.supplies < sup) return;
    c.gold -= gold; c.supplies -= sup; c.hospital = lvl + 1; this.note(`Field hospital reaches level ${c.hospital}: wounded recover better.`, 'good'); this.endDay(); this.render();
  }
  setInstructor(oid) { const h = this.selected(); h.instructorId = oid || null; this.api.save(); this.render(); }
  assign(oid) {
    const c = this.c, h = this.selected();
    c.cohorts.forEach(x => { if (x.officerId === oid) x.officerId = null; });
    h.officerId = oid || null; this.api.save(); this.render();
  }

  // ----- a short scene of the drill being run, by you or by the officer you chose (click or press a key to skip) -----
  drillScene(h, leader, gains, done) {
    const c = this.c, modal = document.getElementById('modal'); modal.classList.remove('hidden');
    const who = leader ? `${leader.rank} ${leader.name}` : (c.player && c.player.name) || 'You';
    const portrait = leader ? artSrc('officer', leader.id, 80, 100, { title: leader.name, rank: leader.rank }) : artSrc('officer', 'player', 80, 100, { title: (c.player && c.player.name) || 'You', rank: 'Legate' });
    const SEQ = [
      { t: 0.0, latin: 'Procedite!', en: 'Advance!', kind: 'advance' }, { t: 1.0, latin: 'Sinistrorsum!', en: 'Wheel left!', kind: 'left' },
      { t: 2.0, latin: 'Testudinem formate!', en: 'Form the testudo!', kind: 'testudo' }, { t: 3.0, latin: 'State!', en: 'Halt!', kind: 'halt' }
    ], END = 4.0, TOTAL = 5.0;
    modal.innerHTML = `<div class="box drill" id="sc-box"><div class="cellflex" style="justify-content:center;gap:10px"><img class="portrait" alt="" src="${portrait}"><div style="text-align:left"><h2 style="margin:0">${esc(h.name)} drills</h2><div class="muted small">${leader ? `${esc(who)} runs the drill` : `${esc(who)} leads the drill in person`}</div></div></div>
      <canvas id="dr-cv" width="520" height="190"></canvas><div id="dr-cmd">&nbsp;</div><div id="dr-en" class="muted">&nbsp;</div>
      <div class="drbar"><i id="dr-t"></i></div><div class="small muted" id="sc-hint">Click or press any key to skip</div></div>`;
    const cv = modal.querySelector('#dr-cv'), g = cv.getContext('2d'), bar = modal.querySelector('#dr-t');
    const dots = []; for (let r = 0; r < 5; r++) for (let f = 0; f < 12; f++) dots.push({ r, f });
    const pose = { y: 0, rot: 0, compact: 0 }, ease = (t) => 1 - (1 - t) * (1 - t), t0 = performance.now(); let raf = 0, finished = false, flash = 0;
    const draw = (t) => {
      // scripted poses, each easing in over 0.6 s from the previous order
      const step = SEQ.filter(s => t >= s.t).pop(), p = step ? Math.min(1, (t - step.t) / 0.6) : 0, e = ease(p);
      pose.y = t < 1 ? -34 * (step ? e : 0) : -34; pose.rot = t < 1 ? 0 : t < 2 ? -0.5 * e : -0.5; pose.compact = t < 2 ? 0 : t < 3 ? e : 1; flash = step && step.kind === 'halt' ? 1 - e : 0;
      if (t >= END) { pose.y *= 0.9; pose.rot *= 0.9; pose.compact *= 0.9; }
      g.clearRect(0, 0, 520, 190); g.fillStyle = '#5c5230'; g.fillRect(0, 0, 520, 190); g.fillStyle = '#6b6038'; for (let i = 0; i < 18; i++) g.fillRect(i * 31 % 520, (i * 53) % 190, 22, 3);
      g.strokeStyle = 'rgba(255,255,255,.18)'; g.setLineDash([6, 6]); g.beginPath(); g.moveTo(10, 34); g.lineTo(510, 34); g.stroke(); g.setLineDash([]);
      // the leader stands to the side with a vine staff and a crest
      g.save(); g.translate(46, 150); g.fillStyle = '#3a2a14'; g.fillRect(9, -22, 3, 40); g.fillStyle = leader ? '#a8322a' : '#e8c36a'; g.beginPath(); g.arc(0, 0, 9, 0, 7); g.fill();
      g.fillStyle = '#c9a07a'; g.beginPath(); g.arc(0, -9, 5, 0, 7); g.fill(); g.fillStyle = leader ? '#d8d2b0' : '#e8c36a'; g.fillRect(-9, -17, 18, 5); g.restore();
      g.save(); g.translate(270, 112 + pose.y); g.rotate(pose.rot);
      const sx = 17 - 7 * pose.compact, sy = 17 - 6 * pose.compact;
      if (pose.compact > 0.35) { g.fillStyle = `rgba(232,195,106,${0.16 * pose.compact})`; g.fillRect(-6 * sx - 8, -2.5 * sy - 8, 12 * sx + 16, 5 * sy + 16); g.strokeStyle = `rgba(232,195,106,${0.9 * pose.compact})`; g.lineWidth = 2; g.strokeRect(-6 * sx - 8, -2.5 * sy - 8, 12 * sx + 16, 5 * sy + 16); }
      for (const d of dots) { const x = (d.f - 5.5) * sx, y = (d.r - 2) * sy; g.fillStyle = pose.compact > 0.5 ? '#d8a03a' : '#b3261e'; g.beginPath(); g.arc(x, y, 4.4, 0, 7); g.fill(); g.fillStyle = '#e8c36a'; g.fillRect(x, y - 1.6, 3.4, 3.2); }
      g.restore();
      if (flash > 0.05) { g.fillStyle = `rgba(255,255,255,${flash * 0.25})`; g.fillRect(0, 0, 520, 190); }
    };
    const frame = (now) => {
      const t = (now - t0) / 1000; if (finished) return;
      draw(t); bar.style.width = Math.min(100, t / TOTAL * 100) + '%';
      const step = SEQ.filter(s => t >= s.t).pop(), cmd = modal.querySelector('#dr-cmd'), en = modal.querySelector('#dr-en');
      if (t < END && step) { cmd.textContent = step.latin; en.textContent = step.en; }
      else if (t >= END) { cmd.textContent = 'Dismissed.'; cmd.style.fontSize = '22px'; en.textContent = `+${gains.xp} experience, +${gains.dr} drill`; en.style.color = '#9be09b'; }
      if (t >= TOTAL) return end(); raf = requestAnimationFrame(frame);
    };
    const end = () => { if (finished) return; finished = true; cancelAnimationFrame(raf); window.removeEventListener('keydown', skip, true); modal.classList.add('hidden'); modal.innerHTML = ''; done(); };
    const skip = (e) => { e.preventDefault(); e.stopPropagation(); end(); };
    window.addEventListener('keydown', skip, true); modal.querySelector('#sc-box').onclick = end; raf = requestAnimationFrame(frame);
  }

  // ---------- rendering: the camp is a place; each building opens one small panel ----------
  unitList(cols) {
    const c = this.c, bar = (v, m, cls = '') => `<div class="bar ${cls}"><i style="width:${pct(v, m)}%"></i></div>`, XP = [0, 100, 250, 450, 700, 1000, 1300];
    const head = { str: 'Strength', exp: 'Experience', drill: 'Drill', cond: 'Condition', gear: 'Equipment' };
    return `<table><tr><th>Unit</th>${cols.map(k => `<th>${head[k]}</th>`).join('')}</tr>${c.cohorts.map(x => {
      const o = officerById(c, x.officerId), lv = levelFor(x.xp), u = { armour: 0, weapon: 0, ...(x.upg || {}) };
      const cell = { str: `<td>${x.men}/${x.maxMen}${bar(x.men, x.maxMen)}</td>`, exp: `<td>${LEVEL_NAMES[lv]}${bar(x.xp - XP[lv], (XP[lv + 1] || 1300) - XP[lv], 'x')}</td>`, drill: `<td>${Math.round(x.drill)}${bar(x.drill, 100, 'm')}</td>`, cond: `<td>${Math.round(x.condition)}%${bar(x.condition, 100)}</td>`, gear: `<td class="small">Armour ${u.armour}/3<br>Weapons ${u.weapon}/3</td>` };
      return `<tr class="clickable ${x.id === this.sel ? 'sel' : ''}" data-id="${x.id}"><td><div class="cellflex"><img class="uicon" alt="" src="${artSrc('unit', x.type, 68, 68)}"><div>${esc(x.name)}<div class="muted small">${esc(UNIT_TYPES[x.type].name)}${o ? ' - ' + esc(o.name) : ''}</div></div></div></td>${cols.map(k => cell[k]).join('')}</tr>`;
    }).join('')}</table>`;
  }

  panelBody(id) {
    const c = this.c, h = this.selected(), act = this.canAct(), offs = c.officers.filter(o => o.alive), scn = SCENARIOS[Math.min(c.scenario, SCENARIOS.length - 1)];
    const off = act ? '' : 'disabled', btn = (attrs, label, sub, ok = true) => `<button class="act" ${attrs} ${act && ok ? '' : 'disabled'}>${label}<small>${sub}</small></button>`;
    const note = act ? '' : '<div class="small" style="color:#ee9a8e;margin-top:8px">No days remain. March to battle.</div>';
    switch (id) {
      case 'praetorium': return `<p><b>${esc(scn.name)}</b>${scn.kind === 'named' ? ' <span class="pill">Named battle</span>' : ''}<br><span class="small muted">${esc(scn.geo ? scn.geo.place : '')}</span></p><p class="muted">${esc(scn.briefing)}</p><p class="small">${esc(scn.objective)}</p>
        <div class="row"><button class="primary" id="march2">March to battle</button><button id="tomap2">Back to the map</button></div>
        <h4 class="sect">Your army</h4>${this.unitList(['str', 'cond'])}`;
      case 'training': {
        const drillers = offs.filter(o => o.drill >= 1), insOpts = '<option value="">- none -</option>' + drillers.map(o => `<option value="${o.id}" ${h.instructorId === o.id ? 'selected' : ''}>${esc(o.name)} (drill ${o.drill})</option>`).join('');
        return `<p class="muted">1. Pick a cohort. 2. Choose who runs the drill. Each drill uses a day and 8 supplies.</p>${this.unitList(['str', 'exp', 'drill'])}
          <h4 class="sect">Drill ${esc(h.name)}</h4><div class="actions">${btn('data-a="drill" data-m="self"', 'Lead the drill yourself', 'You shout the orders. A reliable good result.', c.supplies >= 8)}${drillers.map(o => btn(`data-a="drill" data-m="${o.id}"`, `Let ${esc(o.name)} do it`, `Drill ${o.drill}: ${o.drill >= 4 ? 'an excellent' : o.drill >= 2 ? 'a steady' : 'a modest'} result.`, c.supplies >= 8)).join('')}</div>
          <h4 class="sect">Instructor</h4><div class="row small"><span class="muted">Trains ${esc(h.name)} automatically every day for 2 supplies:</span><select id="instr">${insOpts}</select></div>${note}`;
      }
      case 'depot': { const food = Math.ceil(totalMen(c) / 60 * modsOf(c).supplyUse), lg = bestOfficer(c, 'logistics');
        return `<div class="sumtiles"><div><b>${c.supplies}</b><span>Supplies</span></div><div><b>${food}</b><span>Eaten per day</span></div><div><b>${Math.floor(c.supplies / Math.max(1, food))}</b><span>Days of food</span></div></div>
          <div class="actions">${btn('data-a="forage" data-m="0"', 'Forage (cautious)', `About +${Math.round((35 + 8 * lg) * modsOf(c).forage)} supplies. Safe.`)}${btn('data-a="forage" data-m="1"', 'Forage (wide)', `About +${Math.round((70 + 12 * lg) * modsOf(c).forage)} supplies. Risk of an ambush.`)}</div>${note}`; }
      case 'barracks': { const room = commandLimit(c) - c.cohorts.length;
        const raise = unlockedTypes(c).map(t => { const r = RAISE[t]; return btn(`data-a="raise" data-m="${t}"`, esc(UNIT_TYPES[t].name), `${r.men} men: ${r.gold} denarii, ${r.supplies} supplies (1 day)`, room > 0 && c.gold >= r.gold && c.supplies >= r.supplies); }).join('');
        return `${this.unitList(['str', 'cond'])}<h4 class="sect">Care for the army</h4><div class="actions">${btn('data-a="rest"', 'Rest the army', '+20 condition for every unit (1 day).')}${btn('data-a="recruit"', `Recruit for ${esc(h.name)}`, '3 denarii per man, up to 40. New men dilute experience.', h.men < h.maxMen && c.gold >= 3)}${btn('data-a="fortify"', `Fortify the camp (${c.fort}/3)`, '10 supplies. Better morale and easier withdrawals.', c.supplies >= 10 && c.fort < 3)}</div>
          <h4 class="sect">Raise a unit <span class="pill">${c.cohorts.length}/${commandLimit(c)} units</span></h4><div class="small muted">Your command limit grows with every battle you win or draw.${room <= 0 ? ' <b>You are at the limit.</b>' : ''}</div><div class="actions" style="margin-top:6px">${raise}</div>${note}`; }
      case 'officers': { const pts = offs.reduce((a, o) => a + (o.points || 0), 0);
        const rows = c.officers.map(o => `<tr class="${o.alive ? '' : 'dead'}"><td><div class="cellflex"><img class="portrait" alt="" src="${artSrc('officer', o.id, 80, 100, { title: o.name, rank: o.rank })}"><div>${esc(o.rank)} ${esc(o.name)}<div class="muted small">${esc(o.bio)}</div></div></div></td><td>L${o.level}</td><td class="small">Tac ${o.tactics}<br>Drl ${o.drill}</td><td class="small">Log ${o.logistics}<br>Dip ${o.diplomacy}</td></tr>`).join('');
        const assign = `<option value="">- none -</option>` + offs.map(o => `<option value="${o.id}" ${h.officerId === o.id ? 'selected' : ''}>${esc(o.name)}</option>`).join('');
        const unitOpts = c.cohorts.map(x => `<option value="${x.id}" ${x.id === this.sel ? 'selected' : ''}>${esc(x.name)}</option>`).join('');
        const skills = offs.map(o => { const p = o.points || 0, learned = (o.perks || []).map(i => `<span class="pill" title="${esc(perkById(i).text)}">${esc(perkById(i).name)}</span>`).join(' ');
          const avail = PERKS.filter(k => !(o.perks || []).includes(k.id) && o[k.trait] >= k.req).map(k => `<button class="act" data-a="learn" data-m="${o.id}:${k.id}" ${p > 0 ? '' : 'disabled'}>${esc(k.name)}<small>${esc(k.text)}</small></button>`).join('');
          return `<div class="skillrow"><div class="row"><b>${esc(o.name)}</b><span class="pill">${p} skill point${p === 1 ? '' : 's'}</span>${learned}</div>${p > 0 && avail ? `<div class="actions">${avail}</div>` : ''}</div>`; }).join('');
        return `<table><tr><th>Officer</th><th>Lvl</th><th></th><th></th></tr>${rows}</table><h4 class="sect">Attach an officer to a unit</h4><div class="row small"><select id="assign-unit">${unitOpts}</select><span class="muted">is led by</span><select id="assign">${assign}</select></div>
          <h4 class="sect">Skills ${pts ? `<span class="pill">${pts} to spend</span>` : ''}</h4><div class="small muted">Each level earns a skill point. Perks need a high enough rating. Attached officers help their own unit; others help the whole army.</div>${skills}`; }
      case 'forge': { const cat = UNIT_TYPES[h.type].cat, names = UPGRADES[cat], lt = LEVEL_TRAITS[levelFor(h.xp)], u = { armour: 0, weapon: 0, ...(h.upg || {}) };
        const gear = ['armour', 'weapon'].map(k => { const cost = upgradeCost(h, k), maxed = cost.tier >= MAX_TIER; return btn(`data-a="upgrade" data-m="${k}"`, `${esc(names[k])}: tier ${u[k]}/${MAX_TIER}`, maxed ? 'Fully equipped.' : `Upgrade for ${cost.gold} denarii and ${cost.supplies} supplies (1 day).`, !maxed && c.gold >= cost.gold && c.supplies >= cost.supplies); }).join('');
        return `<p class="muted">Pick a unit, then upgrade its gear.</p>${this.unitList(['str', 'gear'])}<h4 class="sect">${esc(h.name)}</h4><div class="small muted" style="margin-bottom:6px">${lt ? `Veteran trait: <b style="color:var(--gold)">${esc(lt.name)}</b> - ${esc(lt.text)}` : 'No veteran trait yet. Reach Veteran (level 2) for the first.'}</div><div class="actions">${gear}</div>${note}`; }
      case 'hospital': { const hosp = c.hospital || 0, cost = 120 * (hosp + 1);
        return `<div class="sumtiles"><div><b>${hosp}/3</b><span>Hospital level</span></div><div><b>${Math.round(modsOf(c).recovery * 100)}%</b><span>Wounded recovery</span></div></div><p class="muted small">After each battle, a share of your casualties return to the ranks. Higher levels send more of them back.</p>
          <div class="actions">${btn('data-a="hospital"', `Build level ${Math.min(3, hosp + 1)}`, hosp >= 3 ? 'Fully built.' : `${cost} denarii and 20 supplies (1 day): +12% recovery.`, hosp < 3 && c.gold >= cost && c.supplies >= 20)}</div>${note}`; }
      case 'hall': { const lg = bestOfficer(c, 'diplomacy');
        return `<div class="sumtiles"><div><b>${c.favour > 0 ? '+' : ''}${c.favour}</b><span>Goodwill</span></div><div><b>${c.gold}</b><span>Denarii</span></div></div><p class="muted small">Goodwill of +2 or more makes the next enemy 10% smaller; -2 or less makes it 10% larger.</p>
          <div class="actions">${btn('data-a="tribute" data-m="1"', 'Demand tribute', `About +${Math.round((90 + 15 * lg) * (hasPerk(c, 'tribute') ? 1.3 : 1))} denarii. Goodwill -1.`)}${btn('data-a="tribute" data-m="0"', 'Gifts to the chieftains', '-60 denarii. Goodwill +1.', c.gold >= 60)}${btn('data-a="scout"', c.scouted ? 'Enemy scouted' : 'Send scouts', 'Reveal the enemy forces for the briefing.', !c.scouted)}</div>${note}`; }
      default: return '';
    }
  }

  render() {
    const c = this.c, scn = SCENARIOS[Math.min(c.scenario, SCENARIOS.length - 1)], diff = DIFFICULTY[c.difficulty];
    const visited = c.visitedBuildings = c.visitedBuildings || [], adv = advice(c, visited);
    const meta = this.open === 'praetorium' ? { name: 'Command Tent', sub: 'Your next battle and the march' } : BUILDINGS.find(b => b.id === this.open);
    const food = Math.ceil(totalMen(c) / 60 * modsOf(c).supplyUse);
    const res = `<span>Denarii <b>${c.gold}</b></span><span>Supplies <b>${c.supplies}</b> <span class="muted small">(-${food}/day)</span></span><span>Days left <b>${c.daysLeft}</b></span>`;
    this.root.innerHTML = `<div class="camp2"><header><h2>Camp - ${esc(scn.theater)}, ${esc(scn.year)}</h2><div class="res">${res}<span>Fort <b>${c.fort}/3</b></span><span>Goodwill <b>${c.favour > 0 ? '+' : ''}${c.favour}</b></span><span class="pill">${esc(diff.name)}</span></div></header>
      <div class="advice">${adv.text}</div>
      <div class="scenewrap">${sceneSvg(c, { visited, focus: adv.focus })}</div>
      <div class="campbar"><div class="muted small">${unlockedBuildings(c).length} of ${BUILDINGS.length} buildings built. Win or draw battles to build more.</div><div class="row"><button class="primary" id="march">March to battle</button><button id="tomap">Back to map</button></div></div>
      ${this.open && meta ? `<div class="overlay" id="ov"><div class="panel" role="dialog" aria-label="${esc(meta.name)}"><div class="phead"><div><h2>${esc(meta.name)}</h2><div class="muted small">${esc(meta.sub)}</div></div><div class="pres">${res}</div><button id="p-close">Back to camp</button></div><div class="pbody">${this.panelBody(this.open)}</div>${this.msgs.length ? `<div class="plog">${this.msgs.slice(0, 3).map(m => `<div class="${m.kind}">${esc(m.msg)}</div>`).join('')}</div>` : ''}</div></div>` : ''}</div>`;
    const R = this.root, q = (s) => R.querySelector(s);
    R.querySelectorAll('.bld').forEach(g => { const open = () => { this.open = g.dataset.b; if (!visited.includes(this.open) && this.open !== 'praetorium') { visited.push(this.open); this.api.save(); } this.render(); }; g.onclick = open; g.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }; });
    if (q('#ov')) { q('#ov').onclick = (e) => { if (e.target.id === 'ov') { this.open = null; this.render(); } }; q('#p-close').onclick = () => { this.open = null; this.render(); }; }
    R.querySelectorAll('tr.clickable').forEach(tr => tr.onclick = () => { this.sel = +tr.dataset.id; this.render(); });
    if (q('#instr')) q('#instr').onchange = (e) => this.setInstructor(e.target.value ? +e.target.value : null);
    if (q('#assign')) q('#assign').onchange = (e) => this.assign(e.target.value ? +e.target.value : null);
    if (q('#assign-unit')) q('#assign-unit').onchange = (e) => { this.sel = +e.target.value; this.render(); };
    R.querySelectorAll('.act').forEach(b => b.onclick = () => {
      const a = b.dataset.a, m = b.dataset.m;
      if (a === 'drill') this.drill(m); else if (a === 'forage') this.forage(m === '1'); else if (a === 'learn') this.learn(m); else if (a === 'upgrade') this.upgrade(m); else if (a === 'raise') this.raise(m);
      else if (a === 'tribute') this.tribute(m === '1'); else this[a]();
    });
    q('#march').onclick = () => this.api.march(); q('#tomap').onclick = () => this.api.map();
    if (q('#march2')) q('#march2').onclick = () => this.api.march(); if (q('#tomap2')) q('#tomap2').onclick = () => this.api.map();
    const f = adv.focus && !this.open ? R.querySelector(`.bld[data-b="${adv.focus}"]`) : null; if (f) f.focus({ preventScroll: true });
  }
}
