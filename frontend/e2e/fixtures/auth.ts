/**
 * Auth Fixture — Extended Playwright test base
 *
 * Provides an `authenticatedPage` fixture that authenticates via the backend
 * API (POST /api/v1/auth/login) rather than through the UI login flow.
 * The returned access token is injected into localStorage so the frontend
 * Zustand auth store picks it up on navigation.
 *
 * Usage:
 *   import { test, expect } from '../fixtures/auth';
 *
 *   test('my test', async ({ authenticatedPage }) => {
 *     await authenticatedPage.goto('/me/dashboard');
 *   });
 *
 * Override credentials via environment variables:
 *   E2E_AUTH_EMAIL      — defaults to the SUPER_ADMIN demo account
 *   E2E_AUTH_PASSWORD   — defaults to the shared demo password
 *   E2E_AUTH_TENANT_ID  — optional tenant UUID (omit for demo tenant)
 *   NEXT_PUBLIC_API_URL — defaults to http://localhost:8080/api/v1
 */

import {expect, type Page, test as base} from '@playwright/test';
import {DEMO_PASSWORD, demoUsers} from './testData';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AuthFixtures {
  /**
   * A Playwright Page that has been pre-authenticated via the backend API.
   * The access token is stored in localStorage under the key `auth-token`
   * so the frontend's Zustand store can hydrate it on navigation.
   */
  authenticatedPage: Page;
}

// ── Internal helper ───────────────────────────────────────────────────────────

/**
 * Authenticate via the backend API and inject the returned access token into
 * the page's localStorage.  Also allows Playwright to capture the httpOnly
 * auth cookies that the server sets via Set-Cookie headers.
 *
 * @param page    - Playwright Page instance (before any navigation)
 * @param email   - User email address
 * @param password - User password
 * @param tenantId - Optional tenant UUID; omit for the default demo tenant
 */
async function authenticateViaApi(
  page: Page,
  email: string,
  password: string,
  tenantId?: string
): Promise<void> {
  const body: Record<string, string> = {email, password};
  if (tenantId) {
    body['tenantId'] = tenantId;
  }

  const response = await page.request.post(`${API_BASE}/auth/login`, {
    data: body,
    failOnStatusCode: false,
  });

  if (!response.ok()) {
    const text = await response.text().catch(() => 'unknown error');
    throw new Error(
      `[auth fixture] Login failed for ${email}: HTTP ${response.status()} — ${text}`
    );
  }

  const json = await response.json() as {
    accessToken?: string;
    refreshToken?: string;
    tokenType?: string;
    userId?: string;
    tenantId?: string;
    email?: string;
    fullName?: string;
    roles?: string[];
    permissions?: string[];
  };

  if (!json.accessToken) {
    throw new Error(
      `[auth fixture] Login response for ${email} did not contain an accessToken`
    );
  }

  // Navigate to the app root first so localStorage is available on the
  // correct origin (Next.js serves from localhost:3000).
  await page.goto('/');

  // Inject the access token into localStorage.  The Zustand auth store reads
  // `auth-token` on hydration; `auth-storage` is the persisted store key.
  await page.evaluate(
    ({token, authData}: { token: string; authData: string }) => {
      localStorage.setItem('auth-token', token);
      // Also seed the Zustand persist key so the store hydrates immediately
      localStorage.setItem('auth-storage', authData);
    },
    {
      token: json.accessToken,
      authData: JSON.stringify({
        state: {
          token: json.accessToken,
          refreshToken: json.refreshToken ?? null,
          user: {
            id: json.userId ?? null,
            email: json.email ?? email,
            fullName: json.fullName ?? null,
            tenantId: json.tenantId ?? null,
            roles: json.roles ?? [],
            permissions: json.permissions ?? [],
          },
          isAuthenticated: true,
        },
        version: 0,
      }),
    }
  );
}

// ── Extended test fixture ─────────────────────────────────────────────────────

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({page}, use) => {
    const email =
      process.env.E2E_AUTH_EMAIL ?? demoUsers.superAdmin.email;
    const password =
      process.env.E2E_AUTH_PASSWORD ?? DEMO_PASSWORD;
    const tenantId = process.env.E2E_AUTH_TENANT_ID;

    await authenticateViaApi(page, email, password, tenantId);

    // Hand the authenticated page to the test
    await use(page);
  },
});

export {expect};
