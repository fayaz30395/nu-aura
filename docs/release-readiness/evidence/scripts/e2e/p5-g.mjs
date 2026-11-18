import {session, FE} from './p5-lib.mjs';
const TAG=process.argv[2]; const s=await session('hradmin'); const {p}=s;
await s.go('/fluence/blogs/new');
console.log('inputs', await p.evaluate(()=>[...document.querySelectorAll('main input,main textarea,main select,main [role=combobox]')].map(e=>e.tagName+':'+(e.name||e.id||e.placeholder||e.getAttribute('aria-label'))+'='+(e.value||'').slice(0,20))));
// empty submit
await p.getByRole('button',{name:'Create Post'}).click(); await s.settle(1200); console.log('empty create ->', await s.toasts(), '|', await s.main(400)); await s.shot('g-empty');
await p.locator('main input').first().fill(TAG+' blog');
await p.locator('main textarea').first().fill('Excerpt '+TAG); await p.locator('.ProseMirror').click(); await p.keyboard.type('Blog body '+TAG);
await p.getByRole('button',{name:'Create Post'}).click(); await s.settle(3500);
console.log('after create', await s.toasts(), p.url().replace(FE,'')); console.log('main', await s.main(600)); await s.shot('g-created');
console.log(JSON.stringify(s.errs()));
await s.b.close();
