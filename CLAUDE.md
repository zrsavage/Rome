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

## Shipping changes (user instruction)
When a piece of work is finished and pushed, always open a pull request into the default branch (`claude/peaceful-ramanujan-qmpfyh`) and
merge it, without asking first. Run the checks before pushing (`node tools/pathtest.mjs`, the relevant `tools/simtest.mjs` runs, a browser
smoke test where the UI changed) and rebuild `dist/` with `npm run build`.
