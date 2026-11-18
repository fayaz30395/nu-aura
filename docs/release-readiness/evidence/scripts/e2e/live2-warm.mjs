import {chromium, newContext} from './lib.mjs';
import {staticRoutes} from './live2-helpers.mjs';
const b = await chromium.launch(); const ctx = await newContext(b, {role: 'hradmin'});
const routes = staticRoutes(); let i = 0, done = 0;
await Promise.all(Array.from({length: 6}, async () => { while (i < routes.length) { const r = routes[i++]; const p = await ctx.newPage(); await p.goto('http://localhost:3000' + r, {waitUntil: 'domcontentloaded', timeout: 240000}).catch(() => {}); await p.waitForTimeout(1500); await p.close(); done++; if (done % 20 === 0) console.log('warmed', done, '/', routes.length); } }));
console.log('warm done'); await b.close();
