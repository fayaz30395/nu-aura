import {chromium, newContext, watch, mkLog, FE, SS, sql, rec, PW, STATE, sleep} from './lib.mjs';
import fs from 'fs';
const b = await chromium.launch();
const log = mkLog();
const ctx = await newContext(b); const page = await ctx.newPage(); watch(page, log);
const api = [];
page.on('response', r => { if (/\/auth\/(login|logout)/.test(r.url()) && r.request().method()==='POST') api.push(`${r.status()} POST ${r.url().replace(/^https?:\/\/[^/]+/,'')}`); });
await page.goto(`${FE}/auth/login`, {waitUntil: 'domcontentloaded', timeout: 120000});
await page.locator('input[type=email]').fill('arun@nulogic.io');
await page.locator('input[type=password]').fill(PW);
await page.waitForFunction(() => { const b = document.querySelector('button[type=submit]'); return b && !b.disabled; }, null, {timeout: 60000});
await page.getByRole('button', {name: /sign in/i}).first().click();
await page.waitForURL(u => !/\/auth\/login/.test(u.toString()), {timeout: 90000});
await page.waitForLoadState('networkidle').catch(() => {});
await page.screenshot({path: `${SS}/NU-UI-001-employee-landing.png`});
const landing = page.url();
const names = (await ctx.cookies()).map(c => c.name);
const uiHdr = (await page.locator('[aria-label^="User menu"]').getAttribute('aria-label'));
// My Space pages
const mySpace = {};
for (const p of ['/me/dashboard', '/me/profile', '/me/payslips', '/me/leaves', '/me/attendance']) {
  const resp = await page.goto(FE + p, {waitUntil: 'domcontentloaded', timeout: 90000});
  await page.waitForLoadState('networkidle', {timeout: 20000}).catch(() => {});
  const h = await page.locator('h1').first().innerText().catch(() => '(no h1)');
  mySpace[p] = `${resp.status()} h1="${h}" url=${new URL(page.url()).pathname}`;
}
await page.screenshot({path: `${SS}/NU-UI-001-my-space.png`});
// app switcher = product rail
await page.goto(FE + '/me/dashboard', {waitUntil: 'domcontentloaded'}); await page.waitForLoadState('networkidle', {timeout: 20000}).catch(() => {});
const rail = page.locator('aside[aria-label="Product navigation"]');
const prods = await rail.locator('button').evaluateAll(els => els.map(e => e.getAttribute('aria-label') || e.title));
const switched = {};
for (const name of prods.filter(n => /hire|grow|fluence|hrms/i.test(n))) {
  await rail.locator(`button[aria-label="${name}"]`).click();
  await page.waitForTimeout(1500); await page.waitForLoadState('networkidle', {timeout: 15000}).catch(() => {});
  switched[name] = new URL(page.url()).pathname;
}
await page.screenshot({path: `${SS}/NU-UI-001-app-switch.png`});
// logout
await page.getByRole('button', {name: /user menu/i}).click();
await page.getByText('Sign out', {exact: true}).click();
await page.waitForURL(/login/, {timeout: 30000}).catch(() => {});
await page.waitForTimeout(1500);
const afterUrl = page.url();
const namesAfter = (await ctx.cookies()).filter(c => /access|refresh/i.test(c.name) && c.value).map(c => c.name);
await page.goto(FE + '/me/dashboard', {waitUntil: 'domcontentloaded'}).catch(() => {});
await page.waitForTimeout(2500);
const reentry = new URL(page.url()).pathname;
await page.screenshot({path: `${SS}/NU-UI-001-after-logout.png`});
// DB: last login evidence
let db = '';
try { db = sql("select count(*) from users where email='arun@nulogic.io'"); } catch (e) { db = 'err ' + String(e).slice(0, 100); }
console.log(JSON.stringify({landing, names, uiHdr, mySpace, prods, switched, afterUrl, namesAfter, reentry, api, db, log}, null, 1).slice(0, 4000));
fs.writeFileSync(STATE + '/j1.json', JSON.stringify({landing, mySpace, prods, switched, afterUrl, namesAfter, reentry, api, log}));
await b.close();
