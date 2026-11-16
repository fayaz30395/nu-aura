const { chromium } = require('/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/frontend/node_modules/playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto('http://localhost:3000/auth/login', { waitUntil: 'networkidle' });
  console.log(p.url());
  const inputs = await p.$$eval('input,button', els => els.map(e => `${e.tagName} type=${e.type} name=${e.name} id=${e.id} ph=${e.placeholder} txt=${(e.innerText||'').slice(0,40)}`));
  console.log(inputs.join('\n'));
  await p.screenshot({ path: '../../screenshots/NU-HRMS-E2E-000-login-page.png' });
  await b.close();
})();
