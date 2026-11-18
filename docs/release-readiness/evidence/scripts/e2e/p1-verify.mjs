// P1 follow-up: re-open the pages the sweep flagged, as a second reproduction, and capture what the user sees.
//   node docs/release-readiness/evidence/scripts/e2e/p1-verify.mjs  -> evidence/p1-verify.json + screenshots/ui-p1-<role>-<route>.png
import fs from 'fs';
import {chromium, newContext, EV, SS} from './lib.mjs';
import {openAndCheck, failures, globalTimeout} from './ui-helpers.mjs';

const CANDIDATES = {
  hradmin: ['/', '/auth/login', '/me/documents', '/calendar', '/admin/benefit-plans', '/benefits', '/recruitment/job-boards', '/resources/workload',
    '/fluence/drive', '/helpdesk', '/letters', '/letters/templates', '/reports/attrition', '/tasks', '/settings/sso', '/fluence/wall', '/me/leaves',
    '/auth/forgot-password', '/company-spotlight', '/fluence/templates/new', '/fluence/wiki/new', '/reports/utilization', '/projects/psa', '/shifts', '/employees/import', '/documents'],
  employee: ['/me/documents', '/benefits', '/departments', '/fluence/analytics', '/fluence/dashboard', '/fluence/drive', '/helpdesk', '/performance/competency-matrix', '/performance/revolution', '/tasks', '/travel', '/me/leaves', '/fluence/wall', '/projects/psa'],
  manager: ['/me/documents', '/fluence/analytics', '/fluence/dashboard', '/fluence/drive', '/performance/competency-matrix', '/performance/revolution', '/tasks', '/travel', '/helpdesk'],
};
const out = [];
globalTimeout(30 * 60000, () => fs.writeFileSync(`${EV}/p1-verify.json`, JSON.stringify(out, null, 1)));
const b = await chromium.launch();
for (const [role, routes] of Object.entries(CANDIDATES)) {
  const ctx = await newContext(b, {role});
  for (const route of routes) {
    const {page, res} = await openAndCheck(ctx, route);
    await page.waitForTimeout(1500);
    const text = await page.locator('main, body').first().innerText().catch(() => '');
    const visible = (text.match(/[^\n]*(something went wrong|error|denied|permission|failed|not found|unauthori[sz]ed|no access)[^\n]*/gi) || []).slice(0, 4).map(s => s.trim().slice(0, 120));
    const empty = (text.match(/[^\n]*\b(no |nothing|empty)[^\n]*/gi) || []).slice(0, 3).map(s => s.trim().slice(0, 80));
    const name = `ui-p1-${role}-${route.replace(/\//g, '_').replace(/^_$/, 'root') || 'root'}.png`;
    await page.screenshot({path: `${SS}/${name}`, fullPage: false}).catch(() => {});
    const row = {role, route, finalUrl: res.finalUrl, fail: failures(res), http: res.log.http.slice(0, 6), console: res.log.console.slice(0, 4).map(s => s.replace(/\s+/g, ' ').slice(0, 160)), visible, empty, headings: res.checks?.headings, screenshot: name};
    out.push(row);
    console.log(`[${role}] ${route.padEnd(34)} -> ${String(res.finalUrl).padEnd(28)} ${row.fail.join('; ').slice(0, 110)} | sees: ${visible.join(' / ').slice(0, 120)}`);
    await page.close().catch(() => {});
  }
  await ctx.close();
}
await b.close();
fs.writeFileSync(`${EV}/p1-verify.json`, JSON.stringify(out, null, 1));
console.log(`\n${out.length} pages re-checked -> ${EV}/p1-verify.json`);
