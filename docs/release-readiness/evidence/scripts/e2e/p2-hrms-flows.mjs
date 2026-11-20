// P2 - HRMS core flows (EMP -> MGR -> HR). Run from repo root after p0-env-check.mjs:
//   node docs/release-readiness/evidence/scripts/e2e/p2-hrms-flows.mjs [--only E3,M1]
// Each step records PASS/FAIL/BLOCKED/NOT TESTED; FAIL saves evidence/screenshots/ui-p2-<id>.png.
import fs from 'fs';
import {chromium, newContext, watch, mkLog, FE, BE, EV, SS, rec, results, STATE} from './lib.mjs';
import {globalTimeout, isNoise} from './ui-helpers.mjs';

const TAG = 'NUAURA_TEST_P2_' + Date.now().toString().slice(-6);
const only = (() => { const i = process.argv.indexOf('--only'); return i > 0 ? process.argv[i + 1].split(',') : null; })();
globalTimeout(40 * 60000, finish);
for (const r of ['employee', 'manager', 'hradmin']) if (!fs.existsSync(`${STATE}/${r}.json`)) { console.error(`no login state for ${r}; run p0-env-check.mjs`); process.exit(2); }
const b = await chromium.launch(); const browserVersion = b.version(); const startedAt = new Date().toISOString();
console.log(`P2 run ${TAG} chromium ${browserVersion}`);
const shared = {}; // ids/dates passed from EMP flows to MGR/HR flows

// Dates: a Tue/Wed pair 3-6 weeks ahead (avoid overlapping earlier test runs; seeds vary by TAG).
const d0 = new Date(); d0.setDate(d0.getDate() + 21 + 7 * (Math.floor(Date.now() / 60000) % 26));
while (d0.getDay() !== 2) d0.setDate(d0.getDate() + 1);
const iso = d => d.toISOString().slice(0, 10);
const LEAVE_START = iso(d0), LEAVE_END = iso(new Date(d0.getTime() + 86400000));
const WFH_DAY = iso(new Date(d0.getTime() + 7 * 86400000));

async function open(ctx, route) {
  const p = await ctx.newPage(); const log = mkLog(); watch(p, log); p.on('dialog', d => d.dismiss().catch(() => {}));
  await p.goto(FE + route, {waitUntil: 'domcontentloaded', timeout: 120000});
  await p.waitForLoadState('networkidle', {timeout: 30000}).catch(() => {});
  return {p, log};
}
const toastText = async p => (await p.locator('[role="status"], [role="alert"], [data-sonner-toast], .toast, [class*="toast" i]').allInnerTexts().catch(() => [])).join(' | ').replace(/\s+/g, ' ').slice(0, 200);
const created = []; // entity ids created by this run (for exact cleanup)
const waitApi = (p, re, method = 'POST') => p.waitForResponse(r => re.test(r.url()) && r.request().method() === method, {timeout: 30000}).then(async r => {
  const text = await r.text().catch(() => ''); let id = null; try { id = JSON.parse(text)?.id ?? JSON.parse(text)?.data?.id ?? null; } catch {}
  const url = r.url().replace(/^https?:\/\/[^/]+/, '');
  if (method === 'POST' && r.status() < 300 && id) created.push({entity: url.replace(/\?.*$/, ''), id});
  return {status: r.status(), body: text.slice(0, 300), url, id};
}).catch(() => null);

async function flow(id, name, ctx, fn) {
  if (only && !only.includes(id)) return rec(id, name, 'NOT TESTED', 'skipped by --only');
  const {p, log} = await open(ctx, '/');
  try {
    const detail = await fn(p, log);
    const errs = log.console.filter(s => !isNoise(s));
    rec(id, name, 'PASS', `${detail || 'ok'}${errs.length ? ` [console: ${errs.slice(0, 2).join(' | ').slice(0, 160)}]` : ''}`, {console: errs});
  } catch (e) {
    const msg = String(e?.message || e).split('\n')[0].slice(0, 220);
    const status = /^BLOCKED:/.test(msg) ? 'BLOCKED' : 'FAIL';
    const shot = `${SS}/ui-p2-${id}.png`;
    await p.screenshot({path: shot, fullPage: true}).catch(() => {});
    rec(id, name, status, `${msg.replace(/^BLOCKED:\s*/, '')} | toast: ${await toastText(p)} | http: ${log.http.slice(0, 4).join(', ')}`, {screenshot: shot, console: log.console.filter(s => !isNoise(s)).slice(0, 5)});
  }
  await p.close().catch(() => {});
}

// ───────────── EMP ─────────────
const emp = await newContext(b, {role: 'employee'});
await flow('E1', 'EMP dashboard widgets visible', emp, async p => {
  await p.goto(`${FE}/me/dashboard`, {waitUntil: 'domcontentloaded'}); await p.waitForLoadState('networkidle', {timeout: 30000}).catch(() => {});
  const want = ['Your month at a glance', 'Today', 'Your team and time off', 'Company feed'];
  const missing = []; for (const w of want) if (!(await p.getByRole('region', {name: w}).first().isVisible().catch(() => false))) missing.push(w);
  if (missing.length) throw new Error('missing widgets: ' + missing.join(', '));
  return `widgets: ${want.join(', ')}`;
});
await flow('E2', 'EMP clock in/out card present', emp, async p => {
  await p.goto(`${FE}/me/dashboard`, {waitUntil: 'domcontentloaded'}); await p.waitForLoadState('networkidle', {timeout: 30000}).catch(() => {});
  const btn = p.getByRole('button', {name: /clock (in|out)/i}).first();
  if (!(await btn.isVisible().catch(() => false))) throw new Error('no Clock In/Out button in Today card');
  return `button "${(await btn.innerText()).trim()}" visible`;
});
await flow('E3', 'EMP apply leave', emp, async p => {
  await p.goto(`${FE}/leave/apply`, {waitUntil: 'domcontentloaded'}); await p.waitForLoadState('networkidle', {timeout: 30000}).catch(() => {});
  // Earned Leave, 1 day: the demo employee's casual balance is nearly used up by earlier runs.
  await p.getByRole('combobox', {name: /leave type/i}).selectOption({label: 'Earned Leave (Paid)'});
  await p.getByRole('textbox', {name: /start date/i}).fill(LEAVE_START);
  await p.getByRole('textbox', {name: /end date/i}).fill(LEAVE_START);
  await p.getByRole('textbox', {name: /reason/i}).fill(`${TAG} leave`);
  const days = await p.getByText(/Total days requested/i).first().innerText().catch(() => '');
  const submit = p.getByRole('button', {name: /submit leave request/i});
  if (await submit.isDisabled()) throw new Error(`submit still disabled after filling form (${days})`);
  const api = waitApi(p, /\/leave/); await submit.click(); const r = await api;
  if (!r || r.status >= 400) throw new Error(`POST leave -> ${r ? r.status + ' ' + r.body : 'no response'}`);
  await p.waitForTimeout(1500);
  await p.goto(`${FE}/leave/my-leaves`, {waitUntil: 'domcontentloaded'}); await p.waitForLoadState('networkidle', {timeout: 30000}).catch(() => {});
  const seen = await p.getByText(TAG, {exact: false}).count();
  shared.leaveReason = `${TAG} leave`; shared.leaveId = r.id;
  if (!seen) throw new Error(`leave created (HTTP ${r.status}) but not shown on /leave/my-leaves`);
  return `${LEAVE_START}..${LEAVE_END} HTTP ${r.status}, ${days.replace(/\s+/g, ' ')}, visible in My Leaves`;
});
await flow('E4', 'EMP request WFH on /attendance/regularization', emp, async (p, log) => {
  await p.goto(`${FE}/attendance/regularization`, {waitUntil: 'domcontentloaded'}); await p.waitForLoadState('networkidle', {timeout: 30000}).catch(() => {});
  await p.getByRole('button', {name: /new request/i}).first().click();
  const dlg = p.getByRole('dialog').first(); await dlg.waitFor({timeout: 10000});
  await dlg.getByRole('textbox', {name: /^from/i}).fill(WFH_DAY);
  await dlg.getByRole('textbox', {name: /^to/i}).fill(WFH_DAY);
  await dlg.getByRole('textbox', {name: /reason/i}).fill(`${TAG} wfh`);
  await p.waitForTimeout(1000);
  if (await p.getByText('Something went wrong').count()) {
    // UI crashed; create the request through the API so M2 can still be exercised.
    const xsrf = JSON.parse(fs.readFileSync(`${STATE}/employee.json`, 'utf8')).cookies.find(c => c.name === 'XSRF-TOKEN')?.value;
    const ar = await emp.request.post(`${BE}/api/v1/attendance/work-requests`, {headers: {'X-XSRF-TOKEN': xsrf || ''}, data: {requestType: 'WORK_FROM_HOME', startDate: WFH_DAY, endDate: WFH_DAY, reason: `${TAG} wfh`}});
    if (ar.ok()) shared.wfhReason = `${TAG} wfh`;
    throw new Error(`page crashed (error boundary) after typing in Reason: ${log.console.find(s => /TypeError/.test(s))?.replace(/\s+/g, ' ').slice(0, 120)} | API fallback POST work-requests -> ${ar.status()}`);
  }
  const api = waitApi(p, /\/(attendance|work-request|regulari)/i); await dlg.getByRole('button', {name: /^submit$/i}).click(); const r = await api;
  if (!r || r.status >= 400) throw new Error(`POST wfh -> ${r ? r.status + ' ' + r.body : 'no response'}`);
  await p.waitForTimeout(1500);
  const seen = await p.getByText(`${TAG} wfh`).count() + await p.getByText(/work from home/i).count();
  shared.wfhReason = `${TAG} wfh`;
  if (!seen) throw new Error(`WFH created (HTTP ${r.status}) but list did not refresh`);
  return `${WFH_DAY} HTTP ${r.status} ${r.url}, listed`;
});
await flow('E5a', 'EMP timesheet: top "Add Entry" opens entry modal', emp, async p => {
  await p.goto(`${FE}/timesheets`, {waitUntil: 'domcontentloaded'}); await p.waitForLoadState('networkidle', {timeout: 30000}).catch(() => {});
  const btn = p.getByRole('button', {name: /add entry/i}).first();
  if (!(await btn.isVisible().catch(() => false))) throw new Error('BLOCKED: no Add Entry button (week not DRAFT or no TIMESHEET_SUBMIT)');
  await btn.click(); await p.waitForTimeout(1500);
  if (!(await p.getByRole('dialog').first().isVisible().catch(() => false))) throw new Error('clicking "Add Entry" on the week view does nothing (no modal)');
  return 'Add Time Entry modal opened';
});
await flow('E5b', 'EMP timesheet: add entry via View -> Add Entry', emp, async p => {
  await p.goto(`${FE}/timesheets`, {waitUntil: 'domcontentloaded'}); await p.waitForLoadState('networkidle', {timeout: 30000}).catch(() => {});
  const before = (await p.locator('text=/Total:/').first().locator('..').innerText().catch(() => '')).replace(/\s+/g, ' ');
  await p.getByRole('button', {name: /^view$/i}).first().click();
  const dlg = p.getByRole('dialog').first(); await dlg.waitFor({timeout: 10000});
  await dlg.getByRole('button', {name: /add entry/i}).first().click();
  const entry = p.getByRole('dialog').last(); await p.locator('#ts-project').waitFor({timeout: 10000});
  const opts = (await p.locator('#ts-project option').allInnerTexts()).filter(o => o.trim() && !/select a project/i.test(o));
  if (!opts.length) throw new Error('BLOCKED: Project dropdown in "Add Time Entry" is empty (no PSA projects for this tenant/employee) - entry cannot be added (see UI bug on timesheets/PSA projects)');
  await p.locator('#ts-project').selectOption({index: 1});
  await p.locator('#ts-entry-hours').fill('1.5');
  await p.locator('#ts-work-description').fill(`${TAG} entry`);
  const api = waitApi(p, /time-?entr|timesheet/i); await entry.getByRole('button', {name: /add entry|save/i}).last().click(); const r = await api;
  if (!r || r.status >= 400) throw new Error(`POST entry -> ${r ? r.status + ' ' + r.body : 'no response'}`);
  await p.waitForTimeout(2000);
  const after = (await p.locator('text=/Total:/').first().locator('..').innerText().catch(() => '')).replace(/\s+/g, ' ');
  const unknown = await p.getByText('Unknown Project').count();
  return `HTTP ${r.status}; totals before "${before}" after "${after}"${unknown ? `; ${unknown} rows show "Unknown Project"` : ''}`;
});
// First future week without a timesheet (earlier runs leave submitted weeks behind); stays on that week.
async function gotoFreshWeek(p) {
  await p.goto(`${FE}/timesheets`, {waitUntil: 'domcontentloaded'}); await p.waitForLoadState('networkidle', {timeout: 30000}).catch(() => {});
  for (let i = 0; i < 8; i++) {
    await p.getByRole('button', {name: /next week/i}).click();
    await p.getByRole('button', {name: /create timesheet|^view$/i}).first().waitFor({timeout: 10000}).catch(() => {});
    if (await p.getByRole('button', {name: /create timesheet/i}).first().isVisible().catch(() => false)) break;
  }
  return (await p.getByRole('heading', {name: /week of/i}).first().innerText().catch(() => '?')).trim();
}
await flow('E5c', 'EMP timesheet: copy last week into a fresh week', emp, async p => {
  const week = await gotoFreshWeek(p); shared.freshWeek = week;
  const create = p.getByRole('button', {name: /create timesheet/i}).first();
  if (await create.isVisible().catch(() => false)) {
    const capi = waitApi(p, /timesheet/i); await create.click();
    await p.getByRole('dialog').getByRole('button', {name: /^create/i}).last().click({timeout: 10000});
    const cr = await capi; if (!cr || cr.status >= 400) throw new Error(`create timesheet -> ${cr ? cr.status + ' ' + cr.body : 'no response'}`);
    await p.waitForTimeout(2000);
  }
  const btn = p.getByRole('button', {name: /copy last week/i}).first();
  if (!(await btn.isVisible().catch(() => false))) throw new Error(`no "Copy last week" button on ${week}`);
  if (await btn.isDisabled()) throw new Error(`BLOCKED: "Copy last week" disabled on ${week} (week already has entries from an earlier run?)`);
  const api = waitApi(p, /copy|time-?entr|timesheet/i); await btn.click();
  const confirm = p.getByRole('dialog').getByRole('button', {name: /copy|confirm|yes/i}).first();
  if (await confirm.isVisible().catch(() => false)) await confirm.click();
  const r = await api; if (!r || r.status >= 400) throw new Error(`copy -> ${r ? r.status + ' ' + r.body : 'no response'}`);
  await p.waitForTimeout(2000);
  const total = (await p.locator('text=/Total:/').first().locator('..').innerText().catch(() => '')).replace(/\s+/g, ' ');
  if (!/[1-9]\d*(\.\d+)?h/.test(total)) throw new Error(`copied (HTTP ${r.status}) but totals did not refresh: "${total}"`);
  shared.copiedWeek = week;
  return `${week}: HTTP ${r.status}, ${total}`;
});
await flow('E5d', 'EMP timesheet: submit the fresh week for approval', emp, async p => {
  await p.goto(`${FE}/timesheets`, {waitUntil: 'domcontentloaded'}); await p.waitForLoadState('networkidle', {timeout: 30000}).catch(() => {});
  for (let i = 0; i < 8; i++) { // walk to the week E5c created
    await p.getByRole('button', {name: /next week/i}).click(); await p.getByRole('heading', {name: /week of/i}).first().waitFor();
    if ((await p.getByRole('heading', {name: /week of/i}).first().innerText()).trim() === shared.freshWeek) break;
  }
  await p.getByRole('button', {name: /^view$/i}).first().waitFor({timeout: 10000}).catch(() => {});
  const status = (await p.getByRole('status').first().innerText().catch(() => '?')).trim();
  if (!/draft/i.test(status)) throw new Error(`BLOCKED: next week status is "${status}", not Draft`);
  await p.getByRole('button', {name: /^view$/i}).first().click();
  const dlg = p.getByRole('dialog').first(); await dlg.waitFor({timeout: 10000});
  const sub = dlg.getByRole('button', {name: /submit for approval/i});
  if (!(await sub.isVisible().catch(() => false))) throw new Error('no "Submit for Approval" button in detail modal');
  const api = waitApi(p, /submit/i); await sub.click(); const r = await api;
  if (!r || r.status >= 400) throw new Error(`submit -> ${r ? r.status + ' ' + r.body : 'no response'}`);
  await p.waitForTimeout(2000);
  const after = (await p.getByRole('status').first().innerText().catch(() => '?')).trim();
  if (/draft/i.test(after)) {
    await p.goto(`${FE}/timesheets`, {waitUntil: 'domcontentloaded', timeout: 90000}); await p.waitForLoadState('networkidle', {timeout: 30000}).catch(() => {});
    for (let i = 0; i < 8; i++) { await p.getByRole('button', {name: /next week/i}).click(); await p.getByRole('heading', {name: /week of/i}).first().waitFor(); if ((await p.getByRole('heading', {name: /week of/i}).first().innerText()).trim() === shared.freshWeek) break; }
    const reloaded = (await p.getByRole('status').first().innerText().catch(() => '?')).trim();
    throw new Error(`submitted (HTTP ${r.status}, toast shown) but week badge still "${after}"; after reload: "${reloaded}"`);
  }
  return `HTTP ${r.status}, status ${status} -> ${after}`;
});
await flow('E6', 'EMP wall post + comment (newest comment on top)', emp, async p => {
  await p.goto(`${FE}/fluence/wall`, {waitUntil: 'domcontentloaded'}); await p.waitForLoadState('networkidle', {timeout: 30000}).catch(() => {});
  await p.getByRole('textbox', {name: /write something/i}).fill(`${TAG} wall post`);
  const api = waitApi(p, /wall|post/i); await p.getByRole('button', {name: 'Post', exact: true}).last().click(); const r = await api;
  if (!r || r.status >= 400) throw new Error(`POST wall -> ${r ? r.status + ' ' + r.body : 'no response'}`);
  await p.waitForTimeout(1500);
  const card = p.locator('article, [class*="card" i]', {hasText: `${TAG} wall post`}).first();
  if (!(await card.isVisible().catch(() => false))) throw new Error(`post created (HTTP ${r.status}) but not shown in feed`);
  await card.getByRole('button', {name: /toggle comments/i}).click(); await p.waitForTimeout(800);
  for (const n of [1, 2]) {
    await card.getByRole('textbox', {name: /add a comment/i}).fill(`${TAG} comment ${n}`);
    const ca = waitApi(p, /comment/i); await card.getByRole('button', {name: /post comment/i}).click(); const cr = await ca;
    if (!cr || cr.status >= 400) throw new Error(`POST comment ${n} -> ${cr ? cr.status + ' ' + cr.body : 'no response'}`);
    await p.waitForTimeout(3000);
  }
  const texts = (await card.locator(`text=/${TAG} comment \\d/`).allInnerTexts()).map(t => t.trim());
  if (texts.length < 2) {
    await p.reload({waitUntil: 'domcontentloaded'}); await p.waitForLoadState('networkidle', {timeout: 30000}).catch(() => {});
    const c2 = p.locator('article, [class*="card" i]', {hasText: `${TAG} wall post`}).first();
    await c2.getByRole('button', {name: /toggle comments/i}).click(); await p.waitForTimeout(2500);
    const after = await c2.locator(`text=/${TAG} comment \\d/`).count();
    throw new Error(`2 comments posted (HTTP 2xx) but ${texts.length} shown in thread until reload (after reload: ${after}) - thread does not refresh`);
  }
  if (!/comment 2/.test(texts[0])) throw new Error(`newest comment not on top: order = ${texts.join(' , ')}`);
  return `post HTTP ${r.status}; comments order: ${texts.join(' , ')}`;
});
await flow('E7', 'EMP payslips page', emp, async p => {
  await p.goto(`${FE}/me/payslips`, {waitUntil: 'domcontentloaded'}); await p.waitForLoadState('networkidle', {timeout: 30000}).catch(() => {});
  const h = await p.getByRole('heading', {level: 1}).first().innerText().catch(() => '');
  const txt = await p.locator('main').innerText();
  if (!/payslip/i.test(h)) throw new Error(`heading "${h}"`);
  if (/something went wrong|failed to load/i.test(txt)) throw new Error('error state shown');
  return `heading "${h}"; ${/no payslips/i.test(txt) ? 'empty state' : 'list rendered'}`;
});
await flow('E8', 'EMP profile edit (city)', emp, async p => {
  await p.goto(`${FE}/me/profile`, {waitUntil: 'domcontentloaded'}); await p.waitForLoadState('networkidle', {timeout: 30000}).catch(() => {});
  await p.getByRole('button', {name: /edit profile/i}).click();
  await p.getByRole('textbox', {name: /^city$/i}).fill(`${TAG} City`);
  const api = waitApi(p, /employee|profile/i, 'PUT').then(x => x || waitApi(p, /employee|profile/i, 'PATCH'));
  await p.getByRole('button', {name: /save changes/i}).click(); const r = await api;
  if (!r || r.status >= 400) throw new Error(`save -> ${r ? r.status + ' ' + r.body : 'no response'}`);
  await p.waitForTimeout(1500);
  const live = await p.getByText(`${TAG} City`).count();
  await p.goto(`${FE}/me/profile`, {waitUntil: 'domcontentloaded', timeout: 90000}); await p.waitForLoadState('networkidle', {timeout: 30000}).catch(() => {});
  if (!(await p.getByText(`${TAG} City`).count())) throw new Error(`saved (HTTP ${r.status}, shown live=${!!live}) but city not shown after reload`);
  return `HTTP ${r.status}; city persisted`;
});
await emp.close();

// ───────────── MGR ─────────────
const mgr = await newContext(b, {role: 'manager'});
await flow('M1', 'MGR approve leave request', mgr, async p => {
  if (!shared.leaveReason) throw new Error('BLOCKED: E3 did not create a leave');
  await p.goto(`${FE}/leave/approvals`, {waitUntil: 'domcontentloaded'}); await p.waitForLoadState('networkidle', {timeout: 30000}).catch(() => {});
  if (!(await p.getByText(shared.leaveReason).first().isVisible().catch(() => false))) throw new Error('EMP leave not listed under Leave Approvals');
  // button carries aria-label "Approve leave request <id>" (app/leave/approvals/page.tsx) - target this run's request only
  await p.getByRole('button', {name: new RegExp(`approve leave request ${shared.leaveId}`, 'i')}).click({timeout: 10000});
  const confirm = p.getByRole('dialog').getByRole('button', {name: /approve|confirm|yes/i}).first();
  const api = waitApi(p, /approve/i, 'POST').then(x => x || waitApi(p, /approve/i, 'PUT'));
  if (await confirm.isVisible({timeout: 3000}).catch(() => false)) await confirm.click();
  const r = await api; if (!r || r.status >= 400) throw new Error(`approve -> ${r ? r.status + ' ' + r.body : 'no response'}`);
  await p.waitForTimeout(1500);
  if (await p.locator('tr, li, article, [class*="card" i]', {hasText: shared.leaveReason}).count()) throw new Error(`approved (HTTP ${r.status}) but still listed as pending`);
  return `HTTP ${r.status}; removed from pending list`;
});
await flow('M2', 'MGR approve WFH request', mgr, async p => {
  if (!shared.wfhReason) throw new Error('BLOCKED: E4 did not create a WFH request');
  await p.goto(`${FE}/attendance/regularization`, {waitUntil: 'domcontentloaded'}); await p.waitForLoadState('networkidle', {timeout: 30000}).catch(() => {});
  await p.getByRole('tab', {name: /pending approval/i}).first().click(); await p.waitForTimeout(1500);
  const row = p.locator('tr, li, article, [class*="card" i]', {hasText: shared.wfhReason}).first();
  if (!(await row.isVisible().catch(() => false))) throw new Error('EMP WFH request not listed under Pending Approval');
  await row.getByRole('button', {name: /row actions/i}).first().click();
  const api = waitApi(p, /approve/i, 'POST');
  await p.getByRole('menuitem', {name: /^approve/i}).first().click({timeout: 5000});
  const confirm = p.getByRole('dialog').getByRole('button', {name: /approve|confirm|yes/i}).first();
  if (await confirm.isVisible({timeout: 3000}).catch(() => false)) await confirm.click();
  const r = await api; if (!r || r.status >= 400) throw new Error(`approve -> ${r ? r.status + ' ' + r.body : 'no response'}`);
  await p.waitForTimeout(1500);
  if (await p.locator('tr, li, article, [class*="card" i]', {hasText: shared.wfhReason}).count()) throw new Error(`approved (HTTP ${r.status}) but still listed as pending`);
  return `HTTP ${r.status}; removed from pending`;
});
await flow('M3', 'MGR team attendance page', mgr, async p => {
  await p.goto(`${FE}/attendance/team`, {waitUntil: 'domcontentloaded'}); await p.waitForLoadState('networkidle', {timeout: 30000}).catch(() => {});
  const h = await p.getByRole('heading', {level: 1}).first().innerText().catch(() => '');
  if (/\/auth\/login|denied=1/.test(p.url())) throw new Error('denied for manager');
  if (!h) throw new Error('no h1');
  return `heading "${h}"; rows=${await p.locator('table tbody tr').count()}`;
});
await mgr.close();

// ───────────── HR ─────────────
const hr = await newContext(b, {role: 'hradmin'});
await flow('H1', 'HR employees list', hr, async p => {
  await p.goto(`${FE}/employees`, {waitUntil: 'domcontentloaded'}); await p.waitForLoadState('networkidle', {timeout: 30000}).catch(() => {});
  const rows = await p.locator('table tbody tr').count();
  if (!rows) throw new Error('no employee rows');
  return `${rows} rows; "${(await p.locator('main p').first().innerText().catch(() => '')).trim()}"`;
});
await flow('H2', 'HR create employee', hr, async p => {
  await p.goto(`${FE}/employees`, {waitUntil: 'domcontentloaded'}); await p.waitForLoadState('networkidle', {timeout: 30000}).catch(() => {});
  await p.getByRole('button', {name: /add employee/i}).first().click();
  const dlg = p.getByRole('dialog').first(); await dlg.waitFor({timeout: 10000});
  const sfx = TAG.slice(-6);
  await p.locator('#emp-work-email').fill(`nuaura_test_${sfx}@example.invalid`);
  await p.locator('#emp-first-name').fill('NUAURA_TEST_Emp'); await p.locator('#emp-last-name').fill(sfx);
  await p.locator('#emp-password').fill(`Nuaura_Test_${sfx}!Aa1`);
  await dlg.getByRole('tab', {name: /employment/i}).click();
  await p.locator('#emp-designation').fill('NUAURA_TEST_Designation');
  await p.locator('#emp-department').selectOption({index: 1});
  await p.locator('#emp-joining-date').fill('2026-11-16');
  const api = waitApi(p, /\/employees/); await dlg.getByRole('button', {name: /^add employee$/i}).click(); const r = await api;
  if (!r || r.status >= 400) throw new Error(`POST employee -> ${r ? r.status + ' ' + r.body : 'no response'} | ${(await dlg.locator('[role="alert"], .text-red-500, [class*="error" i]').allInnerTexts().catch(() => [])).join(' ').slice(0, 150)}`);
  await p.waitForTimeout(1500);
  await p.getByRole('textbox', {name: /search employees/i}).fill(sfx); await p.waitForTimeout(2000);
  const seen = await p.getByText(`NUAURA_TEST_Emp ${sfx}`, {exact: false}).count();
  shared.empName = `NUAURA_TEST_Emp ${sfx}`; shared.empSfx = sfx;
  if (!seen) throw new Error(`created (HTTP ${r.status}) but not found in list after search`);
  return `HTTP ${r.status}; ${shared.empName} listed`;
});
await flow('H3', 'HR edit employee', hr, async p => {
  if (!shared.empName) throw new Error('BLOCKED: H2 did not create an employee');
  await p.goto(`${FE}/employees`, {waitUntil: 'domcontentloaded'}); await p.waitForLoadState('networkidle', {timeout: 30000}).catch(() => {});
  await p.getByRole('textbox', {name: /search employees/i}).fill(shared.empSfx); await p.waitForTimeout(2000);
  await p.getByRole('button', {name: new RegExp(`view ${shared.empName} profile`, 'i')}).first().click();
  await p.getByRole('button', {name: /^edit$/i}).first().click({timeout: 10000});
  await p.waitForURL(/\/employees\/[^/]+\/edit/, {timeout: 30000}); await p.waitForLoadState('networkidle', {timeout: 30000}).catch(() => {});
  await p.locator('#employee-edit-middle-name').fill('Edited');
  const api = waitApi(p, /\/employees\//, 'PUT').then(x => x || waitApi(p, /\/employees\//, 'PATCH'));
  await p.getByRole('button', {name: /save|update/i}).last().click(); const r = await api;
  if (!r || r.status >= 400) throw new Error(`save -> ${r ? r.status + ' ' + r.body : 'no response'}`);
  await p.waitForTimeout(1500);
  await p.goto(`${FE}/employees`, {waitUntil: 'domcontentloaded'}); await p.waitForLoadState('networkidle', {timeout: 30000}).catch(() => {});
  await p.getByRole('textbox', {name: /search employees/i}).fill(shared.empSfx); await p.waitForTimeout(2000);
  if (!(await p.getByText(/NUAURA_TEST_Emp Edited/).count())) throw new Error(`saved (HTTP ${r.status}) but middle name not shown in list`);
  return `HTTP ${r.status}; middle name shown in list`;
});
await flow('H4', 'HR create announcement', hr, async p => {
  await p.goto(`${FE}/announcements`, {waitUntil: 'domcontentloaded'}); await p.waitForLoadState('networkidle', {timeout: 30000}).catch(() => {});
  await p.getByRole('button', {name: /new announcement/i}).first().click();
  const dlg = p.getByRole('dialog').first(); await dlg.waitFor({timeout: 10000});
  await dlg.getByRole('textbox', {name: /title/i}).fill(`${TAG} announcement`);
  await dlg.getByRole('textbox', {name: /content/i}).fill(`${TAG} announcement body`);
  const api = waitApi(p, /announcement/i); await dlg.getByRole('button', {name: /publish/i}).click(); const r = await api;
  if (!r || r.status >= 400) throw new Error(`POST announcement -> ${r ? r.status + ' ' + r.body : 'no response'}`);
  await p.waitForTimeout(1500);
  if (!(await p.getByText(`${TAG} announcement`).count())) throw new Error(`created (HTTP ${r.status}) but not in list`);
  return `HTTP ${r.status}; listed`;
});
await flow('H5', 'HR create holiday', hr, async p => {
  await p.goto(`${FE}/holidays`, {waitUntil: 'domcontentloaded'}); await p.waitForLoadState('networkidle', {timeout: 30000}).catch(() => {});
  await p.getByRole('button', {name: /add holiday/i}).first().click();
  const dlg = p.getByRole('dialog').first(); await dlg.waitFor({timeout: 10000});
  await dlg.getByRole('textbox', {name: /holiday name/i}).fill(`${TAG} holiday`);
  let r = null, day = '';
  for (let i = 0; i < 6 && !(r && r.status < 400); i++) { // one date per run; a date taken by an earlier run is test residue, not a defect
    day = `2026-12-${String(4 + ((Math.floor(Date.now() / 60000) + i) % 24)).padStart(2, '0')}`;
    await dlg.getByRole('textbox', {name: /^date/i}).fill(day);
    const api = waitApi(p, /holiday/i); await dlg.getByRole('button', {name: /create holiday/i}).click(); r = await api;
    if (r && r.status === 400 && /already exists/i.test(r.body)) continue;
    break;
  }
  if (!r || r.status >= 400) throw new Error(`POST holiday -> ${r ? r.status + ' ' + r.body : 'no response'}`);
  await p.waitForTimeout(1500);
  if (!(await p.getByText(`${TAG} holiday`).count())) throw new Error(`created (HTTP ${r.status}) but not in list`);
  return `${day} HTTP ${r.status}; listed`;
});
await hr.close();
await finish();

async function finish() {
  await b.close().catch(() => {});
  const commit = (await import('child_process')).execFileSync('git', ['rev-parse', '--short', 'HEAD'], {cwd: '/Users/fayaz.m/IdeaProjects/nulogic/nu-aura'}).toString().trim();
  fs.writeFileSync(`${EV}/p2-hrms-flows.json`, JSON.stringify({runId: TAG, commit, browser: `chromium ${browserVersion}`, env: {FE, BE}, startedAt, finishedAt: new Date().toISOString(), created, results}, null, 1));
  const c = s => results.filter(r => r.status === s).length;
  console.log(`\nP2 summary (${TAG}): PASS ${c('PASS')} FAIL ${c('FAIL')} BLOCKED ${c('BLOCKED')} NOT TESTED ${c('NOT TESTED')} -> ${EV}/p2-hrms-flows.json`);
  process.exit(c('FAIL') ? 1 : 0);
}
