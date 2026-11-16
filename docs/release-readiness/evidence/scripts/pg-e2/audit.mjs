// NU-PG-E2 audit: 390px overflow + light/dark screenshots for learning/training. Run from frontend/.
import {chromium, uiLogin, FE, SS, STATE, sleep} from '../e2e/lib.mjs';
import fs from 'fs';
const ROUTES = ['/learning', '/learning/courses', '/learning/certificates', '/learning/paths', '/training', '/training/my-learning', '/training/catalog'];
const SHOT_DESK = new Set(['/learning', '/training', '/training/my-learning']);
const RUNS = [
  {tag: 'desk-light', w: 1440, h: 900, scheme: 'light'},
  {tag: 'desk-dark', w: 1440, h: 900, scheme: 'dark'},
  {tag: 'mob-light', w: 390, h: 844, scheme: 'light'},
];
const log = msg => console.log(new Date().toISOString().slice(11, 19), msg);
process.on('unhandledRejection', e => log('unhandled ' + String(e).slice(0, 120)));
const b = await chromium.launch();
await uiLogin(b, 'emp', 'arun@nulogic.io');
log('login done');
const out = [];
for (const run of RUNS) {
  const ctx = await b.newContext({viewport: {width: run.w, height: run.h}, colorScheme: run.scheme, storageState: `${STATE}/emp.json`});
  await ctx.route(/^http:\/\/backend:8080\//, route => route.continue({url: route.request().url().replace('http://backend:8080', 'http://localhost:8080')}).catch(() => {}));
  const page = await ctx.newPage();
  for (const r of ROUTES) {
    log(`nav ${r} ${run.tag}`);
    await page.goto(FE + r, {waitUntil: 'load', timeout: 60000}).catch(e => log('goto fail ' + e.message.slice(0, 80)));
    await page.waitForLoadState('networkidle', {timeout: 10000}).catch(() => {});
    await sleep(600);
    const info = await page.evaluate(() => ({
      path: location.pathname,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    })).catch(e => ({path: 'eval-fail', overflow: null}));
    out.push({route: r, run: run.tag, ...info});
    log(`res ${r} ${run.tag} ${JSON.stringify(info)}`);
    const wantShot = (run.tag !== 'mob-light' && SHOT_DESK.has(r)) || (run.tag === 'mob-light' && r === '/learning');
    if (wantShot) {
      const slug = r.replace(/^\//, '').replace(/\//g, '_');
      await page.screenshot({path: `${SS}/NU-PG-E2-${slug}-${run.tag}.png`, timeout: 30000}).catch(e => log('shot fail ' + e.message.slice(0, 80)));
    }
  }
  await ctx.close();
}
fs.writeFileSync(`${STATE}/pg-e2-audit.json`, JSON.stringify(out, null, 1));
log('DONE');
await b.close();
process.exit(0);
