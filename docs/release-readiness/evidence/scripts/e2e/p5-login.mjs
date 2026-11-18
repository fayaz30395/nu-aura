import {chromium, uiLogin, sleep} from './lib.mjs';
const b = await chromium.launch();
for (const [role,email] of [['p5_employee','arun@nulogic.io'],['p5_manager','sumit@nulogic.io'],['p5_hradmin','admin@nulogic.io']]) {
  try { const r = await uiLogin(b, role, email); console.log(role, r.url, r.log.http.slice(0,3)); } catch(e){ console.log(role,'FAIL',String(e).slice(0,150)); }
  await sleep(15000);
}
await b.close();
