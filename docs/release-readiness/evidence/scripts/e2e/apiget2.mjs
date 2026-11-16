import {chromium, newContext, BE} from './lib.mjs';
const b = await chromium.launch(); const c = await newContext(b, {role: 'employee'});
const j = await (await c.request.get(BE + '/api/v1/knowledge/wiki/pages?page=0&size=50')).json();
const x = j.content.find(p => p.title === 'NUAURA_TEST_draft_private'); console.log(Object.keys(x).join(','), '\ncontent?', String(x.content).slice(0, 60), '| excerpt?', String(x.excerpt).slice(0, 60), '| creator', x.createdBy);
await b.close();
