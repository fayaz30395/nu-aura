// J1C: the new employee logs in through the real login UI (first login -> forced password change?). Env: HRMS_NEW_PW, HRMS_NEW_PW2
const L = require('./lib.cjs'); const fs = require('fs');
(async () => {
  const b = await L.chromium.launch(); const ctx = await L.newCtx(b, null); const p = await ctx.newPage(); const B = L.bag(); L.collect(p, B);
  let st = null; p.on('response', r => { if (r.url().endsWith('/auth/login') && r.request().method() === 'POST') st = r.status(); });
  for (let i = 0; i < 25; i++) {
    st = null; await p.goto(L.FE + '/auth/login', { waitUntil: 'domcontentloaded' }); await p.waitForSelector('#login-email');
    if (i === 0) await p.screenshot({ path: `${L.EV}/screenshots/NU-HRMS-E2E-020-login-initial.png` });
    await p.fill('#login-email', 'nuaura_test_hrms1@nulogic.io'); await p.fill('#login-password', process.env.HRMS_NEW_PW);
    await p.click('button[type=submit]:has-text("Sign in")'); await p.waitForTimeout(3500);
    console.log('attempt', i, 'login http', st, 'url', p.url().replace(L.FE, '')); if (st && st !== 429) break;
    await p.waitForTimeout(13000);
  }
  await p.screenshot({ path: `${L.EV}/screenshots/NU-HRMS-E2E-021-after-first-login.png` });
  console.log('body:', (await p.innerText('body')).replace(/\s+/g, ' ').slice(0, 500));
  console.log(JSON.stringify(B).slice(0, 800));
  await ctx.storageState({ path: L.stateFile('nt1') });
  await ctx.unrouteAll({ behavior: 'ignoreErrors' }); await b.close();
})();
