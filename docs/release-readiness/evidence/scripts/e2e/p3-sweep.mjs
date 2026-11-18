// P3 sweep: Hire routes x 3 roles x 2 viewports. Output: scratchpad p3-sweep.json
import fs from 'fs';
import {chromium, newContext, STATE} from './lib.mjs';
import {openAndCheck, VIEWPORTS, failures, isRedirect, globalTimeout} from './ui-helpers.mjs';
globalTimeout(25*60000);
const ROUTES = ['/careers','/offer-portal','/onboarding','/onboarding/new','/onboarding/templates','/onboarding/templates/new','/preboarding','/recruitment','/recruitment/agencies','/recruitment/candidates','/recruitment/career-page','/recruitment/interviews','/recruitment/job-boards','/recruitment/jobs','/recruitment/pipeline','/recruitment/scorecards','/referrals'];
const b = await chromium.launch(); const out = [];
for (const role of (process.argv[2]||'hradmin,manager,employee').split(',')) {
  const ctx = await newContext(b, {role});
  for (const route of ROUTES) for (const vp of ['desktop','mobile']) {
    const {page, res} = await openAndCheck(ctx, route, {viewport: VIEWPORTS[vp], settle: 8000});
    const txt = (await page.evaluate(() => document.body.innerText.slice(0, 300)).catch(()=>'')).replace(/\s+/g,' ');
    out.push({role, vp, route, final: res.finalUrl, f: failures(res), txt, http: res.log.http.slice(0,6), con: res.log.console.slice(0,3)});
    await page.close();
  }
  await ctx.close();
}
fs.writeFileSync(STATE + '/p3-sweep-' + (process.argv[2]||'all') + '.json', JSON.stringify(out, null, 1));
await b.close();
for (const r of out) if (r.f.length || r.final.split('?')[0] !== r.route) console.log(r.role, r.vp, r.route, '->', r.final, '|', r.f.join(' ; ').slice(0, 260));
