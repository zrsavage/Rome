# Notes for future sessions on LEGIO

## Art priority when Hugging Face is available (user instruction)
The Hugging Face ZeroGPU quota is small (about eight generations a day) and is often exhausted. **The first thing to do whenever an image-generation
tool (`mcp__Hugging_Face_Custom__*`) works is to make ONE large camp picture** to use as the basis of the camp screen (a wide painted view of a Roman
marching camp in Gaul, 58 BC: palisade and towers, central command tent with standards, tent rows, training yard, granary, smithy, hospital tent,
fields and forest outside). The current SVG camp (`src/campscene.js`) is acceptable but the user does not love it. Prompt draft and layout notes are in
`docs/ART_SHOTLIST.md`. Use `1536x864 (16:9)` or larger, try several seeds, then lay the clickable building hotspots over the picture.
Do not spend the quota on anything else first. Other findings about the models (none can draw a true top-down figure) are in `docs/ART.md`.

## Historical accuracy
The user wants close, not perfect, historical accuracy (Caesar's Gaul, 58 BC onward). Check names and kit for anachronisms: no segmentata, no
woad on Gauls, no round Gallic shields, no red cross, only places that existed in 58 BC on the map.

## Play-test audits (run before shipping anything that touches battles, camp numbers or the battle screen)
The balance harness (tools/simtest.mjs) only says whether battles can be won: its bots give orders all the time and fight with tidy armies,
so it missed near-total wounded recovery, a rash officer who charged every battle, cards covering a fifth of the screen and broken
grouping in the Barracks. Two audits check what a player actually meets:
- `sh tools/audit_all.sh` (or `node tools/audit.mjs <scenario>`): every battle played by a patient player (no orders), a player who
  orders everyone to hold, and the smart bot, with a messy army (mixed kinds raised in interleaved order, officers of every temper, every
  recovery bonus stacked). Rules: wounded recovery within its caps, no impossible numbers, hold is obeyed, units do not charge unordered
  more than rarely, no chance event in nearly every battle, battles end on time. Exits 1 with the broken rules listed.
- `node tools/uiaudit.cjs`: the battle screen at 800x600, 1366x768 and 1920x1080 with 5, 20 and 60 units; the interface must cover under
  18% of the screen and the card strip under 8%, with nothing off screen. Saves screenshots to look at.
Also look at the screenshots yourself with a big army before calling a screen finished, and add a rule to the audit for any new bug class.

## Shipping changes (user instruction)
When a piece of work is finished and pushed, always open a pull request into the default branch (`claude/peaceful-ramanujan-qmpfyh`) and
merge it, without asking first. Run the checks before pushing (`node tools/pathtest.mjs`, the relevant `tools/simtest.mjs` runs, a browser
smoke test where the UI changed) and rebuild `dist/` with `npm run build`.
