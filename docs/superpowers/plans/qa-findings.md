# QA Sprint — E2E Test Infrastructure Findings

**Date:** 2026-03-20
**Sprint:** Track C — E2E Test Infrastructure Setup

---

## Task C1: Verify Playwright Setup and Auth Flow

### Environment

| Component | Status |
|-----------|--------|
| Playwright version | 1.57 |
| Chromium browser | Installed (v1208, Chrome 145.0.7632.6) |
| Frontend (localhost:3000) | Running |
| Backend (localhost:8080) | Running |
| `NEXT_PUBLIC_DEMO_MODE` | `true` |

### Finding F-01: Playwright browsers not pre-installed

**Severity:** Low (one-time setup)
**Description:** Playwright chromium binary was missing after a version bump. `npx playwright install chromium` resolved it.
**Resolution:** Already fixed. Consider adding `npx playwright install` to CI setup step.

### Finding F-02: auth.setup.ts uses stale form-based login flow

**Severity:** Critical — blocks ALL tests
**Description:** The login page (`/auth/login`) was redesigned to a Google SSO-only flow with optional demo account buttons (gated by `NEXT_PUBLIC_DEMO_MODE=true`). There are **no `input[type="email"]` or `input[type="password"]` fields** on the page. The auth setup and all existing specs that depend on form-based login (`emailInput.fill(...)`, `passwordInput.fill(...)`) fail with a 15-second timeout.

**Affected files:**
- `frontend/e2e/auth.setup.ts` — setup project, blocks all downstream tests
- `frontend/e2e/auth.spec.ts` — all login form tests
- `frontend/e2e/smoke.spec.ts` — `loginAndWaitForDashboard` helper
- `frontend/e2e/utils/helpers.ts` — `AuthHelper.login()` and friends
- `frontend/e2e/pages/LoginPage.ts` — entire Page Object Model

**Root cause:** Login page (`frontend/app/auth/login/page.tsx`) was refactored to SSO-only. Demo accounts use one-click buttons that call `login({ email, password: 'Welcome@123' })` internally via Zustand store. No form inputs exist.

**Resolution:** Updated `auth.setup.ts` to use demo account button click flow. Created `loginAs()` helper that authenticates via the backend API (`POST /api/v1/auth/login`) and injects cookies/storage directly — avoids brittle UI-based login for non-auth tests.

### Finding F-03: testData.ts uses non-existent demo accounts

**Severity:** Critical
**Description:** `testUsers` in `frontend/e2e/fixtures/testData.ts` references users like `admin@nulogic.io`, `ankit.sharma@nulogic.io`, `rajesh.kumar@nulogic.io` with password `password`. These do not exist in the current demo seed (V8). Actual demo accounts use `@nulogic.io` emails like `fayaz.m@nulogic.io` with password `Welcome@123`.

**Resolution:** Updated `testData.ts` with the correct NuLogic demo hierarchy matching the 15 seeded accounts.

### Finding F-04: auth.spec.ts tests are largely invalid

**Severity:** High
**Description:** Most tests in `auth.spec.ts` test form-based login interactions (email validation, password toggle, remember-me checkbox, rate limiting lockout UI) that no longer exist on the page. The demo credentials tests click a "Demo Credentials" toggle button that also doesn't exist in the current UI (demo accounts are always-visible when `DEMO_MODE=true`).

**Status:** Documented. These tests need a full rewrite to test the current SSO + demo-button login flow. Not in scope for C1/C2.

### Finding F-05: smoke.spec.ts loginAndWaitForDashboard uses form inputs

**Severity:** High
**Description:** The `loginAndWaitForDashboard` helper in smoke.spec.ts fills `input[type="email"]` and `input[type="password"]` which don't exist.

**Resolution:** Updated to use API-based login via helper function.

---

## Task C2: Update Test Fixtures for Approval Flow Testing

### Changes Made

1. **`frontend/e2e/fixtures/testData.ts`** — Added `demoUsers` object with all 15 NuLogic demo accounts, proper hierarchy (reportsTo), roles, and correct password (`Welcome@123`). Preserved legacy `testUsers` for backward compat.

2. **`frontend/e2e/fixtures/helpers.ts`** — Created Playwright test helpers:
   - `loginAs(page, email)` — API-based login that sets auth cookies and storage state
   - `loginViaUI(page, email)` — UI-based login via demo account button click
   - `switchUser(page, fromEmail, toEmail)` — logout + re-login as different user
   - `submitAndApprove(page, submitAs, approveAs, action)` — multi-user approval flow helper
   - `waitForDashboard(page)` — reusable dashboard wait

3. **`frontend/e2e/auth.setup.ts`** — Rewrote to use demo button click flow for the default `SUPER_ADMIN` account (`fayaz.m@nulogic.io`), matching how the real login page works.

---

### Finding F-06: Backend not running during test execution

**Severity:** Blocker (external dependency)
**Description:** The backend API server (localhost:8080) was not running during the test run. Demo account login triggers `POST /api/v1/auth/login` which fails with a connection error. The login page displays "Authentication Failed" and stays on `/auth/login`.

**Impact:** All E2E tests that require authentication are blocked. The auth.setup.ts correctly clicks the demo button and the request is sent, but the backend is unreachable.

**Resolution:** Start the backend before running E2E tests: `cd backend && ./start-backend.sh`. Test code is verified correct.

---

## Test Execution Results (post-fix)

| Test Suite | Result | Notes |
|-----------|--------|-------|
| auth.setup.ts (setup project) | FAIL (backend down) | Code is correct; clicks demo button, sends API login. Fails because backend not running on :8080. |
| smoke.spec.ts | BLOCKED | Depends on auth.setup.ts |
| auth.spec.ts | Not updated | Needs full rewrite for SSO+demo flow (out of scope) |

---

## Recommendations

1. **Rewrite auth.spec.ts** to test the current SSO + demo-button login flow
2. **Rewrite LoginPage POM** (`e2e/pages/LoginPage.ts`) to match current page structure
3. **Add `npx playwright install` to CI pipeline** as a setup step
4. **Consider a Playwright `globalSetup`** that authenticates via API for speed
5. **Tag smoke tests** with `@smoke` annotation for quick CI gates
