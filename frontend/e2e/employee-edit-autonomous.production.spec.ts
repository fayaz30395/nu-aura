import {expect, test, type Page} from '@playwright/test';

const PROD_PASSWORD = process.env.E2E_PROD_PASSWORD;
const PROD_EDITOR_EMAIL =
  process.env.E2E_PROD_EDITOR_EMAIL ??
  process.env.E2E_PROD_SUPERADMIN_EMAIL ??
  process.env.E2E_PROD_HR_ADMIN_EMAIL;
const ALLOW_DEMO_PASSWORD = process.env.E2E_ALLOW_DEMO_PROD_PASSWORD === 'true';
const DEMO_PASSWORD_SENTINEL = 'Welcome@123';

const PROFILE_SELECTOR = 'label:has-text("First Name")';
const SAVE_BUTTON_TEXT = 'Save Changes';
const MAX_FIRST_NAME_LENGTH = 50;
const MARKER = 'zzaut';

async function loginViaUi(page: Page) {
  if (!PROD_EDITOR_EMAIL) {
    throw new Error('E2E_PROD_EDITOR_EMAIL (or E2E_PROD_SUPERADMIN_EMAIL / E2E_PROD_HR_ADMIN_EMAIL) is required for production employee edit smoke.');
  }
  if (!PROD_PASSWORD) {
    throw new Error('E2E_PROD_PASSWORD is required for production employee edit smoke.');
  }
  if (!ALLOW_DEMO_PASSWORD && PROD_PASSWORD === DEMO_PASSWORD_SENTINEL) {
    throw new Error('Refusing to run against production with the shared demo password.');
  }

  await page.goto('/auth/login', {waitUntil: 'domcontentloaded'});

  const emailModeToggle = page.locator('button:has-text("Email and password"), button:has-text("Sign in with Email")');
  if (await emailModeToggle.isVisible().catch(() => false)) {
    await emailModeToggle.click();
    await page.locator('input[type="email"]').waitFor({state: 'visible', timeout: 15000});
  }

  await page.fill('input[type="email"]', PROD_EDITOR_EMAIL);
  await page.fill('input[type="password"]', PROD_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes('/auth/login'), {timeout: 90000});
}

async function pickEmployeeForEdit(page: Page) {
  const listResp = await page.request.get('/api/v1/employees?page=0&size=1&sortBy=createdAt&sortDirection=DESC');
  expect(listResp.status(), 'employee list API should return 200').toBe(200);
  const listBody = (await listResp.json()) as {
    content?: Array<{id?: string; firstName?: string; lastName?: string}>;
  };

  const employee = listBody.content?.[0];
  if (!employee?.id) {
    throw new Error('No editable employee found in API response.');
  }

  return employee;
}

function firstNameInput(page: Page) {
  return page.locator(PROFILE_SELECTOR).locator('..').locator('input');
}

function buildEditName(original: string) {
  const marker = `${MARKER}${Date.now().toString(36).slice(-4)}`;
  const maxPrefixLength = Math.max(1, MAX_FIRST_NAME_LENGTH - marker.length - 1);
  const base = original.trim().slice(0, maxPrefixLength);
  const separator = original.length >= maxPrefixLength ? '_' : '';
  return `${base}${separator}${marker}`.slice(0, MAX_FIRST_NAME_LENGTH);
}

async function waitForEmployeePut(page: Page, employeeId: string) {
  return page.waitForResponse((response) => {
    if (response.request().method() !== 'PUT') {
      return false;
    }

    try {
      const url = new URL(response.url());
      return url.pathname === `/api/v1/employees/${employeeId}`;
    } catch {
      return false;
    }
  }, {timeout: 30000});
}

async function fetchEmployeeFirstName(page: Page, employeeId: string) {
  const employeeResp = await page.request.get(`/api/v1/employees/${employeeId}`);
  expect(employeeResp.ok(), 'employee detail API should return 200').toBeTruthy();
  const employee = (await employeeResp.json()) as {firstName?: string};
  return employee.firstName;
}

async function submitEdit(page: Page, employeeId: string, nextFirstName: string) {
  const saveButton = page.getByRole('button', {name: SAVE_BUTTON_TEXT});
  const putResponsePromise = waitForEmployeePut(page, employeeId);
  await firstNameInput(page).fill(nextFirstName);
  await saveButton.click();
  const putResponse = await putResponsePromise;
  expect(putResponse.status(), 'employee edit should return success').toBeLessThan(400);
}

test.describe('Production employee edit autonomy @critical @production', () => {
  test('edit employee then restore, with API persistence verification', async ({page}) => {
    await loginViaUi(page);

    const employee = await pickEmployeeForEdit(page);
    await page.goto(`/employees/${employee.id}/edit`, {waitUntil: 'domcontentloaded'});

    const input = firstNameInput(page);
    await input.waitFor({state: 'visible', timeout: 12000});

    const original = await input.inputValue();
    const edited = buildEditName(original);

    await submitEdit(page, employee.id, edited);

    await expect.poll(async () => {
      return fetchEmployeeFirstName(page, employee.id);
    }, {timeout: 20000, interval: 1000}).toBe(edited);

    await page.goto(`/employees/${employee.id}/edit`, {waitUntil: 'domcontentloaded'});
    await submitEdit(page, employee.id, original);

    await expect.poll(async () => {
      return fetchEmployeeFirstName(page, employee.id);
    }, {timeout: 20000, interval: 1000}).toBe(original);
  });
});
