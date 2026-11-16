// Holidays + departments CRUD, authz (employee cannot), via API as hradmin/emp with DB checks
const L = require('./lib.cjs'); const fs = require('fs'); const { execSync } = require('child_process');
const sql = (q) => execSync(`${__dirname}/db.sh "${q}"`).toString().trim().split('\n').slice(1).join(' ; ');
(async () => {
  const b = await L.chromium.launch(); const adm = await L.newCtx(b, 'hradmin'); const emp = await L.newCtx(b, 'emp'); const R = {};
  const rec = (k, v) => { R[k] = v; console.log(k, JSON.stringify(v).slice(0, 330)); };
  // Holidays
  let r = await L.api(adm, 'POST', '/api/v1/holidays', { holidayName: '', holidayDate: '2026-12-24', holidayType: 'NATIONAL' }); rec('holiday_create_blank_name', [r.status, r.body && r.body.errors]);
  r = await L.api(adm, 'POST', '/api/v1/holidays', { holidayName: 'NUAURA_TEST_Holiday', holidayType: 'NATIONAL' }); rec('holiday_create_no_date', [r.status]);
  r = await L.api(adm, 'POST', '/api/v1/holidays', { holidayName: 'NUAURA_TEST_Holiday', holidayDate: '2026-12-24', holidayType: 'COMPANY_EVENT' }); rec('holiday_create', [r.status, r.body && r.body.id]); const hid = r.body && r.body.id;
  rec('holiday_db', sql(`select holiday_name,holiday_date,holiday_type,year from holidays where id='${hid}'`));
  r = await L.api(adm, 'POST', '/api/v1/holidays', { holidayName: 'NUAURA_TEST_Holiday dup', holidayDate: '2026-12-24', holidayType: 'COMPANY_EVENT' }); rec('holiday_duplicate_date', [r.status, r.body && r.body.id]); const hid2 = r.body && r.body.id;
  r = await L.api(adm, 'PUT', `/api/v1/holidays/${hid}`, { holidayName: 'NUAURA_TEST_Holiday renamed', holidayDate: '2026-12-24', holidayType: 'COMPANY_EVENT' }); rec('holiday_update', [r.status]); rec('holiday_db2', sql(`select holiday_name from holidays where id='${hid}'`));
  r = await L.api(emp, 'POST', '/api/v1/holidays', { holidayName: 'NUAURA_TEST_emp_attempt', holidayDate: '2026-12-25', holidayType: 'NATIONAL' }); rec('holiday_create_as_employee', [r.status]);
  r = await L.api(emp, 'GET', '/api/v1/holidays/year/2026'); rec('holiday_list_as_employee', [r.status, Array.isArray(r.body) ? r.body.length : (r.body && r.body.content && r.body.content.length)]);
  // Departments
  r = await L.api(adm, 'POST', '/api/v1/departments', { code: '', name: '' }); rec('dept_create_blank', [r.status]);
  r = await L.api(adm, 'POST', '/api/v1/departments', { code: 'NUAURA_TEST_D1', name: 'NUAURA_TEST Dept', description: 'x', isActive: true }); rec('dept_create', [r.status, r.body && r.body.id]); const did = r.body && r.body.id;
  rec('dept_db', sql(`select code,name,is_active from departments where id='${did}'`));
  r = await L.api(adm, 'POST', '/api/v1/departments', { code: 'NUAURA_TEST_D1', name: 'NUAURA_TEST Dept dup' }); rec('dept_duplicate_code', [r.status]);
  r = await L.api(adm, 'POST', '/api/v1/departments', { code: 'NUAURA_TEST_D2', name: 'NUAURA_TEST Child', parentDepartmentId: did, isActive: true }); rec('dept_child_create', [r.status, r.body && r.body.id]); const cid = r.body && r.body.id;
  r = await L.api(adm, 'PUT', `/api/v1/departments/${did}`, { code: 'NUAURA_TEST_D1', name: 'NUAURA_TEST Dept renamed', parentDepartmentId: cid, isActive: true }); rec('dept_cycle_parent_update (parent=own child)', [r.status]);
  r = await L.api(adm, 'GET', '/api/v1/departments/hierarchy'); rec('dept_hierarchy', [r.status]);
  r = await L.api(emp, 'POST', '/api/v1/departments', { code: 'NUAURA_TEST_D3', name: 'NUAURA_TEST emp attempt' }); rec('dept_create_as_employee', [r.status]);
  r = await L.api(adm, 'DELETE', `/api/v1/departments/${did}`); rec('dept_delete_parent_with_child', [r.status]);
  r = await L.api(adm, 'DELETE', `/api/v1/departments/${cid}`); rec('dept_delete_child', [r.status]);
  r = await L.api(adm, 'DELETE', `/api/v1/departments/${did}`); rec('dept_delete_parent', [r.status]);
  rec('dept_db_after', sql(`select code,is_active,is_deleted from departments where code like 'NUAURA_TEST%'`));
  // cleanup holidays
  for (const id of [hid, hid2]) if (id) { r = await L.api(adm, 'DELETE', `/api/v1/holidays/${id}`); rec('holiday_delete_' + id.slice(0, 4), [r.status]); }
  rec('holiday_db_after', sql(`select holiday_name,is_deleted from holidays where holiday_name like 'NUAURA_TEST%'`));
  fs.writeFileSync(`${L.EV}/logs/hrms/NU-HRMS-E2E-050-admin-crud.json`, JSON.stringify(R, null, 1));
  for (const c of [adm, emp]) await c.unrouteAll({ behavior: 'ignoreErrors' }); await b.close();
})();
