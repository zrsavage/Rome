// Battle report: a timeline chart of both armies, the moments that mattered, and plain notes on what decided the fight.
// It teaches the rules (flank, rear, surround, command range) from what actually happened in this battle.
import { esc } from './ui.js';

const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const CAUSE = {
  frontal: 'grinding losses in a head-on fight', flank: 'being hit in the flank', rear: 'being hit from behind', surround: 'being surrounded',
  charge: 'the shock of a charge', missile: 'missile fire', pilum: 'a volley of pila', neighbour: 'seeing the cohort beside it break'
};
const ROME = '#e0614f', GAUL = '#7fb3e6';

function chart(rep) {
  const S = rep.series; if (!S || S.length < 2) return '';
  const W = 640, H = 190, L = 44, R = 12, T = 14, B = 26, tmax = Math.max(1, S[S.length - 1].t);
  const vmax = Math.max(1, ...S.map(s => Math.max(s.rome, s.gaul)));
  const X = (t) => L + (W - L - R) * t / tmax, Y = (v) => T + (H - T - B) * (1 - v / vmax);
  const line = (k) => S.map((s, i) => `${i ? 'L' : 'M'}${X(s.t).toFixed(1)},${Y(s[k]).toFixed(1)}`).join(' ');
  const at = (t, k) => { let b = S[0]; for (const s of S) if (Math.abs(s.t - t) < Math.abs(b.t - t)) b = s; return b[k]; };
  const ticks = []; const step = tmax > 600 ? 120 : tmax > 240 ? 60 : 30; for (let t = 0; t <= tmax; t += step) ticks.push(t);
  let g = `<rect x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}" fill="#1b160e" stroke="#4a3d28"/>`;
  for (const f of [0.25, 0.5, 0.75, 1]) g += `<line x1="${L}" x2="${W - R}" y1="${Y(vmax * f)}" y2="${Y(vmax * f)}" stroke="#33291a"/><text x="${L - 5}" y="${Y(vmax * f) + 4}" text-anchor="end" fill="#c2b496" font-size="11">${Math.round(vmax * f)}</text>`;
  for (const t of ticks) g += `<text x="${X(t)}" y="${H - 8}" text-anchor="middle" fill="#c2b496" font-size="11">${mmss(t)}</text>`;
  g += `<path d="${line('gaul')}" fill="none" stroke="${GAUL}" stroke-width="2.4"/><path d="${line('rome')}" fill="none" stroke="${ROME}" stroke-width="2.4"/>`;
  // a mark for each cohort that broke, on its own side's line
  for (const e of rep.events) {
    if (e.kind !== 'rout') continue;
    const k = e.side === 'rome' ? 'rome' : 'gaul', x = X(e.t), y = Y(at(e.t, k));
    g += `<path d="M${x - 5},${y - 9} L${x + 5},${y - 9} L${x},${y - 1} Z" fill="${e.side === 'rome' ? ROME : GAUL}" stroke="#17130d" stroke-width="1.2"/>`;
  }
  for (const e of rep.events) if (e.kind === 'surge' || e.kind === 'commit' || e.kind === 'wing' || e.kind === 'rally') {
    const x = X(e.t); g += `<line x1="${x}" x2="${x}" y1="${T}" y2="${H - B}" stroke="${e.side === 'rome' ? '#e8c36a' : '#8c7bb0'}" stroke-dasharray="3 4" opacity=".75"/>`;
  }
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Strength of both armies over the battle" style="width:100%;max-width:${W}px;height:auto;display:block">${g}</svg>
    <div class="muted small" style="display:flex;flex-wrap:wrap;gap:6px 16px;margin-top:4px"><span><b style="color:${ROME}">&mdash;</b> your men standing</span><span><b style="color:${GAUL}">&mdash;</b> the enemy's</span><span>&#9660; a cohort broke</span><span><b style="color:#e8c36a">&#124;</b> your rally &nbsp;<b style="color:#8c7bb0">&#124;</b> a Gallic surge, wing or champion charge</span></div>`;
}

// The report's pieces, grouped: how the fight turned, how your army fought, what the enemy tried, the conditions, and one lesson.
export function reportParts(res) {
  const rep = res.report; if (!rep) return null;
  const ev = rep.events, st = rep.stats, P = { cond: [], turn: [], yours: [], enemy: [], lesson: [] };
  const routs = (side) => ev.filter(e => e.kind === 'rout' && e.side === side);
  const rr = routs('rome'), gr = routs('gaul');
  const tally = (list) => { const c = {}; for (const e of list) c[e.cause] = (c[e.cause] || 0) + 1; return Object.entries(c).sort((a, b) => b[1] - a[1]); };

  // weather
  const WXN = { rain: 'Rain turned the ground to mud: marches were slower, horse charges lost weight and slings and bows fired about a fifth less.', fog: 'Fog cut sight to half. Enemies appeared late, so scouting, high ground and a general near the front mattered.', storm: 'A storm slowed every march and nearly silenced missile fire.' + (ev.some(e => e.kind === 'flood') ? ' The river rose and the fords deepened mid-battle: whoever was caught crossing paid for it.' : ''), frost: 'A hard frost froze the river, so it could be crossed on the ice (slowly) instead of only at the fords.' };
  if (rep.wx && WXN[rep.wx]) P.cond.push(`<b>Weather: ${esc(rep.wx[0].toUpperCase() + rep.wx.slice(1))}.</b> ${WXN[rep.wx]}`);

  // 1. where your line broke
  if (rr.length) {
    const f = rr[0], whyF = CAUSE[f.cause] || f.cause;
    P.turn.push(`<b>Your first cohort broke at ${mmss(f.t)}.</b> ${esc(f.text)} fled, mostly from ${whyF}${f.cmd === false ? ', and it was outside your general\'s command range' : ''}.${f.neigh ? ' Its neighbours\' fear played a part.' : ''}`);
    const tl = tally(rr); if (rr.length > 1) P.turn.push(`In all ${rr.length} of your cohorts routed. The main causes: ${tl.slice(0, 3).map(([c, n]) => `${CAUSE[c] || c} (${n})`).join(', ')}.`);
    const dom = tl[0][0];
    const lesson = {
      flank: 'Lesson: a cohort hit in the flank loses heart about twice as fast as one fought head-on. Turn the wing to face the threat, or hold a reserve behind the line to meet it.',
      rear: 'Lesson: being hit from behind is the worst thing that can happen to a cohort. Cavalry and warbands will circle for it; keep a reserve on the wings and do not leave a gap to be walked through.',
      surround: 'Lesson: a surrounded cohort cannot fight back well and its morale drains steadily. Fall back before the circle closes, or form orbis if you have learned it.',
      charge: 'Lesson: the first clash is the dangerous one. Order a stand (hold) before the charge arrives, and throw pila as they close, so the shock does less harm.',
      missile: 'Lesson: slingers and archers wear a line down slowly. Close with them, screen with cavalry, or use the testudo if you have learned it.',
      neighbour: 'Lesson: one rout shakes the cohorts beside it. Relieve a tired cohort before it breaks, and ride the line to rally the wavering.',
      frontal: 'Lesson: a long head-on grind tires and wears men down. Rotate fresh cohorts into the front (relieve), and look for a flank so the enemy break first.'
    }[dom]; if (lesson) P.lesson.push(lesson.replace(/^Lesson: (.)/, (m, ch) => ch.toUpperCase()));
  } else if (res.outcome !== 'defeat') P.turn.push('<b>No cohort of yours ever broke.</b> Your line held for the whole fight.');

  // 2. how the enemy broke
  if (gr.length) {
    const f = gr[0], tl = tally(gr);
    P.turn.push(`<b>The enemy's first break came at ${mmss(f.t)}</b> (${esc(f.text)}). ${gr.length} of their units fled in all, mostly from ${tl.slice(0, 2).map(([c]) => CAUSE[c] || c).join(' and ')}.`);
  }

  // 3. where your kills came from
  const kr = st.k.rome, tot = Object.values(kr).reduce((a, b) => a + b, 0);
  if (tot > 30) {
    const side = (kr.flank || 0) + (kr.rear || 0), pct = Math.round(100 * side / tot), ranged = (kr.pilum || 0) + (kr.missile || 0), rpct = Math.round(100 * ranged / tot), ch = Math.round(100 * (kr.charge || 0) / tot);
    P.yours.push(pct >= 20 ? `<b>Flanking paid off:</b> ${pct}% of the men you killed fell to attacks on the flank or rear, where a cohort cannot defend itself well.`
      : pct < 6 ? `<b>You almost never attacked from the side</b> (${pct}% of your kills). Flank and rear attacks do far more damage and shake morale; try sending a wing round while the front holds.`
      : `${pct}% of your kills came from flank or rear attacks. More would have shortened the fight.`);
    if (rpct >= 12) P.yours.push(`Pila and missiles accounted for ${rpct}% of your kills (${st.pilum} pilum volleys thrown).`);
    if (ch >= 10) P.yours.push(`Charges accounted for ${ch}% of your kills; the opening impact decided much of this fight.`);
  }
  const lost = st.k.gaul, ltot = Object.values(lost).reduce((a, b) => a + b, 0);
  if (ltot > 30) {
    const sp = Math.round(100 * ((lost.flank || 0) + (lost.rear || 0)) / ltot);
    if (sp >= 20) P.yours.push(`<b>${sp}% of the men you lost</b> were struck from the flank or rear. Cover your ends: reserves behind the wings, or anchor them on a river or wood.`);
  }

  // 4. command range
  if (st.engaged > 30) {
    const pct = Math.round(100 * st.outCmd / st.engaged);
    if (pct >= 25) P.yours.push(`<b>${pct}% of your cohorts' fighting time was outside your general's command ring.</b> Out of command they rally slower, recover less and charge raggedly. Bring the general up behind the fighting line.`);
    else if (pct <= 8 && res.outcome === 'victory') P.yours.push('Your general kept the fighting inside the command ring almost all the time, so morale recovered quickly.');
  }

  // 5. orders that helped
  const helped = [];
  if (st.rallied) helped.push(`the general rode the line ${st.rallied === 1 ? 'once' : st.rallied + ' times'} to steady the cohorts`);
  if (st.relieved) helped.push(`tired cohorts were relieved ${st.relieved === 1 ? 'once' : st.relieved + ' times'}`);
  if (st.cycles) helped.push(`horse charged, broke off and charged again ${st.cycles} time${st.cycles > 1 ? 's' : ''}`);
  if (st.resupplied) helped.push('units refilled pila and shot from the baggage train');
  const unitRallies = ev.filter(e => e.kind === 'unitrally' && e.side === 'rome').length;
  if (unitRallies) helped.push(`${unitRallies} broken cohort${unitRallies > 1 ? 's' : ''} rallied and returned`);
  if (helped.length) P.yours.push(`<b>What helped:</b> ${helped.join('; ')}.`);

  // officers
  const rash = ev.filter(e => e.kind === 'rash');
  if (rash.length) P.yours.push(`<b>A rash officer acted on his own:</b> ${rash.length === 1 ? 'once' : rash.length + ' times'} a cohort charged without orders (${esc(rash[0].text.replace(/ charges .*$/, ''))}). Rash men win glory and lose cohorts; give them a task, or hold the enemy off until you are ready.`);
  if (ev.some(e => e.kind === 'rival')) P.yours.push('<b>Rivals fought side by side:</b> two officers who dislike each other each fought harder to avoid being outdone.');

  // 6. what the Gauls tried
  const first = (k) => ev.find(e => e.kind === k);
  if (first('feint')) P.enemy.push(`At ${mmss(first('feint').t)} a Gallic unit ran at your flank and then broke off and fled. That is a <b>feint</b>: it is meant to draw cohorts out of line so the host can fall on them. Hold your post (H) and do not chase.`);
  if (first('extend')) P.enemy.push(`At ${mmss(first('extend').t)} the Gallic host <b>stretched its line</b>, because it outnumbered you. A longer line overlaps yours and curls round your ends: anchor a flank on a river or wood, or extend your own line (L) to match.`);
  if (first('champ')) P.enemy.push(`At ${mmss(first('champ').t)} the champions struck: <b>${esc(first('champ').text.replace('The champions charge ', ''))}</b> was judged the weakest point of your line (shaken, flanked, isolated or lightly armed). Keep wounded or unsupported cohorts out of the front, or have a reserve ready behind them.`);
  if (first('scout')) P.enemy.push(`The Gauls scouted your flanks first (${esc(first('scout').text.toLowerCase())}). A weak or open end of your line is found and used.`);
  const wd = ev.filter(e => e.kind === 'withdraw').length; if (wd) P.enemy.push(`${wd} Gallic unit${wd > 1 ? 's' : ''} fell back in good order instead of breaking. Pursue them while they are tired, or they will return rested.`);
  for (const e of ev) {
    if (e.kind === 'wing') P.enemy.push(`At ${mmss(e.t)} a Gallic warband swung wide to take you in the flank. Watch for a wing that moves away from the main line: it is going round you.`);
    else if (e.kind === 'commit') { P.enemy.push(`At ${mmss(e.t)} the Gallic champions were thrown in. They are held back until the fight is already turning, so a line that holds until then usually wins.`); break; }
  }
  if (!P.turn.length) P.turn.push('A short, one-sided fight with no turning point worth noting.');

  // key moments list
  const keys = ev.filter(e => ['rout', 'dead', 'waver', 'surge', 'commit', 'wing', 'rally', 'relieve', 'rash', 'rival', 'flood', 'feint', 'champ', 'extend', 'withdraw', 'scout', 'baggage', 'laager'].includes(e.kind));
  const label = (e) => ({ rout: `${esc(e.text)} ${e.side === 'rome' ? '<b style="color:#e0614f">breaks</b>' : 'breaks (enemy)'}${e.cause ? ` &mdash; ${esc((CAUSE[e.cause] || e.cause))}` : ''}`, dead: `${esc(e.text)} destroyed${e.side === 'rome' ? '' : ' (enemy)'}`, waver: esc(e.text), surge: esc(e.text), commit: esc(e.text), wing: esc(e.text), rally: esc(e.text), relieve: esc(e.text), rash: esc(e.text), rival: esc(e.text), flood: esc(e.text), feint: esc(e.text), champ: esc(e.text), extend: esc(e.text), withdraw: esc(e.text), scout: esc(e.text), baggage: `<b style="color:#e0614f">${esc(e.text)}</b>`, laager: esc(e.text) }[e.kind]);
  const shown = keys.length > 12 ? keys.filter((e, i) => e.kind !== 'rout' || e.side === 'rome' || i < 4).slice(0, 12) : keys;
  const moments = shown.length ? `<div class="muted small" style="margin-top:10px"><b>Key moments</b></div><div class="small" style="columns:2 280px;column-gap:24px;margin-top:2px">${shown.map(e => `<div style="break-inside:avoid"><span class="muted">${mmss(e.t)}</span> ${label(e)}</div>`).join('')}</div>` : '';

  return { chart: chart(rep), time: mmss(res.time), P, moments: shown.map(e => ({ t: mmss(e.t), html: label(e), side: e.side })) };
}
