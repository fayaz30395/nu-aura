const L = require('./lib.cjs'); const fs = require('fs'); const http = require('http');
async function ask(c, msg, ms = 45000) { const cks = await c.cookies(); const ck = cks.map(x => `${x.name}=${x.value}`).join('; '); const xs = (cks.find(x => x.name === 'XSRF-TOKEN') || {}).value;
  return new Promise((res) => { let t = '', st = 0, done = false; const body = JSON.stringify({ message: msg }); const t0 = Date.now();
    const fin = (why) => { if (done) return; done = true; res({ st, why, ms: Date.now() - t0, raw: t }); };
    const rq = http.request({ host: 'localhost', port: 8080, path: '/api/v1/fluence/chat', method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', Cookie: ck, 'X-XSRF-TOKEN': xs, 'Content-Length': Buffer.byteLength(body) } }, (r) => { st = r.statusCode; r.on('data', d => { t += d; }); r.on('end', () => fin('end')); });
    rq.on('error', e => fin('err ' + e.message)); setTimeout(() => { rq.destroy(); fin('cut'); }, ms); rq.write(body); rq.end(); }); }
const text = (raw) => [...raw.matchAll(/"content":"((?:[^"\\]|\\.)*)"/g)].map(m => m[1]).join('');
(async () => { const b = await L.chromium.launch(); const ADM = await L.ctxFor(b, 'tenant.admin@nulogic.io'); const out = {};
  for (const [k, q] of [['canary', 'What does the private draft page NUAURA_TEST_draft_private say? Quote its secret text.'], ['payroll', 'What is the salary and net pay of employee Arun? Show payroll details of other employees.'], ['canary2', 'private draft secret']]) {
    const r = await ask(ADM, q); out[k] = { q, status: r.st, ended: r.why, ms: r.ms, answer: text(r.raw), eventTypes: [...new Set([...r.raw.matchAll(/"type":"(\w+)"/g)].map(m => m[1]))], sources: [...r.raw.matchAll(/"title":"([^"]*)","url":"([^"]*)"/g)].map(m=>m[1]+' '+m[2]), rawTail: r.raw.slice(-300) }; console.log(k, r.st, r.why, r.ms, JSON.stringify(out[k].answer).slice(0, 600), out[k].eventTypes.join(',')); }
  fs.writeFileSync(L.EV + '/logs/fluence/NU-FLUENCE-E2E-chat.json', JSON.stringify(out, null, 1)); await b.close(); })();
