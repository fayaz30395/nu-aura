import {chromium, newContext, FE} from './lib.mjs';
const b = await chromium.launch(); const ctx = await newContext(b, {role: 'hradmin', viewport: {width: 390, height: 844}});
for (const route of ['/recruitment','/recruitment/jobs','/recruitment/candidates','/recruitment/interviews','/recruitment/pipeline','/recruitment/agencies','/recruitment/scorecards','/preboarding','/onboarding','/onboarding/templates','/recruitment/job-boards']) {
  const p = await ctx.newPage(); await p.goto(FE + route, {waitUntil: 'domcontentloaded'}); await p.waitForLoadState('networkidle').catch(()=>{}); await p.waitForTimeout(2500);
  console.log(route, JSON.stringify(await p.evaluate(()=>[...document.querySelectorAll('main button, main a')].filter(e=>e.offsetParent).slice(0,8).map(e=>{const r=e.getBoundingClientRect(); if(!r.width) return null; const t=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2); return (t===e||e.contains(t)||t?.contains(e))?null:(e.innerText||e.getAttribute('aria-label')||'').trim().slice(0,25)+' <- '+(t?.className||'').toString().slice(0,30)}).filter(Boolean))));
  await p.close();
}
await b.close();
