import { chromium } from 'playwright';

const email = 'saran@nulogic.io';
const password = 'Welcome@123';
const baseUrl = 'https://hrms-frontend-vert.vercel.app';

const browser = await chromium.launch({headless: true});
const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const page = await context.newPage();

const observed = [];
page.on('requestfinished', async (req) => {
  const r = req;
  const method = r.method();
  const url = r.url();
  if (url.includes('/api/v1/employees/') && ['PUT', 'POST', 'PATCH', 'DELETE'].includes(method)) {
    const body = req.postData() || '';
    observed.push({method, url, body});
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

  const listResp = await page.request.get(`${baseUrl}/api/v1/employees?page=0&size=1&sortBy=createdAt&sortDirection=DESC`);
  const status = listResp.status();
  console.log('list status', status);
  const listText = await listResp.text();
  const list = JSON.parse(listText);
  console.log('list keys', Object.keys(list));
  const first = list.content?.[0];
  if (!first) {
    throw new Error('No employees from API');
  }
  console.log('first employee', {id: first.id, name: first.firstName, email: first.personalEmail});

  const employeeId = first.id;
  await page.goto(`${baseUrl}/employees/${employeeId}/edit`, { waitUntil: 'domcontentloaded' });

  const firstNameInput = page.locator('label:has-text("First Name")').locator('..').locator('input');
  await firstNameInput.waitFor({state: 'visible', timeout: 15000});
  const original = await firstNameInput.inputValue();
  const marker = `${original}_qa`;
  await firstNameInput.fill(marker);

  const saveBtn = page.getByRole('button', { name: 'Save Changes' });
  await saveBtn.click();
  await page.waitForTimeout(10000);

  console.log('PUT observed', observed.length);
  const employeePuts = observed.filter((x) => x.url.includes(`/api/v1/employees/${employeeId}`) && x.method === 'PUT');
  console.log('employee PUT count', employeePuts.length);
  for (const req of employeePuts) {
    console.log('request', req.method, req.url, req.body);
  }

  await page.goto(`${baseUrl}/employees/${employeeId}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  const bodyText = await page.locator('body').textContent();
  console.log('detail visible contains marker?', bodyText.includes(marker));

  await page.goto(`${baseUrl}/employees/${employeeId}/edit`);
  await firstNameInput.waitFor({state: 'visible', timeout: 12000});
  await firstNameInput.fill(original);
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await page.waitForTimeout(4000);

} catch (err) {
  console.error('ERROR', err);
  await page.screenshot({ path: '/tmp/nu-aura-edit-check-fail3.png', fullPage: true }).catch(() => {});
  console.log('screenshot /tmp/nu-aura-edit-check-fail3.png');
} finally {
  await browser.close();
}
