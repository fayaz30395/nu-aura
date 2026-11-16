const L = require('./lib.cjs'); const fs = require('fs'); const { execSync } = require('child_process');
const sql = (q) => execSync(`${__dirname}/db.sh "${q}"`).toString().trim().split('\n').slice(1).join(' ; ');
(async () => {
  const b = await L.chromium.launch(); const adm = await L.newCtx(b, 'hradmin'); const R = {}; const rec = (k, v) => { R[k] = v; console.log(k, JSON.stringify(v).slice(0, 300)); };
  const id = (c) => sql(`select id from departments where code='${c}' and is_deleted=false`);
  const d1 = id('NUAURA_TEST_D1'), d2 = id('NUAURA_TEST_D2');
  // self-parent
  let r = await L.api(adm, 'PUT', `/api/v1/departments/${d1}`, { code: 'NUAURA_TEST_D1', name: 'NUAURA_TEST Dept', parentDepartmentId: d1, isActive: true }); rec('self_parent_update', [r.status]);
  rec('db_parents', sql(`select code,parent_department_id from departments where code like 'NUAURA_TEST%' order by code`));
  // untangle + delete
  r = await L.api(adm, 'PUT', `/api/v1/departments/${d1}`, { code: 'NUAURA_TEST_D1', name: 'NUAURA_TEST Dept', parentDepartmentId: null, isActive: true }); rec('untangle', [r.status]);
  r = await L.api(adm, 'PUT', `/api/v1/departments/${d2}`, { code: 'NUAURA_TEST_D2', name: 'NUAURA_TEST Child', parentDepartmentId: d1, isActive: true }); rec('restore_child', [r.status]);
  r = await L.api(adm, 'DELETE', `/api/v1/departments/${d2}`); rec('delete_child', [r.status, r.body && r.body.message]);
  r = await L.api(adm, 'DELETE', `/api/v1/departments/${d1}`); rec('delete_parent', [r.status, r.body && r.body.message]);
  rec('db_after', sql(`select code,is_deleted,is_active from departments where code like 'NUAURA_TEST%'`));
  fs.writeFileSync(`${L.EV}/logs/hrms/NU-HRMS-E2E-051-dept-cycle.json`, JSON.stringify(R, null, 1)); await adm.unrouteAll({ behavior: 'ignoreErrors' }); await b.close();
})();
