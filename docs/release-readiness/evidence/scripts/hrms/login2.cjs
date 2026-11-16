// API login (1 AUTH-bucket token per attempt) -> storageState + cached /auth/me. Retries every ~13s on 429.
// Usage: HRMS_DEMO_PW=... node login2.cjs role=email ...
const { chromium, BE, stateFile } = require('./lib.cjs');
const fs = require('fs');
(async () => {
  const b = await chromium.launch();
  for (const arg of process.argv.slice(2)) {
    const [role, email] = arg.split('=');
    for (let i = 0; i < 80; i++) {
      const ctx = await b.newContext();
      const r = await ctx.request.post(BE + '/api/v1/auth/login', { data: { email, password: process.env.HRMS_DEMO_PW }, headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000' } });
      if (r.status() === 200) {
        await ctx.storageState({ path: stateFile(role) });
        const me = await ctx.request.get(BE + '/api/v1/auth/me'); // may 429; cache only if ok
        if (me.status() === 200) fs.writeFileSync(stateFile(role).replace('.json', '.me.json'), await me.body());
        console.log(role, email, 'login=200 me=' + me.status()); await ctx.close(); break;
      }
      console.log(role, email, 'login=' + r.status(), 'try', i); await ctx.close();
      await new Promise(x => setTimeout(x, 12000 + Math.random() * 6000));
    }
  }
  await b.close();
})();
