import { test } from '@playwright/test';

test('trace deployed API base', async ({ page }) => {
  const apiCalls: string[] = [];
  page.on('request', (req) => {
    const url = req.url();
    if (url.includes('/api/v1') || url.includes('/api/')) {
      apiCalls.push(`${req.method()} ${url}`);
    }
  });

  await page.goto('/auth/login', { waitUntil: 'domcontentloaded' });
  await page.fill('input[name="email"], input[type="email"]', 'fayaz.m@nulogic.io');
  await page.fill('input[name="password"], input[type="password"]', 'Welcome@123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(5000);

  console.log('API calls:');
  for (const c of apiCalls.slice(0, 100)) {
    console.log(c);
  }
});
