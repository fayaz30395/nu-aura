import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const apiCalls = [];

  page.on('request', (req) => {
    const url = req.url();
    if (url.includes('/api/v1') || url.includes('/api/') || url.includes('/auth')) {
      apiCalls.push({
        type: 'req',
        method: req.method(),
        url,
      });
    }
  });

  page.on('response', (res) => {
    const url = res.url();
    if (url.includes('/api/v1') || url.includes('/api/') || url.includes('/auth')) {
      apiCalls.push({
        type: 'res',
        status: res.status(),
        url,
      });
    }
  });

  await page.goto('https://hrms-frontend-vert.vercel.app/auth/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);
  const emailField = page.locator('input[name="email"], input[type="email"]');
  await emailField.waitFor({ timeout: 15000 });
  await page.fill('input[name="email"], input[type="email"]', 'sarankarthick.maran@nulogic.io');
  await page.fill('input[name="password"], input[type="password"]', 'Welcome@123');
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(10000);

  console.log('Current URL:', page.url());
  const tokenEndpoint = apiCalls.filter((x) => x.url.includes('/api/v1'));
  console.log('API calls matching /api/v1:', tokenEndpoint.length);
  for (const call of tokenEndpoint.slice(0, 120)) {
    if (call.type === 'req') {
      console.log(`REQ ${call.method} ${call.url}`);
    } else {
      console.log(`RES ${call.status} ${call.url}`);
    }
  }

  const cookies = await page.context().cookies();
  console.log('cookies', cookies.map((c) => `${c.name}=${c.value.slice(0, 16)}... domain=${c.domain}`));
  await browser.close();
})();
