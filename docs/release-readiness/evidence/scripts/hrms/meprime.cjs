// primes the /auth/me cache for a role that already has storageState
const L = require('./lib.cjs'); const fs = require('fs');
(async () => { const role = process.argv[2]; const b = await L.chromium.launch();
  for (let i = 0; i < 80; i++) { const ctx = await b.newContext({ storageState: L.stateFile(role) });
    const r = await ctx.request.get(L.BE + '/api/v1/auth/me'); if (r.status() === 200) { fs.writeFileSync(L.stateFile(role).replace('.json', '.me.json'), await r.body()); console.log(role, 'me cached'); await ctx.close(); break; }
    await ctx.close(); await new Promise(x => setTimeout(x, 11000 + Math.random() * 7000)); }
  await b.close(); })();
