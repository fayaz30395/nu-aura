import {chromium, newContext, FE, BE, mkLog, watch, sleep} from './lib.mjs';
export {FE, BE, sleep};
export async function sess(role, vp) {
  const b = await chromium.launch(); const ctx = await newContext(b, {role, viewport: vp});
  const p = await ctx.newPage(); const log = mkLog(); watch(p, log);
  const go = async (r, w = 2500) => { await p.goto(FE + r, {waitUntil: 'domcontentloaded', timeout: 90000}); await p.waitForLoadState('networkidle', {timeout: 15000}).catch(() => {}); await p.waitForTimeout(w); };
  const text = () => p.evaluate(() => (document.querySelector('main') || document.body).innerText.replace(/\s+/g, ' ').slice(0, 500));
  const form = () => p.evaluate(() => ({inputs: [...document.querySelectorAll('input,textarea,select,[contenteditable=true]')].map(e => `${e.tagName}[${e.type || ''}|${e.name || ''}|${e.placeholder || e.getAttribute('aria-label') || ''}]`), buttons: [...document.querySelectorAll('button')].map(b => b.innerText.trim()).filter(Boolean).slice(0, 25)}));
  const xsrf = async () => (await ctx.storageState()).cookies.find(c => c.name === 'XSRF-TOKEN')?.value;
  const mut = []; p.on('response', async r => { if (r.request().method() !== 'GET' && /\/api\//.test(r.url())) mut.push(`${r.status()} ${r.request().method()} ${r.url().replace(/^https?:\/\/[^/]+/, '')} ${(await r.text().catch(() => '')).slice(0, 160).replace(/\s+/g, ' ')}`); });
  return {b, ctx, p, log, go, text, form, xsrf, mut};
}
