// Usage: HRMS_DEMO_PW=... node login.cjs role=email ...   (one UI login per role, saves storageState)
const { chromium, FE, stateFile, EV, proxyBackend } = require('./lib.cjs');
(async () => {
  const b = await chromium.launch();
  for (const arg of process.argv.slice(2)) {
    const [role, email] = arg.split('=');
    for (let attempt = 0; attempt < 30; attempt++) {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); await proxyBackend(ctx);
    const p = await ctx.newPage();
    let loginStatus = null;
    p.on('response', r => { if (r.url().endsWith('/auth/login') && r.request().method()==='POST') loginStatus = r.status(); });
    await p.goto(FE + '/auth/login', { waitUntil: 'networkidle' });
    await p.fill('#login-email', email); await p.fill('#login-password', process.env.HRMS_DEMO_PW);
    await p.click('button[type=submit]:has-text("Sign in")');
    await p.waitForTimeout(4000);
    console.log(role, email, 'loginHttp=', loginStatus, 'url=', p.url().replace(FE, ''));
    if (loginStatus === 200) await ctx.storageState({ path: stateFile(role) });
    await ctx.unrouteAll({ behavior: 'ignoreErrors' }); await ctx.close();
    if (loginStatus !== 429) break;
    await new Promise(r => setTimeout(r, 62000 + Math.floor(Math.random()*20000))); }
    await new Promise(r => setTimeout(r, 14000));
  }
  await b.close();
})();
