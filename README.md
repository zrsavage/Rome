# LEGIO - A Roman Campaign (vertical slice v0.1)

A real-time-with-pause Roman army-building campaign for the browser, inspired by *Ultimate General: Civil War /
American Revolution*. Start as a legate with a thin legion in Gaul, win battles, grow your army, and eventually
become Caesar.

## Run it

No build step. Serve the folder and open it in a browser:

```bash
python3 -m http.server 8080   # then open http://localhost:8080
```

## What's in the slice

- **Camp phase** (4 days before battle): drill a cohort yourself (timing mini-game) or delegate to an officer,
  forage (safe/wide), fortify, rest, recruit, scout, demand tribute or give gifts to chieftains.
- **One battle:** *The Ford of the Axona* (Gaul, 58 BC) - 3 cohorts, slingers, cavalry vs. warbands, javelineers,
  horse and a late reinforcement. Win, **draw by orderly withdrawal**, or lose.
- **Battle systems:** real-time with pause, facing, flanking and rear attacks, charge impact, pilum volleys,
  ranged fire, morale and routing, fatigue, terrain (river, ford, hill, forest), testudo/close order.
- **Persistence:** cohorts keep XP, drill, condition and losses. Officers level up and can be killed.
- **Difficulty:** Tiro / Miles / Centurion / Imperator.

## Controls

| Input | Action |
|---|---|
| Left click / drag | Select unit / box select (`Q` = all) |
| Right click | Move (or attack if clicking an enemy) |
| Right drag | Draw a battle line; units spread along it and face away from the drag |
| `Space`, `1 2 3` | Pause, speed 1x/2x/4x (orders allowed while paused) |
| `H` / `T` | Hold position / toggle testudo (loose order for skirmishers) |
| WASD, wheel | Pan, zoom |

## Layout

```
index.html, style.css
src/data.js      unit types, difficulty, terrain, scenarios
src/sim.js       pure battle simulation (no DOM) - deterministic with a seed
src/render.js    canvas renderer
src/battleui.js  input, HUD, game loop
src/camp.js      camp phase + drill mini-game
src/state.js     campaign state, officers, applying results
src/main.js      screen flow, briefing, results, saves
tools/simtest.mjs  headless balance harness: npm run simtest
docs/DESIGN.md   scope, roadmap, open questions
```

## Status

First-pass balance only (see `docs/DESIGN.md`). Art is procedural placeholder; AI-generated art is planned.
