const L=require('./lib.cjs');(async()=>{const b=await L.chromium.launch();const ctx=await L.newCtx(b,'jagadeesh@nulogic.io');const p=await ctx.newPage();
p.on('response',r=>{if(/api\/v1/.test(r.url()))console.log(r.status(),r.request().method(),r.url())});
await p.goto(L.FE+'/performance/cycles',{waitUntil:'networkidle'});console.log(p.url());await b.close()})()
