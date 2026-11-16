import {chromium, uiLogin, sleep} from './lib.mjs';
const accts = {employee: 'arun@nulogic.io', manager: 'sumit@nulogic.io', hradmin: 'admin@nulogic.io', payroll: 'tenant.admin@nulogic.io', recruiter: 'suresh@nulogic.io'};
const only = process.argv.slice(2);
const b = await chromium.launch();
for (const [role, email] of Object.entries(accts)) {
  if (only.length && !only.includes(role)) continue;
  try { const r = await uiLogin(b, role, email); console.log(role, 'OK ->', r.url, JSON.stringify(r.log.http.slice(0,3))); }
  catch (e) { console.log(role, 'FAIL', String(e).slice(0, 300)); }
  await sleep(15000);
}
await b.close();
