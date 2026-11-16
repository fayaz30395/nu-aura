// UI journeys: wiki create via drawer (space pick) and wall post/react/comment through UI.
const L = require('./lib.cjs'); const fs = require('fs'); const SS = L.EV + '/screenshots/fluence/'; const R = {};
function watch(p, bag) { L.collect(p, bag); p.on('response', r => { if (r.request().method() !== 'GET' && r.url().includes('/api/')) bag.writes.push(`${r.status()} ${r.request().method()} ${r.url().replace('http://backend:8080', '').replace(L.BE, '')}`); }); }
(async () => {
  const b = await L.chromium.launch(); const ADM = await L.ctxFor(b, 'tenant.admin@nulogic.io'), T = await L.ctxFor(b, 'dhanush@nulogic.io');
  // wiki create through drawer
  { const p = await ADM.newPage(); const bag = L.newBag(); bag.writes = []; watch(p, bag);
    await p.goto(L.FE + '/fluence/wiki/new', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3000);
    await p.fill('[aria-label="Page title"]', 'NUAURA_TEST_ui_article'); await p.click('[contenteditable=true]'); await p.keyboard.type('NUAURA_TEST_UI article body');
    await p.getByRole('button', { name: /Save Draft/ }).click(); await p.waitForTimeout(2500);
    const afterSave = { writes: [...bag.writes], bodyHint: (await p.innerText('body')).match(/(select a space|failed|error|saved|required)[^\n]{0,60}/i)?.[0] };
    await p.screenshot({ path: SS + 'NU-FLUENCE-E2E-U12-wiki-save-draft.png' });
    await p.getByRole('button', { name: /^Publish$/ }).first().click().catch(() => {}); await p.waitForTimeout(1500);
    let optSeen = 0; const sel = p.locator('select').first(); if (await sel.count()) { optSeen = 1; await sel.selectOption({ label: 'NUAURA_TEST_space' }).catch(async () => { optSeen = -1; }); }
    else { const combo = p.getByRole('combobox').first(); await combo.click().catch(() => {}); await p.waitForTimeout(800); const opt = p.getByRole('option', { name: /NUAURA_TEST_space/ }).first(); optSeen = await opt.count(); await opt.click().catch(() => {}); }
    await p.getByRole('button', { name: /Publish Page/ }).click().catch(() => {}); await p.waitForTimeout(3500);
    await p.screenshot({ path: SS + 'NU-FLUENCE-E2E-U13-wiki-publish-drawer.png' });
    R.wikiCreate = { selectCount: await p.locator('select').count(), afterSave, optSeen, writesAfterPublish: bag.writes, http: bag.http.slice(0, 5), console: bag.console.slice(0, 3), url: p.url().replace(L.FE, ''), toast: (await p.innerText('body')).match(/(failed|error|unable|could not)[^\n]{0,80}/i)?.[0] };
    console.log(JSON.stringify(R.wikiCreate)); await p.close(); }
  // wall via UI
  { const p = await T.newPage(); const bag = L.newBag(); bag.writes = []; watch(p, bag);
    await p.goto(L.FE + '/fluence/wall', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(3500);
    const msg = 'NUAURA_TEST_UI_wall_' + Date.now();
    await p.getByPlaceholder('Write something...').fill(msg); await p.locator('form button[type=submit]').click(); await p.waitForTimeout(3000);
    const card = p.locator('div', { hasText: msg }).last(); const visible = await p.getByText(msg).count();
    await p.screenshot({ path: SS + 'NU-FLUENCE-E2E-U14-wall-ui-post.png' });
    R.wallUi = { posted: visible > 0, writes: [...bag.writes], http: bag.http.slice(0, 5), msg };
    // react + comment on my post
    const post = p.locator('article, [class*=card]', { hasText: msg }).first();
    await post.locator('button').filter({ hasText: /^$/ }).first().click().catch(() => {});
    const body = await p.innerText('body'); R.wallUi.bodyHasMsg = body.includes(msg);
    console.log(JSON.stringify(R.wallUi)); await p.close(); }
  fs.writeFileSync(L.EV + '/logs/fluence/ui2-results.json', JSON.stringify(R, null, 1)); await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
