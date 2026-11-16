// Shared helpers for NU-UI e2e. Run with cwd=frontend (playwright resolved from there via createRequire).
import {createRequire} from 'module';
import fs from 'fs';
const require = createRequire('/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/frontend/package.json');
export const {chromium} = require('playwright');
export const EV = '/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/docs/release-readiness/evidence';
export const SS = `${EV}/screenshots`;
export const STATE = '/private/tmp/claude-504/-Users-fayaz-m-IdeaProjects-nulogic-nu-aura/31fd4514-1941-4084-b1c8-e1a40e6df684/scratchpad/e2e';
fs.mkdirSync(STATE, {recursive: true});
export const FE = 'http://localhost:3000', BE = 'http://localhost:8080';
export const PW = fs.readFileSync('/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/docs/qa/AUTONOMOUS-UI-E2E-RUNBOOK.md', 'utf8').match(/all `([^`]+)`/)[1];
export const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function newContext(browser, {role, viewport = {width: 1440, height: 900}} = {}) {
  const sf = role && `${STATE}/${role}.json`;
  const ctx = await browser.newContext({viewport, ...(sf && fs.existsSync(sf) ? {storageState: sf} : {})});
  // FE bundle posts to http://backend:8080 -> reroute to localhost:8080
  await ctx.route(/^http:\/\/backend:8080\//, route => route.continue({url: route.request().url().replace('http://backend:8080', BE)}).catch(() => {}));
  return ctx;
}

export function watch(page, log) {
  page.on('console', m => { if (m.type() === 'error') log.console.push(m.text().slice(0, 200)); });
  page.on('pageerror', e => log.console.push('pageerror: ' + String(e).slice(0, 200)));
  page.on('requestfailed', r => log.failed.push(`${r.method()} ${r.url().slice(0, 120)} ${r.failure()?.errorText}`));
  page.on('response', r => { if (r.status() >= 400 && !/\/_next\//.test(r.url())) log.http.push(`${r.status()} ${r.request().method()} ${r.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 110)}`); });
}
export const mkLog = () => ({console: [], failed: [], http: []});

export async function uiLogin(browser, role, email) {
  const ctx = await newContext(browser);
  const page = await ctx.newPage();
  const log = mkLog(); watch(page, log);
  await page.goto(`${FE}/auth/login`, {waitUntil: 'domcontentloaded', timeout: 120000});
  await page.locator('input[type=email]').fill(email);
  await page.locator('input[type=password]').fill(PW);
  const submit = page.getByRole('button', {name: /sign in/i}).first();
  await page.waitForFunction(() => { const b = [...document.querySelectorAll('button[type=submit]')][0]; return b && !b.disabled; }, null, {timeout: 60000});
  await submit.click();
  await page.waitForURL(u => !/\/auth\/login/.test(u.toString()), {timeout: 90000});
  await ctx.storageState({path: `${STATE}/${role}.json`});
  const url = page.url();
  await ctx.close();
  return {url, log};
}

import {execFileSync} from 'child_process';
const envf = Object.fromEntries(fs.readFileSync('/Users/fayaz.m/.config/nu-aura/local-db.env', 'utf8').split('\n').filter(l => /^[A-Z_]+=/.test(l)).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]));
// Read-only SQL as app role hrms_user. RLS needs tenant GUC, so run inside a tx with set_config.
export function sql(q, tenant = '660e8400-e29b-41d4-a716-446655440001') {
  try { return sql0(q, tenant); } catch (e) { throw new Error('SQL: ' + String(e.stderr || e.message).split('\n')[0]); }
}
function sql0(q, tenant) {
  const url = envf.SPRING_DATASOURCE_URL.replace('jdbc:', '');
  const u = new URL(url);
  const out = execFileSync('/opt/homebrew/opt/postgresql@16/bin/psql', ['-h', u.hostname, '-p', u.port || '5432', '-U', envf.SPRING_DATASOURCE_USERNAME, '-d', u.pathname.slice(1), '-At', '-F', '|', '-q', '-v', 'ON_ERROR_STOP=1'],
    {env: {...process.env, PGPASSWORD: envf.SPRING_DATASOURCE_PASSWORD}, input: `BEGIN READ ONLY;\nSELECT set_config('app.current_tenant_id','${tenant}',true) AS x \\g /dev/null\n${q};\n`, stdio: ['pipe', 'pipe', 'pipe']}).toString();
  return out.trim();
}
export const results = [];
export function rec(id, scenario, status, detail, extra = {}) {
  const r = {id, scenario, status, detail, ...extra};
  results.push(r); console.log(`[${status}] ${id} ${scenario} :: ${detail}`);
  return r;
}
