// Contextual hints for the opening battle: each appears once, at the moment it is useful, then fades.
const $ = (id) => document.getElementById(id);

const TIPS = [
  { id: 'start', when: () => true, until: ['move', 'attack'], text: 'Press <b>Q</b> to select your whole army, then <b>right-click</b> the ground ahead to advance. <b>Space</b> starts and pauses the battle, and you can still give orders while it is paused.' },
  { id: 'enemy', when: (b) => b.units.some(u => u.side === 'rome' && u.active && (b.nearestEnemy(u) || { gap: 9e9 }).gap < 330), text: 'Gauls ahead! <b>Right-click an enemy</b> to attack it, or simply wait for them: a unit fights whatever comes near it, then goes back to its place. Your cohorts throw their pila just before contact. More orders (holding a position, falling back) are taught at the training ground in camp.' },
  { id: 'fight', when: (b) => b.units.some(u => u.side === 'rome' && u.fighting), text: 'The coloured arcs under a selected unit show its <span style="color:#6c6">front</span>, <span style="color:#dc4">flanks</span> and <span style="color:#e55">rear</span>. Hitting an enemy from the side or behind does far more damage, so send your cavalry around.' },
  { id: 'morale', when: (b) => b.stats.routs.gaul >= 1 || b.units.some(u => u.side === 'gaul' && u.active && u.morale < u.maxMorale * 0.45), text: 'The blue bars are morale. When one runs out the unit breaks and flees. Press on while the enemy wavers.' },
  { id: 'tired', when: (b) => b.units.some(u => u.side === 'rome' && u.active && u.fatigue > 45), text: 'Tired units fight worse. Right-click behind your line to pull one back and rest, then send it in again.' },
  { id: 'command', when: (b) => b.general && b.t > 20 && b.units.some(u => u.side === 'rome' && u.active && !b.inCommand(u)), text: 'A cohort has strayed outside the <b>gold command ring</b> around your general. Out there it recovers morale slowly and charges raggedly. Press <b>E</b> (or click the banner) to select the general, then <b>right-click</b> to move the ring where it is needed.' },
  { id: 'wave', when: (b) => b.reinf.some(r => r.done && r.side !== 'rome'), text: 'More enemies have appeared that you did not expect. Keep your cohorts together and do not chase too far.' },
  { id: 'finish', when: (b) => b.activeMen('gaul') < b.startGaul * 0.4, text: 'Nearly there. The battle is won when the enemy host falls below a quarter of its strength, so finish off the broken units.' }
];

export class Coach {
  constructor(ui) { this.ui = ui; this.shown = new Set(); this.cur = null; this.t = 0; this.acc = 0; }
  start() {
    this.active = true; this.listener = (name) => { if (this.cur && this.cur.until && this.cur.until.includes(name)) this.hide(); };
    this.ui.on(this.listener); this.hook = (dt) => this.frame(dt); this.ui.frameHooks.push(this.hook);
    setTimeout(() => { if (this.active && !this.cur) this.show(TIPS[0]); }, 1800);
  }
  stop() { this.active = false; this.hide(); this.ui.listeners = this.ui.listeners.filter(f => f !== this.listener); this.ui.frameHooks = this.ui.frameHooks.filter(f => f !== this.hook); }
  show(tip) { this.cur = tip; this.shown.add(tip.id); this.age = 0; this.gap = 0; clearTimeout(this._ft); $('co-text').innerHTML = tip.text; $('coach').classList.remove('hidden', 'fade'); }
  hide() { this.cur = null; const el = $('coach'); el.classList.add('fade'); clearTimeout(this._ft); this._ft = setTimeout(() => el.classList.add('hidden'), 700); }
  frame(dt) {
    if (!this.active || this.ui.b.result) { if (this.cur) this.hide(); return; }
    if (this.cur) { this.age += dt; if (this.age > Math.max(7, this.cur.text.replace(/<[^>]+>/g, '').length / 16)) this.hide(); return; }   // a tip leaves by itself, paused or not
    this.gap = (this.gap || 0) + dt; if (this.gap < 5) return;                                                                      // breathing room between tips
    this.acc += dt; if (this.acc < 0.5) return; this.acc = 0;
    const tip = TIPS.find(t => !this.shown.has(t.id) && t.when(this.ui.b));
    if (tip) this.show(tip);
  }
}
