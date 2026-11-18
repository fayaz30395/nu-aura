import {session, FE} from './p5-lib.mjs';
const ID='ba12d612-728f-4717-8f45-1bd60c797c7d';
for (const role of ['hradmin','employee','manager']) {
  const s=await session(role,{net:false}); const {p}=s; console.log('=====',role);
  await s.go('/fluence/search'); 
  await p.locator('input').first().fill('NUAURA_TEST_P5_R2'); await s.settle(2500);
  console.log('search ->', await s.main(400)); if(role==='hradmin') await s.shot('j-search');
  await s.go('/fluence/wiki/'+ID); console.log('direct ->', p.url().replace(FE,''), await s.main(250));
  await s.go('/fluence/wiki'); console.log('list ->', await s.main(300));
  await s.go('/fluence/my-content'); console.log('my-content ->', await s.main(300));
  console.log(JSON.stringify(s.errs()).slice(0,400)); await s.b.close();
}
