// NU-PG-E3 audit: 390px horizontal overflow + screenshots for NU-Grow survey/wellness/okr/goals pages.
// Run from frontend/ with: node <this file>. Demo employee only (arun@nulogic.io).
import {chromium, uiLogin, newContext, watch, mkLog, FE, SS, STATE, sleep} from '../e2e/lib.mjs';
import fs from 'fs';

const ROUTES = ['/surveys', '/surveys/pulse', '/okr', '/goals', '/wellness'];
const SHOTS = [
  {route: '/okr', scheme: 'light', w: 1440, h: 900, tag: 'desk-light'},
  {route: '/surveys', scheme: 'dark', w: 1440, h: 900, tag: 'desk-dark'},
  {route: '/wellness', scheme: 'light', w: 1440, h: 900, tag: 'desk-light'},
  {route: '/surveys', scheme: 'light', w: 390, h: 844, tag: 'mob-light'},
];

const b = await chromium.launch();
await uiLogin(b, 'emp', 'arun@nulogic.io');
const out = [];

async function visit(route, scheme, w, h) {
  const ctx = await newContext(b, {role: 'emp', viewport: {width: w, height: h}});
  await ctx.addInitScript(() => {});
  const page = await ctx.newPage();
  await page.emulateMedia({colorScheme: scheme});
  const log = mkLog(); watch(page, log);
  await page.goto(FE + route, {waitUntil: 'domcontentloaded', timeout: 90000}).catch(() => {});
  await page.waitForLoadState('networkidle', {timeout: 20000}).catch(() => {});
  await sleep(800);
  const info = await page.evaluate(() => ({
    h1: document.querySelector('h1')?.innerText?.trim() || null,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    path: location.pathname,
  }));
  return {page, ctx, log, info};
}

for (const route of ROUTES) {
  const {page, ctx, log, info} = await visit(route, 'light', 390, 844);
  out.push({route, vp: 'mob', scheme: 'light', ...info, errs: log.http.slice(0, 3)});
  await ctx.close();
}

for (const s of SHOTS) {
  const {page, ctx, log, info} = await visit(s.route, s.scheme, s.w, s.h);
  out.push({route: s.route, vp: s.tag, scheme: s.scheme, ...info, errs: log.http.slice(0, 3)});
  const name = `NU-PG-E3-${s.route.replace(/\//g, '_').replace(/^_/, '') || 'root'}-${s.tag}.png`;
  await page.screenshot({path: `${SS}/${name}`, fullPage: false});
  console.log('shot', `${SS}/${name}`);
  await ctx.close();
}

fs.writeFileSync(`${STATE}/pg-e3-audit.json`, JSON.stringify(out, null, 1));
for (const o of out) console.log(JSON.stringify(o));
await b.close();
