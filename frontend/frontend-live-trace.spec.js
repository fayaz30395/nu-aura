import {test} from '@playwright/test';

test('trace api base', async ({ page }) => {
  page.on('request', (req) => {
    const url = req.url();
    if (url.includes('/api/v1') || url.includes('/api/')) {
      console.warn('REQ', req.method(), url);
    }
  });
  page.on('response', (res) => {
    const url = res.url();
    if (url.includes('/api/v1') || url.includes('/api/')) {
      console.warn('RESP', res.status(), url);
    }
  });

  await page.goto('https://hrms-frontend-vert.vercel.app/auth/login');
  await page.waitForTimeout(2000);
  await page.fill('input[name="email"], input[type="email"]', 'fayaz.m@nulogic.io');
  await page.fill('input[name="password"], input[type="password"]', 'Welcome@123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(8000);
});
