import { chromium } from '@playwright/test';

const BASE='https://hrms-frontend-vert.vercel.app';
(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({ viewport: { width: 1600, height: 1200 } });
 await page.goto(`${BASE}/auth/login`, { waitUntil: 'domcontentloaded' });
 await page.waitForTimeout(3000);
 const snapshot = await page.evaluate(() => ({
  emailInputs: document.querySelectorAll('input[type="email"]').length,
  passwordInputs: document.querySelectorAll('input[type="password"]').length,
  textInputs: document.querySelectorAll('input[type="text"]').length,
  buttons: Array.from(document.querySelectorAll('button')).map((b)=>b.textContent?.trim()).filter(Boolean).slice(0,80),
  bodyFirst: document.body.textContent.slice(0,1400)
 }));
 console.log(JSON.stringify(snapshot, null, 2));
 await page.screenshot({ path: '/tmp/login-probe.png', fullPage: true });
 await browser.close();
})();
