import { chromium } from '@playwright/test';

const BASE = 'https://hrms-frontend-vert.vercel.app';
const SCREEN_DIR = '/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/docs/qa/ui-e2e-run-2026-06-23/SCREENS';

const HR_ADMIN = { email: 'saran@nulogic.io', password: 'Welcome@123' };
const EMPLOYEE = { email: 'arun@nulogic.io', password: 'Welcome@123' };
const MANAGER = { email: 'sumit@nulogic.io', password: 'Welcome@123' };

const now = new Date();
const markerBase = `ZZ QA Test ${now.toISOString().replace(/[^0-9]/g, '').slice(0, 12)}`;
const employeeEmail = `${markerBase.toLowerCase().replace(/\s+/g, '-')}-@example.com`;
const employeeCode = `ZZ-${Math.floor(Math.random() * 900000 + 100000)}`;
const editedMarker = `${markerBase} EDITED`;

async function screenshot(page, name) {
  const path = `${SCREEN_DIR}/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  return path;
}

async function fillLogin(page, email, password) {
  await page.goto(`${BASE}/auth/login`, { waitUntil: 'domcontentloaded' });
  const emailInput = page.locator('#login-email');
  const passwordInput = page.locator('#login-password');
  const emailButton = page.locator(
    'button:has-text(\"Email and password\"), button:has-text(\"Sign in with Email\"), button:has-text(\"Sign in with email\")'
  ).first();

  await emailInput.waitFor({timeout: 15000, state: 'visible'}).catch(async () => {
    if (await emailButton.isVisible().catch(() => false)) {
      await emailButton.click();
      return emailInput.waitFor({timeout: 15000, state: 'visible'});
    }
    return Promise.reject(new Error('No login path detected'));
  });

  await emailInput.fill(email);
  await passwordInput.fill(password);
  const submit = page.getByRole('button', {name: /sign in|continue|login|log in/i}).first();
  await submit.click();

  await page.waitForURL(/\/me\/dashboard/, { timeout: 90000 });
  await page.waitForTimeout(2000);
}

async function waitForEmployeeTable(page) {
  await page.waitForSelector('table tbody', { timeout: 90000 });
}

function attachApiLogging(page, requestLog) {
  page.on('requestfinished', async (req) => {
    const method = req.method();
    const url = req.url();
    if (!url.includes('/api/v1/employees')) {
      return;
    }
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return;
    }
    let body = '';
    try {
      body = req.postData() || '';
    } catch {
      body = '';
    }
    requestLog.push({ method, url, body });
  });
}

async function findEmployeeRow(page, text) {
  await page.waitForTimeout(700);
  const direct = page.locator('table tbody tr').filter({ hasText: text }).first();
  if (await direct.isVisible().catch(() => false)) {
    return direct;
  }

  const searchInput = page.locator('#employee-search');
  if (await searchInput.isVisible().catch(() => false)) {
    await searchInput.fill(text);
    const searchButton = page.locator('button:has-text("Search")').first();
    if (await searchButton.isVisible().catch(() => false)) {
      await searchButton.click();
      await page.waitForTimeout(1200);
    }
    const byFilter = page.locator('table tbody tr').filter({ hasText: text }).first();
    if (await byFilter.isVisible().catch(() => false)) {
      return byFilter;
    }
  }

  return direct;
}

async function runEmployeeFlow() {
  const browser = await chromium.launch({ headless: true });
  const requestLog = [];
  const context = await browser.newContext({ viewport: { width: 1600, height: 1100 } });
  const page = await context.newPage();
  attachApiLogging(page, requestLog);

  const evidence = {
    listBefore: null,
    createSuccess: false,
    listAfterCreate: null,
    editedVisible: false,
    detailAfterEdit: null,
    deleteSuccess: false,
    finalList: null,
    cleanNewJoiner: false,
    apiCalls: null,
  };

  try {
    await fillLogin(page, HR_ADMIN.email, HR_ADMIN.password);
    await page.goto(`${BASE}/employees`, { waitUntil: 'domcontentloaded' });
    await waitForEmployeeTable(page);
    evidence.listBefore = await screenshot(page, 'HRADMIN__employees__before-crud');

    await page.locator('button:has-text("Add Employee")').first().click();
    await page.locator('h2:has-text("Add New Employee")').waitFor({ timeout: 12000 });

    await page.locator('input[placeholder*="EMP"]').first().fill(employeeCode);
    await page.locator('label:has-text("First Name")').locator('..').locator('input').first().fill(markerBase);
    await page.locator('label:has-text("Last Name")').locator('..').locator('input').first().fill('Automated');
    await page.locator('input[type="email"]').first().fill(employeeEmail);
    await page.locator('label:has-text("Initial Password")').locator('..').locator('input').first().fill('Welcome@123');

    const designationInput = page.locator('input[placeholder*="Senior Software Engineer"], label:has-text("Designation")').locator('input').first();
    if (await designationInput.isVisible().catch(() => false)) {
      await designationInput.fill('QA Automation Engineer');
    }

    const addBtn = page.locator('button:has-text("Add Employee")').last();
    await addBtn.click();
    await page.waitForTimeout(3500);

    await page.waitForURL(`${BASE}/employees`, { timeout: 30000 });
    await waitForEmployeeTable(page);
    evidence.createSuccess = true;
    evidence.listAfterCreate = await screenshot(page, 'HRADMIN__employees__after-create');

    const row = await findEmployeeRow(page, markerBase);
    await row.waitFor({ timeout: 20000 });
    await row.locator('button:has-text("View"), [aria-label="View"], a[href*="/employees/"]').first().click();
    await page.waitForURL(/\/employees\//, { timeout: 20000 });
    await page.waitForTimeout(1200);

    await page.locator('label:has-text("First Name")').locator('..').locator('input').first().fill(editedMarker);
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await page.waitForTimeout(6000);

    await page.goto(`${BASE}/employees`, { waitUntil: 'domcontentloaded' });
    await waitForEmployeeTable(page);

    const editedRow = await findEmployeeRow(page, editedMarker);
    const editedText = (await editedRow.textContent().catch(() => '')) || '';
    evidence.editedVisible = editedText.includes(editedMarker);
    evidence.detailAfterEdit = await screenshot(page, 'HRADMIN__employees__after-edit');

    await editedRow.locator('button:has-text("Delete")').first().click();
    await page.locator('div.fixed.inset-0').filter({ hasText: 'Delete Employee' }).locator('button:has-text("Delete")').last().waitFor({ timeout: 12000 });
    await page.locator('div.fixed.inset-0').filter({ hasText: 'Delete Employee' }).locator('button:has-text("Delete")').last().click();
    await page.waitForTimeout(4500);
    evidence.deleteSuccess = !(await editedRow.isVisible().catch(() => false));

    await page.locator('#employee-search').fill('newjoiner@nulogic.io');
    const searchButton = page.locator('button:has-text("Search")').first();
    await searchButton.click();
    await page.waitForTimeout(1500);

    const staleRow = page.locator('table tbody tr').filter({ hasText: 'newjoiner@nulogic.io' }).first();
    if (await staleRow.isVisible().catch(() => false)) {
      await staleRow.locator('button:has-text("Delete")').first().click();
      await page.locator('div.fixed.inset-0').filter({ hasText: 'Delete Employee' }).locator('button:has-text("Delete")').last().waitFor({ timeout: 12000 });
      await page.locator('div.fixed.inset-0').filter({ hasText: 'Delete Employee' }).locator('button:has-text("Delete")').last().click();
      await page.waitForTimeout(3500);
      evidence.cleanNewJoiner = !(await page.locator('table tbody tr').filter({ hasText: 'newjoiner@nulogic.io' }).first().isVisible().catch(() => false));
    }

    evidence.finalList = await screenshot(page, 'HRADMIN__employees__after-delete');
  } finally {
    evidence.apiCalls = requestLog;
    await context.close();
    await browser.close();
  }

  return evidence;
}

async function captureDenyCase(roleLabel, creds, targets) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1600, height: 1100 } });
  const page = await context.newPage();
  const rows = [];

  try {
    await fillLogin(page, creds.email, creds.password);

    for (const target of targets) {
      await page.goto(`${BASE}${target.path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2200);
      const bodyText = (await page.textContent('body')).toLowerCase();
      const screenshotPath = await screenshot(page, `${roleLabel}__${target.slug}__deny-` + Date.now());
      rows.push({
        role: roleLabel,
        path: target.path,
        url: page.url(),
        hasAccessRestricted: bodyText.includes('access restricted'),
        hasAccessDenied: /access denied|unauthorized|forbidden/.test(bodyText),
        hasDeniedQuery: /\bdenied=1\b/.test(page.url()),
        screenshot: screenshotPath,
      });
    }
  } finally {
    await context.close();
    await browser.close();
  }

  return rows;
}

async function main() {
  const employeeEvidence = await runEmployeeFlow();
  const denyEvidence = [
    ...(await captureDenyCase('EMPLOYEE', EMPLOYEE, [
      { path: '/payroll', slug: 'payroll' },
      { path: '/admin', slug: 'admin' },
    ])),
    ...(await captureDenyCase('MANAGER', MANAGER, [
      { path: '/admin', slug: 'admin' },
      { path: '/wall', slug: 'wall' },
      { path: '/fluence/wall', slug: 'fluence-wall' },
    ])),
  ];

  const payload = {
    createdAt: now.toISOString(),
    markerBase,
    employeeEmail,
    employeeEvidence,
    denyEvidence,
  };

  console.log('LIVE_FLOW_RESULTS=' + JSON.stringify(payload));
}

main().catch((e) => {
  console.error('LIVE_FLOW_ERROR', e.message);
  process.exit(1);
});
