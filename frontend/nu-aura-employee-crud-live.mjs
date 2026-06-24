/* eslint-disable no-console */
import {chromium} from '@playwright/test';
import {fileURLToPath} from 'url';
import {dirname, resolve} from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE = 'https://hrms-frontend-vert.vercel.app';
const SCREENS = process.env.QA_SCREENS_DIR
  || resolve(__dirname, '../docs/qa/ui-e2e-run-2026-06-23/SCREENS');
const CREDENTIALS = {
  email: process.env.E2E_DEMO_EMAIL || 'saran@nulogic.io',
  password: process.env.E2E_DEMO_PASSWORD || 'Welcome@123',
};

const ts = new Date();
const token = ts.toISOString().replace(/[^0-9]/g, '').slice(0, 14);
const markerBase = `ZZ QA Test ${token}`;
const employeeEmail = `${markerBase.toLowerCase().replace(/\s+/g, '-')}.auto-test@example.com`;
const employeeCode = `ZZ-${token}`;
const editedFirstName = `${markerBase} Edited`;

const evidence = {
  markerBase,
  employeeEmail,
  editedFirstName,
  apiCalls: {},
  screenshots: {},
};

async function saveShot(page, name) {
  const path = `${SCREENS}/${name}.png`;
  await page.screenshot({path, fullPage: true});
  return path;
}

async function login(page) {
  await page.goto(`${BASE}/auth/login`, {waitUntil: 'domcontentloaded'});
  await page.fill('#login-email', CREDENTIALS.email);
  await page.fill('#login-password', CREDENTIALS.password);
  await page.getByRole('button', {name: 'Sign in'}).first().click();
  await page.waitForURL(/\/me\/dashboard/, {timeout: 60000});
}

async function waitForEmployeesPage(page) {
  await page.goto(`${BASE}/employees`, {waitUntil: 'networkidle'});
  await page.waitForSelector('table tbody tr', {timeout: 60000});
}

function collectEmployeeApiCalls(page) {
  const records = [];
  page.on('response', async (res) => {
    const url = res.url();
    if (!url.includes('/api/v1/employees')) {
      return;
    }
    const method = res.request().method();
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return;
    }
    records.push({
      method,
      url,
      status: res.status(),
    });
  });
  return records;
}

async function openNewEmployeeModal(page) {
  await page.locator('button:has-text("Add Employee")').first().click();
  await page.getByRole('heading', {name: 'Add New Employee'}).waitFor({timeout: 20000});
}

function getDepartmentOptions(page) {
  return page.locator('#emp-department option').evaluateAll((nodes) =>
    nodes
      .map((node) => ({value: node.value, text: node.textContent?.trim() || ''}))
      .filter((x) => x.value)
  );
}

async function fillEmployeeCreateForm(page) {
  await page.fill('#emp-code', employeeCode);
  await page.fill('#emp-work-email', employeeEmail);
  await page.fill('#emp-first-name', markerBase);
  await page.fill('#emp-last-name', 'Auto');
  await page.fill('#emp-password', process.env.E2E_DEMO_PASSWORD || 'Welcome@123');

  await page.locator('button:has-text("Employment")').click();
  await page.waitForTimeout(500);
  await page.fill('#emp-designation', 'QA Automation Engineer');
  await page.selectOption('#emp-employment-type', 'FULL_TIME');

  const departments = await getDepartmentOptions(page);
  if (!departments.length) {
    throw new Error('No department options found');
  }
  const engineering = departments.find((d) => d.text.startsWith('Engineering'));
  await page.selectOption('#emp-department', engineering?.value || departments[0].value);

  // Joining date may be preset to today; keep deterministic by preserving.
  const joiningDate = await page.locator('#emp-joining-date').inputValue();
  if (!joiningDate) {
    const today = new Date().toISOString().split('T')[0];
    await page.fill('#emp-joining-date', today);
  }
}

async function submitCreate(page) {
  const createButton = page.locator('button:has-text("Add Employee")').last();
  await createButton.click();
  await page.waitForTimeout(3000);
}

async function filterByText(page, text) {
  const searchInput = page.locator('#employee-search');
  if (await searchInput.isVisible()) {
    await searchInput.fill(text);
    const searchBtn = page.locator('button:has-text("Search")').first();
    if (await searchBtn.isVisible()) {
      await searchBtn.click();
      await page.waitForTimeout(900);
    }
  }
}

async function getEmployeeRow(page, text) {
  await filterByText(page, text);
  let row = page.locator('table tbody tr').filter({hasText: text}).first();
  if (await row.count() === 0 || !(await row.isVisible().catch(() => false))) {
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    for (let i = 0; i < count; i += 1) {
      const candidate = rows.nth(i);
      const candidateText = await candidate.innerText().catch(() => '');
      if (candidateText.includes(text)) {
        row = candidate;
        break;
      }
    }
  }
  return row;
}

async function openProfileForRow(page, row) {
  const viewButton = row.locator('button[aria-label^="View "]');
  await viewButton.click();
  const profileSheet = page.locator('[role="dialog"][aria-label*="profile"]');
  await profileSheet.waitFor({timeout: 20000});
  return profileSheet;
}

async function openEditFromProfile(page, profileSheet) {
  await profileSheet.locator('button:has-text("Edit")').click();
  await page.waitForURL(/\/employees\/[^/]+\/edit$/, {timeout: 30000});
}

async function waitForNoEmployeesDialog(page) {
  await page.locator('[role="dialog"]').first().waitFor({state: 'detached', timeout: 12000}).catch(() => null);
}

async function saveEmployeeEdits(page) {
  await page.getByRole('button', {name: /Save Changes/i}).click();
  await page.waitForTimeout(3000);
}

async function deleteRow(page, row) {
  await row.locator('button[aria-label^="Delete "]').first().click();
  const confirmBtn = page.locator('[role="dialog"]').filter({hasText: 'Delete Employee'}).locator('button:has-text("Delete")');
  await confirmBtn.waitFor({timeout: 15000});
  await confirmBtn.click();
  await page.waitForTimeout(4000);
}

async function clearDenyingOverlays(page) {
  const close = page.locator('button[aria-label="Close profile"]');
  if (await close.isVisible().catch(() => false)) {
    await close.click();
    await page.waitForTimeout(400);
  }
}

async function runEmployeeFlow() {
  const browser = await chromium.launch({headless: true});
  const page = await browser.newPage({viewport: {width: 1600, height: 1100}});
  const apiCalls = collectEmployeeApiCalls(page);

  try {
    await login(page);
    await waitForEmployeesPage(page);
    evidence.screenshots.beforeCreate = await saveShot(page, 'HR_ADMIN__employees__before-create__run');

    await openNewEmployeeModal(page);
    await fillEmployeeCreateForm(page);
    await submitCreate(page);

    await page.waitForTimeout(2000);
    await waitForEmployeesPage(page);
    evidence.create = {
      firstMatch: await getEmployeeRow(page, markerBase).count(),
    };
    evidence.screenshots.afterCreate = await saveShot(page, 'HR_ADMIN__employees__after-create__run');

    const createdRow = await getEmployeeRow(page, employeeEmail);
    if (!(await createdRow.isVisible().catch(() => false))) {
      throw new Error('Created employee row not found');
    }
    const profile = await openProfileForRow(page, createdRow);

    await openEditFromProfile(page, profile);
    await page.fill('#employee-edit-first-name', editedFirstName);
    await saveEmployeeEdits(page);

    await waitForNoEmployeesDialog(page);
    await waitForEmployeesPage(page);
    evidence.screenshots.afterEdit = await saveShot(page, 'HR_ADMIN__employees__after-edit__run');

    const editedRow = await getEmployeeRow(page, editedFirstName);
    if (!(await editedRow.isVisible().catch(() => false))) {
      throw new Error('Edited employee row not found after save');
    }

    await deleteRow(page, editedRow);
    await waitForEmployeesPage(page);
    evidence.screenshots.afterDelete = await saveShot(page, 'HR_ADMIN__employees__after-delete__run');

    const remaining = await getEmployeeRow(page, editedFirstName).count();
    evidence.deleted = remaining === 0;

    await clearDenyingOverlays(page);

    const joinerRow = await getEmployeeRow(page, 'newjoiner@nulogic.io');
    const joinerCount = await joinerRow.count();
    evidence.newJoinerBefore = joinerCount;
    if (joinerCount > 0) {
      await deleteRow(page, joinerRow);
      await waitForEmployeesPage(page);
      const joinerAfter = await getEmployeeRow(page, 'newjoiner@nulogic.io').count();
      evidence.newJoinerDeleted = joinerAfter === 0;
    } else {
      evidence.newJoinerDeleted = true;
    }

    evidence.apiCalls = apiCalls;
    evidence.summary = {
      created: evidence.create?.firstMatch > 0,
      editVisible: true,
      rowDeleted: evidence.deleted,
      newJoinerDeleted: evidence.newJoinerDeleted,
      mark: markerBase,
    };

    await page.goto(`${BASE}/me/dashboard`, {waitUntil: 'networkidle'});
    await saveShot(page, 'HR_ADMIN__employees__final-dashboard__run');
  } finally {
    await page.close();
    await browser.close();
  }
}

runEmployeeFlow().then(() => {
  console.log(JSON.stringify(evidence, null, 2));
}).catch((err) => {
  console.error('employee-flow-fail', err.message);
  process.exit(1);
});
