import { campArt } from './campart.js';
// The camp as a place: a painted Roman fort. Each building is one activity, and buildings are drip-fed:
// you start with one, and every battle won or drawn adds the next.

export const BUILDINGS = [
  { id: 'training', name: 'Training Ground', sub: 'Drill your cohorts', x: 190, y: 470,
    intro: ['Your cohorts improve by <b>drilling</b>. Each drill uses one day and a little food.', 'Lead the drill yourself for the best result, or let an officer do it.', 'Experienced, well-drilled units fight better and break less easily.'] },
  { id: 'barracks', name: 'Barracks', sub: 'Rest, recruit, raise units', x: 190, y: 150,
    intro: ['Rest tired units, recruit replacements and fortify the camp.', 'As you win battles your command grows: <b>raise new units</b> here.'] },
  { id: 'depot', name: 'Supply Depot', sub: 'Forage for food', x: 810, y: 470,
    intro: ['Your army eats every day. Send <b>foraging parties</b> to refill your supplies.', 'A cautious sweep is safe. A wide sweep brings back more but risks an ambush.'] },
  { id: 'officers', name: "Officers' Tent", sub: 'Skills and assignments', x: 810, y: 150,
    intro: ['Each time an officer gains a level he earns <b>one advancement</b>: a choice between two improvements. A raised flag over this tent means one is waiting.', 'Attach an officer to a unit to help it in battle.'] },
  { id: 'forge', name: 'Armourer', sub: 'Better arms and armour', x: 190, y: 310,
    intro: ['Spend denarii and supplies to give a cohort better <b>armour and weapons</b>.', 'Each upgrade takes a day. Equip your best units first.'] },
  { id: 'hospital', name: 'Field Hospital', sub: 'Heal the wounded', x: 810, y: 310,
    intro: ['Build a <b>field hospital</b> so more wounded men return to the ranks after each battle.', 'Each level improves recovery.'] },
  { id: 'hall', name: "Chieftains' Hall", sub: 'Tribute, gifts, scouts', x: 500, y: 450,
    intro: ['Squeeze local nobles for gold, win their goodwill with gifts, or <b>send scouts</b> to learn what you will face.', 'Goodwill makes the next enemy smaller; ill will makes it larger.'] }
];

// One building at the start, plus one for every campaign battle won or drawn.
export function unlockedCount(c) {
  const wins = (c.history || []).filter(h => h.id !== 'prologue' && (h.outcome === 'victory' || h.outcome === 'draw')).length;
  return Math.min(BUILDINGS.length, 1 + wins);
}
export const unlockedBuildings = (c) => BUILDINGS.slice(0, unlockedCount(c));

const W = 1000, H = 620;

// Building artwork in a local 170x110 box (the label sits below it). Period details: goatskin contubernium tents with guy ropes, wooden practice
// posts (palus) and wicker shields, a timber granary on posts, an open smithy, a white linen hospital tent under the staff of Aesculapius (the red
// cross is a modern symbol), and a Gallic chieftain's round hall with a thatched cone and a boar-headed carnyx.
const tent = (x, base, w, h, col, dark, flag = '') => {
  const cx = x + w / 2, door = `<polygon points="${cx - w * 0.11},${base} ${cx},${base - h * 0.46} ${cx + w * 0.11},${base}" fill="#2a1d10"/>`;
  return `<g>
    <line x1="${cx}" y1="${base - h}" x2="${x - 10}" y2="${base + 2}" stroke="#6a5a3a" stroke-width="1"/><line x1="${cx}" y1="${base - h}" x2="${x + w + 10}" y2="${base + 2}" stroke="#6a5a3a" stroke-width="1"/>
    <rect x="${x - 11}" y="${base}" width="2.4" height="5" fill="#4a3a1e"/><rect x="${x + w + 8.6}" y="${base}" width="2.4" height="5" fill="#4a3a1e"/>
    <polygon points="${x},${base} ${cx},${base - h} ${cx},${base}" fill="${col}" stroke="#3a2a14" stroke-width="1.6" stroke-linejoin="round"/>
    <polygon points="${cx},${base - h} ${x + w},${base} ${cx},${base}" fill="${dark}" stroke="#3a2a14" stroke-width="1.6" stroke-linejoin="round"/>
    <line x1="${x + w * 0.27}" y1="${base - h * 0.5}" x2="${x + w * 0.27}" y2="${base}" stroke="rgba(0,0,0,.22)" stroke-width="1"/><line x1="${x + w * 0.73}" y1="${base - h * 0.5}" x2="${x + w * 0.73}" y2="${base}" stroke="rgba(0,0,0,.28)" stroke-width="1"/>
    <path d="M${x + w * 0.14} ${base - h * 0.3} L${x + w * 0.2} ${base - h * 0.3} M${x + w * 0.8} ${base - h * 0.3} L${x + w * 0.86} ${base - h * 0.3}" stroke="rgba(0,0,0,.3)" stroke-width="1"/>
    ${door}<circle cx="${cx}" cy="${base - h - 1.5}" r="2.2" fill="#e8c36a"/>${flag}</g>`;
};
function art(id) {
  switch (id) {
    case 'training': return `<ellipse cx="85" cy="62" rx="78" ry="42" fill="#c9b27a" stroke="#7a6a3a" stroke-width="2"/><ellipse cx="85" cy="62" rx="64" ry="32" fill="none" stroke="rgba(120,96,50,.45)" stroke-width="1" stroke-dasharray="4 5"/>
      ${[36, 82, 128].map((x, i) => `<g><rect x="${x - 4}" y="${20 + (i % 2) * 6}" width="8" height="44" rx="3" fill="#7a5a30" stroke="#2a1a0a" stroke-width="1.6"/><rect x="${x - 9}" y="${34 + (i % 2) * 6}" width="18" height="3" fill="#5a3f1e"/><path d="M${x - 3} ${24 + (i % 2) * 6} l6 5 M${x + 3} ${24 + (i % 2) * 6} l-6 5" stroke="#4a2f12" stroke-width="1"/></g>`).join('')}
      <g transform="translate(120,74)"><circle r="12" fill="#b59a62" stroke="#4a3a1a" stroke-width="1.8"/>${[-8, -4, 0, 4, 8].map(o => `<line x1="${o}" y1="-11" x2="${o}" y2="11" stroke="#7a6232" stroke-width="1"/><line x1="-11" y1="${o}" x2="11" y2="${o}" stroke="#7a6232" stroke-width="1"/>`).join('')}<circle r="3" fill="#8a8a8a" stroke="#333" stroke-width="1"/></g>
      <g transform="translate(34,82)"><line x1="-14" y1="14" x2="10" y2="-12" stroke="#d8c08a" stroke-width="4" stroke-linecap="round"/><line x1="-14" y1="14" x2="10" y2="-12" stroke="#5a4020" stroke-width="1" stroke-linecap="round"/><line x1="12" y1="14" x2="-12" y2="-12" stroke="#d8c08a" stroke-width="4" stroke-linecap="round"/></g>`;
    case 'depot': return `<g><rect x="12" y="62" width="6" height="40" fill="#5a3f1e"/><rect x="56" y="62" width="6" height="40" fill="#5a3f1e"/><rect x="100" y="62" width="6" height="40" fill="#5a3f1e"/>
      <rect x="10" y="40" width="102" height="30" fill="#b89a6a" stroke="#3a2a14" stroke-width="2"/>${[22, 34, 46, 58, 70, 82, 94, 106].map(x => `<line x1="${x}" y1="41" x2="${x}" y2="69" stroke="rgba(60,40,14,.4)" stroke-width="1"/>`).join('')}
      <polygon points="2,42 61,10 120,42" fill="#8a4a2a" stroke="#3a1f10" stroke-width="2"/>${[0, 1, 2, 3, 4].map(i => `<line x1="${8 + i * 2.5}" y1="${40 - i * 6.2}" x2="${114 - i * 2.5}" y2="${40 - i * 6.2}" stroke="rgba(40,20,8,.45)" stroke-width="1"/>`).join('')}
      <rect x="52" y="48" width="18" height="22" fill="#4a2f12"/><path d="M48 70 h26 l-3 8 h-20z" fill="#7a5a2a" stroke="#2a1a0a" stroke-width="1"/></g>
      ${[[132, 92], [146, 96], [138, 78]].map(([x, y]) => `<g><ellipse cx="${x}" cy="${y}" rx="8" ry="9" fill="#8a5a2a" stroke="#2a1a0a" stroke-width="1.6"/><line x1="${x - 8}" y1="${y - 3}" x2="${x + 8}" y2="${y - 3}" stroke="#4a3010" stroke-width="1.3"/><line x1="${x - 8}" y1="${y + 3}" x2="${x + 8}" y2="${y + 3}" stroke="#4a3010" stroke-width="1.3"/></g>`).join('')}
      <g transform="translate(150,60)"><path d="M-6 2 q6 -12 12 0 q2 6 -6 8 q-8 -2 -6 -8z" fill="#c9b27a" stroke="#4a3a1a" stroke-width="1.4"/><path d="M-3 -4 q3 -3 6 0" stroke="#4a3a1a" fill="none"/></g>`;
    case 'barracks': return `${tent(4, 100, 52, 64, '#cdb67f', '#a8935e')}${tent(58, 92, 52, 64, '#d3bc86', '#ab9660')}${tent(112, 100, 52, 64, '#c9b27a', '#a48f5a')}
      <g transform="translate(8,102)"><rect width="30" height="4" fill="#6a4a1e" stroke="#2a1a0a" stroke-width="1"/><line x1="4" y1="0" x2="4" y2="-14" stroke="#7a5a2e" stroke-width="2"/><line x1="26" y1="0" x2="26" y2="-14" stroke="#7a5a2e" stroke-width="2"/></g>`;
    case 'officers': return `${tent(14, 102, 112, 76, '#a8322a', '#7a2018', `<line x1="85" y1="30" x2="85" y2="6" stroke="#3a2a14" stroke-width="2.4"/><polygon points="85,6 108,12 85,19" fill="#e8c36a" stroke="#6a4a14" stroke-width="1"/>`)}
      <rect x="126" y="74" width="30" height="16" rx="2" fill="#8a6a3a" stroke="#2a1a0a" stroke-width="1.6"/><rect x="129" y="77" width="24" height="10" fill="#e8dcc0"/><path d="M131 83 q5 -4 10 0 t10 0" stroke="#7a5a30" fill="none" stroke-width="1"/>
      <rect x="130" y="92" width="6" height="8" fill="#6a4a1e"/><rect x="148" y="92" width="6" height="8" fill="#6a4a1e"/>`;
    case 'forge': return `<polygon points="10,48 70,18 130,48" fill="#6a5238" stroke="#2a1a0a" stroke-width="2"/>${[0, 1, 2, 3].map(i => `<line x1="${16 + i * 3}" y1="${46 - i * 7}" x2="${124 - i * 3}" y2="${46 - i * 7}" stroke="rgba(30,18,6,.5)" stroke-width="1"/>`).join('')}
      <rect x="16" y="46" width="108" height="54" fill="#8a8a90" stroke="#26262c" stroke-width="2"/>${[0, 1, 2, 3].map(r => [0, 1, 2, 3, 4, 5].map(c => `<rect x="${17 + c * 18 + (r % 2) * 9}" y="${47 + r * 13}" width="17" height="12" fill="none" stroke="rgba(30,30,36,.5)" stroke-width="1"/>`).join('')).join('')}
      <rect x="86" y="20" width="16" height="30" fill="#55555c" stroke="#26262c" stroke-width="2"/>
      <ellipse cx="52" cy="82" rx="22" ry="16" fill="#1a1612"/><ellipse cx="52" cy="84" rx="16" ry="10" fill="#e8742a"/><ellipse cx="52" cy="86" rx="9" ry="5" fill="#ffd27a"/>
      <g transform="translate(92,88)"><rect x="-10" y="-8" width="20" height="8" rx="1" fill="#2c2c32" stroke="#000" stroke-width="1"/><rect x="-4" y="0" width="8" height="10" fill="#2c2c32"/><line x1="-12" y1="-12" x2="-2" y2="-8" stroke="#6a4a1e" stroke-width="2.4"/><rect x="-16" y="-15" width="8" height="5" fill="#8a8a90" stroke="#26262c" stroke-width="1"/></g>
      <circle cx="94" cy="12" r="6" fill="#ccc" opacity=".45"/><circle cx="99" cy="4" r="5" fill="#ccc" opacity=".3"/>
      <g transform="translate(146,84)"><ellipse rx="11" ry="14" fill="#9a2a22" stroke="#2a0a08" stroke-width="1.6" transform="rotate(14)"/><ellipse rx="3" ry="3" fill="#cfc9a8" transform="rotate(14)"/></g>`;
    case 'hospital': return `${tent(10, 102, 126, 72, '#eee6d2', '#cfc4a8')}
      <g transform="translate(142,100)"><line x1="0" y1="0" x2="0" y2="-62" stroke="#6a4a1e" stroke-width="3"/><path d="M0 -8 q8 -6 0 -12 q-8 -6 0 -12 q8 -6 0 -12" stroke="#4a7a3a" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="0" cy="-64" r="3" fill="#e0c060"/></g>
      <g transform="translate(26,98)"><path d="M0 0 q-4 -8 4 -12 q8 4 4 12z" fill="#b59a62" stroke="#4a3a1a" stroke-width="1.2"/><path d="M14 0 q-3 -9 4 -12 q7 3 4 12z" fill="#7a9a5a" stroke="#2a3a1a" stroke-width="1.2"/></g>`;
    case 'hall': return `<ellipse cx="85" cy="100" rx="70" ry="8" fill="rgba(0,0,0,.25)"/>
      <path d="M22 98 V54 a63 14 0 0 1 126 0 V98 a63 10 0 0 1 -126 0z" fill="#9a7a4a" stroke="#3a2a14" stroke-width="2"/>${[34, 48, 62, 76, 90, 104, 118, 132].map(x => `<line x1="${x}" y1="58" x2="${x}" y2="104" stroke="rgba(50,30,10,.4)" stroke-width="1"/>`).join('')}
      <polygon points="8,56 85,6 162,56 85,66" fill="#c0a050" stroke="#4a3a14" stroke-width="2" stroke-linejoin="round"/><polygon points="85,6 162,56 85,66" fill="#a98a3e"/>${[0, 1, 2, 3, 4, 5].map(i => `<path d="M${22 + i * 4} ${52 - i * 6.8} Q85 ${64 - i * 6.6} ${148 - i * 4} ${52 - i * 6.8}" stroke="rgba(70,50,10,.5)" fill="none" stroke-width="1.2"/>`).join('')}
      <rect x="72" y="76" width="26" height="28" rx="12" fill="#3a2410" stroke="#1a0e04" stroke-width="1.6"/>
      ${[34, 124].map((x, i) => `<ellipse cx="${x}" cy="82" rx="7" ry="13" fill="${i ? '#2f6fa8' : '#9a2a22'}" stroke="#1a0e04" stroke-width="1.4"/><line x1="${x}" y1="70" x2="${x}" y2="94" stroke="#cfc9a8" stroke-width="1.4"/>`).join('')}
      <g transform="translate(158,102)"><line x1="0" y1="0" x2="0" y2="-62" stroke="#6a4a1e" stroke-width="2.6"/><path d="M0 -62 q10 -8 14 0 q-2 6 -8 4z" fill="#d8c46a" stroke="#4a3a14" stroke-width="1.2"/></g>`;
    default: return '';
  }
}

// The camp screen: a painting (campart.js) with an SVG layer of clickable buildings, labels and badges on top.
export function sceneSvg(c, { visited = [], focus = null, flags = {} } = {}) {
  const un = unlockedBuildings(c), unIds = new Set(un.map(b => b.id)), seen = new Set(visited);
  const art = campArt([...unIds], BUILDINGS);
  let s = `<div class="campstage"><img class="campart" alt="" src="${art}"><svg viewBox="0 0 ${W} ${H}" id="campsvg" role="group" aria-label="Your camp. Click a building to use it.">
    <defs><radialGradient id="glow"><stop offset="0" stop-color="#ffd27a" stop-opacity=".6"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient></defs>`;
  for (const [fx, fy] of [[446, 338], [554, 262], [250, 262], [750, 338]]) s += `<circle cx="${fx}" cy="${fy - 4}" r="36" fill="url(#glow)" class="flick" pointer-events="none"/>`;
  s += `<g class="walker" pointer-events="none"><circle r="3.6" fill="#b3261e" stroke="#2a0a08"/><circle cy="-3" r="2.2" fill="#cfcfc4"/></g><g class="walker w2" pointer-events="none"><circle r="3.6" fill="#b3261e" stroke="#2a0a08"/><circle cy="-3" r="2.2" fill="#cfcfc4"/></g>`;
  // the command tent (always available)
  s += `<g class="bld" data-b="praetorium" tabindex="0" role="button" aria-label="Command tent: march to battle"><title>Command tent: your next battle, and the march</title>
    <rect x="392" y="52" width="216" height="150" rx="10" class="hit"/>
    ${flags.praetorium ? `<g class="bldflag" transform="translate(404,22)"><title>A career choice is waiting</title><line x1="0" y1="0" x2="0" y2="58" stroke="#2a1a08" stroke-width="4" stroke-linecap="round"/><line x1="0" y1="0" x2="0" y2="58" stroke="#8a6a3a" stroke-width="2" stroke-linecap="round"/><g class="cloth"><path d="M1 2h34l-8 10 8 10H1z" fill="#c62f25" stroke="#4a0f0b" stroke-width="1.6" stroke-linejoin="round"/><text x="13" y="17" text-anchor="middle" style="font:bold 13px system-ui,sans-serif;fill:#fff3d0">${flags.praetorium}</text></g></g>` : ''}
    <text x="500" y="216" class="bl" text-anchor="middle">Command Tent</text><text x="500" y="234" class="bs" text-anchor="middle">Next battle and the march</text></g>`;
  for (const b of BUILDINGS) {
    const tx = b.x - 85, ty = b.y - 55;
    if (!unIds.has(b.id)) { s += `<g transform="translate(${tx},${ty})" class="plot" aria-hidden="true"><text x="85" y="62" text-anchor="middle" class="plotq">?</text></g>`; continue; }
    const isNew = !seen.has(b.id), isFocus = focus === b.id;
    s += `<g class="bld ${isFocus ? 'focus' : ''}" data-b="${b.id}" tabindex="0" role="button" aria-label="${b.name}: ${b.sub}" transform="translate(${tx},${ty})"><title>${b.name}: ${b.sub}</title>
      <rect x="-6" y="-14" width="182" height="146" rx="10" class="hit"/>
      ${isFocus ? '<rect x="-4" y="-12" width="178" height="142" rx="10" class="pulsebox"/>' : ''}
      ${isNew ? '<g transform="translate(160,-4)"><circle r="13" fill="#e8c36a" stroke="#2a1a08" stroke-width="2"/><text y="5" text-anchor="middle" class="newb">NEW</text></g>' : ''}
      ${flags[b.id] ? `<g class="bldflag" transform="translate(8,-34)"><title>${flags[b.id]} decision${flags[b.id] > 1 ? 's' : ''} waiting</title><line x1="0" y1="0" x2="0" y2="58" stroke="#2a1a08" stroke-width="4" stroke-linecap="round"/><line x1="0" y1="0" x2="0" y2="58" stroke="#8a6a3a" stroke-width="2" stroke-linecap="round"/><g class="cloth"><path d="M1 2h34l-8 10 8 10H1z" fill="#c62f25" stroke="#4a0f0b" stroke-width="1.6" stroke-linejoin="round"/><text x="13" y="17" text-anchor="middle" style="font:bold 13px system-ui,sans-serif;fill:#fff3d0">${flags[b.id]}</text></g></g>` : ''}
      <text x="85" y="128" class="bl" text-anchor="middle">${b.name}</text></g>`;
  }
  s += `</svg></div>`;
  return s;
}

// One plain sentence telling the player what to do next.
export function advice(c, visited, flags = {}) {
  const un = unlockedBuildings(c), seen = new Set(visited), days = c.daysLeft;
  if (days <= 0) return { text: 'No days remain. Click the command tent and march to battle.', focus: 'praetorium' };
  const fresh = un.find(b => !seen.has(b.id));
  if (un.length === 1 && fresh) return { text: `Welcome to your camp. You have ${days} day${days === 1 ? '' : 's'} before the enemy moves. Click the glowing <b>${fresh.name}</b> to begin.`, focus: fresh.id };
  if (fresh) return { text: `New: the <b>${fresh.name}</b> is built. Click it to see what it offers. You have ${days} day${days === 1 ? '' : 's'} left.`, focus: fresh.id };
  if (flags.praetorium) return { text: `<b>A raised flag</b> over the Command Tent: you have earned a step in your own career. It costs no day. You have ${days} day${days === 1 ? '' : 's'} left.`, focus: 'praetorium' };
  const fl = un.find(b => flags[b.id]);
  if (fl) return { text: `<b>A raised flag</b> over the ${fl.name} means ${fl.id === 'officers' ? 'an officer has earned an advancement' : 'a unit has gained a rank and can choose an improvement'}. It costs no day. You have ${days} day${days === 1 ? '' : 's'} left.`, focus: fl.id };
  return { text: `You have <b>${days} day${days === 1 ? '' : 's'}</b> left. Each action uses a day. Click any building, or the command tent when you are ready to march.`, focus: null };
}
