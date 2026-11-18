import {chromium, newContext, BE, FE} from './lib.mjs';
const b = await chromium.launch();
for (const role of ['employee','hradmin','p5_employee','p5_hradmin']) {
  const c = await newContext(b,{role});
  const r = await c.request.get(BE+'/api/v1/auth/me').catch(e=>({status:()=>e.message}));
  console.log(role, r.status());
  const ck=(await c.storageState()).cookies.map(x=>x.name+':'+new Date(x.expires*1000).toISOString().slice(0,16)); console.log(ck.join(' '));
}
const c = await newContext(b,{role:'employee'});
const co = await (await c.request.get(BE+'/api/v1/lms/courses?size=3')).text(); console.log(co.slice(0,400));
const jo = await (await c.request.get(BE+'/api/v1/public/careers?size=3').catch(()=>null))?.text(); console.log(jo?.slice(0,300));
await b.close();
