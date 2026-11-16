const L = require('./lib.cjs');
(async () => { const b = await L.chromium.launch();
  for (const [r, path] of [['tl', '/me/documents'], ['fin', '/me/documents'], ['tl', '/me/documents']]) {
    const ctx = await L.newCtx(b, r); const p = await ctx.newPage(); const B = L.bag(); L.collect(p, B);
    await p.goto(L.FE + path, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(6000);
    const t = (await p.innerText('body')).replace(/\s+/g, ' ');
    console.log(r, path, '->', p.url().replace(L.FE, ''), '| http', JSON.stringify([...new Set(B.http)]), '| text:', t.slice(0, 260));
    await p.screenshot({ path: `${L.EV}/screenshots/NU-HRMS-E2E-041-recheck-${r}-documents.png` });
    await ctx.unrouteAll({ behavior: 'ignoreErrors' }); await ctx.close(); }
  await b.close(); })();
