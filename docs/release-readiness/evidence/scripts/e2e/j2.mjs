import {chromium, newContext, watch, mkLog, FE, SS, sql, rec, STATE} from './lib.mjs';
import fs from 'fs';
const RESUME = process.env.RESUME_TAG; const TAG = RESUME || 'NUAURA_TEST_E2E_leave_' + Date.now().toString().slice(-6);
const b = await chromium.launch();
const out = {tag: TAG, layers: {}};
const emp = await newContext(b, {role: 'employee'}); const ep = await emp.newPage(); const elog = mkLog(); watch(ep, elog);
const bal = () => sql("select lb.available, lb.pending, lb.used from leave_balances lb join leave_types lt on lt.id=lb.leave_type_id join employees e on e.id=lb.employee_id join users u on u.id=e.user_id where u.email='arun@nulogic.io' and lt.leave_code='CL' and lb.year=2026");
console.log('CL code check', sql("select leave_code from leave_types where leave_name='Casual Leave'"));
out.balBefore = RESUME ? 'n/a (resumed)' : bal();
if (!RESUME) {
await ep.goto(`${FE}/leave/apply`, {waitUntil: 'domcontentloaded', timeout: 120000});
await ep.waitForSelector('#leave-type', {timeout: 60000});
await ep.waitForTimeout(1500);
await ep.locator('#leave-type').selectOption({label: 'Casual Leave (Paid)'}).catch(async () => {
  const opts = await ep.locator('#leave-type option').allInnerTexts(); console.log('opts', opts); throw new Error('no CL option');
});
for (const [id, d] of [['#leave-start-date', '2026-12-14'], ['#leave-end-date', '2026-12-15']]) {
  await ep.locator(id).click(); await ep.locator(id).fill(d); await ep.keyboard.press('Enter'); await ep.keyboard.press('Escape');
}
await ep.getByLabel('Reason').fill(TAG);
await ep.screenshot({path: `${SS}/NU-UI-002-apply-form.png`});
const [resp] = await Promise.all([
  ep.waitForResponse(r => /\/leave-requests$/.test(r.url()) && r.request().method() === 'POST', {timeout: 30000}),
  ep.getByRole('button', {name: 'Submit Leave Request'}).click(),
]);
out.applyApi = `${resp.status()}`; const body = await resp.json().catch(() => ({}));
out.applyBody = {id: body.id, status: body.status, totalDays: body.totalDays, requestNumber: body.requestNumber};
await ep.waitForURL(u => !/apply/.test(u.toString()), {timeout: 15000}).catch(() => {});
const toastSeen = await ep.getByText(/submitted successfully/i).count();
await ep.screenshot({path: `${SS}/NU-UI-002-after-apply.png`});
out.uiAfterApply = {url: new URL(ep.url()).pathname, toast: toastSeen};
out.dbAfterApply = sql(`select status,total_days,start_date,end_date from leave_requests where reason='${TAG}'`);
out.balAfterApply = bal();
}
// manager approves via UI
const mg = await newContext(b, {role: 'manager'}); const mp = await mg.newPage(); const mlog = mkLog(); watch(mp, mlog);
await mp.goto(`${FE}/leave/approvals`, {waitUntil: 'domcontentloaded', timeout: 120000});
await mp.waitForLoadState('networkidle', {timeout: 30000}).catch(() => {});
const row = mp.locator('div,li,tr').filter({hasText: TAG}).last();
out.rowVisible = await mp.getByText(TAG).count();
await mp.screenshot({path: `${SS}/NU-UI-002-manager-approvals.png`, fullPage: true});
if (out.rowVisible) {
  // reason text may be shown; find nearest Approve button inside the card containing TAG
  await mp.locator('tr', {hasText: TAG}).locator('[data-testid^=leave-approve-]').click();
  const [aresp] = await Promise.all([
    mp.waitForResponse(r => /leave-requests\/.*\/approve/.test(r.url()), {timeout: 30000}),
    mp.locator('button:visible', {hasText: /^Approve$/}).last().click(),
  ]);
  out.approveApi = aresp.status(); out.approveBody = String(JSON.stringify(await aresp.json().catch(() => ({})))).slice(0, 200);
  await mp.waitForTimeout(1500);
  out.rowGoneAfter = await mp.getByText(TAG).count();
  await mp.screenshot({path: `${SS}/NU-UI-002-manager-approved.png`});
}
out.dbAfterApprove = sql(`select lr.status, u.email from leave_requests lr left join users u on u.id=lr.approved_by where lr.reason='${TAG}'`);
out.balAfterApprove = bal();
// employee sees status + balance
await ep.goto(`${FE}/leave/my-leaves`, {waitUntil: 'domcontentloaded'});
await ep.waitForLoadState('networkidle', {timeout: 30000}).catch(() => {});
const txt = await ep.locator('main, body').first().innerText();
out.uiEmp = {hasTag: txt.includes(TAG), approved: /approved/i.test(txt)};
await ep.screenshot({path: `${SS}/NU-UI-002-employee-status.png`, fullPage: true});
await ep.goto(`${FE}/leave`, {waitUntil: 'domcontentloaded'}); await ep.waitForLoadState('networkidle', {timeout: 30000}).catch(() => {});
await ep.screenshot({path: `${SS}/NU-UI-002-employee-balance.png`, fullPage: true});
out.uiBalanceText = (await ep.locator('body').innerText()).match(/Casual[^\n]*\n[^\n]*\n?[^\n]*/)?.[0];
out.logs = {emp: elog, mgr: mlog};
console.log(JSON.stringify(out, null, 1).slice(0, 6000));
fs.writeFileSync(STATE + '/j2.json', JSON.stringify(out));
await b.close();
