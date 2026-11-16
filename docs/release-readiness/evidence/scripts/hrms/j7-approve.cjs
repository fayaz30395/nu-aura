const L = require('./lib.cjs'); const fs = require('fs'); const { execSync } = require('child_process');
const sql = (q) => execSync(`${__dirname}/db.sh "${q}"`).toString().trim().split('\n').slice(1).join(' ; ');
const NT = '0fbcc5e2-8278-4a00-b5f2-38e0d1c4093a', LR = '814680f6-2cfc-4c6e-9639-db9f26f2a6ea';
(async () => {
  const out = {}; const b = await L.chromium.launch();
  // employee checkout via UI
  let ctx = await L.newCtx(b, 'nt1'); let p = await ctx.newPage(); const calls = [];
  p.on('response', async r => { if (/attendance|leave/.test(r.url()) && r.request().method() !== 'GET') { let j = null; try { j = await r.json(); } catch (e) {} calls.push([r.request().method(), r.url().replace('http://backend:8080', ''), r.status(), j && (j.message || j.status)]); } });
  await p.goto(L.FE + '/me/attendance', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(5000);
  out.attButtons = await p.$$eval('button', e => e.map(x => x.textContent.trim()).filter(t => /check|out|in/i.test(t)).slice(0, 8));
  try { await p.click('button:text-matches("check.?out", "i")', { timeout: 6000 }); await p.waitForTimeout(3000); } catch (e) { out.checkoutErr = 'no checkout button'; }
  await p.screenshot({ path: `${L.EV}/screenshots/NU-HRMS-E2E-032-after-checkout.png` });
  out.att = sql(`select attendance_date,check_in_time,check_out_time,status from attendance_records where employee_id='${NT}'`);
  await ctx.unrouteAll({ behavior: 'ignoreErrors' }); await ctx.close();
  // manager approves via UI
  ctx = await L.newCtx(b, 'mgr'); p = await ctx.newPage();
  p.on('response', async r => { if (/leave/.test(r.url()) && r.request().method() !== 'GET') { let j = null; try { j = await r.json(); } catch (e) {} calls.push(['MGR ' + r.request().method(), r.url().replace('http://backend:8080', ''), r.status(), j && (j.message || j.status)]); } });
  await p.goto(L.FE + '/leave/approvals', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(5000);
  await p.screenshot({ path: `${L.EV}/screenshots/NU-HRMS-E2E-037-manager-approvals.png` });
  out.mgrSeesRow = (await p.innerText('body')).includes('NUAURA_TEST casual leave');
  const row = p.locator('tr', { hasText: 'NUAURA_TEST' }).first();
  try { await row.locator('button:has-text("Approve")').click({ timeout: 8000 }); await p.waitForTimeout(1000);
    await p.screenshot({ path: `${L.EV}/screenshots/NU-HRMS-E2E-038-approve-confirm.png` });
    await p.locator('[role=dialog] button:has-text("Approve")').last().click({ timeout: 8000 }); await p.waitForTimeout(3500); } catch (e) { out.approveErr = String(e).slice(0, 200); }
  await p.screenshot({ path: `${L.EV}/screenshots/NU-HRMS-E2E-039-after-approve.png` });
  out.leaveDb = sql(`select status,approved_by,approved_on is not null,total_days from leave_requests where id='${LR}'`);
  out.balDb = sql(`select lt.leave_code,opening_balance,accrued,used,pending,available from leave_balances lb join leave_types lt on lt.id=lb.leave_type_id where employee_id='${NT}'`);
  out.mgrEmpId = sql(`select id from employees where employee_code='EMP-0002'`);
  await ctx.unrouteAll({ behavior: 'ignoreErrors' }); await ctx.close();
  // employee sees status + balance (UI + API)
  ctx = await L.newCtx(b, 'nt1'); p = await ctx.newPage();
  await p.goto(L.FE + '/me/leaves', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(5000);
  await p.screenshot({ path: `${L.EV}/screenshots/NU-HRMS-E2E-0391-employee-sees-approved.png` });
  const t = (await p.innerText('body')).replace(/\s+/g, ' '); out.empUiHasApproved = /approved/i.test(t); out.empUiSnippet = t.slice(t.indexOf('My Leaves', 400), t.indexOf('My Leaves', 400) + 400);
  const a = await L.api(ctx, 'GET', `/api/v1/leave-balances/employee/${NT}`); out.empApiBal = a.status + ' ' + JSON.stringify(a.body).slice(0, 500);
  const q = await L.api(ctx, 'GET', `/api/v1/leave-requests/employee/${NT}`); out.empApiReq = q.status + ' ' + JSON.stringify(q.body).slice(0, 300);
  await ctx.unrouteAll({ behavior: 'ignoreErrors' }); await ctx.close();
  out.calls = calls; fs.writeFileSync(`${L.EV}/logs/hrms/NU-HRMS-E2E-037-approve-journey.json`, JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1).slice(0, 4000)); await b.close();
})();
