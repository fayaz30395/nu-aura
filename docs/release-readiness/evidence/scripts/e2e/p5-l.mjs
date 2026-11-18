import {session, FE} from './p5-lib.mjs';
for (const role of ['manager','employee']) {
  const s=await session(role,{net:false}); const {p}=s; console.log('=====',role);
  await s.go('/fluence/wiki'); console.log('list ->', await s.main(450));
  const api = await p.evaluate(async()=>{ const out={}; for (const u of ['/api/v1/knowledge/wiki/pages?size=50','/api/v1/knowledge/wiki/pages/de931c4b-fa1b-4b68-a25f-6ca2b0f4fc57','/api/v1/knowledge/wiki/pages/my','/api/v1/fluence/search?query=NUAURA_TEST_P5_R2']) { const r=await fetch('http://localhost:8080'+u,{credentials:'include'}); const t=await r.text(); out[u]=r.status+' '+(t.match(/NUAURA_TEST_P5_R2[^"]{0,30}/g)||[]).slice(0,8).join(';'); } return out; });
  console.log(JSON.stringify(api,null,1));
  await s.go('/fluence/wiki/de931c4b-fa1b-4b68-a25f-6ca2b0f4fc57'); console.log('direct private draft ->', p.url().replace(FE,''), await s.main(200));
  await s.b.close();
}
