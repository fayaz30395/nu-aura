// P4 Grow sweep: every Grow route x role x viewport. Output: p4-sweep-${process.env.P4_TAG||'x'}.json (read-only, no data created).
import fs from 'fs';
import {chromium, newContext, FE, BE, EV, STATE} from './lib.mjs';
import {openAndCheck, failures, VIEWPORTS, globalTimeout, catalogueRoutes} from './ui-helpers.mjs';
globalTimeout(35*60000);
const plan = '/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/docs/release-readiness/17-e2e-browser-test-plan.md';
const grow = /^\/(feedback360|goals|learning|okr|one-on-one|performance|surveys|training|wellness|app\/grow)/;
const statics = catalogueRoutes(plan).filter(r => grow.test(r) && !r.includes('['));
const b = await chromium.launch();
const DYN_ONLY = process.env.P4_DYN === '1';
const out = [];
const ids = {};
// resolve dynamic ids via API as HR
{
  const ctx = await newContext(b, {role: 'p4hradmin'}); const p = await ctx.newPage();
  await p.goto(FE + '/me/dashboard', {waitUntil: 'domcontentloaded'}); await p.waitForLoadState('networkidle', {timeout: 30000}).catch(() => {});
  const get = u => p.evaluate(async u => { const r = await fetch('http://localhost:8080' + u, {credentials: 'include'}); const t = await r.text(); try { return {s: r.status, b: JSON.parse(t)}; } catch { return {s: r.status, b: null}; } }, u);
  const first = r => { const b = r.b; const a = Array.isArray(b) ? b : b?.content || b?.data?.content || b?.data || []; return Array.isArray(a) ? a[0] : null; };
  for (const [k, u] of Object.entries({course: '/api/v1/lms/courses?size=1', path: '/api/v1/lms/learning-paths?size=1', survey: '/api/v1/surveys?size=1', cycle: '/api/v1/review-cycles?size=1', training: '/api/v1/training/programs?size=1'})) {
    await p.waitForTimeout(500); const r = await get(u); ids[k] = first(r)?.id || null; console.log(k, r.s, ids[k]);
  }
  await ctx.close();
}
const dyn = [];
if (ids.course) dyn.push(`/learning/courses/${ids.course}`, `/learning/courses/${ids.course}/play`);
if (ids.path) dyn.push(`/learning/paths/${ids.path}`);
if (ids.survey) dyn.push(`/surveys/${ids.survey}`, `/surveys/${ids.survey}/analytics`, `/surveys/${ids.survey}/respond`);
if (ids.cycle) dyn.push(`/performance/cycles/${ids.cycle}/calibration`, `/performance/cycles/${ids.cycle}/nine-box`);
if (ids.training) dyn.push(`/training/catalog/${ids.training}`);
const routes = DYN_ONLY ? dyn : [...statics, ...dyn];
console.log(routes.length, 'routes');
const ONLY = process.env.P4_ROLES ? process.env.P4_ROLES.split(',') : ['employee','p4manager','p4hradmin'];
for (const role of ONLY) {
  const ctx = await newContext(b, {role});
  for (const route of routes) for (const vp of ['desktop', 'mobile']) {
    const {page, res} = await openAndCheck(ctx, route, {viewport: VIEWPORTS[vp], settle: 8000});
    const text = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 220)).catch(() => '');
    const f = failures(res);
    out.push({role, vp, route, finalUrl: res.finalUrl, ms: res.ms, f, text, http: res.log.http.slice(0, 6), con: res.log.console.slice(0, 3), checks: res.checks && {overflow: res.checks.overflow, h1: res.checks.h1, bad: res.checks.badText}});
    if (vp === 'desktop' && role === 'hradmin' && f.length) await page.screenshot({path: `${EV}/screenshots/ui-p4-sweep-${route.replace(/\W+/g, '_')}.png`}).catch(() => {});
    await page.close();
    console.log(role, vp, route, res.finalUrl, f.length ? f.join(' ; ').slice(0, 160) : 'ok');
  }
  await ctx.close();
}
fs.writeFileSync(`${EV}/p4-sweep-${process.env.P4_TAG||'x'}.json`, JSON.stringify({ids, out}, null, 1));
await b.close();
