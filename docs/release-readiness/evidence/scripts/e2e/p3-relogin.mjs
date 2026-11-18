import {chromium, uiLogin} from './lib.mjs';
const b = await chromium.launch();
const r = await uiLogin(b, process.argv[2], process.argv[3]); console.log(r.url); await b.close();
