import { chromium } from '@playwright/test';

const BASE = 'https://hrms-frontend-vert.vercel.app';
const SCREENS = '/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/docs/qa/ui-e2e-run-2026-06-23/SCREENS';
const marker = `ZZ QA Test ${new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 12)}`;
const email = `${marker.toLowerCase().replace(/\s+/g, '-')}.auto@example.com`;
const code = `ZZ-${Math.floor(Math.random() * 900000 + 100000)}`;
const editedName = `${marker} Edited`;

async function shot(page, name) {
  const path = `${SCREENS}/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  return path;
}

function normalize(text) {
  return (text || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

async function login(page) {
  await page.goto(`${BASE}/auth/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('#login-email').waitFor({ state: 'visible', timeout: 30000 });
  await page.fill('#login-email', 'saran@nulogic.io');
  await page.fill('#login-password', 'Welcome@123');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/me\/dashboard/, { timeout: 90000 });
}

async function goEmployees(page) {
  await page.goto(`${BASE}/employees`, { waitUntil: 'networkidle' });
  await page.locator('table tbody tr').first().waitFor({ timeout: 120000 });
}

function attachEmployeeApiLog(page) {
  const events = [];
  page.on('response', async (res) => {
    const url = res.url();
    if (!url.includes('/api/v1/employees')) return;
    const method = res.request().method();
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return;
    events.push({
      method,
      status: res.status(),
      url,
    });
  });
  return events;
}

function getActiveRows(page) {
  return page.locator('table tbody tr').filter({ has: page.locator('td') });
}

async function findRow(page, text) {
  const normalized = normalize(text);
  const rows = getActiveRows(page);
  const count = await rows.count();
  for (let i = 0; i < count; i += 1) {
    const row = rows.nth(i);
    const rowText = normalize(await row.innerText());
    if (rowText.includes(normalized)) {
      return row;
    }
  }

  const search = page.locator('#employee-search');
  if (await search.isVisible().catch(() => false)) {
    await search.fill(text);
    const button = page.locator('button:has-text("Search")').first();
    if (await button.isVisible().catch(() => false)) {
      await button.click();
      await page.waitForTimeout(900);
    }

    const rows2 = getActiveRows(page);
    const count2 = await rows2.count();
    for (let i = 0; i < count2; i += 1) {
      const row = rows2.nth(i);
      const rowText = normalize(await row.innerText());
      if (rowText.includes(normalized)) {
        return row;
      }
    }
  }

  return null;
}

async function openAddEmployee(page) {
  await page.locator('button:has-text("Add Employee")').first().click();
  await page.locator('h2:has-text("Add New Employee")').waitFor({ timeout: 15000 });
}

async function fillCreate(page) {
  await page.fill('#emp-code', code);
  await page.fill('#emp-first-name', marker);
  await page.fill('#emp-last-name', 'Auto');
  await page.fill('#emp-work-email', email);
  await page.fill('#emp-password', 'Welcome@1234!');

  await page.locator('button:has-text("Employment")').click();
  await page.fill('#emp-designation', 'QA Automation Engineer');
  await page.selectOption('#emp-employment-type', 'FULL_TIME');

  const departments = await page.locator('#emp-department option').evaluateAll((nodes) =>
    nodes.map((node) => ({ value: node.value, text: (node.textContent || '').toLowerCase() })).filter((o) => o.value)
  );

  if (!departments.length) {
    throw new Error('No departments found in create modal');
  }
  const eng = departments.find((d) => d.text.includes('engineering')) ?? departments[0];
  await page.selectOption('#emp-department', eng.value);

  const join = await page.locator('#emp-joining-date').inputValue();
  if (!join) {
    await page.fill('#emp-joining-date', new Date().toISOString().split('T')[0]);
  }
}

async function submitCreate(page) {
  const btn = page.locator('button[type="submit"]').filter({ hasText: 'Add Employee' }).last();
  const postPromise = page.waitForResponse(
    (res) => res.url().includes('/api/v1/employees') && res.request().method() === 'POST',
    {timeout: 30000}
  );
  await btn.click();
  const resp = await postPromise.catch(async () => {
    const busySubmit = await page.getByRole('button', {name: /Add Employee/i}).isDisabled().catch(() => null);
    const errors = await page.locator('p.text-danger-500, p.text-danger-400, [role=\"alert\"]').allTextContents();
    const fieldValues = await Promise.all([
      page.locator('#emp-code').inputValue(),
      page.locator('#emp-first-name').inputValue(),
      page.locator('#emp-last-name').inputValue(),
      page.locator('#emp-work-email').inputValue(),
      page.locator('#emp-password').inputValue(),
      page.locator('#emp-designation').inputValue(),
      page.locator('#emp-employment-type').inputValue(),
      page.locator('#emp-department').inputValue(),
      page.locator('#emp-joining-date').inputValue(),
    ]);
    console.log('CREATE_NO_REQUEST', JSON.stringify({ busySubmit, errors, fieldValues }, null, 2));
    throw new Error('create request not sent');
  });
  console.log('CREATE_STATUS', resp.status(), resp.url());
  await page.waitForTimeout(2500);
}

async function openProfile(page, row) {
  const viewButton = row.locator('button[aria-label^="View "]').first();
  await viewButton.click();
  const dialog = page.locator('[role="dialog"][aria-label*="profile"]').first();
  await dialog.waitFor({ timeout: 15000 });
  return dialog;
}

async function openEditFromProfile(page, dialog) {
  await dialog.locator('button:has-text("Edit")').click();
  await page.waitForURL(/\/employees\/[^/]+\/edit$/, { timeout: 25000 });
}

async function saveProfileEdits(page) {
  const save = page.getByRole('button', { name: /Save Changes/i });
  const savePromise = page.waitForResponse(
    (res) => res.url().includes('/api/v1/employees') && ['PUT', 'PATCH'].includes(res.request().method()),
    {timeout: 30000}
  );
  await save.click();
  const resp = await savePromise.catch(async () => {
    const err = await page.locator('p.text-danger-500, p.text-danger-400, [role=\"alert\"]').allTextContents();
    const url = page.url();
    throw new Error(`edit request not observed; url=${url}; errors=${err.join(' | ')}`);
  });
  console.log('EDIT_STATUS', resp.status(), resp.url());
  await page.waitForTimeout(2500);
}

async function deleteFromRow(page, row) {
  const delBtn = row.locator('button[aria-label^="Delete "]').first();
  await delBtn.click();
  const confirmBtn = page.locator('[role="dialog"]').filter({ hasText: 'Delete Employee' }).locator('button:has-text("Delete")');
  await confirmBtn.waitFor({ timeout: 12000 });
  await confirmBtn.click();
  await page.waitForTimeout(2500);
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const logs = attachEmployeeApiLog(page);

  try {
    await login(page);
    await goEmployees(page);
    await shot(page, `HR_ADMIN__employees__before-create__${marker}`);

    await openAddEmployee(page);
    await fillCreate(page);
    await submitCreate(page);

    await page.waitForTimeout(2500);
    await goEmployees(page);
    await shot(page, `HR_ADMIN__employees__after-create__${marker}`);

    const createRow = await findRow(page, email);
    if (!createRow) {
      const errs = await page.locator('p.text-danger-500').allTextContents();
      throw new Error(`Created employee row not found. Validation errors: ${errs.join(' | ') || 'none'}`);
    }

    const dialog = await openProfile(page, createRow);
    await openEditFromProfile(page, dialog);
    await page.fill('#employee-edit-first-name', editedName);
    await saveProfileEdits(page);

    await goEmployees(page);
    await shot(page, `HR_ADMIN__employees__after-edit__${marker}`);

    const editedRow = await findRow(page, editedName);
    if (!editedRow) {
      const fallback = await findRow(page, email);
      if (!fallback) {
        throw new Error('Edited row not visible in list after save');
      }
      const rowText = await fallback.innerText().catch(() => '');
      console.log('EDIT_ROW_TEXT', rowText);
      if (!normalize(rowText).includes(normalize(editedName))) {
        throw new Error(`Employee row present by email but first name not updated. Row text: ${rowText}`);
      }
    }

    const finalRow = (await findRow(page, editedName)) || (await findRow(page, email));
    if (!finalRow) {
      throw new Error('Edited row not visible in list after save');
    }

    await deleteFromRow(page, finalRow);
    await goEmployees(page);
    await shot(page, `HR_ADMIN__employees__after-delete__${marker}`);

    const removed = await findRow(page, editedName);
    if (removed) {
      throw new Error('Deleted row still appears in list');
    }

    const stale = await findRow(page, 'newjoiner@nulogic.io');
    if (stale) {
      await stale.click({ button: 'left' });
      await deleteFromRow(page, stale);
      await goEmployees(page);
      const stale2 = await findRow(page, 'newjoiner@nulogic.io');
      if (stale2) {
        throw new Error('Leftover newjoiner not deleted');
      }
    }

    return {
      marker,
      employeeEmail: email,
      created: true,
      edited: true,
      screenshots: [
        `HR_ADMIN__employees__before-create__${marker}`,
        `HR_ADMIN__employees__after-create__${marker}`,
        `HR_ADMIN__employees__after-edit__${marker}`,
        `HR_ADMIN__employees__after-delete__${marker}`,
      ],
      apiCalls: logs,
    };
  } finally {
    await page.close();
    await browser.close();
  }
}

run()
  .then((result) => console.log(JSON.stringify({ ok: true, result }, null, 2)))
  .catch((err) => {
    console.error(JSON.stringify({ ok: false, error: err.message }, null, 2));
    process.exit(1);
  });
