import { chromium } from 'playwright';

const BASE = 'https://hrms-frontend-vert.vercel.app';
const NOW = new Date();
const MARKER = `AURA_EDIT_${NOW.getTime()}`;

const HR_ADMIN = {
  email: 'saran@nulogic.io',
  password: 'Welcome@123',
};

function randomCode(prefix='ZZ') {
  return `${prefix}-${Math.floor(100000 + Math.random() * 899999)}`;
}

async function login(page, email, password) {
  await page.goto(`${BASE}/auth/login`, {waitUntil: 'domcontentloaded'});
  const emailInput = page.locator('#login-email, input[type="email"]').first();
  const passwordInput = page.locator('#login-password, input[type="password"]').first();

  await Promise.race([
    emailInput.waitFor({state: 'visible', timeout: 20000}),
    page.getByRole('button', {name: 'Demo Accounts10 roles'}).waitFor({state: 'visible', timeout: 20000}),
  ]).catch(() => {});

  if (await emailInput.isVisible().catch(() => false)) {
    await emailInput.fill(email);
    await passwordInput.fill(password);
    const signIn = page.getByRole('button', {name: /sign in/i}).first();
    await signIn.click();
  } else {
    const demoBtn = page.getByRole('button', {name: /Demo Accounts10 roles/i});
    await demoBtn.click();
    await page.locator('button:has-text("SVSaran V")').waitFor({state:'visible', timeout: 15000});
    await page.locator('button:has-text("SVSaran V")').click();
  }

  await page.waitForURL(/\/me\/dashboard/, {timeout: 120000});
  await page.waitForTimeout(1500);
}

async function captureDenyCase(page, roleLabel, path) {
  await page.goto(`${BASE}${path}`, {waitUntil: 'domcontentloaded'});
  await page.waitForTimeout(3000);
  const bodyText = (await page.locator('body').innerText()).toLowerCase();
  const url = page.url();
  const h1 = await page.locator('h1').first().innerText({timeout:1000}).catch(()=>'');
  const hasAccessRestricted = bodyText.includes('access restricted') || h1.includes('Access Restricted');
  const hasGoHome = bodyText.includes('go to home');
  const hasDenied = /access denied|unauthorized|forbidden/.test(bodyText);
  const hasDeniedQuery = /[?&]denied=1/.test(url);
  const screenshot = `/tmp/${roleLabel}-${path.replace(/\W+/g,'_')}-${NOW.getTime()}.png`;
  await page.screenshot({ path: screenshot, fullPage: true });
  return {role: roleLabel, path, url, hasAccessRestricted, hasAccessDeniedText: hasDenied, hasGoHome, hasDeniedQuery, screenshot};
}

async function runEmployeeCrud(page) {
  const employeeEmail = `${MARKER.toLowerCase()}@example.com`;
  const employeeCode = randomCode('QA');
  const originalName = MARKER;
  const updatedName = `${MARKER}_UPDATED`;

  const requests = [];
  const recordMutation = (req) => {
    const method = req.method();
    const url = req.url();
    if (!url.includes('/api/v1/employees')) return;
    if (!['POST','PUT','PATCH','DELETE'].includes(method)) return;
    requests.push({method, url});
  };
  page.on('requestfinished', recordMutation);

  await page.goto(`${BASE}/employees`, {waitUntil: 'domcontentloaded'});
  await page.getByRole('button', {name: 'Add Employee'}).waitFor({timeout: 120000});
  await page.getByRole('button', {name: 'Add Employee'}).click();

  await page.getByText('Add New Employee').waitFor({timeout: 20000});
  await page.locator('input#employee-code, input[placeholder*="EMP" i]').fill(employeeCode);
  const firstNameInput = page.locator('label:has-text("First Name")').locator('input').first();
  const lastNameInput = page.locator('label:has-text("Last Name")').locator('input').first();
  await firstNameInput.fill(originalName);
  await lastNameInput.fill('Test');
  await page.locator('label:has-text("Work Email")').locator('input').fill(employeeEmail);
  await page.locator('label:has-text("Password")').locator('input').fill('Welcome@123');
  const designationInput = page.locator('label:has-text("Designation")').locator('input').first();
  await designationInput.fill('QA Engineer');

  const addSave = page.getByRole('button', {name: 'Add Employee'});
  await addSave.click();
  await page.waitForURL(`${BASE}/employees`, {timeout: 120000});
  await page.waitForTimeout(2000);

  const createdRow = page.locator('table tbody tr').filter({hasText: employeeEmail}).first();
  if (!(await createdRow.isVisible({timeout: 120000}))) {
    throw new Error(`Created employee row for ${employeeEmail} not found`);
  }

  const explicitView = createdRow.locator('button:has-text("View"), a[href*="/employees/"], [aria-label="View"]').first();
  if (await explicitView.isVisible().catch(() => false)) {
    await explicitView.click();
  } else {
    await createdRow.click();
  }
  await page.waitForURL(/\/employees\/[^/]+$/, {timeout: 120000});
  const employeeIdMatch = page.url().match(/\/employees\/([^/?#]+)/);
  const employeeId = employeeIdMatch ? employeeIdMatch[1] : null;

  await page.getByRole('button', {name: 'Edit', exact: true}).waitFor({timeout: 120000});
  await page.getByRole('button', {name: 'Edit', exact: true}).first().click();
  await page.waitForURL(/\/employees\/.+\/edit$/, {timeout: 120000});
  const firstNameField = page.locator('label:has-text("First Name")').locator('input').first();
  await firstNameField.waitFor({state: 'visible', timeout: 120000});
  await firstNameField.fill(updatedName);
  const saveButton = page.getByRole('button', {name: 'Save Changes'});
  await saveButton.click();
  await page.waitForTimeout(4000);

  await page.goto(`${BASE}/employees/${employeeId}`, {waitUntil: 'domcontentloaded'});
  await page.waitForTimeout(2500);
  const detailText = (await page.locator('body').innerText()).toLowerCase();

  await page.goto(`${BASE}/employees`, {waitUntil: 'domcontentloaded'});
  const updatedRow = page.locator('table tbody tr').filter({hasText: updatedName});
  const editedVisibleInList = await updatedRow.first().isVisible().catch(() => false);

  if (employeeId) {
    await page.goto(`${BASE}/employees/${employeeId}/edit`, {waitUntil: 'domcontentloaded'});
    const firstField = page.locator('label:has-text("First Name")').locator('input').first();
    if (await firstField.isVisible({timeout: 120000})) {
      await firstField.fill(originalName);
      await page.getByRole('button', {name: 'Save Changes'}).click();
      await page.waitForTimeout(2500);
    }
  }

  return {
    employeeCode,
    employeeId,
    employeeEmail,
    hasCreate: true,
    hasPut: requests.some((r) => /\/api\/v1\/employees\//.test(r.url) && r.method === 'PUT'),
    detailContainsUpdatedName: detailText.includes(updatedName.toLowerCase()),
    listContainsUpdatedName: editedVisibleInList,
    observedApiMutations: requests,
  };
}

(async () => {
  const browser = await chromium.launch({headless: true});
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await context.newPage();

  try {
    await login(page, HR_ADMIN.email, HR_ADMIN.password);

    const employeeResult = await runEmployeeCrud(page);

    const denyCases = [
      await captureDenyCase(page, 'EMPLOYEE', '/payroll'),
      await captureDenyCase(page, 'MANAGER', '/admin'),
      await captureDenyCase(page, 'MANAGER', '/wall'),
      await captureDenyCase(page, 'MANAGER', '/fluence/wall'),
    ];

    console.log('RESULT', JSON.stringify({
      employeeResult,
      denyCases,
      createdAt: NOW.toISOString(),
    }, null, 2));
  } catch (err) {
    console.error('FATAL', err);
    process.exitCode = 1;
    await page.screenshot({path: '/tmp/nu-aura-final-pass-error.png', fullPage: true}).catch(() => {});
    console.log('error screenshot: /tmp/nu-aura-final-pass-error.png');
  } finally {
    await context.close();
    await browser.close();
  }
})();
