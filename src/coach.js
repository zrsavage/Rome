// Contextual hints for the opening battle: each appears once, at the moment it is useful, then fades.
const $ = (id) => document.getElementById(id);

const TIPS = [
  { id: 'start', when: () => true, until: ['move', 'attack'], text: 'Press <b>Q</b> to select your whole army, then <b>right-click</b> the ground ahead to advance. <b>Space</b> starts and pauses the battle, and you can still give orders while it is paused.' },
  { id: 'enemy', when: (b) => b.units.some(u => u.side === 'rome' && u.active && (b.nearestEnemy(u) || { gap: 9e9 }).gap < 330), text: 'Gauls ahead! <b>Right-click an enemy</b> to attack it, or press <b>H</b> to hold your line and let them come to you. Your cohorts throw their pila just before contact.' },
  { id: 'fight', when: (b) => b.units.some(u => u.side === 'rome' && u.fighting), text: 'The coloured arcs under a selected unit show its <span style="color:#6c6">front</span>, <span style="color:#dc4">flanks</span> and <span style="color:#e55">rear</span>. Hitting an enemy from the side or behind does far more damage, so send your cavalry around.' },
  { id: 'morale', when: (b) => b.stats.routs.gaul >= 1 || b.units.some(u => u.side === 'gaul' && u.active && u.morale < u.maxMorale * 0.45), text: 'The blue bars are morale. When one runs out the unit breaks and flees. Press on while the enemy wavers.' },
  { id: 'tired', when: (b) => b.units.some(u => u.side === 'rome' && u.active && u.fatigue > 45), text: 'Tired units fight worse. Select one and press <b>R</b> to pull it back and rest, then send it in again.' },
  { id: 'wave', when: (b) => b.reinf.some(r => r.done && r.side !== 'rome'), text: 'More raiders are arriving. Battles come in waves, so keep your cohorts together and do not chase too far.' },
  { id: 'finish', when: (b) => b.activeMen('gaul') < b.startGaul * 0.4, text: 'Nearly there. The battle is won when the enemy host falls below a quarter of its strength, so finish off the broken units.' }
];

export class Coach {
  constructor(ui) { this.ui = ui; this.shown = new Set(); this.cur = null; this.t = 0; this.acc = 0; }
  start() {
    this.active = true; this.listener = (name) => { if (this.cur && this.cur.until && this.cur.until.includes(name)) this.hide(); };
    this.ui.on(this.listener); this.hook = (dt) => this.frame(dt); this.ui.frameHooks.push(this.hook);
    $('co-ok').onclick = () => this.hide();
    this.show(TIPS[0]);
  }
  stop() { this.active = false; this.hide(); this.ui.listeners = this.ui.listeners.filter(f => f !== this.listener); this.ui.frameHooks = this.ui.frameHooks.filter(f => f !== this.hook); }
  show(tip) { this.cur = tip; this.shown.add(tip.id); this.age = 0; $('co-text').innerHTML = tip.text; $('coach').classList.remove('hidden'); }
  hide() { this.cur = null; $('coach').classList.add('hidden'); }
  frame(dt) {
    if (!this.active || this.ui.b.result) { if (this.cur) this.hide(); return; }
    if (this.cur) { if (!this.ui.paused) this.age += dt; if (this.age > 16) this.hide(); return; }
    this.acc += dt; if (this.acc < 0.5) return; this.acc = 0;
    const tip = TIPS.find(t => !this.shown.has(t.id) && t.when(this.ui.b));
    if (tip) this.show(tip);
  }
}
