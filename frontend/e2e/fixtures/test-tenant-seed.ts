/**
 * Test Tenant Seed — Constants for E2E test users and tenant
 *
 * These map to the NuLogic demo tenant seeded by Flyway V8 (demo profile).
 * Role codes align with the CLAUDE.md Role Coverage Matrix.
 *
 * Usage:
 *   import { TEST_TENANT, TEST_USERS } from './test-tenant-seed';
 *
 *   test('admin can view employees', async ({ page }) => {
 *     // use TEST_USERS.admin.email / TEST_USERS.admin.password
 *   });
 */

// ── Tenant ────────────────────────────────────────────────────────────────────

export const TEST_TENANT = {
  code: 'TEST',
  name: 'Test Organization',
} as const;

// ── Role types (mirrors CLAUDE.md Role Coverage Matrix) ───────────────────────

export type TestUserRole =
  | 'SUPER_ADMIN'
  | 'HR_ADMIN'
  | 'HR_MANAGER'
  | 'DEPARTMENT_MANAGER'
  | 'EMPLOYEE';

export interface TestUser {
  email: string;
  password: string;
  role: TestUserRole;
}

// ── Shared password (Flyway V8 demo seed) ─────────────────────────────────────

const SHARED_PASSWORD = process.env.E2E_DEMO_PASSWORD ?? 'Welcome@123';

// ── Test users ────────────────────────────────────────────────────────────────

/**
 * TEST_USERS — one representative account per role.
 *
 * These are the real demo accounts in the nulogic.io tenant.
 * Override credentials via environment variables for CI:
 *   E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD
 *   E2E_HR_ADMIN_EMAIL / E2E_HR_ADMIN_PASSWORD
 *   E2E_HR_MANAGER_EMAIL / E2E_HR_MANAGER_PASSWORD
 *   E2E_MANAGER_EMAIL / E2E_MANAGER_PASSWORD
 *   E2E_EMPLOYEE_EMAIL / E2E_EMPLOYEE_PASSWORD
 */
export const TEST_USERS: Record<string, TestUser> = {
  /** SUPER_ADMIN — full platform access, bypasses all RBAC */
  admin: {
    email: process.env.E2E_ADMIN_EMAIL ?? 'fayaz.m@nulogic.io',
    password: process.env.E2E_ADMIN_PASSWORD ?? SHARED_PASSWORD,
    role: 'SUPER_ADMIN',
  },

  /** HR_ADMIN — broad HR data access across the platform */
  hrAdmin: {
    email: process.env.E2E_HR_ADMIN_EMAIL ?? 'sarankarthick.maran@nulogic.io',
    password: process.env.E2E_HR_ADMIN_PASSWORD ?? SHARED_PASSWORD,
    role: 'HR_ADMIN',
  },

  /** HR_MANAGER — HR module management, team-scoped HR ops */
  hrManager: {
    email: process.env.E2E_HR_MANAGER_EMAIL ?? 'jagadeesh@nulogic.io',
    password: process.env.E2E_HR_MANAGER_PASSWORD ?? SHARED_PASSWORD,
    role: 'HR_MANAGER',
  },

  /** DEPARTMENT_MANAGER — approval authority over own team */
  manager: {
    email: process.env.E2E_MANAGER_EMAIL ?? 'sumit@nulogic.io',
    password: process.env.E2E_MANAGER_PASSWORD ?? SHARED_PASSWORD,
    role: 'DEPARTMENT_MANAGER',
  },

  /** EMPLOYEE — self-service access to own records only */
  employee: {
    email: process.env.E2E_EMPLOYEE_EMAIL ?? 'saran@nulogic.io',
    password: process.env.E2E_EMPLOYEE_PASSWORD ?? SHARED_PASSWORD,
    role: 'EMPLOYEE',
  },
} as const;
