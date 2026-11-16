// Usage: HIRE_DEMO_PW=... node login.cjs role=email ...   (one UI login per role, saves storageState)
const { rewrite, chromium, FE, stateFile, EV } = require('./lib.cjs');
(async () => {
  const b = await chromium.launch();
  for (const arg of process.argv.slice(2)) {
    const [role, email] = arg.split('=');
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
    await rewrite(ctx); const p = await ctx.newPage();
    let loginStatus = null;
    p.on('response', r => { if (r.url().endsWith('/api/v1/auth/login')) loginStatus = r.status(); });
    await p.goto(FE + '/auth/login', { waitUntil: 'networkidle' });
    await p.fill('#login-email', email); await p.fill('#login-password', process.env.HIRE_DEMO_PW);
    await p.click('button[type=submit]:has-text("Sign in")');
    await p.waitForTimeout(4000);
    console.log(role, email, 'loginHttp=', loginStatus, 'url=', p.url().replace(FE, ''));
    if (loginStatus === 200) await ctx.storageState({ path: stateFile(role) });
    await ctx.close();
    await new Promise(r => setTimeout(r, 3000));
  }
  await b.close();
})();
