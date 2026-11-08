// Guided tutorial: watches what the player actually does and advances step by step.
import { esc } from './ui.js';

const $ = (id) => document.getElementById(id);
const find = (b, tag) => b.units.find(u => u.ai && u.ai.tag === tag);
const release = (b, tag) => { const u = find(b, tag); if (u && u.active) { u.ai = { ...u.ai, kind: 'rush', delay: 0 }; u.stance = 'aggressive'; } };
const gone = (u) => !u || !u.present || u.state === 'routing';

const STEPS = [
  { id: 'cam', title: 'Look around', hl: [], text: 'First zoom in with the <b>mouse wheel</b> (the whole battlefield is on screen, so there is nothing to pan yet). Then move the camera with <b>W A S D</b> or the arrow keys.',
    enter: (t) => { t.cam0 = { x: t.ui.r.cam.x, y: t.ui.r.cam.y, z: t.ui.r.cam.zoom }; },
    check: (t) => { const c = t.ui.r.cam; return Math.hypot(c.x - t.cam0.x, c.y - t.cam0.y) > 40 && Math.abs(c.zoom / t.cam0.z - 1) > 0.05; } },
  { id: 'select', title: 'Select a cohort', hl: ['hud-bottom'], text: 'Left-click one of your red cohorts, or click its card at the bottom of the screen. Drag a box to select several; <b>Q</b> selects everything.',
    check: (t) => t.ui.selected().length >= 1 },
  { id: 'move', title: 'Give a move order', hl: [], text: 'With a unit selected, <b>right-click</b> open ground ahead of it. The dashed line, flag and ghost show where it will stand and which way it will face.',
    marker: { x: 800, y: 700, label: 'Right-click near here' }, check: (t) => t.flags.move },
  { id: 'line', title: 'Draw a battle line', hl: [], text: 'Press <b>Q</b> to select everyone. Now hold the <b>right mouse button</b> and drag a line across the field. Your units spread along it and face away from the drag direction.',
    check: (t) => t.flags.move && t.flags.move.drag && t.flags.move.count >= 2 },
  { id: 'pause', title: 'Pause and plan', hl: ['btn-pause'], text: 'Press <b>Space</b> to pause. You can still give orders while paused, and they take effect when you resume. Pause, give any order, then press Space again.',
    enter: (t) => { t.pauseSeen = false; t.orderPaused = false; },
    check: (t) => { if (t.ui.paused) { t.pauseSeen = true; if (t.flags.move || t.flags.attack) t.orderPaused = true; } return t.pauseSeen && t.orderPaused && !t.ui.paused; },
    onEvent: (t, n) => { if (n === 'pause' && t.ui.paused) { t.flags.move = null; t.flags.attack = null; } } },
  { id: 'arcs', title: 'Read the arcs and ranges', hl: [], text: 'Select a unit. The coloured arcs around it show its <span style="color:#6c6">front</span>, <span style="color:#dc4">flanks</span> and <span style="color:#e55">rear</span>. Attacks from the side or behind hit far harder, for you and for the enemy. Press <b>V</b> to show every unit\'s range rings.',
    check: (t) => t.flags.range },
  { id: 'formation', title: 'Close order (testudo)', hl: [], text: 'Select a legionary cohort and press <b>T</b>. Close order is slower and weaker in attack, but much tougher against missiles and frontal attack. Press T again to return to normal order.',
    check: (t) => t.flags.formation },
  { id: 'groups', title: 'Control groups', hl: [], text: 'Select some units and press <b>Ctrl + 1</b> to save them as group 1. Press <b>1</b> to recall them later; double-tap to centre the camera on them.',
    check: (t) => t.flags.groupSet },
  { id: 'ranged', title: 'Skirmishers', hl: [], text: 'The Balearic slingers fire on their own once an enemy is in range (see their ring with V). Move them up behind your cohorts and shoot the lone warband <b>in the middle of the field</b>. It will not move unless touched.',
    markerUnit: 'dummy', check: (t) => t.b.stats.rangedKills >= 6 || gone(find(t.b, 'dummy')) },
  { id: 'hold', title: 'Receive a charge', hl: [], text: 'Warband A is charging! Select your cohorts and press <b>H</b> to hold the line. Your pila hit as they close, then the gladius does the work. Watch morale (the blue bars) and fatigue: tired units fight badly, so press <b>R</b> to pull them back and rest. Units that lose morale will rout.',
    enter: (t) => { release(t.b, 'A'); t.b.say('A Gallic warband charges!', 'warn'); }, check: (t) => gone(find(t.b, 'A')) },
  { id: 'flank', title: 'Hit the flank', hl: [], text: 'Warband B advances on the other side. Send your <b>cavalry</b> or a spare cohort at it from the side or rear (its red or yellow arc). Flank and rear attacks do far more damage and shake morale.',
    enter: (t) => { release(t.b, 'B'); t.b.say('A second warband advances!', 'warn'); }, markerUnit: 'B',
    check: (t) => t.b.stats.flankTime + t.b.stats.rearTime >= 3 || gone(find(t.b, 'B')) },
  { id: 'finish', title: 'Break the host', hl: ['btn-retreat'], text: 'Finish them. The battle is won when the enemy host drops below 25% or breaks. If it goes badly, <b>Sound Retreat</b> lets you withdraw: keep enough of your army and it counts as a draw with partial spoils, not a defeat. Speed keys: <b>Z X C</b>.',
    check: () => false }
];

export class Tutorial {
  constructor(ui, handlers) { this.ui = ui; this.h = handlers; this.i = -1; this.flags = {}; this.acc = 0; }

  start() {
    this.b = this.ui.b; this.active = true;
    this.listener = (name, data) => {
      if (name === 'move') this.flags.move = data; else if (name === 'attack') this.flags.attack = data;
      else if (name === 'range') this.flags.range = true; else if (name === 'formation') this.flags.formation = true; else if (name === 'group-set') this.flags.groupSet = true;
      const s = STEPS[this.i]; if (s && s.onEvent) s.onEvent(this, name, data);
    };
    this.ui.on(this.listener);
    this.hook = (dt) => this.frame(dt);
    this.ui.frameHooks.push(this.hook);
    $('tt-exit').style.display = '';
    $('tt-skip').onclick = () => this.next(true);
    $('tt-exit').onclick = () => this.h.onExit();
    $('tutorial').classList.remove('hidden');
    this.ui.setPause(false);
    $('banner').classList.add('hidden');
    this.enter(0);
  }
  stop() {
    this.active = false; $('tutorial').classList.add('hidden'); this.clearHl();
    this.ui.listeners = this.ui.listeners.filter(f => f !== this.listener); this.ui.frameHooks = this.ui.frameHooks.filter(f => f !== this.hook);
    if (this.ui.r) this.ui.r.markers = [];
  }
  clearHl() { document.querySelectorAll('.tut-hl').forEach(e => e.classList.remove('tut-hl')); }

  enter(i) {
    this.i = i; this.flags = {}; const s = STEPS[i];
    $('tt-step').textContent = `Step ${i + 1} of ${STEPS.length}`; $('tt-title').textContent = s.title; $('tt-text').innerHTML = s.text;
    $('tt-prog').style.width = ((i) / STEPS.length * 100) + '%';
    $('tt-skip').textContent = i === STEPS.length - 1 ? 'Close tips' : 'Skip step';
    this.clearHl(); (s.hl || []).forEach(id => { const e = $(id); if (e) e.classList.add('tut-hl'); });
    if (s.enter) s.enter(this);
    this.setMarkers(s);
  }
  setMarkers(s) {
    const m = [];
    if (s.marker && typeof s.marker === 'object') m.push({ ...s.marker, r: 44 });
    if (s.markerUnit) { const u = find(this.b, s.markerUnit); if (u && u.present) m.push({ x: u.x, y: u.y, r: Math.max(u.w, u.d) / 2 + 18, label: s.markerUnit === 'dummy' ? 'Training target' : 'Flank this' }); }
    this.ui.r.markers = m;
  }
  next(skip) {
    if (this.i >= STEPS.length - 1) { $('tutorial').classList.add('hidden'); this.clearHl(); this.ui.r.markers = []; return; }
    if (skip && STEPS[this.i].id === 'hold') { /* make sure A is not left idle */ }
    this.enter(this.i + 1);
  }
  frame(dt) {
    if (!this.active || this.ui.b.result) return;
    this.acc += dt; if (this.acc < 0.12) return; this.acc = 0;
    const s = STEPS[this.i]; if (!s) return;
    if (s.markerUnit) this.setMarkers(s);
    if (s.check(this) && this.i < STEPS.length - 1) { this.ui.showBanner('Good!', 600); this.next(false); }
  }
}
