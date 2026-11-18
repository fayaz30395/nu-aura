import {session, FE} from './p5-lib.mjs';
const TAG=process.argv[2]; const s=await session('hradmin'); const {p}=s;
await s.go('/fluence/wiki/new');
// publish with nothing
await p.getByRole('button',{name:'Publish'}).click(); await s.settle(1500); console.log('empty publish ->', await s.toasts(), p.url().replace(FE,'')); 
await p.getByLabel('Page title').fill(TAG+' wiki page');
await p.locator('.ProseMirror').click(); await p.keyboard.type('Hello body '+TAG+' <script>window.__x=1</script> **bold**'); await p.waitForTimeout(500);
await p.getByRole('button',{name:'Publish'}).click(); await s.settle(2500);
console.log('publish no space ->', await s.toasts(), '| url', p.url().replace(FE,''));
await s.shot('c-publish-nospace');
console.log('side', await p.evaluate(()=>document.body.innerText.replace(/\s+/g,' ').slice(300,900)));
console.log(JSON.stringify(s.errs()));
await s.b.close();
