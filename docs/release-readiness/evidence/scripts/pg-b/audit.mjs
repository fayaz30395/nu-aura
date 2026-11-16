// Audit + screenshots for batch B pages. Run from frontend/ with: node <this file>
import {chromium, uiLogin, newContext, watch, mkLog, FE, SS, STATE, sleep} from '../e2e/lib.mjs';
import fs from 'fs';
const ROUTES = (process.env.ROUTES || '').split(' ').filter(Boolean);
const b = await chromium.launch();
const login = await uiLogin(b, 'hr', 'saran@nulogic.io');
console.log('login url', login.url);
const out = [];
for (const r of ROUTES) {
  for (const vp of [{width: 1440, height: 900, tag: 'desk'}, {width: 390, height: 844, tag: 'mob'}]) {
    const ctx = await newContext(b, {role: 'hr', viewport: {width: vp.width, height: vp.height}});
    const page = await ctx.newPage(); const log = mkLog(); watch(page, log);
    await page.goto(FE + r, {waitUntil: 'domcontentloaded', timeout: 90000}).catch(() => {});
    await page.waitForLoadState('networkidle', {timeout: 20000}).catch(() => {});
    await sleep(800);
    const info = await page.evaluate(() => ({
      h1: document.querySelector('h1')?.innerText?.trim() || null,
      crumb: document.querySelector('nav[aria-label*="breadcrumb" i], [aria-label*="breadcrumb" i]')?.innerText?.replace(/\s+/g, ' ').trim().slice(0, 80) || null,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      path: location.pathname,
    }));
    out.push({route: r, vp: vp.tag, ...info, errs: log.http.slice(0, 3)});
    if (vp.tag === 'desk' && process.env.SHOT) await page.screenshot({path: `${SS}/NU-PG-B-${process.env.SHOT}.png`});
    await ctx.close();
  }
}
fs.writeFileSync(STATE + '/audit.json', JSON.stringify(out, null, 1));
for (const o of out) console.log(JSON.stringify(o));
await b.close();
