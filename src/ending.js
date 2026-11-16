// The end of the campaign: the triumph in Rome (October 45 BC) and an account of the commander's whole war.
import { SCENARIOS, actLabel } from './data.js';
import { esc } from './ui.js';
import { standingOf } from './state.js';
import { codexCount } from './codex.js';
import { CAREER, careerLv } from './campaign.js';

const men = (c) => c.cohorts.reduce((a, h) => a + h.men, 0);
const decos = (h) => (h.heroes || []).reduce((a, x) => a + ((x.dec || []).length), 0);
// A title for the commander, from his record and his name in Rome.
function titleFor(c, won, lost) {
  const st = standingOf(c);
  if (st >= 80 && lost === 0) return ['Pater Patriae', 'Father of his Country. Rome will name streets after you.'];
  if (st >= 70) return ['Hero of Rome', 'The Senate votes you a statue in the Forum.'];
  if (won >= lost * 4 && st >= 40) return ["Caesar's Right Hand", 'Caesar trusts you above all his legates.'];
  if (won > lost) return ['A Victor of the Wars', 'You come home with more victories than defeats, and your men love you for it.'];
  return ['A Survivor of the Wars', 'You came through, and so did your eagle. Not every legate can say as much.'];
}

export function showEnding(c) {
  const h = (c.history || []).filter(x => x.id !== 'prologue' && x.outcome !== 'skipped');
  const n = (o) => h.filter(x => x.outcome === o).length, won = n('victory'), lost = n('defeat'), T = c.totals || {};
  const [title, sub] = titleFor(c, won, lost);
  const best = c.cohorts.slice().sort((a, b) => (b.kills || 0) - (a.kills || 0) || b.xp - a.xp)[0];
  const decorated = c.cohorts.slice().sort((a, b) => decos(b) - decos(a))[0];
  const offs = c.officers || [], fallen = offs.filter(o => !o.alive), alive = offs.filter(o => o.alive);
  const career = CAREER.filter(k => careerLv(c, k.id) > 0).map(k => `${k.name} ${careerLv(c, k.id)}`).join(', ');
  const cx = codexCount(c);
  const tile = (big, small) => `<div class="rtile"><b>${big}</b><span>${small}</span></div>`;
  const tiles = [
    tile(h.length, 'battles fought'), tile(won, 'won'), tile(n('draw'), 'drawn'), tile(lost, 'lost'),
    T.killed != null ? tile(T.killed.toLocaleString(), 'enemies fell') : '', T.lost != null ? tile(T.lost.toLocaleString(), 'of your men fell') : '',
    T.prisoners ? tile(T.prisoners.toLocaleString(), 'prisoners taken') : '', tile(standingOf(c), 'standing in Rome')
  ].join('');
  // every battle in the order fought, grouped by act
  let lastAct = null; const rows = [];
  for (const x of h) { const s = SCENARIOS.find(y => y.id === x.id); if (!s) continue;
    if (s.act !== lastAct) { lastAct = s.act; rows.push(`<div class="ehead">${esc(actLabel(s.act))}</div>`); }
    rows.push(`<div class="erow"><span>${esc(s.name)}${s.kind === 'named' ? ' <span class="pill">named</span>' : ''}</span><span class="${x.outcome === 'victory' ? 'g' : x.outcome === 'defeat' ? 'b' : ''}">${x.outcome === 'victory' ? 'won' : x.outcome}</span></div>`); }
  let el = document.getElementById('ending'); if (!el) { el = document.createElement('div'); el.id = 'ending'; document.body.appendChild(el); }
  el.innerHTML = `<div class="ebox panel-page result">
    <div class="rhead"><div class="rtitle victory">The Triumph</div><p>October 45 BC. Caesar rides into Rome in triumph, and your cohorts march behind him.</p></div>
    <div class="card etitle"><div class="muted small">${esc((c.player && c.player.name) || 'The commander')}</div><h2>${esc(title)}</h2><p>${esc(sub)}</p></div>
    <div class="rtiles">${tiles}</div>
    <div class="egrid">
      <div class="card"><h4>Your army</h4><ul>
        <li>You march into Rome with <b>${c.cohorts.length}</b> units and <b>${men(c).toLocaleString()}</b> men.</li>
        ${best ? `<li>Best cohort: <b>${esc(best.name)}</b>${best.kills ? `, ${best.kills.toLocaleString()} enemies felled` : ''}.</li>` : ''}
        ${decorated && decos(decorated) ? `<li>Most decorated: <b>${esc(decorated.name)}</b>, ${decos(decorated)} decorations.</li>` : ''}
        ${c.cohorts.some(x => x.tenth) ? '<li>The First Cohort of the Tenth marches at the head of the column.</li>' : ''}
        ${T.healed ? `<li>The medici saved ${T.healed.toLocaleString()} men who would have died.</li>` : ''}
      </ul></div>
      <div class="card"><h4>Your officers</h4><ul>
        ${alive.length ? `<li>Marching with you: ${alive.map(o => esc(o.name)).join(', ')}.</li>` : ''}
        ${fallen.length ? `<li class="b">Did not live to see it: ${fallen.map(o => esc(o.name)).join(', ')}.</li>` : '<li>Every one of your officers lived to see it.</li>'}
        ${career ? `<li>Your own career: ${esc(career)}.</li>` : ''}
        <li>Commentarii: ${cx.have} of ${cx.total} entries written.</li>
      </ul></div>
    </div>
    <div class="card"><h4>The war, battle by battle</h4><div class="elist">${rows.join('')}</div></div>
    <div class="card rhist"><h4>What came after</h4><p>Caesar is dictator for life now, and the Republic is his. Five months later, on the Ides of March 44 BC, he is stabbed to death in the Senate at the foot of Pompey's statue, and the civil wars begin again. But that is another campaign.</p><p class="muted small">Suetonius, Julius 80-82; Plutarch, Caesar 66.</p></div>
    <p class="muted small" style="text-align:center">Thank you for playing <b>LEGIO</b>. Your campaign stays saved; start a new one from the main menu to try another road.</p>
    <div class="row rfoot" style="justify-content:center"><button class="primary" id="end-close">Ave</button></div></div>`;
  el.classList.remove('hidden');
  el.querySelector('#end-close').onclick = () => el.classList.add('hidden');
}
