// J2: new employee (NUAURA_TEST_001) My Space, profile, attendance check-in/out, leave apply via UI. State role nt1.
const L = require('./lib.cjs'); const fs = require('fs'); const { execSync } = require('child_process');
const sql = (q) => execSync(`${__dirname}/db.sh "${q}"`).toString().trim().split('\n').slice(1).join(' ; ');
const EMP = '0fbcc5e2-8278-4a00-b5f2-38e0d1c4093a';
const shot = (p, n) => p.screenshot({ path: `${L.EV}/screenshots/${n}.png` });
(async () => {
  const out = {}; const b = await L.chromium.launch(); const ctx = await L.newCtx(b, 'nt1'); const p = await ctx.newPage(); const B = L.bag(); L.collect(p, B);
  const calls = []; p.on('response', async r => { const u = r.url(); if (/attendance|leave/.test(u) && r.request().method() !== 'GET') { let j = null; try { j = await r.json(); } catch (e) {} calls.push({ m: r.request().method(), u: u.replace('http://backend:8080', ''), s: r.status(), j }); } });
  const text = async () => (await p.innerText('body')).replace(/\s+/g, ' ').slice(0, 350);
  // My Space pages
  for (const [n, path] of [['dashboard', '/me/dashboard'], ['profile', '/me/profile'], ['attendance', '/me/attendance'], ['leaves', '/me/leaves']]) {
    await p.goto(L.FE + path, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(4000);
    out['me_' + n] = { url: p.url().replace(L.FE, ''), text: await text() }; await shot(p, `NU-HRMS-E2E-030-me-${n}`);
  }
  // attendance check-in via UI
  await p.goto(L.FE + '/me/attendance', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(4000);
  out.attBefore = sql(`select count(*) from attendance_records where employee_id='${EMP}'`);
  try { await p.click('button:has-text("Check In")', { timeout: 8000 }); await p.waitForTimeout(3500); out.checkInUiText = await text(); } catch (e) { out.checkInErr = String(e).slice(0, 200); }
  await shot(p, 'NU-HRMS-E2E-031-after-checkin');
  out.attAfterIn = sql(`select attendance_date,check_in_time,check_out_time,status,check_in_source from attendance_records where employee_id='${EMP}'`);
  try { await p.click('button:has-text("Check Out")', { timeout: 8000 }); await p.waitForTimeout(3500); } catch (e) { out.checkOutErr = String(e).slice(0, 200); }
  await shot(p, 'NU-HRMS-E2E-032-after-checkout');
  out.attAfterOut = sql(`select attendance_date,check_in_time,check_out_time,status from attendance_records where employee_id='${EMP}'`);
  // leave apply: empty submit then real
  await p.goto(L.FE + '/leave/apply', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(4000); await shot(p, 'NU-HRMS-E2E-033-leave-apply-initial');
  out.leaveTypeOptions = await p.$$eval('#leave-type option', o => o.map(x => x.textContent));
  out.submitDisabledWhenEmpty = await p.$eval('form button[type=submit]', e => e.disabled); await shot(p, 'NU-HRMS-E2E-034-leave-empty-validation');
  out.balancesBefore = sql(`select count(*) from leave_balances where employee_id='${EMP}'`);
  const opt = (await p.$$eval('#leave-type option', o => o.map(x => [x.value, x.textContent]))).find(x => /Casual/.test(x[1]));
  await p.selectOption('#leave-type', opt[0]); await p.waitForTimeout(1500);
  await p.fill('#leave-start-date', '2026-12-07'); await p.keyboard.press('Tab'); await p.fill('#leave-end-date', '2026-12-08'); await p.keyboard.press('Tab');
  await p.fill('textarea', 'NUAURA_TEST casual leave two days'); await p.waitForTimeout(1200);
  out.balanceSummary = await p.innerText('form').then(t => t.replace(/\s+/g, ' ').slice(0, 300)); await shot(p, 'NU-HRMS-E2E-035-leave-filled');
  await p.click('form button[type=submit]'); await p.waitForTimeout(4000); await shot(p, 'NU-HRMS-E2E-036-leave-after-submit');
  out.afterSubmitUrl = p.url().replace(L.FE, ''); out.afterSubmitText = await text();
  out.leaveRow = sql(`select id,request_number,leave_type_id,start_date,end_date,total_days,status from leave_requests where employee_id='${EMP}' order by created_at desc limit 3`);
  out.balanceRows = sql(`select lt.leave_code,year,opening_balance,accrued,used,pending,available from leave_balances lb join leave_types lt on lt.id=lb.leave_type_id where employee_id='${EMP}' order by 1`);
  out.calls = calls; out.bag = B;
  fs.writeFileSync(`${L.EV}/logs/hrms/NU-HRMS-E2E-030-employee-journey.json`, JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out, null, 1).slice(0, 4500));
  await ctx.unrouteAll({ behavior: 'ignoreErrors' }); await b.close();
})();
