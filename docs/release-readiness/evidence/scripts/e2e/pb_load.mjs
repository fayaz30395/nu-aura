import fs from 'fs';
import {get} from './pb_lib.mjs';
import {EV} from './lib.mjs';
const STAGES = [10, 25]; const DUR = +(process.env.DUR || 60) * 1000; const THINK = 250;
const roles = ['employee', 'manager', 'hradmin', 'payroll', 'recruiter'];
const base = ['/api/v1/auth/me', '/api/v1/self-service/dashboard', '/api/v1/leave-requests?page=0&size=20', '/api/v1/knowledge/wiki/pages?page=0&size=20&sortBy=updatedAt&sortDirection=DESC', '/api/v1/leave-balances/employee/48000000-e001-0000-0000-000000000009'];
const mix = r => r === 'employee' ? base : [...base, '/api/v1/employees?page=0&size=20'];
const metric = async (m, tag) => { try { const j = await (await fetch(`http://localhost:8080/actuator/metrics/${m}${tag ? '?tag=' + tag : ''}`)).json(); return j.measurements[0].value; } catch { return null; } };
const snap = async () => ({heapMB: +((await metric('jvm.memory.used', 'area:heap')) / 1048576).toFixed(0), hikActive: await metric('hikaricp.connections.active'), hikPending: await metric('hikaricp.connections.pending'), threads: await metric('jvm.threads.live'), cpu: +(((await metric('process.cpu.usage')) || 0) * 100).toFixed(1)});
const health = async () => { try { const j = await (await fetch('http://localhost:8080/actuator/health')).json(); return j.components?.db?.status === 'UP' && j.components?.application?.status === 'UP'; } catch { return false; } };
const pct = (a, p) => a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : null;
const okMix = {}; for (const r of roles) { okMix[r] = []; for (const p of mix(r)) { const x = await get(r, p); if (x.s === 200) okMix[r].push(p); else console.log('excluded (preflight', x.s + '):', r, p.slice(0, 50)); } }
const results = [];
for (const N of STAGES) {
  const before = await snap(); const lat = []; const codes = {}; let total = 0, bad = 0, aborted = null; const peak = {heapMB: 0, hikActive: 0, cpu: 0}; const t0 = performance.now(); let stop = false;
  const worker = async i => { const role = roles[i % 5]; const m = okMix[role]; let k = i; while (!stop && performance.now() - t0 < DUR) { const x = await get(role, m[k++ % m.length]); total++; lat.push(x.ms); codes[x.s] = (codes[x.s] || 0) + 1; if (x.s !== 200) bad++; await new Promise(r => setTimeout(r, THINK * (0.5 + Math.random()))); } };
  const mon = setInterval(async () => { const s = await snap(); peak.heapMB = Math.max(peak.heapMB, s.heapMB); peak.hikActive = Math.max(peak.hikActive, s.hikActive || 0); peak.cpu = Math.max(peak.cpu, s.cpu); if (total > 200 && bad / total > 0.2) { stop = true; aborted = 'error rate >20%'; } if (!(await health())) { stop = true; aborted = 'BE unhealthy'; } }, 5000);
  await Promise.all(Array.from({length: N}, (_, i) => worker(i)));
  clearInterval(mon); const el = (performance.now() - t0) / 1000; const after = await snap(); lat.sort((a, b) => a - b);
  const r = {users: N, durationS: +el.toFixed(1), requests: total, rps: +(total / el).toFixed(1), p50: +pct(lat, 0.5).toFixed(1), p95: +pct(lat, 0.95).toFixed(1), p99: +pct(lat, 0.99).toFixed(1), max: +lat[lat.length - 1].toFixed(1), codes, non200Pct: +(100 * bad / total).toFixed(2), throttled429: codes[429] || 0, before, after, peak, aborted};
  results.push(r); console.log(JSON.stringify(r)); if (aborted) break; await new Promise(r => setTimeout(r, 8000));
}
fs.writeFileSync(`${EV}/logs/NU-OPS-PERF-load-results.json`, JSON.stringify({thinkTimeMs: THINK, results}, null, 1));
