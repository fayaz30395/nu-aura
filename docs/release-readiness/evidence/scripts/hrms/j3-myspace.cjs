// My Space reachable for EVERY demo role (UI) + API self endpoints
const L = require('./lib.cjs'); const fs = require('fs');
(async () => {
  const roles = ['hradmin', 'hrmgr', 'tadmin', 'mgr', 'tl', 'emp', 'emp2', 'saran', 'raj', 'fin', 'rec'];
  const b = await L.chromium.launch(); const res = {};
  for (const r of roles) {
    if (!fs.existsSync(L.stateFile(r))) { res[r] = 'NO_STATE'; continue; }
    const ctx = await L.newCtx(b, r); const p = await ctx.newPage(); const B = L.bag(); L.collect(p, B); const o = { pages: {} };
    for (const path of ['/me/dashboard', '/me/profile', '/me/attendance', '/me/leaves', '/me/documents']) {
      await p.goto(L.FE + path, { waitUntil: 'domcontentloaded' }).catch(() => {}); await p.waitForTimeout(3500);
      const t = (await p.innerText('body').catch(() => '')).replace(/\s+/g, ' ');
      o.pages[path] = { final: p.url().replace(L.FE, ''), blank: t.length < 60, len: t.length, err: /something went wrong|application error|unexpected error|denied/i.test(t) };
      if (path === '/me/dashboard') await p.screenshot({ path: `${L.EV}/screenshots/NU-HRMS-E2E-040-myspace-${r}.png` });
    }
    const me = await L.api(ctx, 'GET', '/api/v1/employees/me'); o.employeesMe = me.status; o.empId = me.body && me.body.id;
    o.bag = { console: [...new Set(B.console)].slice(0, 6), pageerrors: B.pageerrors, http: [...new Set(B.http)].slice(0, 10) };
    res[r] = o; console.log(r, JSON.stringify(Object.fromEntries(Object.entries(o.pages).map(([k, v]) => [k, v.final + (v.blank ? ' BLANK' : '') + (v.err ? ' ERR' : '')]))), 'emp/me', o.employeesMe);
    await ctx.unrouteAll({ behavior: 'ignoreErrors' }); await ctx.close();
  }
  fs.writeFileSync(`${L.EV}/logs/hrms/NU-HRMS-E2E-040-myspace-all-roles.json`, JSON.stringify(res, null, 1)); await b.close();
})();
