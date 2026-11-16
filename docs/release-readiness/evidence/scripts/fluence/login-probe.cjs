const { chromium, ctxFor, api } = require('./lib.cjs');
(async () => {
  const b = await chromium.launch();
  for (const e of process.argv.slice(2)) {
    const c = await ctxFor(b, e);
    const p = await c.newPage(); await p.goto('http://localhost:3000/fluence'); await p.waitForTimeout(2500);
    console.log(e, p.url());
    const r = await api(c, 'GET', '/api/v1/auth/me'); console.log(' me', r.status, JSON.stringify(r.body).slice(0,200));
    const ck = await c.cookies(); console.log(' cookies', ck.map(x=>x.name+'@'+x.domain).join(','));
  }
  await b.close();
})().catch(e=>{console.error(e.message);process.exit(1)});
