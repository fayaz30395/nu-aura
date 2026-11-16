const L = require('./lib.cjs');
(async () => {
  const b = await L.chromium.launch(); const ctx = await L.newCtx(b, "nt1"); const p = await ctx.newPage(); const B = L.bag(); L.collect(p, B);
  let cp = null; p.on('response', async r => { if (r.url().endsWith('/auth/change-password')) cp = r.status(); });
  await p.goto(L.FE + '/auth/change-password', { waitUntil: 'domcontentloaded' }); await p.waitForSelector('#confirmPassword', { timeout: 60000 }); await p.waitForTimeout(500);
  console.log('url', p.url().replace(L.FE, ''));
  const inputs = await p.$$eval('input', els => els.map(e => `${e.id}|${e.name}|${e.type}`)); console.log(inputs.join(' ; '));
  await p.fill('#currentPassword', process.env.HRMS_NEW_PW);
  // weak password validation
  await p.fill('#newPassword', 'weak'); await p.fill('#confirmPassword', 'weak');
  await p.click('button:has-text("Set new password")'); await p.waitForTimeout(800);
  console.log('weak ->', cp, (await p.innerText('body')).replace(/\s+/g, ' ').slice(0, 400));
  await p.screenshot({ path: `${L.EV}/screenshots/NU-HRMS-E2E-022-change-pw-weak.png` });
  await p.fill('#newPassword', process.env.HRMS_NEW_PW2); await p.fill('#confirmPassword', process.env.HRMS_NEW_PW2);
  for (let i = 0; i < 25; i++) { cp = null; await p.click('button:has-text("Set new password")'); await p.waitForTimeout(3500); console.log('attempt', i, 'cp', cp, p.url().replace(L.FE, '')); if (cp && cp !== 429) break; await p.waitForTimeout(13000); }
  await p.screenshot({ path: `${L.EV}/screenshots/NU-HRMS-E2E-023-after-change-pw.png` });
  console.log('final', p.url().replace(L.FE, ''), (await p.innerText('body')).replace(/\s+/g, ' ').slice(0, 300));
  await ctx.storageState({ path: L.stateFile('nt1') });
  console.log(JSON.stringify(B).slice(0, 500));
  await ctx.unrouteAll({ behavior: 'ignoreErrors' }); await b.close();
})();
