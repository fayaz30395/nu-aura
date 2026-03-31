# NU-AURA Platform — Round 3 Revalidation Handoff Prompt

> **Purpose**: Continue the Round 3 UI revalidation of the NU-AURA HRMS platform. This document gives a new Cowork session everything needed to resume exactly where the previous session left off.

---

## What You're Doing

The user (Fayaz) said: **"fixed, can you do a thorough revalidation in UI with all different userlogins and validate this fixed. Then start as fresh lookup for new open issues"**

This is **Round 3** of a "fix → revalidate" cycle. Rounds 1 and 2 already produced Excel (.xlsx) audit reports. Round 3 must:

1. Test ALL 8 demo user logins via the browser UI
2. Validate that previous issues are actually fixed
3. Find **new** open issues (deep code scan + UI testing)
4. Deliver results as an **Excel (.xlsx) report** (use the `xlsx` skill)

---

## Project Location

- **Frontend**: `/sessions/charming-nifty-dirac/mnt/nu-aura/frontend/`
- **Backend**: `/sessions/charming-nifty-dirac/mnt/nu-aura/backend/`
- **App URL**: `http://localhost:3000`
- **Backend API**: `http://localhost:8080` (runs on host, NOT in VM — use browser JS `fetch()` or Chrome tools to test APIs, NOT `curl`)

---

## What Has Already Been Done in Round 3

### 1. Auth Response Structure Analysis (COMPLETED)
The backend refactored its login response:
- `roles` changed from `Array<{code, name, permissions[]}>` to `string[]` (just role codes)
- New top-level `permissions: string[]` field with flat permission strings
- JWT token size reduced from ~4,100 bytes to ~680 bytes (JWT no longer contains permissions)

### 2. Demo Account Login API Tests (COMPLETED)
Tested all 8 accounts via `fetch()` in browser:

| Account | Email | Role | API Status |
|---------|-------|------|------------|
| Fayaz M | fayaz.m@nulogic.io | SUPER_ADMIN | ✅ 200 |
| Mani S | mani@nulogic.io | TEAM_LEAD | ✅ 200 (NEW — was 401) |
| Gokul R | gokul@nulogic.io | TEAM_LEAD | ✅ 200 (NEW — was 401) |
| Sumit Kumar | sumit@nulogic.io | MANAGER | ❌ 401 (STILL BROKEN) |
| Saran V | saran@nulogic.io | EMPLOYEE | ❌ 401 (STILL BROKEN) |
| Jagadeesh N | jagadeesh@nulogic.io | HR_MANAGER | ❌ 401 (REGRESSION — was 200 in Round 2) |
| Suresh M | suresh@nulogic.io | RECRUITMENT_ADMIN | ❌ 401 |
| Dhanush A | dhanush@nulogic.io | TEAM_LEAD | ❌ 401 |

**Password for all**: `Welcome@123`
**Demo mode env var**: `NEXT_PUBLIC_DEMO_MODE=true`

### 3. SuperAdmin UI Testing (PARTIALLY COMPLETED)
- ✅ Fayaz M (SUPER_ADMIN) login via UI: **Works** — dashboard loads at `/me/dashboard`
- ✅ Employees page (`/employees`): **Works** — table loads with all employee data
- ❌ Payroll page (`/payroll`): **FAILS** — redirects back to `/me/dashboard` (permission guard issue)
- ❌ Other pages NOT YET TESTED: `/attendance`, `/leave`, `/recruitment`, `/performance`, `/admin/*`, app switcher

### 4. Auth Storage Analysis (COMPLETED)
Checked `sessionStorage['auth-storage']` after SuperAdmin login:
```
{
  user: {
    roles: [
      { id: 'SUPER_ADMIN', code: 'SUPER_ADMIN', name: 'SUPER ADMIN', permissions: [] },
      { id: 'SKIP_LEVEL_MANAGER', code: 'SKIP_LEVEL_MANAGER', name: 'SKIP LEVEL MANAGER', permissions: [] },
      { id: 'REPORTING_MANAGER', code: 'REPORTING_MANAGER', name: 'REPORTING MANAGER', permissions: [] }
    ]
  },
  isAuthenticated: true,
  // NOTE: No top-level "permissions" field in Zustand store
  // NOTE: All role.permissions arrays are EMPTY
}
```

---

## Critical Bugs Found So Far (Round 3)

### BUG R3-001: CRITICAL — Empty Permissions in Auth Store → All Permission Guards Fail
- **What**: After login, `role.permissions` arrays are empty in the Zustand auth store. The Zustand store has only `{ user, isAuthenticated }` — no top-level `permissions` field.
- **Impact**: The `usePermissions()` hook extracts permissions from `user.roles[].permissions[]` — gets an empty array. `hasPermission()` always returns `false`. `isSystemAdmin` is `false` (checks for `'SYSTEM:ADMIN'` in empty permissions).
- **Affected pages**: ALL pages using `hasPermission()` guards — at least 14 pages including payroll, compensation, dashboard, reports, approvals, attendance/regularization
- **Why SuperAdmin dashboard works**: The middleware (`middleware.ts`) checks role codes and lets SUPER_ADMIN through. The dashboard page itself may not have a strict `hasPermission()` guard.
- **Why SuperAdmin payroll fails**: `payroll/page.tsx` line 62 checks `hasPermission(Permissions.PAYROLL_VIEW)` which returns false → redirects to `/dashboard`
- **Root cause hypothesis**: The `useAuth.ts` `convertRolesToObjects()` function (line 40-52) maps `permissionStrings` into every role. But either:
  - (a) The backend returns empty `permissions[]` for SUPER_ADMIN specifically (since SuperAdmin bypasses permission checks server-side), OR
  - (b) The response body `permissions` field isn't being read correctly
- **Key files**:
  - `frontend/lib/hooks/useAuth.ts` lines 85-109 (login flow, roles/permissions extraction)
  - `frontend/lib/hooks/useAuth.ts` lines 40-52 (`convertRolesToObjects` function)
  - `frontend/lib/hooks/useAuth.ts` lines 18-35 (`decodeJwt` fallback)
  - `frontend/lib/hooks/usePermissions.ts` lines 585-612 (permission extraction from roles)
  - `frontend/lib/hooks/usePermissions.ts` lines 621-627 (`isSystemAdmin` check)
  - `frontend/lib/hooks/usePermissions.ts` lines 630-643 (`hasPermission` function)

### BUG R3-002: CRITICAL — `hasPermission()` Doesn't Check Admin Role
- **What**: `hasPermission()` only bypasses checks if `isSystemAdmin` is true (permission-based). It does NOT check `isAdmin` (role-based: SUPER_ADMIN/TENANT_ADMIN).
- **Impact**: Even if permissions were populated, the SYSTEM:ADMIN permission may not exist. SuperAdmin bypass should also be role-based.
- **Fix suggestion**: Add `isAdmin` check to `hasPermission()`:
  ```typescript
  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (isAdmin) return true; // <-- ADD THIS: SUPER_ADMIN bypasses all
      if (isSystemAdmin) return true;
      ...
    }
  );
  ```

### BUG R3-003: HIGH — 5 of 8 Demo Accounts Return 401
- **What**: Sumit Kumar, Saran V, Jagadeesh N, Suresh M, Dhanush A all get 401 on login
- **Impact**: Cannot test non-SuperAdmin user flows at all
- **Possible cause**: V49+ migration may have changed seeded user credentials, or email domain mismatch (login page uses `@nulogic.io` but DB may have different emails)
- **Key file**: Check Flyway migrations V49+ for user seed data vs `frontend/app/auth/login/page.tsx` lines 35-44

### BUG R3-004: MEDIUM — Soft Navigation Bug (Client-Side Routing)
- **What**: Using `window.location.href = '/payroll'` or the browser navigate tool sometimes shows stale content — the URL changes but the page content doesn't update
- **Workaround**: Use `window.location.replace()` for full page reloads, or click sidebar links directly
- **Impact**: Testing reliability issue; may also affect real users using browser back/forward

---

## What Still Needs To Be Done

### Phase 1: Complete SuperAdmin UI Testing
Test these pages as Fayaz M (already logged in):
- [ ] `/attendance` — attendance management
- [ ] `/leave` — leave management
- [ ] `/recruitment` — recruitment pipeline
- [ ] `/performance` — performance reviews
- [ ] `/admin/roles` — role management (uses `hasAnyRole` guard — should work)
- [ ] `/admin/settings` — system settings
- [ ] App switcher (waffle grid icon next to "NU-HRMS" in header) — test switching to NU-Hire, NU-Grow
- [ ] `/me/profile` — user profile
- [ ] `/me/payslips` — payslip view

### Phase 2: Test Working Non-SuperAdmin Accounts
Log out, then test Mani S and Gokul R via UI:
- These two now return 200 from the API
- Test if they can access the dashboard
- Test if they see appropriate sidebar items for their TEAM_LEAD role
- Verify permission guards behavior (with empty permissions, they'll likely be locked out of everything)

### Phase 3: Fresh Code Scan
Run a deep code scan for issues related to:
- [ ] Auth response contract: How does the backend's `AuthResponse` DTO structure compare to what the frontend expects?
- [ ] Permission population: Trace why `role.permissions` is empty in the store
- [ ] API endpoint coverage: Check for missing/broken endpoints (500 errors)
- [ ] Console errors: Check browser console for JS errors on each page
- [ ] Network errors: Check for failed API calls (4xx/5xx)
- [ ] TypeScript type mismatches between frontend interfaces and backend DTOs

### Phase 4: Generate Excel Report
Use the `xlsx` skill to generate `NU-AURA_Revalidation_Report_R3.xlsx` with sheets:
1. **Executive Summary** — overview of Round 3 findings
2. **Previous Issues Status** — validation of Round 2 fixes (FIXED/STILL OPEN/REGRESSION)
3. **New Issues Found** — all R3 bugs with severity, description, affected files, steps to reproduce
4. **Login Test Results** — all 8 accounts with status per round
5. **Page Access Matrix** — which pages work for which roles
6. **Permission Guard Analysis** — pages using hasPermission vs hasAnyRole vs isAdmin

Save to: `/sessions/charming-nifty-dirac/mnt/Autonomous AI Engineering Department/NU-AURA_Revalidation_Report_R3.xlsx`

---

## Key Architecture Context

### Permission Guard Patterns (3 types across 30+ pages)

**Pattern 1: `hasPermission(Permissions.X)` — 14 pages** (BROKEN due to empty permissions)
- payroll/*, compensation, dashboard, reports/*, approvals/inbox, attendance/regularization

**Pattern 2: `hasAnyRole(...ROLES)` — 12 pages** (WORKS — checks role codes directly)
- All `/admin/*` pages use `ADMIN_ACCESS_ROLES = [SUPER_ADMIN, TENANT_ADMIN, HR_ADMIN, HR_MANAGER]`

**Pattern 3: `isAdmin` utility — 6 pages** (WORKS — checks role codes)
- linkedin-posts, announcements, company-spotlight, helpdesk, me/payslips, admin/feature-flags

### Auth Flow (useAuth.ts)
```
Login API response → { accessToken, roles: string[], permissions: string[] }
                              ↓
            convertRolesToObjects(roleStrings, permissionStrings)
                              ↓
            Creates Role objects: { id, code, name, permissions: Permission[] }
            Maps ALL permissionStrings into EVERY role's permissions array
                              ↓
            Stored in Zustand: user.roles = Role[]
```

### Key Files
- `frontend/lib/hooks/useAuth.ts` — Login flow, JWT decode, role/permission conversion
- `frontend/lib/hooks/usePermissions.ts` — Permission checking hook (hasPermission, hasAnyRole, isAdmin)
- `frontend/middleware.ts` — Server-side auth routing, SuperAdmin bypass at lines 297-302
- `frontend/app/auth/login/page.tsx` — Demo accounts list, login UI
- `frontend/lib/config/apps.ts` — App definitions, route-to-app mapping
- `backend/src/main/java/**/config/SecurityConfig.java` — Backend security config

### Prior Reports (in project root `/sessions/charming-nifty-dirac/mnt/nu-aura/`)
- `BUG_ANALYSIS_REPORT.md` — Round 1: 12 bugs
- `CRITICAL_ISSUES_HOTFIX.md` — Hotfix guide
- `DETAILED_BUG_FINDINGS.md` — Extended analysis

### Prior Excel Reports (in workspace)
- `NU-AURA_Audit_Report.xlsx` — Round 1: 44 findings, 9 sheets
- `NU-AURA_Revalidation_Report.xlsx` — Round 2: 12 new issues, 5 sheets

---

## Important Technical Notes

1. **Backend runs on HOST, not in VM** — `curl localhost:8080` won't work. Use browser JavaScript `fetch()` via Chrome tools to test APIs.
2. **Soft navigation bug** — Use `window.location.replace('http://localhost:3000/path')` for reliable page navigation, not the browser navigate tool alone.
3. **Rate limiting** — Testing multiple logins rapidly triggers 429s. Wait 10+ seconds between login attempts.
4. **Flyway migrations** — Currently at V59. Next migration = V60 if needed. DO NOT use Liquibase (`db/changelog/`).
5. **DEMO_PASSWORD** — `Welcome@123` for all demo accounts when `NEXT_PUBLIC_DEMO_MODE=true`.

---

## How to Start

1. Open Chrome tools (`tabs_context_mcp`) and navigate to `http://localhost:3000`
2. The SuperAdmin session (Fayaz M) may still be active — check by taking a screenshot
3. If session expired, click the Fayaz M demo button on the login page to re-login
4. Continue testing from **Phase 1** above (attendance, leave, recruitment pages)
5. Then proceed through Phases 2-4
6. Final deliverable: Excel report saved to the workspace folder
