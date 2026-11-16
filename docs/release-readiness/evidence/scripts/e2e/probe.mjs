import {chromium, newContext, watch, mkLog, FE, SS} from './lib.mjs';
const [role, path] = process.argv.slice(2);
const b = await chromium.launch(); const c = await newContext(b, {role}); const p = await c.newPage(); const l = mkLog(); watch(p, l);
await p.goto(FE + path, {waitUntil: 'domcontentloaded', timeout: 120000}); await p.waitForLoadState('networkidle', {timeout: 30000}).catch(() => {});
await p.waitForTimeout(2000);
console.log(p.url()); await p.screenshot({path: `${SS}/probe-${role}.png`});
console.log((await p.locator('body').innerText()).slice(0, +(process.env.N||800))); console.log(JSON.stringify(l.http), l.console.filter(x=>!/WebSocket/.test(x)).slice(0,5));
await b.close();
