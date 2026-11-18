import {sess, BE} from './verify-lib.mjs';
import fs from 'fs';
const s = await sess('verify_hr'); const {p} = s; const out = [];
const rec = (id, st, ev) => { out.push({id, st, ev}); console.log(`${id} | ${st} | ${ev}`); };
const RAW = /\{\s*"?type"?\s*:\s*"?doc/;
const http = []; p.on('response', r => { if (/edit-lock|knowledge|fluence/.test(r.url()) && r.status() >= 400) http.push(`${r.status()} ${r.request().method()} ${r.url().replace(/^https?:\/\/[^/]+/, '')}`); });
const lockResp = []; p.on('response', r => { if (/edit-lock/.test(r.url())) lockResp.push(`${r.status()} ${r.request().method()}`); });
// F-001 view
const pg0 = await (await s.ctx.request.get(BE + '/api/v1/knowledge/wiki/pages?size=10')).json();
const wp = pg0.content.find(x => /EDITED/.test(x.title)) || pg0.content[0];
const href = '/fluence/wiki/' + wp.id; await s.go(href, 3000);
let t = await p.evaluate(() => document.body.innerText);
rec('F-001', !RAW.test(t) && /wiki page|EDITED/i.test(t) ? 'PASS' : 'FAIL', `${href} view: rawJSON=${RAW.test(t)}; text sample="${t.replace(/\s+/g, ' ').slice(0, 250)}"`);
await p.screenshot({path: '/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/docs/release-readiness/evidence/screenshots/verify-F001.png'});
// F-002 edit + F-006 lock
lockResp.length = 0;
await s.go(href + '/edit', 4000);
const ed = await p.evaluate(() => ({ce: [...document.querySelectorAll('[contenteditable=true]')].map(e => e.innerText.slice(0, 100)), vals: [...document.querySelectorAll('input,textarea')].map(e => e.value).filter(Boolean).map(v => v.slice(0, 60))}));
const raw2 = RAW.test(JSON.stringify(ed)) || ed.ce.some(x => x.includes('"type"'));
rec('F-002', !raw2 && ed.ce.length ? 'PASS' : 'FAIL', `edit url=${p.url().replace(/^.*3000/, '')}; editor text=${JSON.stringify(ed.ce).slice(0, 120)} inputs=${JSON.stringify(ed.vals).slice(0, 100)}`);
await p.screenshot({path: '/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/docs/release-readiness/evidence/screenshots/verify-F002.png'});
rec('F-006', lockResp.length && !lockResp.some(x => x.startsWith('403')) ? 'PASS' : (lockResp.length ? 'FAIL' : 'INCONCLUSIVE'), `edit-lock calls from UI: ${lockResp.join(', ') || 'none'}`);
// F-006 direct api
const xs = await s.xsrf();
const pg = await (await s.ctx.request.get(BE + '/api/v1/knowledge/wiki/pages?size=5')).json();
const pid = pg.content?.[0]?.id;
const lr = await s.ctx.request.post(BE + `/api/v1/fluence/edit-lock/WIKI_PAGE/${pid}`, {headers: {'X-XSRF-TOKEN': xs}, data: {}}); 
console.log('lock api', lr.status(), (await lr.text()).slice(0, 150));
if (lr.status() < 300) await s.ctx.request.delete(BE + `/api/v1/fluence/edit-lock/WIKI_PAGE/${pid}`, {headers: {'X-XSRF-TOKEN': xs}});
fs.writeFileSync('/tmp/_f6', String(lr.status()));
// F-005 search
await s.go('/fluence/search', 1000);
const inp = p.locator('input').first(); await inp.fill('NUAURA_TEST'); await inp.press('Enter'); await p.waitForTimeout(3500);
t = await p.evaluate(() => (document.querySelector('main') || document.body).innerText.replace(/\s+/g, ' '));
rec('F-005', /NUAURA_TEST_P5_R2/.test(t) ? 'PASS' : 'FAIL', `search "NUAURA_TEST": ${t.slice(0, 200)}`);
await p.screenshot({path: '/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/docs/release-readiness/evidence/screenshots/verify-F005.png'});
console.log('http errs', http, s.log.console.slice(-4));
await s.b.close();
