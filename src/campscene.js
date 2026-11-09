// The camp as a place: a drawn Roman fort. Each building is one activity, and buildings are drip-fed:
// you start with one, and every battle won or drawn adds the next.

export const BUILDINGS = [
  { id: 'training', name: 'Training Ground', sub: 'Drill your cohorts', x: 190, y: 470,
    intro: ['Your cohorts improve by <b>drilling</b>. Each drill uses one day and a little food.', 'Lead the drill yourself for the best result, or let an officer do it.', 'Experienced, well-drilled units fight better and break less easily.'] },
  { id: 'depot', name: 'Supply Depot', sub: 'Forage for food', x: 810, y: 470,
    intro: ['Your army eats every day. Send <b>foraging parties</b> to refill your supplies.', 'A cautious sweep is safe. A wide sweep brings back more but risks an ambush.'] },
  { id: 'barracks', name: 'Barracks', sub: 'Rest, recruit, raise units', x: 190, y: 150,
    intro: ['Rest tired units, recruit replacements and fortify the camp.', 'As you win battles your command grows: <b>raise new units</b> here.'] },
  { id: 'officers', name: "Officers' Tent", sub: 'Skills and assignments', x: 810, y: 150,
    intro: ['Officers earn <b>skill points</b> as they level. Spend them on perks.', 'Attach an officer to a unit to help it in battle.'] },
  { id: 'forge', name: 'Armourer', sub: 'Better arms and armour', x: 190, y: 310,
    intro: ['Spend denarii and supplies to give a cohort better <b>armour and weapons</b>.', 'Each upgrade takes a day. Equip your best units first.'] },
  { id: 'hospital', name: 'Field Hospital', sub: 'Heal the wounded', x: 810, y: 310,
    intro: ['Build a <b>field hospital</b> so more wounded men return to the ranks after each battle.', 'Each level improves recovery.'] },
  { id: 'hall', name: "Chieftains' Hall", sub: 'Tribute, gifts, scouts', x: 500, y: 450,
    intro: ['Squeeze local nobles for gold, win their goodwill with gifts, or <b>send scouts</b> to learn what you will face.', 'Goodwill makes the next enemy smaller; ill will makes it larger.'] }
];

// One building at the start, plus one for every campaign battle won or drawn.
export function unlockedCount(c) {
  const wins = (c.history || []).filter(h => h.id !== 'prologue' && h.outcome !== 'defeat').length;
  return Math.min(BUILDINGS.length, 1 + wins);
}
export const unlockedBuildings = (c) => BUILDINGS.slice(0, unlockedCount(c));

const W = 1000, H = 620;

// Building artwork in a local 170x110 box (the label sits below it).
function art(id) {
  switch (id) {
    case 'training': return `<rect x="6" y="6" width="158" height="98" rx="6" fill="#8aa05a" opacity=".6" stroke="#46562a" stroke-width="2" stroke-dasharray="7 5"/>
      <circle cx="40" cy="38" r="8" fill="#6b4a22"/><circle cx="85" cy="38" r="8" fill="#6b4a22"/><circle cx="130" cy="38" r="8" fill="#6b4a22"/>
      <line x1="55" y1="92" x2="100" y2="62" stroke="#e8e0cc" stroke-width="4" stroke-linecap="round"/><line x1="100" y1="92" x2="55" y2="62" stroke="#e8e0cc" stroke-width="4" stroke-linecap="round"/>`;
    case 'depot': return `<polygon points="8,52 85,10 162,52" fill="#8a4a2a" stroke="#3a1f10" stroke-width="2"/><rect x="18" y="52" width="134" height="50" fill="#b89a6a" stroke="#3a2a14" stroke-width="2"/>
      <rect x="70" y="66" width="30" height="36" fill="#5a3a1a"/><circle cx="36" cy="92" r="11" fill="#7a5a2a" stroke="#2a1a0a" stroke-width="2"/><circle cx="134" cy="92" r="11" fill="#7a5a2a" stroke="#2a1a0a" stroke-width="2"/>`;
    case 'barracks': return [[8, 36], [58, 28], [108, 36]].map(([x, y]) => `<polygon points="${x},100 ${x + 27},${y} ${x + 54},100" fill="#cdb67f" stroke="#4a3a1a" stroke-width="2"/><rect x="${x + 21}" y="76" width="12" height="24" fill="#5a4a2a"/>`).join('');
    case 'officers': return `<polygon points="20,102 85,34 150,102" fill="#a8322a" stroke="#3a0f0a" stroke-width="2"/><polygon points="52,102 85,64 118,102" fill="#7a2018"/>
      <line x1="85" y1="34" x2="85" y2="6" stroke="#3a2a14" stroke-width="3"/><polygon points="85,6 112,14 85,22" fill="#e8c36a"/>`;
    case 'forge': return `<rect x="18" y="44" width="116" height="58" fill="#6b6b72" stroke="#26262c" stroke-width="2"/><rect x="104" y="14" width="18" height="34" fill="#55555c" stroke="#26262c" stroke-width="2"/>
      <circle cx="56" cy="78" r="13" fill="#e8742a" stroke="#7a2a0a" stroke-width="2"/><rect x="92" y="84" width="30" height="12" fill="#1e1e22"/><circle cx="113" cy="8" r="6" fill="#ccc" opacity=".5"/>`;
    case 'hospital': return `<polygon points="14,102 85,30 156,102" fill="#e8e0cc" stroke="#5a4a2a" stroke-width="2"/><rect x="64" y="66" width="42" height="36" fill="#cbbf9f"/>
      <rect x="78" y="44" width="14" height="30" fill="#a8322a"/><rect x="70" y="52" width="30" height="12" fill="#a8322a"/>`;
    case 'hall': return `<polygon points="6,48 85,8 164,48" fill="#7a2a22" stroke="#2a0a08" stroke-width="2"/>${[22, 60, 98, 136].map(x => `<rect x="${x}" y="48" width="12" height="54" fill="#e8dcc0" stroke="#5a4a2a" stroke-width="1.5"/>`).join('')}<rect x="14" y="100" width="142" height="8" fill="#9a8a6a"/>`;
    default: return '';
  }
}

export function sceneSvg(c, { visited = [], focus = null } = {}) {
  const un = unlockedBuildings(c), unIds = new Set(un.map(b => b.id)), seen = new Set(visited);
  let s = `<svg viewBox="0 0 ${W} ${H}" id="campsvg" role="group" aria-label="Your camp. Click a building to use it.">
    <defs><linearGradient id="gnd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#76673f"/><stop offset="1" stop-color="#5a4d2e"/></linearGradient>
      <filter id="shadow" x="-20%" y="-20%" width="150%" height="160%"><feDropShadow dx="5" dy="7" stdDeviation="3.5" flood-color="#0b0804" flood-opacity=".55"/></filter>
      <filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="5" result="t"/><feColorMatrix in="t" values="0 0 0 0 .09  0 0 0 0 .07  0 0 0 0 .02  0 0 0 .55 -.12"/></filter>
      <radialGradient id="glow"><stop offset="0" stop-color="#ffd27a" stop-opacity=".75"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient>
      <linearGradient id="dusk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe9a8" stop-opacity=".07"/><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient></defs>
    <rect width="${W}" height="${H}" fill="#3a4524"/><rect width="${W}" height="${H}" filter="url(#grain)"/>
    <rect x="30" y="30" width="940" height="560" fill="url(#gnd)"/><rect x="30" y="30" width="940" height="560" filter="url(#grain)" opacity=".8"/>`;
  // ground texture
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 160; i++) s += `<ellipse cx="${40 + rnd() * 920}" cy="${40 + rnd() * 540}" rx="${3 + rnd() * 9}" ry="${2 + rnd() * 5}" fill="${rnd() > 0.5 ? '#80713f' : '#4f432a'}" opacity=".35"/>`;
  // streets, with rutted edges
  s += `<rect x="30" y="278" width="940" height="44" fill="#a08a58" opacity=".55"/><rect x="478" y="30" width="44" height="560" fill="#a08a58" opacity=".55"/>
    <path d="M30 284 H970 M30 316 H970 M484 30 V590 M516 30 V590" stroke="#6a5830" stroke-width="1.2" opacity=".5" stroke-dasharray="14 9" fill="none"/>`;
  // palisade (with a gate at the bottom)
  s += `<path d="M30 30 H970 V590 H560 M440 590 H30 Z" fill="none" stroke="#2f2210" stroke-width="11"/><path d="M30 30 H970 V590 H560 M440 590 H30 Z" fill="none" stroke="#9a7a42" stroke-width="6" stroke-dasharray="3 6"/>
    <rect x="420" y="574" width="22" height="34" fill="#4a3516" stroke="#241808" stroke-width="2"/><rect x="558" y="574" width="22" height="34" fill="#4a3516" stroke="#241808" stroke-width="2"/>`;
  // corner watchtowers, with a flapping banner and a torch
  for (const [tx, ty] of [[30, 30], [970, 30], [30, 590], [970, 590]]) s += `<g transform="translate(${tx},${ty})" filter="url(#shadow)"><rect x="-17" y="-17" width="34" height="34" fill="#8a6a38" stroke="#2f2210" stroke-width="3"/><rect x="-11" y="-11" width="22" height="22" fill="#6d5128"/><polygon points="-21,-14 0,-32 21,-14" fill="#7a2a22" stroke="#2a0a08" stroke-width="2"/><line x1="0" y1="-32" x2="0" y2="-52" stroke="#3a2a14" stroke-width="2.5"/><polygon class="flag" points="0,-52 20,-47 0,-41" fill="#b3261e"/></g>`;
  // campfires with a warm glow, and sentries pacing the street
  for (const [fx, fy] of [[446, 338], [554, 262], [250, 262], [750, 338]]) s += `<g transform="translate(${fx},${fy})"><circle r="30" fill="url(#glow)" class="flick"/><circle r="6" fill="#3a2a14"/><polygon class="flame" points="0,-12 5,0 -5,0" fill="#ff9a2e"/><polygon class="flame f2" points="0,-8 3,0 -3,0" fill="#ffe08a"/></g>`;
  s += `<g class="walker"><circle r="4.5" fill="#b3261e" stroke="#2a0a08"/><circle cy="-4" r="2.6" fill="#cfcfc4"/></g><g class="walker w2"><circle r="4.5" fill="#b3261e" stroke="#2a0a08"/><circle cy="-4" r="2.6" fill="#cfcfc4"/></g>`;
  // plaza standard
  s += `<g transform="translate(500,300)"><line x1="0" y1="0" x2="0" y2="-40" stroke="#3a2a14" stroke-width="4"/><circle cx="0" cy="-46" r="9" fill="#e8c36a" stroke="#6a4a14" stroke-width="2"/><rect x="-14" y="-34" width="28" height="12" fill="#a8322a"/></g>`;
  // praetorium (always available)
  s += `<g class="bld" data-b="praetorium" tabindex="0" role="button" aria-label="Command tent: march to battle" transform="translate(390,70)"><title>Command tent: your next battle, and the march</title>
    <rect x="-6" y="-6" width="232" height="146" rx="10" class="hit"/><polygon points="14,118 110,26 206,118" fill="#a8322a" stroke="#3a0f0a" stroke-width="3"/><polygon points="62,118 110,70 158,118" fill="#7a2018"/>
    <line x1="110" y1="26" x2="110" y2="-2" stroke="#3a2a14" stroke-width="4"/><circle cx="110" cy="-8" r="9" fill="#e8c36a" stroke="#6a4a14" stroke-width="2"/>
    <text x="110" y="148" class="bl" text-anchor="middle">Command Tent</text><text x="110" y="166" class="bs" text-anchor="middle">Next battle and the march</text></g>`;
  // buildings
  for (const b of BUILDINGS) {
    const tx = b.x - 85, ty = b.y - 55;
    if (!unIds.has(b.id)) { s += `<g transform="translate(${tx},${ty})" class="plot" aria-hidden="true"><rect x="6" y="6" width="158" height="98" rx="8" fill="none" stroke="#e8c36a" stroke-opacity=".28" stroke-width="2.5" stroke-dasharray="8 8"/><text x="85" y="66" text-anchor="middle" class="plotq">?</text></g>`; continue; }
    const isNew = !seen.has(b.id), isFocus = focus === b.id;
    s += `<g class="bld ${isFocus ? 'focus' : ''}" data-b="${b.id}" tabindex="0" role="button" aria-label="${b.name}: ${b.sub}" transform="translate(${tx},${ty})"><title>${b.name}: ${b.sub}</title>
      <rect x="-6" y="-6" width="182" height="146" rx="10" class="hit"/><g filter="url(#shadow)">${art(b.id)}</g>
      ${isFocus ? '<rect x="-4" y="-4" width="178" height="124" rx="10" class="pulsebox"/>' : ''}
      ${isNew ? '<g transform="translate(160,2)"><circle r="13" fill="#e8c36a" stroke="#2a1a08" stroke-width="2"/><text y="5" text-anchor="middle" class="newb">NEW</text></g>' : ''}
      <text x="85" y="132" class="bl" text-anchor="middle">${b.name}</text></g>`;
  }
  s += `<rect width="${W}" height="${H}" fill="url(#dusk)" pointer-events="none"/></svg>`;
  return s;
}

// One plain sentence telling the player what to do next.
export function advice(c, visited) {
  const un = unlockedBuildings(c), seen = new Set(visited), days = c.daysLeft;
  if (days <= 0) return { text: 'No days remain. Click the command tent and march to battle.', focus: 'praetorium' };
  const fresh = un.find(b => !seen.has(b.id));
  if (un.length === 1 && fresh) return { text: `Welcome to your camp. You have ${days} day${days === 1 ? '' : 's'} before the enemy moves. Click the glowing <b>${fresh.name}</b> to begin.`, focus: fresh.id };
  if (fresh) return { text: `New: the <b>${fresh.name}</b> is built. Click it to see what it offers. You have ${days} day${days === 1 ? '' : 's'} left.`, focus: fresh.id };
  return { text: `You have <b>${days} day${days === 1 ? '' : 's'}</b> left. Each action uses a day. Click any building, or the command tent when you are ready to march.`, focus: null };
}
