const L = require('./lib.cjs');
(async () => { const b = await L.chromium.launch();
  for (const r of ['tl', 'fin', 'emp', 'rec']) { const ctx = await L.newCtx(b, r);
    const a = await L.api(ctx, 'GET', '/api/v1/self-service/document-types'); const m = await L.api(ctx, 'GET', '/api/v1/employees/me');
    console.log(r, 'doc-types', a.status, 'employees/me', m.status);
    const p = await ctx.newPage(); const urls = []; p.on('framenavigated', f => { if (f === p.mainFrame()) urls.push(f.url().replace(L.FE, '')); });
    await p.goto(L.FE + '/me/documents', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(5000); console.log('  nav', JSON.stringify(urls));
    await ctx.unrouteAll({ behavior: 'ignoreErrors' }); await ctx.close(); }
  await b.close(); })();
