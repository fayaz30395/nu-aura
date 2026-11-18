import {session, FE} from './p5-lib.mjs';
for (const mobile of [false,true]) {
const s=await session('employee',{mobile,net:false}); const {p}=s;
await s.go('/fluence/wall');
const m=await p.evaluate(()=>({sw:document.documentElement.scrollWidth, iw:innerWidth, wide:[...document.querySelectorAll('main *')].filter(e=>e.getBoundingClientRect().right>innerWidth+2).slice(0,3).map(e=>e.tagName+'.'+String(e.className).slice(0,40))}));
console.log(mobile?'mobile':'desktop', JSON.stringify(m)); if(mobile) await s.shot('p-wall-mobile'); else await s.shot('p-wall-desktop');
await s.b.close(); }
