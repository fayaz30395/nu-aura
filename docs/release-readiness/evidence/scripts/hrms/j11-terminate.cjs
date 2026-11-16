const L = require('./lib.cjs'); const fs = require('fs'); const { execSync } = require('child_process');
const sql = (q) => execSync(`${__dirname}/db.sh "${q}"`).toString().trim().split('\n').slice(1).join(' ; ');
const NT = '0fbcc5e2-8278-4a00-b5f2-38e0d1c4093a';
(async () => {
  const b = await L.chromium.launch(); const nt = await L.newCtx(b, 'nt1'), hr = await L.newCtx(b, 'hradmin'); const R = {}; const rec = (k, v) => { R[k] = v; console.log(k, JSON.stringify(v).slice(0, 280)); };
  let r = await L.api(nt, 'GET', '/api/v1/employees/me'); rec('before_terminate_me', [r.status]);
  r = await L.api(hr, 'PUT', `/api/v1/employees/${NT}/admin`, { status: 'TERMINATED' }); rec('terminate', [r.status, r.body && r.body.status]);
  rec('db', sql(`select e.status,u.status from employees e join users u on u.id=e.user_id where e.id='${NT}'`));
  for (let i = 0; i < 3; i++) { r = await L.api(nt, 'GET', '/api/v1/employees/me'); rec('old_token_me_' + i, [r.status]); r = await L.api(nt, 'GET', '/api/v1/leave-balances/employee/' + NT); rec('old_token_balances_' + i, [r.status]); }
  r = await L.api(nt, 'POST', '/api/v1/attendance/check-in', { employeeId: NT, source: 'WEB' }); rec('old_token_checkin', [r.status]);
  // fresh login attempt as terminated user (retry through 429)
  let st; for (let i = 0; i < 20; i++) { const c = await b.newContext(); const x = await c.request.post(L.BE + '/api/v1/auth/login', { data: { email: 'nuaura_test_hrms1@nulogic.io', password: process.env.NTPW }, headers: { 'Content-Type': 'application/json' } }); st = x.status(); if (st !== 429) { let j = null; try { j = await x.json(); } catch (e) {} rec('terminated_login', [st, j && (j.message || j.error)]); const ck = await c.cookies(); rec('login_set_cookies', ck.map(k => k.name)); await c.close(); break; } await c.close(); await new Promise(z => setTimeout(z, 13000)); }
  fs.writeFileSync(`${L.EV}/logs/hrms/NU-HRMS-E2E-100-termination.json`, JSON.stringify(R, null, 1)); for (const c of [nt, hr]) await c.unrouteAll({ behavior: 'ignoreErrors' }); await b.close();
})();
