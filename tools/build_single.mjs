// Single-file builds: node tools/build_single.mjs
//   dist/legio.html           full standalone page (double-click to play)
//   dist/legio.artifact.html  fragment for the Artifact tool (title + style + body + script)
// Inlines JS (esbuild IIFE), CSS, and any real art listed in assets/art/manifest.json (as data URIs).
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, existsSync, cpSync } from 'node:fs';
import { extname } from 'node:path';

const res = await build({ entryPoints: ['src/main.js'], bundle: true, format: 'iife', minify: true, write: false, target: 'es2020' });
const js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = readFileSync('style.css', 'utf8');
const html = readFileSync('index.html', 'utf8');
const body = html.match(/<body>([\s\S]*?)<script type="module"/)[1];

const manifest = existsSync('assets/art/manifest.json') ? JSON.parse(readFileSync('assets/art/manifest.json', 'utf8')) : {};
const mime = { '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };
const art = {};
for (const [kind, map] of Object.entries(manifest)) { art[kind] = {}; for (const [id, f] of Object.entries(map)) { const p = `assets/art/${f}`; if (existsSync(p)) art[kind][id] = `data:${mime[extname(f)] || 'image/webp'};base64,${readFileSync(p).toString('base64')}`; } }
const artScript = `<script>window.__LEGIO_ART__=${JSON.stringify(art)};</script>`;

mkdirSync('dist', { recursive: true });
if (existsSync('audio')) cpSync('audio', 'dist/audio', { recursive: true });   // the music files sit beside the page
const title = 'Legio Campaign';
const fonts = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cardo:ital,wght@0,400;0,700;1,400&family=Cinzel:wght@400;600;700&display=swap">';
writeFileSync('dist/legio.html', `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>${fonts}<style>${css}</style></head><body>${body}${artScript}<script>${js}</script></body></html>`);
writeFileSync('dist/legio.artifact.html', `<title>${title}</title>\n${fonts}\n<style>${css}\nhtml,body{height:100%;margin:0;overflow:hidden}</style>\n${body}\n${artScript}\n<script>${js}</script>\n`);
console.log('built dist/legio.html and dist/legio.artifact.html', (js.length / 1024).toFixed(0) + 'KB js');
