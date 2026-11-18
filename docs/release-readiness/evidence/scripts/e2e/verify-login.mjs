import {chromium, uiLogin, newContext, BE} from './lib.mjs';
const b = await chromium.launch();
for (const [role,email] of [['verify_emp','arun@nulogic.io'],['verify_hr','admin@nulogic.io']]) {
  const r = await uiLogin(b, role, email); console.log(role, r.url, r.log.http.slice(0,3));
  const c = await newContext(b,{role}); console.log((await c.request.get(BE+'/api/v1/auth/me')).status());
}
await b.close();
