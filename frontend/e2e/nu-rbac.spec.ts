import {expect, Page, test} from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import {demoUsers} from './fixtures/testData';

type Role =
  | 'SUPER_ADMIN'
  | 'TENANT_ADMIN'
  | 'HR_ADMIN'
  | 'HR_MANAGER'
  | 'MANAGER'
  | 'TEAM_LEAD'
  | 'EMPLOYEE'
  | 'RECRUITMENT_ADMIN'
  | 'FINANCE_ADMIN';

interface UC {
  id: string;
  route: string;
  role: Role;
  expect: 'render' | 'redirect' | 'render_scoped';
  redirect_target: string | null;
  severity_on_miss: 'P0' | 'P1' | 'P2' | 'P3';
}

const CATALOG = path.resolve(
  __dirname,
  '../../.claude/skills/nu-chrome-e2e/use-cases.yaml'
);
const OUT_DIR =
  process.env.NU_RBAC_OUT_DIR ||
  path.resolve(__dirname, '../../qa-reports/playwright-rbac/latest');
const ROLE_FILTER = (process.env.NU_RBAC_ROLE || '').toUpperCase();
const MAX_PER_ROLE = Number(process.env.NU_RBAC_MAX_PER_ROLE || '0');

fs.mkdirSync(OUT_DIR, {recursive: true});
const RESULTS = path.join(OUT_DIR, 'results.jsonl');

function parseCatalog(): UC[] {
  const raw = fs.readFileSync(CATALOG, 'utf8');
  const out: UC[] = [];
  let cur: Partial<UC> = {};
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s+- id:\s*(\S+)/);
    if (m) {
      if (cur.id && cur.category === 'RBAC') out.push(cur as UC);
      cur = {id: m[1]} as Partial<UC>;
      continue;
    }
    const kv = line.match(/^\s+(\w+):\s*(.+?)\s*$/);
    if (!kv || !cur.id) continue;
    const [, k, v] = kv;
    const val = v === 'null' ? null : v.replace(/^["']|["']$/g, '');
    (cur as Record<string, unknown>)[k] = val;
  }
  if (cur.id && (cur as UC & { category?: string }).category === 'RBAC') {
    out.push(cur as UC);
  }
  return out;
}

// Maps the 9 nu-chrome-e2e roles to the 6 distinct demo accounts on the login page.
// Roles that share an email share a session (same actual permissions).
const roleToDemo: Record<Role, keyof typeof demoUsers | null> = {
  SUPER_ADMIN: 'superAdmin',
  TENANT_ADMIN: 'superAdmin2',
  HR_ADMIN: 'hrManager',
  HR_MANAGER: 'hrManager',
  MANAGER: 'managerEng',
  TEAM_LEAD: 'teamLeadEng',
  EMPLOYEE: 'employeeSaran',
  RECRUITMENT_ADMIN: 'recruitmentAdmin',
  FINANCE_ADMIN: 'hrManager', // jagadeesh per skill creds
};

async function loginAs(page: Page, role: Role): Promise<boolean> {
  const key = roleToDemo[role];
  if (!key) return false;
  const user = (demoUsers as Record<string, { name: string; email: string; password: string }>)[
    key as string
    ];
  if (!user) return false;

  await page.goto('/auth/login', {waitUntil: 'domcontentloaded'});
  // Strategy 1: demo button (DEMO_MODE=true). Try first because it's atomic.
  const btn = page.locator('button').filter({hasText: user.name}).first();
  try {
    await btn.waitFor({state: 'visible', timeout: 5000});
    await btn.click();
    await page.waitForURL(/dashboard/i, {timeout: 30000});
    return true;
  } catch {
    // Strategy 2: email/password form fallback.
  }
  try {
    await page.locator('input[type="email"]').first().fill(user.email);
    await page.locator('input[type="password"]').first().fill(user.password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/dashboard/i, {timeout: 30000});
    return true;
  } catch {
    return false;
  }
}

function appendResult(row: Record<string, unknown>): void {
  fs.appendFileSync(RESULTS, JSON.stringify(row) + '\n');
}

const allUCs = parseCatalog();
const byRole = new Map<Role, UC[]>();
for (const uc of allUCs) {
  if (ROLE_FILTER && uc.role !== ROLE_FILTER) continue;
  const list = byRole.get(uc.role) || [];
  list.push(uc);
  byRole.set(uc.role, list);
}

// One Playwright project per role — Playwright runs them in parallel up to `workers`.
for (const [role, ucs] of byRole.entries()) {
  const slice = MAX_PER_ROLE > 0 ? ucs.slice(0, MAX_PER_ROLE) : ucs;
  test.describe(`RBAC ${role} (${slice.length} cases)`, () => {
    test.describe.configure({mode: 'serial'});
    let loggedIn = false;

    test.beforeAll(async ({browser}) => {
      const page = await browser.newPage();
      loggedIn = await loginAs(page, role);
      if (loggedIn) {
        await page
          .context()
          .storageState({path: path.join(OUT_DIR, `auth-${role}.json`)});
      } else {
        appendResult({
          uc: 'AUTH-' + role,
          role,
          route: '/auth/login',
          expected: 'login',
          observed: 'failed',
          status: 'AUTH_FAILED',
          severity: 'P0',
        });
      }
      await page.close();
    });

    for (const uc of slice) {
      test(uc.id, async ({browser}) => {
        if (!loggedIn) {
          test.skip();
          return;
        }
        const ctx = await browser.newContext({
          storageState: path.join(OUT_DIR, `auth-${role}.json`),
        });
        const page = await ctx.newPage();
        let observedUrl = '';
        let status: 'PASS' | 'FAIL' | 'ERROR' = 'PASS';
        let reason = '';
        try {
          await page.goto(uc.route, {waitUntil: 'domcontentloaded', timeout: 20000});
          await page.waitForLoadState('networkidle', {timeout: 8000}).catch(() => {
          });
          observedUrl = new URL(page.url()).pathname;
          if (uc.expect === 'render') {
            if (observedUrl !== uc.route && !observedUrl.startsWith(uc.route)) {
              status = 'FAIL';
              reason = `expected render at ${uc.route}, observed ${observedUrl}`;
            }
          } else if (uc.expect === 'redirect') {
            const tgt = uc.redirect_target || '/me/dashboard';
            if (!observedUrl.includes(tgt.replace(/^\//, ''))) {
              status = 'FAIL';
              reason = `expected redirect to ${tgt}, observed ${observedUrl}`;
            }
          } else if (uc.expect === 'render_scoped') {
            if (observedUrl !== uc.route) {
              status = 'FAIL';
              reason = `expected scoped render at ${uc.route}, observed ${observedUrl}`;
            }
          }
        } catch (e) {
          status = 'ERROR';
          reason = (e as Error).message.slice(0, 200);
        } finally {
          appendResult({
            uc: uc.id,
            role,
            route: uc.route,
            expected: uc.expect,
            redirect_target: uc.redirect_target,
            observed: observedUrl,
            status,
            reason,
            severity: uc.severity_on_miss,
            ts: new Date().toISOString(),
          });
          await ctx.close();
          if (status === 'FAIL' && uc.severity_on_miss === 'P0') {
            expect(reason).toBe('');
          }
        }
      });
    }
  });
}
