// Cross-employee access: arun (emp) vs anshuman (emp2) and vs NUAURA_TEST_001, direct API. Expect 403/404.
const L = require('./lib.cjs'); const fs = require('fs'); const { execSync } = require('child_process');
const sql = (q) => execSync(`${__dirname}/db.sh "${q}"`).toString().trim().split('\n').slice(1).join(' ; ');
(async () => {
  const b = await L.chromium.launch(); const A = await L.newCtx(b, 'emp'); const R = {};
  const bId = sql("select e.id from employees e join users u on u.id=e.user_id where u.email='anshuman@nulogic.io'");
  const bLeave = sql(`select id from leave_requests where employee_id='${bId}' limit 1`);
  const ntId = '0fbcc5e2-8278-4a00-b5f2-38e0d1c4093a';
  const mine = (await L.api(A, 'GET', '/api/v1/employees/me')).body.id;
  const T = [
    ['GET employee B', 'GET', `/api/v1/employees/${bId}`], ['GET employee NT1', 'GET', `/api/v1/employees/${ntId}`],
    ['PUT employee B', 'PUT', `/api/v1/employees/${bId}`, { firstName: 'NUAURA_TEST_hack', lastName: 'x', workEmail: 'anshuman@nulogic.io', joiningDate: '2024-01-01', designation: 'x', employmentType: 'FULL_TIME' }],
    ['PUT employee B admin', 'PUT', `/api/v1/employees/${bId}/admin`, { designation: 'NUAURA_TEST_hack' }],
    ['DELETE employee B', 'DELETE', `/api/v1/employees/${bId}`],
    ['deactivate B', 'PUT', `/api/v1/employees/${bId}/deactivate`],
    ['leave-requests of B', 'GET', `/api/v1/leave-requests/employee/${bId}`],
    ['leave-balances of B', 'GET', `/api/v1/leave-balances/employee/${bId}`],
    ['attendance of B', 'GET', `/api/v1/attendance/employee/${bId}`],
    ['attendance time entries of B', 'GET', `/api/v1/attendance/employee/${bId}/time-entries`],
    ['expenses of B', 'GET', `/api/v1/expenses/employees/${bId}`],
    ['assets of B', 'GET', `/api/v1/assets/employee/${bId}`],
    ['contracts of B', 'GET', `/api/v1/contracts/employee/${bId}`],
    ['benefit enrollments of B', 'GET', `/api/v1/benefits-enhanced/enrollments/employee/${bId}`],
    ['apply leave FOR B', 'POST', '/api/v1/leave-requests', { employeeId: bId, leaveTypeId: 'bbba1366-6d95-44db-909a-07e333e155d9', startDate: '2026-12-21', endDate: '2026-12-21', reason: 'NUAURA_TEST forged for other employee' }],
    ['check-in FOR B', 'POST', '/api/v1/attendance/check-in', { employeeId: bId, source: 'WEB' }],
    ['expense claim FOR B', 'POST', `/api/v1/expenses/employees/${bId}`, {}],
    ['approve leave of B (not mgr)', 'POST', `/api/v1/leave-requests/${bLeave || '00000000-0000-0000-0000-000000000000'}/approve`],
    ['all employees list', 'GET', '/api/v1/employees?size=5'], ['attendance all', 'GET', '/api/v1/attendance/all'], ['leave-requests all', 'GET', '/api/v1/leave-requests?size=5'],
  ];
  for (const [n, m, u, body] of T) { const r = await L.api(A, m, u, body); const rows = r.body && (r.body.content ? r.body.content.length : (Array.isArray(r.body) ? r.body.length : undefined)); R[n] = { status: r.status, rows }; console.log(n.padEnd(34), r.status, rows === undefined ? '' : 'rows=' + rows); }
  R._ctx = { mine, bId, bLeave }; fs.writeFileSync(`${L.EV}/logs/hrms/NU-HRMS-E2E-060-idor-employee-vs-employee.json`, JSON.stringify(R, null, 1));
  await A.unrouteAll({ behavior: 'ignoreErrors' }); await b.close();
})();
