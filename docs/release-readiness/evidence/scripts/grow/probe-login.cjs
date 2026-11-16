const L = require('./lib.cjs');
(async () => {
  const b = await L.chromium.launch(); const p = await (await b.newContext()).newPage();
  p.on('request', r => { if (r.method()!=='GET') console.log('REQ', r.method(), r.url()); });
  p.on('response', r => { if (/auth\/login/.test(r.url()) && r.request().method()==='POST') console.log('RES', r.status(), r.url()); });
  await p.goto(L.FE + '/auth/login', { waitUntil: 'networkidle' });
  console.log(await p.$$eval('button', e=>e.map(x=>x.innerText.trim()+'|'+x.type)));
  await p.fill('#login-email', 'jagadeesh@nulogic.io'); await p.fill('#login-password', process.env.DEMO_PW);
  await p.click('button[type=submit]:has-text("Sign in")'); await p.waitForTimeout(5000);
  console.log(p.url());
  await b.close();
})();
