import {session, FE} from './p5-lib.mjs';
const TAG=process.argv[2]; const s=await session('hradmin'); const {p}=s;
await s.go('/fluence/templates/new');
console.log('inputs', await p.evaluate(()=>[...document.querySelectorAll('input,textarea,select')].map(e=>e.tagName+':'+(e.name||e.id||e.placeholder||e.getAttribute('aria-label'))+'='+(e.value||'').slice(0,20))));
await p.getByRole('button',{name:'Save Template'}).click(); await s.settle(1500); console.log('empty save ->', await s.toasts(), '|dlg', await s.dlg(), '|', await p.locator('.mantine-Drawer-content').count());
console.log('drawer', await p.evaluate(()=>(document.querySelector('.mantine-Drawer-content, [role=dialog]')?.innerText||'none').replace(/\s+/g,' ').slice(0,300)));
await s.shot('h-tpl');
console.log(JSON.stringify(s.errs()));
await s.b.close();
