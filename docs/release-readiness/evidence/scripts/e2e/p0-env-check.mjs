// P0 - environment check. Run from repo root: node docs/release-readiness/evidence/scripts/e2e/p0-env-check.mjs
// FE 200, UI login for 3 roles (saves storageState for P1/P2), demo panel visible, dashboard loads with no console errors.
import fs from 'fs';
import {chromium, uiLogin, newContext, watch, mkLog, FE, BE, EV, SS, rec, results, sleep} from './lib.mjs';
import {ROLES, isNoise, globalTimeout} from './ui-helpers.mjs';

import {execFileSync} from 'child_process';
const b = await chromium.launch();
const meta = {runId: 'NUAURA_TEST_P0_' + Date.now().toString().slice(-6), startedAt: new Date().toISOString(),
  commit: execFileSync('git', ['rev-parse', '--short', 'HEAD'], {cwd: '/Users/fayaz.m/IdeaProjects/nulogic/nu-aura'}).toString().trim(), browser: `chromium ${b.version()}`, env: {FE, BE}};
console.log(`P0 run ${meta.runId} @ ${meta.commit} ${meta.browser}`);
const out = () => fs.writeFileSync(`${EV}/p0-env-check.json`, JSON.stringify({...meta, results}, null, 1));
globalTimeout(15 * 60000, out);
// every request must stay on the local stack (A1: fail closed if any other host is contacted)
const foreignHosts = new Set();
const trackHosts = page => page.on('request', r => { const h = new URL(r.url()).host; if (!/^(localhost|127\.0\.0\.1|backend)(:\d+)?$/.test(h) && !/^(data|blob):/.test(r.url())) foreignHosts.add(h); });

// 1. FE answers
try {
  const r = await fetch(`${FE}/auth/login`);
  rec('P0-01', 'FE /auth/login answers', r.status === 200 ? 'PASS' : 'FAIL', `HTTP ${r.status}`);
} catch (e) { rec('P0-01', 'FE /auth/login answers', 'FAIL', String(e).slice(0, 120)); }
try {
  const h = await (await fetch(`${BE}/actuator/health`)).json();
  const down = Object.entries(h.components || {}).filter(([, v]) => v.status !== 'UP').map(([k]) => k);
  rec('P0-02', 'BE health', h.components?.db?.status === 'UP' ? 'PASS' : 'FAIL', `status=${h.status} down=[${down.join(',')}]`);
} catch (e) { rec('P0-02', 'BE health', 'FAIL', String(e).slice(0, 120)); }

// 2. demo panel on login page
{
  const ctx = await newContext(b); const p = await ctx.newPage(); const log = mkLog(); watch(p, log); trackHosts(p);
  await p.goto(`${FE}/auth/login`, {waitUntil: 'domcontentloaded', timeout: 120000});
  await p.waitForLoadState('networkidle', {timeout: 30000}).catch(() => {});
  const demo = await p.getByText(/demo accounts/i).first().isVisible().catch(() => false);
  if (!demo) await p.screenshot({path: `${SS}/ui-p0-demo-panel.png`});
  // The panel is bundled only when NEXT_PUBLIC_DEMO_MODE=true (app/auth/login/page.tsx); its presence is the observable flag value.
  rec('P0-03', 'Demo panel visible on login', demo ? 'PASS' : 'FAIL', demo ? 'Demo Accounts panel rendered (NEXT_PUBLIC_DEMO_MODE=true in this local build)' : 'panel not found: local build has NEXT_PUBLIC_DEMO_MODE off, demo logins will not be offered');
  const errs = log.console.filter(s => !isNoise(s));
  rec('P0-04', 'Login page console clean', errs.length ? 'FAIL' : 'PASS', errs.length ? errs.slice(0, 3).join(' | ') : 'no console errors');
  await ctx.close();
}

// 3. login per role (5/min/IP limit -> wait between, retry once after 60s on failure)
let first = true;
for (const [role, email] of Object.entries(ROLES)) {
  if (!first) await sleep(15000); first = false;
  let r = null, err = null;
  for (let attempt = 0; attempt < 2 && !r; attempt++) {
    try { r = await uiLogin(b, role, email); } catch (e) { err = String(e).split('\n')[0].slice(0, 160); if (attempt === 0) await sleep(60000); }
  }
  if (!r) { rec(`P0-10-${role}`, `Login ${role}`, 'FAIL', err); continue; }
  const bad = r.log.http.filter(h => !/^40[13] (GET|POST) \/api\/(auth\/me|auth\/refresh|v1\/auth\/me)/.test(h));
  rec(`P0-10-${role}`, `Login ${role}`, 'PASS', `landed on ${r.url.replace(FE, '')}${bad.length ? ' http:' + bad.join(',') : ''}`);

  // 4. dashboard loads with no console error
  const ctx = await newContext(b, {role}); const p = await ctx.newPage(); const log = mkLog(); watch(p, log); trackHosts(p);
  await p.goto(`${FE}/dashboard`, {waitUntil: 'domcontentloaded', timeout: 120000});
  await p.waitForLoadState('networkidle', {timeout: 30000}).catch(() => {});
  await p.waitForTimeout(2000);
  const url = p.url().replace(FE, '');
  const text = await p.locator('body').innerText().catch(() => '');
  const errs = log.console.filter(s => !isNoise(s));
  const http = log.http.filter(h => !/\/api\/auth\/(me|refresh)/.test(h));
  const hasError = /something went wrong|error loading|failed to load|unexpected error/i.test(text);
  const ok = !/\/auth\/login/.test(url) && !hasError && !errs.length && !http.length;
  if (!ok) await p.screenshot({path: `${SS}/ui-p0-dashboard-${role}.png`, fullPage: true});
  rec(`P0-11-${role}`, `Dashboard loads ${role}`, ok ? 'PASS' : 'FAIL',
    `url=${url} errorText=${hasError} console=${errs.length ? errs.slice(0, 3).join(' | ') : 0} http=${http.join(',') || 0}`);
  await ctx.close();
}

// Reviewed external dependency: the login page loads the Google Identity script for the OAuth button; no app data goes there.
const EXTERNAL_OK = {'accounts.google.com': 'Google Identity script (OAuth button)'};
const unexpected = [...foreignHosts].filter(h => !EXTERNAL_OK[h]);
rec('P0-20', 'No host outside the local stack contacted', unexpected.length ? 'FAIL' : 'PASS',
  `${unexpected.length ? 'UNEXPECTED: ' + unexpected.join(', ') + '; ' : ''}local FE/BE only${[...foreignHosts].filter(h => EXTERNAL_OK[h]).map(h => ` + ${h} (${EXTERNAL_OK[h]})`).join('')}`);
await b.close();
out();
const fails = results.filter(r => r.status === 'FAIL');
console.log(`\nP0 summary: ${results.length} checks, ${fails.length} FAIL -> ${EV}/p0-env-check.json`);
process.exit(fails.length ? 1 : 0);
