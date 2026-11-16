const L = require('./lib.cjs'); const fs = require('fs'); const { execSync } = require('child_process');
const sql = (q) => execSync(`${__dirname}/db.sh "${q}"`).toString().trim().split('\n').slice(1).join(' ; ');
const NT = '0fbcc5e2-8278-4a00-b5f2-38e0d1c4093a', SUMIT = '48000000-e001-0000-0000-000000000001';
(async () => {
  const b = await L.chromium.launch(); const nt = await L.newCtx(b, 'nt1'), mg = await L.newCtx(b, 'mgr'), hr = await L.newCtx(b, 'hradmin'); const R = {}; const rec = (k, v) => { R[k] = v; console.log(k, JSON.stringify(v).slice(0, 280)); };
  // regularization
  const D = '2026-11-12';
  let r = await L.api(nt, 'POST', '/api/v1/attendance/regularization', { date: D, checkInTime: `${D}T10:00:00`, checkOutTime: `${D}T09:00:00`, reason: 'NUAURA_TEST out before in' }); rec('reg_checkout_before_checkin', [r.status, r.body && r.body.message]);
  r = await L.api(nt, 'POST', '/api/v1/attendance/regularization', { date: '2030-01-01', checkInTime: '2030-01-01T09:00:00', checkOutTime: '2030-01-01T18:00:00', reason: 'NUAURA_TEST future' }); rec('reg_future_date', [r.status, r.body && r.body.message]);
  r = await L.api(nt, 'POST', '/api/v1/attendance/regularization', { date: D, checkInTime: `${D}T09:00:00`, checkOutTime: `${D}T18:00:00`, reason: '' }); rec('reg_blank_reason', [r.status]);
  r = await L.api(nt, 'POST', '/api/v1/attendance/regularization', { date: D, checkInTime: `${D}T09:00:00`, checkOutTime: `${D}T18:00:00`, reason: 'NUAURA_TEST missed punch' }); rec('reg_submit', [r.status, r.body && r.body.id, r.body && r.body.status]); const reg = r.body && r.body.id;
  rec('reg_db', sql(`select id,status,regularization_requested,regularization_approved from attendance_records where id='${reg}'`));
  r = await L.api(nt, 'POST', `/api/v1/attendance/${reg}/approve-regularization`); rec('reg_self_approve', [r.status]);
  r = await L.api(mg, 'POST', `/api/v1/attendance/${reg}/approve-regularization`); rec('reg_mgr_approve', [r.status, r.body && r.body.status]);
  rec('reg_db_after', sql(`select status,check_in_time,check_out_time,regularization_approved from attendance_records where id='${reg}'`));
  // employee edit
  const nm = await L.api(nt, 'PUT', '/api/v1/employees/me', { firstName: 'NUAURA_TEST_Hrms', lastName: 'Alpha', phoneNumber: '+91 9000000001', designation: 'NUAURA_TEST CEO' }); rec('self_edit_me_with_designation', [nm.status, nm.body && nm.body.designation]);
  rec('self_edit_db', sql(`select designation,phone_number from employees where id='${NT}'`));
  r = await L.api(hr, 'PUT', `/api/v1/employees/${NT}/admin`, { designation: 'NUAURA_TEST Senior QA Engineer', managerId: SUMIT, level: 'SENIOR' }); rec('admin_edit', [r.status, r.body && r.body.designation, r.body && (r.body.message || r.body.errors)]);
  rec('admin_edit_db', sql(`select designation,level,manager_id from employees where id='${NT}'`));
  r = await L.api(hr, 'PUT', `/api/v1/employees/${NT}/admin`, { managerId: NT }); rec('admin_set_self_as_manager', [r.status]); rec('db_mgr', sql(`select manager_id from employees where id='${NT}'`));
  r = await L.api(hr, 'PUT', `/api/v1/employees/${NT}/admin`, { managerId: SUMIT }); 
  r = await L.api(hr, 'PUT', `/api/v1/employees/${SUMIT}/admin`, { managerId: NT }); rec('admin_cycle_mgr(sumit->nt1 who reports to sumit)', [r.status]); rec('db_sumit_mgr', sql(`select manager_id from employees where id='${SUMIT}'`));
  if (r.status === 200) await L.api(hr, 'PUT', `/api/v1/employees/${SUMIT}/admin`, { managerId: '550e8400-e29b-41d4-a716-446655440040' });
  rec('db_sumit_mgr_restored', sql(`select manager_id from employees where id='${SUMIT}'`));
  r = await L.api(hr, 'GET', `/api/v1/employees/${NT}/hierarchy`); rec('hierarchy', [r.status]); r = await L.api(mg, 'GET', `/api/v1/employees/${SUMIT}/subordinates`); rec('sumit_subordinates_has_nt', [r.status, JSON.stringify(r.body).includes(NT)]);
  // UI pages
  const p = await hr.newPage(); const B = L.bag(); L.collect(p, B);
  for (const [n, path] of [['employee-detail', `/employees/${NT}`], ['org-hierarchy', '/admin/org-hierarchy'], ['departments', '/departments'], ['holidays', '/holidays'], ['assets', '/assets'], ['contracts', '/contracts'], ['expenses', '/expenses'], ['benefits', '/benefits']]) {
    await p.goto(L.FE + path, { waitUntil: 'domcontentloaded' }).catch(() => {}); await p.waitForTimeout(4500); const t = (await p.innerText('body').catch(() => '')).replace(/\s+/g, ' ');
    rec('ui_' + n, [p.url().replace(L.FE, ''), t.length, /something went wrong|application error/i.test(t)]); await p.screenshot({ path: `${L.EV}/screenshots/NU-HRMS-E2E-090-ui-${n}.png` });
  }
  rec('ui_bag', { console: [...new Set(B.console)].slice(0, 8), pageerrors: B.pageerrors.slice(0, 3), http: [...new Set(B.http)].slice(0, 12) });
  fs.writeFileSync(`${L.EV}/logs/hrms/NU-HRMS-E2E-090-misc.json`, JSON.stringify(R, null, 1)); for (const c of [nt, mg, hr]) await c.unrouteAll({ behavior: 'ignoreErrors' }); await b.close();
})();
