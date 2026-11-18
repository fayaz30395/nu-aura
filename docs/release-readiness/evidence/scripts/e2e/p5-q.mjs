import {session, FE} from './p5-lib.mjs';
const TAG=process.argv[2]; const s=await session('hradmin'); const {p}=s;
// Recognition
await s.go('/recognition'); await p.getByRole('button',{name:'Give Recognition'}).first().click(); await s.settle(800);
console.log('REC dlg', await s.dlg()); console.log('REC fields', await p.evaluate(()=>[...document.querySelectorAll('[role=dialog] input,[role=dialog] textarea,[role=dialog] select,[role=dialog] [role=combobox]')].map(e=>e.tagName+':'+(e.name||e.placeholder||e.id||e.getAttribute('aria-label')))));
await p.getByRole('button',{name:/^(Send|Give|Submit|Recognize)/i}).last().click().catch(()=>console.log('no submit')); await s.settle(1000); console.log('REC empty submit ->', await s.toasts(), '|', (await s.dlg()).slice(0,300)); await s.shot('q-rec');
await p.keyboard.press('Escape');
// LinkedIn
await s.go('/linkedin-posts'); await p.getByRole('button',{name:'Add Post'}).click(); await s.settle(800);
console.log('LI dlg', await s.dlg()); console.log('LI fields', await p.evaluate(()=>[...document.querySelectorAll('[role=dialog] input,[role=dialog] textarea')].map(e=>e.tagName+':'+(e.name||e.placeholder||e.id)+'['+e.type+']')));
await p.getByRole('button',{name:/^(Save|Add|Create|Submit|Post)/i}).last().click().catch(()=>console.log('no submit')); await s.settle(1000); console.log('LI empty submit ->', await s.toasts(), '|', (await s.dlg()).slice(0,300)); await s.shot('q-li');
console.log(JSON.stringify(s.errs()).slice(0,300));
await s.b.close();
