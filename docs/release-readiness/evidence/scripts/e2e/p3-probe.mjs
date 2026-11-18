// usage: node p3-probe.mjs role route [route...]  -> buttons/inputs/headings per route
import {chromium, newContext, FE} from './lib.mjs';
const [role, ...routes] = process.argv.slice(2);
const b = await chromium.launch(); const ctx = await newContext(b, {role});
for (const r of routes) {
  const p = await ctx.newPage(); await p.goto(FE + r, {waitUntil: 'domcontentloaded', timeout: 90000}); await p.waitForLoadState('networkidle', {timeout: 25000}).catch(() => {}); await p.waitForTimeout(2500);
  const d = await p.evaluate(() => ({
    url: location.pathname, h: [...document.querySelectorAll('h1,h2,h3')].map(e => e.innerText.trim()).slice(0, 10),
    btn: [...document.querySelectorAll('main button, main a[role=button], [role=main] button')].filter(e => e.offsetParent).map(e => (e.innerText || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ')).filter(Boolean).slice(0, 30),
    inp: [...document.querySelectorAll('main input, main select, main textarea')].map(e => (e.placeholder || e.name || e.getAttribute('aria-label') || e.type)).slice(0, 12),
    rows: document.querySelectorAll('main tbody tr').length, txt: document.querySelector('main')?.innerText.replace(/\s+/g, ' ').slice(0, 500)}));
  console.log('==', r, JSON.stringify(d)); await p.close();
}
await b.close();
