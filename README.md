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
- **Camp phase** between battles (limited days): drill a cohort yourself (timing mini-game) or delegate to an officer, forage,
  fortify, rest, recruit, scout, demand tribute or give gifts. Fortifications improve morale and make orderly withdrawals easier.
- **Rewards:** victories and **draws** (orderly withdrawal or surviving to the time limit) give spoils and new units
  (Cretan archers, IV-VII Cohorts, allied Gallic horse). Defeat keeps you on the same battle; there is a replacement floor so a
  bad run cannot soft-lock the army.
- **Battle systems:** real-time with pause, facing, flanking/rear attacks, charge impact, pilum volleys, ranged fire, morale and
  routing, fatigue, terrain, testudo, objectives (capture-and-hold), reinforcements on both sides.
- **Battle readability:** flank arcs (green front / yellow flanks / red rear), range rings (V), floating casualty numbers, hit
  flashes, dust trails, destination ghosts with facing arrows, control groups, objective HUD.
- Officers level up and can die (not on Tiro). Cohorts keep XP, drill and condition across the campaign.

## Battle length and depth

- Battles are built to run **5-10+ minutes**: slower lethality, softer morale shocks, and enemy armies that arrive in staged
  **waves** (vanguard, main body, reserve), plus a per-scenario minimum fight time. A competent bot takes 7-10 minutes on Act I.
- Fatigue builds during long fights; press **R** to pull a tired unit back to rest and re-form.

## Army management depth

- **Officer skill trees:** each level earns a skill point; 12 perks across tactics, drill, logistics and diplomacy (attached
  officers help their unit, others help the whole army).
- **Equipment:** upgrade armour and weapons per cohort (3 tiers, denarii + supplies + a day).
- **Instructors:** assign an officer to train a cohort automatically every day.
- **Field hospital:** up to 3 levels, better wound recovery.
- **Raise units:** build new cohorts, slingers, archers and cavalry; the command limit grows with each battle won or drawn;
  new unit types unlock as you progress (allied cavalry, archers, allied infantry).
- **Veteran traits** by experience level, and a **choose-one bonus** after every victory or draw (plunder, captured arms,
  a new officer, veterans, surgeons, stores).

## Starting a campaign

The flow is **one question per screen** with a progress indicator, a Back button, and a live summary of your starting position. The camp is split into tabs (Orders, Legion and equipment, Officers, Raise units) so only one area is on screen at a time.

New Campaign opens **Your Origins**, a short character creation in the spirit of Ultimate General: pick your family, early career
and approach (recommended picks are highlighted; a live summary shows starting denarii, supplies, soldiers, goodwill and
modifiers for wounded recovery, replacements, food use, spoils, experience, foraging and morale). Then you fight a short
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
| `Space`, `Z X C` | Pause, speed 1x/2x/4x (orders allowed while paused) |
| `Ctrl+1-9`, `1-9` | Set / recall control group (double-tap centres the camera) |
| `V` | Toggle range rings for all units |
| `H` / `T` / `R` | Hold position / toggle testudo (loose order for skirmishers) / fall back and rest |
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
