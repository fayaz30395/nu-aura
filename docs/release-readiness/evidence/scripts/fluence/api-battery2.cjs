// NU-FLUENCE API battery: roles, draft/private isolation, XSS storage, wall, blogs, templates, locks.
const L = require('./lib.cjs'); const fs = require('fs');
const OUT = L.EV + '/logs/fluence'; const R = {}; const log = [];
const short = (b) => (typeof b === 'string' ? b : JSON.stringify(b)).slice(0, 220);
async function call(c, who, m, p, body, tag) {
  const r = await L.api(c, m, p, body); log.push(`${who} ${m} ${p} -> ${r.status} ${short(r.body)}`);
  if (tag) R[tag] = { status: r.status, body: r.body }; return r;
}
const XSS = '<b>NUAURA_TEST_XSS</b> <img src=x> <a href="&#106;avascript:window.__xss=1">xl</a> <iframe srcdoc="&lt;script&gt;parent.__xss=1&lt;/script&gt;"></iframe>';
const doc = (t) => JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: t }] }] });
(async () => {
  const b = await L.chromium.launch(); const ctx = {};
  for (const [k, e] of Object.entries({ A: 'admin@nulogic.io', B: 'tenant.admin@nulogic.io', EMP: 'arun@nulogic.io', EMP2: 'anshuman@nulogic.io', MGR: 'sumit@nulogic.io', HRM: 'jagadeesh@nulogic.io', FIN: 'finance@nulogic.io' })) ctx[k] = await L.ctxFor(b, e);
  const W = '/api/v1/knowledge/wiki';
  // 1 role gate matrix
  const eps = ['/api/v1/wall/posts?size=3', '/api/v1/knowledge/wiki/spaces', '/api/v1/knowledge/wiki/pages?size=3', '/api/v1/knowledge/blogs?size=3', '/api/v1/knowledge/templates?size=3', '/api/v1/wall/posts?size=3', '/api/v1/knowledge/search/all?query=test', '/api/v1/fluence/search?query=test'];
  R.gates = {};
  for (const k of Object.keys(ctx)) { R.gates[k] = {}; for (const e of eps) R.gates[k][e] = (await call(ctx[k], k, 'GET', e)).status; }
  const sid = 'a437ab8f-28cf-4ba2-8f5d-c4569e308f8b'; const stamp = Date.now(); const CAN = 'NUAURA_TEST_CANARY_ZEBRA7731';
  R.createViaApi = {};
  const probe = await call(ctx.A, 'A', 'POST', W + '/pages', { spaceId: sid, title: 'NUAURA_TEST_apicreate', slug: 'nuaura-apicreate-' + stamp, content: doc('x'), visibility: 'ORGANIZATION', status: 'DRAFT' }, 'wikiCreateApi');
  R.createViaApi.wiki = probe.status;
  R.createViaApi.blog = (await call(ctx.A, 'A', 'POST', '/api/v1/knowledge/blogs', { title: 'NUAURA_TEST_apiblog', slug: 'nuaura-apiblog-' + stamp, content: doc('x'), visibility: 'ORGANIZATION', status: 'DRAFT' })).status;
  R.createViaApi.tpl = (await call(ctx.A, 'A', 'POST', '/api/v1/knowledge/templates', { name: 'NUAURA_TEST_apitpl', slug: 'nuaura-apitpl-' + stamp, category: 'GENERAL', content: doc('x') })).status;
  R.createViaApi.space = 'created earlier in run (201)';
  const lst = await call(ctx.A, 'A', 'GET', W + `/pages/space/${sid}/tree`);
  const byT = (t) => (Array.isArray(lst.body) ? lst.body : []).find(p => p.title === t);
  R.ids = { draft: (byT('NUAURA_TEST_draft_private') || {}).id, pubOrg: (byT('NUAURA_TEST_pub_org') || {}).id, priv2: (byT('NUAURA_TEST_private_published') || {}).id, orgDraft: (byT('NUAURA_TEST_org_draft') || {}).id };
  const id = (x) => x.body && x.body.id;
  // 3 B access to draft + private
  R.iso = {};
  for (const [n, pid] of [['draft', R.ids.draft], ['priv2', R.ids.priv2], ['pubOrg', R.ids.pubOrg]]) {
    for (const path of [`/pages/${pid}`, `/pages/${pid}/versions`, `/pages/${pid}/export`, `/pages/${pid}/related`, `/pages/${pid}/breadcrumbs`]) {
      for (const who of (path.endsWith('/export') ? ['B'] : ['B', 'EMP'])) R.iso[`${who} ${n} ${path.replace(pid, '{id}')}`] = (await call(ctx[who], who, 'GET', W + path)).status;
    }
  }
  // lists and searches as B
  const listB = await call(ctx.B, 'B', 'GET', `${W}/pages?size=200&sort=createdAt,desc`);
  const hits = (j) => JSON.stringify(j.body).includes(CAN) || JSON.stringify(j.body).includes('WOMBAT8842');
  R.listHasCanary = hits(listB);
  R.titleLeakList = (listB.body.content || []).filter(p => /NUAURA_TEST_(draft|private)/.test(p.title)).map(p => p.title);
  const spacePages = await call(ctx.B, 'B', 'GET', `${W}/pages/space/${sid}?size=200`);
  R.titleLeakSpace = (spacePages.body.content || []).filter(p => /NUAURA_TEST_(draft|private)/.test(p.title)).map(p => p.title);
  const tree = await call(ctx.B, 'B', 'GET', `${W}/pages/space/${sid}/tree`);
  R.treeAsB = (Array.isArray(tree.body)?tree.body:[]).map(p=>p.title+':'+p.status); R.titleLeakTree = /NUAURA_TEST_(draft|private)/.test(JSON.stringify(tree.body));
  R.search = {};
  for (const [n, u] of [['wikisearch', `${W}/pages/search?query=NUAURA_TEST_draft`], ['ksearch', '/api/v1/knowledge/search/wiki?query=NUAURA_TEST_draft'], ['kall', '/api/v1/knowledge/search/all?query=ZEBRA7731'], ['fsearch', '/api/v1/fluence/search?query=ZEBRA7731'], ['fsearch2', '/api/v1/fluence/search?query=WOMBAT8842'], ['kall2', '/api/v1/knowledge/search/all?query=NUAURA_TEST_private'], ['pubsearch', '/api/v1/knowledge/search/all?query=QUOKKA5519']]) {
    const r = await call(ctx.B, 'B', 'GET', u); R.search[n] = { status: r.status, leaksPrivate: /ZEBRA7731|WOMBAT8842|NUAURA_TEST_(draft_private|private_published)/.test(JSON.stringify(r.body)), foundPublished: /QUOKKA5519|NUAURA_TEST_pub_org/.test(JSON.stringify(r.body)) };
  }
  R.fluenceSearchBody = short((await call(ctx.B, 'B', 'GET', '/api/v1/fluence/search?query=QUOKKA5519')).body);
  // ID guess
  R.idGuess = {};
  R.idGuess.random = (await call(ctx.B, 'B', 'GET', `${W}/pages/00000000-0000-4000-8000-000000000001`)).status;
  R.idGuess.nonUuid = (await call(ctx.B, 'B', 'GET', `${W}/pages/not-a-uuid`)).status;
  // B write attempts on A's page
  R.bwrite = {
    update: (await call(ctx.B, 'B', 'PUT', `${W}/pages/${R.ids.pubOrg}`, { title: 'NUAURA_TEST_hijack' })).status,
    publishDraft: (await call(ctx.B, 'B', 'POST', `${W}/pages/${R.ids.draft}/publish`)).status,
    del: (await call(ctx.B, 'B', 'DELETE', `${W}/pages/${R.ids.draft}`)).status,
    archive: (await call(ctx.B, 'B', 'POST', `${W}/pages/${R.ids.pubOrg}/archive`)).status,
  };
  // comments (A on pub, B on draft, XSS comment)
  const FC = '/api/v1/fluence/comments/WIKI_PAGE';
  for (const ct of ['WIKI_PAGE', 'WIKI', 'PAGE']) { const r = await call(ctx.A, 'A', 'POST', `/api/v1/fluence/comments/${ct}/${R.ids.pubOrg}`, { content: 'NUAURA_TEST_comment A ' + ct }); R['cmt_' + ct] = r.status; if (r.status < 300) { R.cmtType = ct; break; } }
  const CT = R.cmtType || 'WIKI_PAGE';
  await call(ctx.B, 'B', 'POST', `/api/v1/fluence/comments/${CT}/${R.ids.pubOrg}`, { content: 'NUAURA_TEST_comment B ' + XSS }, 'cmtB_xss');
  R.cmtOnDraftByB = (await call(ctx.B, 'B', 'POST', `/api/v1/fluence/comments/${CT}/${R.ids.draft}`, { content: 'NUAURA_TEST_B probes draft' })).status;
  R.cmtReadDraftByB = (await call(ctx.B, 'B', 'GET', `/api/v1/fluence/comments/${CT}/${R.ids.draft}`)).status;
  await call(ctx.A, 'A', 'POST', `/api/v1/fluence/comments/${CT}/${R.ids.draft}`, { content: 'NUAURA_TEST_A own draft comment SECRETCMT4410' });
  R.cmtReadDraftByB_body = short((await call(ctx.B, 'B', 'GET', `/api/v1/fluence/comments/${CT}/${R.ids.draft}`)).body);
  // engagement
  R.like = (await call(ctx.B, 'B', 'POST', `/api/v1/fluence/engagement/likes/wiki/${R.ids.pubOrg}`)).status;
  R.likeDraftByB = (await call(ctx.B, 'B', 'POST', `/api/v1/fluence/engagement/likes/wiki/${R.ids.draft}`)).status;
  // edit lock
  R.lockA = (await call(ctx.A, 'A', 'POST', `/api/v1/fluence/edit-lock/WIKI_PAGE/${R.ids.pubOrg}`, undefined, 'lockA')).status;
  R.lockB = (await call(ctx.B, 'B', 'POST', `/api/v1/fluence/edit-lock/WIKI_PAGE/${R.ids.pubOrg}`, undefined, 'lockB')).status;
  R.lockGetB = short((await call(ctx.B, 'B', 'GET', `/api/v1/fluence/edit-lock/WIKI_PAGE/${R.ids.pubOrg}`)).body);
  R.lockDelByB = (await call(ctx.B, 'B', 'DELETE', `/api/v1/fluence/edit-lock/WIKI_PAGE/${R.ids.pubOrg}`)).status;
  R.lockStillHeld = short((await call(ctx.A, 'A', 'GET', `/api/v1/fluence/edit-lock/WIKI_PAGE/${R.ids.pubOrg}`)).body);
  R.lockBHeartbeat = (await call(ctx.B, 'B', 'PUT', `/api/v1/fluence/edit-lock/WIKI_PAGE/${R.ids.pubOrg}/heartbeat`)).status;
  await call(ctx.A, 'A', 'DELETE', `/api/v1/fluence/edit-lock/WIKI_PAGE/${R.ids.pubOrg}`);
  R.lockBAfter = (await call(ctx.B, 'B', 'POST', `/api/v1/fluence/edit-lock/WIKI_PAGE/${R.ids.pubOrg}`)).status;
  await call(ctx.B, 'B', 'DELETE', `/api/v1/fluence/edit-lock/WIKI_PAGE/${R.ids.pubOrg}`);
  // blogs
  const bll = await call(ctx.A, 'A', 'GET', '/api/v1/knowledge/blogs?size=100'); R.blogListStatusA = bll.status; R.blogListTitlesA = (bll.body.content||[]).map(p=>p.title+':'+p.status);
  const bt = (t) => (bll.body.content || []).find(p => p.title === t) || {};
  R.blogId = bt('NUAURA_TEST_blog_draft').id; R.blogPubId = bt('NUAURA_TEST_blog_pub').id;
  R.blogDraftByB = (await call(ctx.B, 'B', 'GET', `/api/v1/knowledge/blogs/${R.blogId}`)).status;
  R.blogDraftInListB = /NUAURA_TEST_blog_draft/.test(JSON.stringify((await call(ctx.B, 'B', 'GET', '/api/v1/knowledge/blogs?size=200')).body));
  R.blogSearchDraftB = /LLAMA6603/.test(JSON.stringify((await call(ctx.B, 'B', 'GET', '/api/v1/knowledge/search/blog?query=LLAMA6603')).body));
  R.blogSearchPubB = /HERON3308/.test(JSON.stringify((await call(ctx.B, 'B', 'GET', '/api/v1/knowledge/search/blog?query=HERON3308')).body));
  R.blogPubByB = (await call(ctx.B, 'B', 'GET', `/api/v1/knowledge/blogs/${R.blogPubId}`)).status;
  R.blogUpdByB = (await call(ctx.B, 'B', 'PUT', `/api/v1/knowledge/blogs/${R.blogPubId}`, { title: 'NUAURA_TEST_hijack' })).status;
  R.blogPublishViaApi = (await call(ctx.A, 'A', 'POST', `/api/v1/knowledge/blogs/${R.blogId}/publish`)).status;
  // templates list
  const tl = await call(ctx.B, 'B', 'GET', '/api/v1/knowledge/templates?size=50'); R.tplVisibleToB = /NUAURA_TEST_template/.test(JSON.stringify(tl.body));
  fs.writeFileSync(OUT + '/api-battery2-results.json', JSON.stringify(R, null, 1));
  fs.writeFileSync(OUT + '/api-battery2-transcript.txt', log.join('\n'));
  console.log(JSON.stringify(R, null, 0).slice(0, 6000));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
