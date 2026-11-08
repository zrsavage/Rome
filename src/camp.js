// Between-battle camp phase: spend limited days on training, foraging, fortifying, diplomacy, recruiting.
import { LEVEL_NAMES, SCENARIOS, DIFFICULTY, UNIT_TYPES } from './data.js';
import { levelFor } from './sim.js';
import { officerById } from './state.js';

const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pct = (v, m) => Math.max(0, Math.min(100, v / m * 100));
export const totalMen = (c) => c.cohorts.reduce((a, h) => a + h.men, 0);
const bestOfficer = (c, trait) => Math.max(0, ...c.officers.filter(o => o.alive).map(o => o[trait]));

export class Camp {
  constructor(root, api) { this.root = root; this.api = api; this.sel = 1; this.c = null; this.msgs = []; }

  show(c) { this.c = c; if (!c.cohorts.find(h => h.id === this.sel)) this.sel = c.cohorts[0].id; this.render(); }
  note(msg, kind = '') { this.msgs.unshift({ msg, kind }); this.msgs = this.msgs.slice(0, 30); }

  // Spend a day: pay upkeep, advance clock, save.
  endDay(cost = 1) {
    const c = this.c;
    for (let i = 0; i < cost; i++) {
      c.daysLeft = Math.max(0, c.daysLeft - 1); c.day++;
      const food = Math.ceil(totalMen(c) / 60);
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
    const run = (quality, who) => {
      c.supplies -= 8;
      const attached = officerById(c, h.officerId);
      const bonus = 1 + (attached ? 0.05 * attached.drill : 0);
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
    const got = wide ? 70 + 12 * lg : 35 + 8 * lg;
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
    if (demand) { const g = 90 + 15 * dip; c.gold += g; c.favour = Math.max(-3, c.favour - 1); this.note(`Gallic nobles are made to pay ${g} denarii. They are not pleased.`, ''); }
    else { if (c.gold < 60) return; c.gold -= 60; c.favour = Math.min(3, c.favour + 1); this.note('Gifts to friendly chieftains win goodwill; scouts and rivals speak in your favour.', 'good'); }
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
  scout() { const c = this.c; if (!this.canAct() || c.scouted) return; c.scouted = true; this.note('Scouts report the enemy dispositions.', 'good'); this.endDay(); this.render(); }
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
    const c = this.c, scn = SCENARIOS[c.scenario % SCENARIOS.length], diff = DIFFICULTY[c.difficulty];
    const h = this.selected(), offs = c.officers.filter(o => o.alive);
    const drillers = offs.filter(o => o.drill >= 1);
    const act = this.canAct();
    const bar = (v, m, cls = '') => `<div class="bar ${cls}"><i style="width:${pct(v, m)}%"></i></div>`;
    const rows = c.cohorts.map(x => {
      const o = officerById(c, x.officerId), lv = levelFor(x.xp);
      return `<tr class="clickable ${x.id === this.sel ? 'sel' : ''}" data-id="${x.id}">
        <td>${esc(x.name)}<div class="muted small">${esc(UNIT_TYPES[x.type].name)}${o ? ' - ' + esc(o.name) : ''}</div></td>
        <td>${x.men}/${x.maxMen}${bar(x.men, x.maxMen)}</td>
        <td>${LEVEL_NAMES[lv]}${bar(x.xp - [0, 100, 250, 450, 700, 1000][lv], ([0, 100, 250, 450, 700, 1000, 1300][lv + 1] || 1300) - [0, 100, 250, 450, 700, 1000][lv], 'x')}</td>
        <td>${Math.round(x.drill)}${bar(x.drill, 100, 'm')}</td><td>${Math.round(x.condition)}%${bar(x.condition, 100)}</td></tr>`;
    }).join('');
    const offRows = c.officers.map(o => `<tr class="${o.alive ? '' : 'dead'}"><td>${esc(o.rank)} ${esc(o.name)}<div class="muted small">${esc(o.bio)}</div></td>
      <td>L${o.level}</td><td class="small">Tac ${o.tactics}<br>Drl ${o.drill}</td><td class="small">Log ${o.logistics}<br>Dip ${o.diplomacy}</td></tr>`).join('');
    const assignOpts = `<option value="">- none -</option>` + offs.map(o => `<option value="${o.id}" ${h.officerId === o.id ? 'selected' : ''}>${esc(o.name)}</option>`).join('');
    const drillBtns = drillers.map(o => `<button class="act" data-a="drill" data-m="${o.id}" ${act && c.supplies >= 8 ? '' : 'disabled'}>Delegate to ${esc(o.name)}<small>Drill ${o.drill} - steady results</small></button>`).join('');
    this.root.innerHTML = `<div class="camp">
      <header><h2>Camp - ${esc(scn.theater)}, ${esc(scn.year)}</h2>
        <div class="res"><span>Denarii <b>${c.gold}</b></span><span>Supplies <b>${c.supplies}</b> <span class="muted small">(-${Math.ceil(totalMen(c) / 60)}/day)</span></span>
        <span>Fort <b>${c.fort}/3</b></span><span>Goodwill <b>${c.favour > 0 ? '+' : ''}${c.favour}</b></span><span>Days left <b>${c.daysLeft}</b></span><span class="pill">${esc(diff.name)}</span></div></header>
      <div class="col">
        <div class="card"><h3>The Legion</h3><table><tr><th>Unit</th><th>Strength</th><th>Experience</th><th>Drill</th><th>Condition</th></tr>${rows}</table>
          <div class="row" style="margin-top:8px"><span class="muted small">Officer for ${esc(h.name)}:</span><select id="assign">${assignOpts}</select></div></div>
        <div class="card"><h3>Officers</h3><table><tr><th>Name</th><th>Lvl</th><th></th><th></th></tr>${offRows}</table></div>
      </div>
      <div class="col">
        <div class="card"><h3>Orders of the day - ${c.daysLeft} day${c.daysLeft === 1 ? '' : 's'} before the enemy moves</h3>
          <div class="actions">
            <button class="act" data-a="drill" data-m="self" ${act && c.supplies >= 8 ? '' : 'disabled'}>Drill ${esc(h.name)} yourself<small>Take part: a timing challenge. Best possible results.</small></button>
            ${drillBtns}
            <button class="act" data-a="forage" data-m="0" ${act ? '' : 'disabled'}>Forage (cautious)<small>+~${35 + 8 * bestOfficer(c, 'logistics')} supplies, safe</small></button>
            <button class="act" data-a="forage" data-m="1" ${act ? '' : 'disabled'}>Forage (wide)<small>+~${70 + 12 * bestOfficer(c, 'logistics')} supplies, risk of ambush</small></button>
            <button class="act" data-a="fortify" ${act && c.supplies >= 10 && c.fort < 3 ? '' : 'disabled'}>Fortify camp<small>10 supplies. Better morale and orderly retreats.</small></button>
            <button class="act" data-a="rest" ${act ? '' : 'disabled'}>Rest the army<small>+20 condition for every unit</small></button>
            <button class="act" data-a="tribute" data-m="1" ${act ? '' : 'disabled'}>Demand tribute<small>+~${90 + 15 * bestOfficer(c, 'diplomacy')} denarii, goodwill -1</small></button>
            <button class="act" data-a="tribute" data-m="0" ${act && c.gold >= 60 ? '' : 'disabled'}>Gifts to chieftains<small>-60 denarii, goodwill +1</small></button>
            <button class="act" data-a="recruit" ${act && h.men < h.maxMen && c.gold >= 3 ? '' : 'disabled'}>Recruit for ${esc(h.name)}<small>3 denarii per man, up to 40. Dilutes experience.</small></button>
            <button class="act" data-a="scout" ${act && !c.scouted ? '' : 'disabled'}>${c.scouted ? 'Enemy scouted' : 'Send scouts'}<small>Reveal exact enemy forces</small></button>
          </div></div>
        <div class="card"><h3>Next battle</h3><p><b>${esc(scn.name)}</b><br><span class="muted">${esc(scn.objective)}</span></p>
          <div class="row"><button class="primary" id="march">March to battle</button><button id="menu">Main menu</button></div></div>
        <div class="card"><h3>Dispatches</h3><div class="log">${this.msgs.map(m => `<div class="${m.kind}">${esc(m.msg)}</div>`).join('') || '<div>Choose how to spend your days.</div>'}</div></div>
      </div></div>`;
    this.root.querySelectorAll('tr.clickable').forEach(tr => tr.onclick = () => { this.sel = +tr.dataset.id; this.render(); });
    this.root.querySelector('#assign').onchange = (e) => this.assign(e.target.value ? +e.target.value : null);
    this.root.querySelectorAll('.act').forEach(b => b.onclick = () => {
      const a = b.dataset.a, m = b.dataset.m;
      if (a === 'drill') this.drill(m); else if (a === 'forage') this.forage(m === '1');
      else if (a === 'tribute') this.tribute(m === '1'); else this[a]();
    });
    this.root.querySelector('#march').onclick = () => this.api.march();
    this.root.querySelector('#menu').onclick = () => this.api.menu();
  }
}
