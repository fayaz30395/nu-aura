import {session, FE} from './p5-lib.mjs';
const TAG=process.argv[2]; const s=await session('hradmin'); const {p}=s;
await s.go('/fluence/wiki');
await p.getByRole('button',{name:/create space|create new space/i}).first().click(); await p.waitForTimeout(800);
await p.locator('[role=dialog] input[name=name]').fill(TAG+'_space');
await p.locator('[role=dialog] textarea[name=description]').fill('plain description '+TAG);
await p.getByRole('button',{name:'Create Space'}).last().click(); await s.settle(2500);
console.log('after space: toast', await s.toasts(), '| main', await s.main(300)); await s.shot('b-space');
// wiki new
await s.go('/fluence/wiki/new');
console.log('FORM', await p.evaluate(()=>[...document.querySelectorAll('main input, main textarea, main [contenteditable=true], main [role=combobox], main select')].map(e=>e.tagName+':'+(e.getAttribute('aria-label')||e.placeholder||e.id||e.className.slice(0,25)))));
console.log('toolbar', await main(s) ?? '');
await b?.close;
await s.b.close();
function main(s){return s.main(300)}
