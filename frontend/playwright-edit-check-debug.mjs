import { chromium } from 'playwright';

const email = 'saran@nulogic.io';
const password = 'Welcome@123';
const baseUrl = 'https://hrms-frontend-vert.vercel.app';

const browser = await chromium.launch({headless: true});
const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const page = await context.newPage();

page.on('request', (req) => {
  const url = req.url();
  if (url.includes('/api/v1/')) {
    console.log('REQ', req.method(), url);
  }
});

try {
  await page.goto(`${baseUrl}/auth/login`, { waitUntil: 'domcontentloaded' });
  const emailToggle = page.locator('button:has-text("Email and password"), button:has-text("Sign in with Email")');
  if (await emailToggle.isVisible().catch(() => false)) {
    await emailToggle.click();
    await page.locator('input[type="email"]').waitFor({state: 'visible', timeout: 10000});
  }
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/me/dashboard', { timeout: 60000 });

  const list = await (await page.request.get(`${baseUrl}/api/v1/employees?page=0&size=1&sortBy=createdAt&sortDirection=DESC`)).json();
  const employeeId = list.content?.[0].id;
  await page.goto(`${baseUrl}/employees/${employeeId}/edit`, { waitUntil: 'domcontentloaded' });

  const marker = 'zz_debug';
  const firstNameInput = page.locator('label:has-text("First Name")').locator('..').locator('input');
  await firstNameInput.waitFor({state: 'visible', timeout: 15000});
  const original = await firstNameInput.inputValue();
  await firstNameInput.fill(original + marker);

  await page.evaluate(() => {
    const form = document.querySelector('form');
    window.__formSubmitCalled = 0;
    if (form) {
      form.addEventListener('submit', () => {
        window.__formSubmitCalled++;
      });
    }
  });

  const saveBtn = page.getByRole('button', { name: 'Save Changes' });
  const disabled = await saveBtn.isDisabled();
  console.log('save disabled', disabled);
  const preErrors = await page.locator('.text-danger-500').allTextContents();
  console.log('errors pre', preErrors);

  await saveBtn.click();
  await page.waitForTimeout(3000);

  const submitCalled = await page.evaluate(() => window.__formSubmitCalled || 0);
  console.log('formSubmitCalled', submitCalled);
  const postErrors = await page.locator('.text-danger-500').allTextContents();
  console.log('errors post', postErrors);
  const html = await page.content();
  console.log('contains marker?', html.includes(marker));
  console.log('url', page.url());
} catch (e) {
  console.error(e);
} finally {
  await browser.close();
}
