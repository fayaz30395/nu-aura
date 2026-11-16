const L = require('./lib.cjs'); const { execSync } = require('child_process');
const sql = (q) => execSync(`${__dirname}/db.sh "${q}"`).toString().trim().split('\n').slice(1).join(' ; ');
(async () => { const b = await L.chromium.launch(); const nt = await L.newCtx(b, 'nt1');
 const id = sql("select id from leave_requests where start_date='2026-12-07' and employee_id='0fbcc5e2-8278-4a00-b5f2-38e0d1c4093a'");
 let r = await L.api(nt, 'POST', `/api/v1/leave-requests/${id}/cancel?reason=NUAURA_TEST%20cleanup`); console.log('cancel approved', r.status, r.body && r.body.status);
 console.log(sql(`select status from leave_requests where id='${id}'`), '| bal', sql("select opening_balance,available,pending,used from leave_balances where employee_id='0fbcc5e2-8278-4a00-b5f2-38e0d1c4093a'"));
 await nt.unrouteAll({ behavior: 'ignoreErrors' }); await b.close(); })();
