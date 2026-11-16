import fs from 'fs';
import {STATE, BE} from './lib.mjs';
export const sessions = Object.fromEntries(['employee', 'manager', 'hradmin', 'payroll', 'recruiter'].map(r => {
  const st = JSON.parse(fs.readFileSync(`${STATE}/${r}.json`, 'utf8'));
  return [r, st.cookies.filter(c => /^(localhost|\.localhost)$/.test(c.domain)).map(c => `${c.name}=${c.value}`).join('; ')];
}));
export const get = async (role, path) => { const t = performance.now(); try { const r = await fetch(BE + path, {headers: {cookie: sessions[role]}}); await r.arrayBuffer(); return {s: r.status, ms: performance.now() - t, rl: r.headers.get('x-rate-limit-remaining')}; } catch (e) { return {s: 0, ms: performance.now() - t, err: String(e).slice(0, 80)}; } };
