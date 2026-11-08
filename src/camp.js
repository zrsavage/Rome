// Between-battle camp phase: spend limited days on training, foraging, fortifying, diplomacy, recruiting.
import { LEVEL_NAMES, SCENARIOS, DIFFICULTY, UNIT_TYPES, RAISE } from './data.js';
import { PERKS, perkById, LEVEL_TRAITS, UPGRADES, MAX_TIER, upgradeCost } from './perks.js';
import { levelFor } from './sim.js';
import { officerById, modsOf, hasPerk, commandLimit, unlockedTypes } from './state.js';
import { artSrc } from './art.js';

const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pct = (v, m) => Math.max(0, Math.min(100, v / m * 100));
export const totalMen = (c) => c.cohorts.reduce((a, h) => a + h.men, 0);
const bestOfficer = (c, trait) => Math.max(0, ...c.officers.filter(o => o.alive).map(o => o[trait]));

export class Camp {
  constructor(root, api) { this.root = root; this.api = api; this.sel = 1; this.c = null; this.msgs = []; this.tab = 'days'; }

  show(c) { this.c = c; if (!c.cohorts.find(h => h.id === this.sel)) this.sel = c.cohorts[0].id; this.render(); }
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
  drill(mode) {
    const c = this.c, h = this.selected();
    if (!this.canAct() || c.supplies < 8) return;
    const leader = mode === 'self' ? null : officerById(c, +mode);
    const run = (quality, who) => {
      c.supplies -= 8;
      const attached = officerById(c, h.officerId);
      const bonus = (1 + (attached ? 0.05 * attached.drill : 0)) * (who !== 'You' && leader && (leader.perks || []).includes('drillmaster') ? 1.25 : 1);
      const xp = Math.round(24 * (0.6 + quality) * bonus), dr = Math.round(7 * (0.5 + quality) * bonus);
      h.xp += xp; h.drill = Math.min(100, h.drill + dr); h.condition = Math.max(25, h.condition - 7);
      this.note(`${who} drilled ${h.name}: +${xp} XP, +${dr} drill.`, 'good');
      this.endDay(); this.render();
    };
    if (mode === 'self') this.minigame(h, (q) => run(q, 'You'));
    else { const o = officerById(c, +mode); run(0.45 + 0.1 * o.drill, `${o.rank} ${o.name}`); }
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

  // ----- drill minigame -----
  minigame(h, done) {
    const modal = document.getElementById('modal'); modal.classList.remove('hidden');
    let round = 0, score = 0, pos = 0, dir = 1, speed = 1.1 + Math.random() * 0.3, raf, last = performance.now();
    const zoneW = 0.16, zoneX = () => zl;
    let zl = 0.2 + Math.random() * 0.6;
    modal.innerHTML = `<div class="box"><h2>Drill: ${esc(h.name)}</h2><p class="muted">Call each order as the marker crosses the green zone. Five commands.</p>
      <div class="meter"><div class="zone"></div><div class="mark"></div></div>
      <div class="row" style="justify-content:center"><button class="primary" id="mg-go">Command! (Space)</button></div><p id="mg-msg" class="muted">Round 1 / 5</p></div>`;
    const zone = modal.querySelector('.zone'), mark = modal.querySelector('.mark'), msg = modal.querySelector('#mg-msg');
    const setZone = () => { zl = 0.1 + Math.random() * 0.7; zone.style.left = (zl * 100) + '%'; zone.style.width = (zoneW * 100) + '%'; };
    setZone();
    const tick = (t) => { const dt = (t - last) / 1000; last = t; pos += dir * speed * dt; if (pos > 1) { pos = 1; dir = -1; } if (pos < 0) { pos = 0; dir = 1; } mark.style.left = (pos * 100) + '%'; raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    const fin = () => { cancelAnimationFrame(raf); window.removeEventListener('keydown', key); modal.classList.add('hidden'); modal.innerHTML = ''; done(score / 5 * 1.15); };
    const go = () => {
      const centre = zl + zoneW / 2, dist = Math.abs(pos - centre);
      const pts = dist < zoneW / 2 ? 1 : Math.max(0, 1 - (dist - zoneW / 2) * 4);
      score += pts; round++;
      msg.textContent = pts > 0.9 ? 'Crisp!' : pts > 0.4 ? 'Ragged.' : 'A shambles.';
      if (round >= 5) return setTimeout(fin, 500);
      speed += 0.15; setZone(); setTimeout(() => { msg.textContent = `Round ${round + 1} / 5`; }, 600);
    };
    const key = (e) => { if (e.key === ' ') { e.preventDefault(); go(); } };
    window.addEventListener('keydown', key); modal.querySelector('#mg-go').onclick = go;
  }

  // ----- rendering -----
  render() {
    const c = this.c, scn = SCENARIOS[Math.min(c.scenario, SCENARIOS.length - 1)], diff = DIFFICULTY[c.difficulty];
    const h = this.selected(), offs = c.officers.filter(o => o.alive);
    const drillers = offs.filter(o => o.drill >= 1);
    const act = this.canAct();
    const bar = (v, m, cls = '') => `<div class="bar ${cls}"><i style="width:${pct(v, m)}%"></i></div>`;
    const rows = c.cohorts.map(x => {
      const o = officerById(c, x.officerId), lv = levelFor(x.xp);
      return `<tr class="clickable ${x.id === this.sel ? 'sel' : ''}" data-id="${x.id}">
        <td><div class="cellflex"><img class="uicon" alt="" src="${artSrc('unit', x.type, 68, 68)}"><div>${esc(x.name)}<div class="muted small">${esc(UNIT_TYPES[x.type].name)}${o ? ' - ' + esc(o.name) : ''}</div></div></div></td>
        <td>${x.men}/${x.maxMen}${bar(x.men, x.maxMen)}</td>
        <td>${LEVEL_NAMES[lv]}${bar(x.xp - [0, 100, 250, 450, 700, 1000][lv], ([0, 100, 250, 450, 700, 1000, 1300][lv + 1] || 1300) - [0, 100, 250, 450, 700, 1000][lv], 'x')}</td>
        <td>${Math.round(x.drill)}${bar(x.drill, 100, 'm')}</td><td>${Math.round(x.condition)}%${bar(x.condition, 100)}</td></tr>`;
    }).join('');
    const offRows = c.officers.map(o => `<tr class="${o.alive ? '' : 'dead'}"><td><div class="cellflex"><img class="portrait" alt="" src="${artSrc('officer', o.id, 80, 100, { title: o.name, rank: o.rank })}"><div>${esc(o.rank)} ${esc(o.name)}<div class="muted small">${esc(o.bio)}</div></div></div></td>
      <td>L${o.level}</td><td class="small">Tac ${o.tactics}<br>Drl ${o.drill}</td><td class="small">Log ${o.logistics}<br>Dip ${o.diplomacy}</td></tr>`).join('');
    const assignOpts = `<option value="">- none -</option>` + offs.map(o => `<option value="${o.id}" ${h.officerId === o.id ? 'selected' : ''}>${esc(o.name)}</option>`).join('');
    const drillBtns = drillers.map(o => `<button class="act" data-a="drill" data-m="${o.id}" ${act && c.supplies >= 8 ? '' : 'disabled'}>Delegate to ${esc(o.name)}<small>Drill ${o.drill} - steady results</small></button>`).join('');
    // --- management cards ---
    const cat = UNIT_TYPES[h.type].cat, gnames = UPGRADES[cat], lv = levelFor(h.xp), lt = LEVEL_TRAITS[lv];
    const upg = { armour: 0, weapon: 0, ...(h.upg || {}) };
    const gearBtns = ['armour', 'weapon'].map(k => { const cost = upgradeCost(h, k), maxed = cost.tier >= MAX_TIER; return `<button class="act" data-a="upgrade" data-m="${k}" ${!maxed && act && c.gold >= cost.gold && c.supplies >= cost.supplies ? '' : 'disabled'}>${esc(gnames[k])}: tier ${upg[k]}/${MAX_TIER}<small>${maxed ? 'Fully equipped' : `Upgrade for ${cost.gold} denarii, ${cost.supplies} supplies (1 day)`}</small></button>`; }).join('');
    const insOpts = '<option value="">- none -</option>' + offs.filter(o => o.drill >= 1).map(o => `<option value="${o.id}" ${h.instructorId === o.id ? 'selected' : ''}>${esc(o.name)} (drill ${o.drill})</option>`).join('');
    const detail = `<div class="detail"><h4>${esc(h.name)}</h4>
      <div class="row small"><span class="muted">Instructor:</span><select id="instr">${insOpts}</select><span class="muted">trains this unit every day for 2 supplies</span></div>
      <div class="small muted" style="margin:4px 0">${lt ? `Veteran trait: <b style="color:var(--gold)">${esc(lt.name)}</b> - ${esc(lt.text)}` : 'No veteran trait yet. Reach Veteran (level 2) for the first.'}</div>
      <div class="actions">${gearBtns}</div></div>`;
    const skills = offs.map(o => {
      const pts = o.points || 0, learned = (o.perks || []).map(id => `<span class="pill" title="${esc(perkById(id).text)}">${esc(perkById(id).name)}</span>`).join(' ');
      const avail = PERKS.filter(p => !(o.perks || []).includes(p.id) && o[p.trait] >= p.req).map(p => `<button class="act" data-a="learn" data-m="${o.id}:${p.id}" ${pts > 0 ? '' : 'disabled'}>${esc(p.name)}<small>${esc(p.text)}</small></button>`).join('');
      const locked = PERKS.filter(p => !(o.perks || []).includes(p.id) && o[p.trait] < p.req).length;
      return `<div class="skillrow"><div class="row"><b>${esc(o.name)}</b><span class="pill">${pts} skill point${pts === 1 ? '' : 's'}</span>${learned}</div>${pts > 0 && avail ? `<div class="actions">${avail}</div>` : ''}${locked ? `<div class="small muted">${locked} more skill${locked === 1 ? '' : 's'} need higher ${'ratings'}.</div>` : ''}</div>`;
    }).join('');
    const room = commandLimit(c) - c.cohorts.length;
    const raiseBtns = unlockedTypes(c).map(t => { const r = RAISE[t]; return `<button class="act" data-a="raise" data-m="${t}" ${act && room > 0 && c.gold >= r.gold && c.supplies >= r.supplies ? '' : 'disabled'}>${esc(UNIT_TYPES[t].name)}<small>${r.men} men - ${r.gold} denarii, ${r.supplies} supplies (1 day)</small></button>`; }).join('');
    const hosp = c.hospital || 0, hcost = 120 * (hosp + 1);
    const pts = offs.reduce((a, o) => a + (o.points || 0), 0);
    const tabs = [['days', `Orders (${c.daysLeft} day${c.daysLeft === 1 ? '' : 's'})`], ['legion', 'Legion and equipment'], ['officers', `Officers${pts ? ` (${pts} skill point${pts === 1 ? '' : 's'})` : ''}`], ['raise', `Raise units (${c.cohorts.length}/${commandLimit(c)})`]];
    this.root.innerHTML = `<div class="camp" data-tab="${this.tab}">
      <header><h2>Camp - ${esc(scn.theater)}, ${esc(scn.year)}</h2>
        <div class="res"><span>Denarii <b>${c.gold}</b></span><span>Supplies <b>${c.supplies}</b> <span class="muted small">(-${Math.ceil(totalMen(c) / 60 * modsOf(c).supplyUse)}/day)</span></span>
        <span>Fort <b>${c.fort}/3</b></span><span>Goodwill <b>${c.favour > 0 ? '+' : ''}${c.favour}</b></span><span>Days left <b>${c.daysLeft}</b></span><span class="pill">${esc(diff.name)}</span></div></header>
      <div class="tabs">${tabs.map(([k, l]) => `<button class="tab ${this.tab === k ? 'on' : ''}" data-tab-btn="${k}">${esc(l)}</button>`).join('')}<span style="flex:1"></span><button id="march-top" class="primary">March to battle</button><button id="map-top">Map</button></div>
      <div class="col">
        <div class="card" data-tab="legion"><h3>The Legion</h3><table><tr><th>Unit</th><th>Strength</th><th>Experience</th><th>Drill</th><th>Condition</th></tr>${rows}</table>
          <div class="row" style="margin-top:8px"><span class="muted small">Officer for ${esc(h.name)}:</span><select id="assign">${assignOpts}</select></div>${detail}</div>
        <div class="card" data-tab="raise"><h3>Raise a unit <span class="pill">${c.cohorts.length}/${commandLimit(c)} units</span></h3><div class="small muted">Your command limit grows with every battle you win or draw.${room <= 0 ? ' <b>You are at the limit.</b>' : ''}</div><div class="actions" style="margin-top:8px">${raiseBtns}</div></div>
        <div class="card" data-tab="officers"><h3>Officers</h3><table><tr><th>Name</th><th>Lvl</th><th></th><th></th></tr>${offRows}</table></div>
        <div class="card" data-tab="officers"><h3>Officer skills</h3><div class="small muted">Officers earn a skill point each level. Perks need a high enough rating in their trait. Attached officers help their unit in battle; others help the whole army.</div>${skills}</div>
      </div>
      <div class="col">
        <div class="card" data-tab="days"><h3>Orders of the day - ${c.daysLeft} day${c.daysLeft === 1 ? '' : 's'} before the enemy moves</h3>
          <div class="actions">
            <div class="grp">Training</div>
            <button class="act" data-a="drill" data-m="self" ${act && c.supplies >= 8 ? '' : 'disabled'}>Drill ${esc(h.name)} yourself<small>Take part: a timing challenge. Best possible results.</small></button>
            ${drillBtns}
            <div class="grp">Supplies and camp</div>
            <button class="act" data-a="forage" data-m="0" ${act ? '' : 'disabled'}>Forage (cautious)<small>+~${35 + 8 * bestOfficer(c, 'logistics')} supplies, safe</small></button>
            <button class="act" data-a="forage" data-m="1" ${act ? '' : 'disabled'}>Forage (wide)<small>+~${70 + 12 * bestOfficer(c, 'logistics')} supplies, risk of ambush</small></button>
            <button class="act" data-a="fortify" ${act && c.supplies >= 10 && c.fort < 3 ? '' : 'disabled'}>Fortify camp<small>10 supplies. Better morale and orderly retreats.</small></button>
            <button class="act" data-a="rest" ${act ? '' : 'disabled'}>Rest the army<small>+20 condition for every unit</small></button>
            <div class="grp">Diplomacy</div>
            <button class="act" data-a="tribute" data-m="1" ${act ? '' : 'disabled'}>Demand tribute<small>+~${90 + 15 * bestOfficer(c, 'diplomacy')} denarii, goodwill -1</small></button>
            <button class="act" data-a="tribute" data-m="0" ${act && c.gold >= 60 ? '' : 'disabled'}>Gifts to chieftains<small>-60 denarii, goodwill +1</small></button>
            <div class="grp">Manpower and care</div>
            <button class="act" data-a="recruit" ${act && h.men < h.maxMen && c.gold >= 3 ? '' : 'disabled'}>Recruit for ${esc(h.name)}<small>3 denarii per man, up to 40. Dilutes experience.</small></button>
            <button class="act" data-a="hospital" ${act && hosp < 3 && c.gold >= hcost && c.supplies >= 20 ? '' : 'disabled'}>Field hospital (level ${hosp}/3)<small>${hosp >= 3 ? 'Fully built' : `${hcost} denarii, 20 supplies: wounded recover +12% per level`}</small></button>
            <div class="grp">Intelligence</div>
            <button class="act" data-a="scout" ${act && !c.scouted ? '' : 'disabled'}>${c.scouted ? 'Enemy scouted' : 'Send scouts'}<small>Reveal exact enemy forces</small></button>
          </div></div>
        <div class="card" data-tab="days"><h3>Next battle</h3><p><b>${esc(scn.name)}</b><br><span class="muted">${esc(scn.objective)}</span></p>
          <div class="row"><button class="primary" id="march">March to battle</button><button id="tomap">Back to map</button></div></div>
        <div class="card" data-tab="days"><h3>Dispatches</h3><div class="log">${this.msgs.map(m => `<div class="${m.kind}">${esc(m.msg)}</div>`).join('') || '<div>Choose how to spend your days.</div>'}</div></div>
      </div></div>`;
    this.root.querySelectorAll('[data-tab-btn]').forEach(b => b.onclick = () => { this.tab = b.dataset.tabBtn; this.render(); });
    this.root.querySelectorAll('tr.clickable').forEach(tr => tr.onclick = () => { this.sel = +tr.dataset.id; this.render(); });
    this.root.querySelector('#instr').onchange = (e) => this.setInstructor(e.target.value ? +e.target.value : null);
    this.root.querySelector('#assign').onchange = (e) => this.assign(e.target.value ? +e.target.value : null);
    this.root.querySelectorAll('.act').forEach(b => b.onclick = () => {
      const a = b.dataset.a, m = b.dataset.m;
      if (a === 'drill') this.drill(m); else if (a === 'forage') this.forage(m === '1'); else if (a === 'learn') this.learn(m); else if (a === 'upgrade') this.upgrade(m); else if (a === 'raise') this.raise(m);
      else if (a === 'tribute') this.tribute(m === '1'); else this[a]();
    });
    this.root.querySelector('#march').onclick = () => this.api.march();
    this.root.querySelector('#march-top').onclick = () => this.api.march();
    this.root.querySelector('#map-top').onclick = () => this.api.map();
    this.root.querySelector('#tomap').onclick = () => this.api.map();
  }
}
