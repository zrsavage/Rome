# Art pipeline

## How art gets into the game
Every picture goes through `artSrc(kind, key, w, h)` in `src/art.js`. If `assets/art/manifest.json` lists a real file for
that `kind`/`key`, it is used; otherwise a procedural placeholder is drawn (unit glyphs, helmeted officer busts, framed
battle maps, outcome banners, each marked PLACEHOLDER).

```json
{ "unit": { "legionary": "unit_legionary.webp" }, "officer": { "1": "officer_1.webp" },
  "scenario": { "ford": "scenario_ford.webp" }, "outcome": { "victory": "outcome_victory.webp" } }
```

Kinds and sizes: `unit` 512x512, `officer` 512x640, `scenario` 1600x480, `outcome` 1600x400 (WebP, keep each under ~150 KB).
`npm run art` regenerates `docs/ART_SHOTLIST.md` with a prompt per asset and its status. `npm run build` inlines any listed
art into the single-file builds, so the artifact picks it up automatically.

Battlefield soldiers stay procedural dot formations: they read well at game zoom, and AI sprite sheets would look inconsistent.

## Accuracy brief (every Roman prompt)
Late Republic, 58 BC: Montefortino or Coolus helmet, mail (lorica hamata) with shoulder doubling, scutum with thunderbolt,
gladius Hispaniensis, pilum, caligae, red tunic. Not segmentata, not Imperial kit, not gladiator armour. Gauls: torcs, bracae,
checked cloaks, long oval shields and swords, mail on the wealthy; not Viking or fantasy barbarians.

## Sources checked (Nov 2026)
- **Hugging Face Hub:** no usable Roman soldier art. Pixel-art and sprite LoRAs exist (Z-Image-Turbo pixel LoRA by tarn59,
  Limbicnation/pixel-art-lora, fal/flux-2-klein-4b-spritesheet-lora), all Apache-2.0. Objaverse (ODC-BY) has 3D models but
  is unfiltered.
- **Generation:** the connected Z-Image-Turbo tool uses the free ZeroGPU quota, which was exhausted on 2026-11-08.
  Other generators reachable through `dynamic_space`: FLUX.1 Krea/schnell, Qwen-Image (all also GPU-quota based).
- **Elsewhere (check each licence before use):** OpenGameArt "Pixel art top down soldiers" (CC0, not Roman), Kenney (CC0),
  itch.io Roman/Germanic 32x32 packs (paid), Sketchfab (filter by CC-BY/CC0), Wikimedia Commons for reference imagery.
