const L = require('./lib.cjs'); const fs = require('fs'); const { execSync } = require('child_process');
const sql = (q) => execSync(`${__dirname}/db.sh "${q}"`).toString().trim().split('\n').slice(1).join(' ; ');
const NT = '0fbcc5e2-8278-4a00-b5f2-38e0d1c4093a', CL = 'bbba1366-6d95-44db-909a-07e333e155d9';
(async () => {
  const b = await L.chromium.launch(); const nt = await L.newCtx(b, 'nt1'), mg = await L.newCtx(b, 'mgr'), hr = await L.newCtx(b, 'hradmin'); const R = {}; const rec = (k, v) => { R[k] = v; console.log(k, JSON.stringify(v).slice(0, 260)); };
  const bal = () => sql(`select available,pending,used from leave_balances where employee_id='${NT}' and leave_type_id='${CL}'`);
  const pend = sql(`select id from leave_requests where employee_id='${NT}' and status='PENDING' and start_date='2026-12-10'`);
  let r = await L.api(mg, 'POST', `/api/v1/leave-requests/${pend}/reject?reason=NUAURA_TEST%20no`); rec('mgr_reject_api_1', [r.status]);
  r = await L.api(mg, 'POST', `/api/v1/leave-requests/${pend}/reject?reason=NUAURA_TEST%20no`); rec('mgr_reject_api_2', [r.status]);
  // UI reject as manager
  const p = await mg.newPage(); const calls = []; p.on('response', r => { if (/leave-requests/.test(r.url()) && r.request().method() !== 'GET') calls.push([r.request().method(), r.url().replace('http://backend:8080', ''), r.status()]); });
  await p.goto(L.FE + '/leave/approvals', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(5000);
  try { await p.locator('tr', { hasText: 'NUAURA_TEST' }).first().locator('button:has-text("Reject")').click({ timeout: 8000 }); await p.waitForTimeout(800);
    await p.locator('[role=dialog] button:has-text("Reject")').last().click({ timeout: 6000 }); await p.waitForTimeout(800);
    await p.fill('[role=dialog] textarea', 'NUAURA_TEST ui reject'); await p.screenshot({ path: `${L.EV}/screenshots/NU-HRMS-E2E-081-reject-reason.png` });
    await p.locator('[role=dialog] button:has-text("Reject")').last().click({ timeout: 6000 }); await p.waitForTimeout(3000); } catch (e) { rec('ui_reject_err', String(e).slice(0, 150)); }
  await p.screenshot({ path: `${L.EV}/screenshots/NU-HRMS-E2E-082-after-ui-reject.png` }); rec('ui_reject_calls', calls);
  r = await L.api(hr, 'POST', `/api/v1/leave-requests/${pend}/reject?reason=NUAURA_TEST%20hradmin`); rec('hradmin_reject_api', [r.status, r.body && r.body.status]);
  rec('db_pend', sql(`select status from leave_requests where id='${pend}'`)); rec('bal', bal());
  // cleanup other pending (past-dated)
  const other = sql(`select id from leave_requests where employee_id='${NT}' and status='PENDING'`).split(' ; ').filter(Boolean);
  for (const id of other) { r = await L.api(nt, 'POST', `/api/v1/leave-requests/${id}/cancel`); rec('cancel_pending', [r.status, r.body && (r.body.status || r.body.message)]); }
  const appr = sql(`select id from leave_requests where employee_id='${NT}' and status='APPROVED'`);
  r = await L.api(nt, 'POST', `/api/v1/leave-requests/${appr}/cancel`); rec('cancel_approved_by_employee', [r.status, r.body && (r.body.status || r.body.message)]);
  rec('final', sql(`select start_date,status from leave_requests where employee_id='${NT}'`)); rec('bal_final', bal());
  fs.writeFileSync(`${L.EV}/logs/hrms/NU-HRMS-E2E-081-reject.json`, JSON.stringify(R, null, 1)); for (const c of [nt, mg, hr]) await c.unrouteAll({ behavior: 'ignoreErrors' }); await b.close();
})();
