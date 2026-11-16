const L = require('./lib.cjs'); const fs = require('fs'); const SS = L.EV + '/screenshots/fluence/'; const R = {};
async function visit(ctx, id, url, act) {
  const p = await ctx.newPage(); const bag = L.newBag(); L.collect(p, bag);
  await p.goto(L.FE + url, { waitUntil: 'domcontentloaded' }).catch(e => bag.console.push('nav ' + e.message.slice(0, 100)));
  await p.waitForTimeout(3500); let extra = {}; try { if (act) extra = (await act(p)) || {}; } catch (e) { extra.actErr = e.message.slice(0, 160); }
  await p.waitForTimeout(1500); await p.screenshot({ path: `${SS}${id}.png`, fullPage: false });
  const txt = (await p.innerText('body').catch(() => '')).replace(/\s+/g, ' ');
  const xss = await p.evaluate(() => ({ xssFlag: window.__xss, imgs: document.querySelectorAll('img[src="x"]').length, iframes: document.querySelectorAll('iframe[srcdoc]').length, jsLinks: [...document.querySelectorAll('a')].filter(a => /^javascript:/i.test(a.getAttribute('href') || '')).length })).catch(() => ({}));
  R[id] = { url: p.url().replace(L.FE, ''), http: bag.http.slice(0, 8), console: bag.console.slice(0, 4), pageerrors: bag.pageerrors.slice(0, 3), xss, text: txt.slice(0, 380), ...extra };
  console.log(id, JSON.stringify(R[id]).slice(0, 700)); await p.close();
}
(async () => {
  const b = await L.chromium.launch(); const ADM = await L.ctxFor(b, 'tenant.admin@nulogic.io'), EMP = await L.ctxFor(b, 'arun@nulogic.io'), T1 = await L.ctxFor(b, 'dhanush@nulogic.io');
  const P = 'NU-FLUENCE-E2E-';
  await visit(EMP, P + 'U01-employee-wiki', '/fluence/wiki');
  await visit(EMP, P + 'U02-employee-aichat', '/fluence/ai-chat', async p => { const t = p.locator('textarea[aria-label="Chat message"]'); if (await t.count()) { await t.fill('hello'); await p.keyboard.press('Enter'); await p.waitForTimeout(4000); } return { chatBox: await t.count() }; });
  await visit(ADM, P + 'U03-admin-wiki-create-draft', '/fluence/wiki/new', async p => {
    await p.fill('[aria-label="Page title"]', 'NUAURA_TEST_ui_draft'); await p.click('[contenteditable=true]').catch(() => {}); await p.keyboard.type('NUAURA_TEST_UI body text');
    const resp = []; p.on('response', r => { if (r.url().includes('/knowledge/wiki/pages') && r.request().method() === 'POST') resp.push(r.status()); });
    await p.getByRole('button', { name: /Save Draft/ }).click(); await p.waitForTimeout(3500);
    return { postCodes: resp, toast: (await p.innerText('body')).match(/(failed|error|saved|created)[^.]{0,60}/i)?.[0] }; });
  await visit(ADM, P + 'U04-admin-wiki-list', '/fluence/wiki');
  await visit(ADM, P + 'U05-admin-search-private', '/fluence/search', async p => { await p.fill('[aria-label="Search NU-Fluence"]', 'private'); await p.keyboard.press('Enter'); await p.waitForTimeout(3500); return { leakedTitles: /NUAURA_TEST_draft_private/.test(await p.innerText('body')) }; });
  await visit(ADM, P + 'U06-admin-aichat', '/fluence/ai-chat', async p => { const t = p.locator('textarea[aria-label="Chat message"]'); await t.fill('What does the private draft page say?'); await p.keyboard.press('Enter'); await p.waitForTimeout(9000); return { sourcesShown: /NUAURA_TEST_draft_private/.test(await p.innerText('body')) }; });
  await visit(ADM, P + 'U07-admin-blogs', '/fluence/blogs');
  await visit(ADM, P + 'U08-admin-templates', '/fluence/templates');
  await visit(ADM, P + 'U09-admin-wiki-draft-direct', '/fluence/wiki/nuaura-test-draft-private');
  await visit(T1, P + 'U10-wall-xss-render', '/wall');
  await visit(ADM, P + 'U11-fluence-wall', '/fluence/wall');
  fs.writeFileSync(L.EV + '/logs/fluence/ui-results.json', JSON.stringify(R, null, 1)); await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
