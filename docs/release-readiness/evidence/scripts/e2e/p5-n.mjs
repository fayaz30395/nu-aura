import {session, FE} from './p5-lib.mjs';
const s=await session('hradmin',{net:false}); const {p}=s;
p.on('response', async r=>{ if(/search|knowledge/.test(r.url()) && /\/api\//.test(r.url())) console.log(r.status(), r.request().method(), r.url().replace(/^https?:\/\/[^/]+/,''), (await r.text().catch(()=>'')).slice(0,160)); });
await s.go('/fluence/search');
await p.locator('main input').first().click(); await p.keyboard.type('NUAURA_TEST_P5_R2',{delay:30}); await s.settle(3500);
await s.b.close();
