import {chromium, newContext, BE, STATE} from './lib.mjs';
const [role, path] = process.argv.slice(2);
const b = await chromium.launch(); const c = await newContext(b, {role});
const r = await c.request.get(BE + path); const j = await r.json().catch(() => ({}));
console.log(r.status(), JSON.stringify((j.content || []).map(x => `${x.title}|${x.status}|${x.visibility}|author=${(x.createdBy || '').slice(0, 8)}`), null, 0));
await b.close();
