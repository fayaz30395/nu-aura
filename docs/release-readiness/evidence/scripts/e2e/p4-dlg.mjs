// usage: node p4-dlg.mjs <role> <route> <button regex> -> opens dialog, dumps fields; optional SUBMIT=1 clicks submit empty
import {chromium, newContext, FE, sleep} from './lib.mjs';
const [role, route, btn] = process.argv.slice(2);
const b = await chromium.launch(); const ctx = await newContext(b, {role}); const p = await ctx.newPage();
const http = []; p.on('response', r => { if (r.status() >= 400 && /\/api\//.test(r.url())) http.push(`${r.status()} ${r.request().method()} ${r.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 80)}`); });
await p.goto(FE + route, {waitUntil: 'domcontentloaded'}); await p.waitForLoadState('networkidle', {timeout: 20000}).catch(() => {}); await sleep(1500);
await p.getByRole('button', {name: new RegExp(btn, 'i')}).first().click();
await sleep(1200);
const dump = () => p.evaluate(() => { const d = document.querySelector('[role=dialog]') || document.querySelector('form'); if (!d) return 'NO DIALOG'; return [...d.querySelectorAll('input,select,textarea,button')].map(e => `${e.tagName[0]}${e.type ? '/' + e.type : ''}:${(e.getAttribute('aria-label') || e.name || e.placeholder || e.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 30)}${e.required ? '*' : ''}${e.disabled ? '(dis)' : ''}`).join(' | ') + ' || TEXT: ' + d.innerText.replace(/\s+/g, ' ').slice(0, 300); });
console.log(await dump());
if (process.env.SUBMIT) { await p.locator('[role=dialog] button[type=submit], [role=dialog] button:has-text("Create"), [role=dialog] button:has-text("Save"), [role=dialog] button:has-text("Schedule")').last().click({timeout: 5000}).catch(e => console.log('nosubmit', String(e).slice(0, 60))); await sleep(1500); console.log('AFTER', (await dump()).slice(0, 500)); }
console.log('HTTP', http.join(' ; '));
await b.close();
