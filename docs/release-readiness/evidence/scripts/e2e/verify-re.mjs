import {sess, BE} from './verify-lib.mjs';
const rec = (id, st, ev) => console.log(`${id} | ${st} | ${ev}`);
const TS = Date.now().toString().slice(-6);
const s = await sess('verify_hr'); const {p} = s;
const me = await s.ctx.request.get(BE + '/api/v1/auth/me'); console.log('me', me.status());
// F-005
await s.go('/fluence/search', 1000);
const inp = p.locator('input').first(); await inp.fill('NUAURA_TEST'); await inp.press('Enter'); await p.waitForTimeout(3500);
let t = await p.evaluate(() => (document.querySelector('main') || document.body).innerText.replace(/\s+/g, ' '));
rec('F-005', /NUAURA_TEST/.test(t) && !/Something went wrong/.test(t) ? 'PASS' : 'FAIL', t.slice(0, 220));
// F-003
await s.go('/fluence/blogs/new', 1500);
await p.locator('input[name=title]').fill(`NUAURA_TEST_VERIFY blog ${TS}`);
await p.locator('textarea[name=excerpt]').fill('Verification excerpt for blog ' + TS);
await p.locator('[contenteditable=true]').first().click(); await p.keyboard.type('blog body ' + TS);
await p.getByPlaceholder('Select visibility').click().catch(()=>{}); await p.waitForTimeout(400); await p.locator('[role=option]').first().click().catch(()=>{});
s.mut.length = 0; await p.getByRole('button', {name: /Create Post/}).click(); await p.waitForTimeout(4000);
let m = s.mut.filter(x => /blogs/.test(x)); rec('F-003', m.some(x => /^20\d /.test(x)) ? 'PASS' : 'FAIL', m.join(' ; ').slice(0, 260) + ' url=' + p.url().replace(/^.*3000/, ''));
// F-004
await s.go('/fluence/templates/new', 1500);
await p.locator('textarea[name=name]').fill(`NUAURA_TEST_VERIFY tmpl ${TS}`);
await p.locator('[contenteditable=true]').first().click(); await p.keyboard.type('template body ' + TS);
s.mut.length = 0; await p.getByRole('button', {name: /Save Template/}).click(); await p.waitForTimeout(4000);
m = s.mut.filter(x => /templates/.test(x)); rec('F-004', m.some(x => /^20\d /.test(x)) ? 'PASS' : 'FAIL', m.join(' ; ').slice(0, 260) + ' url=' + p.url().replace(/^.*3000/, ''));
// G-003
await s.go('/surveys', 1500);
await p.getByRole('button', {name: 'Create Survey'}).first().click(); await p.waitForTimeout(800);
const d = '[role=dialog] ';
await p.locator(d + 'input[name=surveyCode]').fill('NUAURA_VERIFY_' + TS);
await p.locator(d + 'input[name=title]').fill('NUAURA_TEST_VERIFY survey ' + TS);
await p.locator(d + 'textarea[name=description]').fill('verify');
await p.locator(d + 'input[name=startDate]').fill('2026-11-18'); await p.locator(d + 'input[name=endDate]').fill('2026-12-31');
s.mut.length = 0; await p.locator(d + 'button[type=submit]').last().click(); await p.waitForTimeout(3500);
m = s.mut.filter(x => /survey/.test(x)); rec('G-003', m.some(x => /^20\d /.test(x)) ? 'PASS' : 'FAIL', m.join(' ; ').slice(0, 260));
await s.b.close();
