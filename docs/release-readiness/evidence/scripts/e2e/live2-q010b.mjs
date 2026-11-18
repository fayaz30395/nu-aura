import {chromium, newContext, FE, SS} from './lib.mjs';
const b = await chromium.launch(); const ctx = await newContext(b, {role: 'hradmin'}); const q = await ctx.newPage();
await q.route(/\/api\/v1\/(payroll|recruitment|one-on-one|meetings)/, r => r.fulfill({status: 500, contentType: 'application/json', body: '{"message":"x"}'}));
await q.goto(FE + '/payroll', {waitUntil: 'domcontentloaded', timeout: 180000}); const t0 = Date.now();
for (const s of [5, 15, 30, 45]) { await q.waitForTimeout(Math.max(0, s * 1000 - (Date.now() - t0))); const st = await q.evaluate(() => ({sp: [...document.querySelectorAll('.animate-spin,[class*=skeleton],[role=progressbar]')].filter(e => e.offsetParent).length, txt: document.querySelector('main')?.innerText.replace(/\s+/g, ' ').slice(0, 160)})); console.log(s + 's', JSON.stringify(st)); }
await q.screenshot({path: SS + '/live2-q010-payroll-45s.png'}); await b.close();
