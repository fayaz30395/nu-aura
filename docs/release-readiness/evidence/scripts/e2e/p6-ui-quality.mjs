// P6 UI quality probe: axe (light+dark), overflow 390/768, headings, focus ring, CLS, light surfaces in dark. Read-only.
import fs from 'fs';
import {createRequire} from 'module';
import {chromium, newContext, FE, EV, sleep} from './lib.mjs';
const AXE = fs.readFileSync('/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/frontend/node_modules/axe-core/axe.min.js', 'utf8');
const SCR = '/private/tmp/claude-504/-Users-fayaz-m-IdeaProjects-nulogic-nu-aura/31fd4514-1941-4084-b1c8-e1a40e6df684/scratchpad';
const pick = (a, n) => a.filter((_, i) => i % Math.max(1, Math.floor(a.length / n)) === 0).slice(0, n);
const lists = {employee: JSON.parse(fs.readFileSync(`${SCR}/ok_employee.json`)), manager: JSON.parse(fs.readFileSync(`${SCR}/ok_manager.json`)), hradmin: JSON.parse(fs.readFileSync(`${SCR}/ok_hradmin.json`))};
const plan = {q_emp: pick(lists.employee, 9), q_mgr: pick(lists.manager, 9), q_hr: pick(lists.hradmin, 14)};
const out = {run: 'NUAURA_TEST_P6_' + Date.now().toString().slice(-6), items: []};
const browser = await chromium.launch();

async function probe(ctx, route, vp, theme, doAxe) {
  const page = await ctx.newPage();
  await page.setViewportSize(vp);
  await page.addInitScript(t => { try { localStorage.setItem('nu-aura-theme', t); } catch {} 
    window.__cls = 0; try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({type: 'layout-shift', buffered: true}); } catch {} }, theme);
  const r = {route, vp: vp.width, theme};
  try {
    await page.goto(FE + route, {waitUntil: 'domcontentloaded', timeout: 90000});
    await page.waitForLoadState('networkidle', {timeout: 25000}).catch(() => {});
    await sleep(1500);
    r.final = page.url().replace(FE, '');
    r.dom = await page.evaluate(() => {
      const de = document.documentElement;
      const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(h => h.getBoundingClientRect().width);
      const lv = hs.map(h => +h.tagName[1]); let skip = null; for (let i = 1; i < lv.length; i++) if (lv[i] - lv[i - 1] > 1) { skip = `h${lv[i - 1]}>h${lv[i]}`; break; }
      let wide = null; if (de.scrollWidth > innerWidth + 1) { let m = 0; for (const e of document.body.querySelectorAll('*')) { const b = e.getBoundingClientRect(); if (b.right > m + 1 && b.width) { m = b.right; wide = (e.tagName + '.' + String(e.className).slice(0, 50)); } } }
      const lum = c => { const m = c.match(/[\d.]+/g); if (!m) return 0; const [r, g, b, a = 1] = m.map(Number); return (a === 0) ? -1 : (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };
      let light = []; if (de.classList.contains('dark')) for (const e of document.querySelectorAll('main *, [role=dialog] *, aside *, header *')) { const b = e.getBoundingClientRect(); if (b.width * b.height < 8000) continue; const l = lum(getComputedStyle(e).backgroundColor); if (l > 0.85) light.push(e.tagName + '.' + String(e.className).slice(0, 60) + ` ${Math.round(b.width)}x${Math.round(b.height)}`); }
      const small = innerWidth < 500 ? [...document.querySelectorAll('button,a[href],[role=button],input,select')].filter(e => { const b = e.getBoundingClientRect(); return b.width && b.height && (b.width < 24 || b.height < 24) && getComputedStyle(e).visibility !== 'hidden'; }).length : null;
      return {overflow: de.scrollWidth > innerWidth + 1 ? `${de.scrollWidth}>${innerWidth}` : null, wide, h1: document.querySelectorAll('h1').length, headings: hs.length, skip, dark: de.classList.contains('dark'), light: light.slice(0, 4), lightN: light.length, small,
        main: document.querySelectorAll('main,[role=main]').length, title: document.title, cls: window.__cls, bodyLen: document.body.innerText.length, text: document.body.innerText.slice(0, 160).replace(/\s+/g, ' ')};
    });
    if (doAxe) {
      await page.evaluate(AXE);
      r.axe = await page.evaluate(async () => { const x = await axe.run(document, {runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'], resultTypes: ['violations']}); return x.violations.filter(v => ['serious', 'critical'].includes(v.impact)).map(v => ({id: v.id, impact: v.impact, n: v.nodes.length, ex: v.nodes.slice(0, 2).map(n => n.target.join(' ').slice(0, 90) + ' || ' + (n.any[0]?.message || n.failureSummary || '').slice(0, 100))})); });
    }
    if (vp.width === 1440 && theme === 'light') {
      r.focus = []; await page.mouse.click(5, 5).catch(() => {});
      for (let i = 0; i < 14; i++) { await page.keyboard.press('Tab'); const f = await page.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return null; const s = getComputedStyle(e); const ring = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || (s.boxShadow && s.boxShadow !== 'none'); const b = e.getBoundingClientRect(); return {el: e.tagName + (e.getAttribute('aria-label') ? `[${e.getAttribute('aria-label').slice(0, 20)}]` : '.' + String(e.className).slice(0, 30)) + ' ' + (e.textContent || '').trim().slice(0, 20), ring, vis: b.width > 0 && b.bottom > 0 && b.top < innerHeight}; }); if (f) r.focus.push(f); }
      r.focusNoRing = r.focus.filter(f => !f.ring).length; r.focusOffscreen = r.focus.filter(f => !f.vis).length;
    }
  } catch (e) { r.err = String(e).split('\n')[0].slice(0, 160); }
  await page.close();
  return r;
}
for (const [role, routes] of Object.entries(plan)) {
  const ctx = await newContext(browser, {role});
  for (const route of routes) {
    for (const [vp, theme, axe] of [[{width: 1440, height: 900}, 'light', true], [{width: 1440, height: 900}, 'dark', true], [{width: 768, height: 1024}, 'light', false], [{width: 390, height: 844}, 'light', false]]) {
      const r = await probe(ctx, route, vp, theme, axe); r.role = role; out.items.push(r);
      console.log(role, route, vp.width, theme, r.err || (r.dom.overflow ? 'OVF ' + r.dom.overflow : 'ok'), r.axe ? r.axe.map(a => a.id).join(',') : '');
    }
    fs.writeFileSync(`${SCR}/p6-raw.json`, JSON.stringify(out));
  }
  await ctx.close();
}
await browser.close();
fs.writeFileSync(`${SCR}/p6-raw.json`, JSON.stringify(out));
