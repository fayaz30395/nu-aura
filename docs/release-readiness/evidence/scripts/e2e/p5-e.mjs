import {session, FE} from './p5-lib.mjs';
const TAG=process.argv[2]; const s=await session('hradmin'); const {p}=s;
await s.go('/fluence/wiki/new');
await p.getByLabel('Page title').fill(TAG+' wiki page');
await p.locator('.ProseMirror').click(); await p.keyboard.type('Hello body '+TAG+' plain text for publishing'); await p.waitForTimeout(500);
await p.getByRole('button',{name:'Publish'}).first().click(); await s.settle(1000);
// try publish page w/o space
await p.getByRole('button',{name:/Publish Page/}).click(); await s.settle(2000);
console.log('publish w/o space ->', await s.toasts(), '| url', p.url().replace(FE,''), '| drawerHas', await p.locator('.mantine-Drawer-content').count());
await s.shot('e-nospace');
// choose space
const cb = p.locator('.mantine-Drawer-content input[placeholder="Select a space"], .mantine-Drawer-content [role=combobox]').first();
await cb.click(); await p.waitForTimeout(800);
console.log('options', await p.evaluate(()=>[...document.querySelectorAll('[role=option]')].map(o=>o.innerText.slice(0,40))));
await p.getByRole('option',{name:new RegExp('NUAURA_TEST_P5_R1')}).first().click().catch(e=>console.log('opt fail'));
await p.getByRole('button',{name:/Publish Page/}).click(); await s.settle(3500);
console.log('publish ->', await s.toasts(), '| url', p.url().replace(FE,''));
console.log('PAGE', await s.main(500));
console.log('xss', await p.evaluate(()=>[window.__x,window.__y]));
await s.shot('e-published');
console.log(JSON.stringify(s.errs()));
await s.b.close();
