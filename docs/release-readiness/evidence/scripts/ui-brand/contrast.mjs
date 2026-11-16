// WCAG 2.x contrast check for NULogic brand tokens. Pure node: `node contrast.mjs`.
// Parses app/globals.css so it always checks the shipped values.
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../../../../frontend/app/globals.css'), 'utf8');
const iDark = css.indexOf('.dark,\n  :root[data-theme="dark"] {', css.indexOf('AURA DARK THEME'));
const iElv = css.indexOf('STUDIO SLATE — ELEVATION LAYER');
const dark = css.slice(iDark, css.indexOf('\n  }\n', iDark));
const light = css.slice(0, iElv);

const read = (block, base) => {
  const vars = {};
  for (const m of block.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)) vars[m[1]] = m[2].trim();
  return {...base, ...vars};
};
const L = read(light, {});
const D = read(dark, L);
const val = (v, name, d = 0) => {
  const x = v[name];
  if (x === undefined || d > 8) throw new Error('unresolved ' + name);
  const m = x.match(/^var\((--[a-z0-9-]+)\)$/);
  return m ? val(v, m[1], d + 1) : x;
};
const parse = (c) => {
  c = c.replace(/\/\*.*\*\//, '').trim();
  let m = c.match(/^#([0-9a-f]{6})$/i);
  if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)).concat(1);
  m = c.match(/^rgba?\(([^)]+)\)$/);
  if (m) { const p = m[1].split(',').map(Number); return [p[0], p[1], p[2], p[3] ?? 1]; }
  throw new Error('bad color ' + c);
};
const over = (fg, bg) => fg[3] >= 1 ? fg : [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3])).concat(1);
const lum = ([r, g, b]) => [r, g, b].map((c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; })
  .reduce((a, c, i) => a + c * [0.2126, 0.7152, 0.0722][i], 0);
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// [label, fg token, bg token, min]
const pairs = [
  ['heading on page', '--text-heading', '--bg-page', 4.5],
  ['heading on card', '--text-heading', '--bg-card', 4.5],
  ['body on page', '--text-primary', '--bg-page', 4.5],
  ['body on card', '--text-primary', '--bg-card', 4.5],
  ['secondary on card', '--text-secondary', '--bg-card', 4.5],
  ['secondary on page', '--text-secondary', '--bg-page', 4.5],
  ['muted on card', '--text-muted', '--bg-card', 4.5],
  ['muted on page', '--text-muted', '--bg-page', 4.5],
  ['muted on hover', '--text-muted', '--surface-hover', 4.5],
  ['primary button label', '--text-inverse-btn', '--btn-primary-bg', 4.5],
  ['primary button label (hover)', '--text-inverse-btn', '--btn-primary-bg-hover', 4.5],
  ['link/accent text on card', '--accent-text', '--bg-card', 4.5],
  ['link/accent text on page', '--accent-text', '--bg-page', 4.5],
  ['accent text on accent-soft', '--accent-text', '--accent-soft', 4.5],
  ['sidebar text on nav', '--on-rail', '--nav', 4.5],
  ['sidebar dim text on nav', '--on-rail-dim', '--nav', 4.5],
  ['sidebar active text on nav', '--sidebar-text-active', '--nav', 4.5],
  ['ok on ok-bg', '--ok-fg', '--ok-bg', 4.5],
  ['warn on warn-bg', '--warn-fg', '--warn-bg', 4.5],
  ['err on err-bg', '--err-fg', '--err-bg', 4.5],
  ['info on info-bg', '--info-fg', '--info-bg', 4.5],
  ['neutral on neutral-bg', '--neutral-fg', '--neutral-bg', 4.5],
  ['err text on card', '--err-fg', '--bg-card', 4.5],
  // non-text (UI components / graphics) need >= 3
  ['border strong on card (UI)', '--border-strong', '--bg-card', 1.5],
  ['focus ring/border on card (UI)', '--border-focus', '--bg-card', 3],
  ['chart-1 on card (graphic)', '--chart-1', '--bg-card', 3],
  ['chart-2 on card (graphic)', '--chart-2', '--bg-card', 3],
  ['chart-3 on card (graphic)', '--chart-3', '--bg-card', 3],
  ['chart-4 on card (graphic)', '--chart-4', '--bg-card', 3],
];
let fail = 0;
for (const [name, v] of [['light', L], ['dark', D]]) {
  const vars = {...v, '--text-inverse-btn': '#ffffff', '--sidebar-text-active': '#ffffff'};
  console.log(`\n== ${name} ==`);
  for (const [label, fgT, bgT, min] of pairs) {
    const bg = over(parse(val(vars, bgT)), parse(val(vars, '--bg-page')));
    const fg = over(parse(val(vars, fgT)), bg);
    const r = ratio(fg, bg);
    const ok = r >= min;
    if (!ok) fail++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${r.toFixed(2).padStart(5)} (>=${min})  ${label}  [${fgT} / ${bgT}]`);
  }
}
console.log(fail ? `\n${fail} FAILED` : '\nALL PASS');
process.exit(fail ? 1 : 0);
