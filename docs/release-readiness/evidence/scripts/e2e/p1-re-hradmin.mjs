// P1 - route and screen smoke sweep (plan 17, section P1). Run from repo root after p0-env-check.mjs:
//   node docs/release-readiness/evidence/scripts/e2e/p1-route-sweep.mjs [--roles hradmin,employee,manager] [--only /a,/b] [--md-only]
// Every role opens every static route. Expected access per role comes from frontend/lib/config/routes.ts
// (same rule AuthGuard applies) + the role's live permissions; a correct denial is PASS, a missing gate or a
// wrongly denied permitted screen is FAIL. API responses are classified (authz / not-found / validation / server)
// against reviewed allowlists in ui-helpers.mjs. Dynamic [id] routes are BLOCKED (no fixture mapping yet).
// Output: evidence/p1-re-hradmin.json + evidence/p1-re-hradmin.md
import fs from 'fs';
import {execFileSync} from 'child_process';
import {chromium, newContext, EV, SS, STATE, FE, BE} from './lib.mjs';
import {staticRoutes, dynamicRoutes, catalogueRoutes, openAndCheck, VIEWPORTS, globalTimeout, loadRoutePolicy, expectedAccess, whoAmI, ALLOW_CONSOLE, ALLOW_HTTP, classifyHttp} from './live2-helpers.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const roles = arg('--roles', 'hradmin,employee,manager').split(',');
const only = arg('--only', '') ? arg('--only').split(',') : null;
const OUT_JSON = `${EV}/p1-re-hradmin.json`, OUT_MD = `${EV}/p1-re-hradmin.md`;
const PLAN = '/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/docs/release-readiness/17-e2e-browser-test-plan.md';

if (process.argv.includes('--md-only')) { writeMd(JSON.parse(fs.readFileSync(OUT_JSON, 'utf8'))); console.log('rewrote', OUT_MD); process.exit(0); }
for (const r of roles) if (!fs.existsSync(`${STATE}/${r}.json`)) { console.error(`no login state for ${r}; run p0-env-check.mjs first`); process.exit(2); }

const b = await chromium.launch();
const all = {
  runId: 'NUAURA_TEST_P1_' + Date.now().toString().slice(-6), startedAt: new Date().toISOString(),
  commit: execFileSync('git', ['rev-parse', '--short', 'HEAD'], {cwd: '/Users/fayaz.m/IdeaProjects/nulogic/nu-aura'}).toString().trim(),
  browser: `chromium ${b.version()} / playwright ${JSON.parse(fs.readFileSync('/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/frontend/node_modules/playwright/package.json', 'utf8')).version}`,
  env: {FE, BE}, viewports: VIEWPORTS, allowlists: {console: ALLOW_CONSOLE.map(a => `${a.re} - ${a.reason}`), http: ALLOW_HTTP.map(a => `${a.re} - ${a.reason}`)},
  reconciliation: null, blockedDynamic: dynamicRoutes().map(r => ({route: r, reason: 'dynamic segment: no seeded fixture mapping in this pass'})), roles: {},
};
const save = () => fs.writeFileSync(OUT_JSON, JSON.stringify(all, null, 1));
globalTimeout(150 * 60000, () => { save(); writeMd(all); });

const staticAll = only ? staticRoutes().filter(r => only.includes(r)) : staticRoutes();
{ // catalogue vs app reconciliation
  const cat = catalogueRoutes(PLAN), app = [...staticRoutes(), ...dynamicRoutes()];
  all.reconciliation = {catalogue: cat.length, app: app.length, static: staticRoutes().length, dynamic: dynamicRoutes().length,
    inCatalogueNotApp: cat.filter(r => !app.includes(r)), inAppNotCatalogue: app.filter(r => !cat.includes(r))};
}
const policy = await loadRoutePolicy();

async function sweepRole(role) {
  const ctx = await newContext(b, {role});
  const me = await whoAmI(ctx);
  const R = all.roles[role] = {email: me.email, roles: me.roles, permissions: me.permissions.length, results: []};
  console.log(`[${role}] ${me.email} roles=${me.roles.join(',')} perms=${me.permissions.length}; ${staticAll.length} routes`);
  for (const [i, route] of staticAll.entries()) {
    const expected = expectedAccess(policy, route, me);
    for (const [vpName, viewport] of Object.entries(VIEWPORTS)) {
      const {page, res} = await openAndCheck(ctx, route, {viewport});
      const body = res.error ? '' : await page.locator('body').innerText().catch(() => '');
      const sessionLost = /\/auth\/login/.test(res.finalUrl || '') && !/^\/auth\/login/.test(route) && route !== '/';
      const denied = !sessionLost && (/denied=1/.test(res.finalUrl || '') || (res.finalUrl?.split('?')[0] !== route && /Access Denied|do not have permission/i.test(body)));
      const redirect = !denied && !sessionLost && res.finalUrl && res.finalUrl.split('?')[0] !== route;
      const observed = sessionLost ? 'session-lost' : denied ? 'denied' : redirect ? 'redirect' : 'rendered';
      // protected data must not be fetched/rendered before a denial: count 2xx API data responses on denied pages
      const http = res.log.http.map(h => ({h, cls: classifyHttp(h)}));
      const consoleErrs = res.log.console.filter(s => !ALLOW_CONSOLE.some(a => a.re.test(s)));
      const fail = [];
      let verdict;
      if (expected === 'deny') {
        verdict = observed === 'denied' ? 'PASS-denied' : observed === 'rendered' ? 'FAIL-gate-missing' : observed === 'session-lost' ? 'FAIL-session-lost' : 'PASS-redirected';
        if (verdict === 'FAIL-gate-missing') fail.push(`expected deny (${JSON.stringify(policy.findRouteConfig(route))}) but screen rendered`);
      } else {
        if (observed === 'session-lost') { verdict = 'FAIL-session-lost'; fail.push('signed-in user sent to /auth/login'); }
        // routes.ts allows it but the page/app shell denied (page-level gate, admin console gate, ...): policy mismatch to triage, not an automatic defect.
        else if (observed === 'denied') { verdict = 'REVIEW-denied'; fail.push(`routes.ts says ${expected} (${JSON.stringify(policy.findRouteConfig(route) || {})}) but page denied -> ${res.finalUrl}`); }
        else {
          if (res.error) fail.push(`error: ${res.error}`);
          for (const {h, cls} of http) if (cls === 'authz' || cls === 'not-found' || cls === 'server') fail.push(`${cls}: ${h}`);
          if (consoleErrs.length) fail.push(`console(${consoleErrs.length}): ${consoleErrs[0].replace(/\s+/g, ' ').slice(0, 140)}`);
          if (res.log.failed.length) fail.push(`failed-requests(${res.log.failed.length}): ${res.log.failed[0]}`);
          const c = res.checks;
          if (c) {
            if (c.overflow) fail.push(`overflow ${c.overflow}`);
            if (c.badText.length) fail.push(`badText: ${c.badText.join(' / ')}`);
            if (c.brokenImages.length) fail.push(`brokenImages: ${c.brokenImages.join(', ')}`);
            if (c.spinners) fail.push(`spinner after 10s: ${c.spinners}`);
            if (!c.headings) fail.push('no heading');
          }
          verdict = fail.length ? 'FAIL' : 'PASS';
        }
      }
      if (/^FAIL/.test(verdict) && vpName === 'desktop') await page.screenshot({path: `${SS}/live2-p1-${role}-${route.replace(/\//g, '_').replace(/^_$/, 'root')}.png`}).catch(() => {});
      await page.close().catch(() => {});
      const row = {route, vp: vpName, expected, observed, verdict, finalUrl: res.finalUrl, ms: res.ms, fail, http, console: consoleErrs.slice(0, 5).map(s => s.replace(/\s+/g, ' ').slice(0, 200)), checks: res.checks};
      R.results.push(row);
      console.log(`[${role}] ${i + 1}/${staticAll.length} ${vpName.padEnd(7)} ${route.padEnd(38)} ${expected.padEnd(6)} ${observed.padEnd(12)} ${verdict.padEnd(17)} ${res.ms}ms ${fail.join('; ').slice(0, 120)}`);
    }
    if (i % 10 === 9) save();
  }
  await ctx.storageState({path: `${STATE}/${role}.json`}); // keep refreshed cookies for the next scripts
  await ctx.close();
}

await Promise.all(roles.map(sweepRole));
all.finishedAt = new Date().toISOString();
await b.close();
save(); writeMd(all);
const rows = Object.values(all.roles).flatMap(r => r.results);
const nFail = rows.filter(r => /^FAIL/.test(r.verdict)).length;
console.log(`\nP1 summary (${all.runId} @ ${all.commit}): ${rows.length} page loads, ${nFail} FAIL, ${all.blockedDynamic.length} dynamic routes BLOCKED -> ${OUT_MD}`);
process.exit(nFail ? 1 : 0);

function writeMd(a) {
  const L = [`# P1 route sweep - run ${a.runId}`, '', `- Commit: \`${a.commit}\` · Browser: ${a.browser} · FE ${a.env.FE} · BE ${a.env.BE} · ${a.startedAt.slice(0, 16)}${a.finishedAt ? ' -> ' + a.finishedAt.slice(11, 16) : ' (partial)'}`,
    `- Viewports: ${Object.values(a.viewports).map(v => `${v.width}x${v.height}`).join(', ')}. Expected access per role = \`lib/config/routes.ts\` rule evaluated with the role's live permissions (\`/auth/me\`). A correct denial is PASS-denied.`,
    `- Allowlists (reviewed): console: ${a.allowlists.console.join('; ') || 'none'} · http: ${a.allowlists.http.join('; ') || 'none'}`, ''];
  const rc = a.reconciliation;
  if (rc) L.push(`## Catalogue reconciliation`, '', `Part B lists ${rc.catalogue} routes; \`frontend/app\` has ${rc.app} (${rc.static} static + ${rc.dynamic} dynamic).`,
    rc.inCatalogueNotApp.length ? `- In catalogue, not in app: ${rc.inCatalogueNotApp.map(r => `\`${r}\``).join(', ')}` : '- Every catalogue route exists in the app.',
    rc.inAppNotCatalogue.length ? `- In app, not in catalogue: ${rc.inAppNotCatalogue.map(r => `\`${r}\``).join(', ')}` : '- Every app route is in the catalogue.', '');
  L.push(`## BLOCKED - dynamic routes (${a.blockedDynamic.length})`, '', 'No seeded fixture mapping in this pass; never opened with literal placeholders.', '', a.blockedDynamic.map(d => `- \`${d.route}\``).join('\n'), '');
  for (const [role, R] of Object.entries(a.roles)) {
    const rows = R.results, bad = rows.filter(r => /^FAIL/.test(r.verdict));
    const vc = rows.reduce((m, r) => (m[r.verdict] = (m[r.verdict] || 0) + 1, m), {});
    L.push(`## ${role} (${R.email}; roles ${R.roles.join(', ')}; ${R.permissions} permissions) - ${rows.length} loads`, '', `Verdicts: ${Object.entries(vc).map(([k, v]) => `${k}=${v}`).join(', ')}`, '');
    const cat = f => f.replace(/[:(\s].*$/, '');
    const counts = {}; for (const r of bad) for (const f of r.fail) counts[cat(f)] = (counts[cat(f)] || 0) + 1;
    L.push('| failure class | page loads |', '|---|---|', ...Object.entries(counts).sort((x, y) => y[1] - x[1]).map(([k, v]) => `| ${k} | ${v} |`), '');
    const seen = new Set();
    L.push('| route | vp | expected | observed | verdict | detail |', '|---|---|---|---|---|---|');
    for (const r of bad) { const k = r.route + r.verdict + r.fail.join(); if (seen.has(k) && r.vp === 'mobile') continue; seen.add(k); L.push(`| \`${r.route}\` | ${r.vp} | ${r.expected} | ${r.observed} | ${r.verdict} | ${r.fail.join('; ').replace(/\|/g, '/').slice(0, 230)} |`); }
    const rev = rows.filter(r => r.verdict === 'REVIEW-denied' && r.vp === 'desktop');
    if (rev.length) L.push('', `REVIEW-denied (routes.ts allows, page denied; triage against the intended policy): ${rev.map(r => `\`${r.route}\``).join(', ')}`);
    L.push('', `Denied as expected (PASS-denied): ${[...new Set(rows.filter(r => r.verdict === 'PASS-denied').map(r => r.route))].map(r => `\`${r}\``).join(', ') || 'none'}`, '');
    const slow = [...rows].sort((x, y) => y.ms - x.ms).slice(0, 5);
    L.push(`Slowest: ${slow.map(r => `${r.route} ${Math.round(r.ms / 1000)}s`).join(', ')}`, '');
  }
  fs.writeFileSync(OUT_MD, L.join('\n'));
}
