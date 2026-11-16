// Expenses (submit/approve/reject/self-approve), assets (allocate/return), contracts, benefits - API + DB. nt1 = NUAURA_TEST_001
const L = require('./lib.cjs'); const fs = require('fs'); const { execSync } = require('child_process');
const sql = (q) => execSync(`${__dirname}/db.sh "${q}"`).toString().trim().split('\n').slice(1).join(' ; ');
const NT = '0fbcc5e2-8278-4a00-b5f2-38e0d1c4093a';
(async () => {
  const b = await L.chromium.launch(); const nt = await L.newCtx(b, 'nt1'); const mg = await L.newCtx(b, 'mgr'); const hr = await L.newCtx(b, 'hradmin'); const hm = await L.newCtx(b, 'hrmgr'); const fn = await L.newCtx(b, 'fin'); const R = {};
  const rec = (k, v) => { R[k] = v; console.log(k, JSON.stringify(v).slice(0, 300)); };
  const today = new Date().toISOString().slice(0, 10);
  // --- expenses
  let r = await L.api(nt, 'POST', '/api/v1/expenses', { claimDate: today, category: 'MEALS', description: 'NUAURA_TEST meal', amount: 0, currency: 'INR' }); rec('exp_zero_amount', [r.status]);
  r = await L.api(nt, 'POST', '/api/v1/expenses', { claimDate: '2030-01-01', category: 'MEALS', description: 'NUAURA_TEST future', amount: 10, currency: 'INR' }); rec('exp_future_date', [r.status]);
  r = await L.api(nt, 'POST', '/api/v1/expenses', {}); rec('exp_empty_body', [r.status, r.body && r.body.errors && Object.keys(r.body.errors)]);
  r = await L.api(nt, 'POST', '/api/v1/expenses', { claimDate: today, category: 'MEALS', description: 'NUAURA_TEST meal approve', amount: 250.5, currency: 'INR' }); rec('exp_create_A', [r.status, r.body && r.body.id, r.body && r.body.status]); const A = r.body && r.body.id;
  r = await L.api(nt, 'POST', '/api/v1/expenses', { claimDate: today, category: 'TRANSPORT', description: 'NUAURA_TEST cab reject', amount: 99, currency: 'INR' }); rec('exp_create_B', [r.status, r.body && r.body.id]); const Bc = r.body && r.body.id;
  rec('exp_db_draft', sql(`select id,status,amount,employee_id from expense_claims where id in ('${A}','${Bc}')`));
  r = await L.api(nt, 'POST', `/api/v1/expenses/${A}/approve`); rec('exp_self_approve_draft', [r.status]);
  for (const id of [A, Bc]) { r = await L.api(nt, 'POST', `/api/v1/expenses/${id}/submit`); rec('exp_submit_' + id.slice(0, 4), [r.status, r.body && r.body.status]); }
  r = await L.api(nt, 'POST', `/api/v1/expenses/${A}/approve`); rec('exp_self_approve_submitted', [r.status]);
  r = await L.api(nt, 'POST', `/api/v1/expenses/${A}/approve`); 
  r = await L.api(mg, 'GET', '/api/v1/expenses/pending-approvals'); rec('exp_mgr_pending_visible', [r.status, r.body && (r.body.content || r.body).filter && (r.body.content || r.body).some(x => x.id === A)]);
  r = await L.api(mg, 'POST', `/api/v1/expenses/${A}/approve`); rec('exp_mgr_approve_A', [r.status, r.body && r.body.status, r.body && r.body.message]);
  r = await L.api(mg, 'POST', `/api/v1/expenses/${Bc}/reject?reason=`); rec('exp_reject_blank_reason', [r.status]);
  r = await L.api(mg, 'POST', `/api/v1/expenses/${Bc}/reject?reason=NUAURA_TEST%20not%20eligible`); rec('exp_mgr_reject_B', [r.status, r.body && r.body.status]);
  rec('exp_db_final', sql(`select id,status,rejection_reason from expense_claims where id in ('${A}','${Bc}')`));
  r = await L.api(nt, 'GET', '/api/v1/expenses/employees/' + NT); rec('exp_nt_list_own', [r.status, r.body && (r.body.content || []).length]);
  // approve again => conflict
  r = await L.api(mg, 'POST', `/api/v1/expenses/${A}/approve`); rec('exp_double_approve', [r.status]);
  // --- assets
  r = await L.api(hr, 'POST', '/api/v1/assets', { assetCode: 'NUAURA_TEST_AST1', assetName: 'NUAURA_TEST Laptop', category: 'LAPTOP', serialNumber: 'NUAURA-SN-1', status: 'AVAILABLE' }); rec('asset_create', [r.status, r.body && r.body.id]); const ast = r.body && r.body.id;
  r = await L.api(hr, 'POST', '/api/v1/assets', { assetCode: 'NUAURA_TEST_AST1', assetName: 'dup', category: 'LAPTOP' }); rec('asset_dup_code', [r.status]);
  r = await L.api(hr, 'POST', '/api/v1/assets', { assetCode: '', assetName: '' }); rec('asset_blank', [r.status]);
  r = await L.api(nt, 'POST', `/api/v1/assets/${ast}/assign?employeeId=${NT}`); rec('asset_assign_as_employee', [r.status]);
  r = await L.api(hr, 'POST', `/api/v1/assets/${ast}/assign?employeeId=${NT}`); rec('asset_assign', [r.status, r.body && r.body.status]); rec('asset_db_assigned', sql(`select status,assigned_to from assets where id='${ast}'`));
  r = await L.api(nt, 'GET', `/api/v1/assets/employee/${NT}`); rec('asset_nt_sees_own', [r.status, JSON.stringify(r.body).includes('NUAURA_TEST_AST1')]);
  r = await L.api(hr, 'POST', `/api/v1/assets/${ast}/assign?employeeId=${NT}`); rec('asset_double_assign', [r.status]);
  r = await L.api(hr, 'POST', `/api/v1/assets/${ast}/return`); rec('asset_return', [r.status, r.body && r.body.status]); rec('asset_db_returned', sql(`select status,assigned_to from assets where id='${ast}'`));
  // --- contracts
  r = await L.api(hr, 'POST', '/api/v1/contracts', { title: 'NU', type: 'EMPLOYMENT', startDate: today, endDate: '2020-01-01' }); rec('contract_bad_dates_short_title', [r.status]);
  r = await L.api(hr, 'POST', '/api/v1/contracts', { title: 'NUAURA_TEST Employment Contract', type: 'EMPLOYMENT', employeeId: NT, startDate: today, endDate: '2027-11-15', value: 100, currency: 'INR' }); rec('contract_create', [r.status, r.body && r.body.id, r.body && r.body.status]); const ct = r.body && r.body.id;
  r = await L.api(nt, 'GET', `/api/v1/contracts/employee/${NT}`); rec('contract_employee_view_own', [r.status]);
  r = await L.api(nt, 'POST', '/api/v1/contracts', { title: 'NUAURA_TEST emp-created', type: 'NDA', startDate: today }); rec('contract_create_as_employee', [r.status]);
  r = await L.api(hr, 'PATCH', `/api/v1/contracts/${ct}/mark-active`); rec('contract_mark_active_from_draft', [r.status]);
  r = await L.api(hr, 'PATCH', `/api/v1/contracts/${ct}/terminate`); rec('contract_terminate', [r.status]); rec('contract_db', sql(`select title,status from contracts where id='${ct}'`));
  // --- benefits
  r = await L.api(hr, 'GET', '/api/v1/benefits-enhanced/plans/active'); rec('benefit_plans_active', [r.status, Array.isArray(r.body) ? r.body.length : (r.body && r.body.content && r.body.content.length)]);
  r = await L.api(nt, 'GET', '/api/v1/benefits-enhanced/plans/eligible'); rec('benefit_plans_eligible_nt', [r.status, Array.isArray(r.body) ? r.body.length : null]);
  r = await L.api(nt, 'GET', `/api/v1/benefits-enhanced/enrollments/employee/${NT}`); rec('benefit_enrollments_nt', [r.status]);
  fs.writeFileSync(`${L.EV}/logs/hrms/NU-HRMS-E2E-070-expense-asset-contract-benefit.json`, JSON.stringify(R, null, 1));
  for (const c of [nt, mg, hr, hm, fn]) await c.unrouteAll({ behavior: 'ignoreErrors' }); await b.close();
})();
