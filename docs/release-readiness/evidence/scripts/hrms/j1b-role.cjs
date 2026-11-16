const L = require('./lib.cjs'); const fs = require('fs'); const { execSync } = require('child_process');
const sql = (q) => execSync(`${__dirname}/db.sh "${q}"`).toString().trim();
(async () => {
  const uid = sql("select u.id from users u where u.email='nuaura_test_hrms1@nulogic.io'").split('\n')[1];
  const before = sql(`select count(*) from user_roles where user_id='${uid}'`);
  const b = await L.chromium.launch(); const c = await L.newCtx(b, 'hradmin');
  const out = { uid, rolesBefore: before };
  out.assign = await L.api(c, 'PUT', `/api/v1/users/${uid}/roles`, { roleCodes: ['EMPLOYEE'] });
  out.rolesAfter = sql(`select r.code from user_roles ur join roles r on r.id=ur.role_id where ur.user_id='${uid}'`);
  out.balances = sql(`select count(*) from leave_balances where employee_id='0fbcc5e2-8278-4a00-b5f2-38e0d1c4093a'`);
  fs.writeFileSync(`${L.EV}/logs/hrms/NU-HRMS-E2E-011-role-assign.json`, JSON.stringify(out, null, 1)); console.log(JSON.stringify(out).slice(0, 700));
  await c.unrouteAll({ behavior: 'ignoreErrors' }); await b.close();
})();
