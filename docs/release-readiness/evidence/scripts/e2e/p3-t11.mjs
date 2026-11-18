import {chromium, FE, mkLog, watch} from './lib.mjs';
const b = await chromium.launch(); 
for (const vp of [{width:1440,height:900},{width:390,height:844}]) {
const ctx = await b.newContext({viewport: vp});
for (const r of ['/offer-portal','/offer-portal?token=bogus','/offer-portal?token=%3Cscript%3E','/sign/bogus-token','/preboarding/portal/bogus-token','/careers/nonexistent','/careers?q=%3Cimg%20src%3Dx%3E']) {
  const p = await ctx.newPage(); const log = mkLog(); watch(p, log);
  await p.goto(FE + r, {waitUntil: 'domcontentloaded'}); await p.waitForLoadState('networkidle').catch(()=>{}); await p.waitForTimeout(2000);
  const d = await p.evaluate(() => ({ov: document.documentElement.scrollWidth > innerWidth+1 ? document.documentElement.scrollWidth : null, t: document.body.innerText.replace(/\s+/g,' ').slice(0, 260), btn:[...document.querySelectorAll('button')].filter(e=>e.offsetParent).map(e=>e.innerText.trim()).filter(Boolean).slice(0,6)}));
  console.log(vp.width, r, '->', p.url().replace(FE,''), JSON.stringify(d), log.http.slice(0,3), log.console.length);
  await p.close();
}
await ctx.close(); }
await b.close();
