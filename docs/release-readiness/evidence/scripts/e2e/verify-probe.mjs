import {sess} from './verify-lib.mjs';
const [role, ...routes] = process.argv.slice(2);
const s = await sess(role);
for (const r of routes) { await s.go(r); console.log('==', r, s.p.url()); console.log(await s.text()); console.log(JSON.stringify(await s.form())); }
await s.b.close();
