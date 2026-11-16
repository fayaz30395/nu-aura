const L = require('./lib.cjs'); const { execSync } = require('child_process');
const sql = (q) => execSync(`${__dirname}/db.sh "${q}"`).toString().trim().split('\n').slice(1).join(' ; ');
(async () => { const b = await L.chromium.launch(); const nt = await L.newCtx(b, 'nt1'); const hr = await L.newCtx(b, 'hradmin');
 const id = sql("select id from leave_requests where start_date='2025-01-06' and employee_id='0fbcc5e2-8278-4a00-b5f2-38e0d1c4093a'");
 let r = await L.api(nt, 'POST', `/api/v1/leave-requests/${id}/cancel`); console.log('emp cancel', r.status, JSON.stringify(r.body).slice(0, 300));
 r = await L.api(nt, 'POST', `/api/v1/leave-requests/${id}/cancel?reason=NUAURA_TEST%20cleanup`); console.log('emp cancel w/ reason', r.status, JSON.stringify(r.body).slice(0, 200));
 r = await L.api(hr, 'POST', `/api/v1/leave-requests/${id}/cancel?reason=NUAURA_TEST%20cleanup`); console.log('hradmin cancel', r.status, JSON.stringify(r.body).slice(0, 200));
 console.log(sql(`select status from leave_requests where id='${id}'`), sql("select available,pending,used from leave_balances where employee_id='0fbcc5e2-8278-4a00-b5f2-38e0d1c4093a'"));
 for (const c of [nt, hr]) await c.unrouteAll({ behavior: 'ignoreErrors' }); await b.close(); })();
