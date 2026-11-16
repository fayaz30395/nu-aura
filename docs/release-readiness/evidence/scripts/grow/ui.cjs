// NU-GROW-E2E-180..: UI render checks with data + console errors (supplement to API journeys)
const L = require('./lib.cjs'); const SS = L.EV + '/screenshots/';
const jobs = [
  ['NU-GROW-E2E-180', 'arun', '/performance/reviews', 'NUAURA_TEST', 'Employee sees own NUAURA_TEST review items in My Reviews'],
  ['NU-GROW-E2E-181', 'jagadeesh', '/performance/cycles', 'NUAURA_TEST_Cycle_B', 'HR sees completed/active test cycles with status chips'],
  ['NU-GROW-E2E-182', 'sumit', '/okr', 'NUAURA_TEST_OKR', 'Manager sees own OKR objective in /okr'],
  ['NU-GROW-E2E-183', 'arun', '/learning', 'Workplace Security', 'Employee sees enrolled course in learning dashboard'],
  ['NU-GROW-E2E-184', 'arun', '/wellness', 'NUAURA_TEST_Wellness', 'Employee sees wellness program/challenge'],
  ['NU-GROW-E2E-185', 'arun', '/feedback360', 'NUAURA_TEST_360', 'Employee 360 page shows pending/own 360 data (none expected: nominations blocked)'],
  ['NU-GROW-E2E-186', 'arun', '/performance/calibration', 'xxxx-none', 'Employee must be denied calibration page (UI denial)'],
];
(async () => {
  const b = await L.chromium.launch(); const ctxs = {};
  for (const [id, who, url, needle, sc] of jobs) {
    ctxs[who] = ctxs[who] || await L.newCtx(b, who + '@nulogic.io'); const p = await ctxs[who].newPage(); const cons = [];
    p.on('console', m => m.type() === 'error' && !/backend:8080\/ws|WebSocket|Framing|CSP|Content Security/.test(m.text()) && cons.push(m.text().slice(0, 160)));
    L.net.length = 0;
    const ok = await L.gotoAuthed(p, url); await p.waitForTimeout(2500);
    const txt = (await p.innerText('body').catch(() => '')) || ''; const fin = p.url().replace(L.FE, '');
    await p.screenshot({ path: SS + id + '.png' });
    const found = txt.includes(needle); if (!found) L.fs.writeFileSync(L.EV + '/logs/grow/' + id + '-body.txt', txt.slice(0, 1500)); const denied = /denied|not authorized|permission|forbidden/i.test(txt) || fin !== url;
    const http = L.net.filter(x => /^(4|5)/.test(x)).slice(0, 3).join(' | ');
    if (id.endsWith('186')) L.rec(id, sc, ok && denied ? 'PASS' : 'FAIL', `finalUrl=${fin} denied=${denied} apiErrors=${http}`);
    else L.rec(id, sc, ok && found ? 'PASS' : (ok ? 'FAIL' : 'BLOCKED'), `finalUrl=${fin} needleFound=${found} consoleErrors=${cons.length}${cons[0] ? ' first=' + cons[0] : ''} apiErrors=${http}`);
    await p.close();
  }
  await b.close(); L.save('ui');
})();
