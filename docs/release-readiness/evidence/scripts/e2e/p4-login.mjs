import {chromium, uiLogin} from './lib.mjs';
const m = {p4emp:'arun@nulogic.io', p4manager:'sumit@nulogic.io', p4hradmin:'admin@nulogic.io'};
const b = await chromium.launch();
for (const role of (process.argv[2] || 'p4emp,p4manager,p4hradmin').split(',')) { const r = await uiLogin(b, role, m[role]); console.log(role, r.url); }
await b.close();
