# LEGIO - A Roman Campaign (vertical slice v0.1)

A real-time-with-pause Roman army-building campaign for the browser, inspired by *Ultimate General: Civil War /
American Revolution*. Start as a legate with a thin legion in Gaul, win battles, grow your army, and eventually
become Caesar.

## Run it

No build step. Serve the folder and open it in a browser:

```bash
python3 -m http.server 8080   # then open http://localhost:8080
```

## What's in it (v0.2)

- **Campaign map** with save slots (3), difficulty (Tiro / Miles / Centurion / Imperator) and a route through **Act I: Gaul, 58 BC**
  (later acts are shown locked on the map).
- **Six battles:** Fords of the Rhone at Genava (small skirmish), The Foragers' Road (defend the wagons), The Hill Fort of the Sequani
  (storm a hilltop), The Crossing of the Arar (catch stragglers), Ambush in the Silva (historical-defeat style: survive, big
  rewards) and the named **Battle of Bibracte** with a flank/rear attack by the Boii and Tulingi.
- **Camp phase** between battles (limited days): training is a decision, not a minigame: pick *what* to drill (formation drill, weapons practice or field exercises, each with different gains, tiredness, casualty risk and supply cost), informed by the centurion's advice on the next battle, then *who* leads it (specialist officers beat you at their own drill). A short skippable scene shows it being run or delegate to an officer, forage,
  fortify, rest, recruit, scout, demand tribute or give gifts. Fortifications improve morale and make orderly withdrawals easier.
- **Rewards:** victories and **draws** (orderly withdrawal or surviving to the time limit) give spoils and new units
  (Cretan archers, IV-VII Cohorts, allied Gallic horse). Defeat keeps you on the same battle; there is a replacement floor so a
  bad run cannot soft-lock the army.
- **Battle systems:** real-time with pause, facing, flanking/rear attacks, charge impact, pilum volleys, ranged fire, morale and
  routing, fatigue, terrain, testudo, objectives (capture-and-hold), reinforcements on both sides.
- **Battle readability:** flank arcs (green front / yellow flanks / red rear), range rings (V), floating casualty numbers, hit
  flashes, dust trails, destination ghosts with facing arrows, control groups, objective HUD.
- Officers level up and can die (not on Tiro). Cohorts keep XP, drill and condition across the campaign.

## Balancing the camp

`node tools/campbalance.mjs [seeds] [scenarios] [filter]` prices every camp option in denarii-equivalents (gold + 1.5 x supplies + 120 per
day) and measures what it buys in battle with the tactician bot (men alive afterwards, win rate), starting each seed from a slightly
different army so the result is not a coin-flip. Unit-targeted options are applied to three cohorts. Equipment: +6% armour, +10% attack per
tier. Drills about +50% over the first pass. Rest also returns 15% of missing men. Fortify +4 morale per level. Hospital +30% recovery per
level. Allied infantry 340 denarii, slingers 130.

## Stances

Orders never change a unit's stance. A move order sets the unit's new **post**. Units on *Defend post* (the default) fight what
comes near, then walk back to the post; units on *Hold* never leave it. Routed units that rally return to their post. Stance
shows on the unit card (`- hold`), on the field (`H` after the count) and in the unit panel.

## Battle length and depth

- Battles are built to run **5-10+ minutes**: slower lethality, softer morale shocks, and enemy armies that arrive in staged
  **waves** (vanguard, main body, reserve). If you clear the field, the next wave is called after a 12-second breather, with a visible
  countdown and a *Call next wave* button, so you never wait on an empty field.
- **Movement:** friendly units never shove each other; a unit marching through a friend moves at 30% speed. Marching missile units stop
  to fire when an enemy is in range ahead (Ctrl+right-click overrides). Fall back (R) is an orderly walk backward facing the enemy. A competent bot takes 7-10 minutes on Act I.
- The opening battle is deliberately short and easy: a hurried player can finish it in about a minute and a half, a careful one in about five.
- Fatigue builds during long fights; press **R** to pull a tired unit back to rest and re-form.

## Army management depth

- **Officer skill trees:** each level earns a skill point; 12 perks across tactics, drill, logistics and diplomacy (attached
  officers help their unit, others help the whole army).
- **Equipment:** upgrade armour and weapons per cohort (3 tiers, denarii + supplies + a day).
- **Every building is a decision, not a checkbox:** each opens with an adviser's note tied to your army and the next enemy (quartermaster, camp prefect, armourer, physician, interpreter), live previews of what each choice does, and a real tradeoff. Foraging has four options (cautious, wide, requisition for goodwill, buy for coin); the Barracks weighs rest against recruiting (which dilutes experience) against fortifying; the Armourer shows per-man cost and effect; the Hospital shows how many men it would actually have saved last battle; the Hall shows what goodwill does to the enemy's size; scouting reveals reinforcement timing in the briefing.
- **Instructors:** assign an officer to train a cohort automatically every day.
- **Field hospital:** up to 3 levels, better wound recovery.
- **Raise units:** build new cohorts, slingers, archers and cavalry; the command limit grows with each battle won or drawn;
  new unit types unlock as you progress (allied cavalry, archers, allied infantry).
- **Veteran traits** by experience level, and a **choose-one bonus** after every victory or draw (plunder, captured arms,
  a new officer, veterans, surgeons, stores).

## Starting a campaign

The flow is **one question per screen** with a progress indicator, a Back button, and a live summary of your starting position. The camp is a drawn Roman fort: each building is one activity and opens one small panel. You start with a single building (the Training Ground, pulsing as the place to begin); every battle won or drawn builds the next (Supply Depot, Barracks, Officers' Tent, Armourer, Field Hospital, Chieftains' Hall). Unbuilt plots show as faint question marks, and each new building is introduced once in plain words.

New Campaign opens **Your Origins**, a short character creation in the spirit of Ultimate General: pick your family, early career
and approach (recommended picks are highlighted; a live summary shows starting denarii, supplies, soldiers, goodwill and
modifiers for wounded recovery, replacements, food use, spoils, experience, foraging and morale). Every answer is chosen by you (no quick start, no pre-filled picks), then you fight a short
**opening battle** (First Blood at the Border) and only afterwards reach the campaign map and army management, with a one-time
explanation of what to do there. Defeat in the opening battle simply lets you try again.

## Learning the game (no tutorial mode)

- **No separate tutorial:** the opening battle is a small, easy fight (First Blood at the Border) with contextual hints that appear when they matter: advancing, an enemy approaching, flanks, morale, fatigue, waves.
- **Practice Battle** (main menu): a sandbox with no rewards or saves. Pick your army (small/medium/large), the enemy force,
  terrain (open, ford, hill, forest), enemy tactics (rush, ambush, mixed) and difficulty.

## Maps

The campaign map uses real geography: Natural Earth 10m coastlines, rivers and lakes (public domain) in Mercator, with Roman
place names at true latitude/longitude and a scale bar and graticule. `node tools/gen_map.mjs <rivers.geojson> <lakes.geojson>`
regenerates `src/mapdata.js`. Battle sites: Genava (Rhone fords), the Arar (Saone), Cabillonum, Vesontio, the Morvan, Bibracte.

## Controls

| Input | Action |
|---|---|
| Left click / drag | Select unit / box select (`Q` = all) |
| Right click | Move (or attack if clicking an enemy) |
| Right drag | Draw a battle line; units spread along it and face away from the drag |
| `Space`, `Z X C`, `-` `=` | Pause, speed 1x/2x/4x, step speed down to 0.5x (orders allowed while paused) |
| `Ctrl` + right-click | March without stopping to fire or fight |
| `N` | Call the next enemy wave when the field is clear |
| `Ctrl+1-9`, `1-9` | Set / recall control group (double-tap centres the camera) |
| `V` | Toggle range rings for all units |
| `H` / `G` | **Hold** (never leaves its spot) / **Defend post** (fights nearby enemies, then returns to its post) |
| `T` / `R` | Toggle testudo (loose order for skirmishers) / fall back and rest |
| WASD, wheel | Pan, zoom |

## Layout

```
index.html, style.css
src/data.js      unit types, difficulty, terrain, scenarios
src/sim.js       pure battle simulation (no DOM) - deterministic with a seed
src/render.js    canvas renderer
src/battleui.js  input, HUD, game loop
src/camp.js      camp phase + drill mini-game
src/state.js     campaign state, deployment, officers, applying results and unlocks
src/map.js       campaign map screen (real geography)
src/mapdata.js   GENERATED coastlines, rivers, lakes (tools/gen_map.mjs)
src/coach.js     contextual hints for the opening battle
src/practice.js  practice battle builder
src/origins.js   character-creation choices, starting modifiers and their descriptions
src/perks.js     officer perks, veteran traits, equipment tiers
src/rewards.js   post-battle bonus choices
src/art.js       art loader with procedural placeholders
src/main.js      screen flow, briefing, results, saves
tools/simtest.mjs  headless balance harness: node tools/simtest.mjs [runs] [scenario|all] [difficulty|all]
docs/DESIGN.md   scope, roadmap, open questions
```

## Status

Balance is first-pass: on Miles an aggressive plan with cavalry beats every scenario; passive defence usually loses; Centurion
and Imperator scale enemy size and morale. Art is procedural placeholder; AI-generated art is planned. See `docs/DESIGN.md`.
