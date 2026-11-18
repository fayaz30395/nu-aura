import {chromium, newContext, FE} from './lib.mjs';
const b = await chromium.launch(); const ctx = await newContext(b, {role: 'hradmin', viewport: {width: 390, height: 844}});
for (const [route, btn] of [['/recruitment/jobs','Create Job Opening'],['/recruitment/candidates','Add Candidate'],['/recruitment/interviews','Schedule Interview'],['/recruitment/pipeline','Add Applicant'],['/preboarding','Invite Candidate'],['/recruitment/agencies','Add Agency']]) {
  const p = await ctx.newPage(); await p.goto(FE + route, {waitUntil: 'domcontentloaded'}); await p.waitForLoadState('networkidle').catch(()=>{}); await p.waitForTimeout(2500);
  await p.locator('button:visible', {hasText: btn}).first().click({timeout:5000}).catch(e=>console.log('nobtn',route,String(e).split('\n').slice(0,6).join(' ').slice(0,300))); await p.waitForTimeout(900);
  const d = await p.evaluate(() => { const e = document.querySelector('[role=dialog]'); if (!e) return null; const r = e.getBoundingClientRect(); const sb = [...e.querySelectorAll('button[type=submit]')].pop(); const sr = sb?.getBoundingClientRect(); return {w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), vw: innerWidth, vh: innerHeight, ovX: e.scrollWidth > e.clientWidth+1, sbVisibleWithoutScroll: sr ? sr.bottom <= innerHeight : null, docOverflow: document.documentElement.scrollWidth > innerWidth+1}; });
  console.log(route, JSON.stringify(d));
  await p.close();
}
// table overflow on mobile lists
for (const route of ['/recruitment/jobs','/recruitment/candidates','/recruitment/interviews','/recruitment/pipeline','/recruitment/career-page']) {
  const p = await ctx.newPage(); await p.goto(FE + route, {waitUntil: 'domcontentloaded'}); await p.waitForLoadState('networkidle').catch(()=>{}); await p.waitForTimeout(2500);
  console.log(route, JSON.stringify(await p.evaluate(() => { const t = document.querySelector('table'); const bad=[...document.querySelectorAll('main button,main a')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+1||r.left<-1)}).length; return {table: !!t, tableW: t?.scrollWidth, wrapScroll: t ? getComputedStyle(t.parentElement).overflowX : null, offscreenControls: bad, docW: document.documentElement.scrollWidth}; })));
  await p.close();
}
await b.close();
