// Live verify for DEF-E2E-01/02/07. Roles: hradmin, employee (saved storage states). No slug in payload, as the UI sends.
import {chromium, newContext, BE, sql} from './lib.mjs';
const b = await chromium.launch();
const hrc = await newContext(b, {role: 'hradmin'}); const hr = hrc.request;
const xsrf = (await hrc.storageState()).cookies.find(c => c.name === 'XSRF-TOKEN').value;
const emp = (await newContext(b, {role: 'employee'})).request;
const T = 'NUAURA_TEST_FIX_' + Date.now().toString().slice(-6);
const spaces = await (await hr.get(BE + '/api/v1/knowledge/wiki/spaces?size=50')).json();
const sp = (spaces.content || spaces).find(s => /NUAURA_TEST/.test(s.name)) || (spaces.content || spaces)[0];
const content = JSON.stringify({type: 'doc', content: [{type: 'paragraph', content: [{type: 'text', text: 'x'}]}]});
const mk = async (title, visibility) => {
  const r = await hr.post(BE + '/api/v1/knowledge/wiki/pages', {headers: {'X-XSRF-TOKEN': xsrf}, data: {title, spaceId: sp.id, visibility, content, status: 'DRAFT'}});
  const j = await r.json().catch(() => ({})); return {status: r.status(), id: j.id, slug: j.slug};
};
const priv = await mk(T + ' private', 'PRIVATE'), dup1 = await mk(T + ' same', 'PUBLIC'), dup2 = await mk(T + ' same', 'PUBLIC');
console.log('create no-slug', priv, dup1, dup2);
const list = await (await emp.get(BE + '/api/v1/knowledge/wiki/pages?page=0&size=200')).json();
const foreign = (list.content || []).filter(x => x.status !== 'PUBLISHED' || x.visibility === 'PRIVATE').filter(x => x.createdBy !== undefined);
console.log('employee list total', list.totalElements, 'non-published/private visible:', foreign.length, 'test pages visible:', (list.content || []).filter(x => x.title.startsWith(T)).length);
const det = await emp.get(BE + `/api/v1/knowledge/wiki/pages/${priv.id}`); console.log('employee GET private by id ->', det.status());
const hrList = await (await hr.get(BE + '/api/v1/knowledge/wiki/pages?page=0&size=200')).json();
console.log('hradmin list sees own test pages:', (hrList.content || []).filter(x => x.title.startsWith(T)).length);
const hrSearch = await (await hr.get(BE + `/api/v1/knowledge/wiki/pages/search?query=${T}`)).json().catch(() => ({}));
console.log('hradmin search own drafts:', hrSearch.totalElements);
const empSpace = await (await emp.get(BE + `/api/v1/knowledge/wiki/pages/space/${sp.id}?size=200`)).json();
console.log('employee space list non-published visible:', (empSpace.content || []).filter(x => x.status !== 'PUBLISHED').length);
await b.close();
