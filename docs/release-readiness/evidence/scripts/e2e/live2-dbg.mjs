import {chromium,newContext,FE} from './lib.mjs';
const b=await chromium.launch();const ctx=await newContext(b,{role:'hradmin'});const p=await ctx.newPage();
p.on('console',m=>m.type()==='error'&&console.log('C',m.text().slice(0,150)));
await p.goto(FE+'/me/dashboard',{waitUntil:'domcontentloaded',timeout:120000});await p.waitForLoadState('networkidle',{timeout:30000}).catch(()=>{});
console.log(p.url());
console.log(await p.evaluate(async()=>{try{const r=await fetch('http://localhost:8080/api/v1/auth/me',{credentials:'include'});return r.status}catch(e){return String(e)}}));
console.log(await p.evaluate(async()=>{try{const r=await fetch('/api/v1/auth/me',{credentials:'include'});return r.status}catch(e){return String(e)}}));
await b.close();
