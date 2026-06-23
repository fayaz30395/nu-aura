import { chromium } from '@playwright/test';

(async()=>{
  const browser = await chromium.launch({headless: true});
  const page = await browser.newPage();
  try {
    await page.goto('https://hrms-frontend-vert.vercel.app/auth/login', {waitUntil: 'domcontentloaded'});
    await page.waitForTimeout(1000);
    const emailInput = page.locator('#login-email');
    const passwordInput = page.locator('#login-password');
    console.log('email visible', await emailInput.isVisible());
    console.log('password visible', await passwordInput.isVisible());
    const submit = page.getByRole('button', { name: /sign in|log in|login/i }).first();
    console.log('submit visible', await submit.isVisible());
  } finally {
    await browser.close();
  }
})();
