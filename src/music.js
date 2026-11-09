// Background music: calm classical for the menu, map and camp; driving orchestral pieces for battle. Tracks are shuffled, crossfade into each other,
// and the player stays silent until the first click or key press (browsers do not allow sound before that). Credits are in docs/MUSIC.md and the panel.
// The files are Kevin MacLeod's (incompetech.com, CC BY 4.0), re-encoded and volume-matched; see docs/MUSIC.md.
export const TRACKS = {
  calm: [
    { file: 'audio/calm-gymnopedie-no-1.mp3', title: 'Gymnopedie No. 1', by: 'Erik Satie' },
    { file: 'audio/calm-prelude-in-c.mp3', title: 'Prelude in C', by: 'J. S. Bach' },
    { file: 'audio/calm-canon-in-d-major.mp3', title: 'Canon in D', by: 'Johann Pachelbel' },
    { file: 'audio/calm-virtutes-instrumenti.mp3', title: 'Virtutes Instrumenti', by: 'medieval sacred music' },
    { file: 'audio/calm-cello-suite-1-in-g-prelude.mp3', title: 'Cello Suite No. 1, Prelude', by: 'J. S. Bach' },
    { file: 'audio/calm-sheep-may-safely-graze.mp3', title: 'Sheep May Safely Graze', by: 'J. S. Bach' },
    { file: 'audio/calm-gymnopedie-no-2.mp3', title: 'Gymnopedie No. 2', by: 'Erik Satie' },
    { file: 'audio/calm-teller-of-the-tales.mp3', title: 'Teller of the Tales', by: 'Kevin MacLeod' },
    { file: 'audio/calm-thaxted-holst.mp3', title: 'Thaxted', by: 'Gustav Holst' }
  ],
  battle: [
    { file: 'audio/battle-egmont-overture.mp3', title: 'Egmont Overture', by: 'Ludwig van Beethoven' },
    { file: 'audio/battle-hall-of-the-mountain-king.mp3', title: 'In the Hall of the Mountain King', by: 'Edvard Grieg' },
    { file: 'audio/battle-danse-macabre.mp3', title: 'Danse Macabre', by: 'Camille Saint-Saens' },
    { file: 'audio/battle-five-armies.mp3', title: 'Five Armies', by: 'Kevin MacLeod' },
    { file: 'audio/battle-clash-defiant.mp3', title: 'Clash Defiant', by: 'Kevin MacLeod' },
    { file: 'audio/battle-noble-race.mp3', title: 'Noble Race', by: 'Kevin MacLeod' },
    { file: 'audio/battle-heroic-age.mp3', title: 'Heroic Age', by: 'Kevin MacLeod' },
    { file: 'audio/battle-undaunted.mp3', title: 'Undaunted', by: 'Kevin MacLeod' }
  ]
};
const KEY = 'legio_music_v1', FADE = 1.6, OVERLAP = 3;           // seconds
const load = () => { try { return { on: true, vol: 0.45, ...(JSON.parse(localStorage.getItem(KEY)) || {}) }; } catch { return { on: true, vol: 0.45 }; } };
const saveSet = (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage unavailable */ } };
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

class MusicPlayer {
  constructor() {
    this.set = load(); this.ctx = 'calm'; this.queue = []; this.cur = null; this.old = []; this.unlocked = false; this.fails = 0; this.listeners = [];
    this.timer = setInterval(() => this.tick(), 60);
  }
  onChange(fn) { this.listeners.push(fn); }
  emit() { this.listeners.forEach(f => f(this.state())); }
  state() { return { on: this.set.on, vol: this.set.vol, ctx: this.ctx, track: this.cur ? this.cur.track : null, playing: !!this.cur && !this.cur.audio.paused, broken: this.fails >= 3 }; }
  // The first user gesture lets sound play at all.
  unlock() { if (this.unlocked) return; this.unlocked = true; if (this.set.on) this.start(); }
  setContext(ctx) { if (ctx === this.ctx && this.cur) return; this.ctx = ctx; this.queue = []; if (this.unlocked && this.set.on) this.start(); this.emit(); }
  setOn(on) { this.set.on = on; saveSet(this.set); if (!on) this.fadeAll(); else if (this.unlocked) this.start(); this.emit(); }
  setVolume(v) { this.set.vol = Math.max(0, Math.min(1, v)); saveSet(this.set); this.emit(); }
  next() { if (this.unlocked && this.set.on) this.start(); }
  nextTrack() {
    if (!this.queue.length) { const last = this.cur && this.cur.track; this.queue = shuffle(TRACKS[this.ctx]); if (last && this.queue[0] === last && this.queue.length > 1) this.queue.push(this.queue.shift()); }
    return this.queue.shift();
  }
  // Begin the next track and fade the current one out.
  start() {
    const track = this.nextTrack(); if (!track) return;
    if (this.cur) { this.cur.fading = -1; this.old.push(this.cur); }
    const audio = new Audio(track.file); audio.preload = 'auto';
    const e = { audio, track, fade: 0, fading: 1, started: false };
    audio.addEventListener('error', () => { if (this.cur === e) { this.fails++; this.cur = null; if (this.fails < 3) setTimeout(() => this.start(), 400); this.emit(); } });
    audio.addEventListener('playing', () => { this.fails = 0; this.emit(); });
    audio.volume = 0; this.cur = e;
    const p = audio.play(); if (p && p.catch) p.catch(() => { /* blocked until a gesture; unlock() retries */ this.unlocked = false; });
    this.emit();
  }
  fadeAll() { if (this.cur) { this.cur.fading = -1; this.old.push(this.cur); this.cur = null; } }
  tick() {
    const dt = 0.06, v = this.set.vol * this.set.vol;             // squared: perceived loudness follows the slider
    for (const e of [this.cur, ...this.old]) {
      if (!e) continue;
      e.fade = Math.max(0, Math.min(1, e.fade + e.fading * dt / FADE));
      try { e.audio.volume = Math.max(0, Math.min(1, v * e.fade)); } catch { /* ignore */ }
    }
    this.old = this.old.filter(e => { if (e.fade <= 0) { try { e.audio.pause(); e.audio.removeAttribute('src'); e.audio.load(); } catch { /* ignore */ } return false; } return true; });
    const c = this.cur;
    if (c && c.audio.duration > OVERLAP * 3 && c.audio.currentTime > c.audio.duration - OVERLAP && c.fading > 0 && this.set.on) this.start();   // overlap into the next piece
  }
}
export const music = new MusicPlayer();

// The speaker button(s) and the little panel they open.
export function mountMusicUI(buttons) {
  const panel = document.createElement('div'); panel.id = 'musicpanel'; panel.className = 'hidden';
  panel.innerHTML = `<div class="mp-head"><b>Music</b><button id="mp-close" aria-label="Close">x</button></div>
    <label class="mp-row"><input type="checkbox" id="mp-on"> Play background music</label>
    <label class="mp-row">Volume <input type="range" id="mp-vol" min="0" max="100"></label>
    <div class="mp-now" id="mp-now"></div>
    <div class="row"><button id="mp-next">Next piece</button><button id="mp-credits">Credits</button></div>`;
  document.body.appendChild(panel);
  const $ = (s) => panel.querySelector(s), icon = (on) => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9z"/>${on ? '<path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>' : '<path d="M17 9l5 6M22 9l-5 6"/>'}</svg>`;
  let shown = null;
  const draw = (s) => {
    $('#mp-on').checked = s.on; $('#mp-vol').value = Math.round(s.vol * 100); $('#mp-vol').disabled = !s.on;
    $('#mp-now').textContent = s.broken ? 'The music files could not be loaded.' : s.on && s.track ? `Now playing: ${s.track.title} - ${s.track.by}` : s.on ? 'Music starts after your first click.' : 'Music is off.';
    if (shown !== s.on) { shown = s.on; buttons.forEach(b => { b.innerHTML = icon(s.on); b.title = s.on ? 'Music' : 'Music (off)'; }); }      // only when it changes: replacing the icon mid-click would swallow the click
  };
  music.onChange(draw); draw(music.state());
  buttons.forEach(b => b.addEventListener('click', (e) => { e.stopPropagation(); const r = b.getBoundingClientRect(); panel.classList.toggle('hidden'); panel.style.top = r.top < innerHeight / 2 ? r.bottom + 8 + 'px' : 'auto'; panel.style.bottom = r.top < innerHeight / 2 ? 'auto' : innerHeight - r.top + 8 + 'px'; panel.style.right = r.left > innerWidth / 2 ? innerWidth - r.right + 'px' : 'auto'; panel.style.left = r.left > innerWidth / 2 ? 'auto' : r.left + 'px'; }));
  $('#mp-close').onclick = () => panel.classList.add('hidden');
  $('#mp-on').onchange = (e) => music.setOn(e.target.checked);
  $('#mp-vol').oninput = (e) => music.setVolume(e.target.value / 100);
  $('#mp-next').onclick = () => music.next();
  $('#mp-credits').onclick = () => { panel.classList.add('hidden'); musicCredits(); };
  document.addEventListener('pointerdown', (e) => { if (!panel.classList.contains('hidden') && !panel.contains(e.target) && !buttons.some(b => b.contains(e.target))) panel.classList.add('hidden'); }, true);
}
// The first click or key press anywhere starts the music.
for (const ev of ['pointerdown', 'keydown']) document.addEventListener(ev, () => music.unlock(), { once: false, capture: true });

export function musicCredits() {
  const rows = (l) => l.map(t => `<li>${t.title} &mdash; ${t.by}</li>`).join('');
  const el = document.getElementById('confirm'); if (!el) return;
  el.classList.remove('hidden');
  el.innerHTML = `<div class="box" style="text-align:left;max-width:600px;max-height:80vh;overflow:auto"><h3 style="color:var(--gold);margin:0 0 6px">Music credits</h3>
    <p class="small">Recordings by <b>Kevin MacLeod</b> (<a href="https://incompetech.com" target="_blank" rel="noopener" style="color:var(--gold)">incompetech.com</a>), licensed under Creative Commons: By Attribution 4.0 (<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener" style="color:var(--gold)">creativecommons.org/licenses/by/4.0</a>). Re-encoded and volume-matched for this game. The Egmont Overture is built from MusOpen source recordings.</p>
    <h4 class="sect">Camp, map and menu</h4><ul class="small">${rows(TRACKS.calm)}</ul><h4 class="sect">Battle</h4><ul class="small">${rows(TRACKS.battle)}</ul>
    <div class="row" style="justify-content:flex-end;margin-top:10px"><button class="primary" id="mc-close">Close</button></div></div>`;
  el.querySelector('#mc-close').onclick = () => { el.classList.add('hidden'); el.innerHTML = ''; };
}
