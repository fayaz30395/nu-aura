/* eslint-disable no-console */
import { chromium } from '@playwright/test';

const pageUrl = 'https://hrms-frontend-vert.vercel.app/auth/login';
(async()=>{
  const browser = await chromium.launch({headless: true});
  const page = await browser.newPage({ viewport: { width: 1200, height: 1200 } });
  try {
    await page.goto(pageUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    const html = await page.content();
    const hasIdEmail = html.includes('login-email');
    const hasIdPassword = html.includes('login-password');
    const title = await page.title();
    const url = page.url();
    const inputs = await page.$$eval('input', els => els.map(e=>({id:e.id, name:e.name, type:e.type, placeholder:e.placeholder, aria:e.getAttribute('aria-label'), class:e.className})).slice(0,80));
    const buttons = await page.$$eval('button', els => els.map(e=>({text:e.textContent?.trim(), type:e.type, id:e.id, class:e.className})).slice(0,80));
    const visibleInputs = await page.$$eval('input', async els => await Promise.all(els.map(async e => ({id:e.id, type:e.type, visible: await e.ownerDocument.defaultView.getComputedStyle(e).display !== 'none'}))));
    const out = {url,title,hasIdEmail,hasIdPassword,inputs,buttons,visibleInputs};
    console.log(JSON.stringify(out,null,2));
    await page.screenshot({ path: '/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/docs/qa/ui-e2e-run-2026-06-23/SCREENS/login-check.png', fullPage: true});
  } finally {
    await browser.close();
  }
})();
