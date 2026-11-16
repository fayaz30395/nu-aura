// UI checks after journey.cjs: each page must SHOW the NUAURA_TEST data created via API (not just load).
const { chromium, rewrite, newCtx, collect, bag, FE, EV } = require('./lib.cjs');
const fs = require('fs');
const st = JSON.parse(fs.readFileSync(`${EV}/logs/hire/state.json`, 'utf8'));
const OUT = `${EV}/logs/hire/ui-results.json`;
const SHOT = `${EV}/screenshots`;
const res = [];
(async () => {
  const browser = await chromium.launch();
  const check = async (id, role, url, mustContain, label, vp = { width: 1440, height: 900 }) => {
    const ctx = role ? await newCtx(browser, role, vp) : await (async () => { const c = await browser.newContext({ viewport: vp }); await rewrite(c); return c; })();
    const p = await ctx.newPage(); const b = bag(); collect(p, b);
    await p.goto(FE + url, { waitUntil: 'networkidle' }).catch(() => {});
    await p.waitForTimeout(2500);
    const body = await p.innerText('body').catch(() => '');
    const found = mustContain.filter(s => body.includes(s));
    await p.screenshot({ path: `${SHOT}/${id}.png`, fullPage: false });
    const row = { id, label, url, finalUrl: p.url().replace(FE, ''), role, expected: mustContain, found, console: b.console.slice(0, 3), http: b.http.slice(0, 5), status: found.length === mustContain.length ? 'PASS' : 'FAIL' };
    res.push(row); console.log(id, row.status, label, '->', row.finalUrl, 'found', found.length + '/' + mustContain.length, 'http', b.http.length, 'console', b.console.length);
    fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
    await ctx.close();
  };
  const T = st.TS;
  await check('NU-HIRE-UI-001-careers-public', null, '/careers', [`NUAURA_TEST_Engineer_${T}`], 'Public career page (unauth) lists published job');
  await check('NU-HIRE-UI-002-jobs', 'recadmin', '/recruitment/jobs', [`NUAURA_TEST_Engineer_${T}`], 'Recruiter job list shows opening');
  await check('NU-HIRE-UI-003-candidates', 'recadmin', '/recruitment/candidates', ['NUAURA_TEST_Alpha', 'NUAURA_TEST_Charlie'], 'Candidates list shows added candidates');
  await check('NU-HIRE-UI-004-pipeline', 'recadmin', '/recruitment/pipeline', ['NUAURA_TEST_Alpha'], 'Pipeline board shows Alpha');
  await check('NU-HIRE-UI-005-interviews', 'recadmin', '/recruitment/interviews', ['NUAURA_TEST'], 'Interviews page shows scheduled interview');
  await check('NU-HIRE-UI-006-agencies', 'recadmin', '/recruitment/agencies', [`NUAURA_TEST_Agency_${T}`], 'Agency list shows agency');
  await check('NU-HIRE-UI-007-scorecards-mgr', 'mgr', '/recruitment/scorecards', ['Scorecard'], 'Interviewer scorecards page loads');
  await check('NU-HIRE-UI-008-onboarding', 'hradmin', '/onboarding', ['NUAURA_TEST_Hire'], 'Onboarding list shows new hire');
  await check('NU-HIRE-UI-009-recruitment-emp-denied', 'emp', '/recruitment/candidates', ['NUAURA_TEST_Alpha'], 'EMPLOYEE must NOT see candidates in UI (PASS means data visible=FAIL, inverted below)');
  const last = res[res.length - 1]; last.status = last.found.length === 0 ? 'PASS' : 'FAIL'; fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
  await check('NU-HIRE-UI-010-careers-mobile', null, '/careers', [`NUAURA_TEST_Engineer_${T}`], 'Public career page at 390x844', { width: 390, height: 844 });
  await browser.close();
})();
