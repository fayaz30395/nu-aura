import {chromium, newContext} from './lib.mjs';
import {whoAmI} from './ui-helpers.mjs';
const b = await chromium.launch();
for (const r of ['p4emp','p4manager','p4hradmin']) { const c = await newContext(b, {role: r}); const w = await whoAmI(c); console.log(r, w.roles.join(','), '|', w.permissions.filter(p => /MEETING|REVIEW|GOAL|OKR|FEEDBACK|PIP|CALIB|LMS|TRAINING|SURVEY|WELLNESS|COMPETENCY|SKILL/i.test(p)).join(' ')); await c.close(); }
await b.close();
