import {session, FE} from './p5-lib.mjs';
const TAG=process.argv[2]; const s=await session('employee'); const {p}=s;
await s.go('/fluence/wall');
console.log('textareas', await p.evaluate(()=>[...document.querySelectorAll('main textarea, main input, main [contenteditable]')].map(e=>e.tagName+':'+(e.placeholder||e.getAttribute('aria-label')||e.name))));
// empty post
const postBtn=p.getByRole('button',{name:'Post',exact:true}); console.log('post buttons', await postBtn.count(), 'disabled', await postBtn.last().isDisabled());
const ta=p.locator('main textarea').first();
await ta.fill('<img src=x onerror=window.__w=1> '+TAG+' xss'); await postBtn.last().click(); await s.settle(2500);
console.log('xss post ->', await s.toasts(), '|', await s.main(300), 'w=', await p.evaluate(()=>window.__w));
await ta.fill(TAG+' plain post'); await postBtn.last().click(); await s.settle(2500);
console.log('plain post ->', await s.toasts(), '|', await s.main(260)); await s.shot('o-wall');
await ta.fill(TAG+' '+'A'.repeat(6000)); await postBtn.last().click(); await s.settle(2500);
console.log('long post ->', await s.toasts().then(t=>t.slice(0,150)));
console.log(JSON.stringify(s.errs()).slice(0,300));
await s.b.close();
