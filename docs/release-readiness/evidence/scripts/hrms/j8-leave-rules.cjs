const L = require('./lib.cjs'); const fs = require('fs'); const { execSync } = require('child_process');
const sql = (q) => execSync(`${__dirname}/db.sh "${q}"`).toString().trim().split('\n').slice(1).join(' ; ');
const NT = '0fbcc5e2-8278-4a00-b5f2-38e0d1c4093a', CL = 'bbba1366-6d95-44db-909a-07e333e155d9', EL = 'cc67f2c5-337e-49bd-80ea-bdbb59ca6781', SL = '63c99c1e-c086-481b-93cf-dab3117e3093';
(async () => {
  const b = await L.chromium.launch(); const nt = await L.newCtx(b, 'nt1'), mg = await L.newCtx(b, 'mgr'), hr = await L.newCtx(b, 'hradmin'), e2 = await L.newCtx(b, 'emp2'), hm = await L.newCtx(b, 'hrmgr'); const R = {};
  const rec = (k, v) => { R[k] = v; console.log(k, JSON.stringify(v).slice(0, 260)); };
  const bal = () => sql(`select available,pending,used from leave_balances where employee_id='${NT}' and leave_type_id='${CL}'`);
  const apply = (o) => L.api(nt, 'POST', '/api/v1/leave-requests', { employeeId: NT, reason: 'NUAURA_TEST leave validation case', ...o });
  // checkout via API (UI could not: tz mismatch, see defects)
  let r = await L.api(nt, 'POST', '/api/v1/attendance/check-out', { employeeId: NT, source: 'WEB' }); rec('att_checkout_api', [r.status, r.body && r.body.checkOutTime]); rec('att_db', sql(`select check_in_time,check_out_time,status,work_duration_minutes from attendance_records where employee_id='${NT}'`));
  r = await L.api(nt, 'POST', '/api/v1/attendance/check-out', { employeeId: NT, source: 'WEB' }); rec('att_double_checkout', [r.status]);
  // validations
  r = await apply({ leaveTypeId: CL, startDate: '2026-12-08', endDate: '2026-12-08' }); rec('overlap_with_approved', [r.status, r.body && r.body.message]);
  r = await apply({ leaveTypeId: CL, startDate: '2026-12-10', endDate: '2026-12-09' }); rec('end_before_start', [r.status]);
  r = await apply({ leaveTypeId: CL, startDate: '2025-01-06', endDate: '2025-01-06' }); rec('past_date', [r.status, r.body && r.body.message]);
  r = await apply({ leaveTypeId: CL, startDate: '2026-12-10', endDate: '2026-12-10', reason: 'short' }); rec('short_reason', [r.status]);
  r = await apply({ leaveTypeId: CL, startDate: '2026-12-10', endDate: '2026-12-10', isHalfDay: true }); rec('halfday_no_period', [r.status]);
  r = await apply({ leaveTypeId: CL, startDate: '2026-12-10', endDate: '2026-12-15' }); rec('exceeds_max_per_request(CL max3)', [r.status, r.body && r.body.message]);
  r = await apply({ leaveTypeId: SL, startDate: '2026-12-10', endDate: '2026-12-10' }); rec('doc_required_SL', [r.status, r.body && r.body.message]);
  r = await apply({ leaveTypeId: CL, startDate: '2026-11-16', endDate: '2026-11-16' }); rec('notice_period_CL_today', [r.status, r.body && r.body.message]);
  r = await apply({ leaveTypeId: CL, startDate: '2026-12-12', endDate: '2026-12-13' }); rec('weekend_only_CL', [r.status, r.body && r.body.totalDays, r.body && r.body.message]); const wk = r.body && r.body.id;
  if (wk) await L.api(nt, 'POST', `/api/v1/leave-requests/${wk}/cancel`);
  // holiday
  r = await L.api(hr, 'POST', '/api/v1/holidays', { holidayName: 'NUAURA_TEST_Holiday', holidayDate: '2026-12-24', holidayType: 'COMPANY_EVENT' }); const hid = r.body && r.body.id;
  r = await apply({ leaveTypeId: CL, startDate: '2026-12-24', endDate: '2026-12-24' }); rec('apply_on_holiday', [r.status, r.body && r.body.totalDays, r.body && r.body.message]); const hl = r.body && r.body.id; if (hl) { await L.api(nt, 'POST', `/api/v1/leave-requests/${hl}/cancel`); }
  if (hid) await L.api(hr, 'DELETE', `/api/v1/holidays/${hid}`);
  rec('bal_start', bal());
  // reject path
  r = await apply({ leaveTypeId: CL, startDate: '2026-12-14', endDate: '2026-12-16' }); rec('apply_3d_for_reject', [r.status, r.body && r.body.totalDays]); const rj = r.body && r.body.id; rec('bal_pending3', bal());
  r = await L.api(nt, 'POST', `/api/v1/leave-requests/${rj}/approve`); rec('self_approve', [r.status]);
  r = await L.api(e2, 'POST', `/api/v1/leave-requests/${rj}/approve`); rec('non_manager_peer_approve(emp2)', [r.status]);
  r = await L.api(mg, 'POST', `/api/v1/leave-requests/${rj}/reject?reason=`); rec('reject_blank_reason', [r.status]);
  r = await L.api(mg, 'POST', `/api/v1/leave-requests/${rj}/reject?reason=NUAURA_TEST%20team%20busy`); rec('mgr_reject', [r.status, r.body && r.body.status]); rec('bal_after_reject', bal());
  r = await L.api(mg, 'POST', `/api/v1/leave-requests/${rj}/approve`); rec('approve_after_reject', [r.status]);
  // insufficient balance: avail 5 => 3 + 3
  r = await apply({ leaveTypeId: CL, startDate: '2026-12-14', endDate: '2026-12-16' }); const p1 = r.body && r.body.id; rec('apply_3d_again', [r.status]);
  r = await apply({ leaveTypeId: CL, startDate: '2026-12-17', endDate: '2026-12-19' }); rec('insufficient_balance', [r.status, r.body && r.body.message, r.body && r.body.totalDays]); const p2 = r.body && r.body.id; rec('bal_now', bal());
  if (p2) await L.api(nt, 'POST', `/api/v1/leave-requests/${p2}/cancel`);
  r = await L.api(e2, 'POST', `/api/v1/leave-requests/${p1}/cancel`); rec('cancel_other_employees_request', [r.status]);
  r = await L.api(nt, 'POST', `/api/v1/leave-requests/${p1}/cancel`); rec('employee_cancel_own_pending', [r.status, r.body && r.body.status]); rec('bal_after_cancel', bal());
  // cancel approved
  const appr = sql(`select id from leave_requests where employee_id='${NT}' and status='APPROVED'`);
  r = await L.api(nt, 'POST', `/api/v1/leave-requests/${appr}/cancel`); rec('cancel_approved_leave', [r.status, r.body && r.body.status]); rec('bal_after_cancel_approved', bal());
  rec('final_rows', sql(`select start_date,end_date,status,total_days from leave_requests where employee_id='${NT}' order by created_at`));
  fs.writeFileSync(`${L.EV}/logs/hrms/NU-HRMS-E2E-080-leave-rules.json`, JSON.stringify(R, null, 1));
  for (const c of [nt, mg, hr, e2, hm]) await c.unrouteAll({ behavior: 'ignoreErrors' }); await b.close();
})();
