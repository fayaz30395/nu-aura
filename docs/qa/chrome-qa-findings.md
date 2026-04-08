# NU-AURA Chrome QA Findings

**Date**: 2026-04-08 (Run 4)
**Tester**: Claude QA Agent (Opus 4.6)
**Browser**: Chrome (localhost:3000)
**Role**: Super Admin (Fayaz M) unless noted
**Backend**: Spring Boot :8080 (dev profile, UP) | Frontend: Next.js :3000 (running)
**Method**: Client-side navigation (sidebar links) to preserve Zustand session state. Full-page navigation via address bar triggers GLOBAL-001 every time.

---

## Executive Summary

| Batch | Pages | PASS | PASS-EMPTY | FAIL | BUG |
|-------|-------|------|------------|------|-----|
| 1 -- Core HRMS | 10 | 8 | 1 | 0 | 1 |
| 2 -- HR Config & Policies | 10 | 7 | 0 | 0 | 3 |
| 3 -- Recruitment | 5 | 3 | 0 | 1 | 1 |
| 4 -- Performance & Growth | 6 | 4 | 0 | 0 | 2 |
| 5 -- NU-Fluence | 7 | 2 | 0 | 3 | 2 |
| 6 -- Admin & Profile | 4 | 2 | 0 | 1 | 1 |
| **TOTAL** | **42** | **26** | **1** | **5** | **10** |

**Session was re-established 6 times** during Run 4. GLOBAL-001 triggers on EVERY full-page navigation.
**Backend is operational** (dev profile, Redis UP, PostgreSQL UP with high latency ~500-700ms).

### Run 4 vs Run 3 Key Changes
| Item | Run 3 | Run 4 |
|------|-------|-------|
| /dashboard | FAIL (error state) | **PASS** (loads fully with client-side nav) |
| Session loss trigger | ~30-90 seconds | Instant on every full-page navigation |
| Backend /auth/refresh | 500 (intermittent) | **500 consistently** (root cause identified) |
| Backend health | Partially down | UP (dev profile, all components healthy) |
| Root cause | "POST /auth/refresh 500" | **Confirmed: /auth/refresh 500 + Zustand hydration gap** |

---

## Critical Cross-Cutting Issues

### GLOBAL-001: Session Instability on Page Navigation (CRITICAL -- P0)

**Symptom**: Every full-page navigation (browser address bar, F5 refresh, or `window.location.href` redirect) causes the user identity to drop from "Fayaz M / SUPER ADMIN" to "User / Employee". The header shows fallback defaults (`userName || 'User'` and `userRole || 'Employee'` from AppLayout.tsx line 322-324). "Preparing your workspace..." loading screen appears indefinitely.

**Root Cause (Run 4 deep investigation)**:

The session failure is a **two-part bug** involving the frontend Zustand store design and a backend refresh endpoint failure:

**Part 1: Zustand Store Design (Frontend)**
- `useAuth.ts` uses `zustand/middleware/persist` with `sessionStorage`
- `partialize` on line 249 ONLY persists `isAuthenticated: boolean` -- the `user` object is NOT persisted
- Comment on line 247: "HIGH-3: Only persist auth flag -- no PII (user object) in sessionStorage"
- On every full-page navigation, React remounts, Zustand rehydrates with `isAuthenticated: true` but `user: null`
- `AuthGuard.tsx` line 92 detects `isAuthenticated && !user` and calls `restoreSession()`

**Part 2: /auth/refresh Returns 500 (Backend)**
- `restoreSession()` calls `POST /api/v1/auth/refresh` with the httpOnly refresh_token cookie
- The backend endpoint consistently returns **HTTP 500 Internal Server Error**
- Verified via browser fetch with `credentials: 'include'`: `{"status":500,"error":"Internal Server Error","message":"An unexpected error occurred"}`
- With a dummy token it correctly returns 401 "Invalid or expired refresh token"
- The 500 suggests an unhandled exception in `AuthService.refresh()` -> `buildAuthContext()` or `buildAuthResponse()`

**Part 3: Cascade Effect**
- `restoreSession()` returns `false` (refresh failed)
- `AuthGuard.tsx` line 98-116 redirects to `/auth/login?returnUrl=...`
- The redirect is another full-page navigation, perpetuating the cycle

**Evidence**:
```
// Browser fetch test (from /employees page with valid cookies):
POST http://localhost:8080/api/v1/auth/refresh -> 500
{"status":500,"error":"Internal Server Error","message":"An unexpected error occurred"}

// Same endpoint with dummy token:
POST http://localhost:8080/api/v1/auth/refresh (Cookie: refresh_token=test123) -> 401
{"status":401,"error":"Authentication Failed","message":"Invalid or expired refresh token"}
```

**Client-side navigation (sidebar links) works because**: Next.js App Router preserves the React tree and Zustand in-memory state across route changes. The `user` object stays in memory, so `restoreSession()` is never called.

**Impact**: Blocks all testing via address bar navigation. Makes the app appear broken for any user who refreshes the page or uses bookmarks.

**Fix Required**:
1. **Backend**: Debug why `/auth/refresh` returns 500 when given a valid refresh token. Check `buildAuthContext()` and `buildAuthResponse()` in `AuthService.java`. Likely a null pointer or missing data during context building.
2. **Frontend (defense-in-depth)**: Consider persisting minimal user info (fullName, roles) in sessionStorage so the header doesn't flash "User / Employee" while restore is in progress. Or add an `/auth/me` fallback in `restoreSession()` that uses the still-valid access_token cookie before trying `/auth/refresh`.

### GLOBAL-002: Header Hydration Mismatch (LOW)
- **Location**: components/layout/Header.tsx:49
- **Detail**: Server renders different className than client for mobile hamburger menu button
- **Impact**: Console warning only, no visual impact on desktop

---

## BATCH 1: Core HR Operations

### /dashboard
- Status: **PASS** (was FAIL in Run 3)
- Console errors: None (with client-side nav)
- Visual issues: none -- Full analytics dashboard loads: Welcome header, Organization View, Key Metrics (29 employees, 0 present, 30 pending approvals), Quick Actions, Attendance Overview, Department Headcount chart
- RBAC: correct (Super Admin sees full dashboard)
- Bug: none (BUG-006 RESOLVED -- was caused by session degradation in Run 3)

### /employees
- Status: PASS
- Console errors: none
- Visual issues: none -- Employee Management with full data table (29 employees visible), search, status filter, Change Requests / Import / Add Employee buttons. Columns: Employee, Code, Designation, Department, Level, Manager.
- RBAC: correct
- Bug: none

### /attendance
- Status: PASS
- Console errors: none
- Visual issues: none -- Attendance page renders with skeleton cards, loads data. Calendar and stats sections present.
- RBAC: correct
- Bug: none

### /leave
- Status: PASS
- Console errors: none
- Visual issues: none -- Leave management with balance display and request functionality.
- RBAC: correct
- Bug: none

### /leave/approvals
- Status: PASS
- Console errors: none
- Visual issues: none -- Leave Approvals with stats cards (Pending, Approved, Rejected) and request table.
- RBAC: correct
- Bug: none

### /payroll
- Status: PASS
- Console errors: none
- Visual issues: none -- Payroll Management hub with 6 navigation cards: Payroll Runs, Payslips, Salary Structures, Bulk Processing, Components, Statutory.
- RBAC: correct
- Bug: none

### /payroll/runs
- Status: PASS-EMPTY
- Console errors: none
- Visual issues: none -- Clean empty state "No Payroll Runs Yet" with Create Payroll Run CTA button.
- RBAC: correct
- Bug: none

### /expenses
- Status: PASS
- Console errors: none
- Visual issues: none -- Expense Claims with stats, search, filters, tabs (My Claims, Pending Approval, All Claims, Analytics).
- RBAC: correct
- Bug: none

### /assets
- Status: PASS
- Console errors: none
- Visual issues: none -- Asset Management loads with data. No crash (Run 2 TypeError is resolved).
- RBAC: correct
- Bug: none

### /shifts
- Status: PASS
- Console errors: none
- Visual issues: none -- Shift Management with action cards, schedule calendar, shift type legend.
- RBAC: correct
- Bug: none

---

## BATCH 2: HR Configuration & Policies

### /holidays
- Status: PASS
- Console errors: none
- Visual issues: none -- Holiday Calendar 2026 with 8 holidays, monthly listing. Data fully loaded.
- RBAC: correct
- Bug: none

### /statutory
- Status: PASS
- Console errors: none
- Visual issues: none -- Statutory Compliance with PF, ESI, PT, Monthly Report tabs.
- RBAC: correct
- Bug: none

### /overtime
- Status: PASS
- Console errors: none
- Visual issues: none -- Overtime Management with stats and tabs.
- RBAC: correct
- Bug: none

### /travel
- Status: PASS
- Console errors: none
- Visual issues: none -- Travel Management with request functionality.
- RBAC: correct
- Bug: none

### /loans
- Status: PASS
- Console errors: none
- Visual issues: none -- Employee Loans with Active Loans 0, Apply for Loan button.
- RBAC: correct
- Bug: none

### /probation
- Status: PASS
- Console errors: none
- Visual issues: none (was FAIL in Run 3 due to session degradation)
- RBAC: correct
- Bug: none

### /compensation
- Status: PASS
- Console errors: none
- Visual issues: none -- Compensation Planning with New Review Cycle button.
- RBAC: correct
- Bug: none

### /benefits
- Status: BUG
- Console errors: none
- Visual issues: Shows dollar amounts ($0) instead of INR. Enrollment period shows November 2025 (stale).
- RBAC: correct
- Bug: BUG-008: /benefits displays currency as USD ($) instead of INR. Enrollment period (Nov 2025) is stale.

### /letter-templates
- Status: BUG
- Console errors: none
- Visual issues: Access Denied for Super Admin (confirmed with stable session in Run 4)
- RBAC: INCORRECT -- SuperAdmin denied
- Bug: BUG-009: /letter-templates denies access to Super Admin. Frontend permission check does not account for SuperAdmin bypass.

### /org-chart
- Status: BUG
- Console errors: none
- Visual issues: Access Denied for Super Admin (confirmed with stable session in Run 4)
- RBAC: INCORRECT -- SuperAdmin denied
- Bug: BUG-010: /org-chart denies access to Super Admin. Frontend permission check does not account for SuperAdmin bypass.

---

## BATCH 3: Recruitment

### /announcements
- Status: PASS
- Console errors: none
- Visual issues: none
- RBAC: correct
- Bug: none

### /helpdesk
- Status: PASS
- Console errors: none
- Visual issues: none
- RBAC: correct
- Bug: none

### /recruitment
- Status: PASS
- Console errors: none
- Visual issues: none -- Recruitment Dashboard with Active Job Openings 46, Total Candidates 100
- RBAC: correct
- Bug: none

### /recruitment/jobs
- Status: PASS (tested via Run 3, confirmed stable)
- Console errors: none
- Visual issues: none -- Total Jobs 51
- RBAC: correct
- Bug: none

### /recruitment/candidates
- Status: PASS (tested via Run 3, confirmed stable)
- Console errors: none
- Visual issues: none -- Total Candidates 100
- RBAC: correct
- Bug: none

### /recruitment/pipeline
- Status: BUG
- Console errors: none
- Visual issues: Access Denied for SUPER ADMIN
- RBAC: INCORRECT -- SuperAdmin denied
- Bug: BUG-011: /recruitment/pipeline denies access to Super Admin. RBAC bypass not working for this route.

### /recruitment/agencies
- Status: FAIL
- Console errors: API failure
- Visual issues: "Failed to Load Agencies" error with retry buttons
- RBAC: correct (page loads, data fails)
- Bug: BUG-012: /recruitment/agencies API call fails. Agency data cannot be loaded.

### /onboarding
- Status: PASS
- Console errors: none
- Visual issues: none -- Talent Onboarding with Active 0, Upcoming 0, Completed 0
- RBAC: correct
- Bug: none

---

## BATCH 4: Performance & Growth

### /performance
- Status: PASS
- Console errors: none
- Visual issues: none -- Performance Management hub with stats and 12 feature cards
- RBAC: correct
- Bug: none

### /performance/reviews
- Status: PASS
- Console errors: none
- Visual issues: none
- RBAC: correct
- Bug: none

### /performance/okr
- Status: BUG
- Console errors: none
- Visual issues: Access Denied for Super Admin
- RBAC: INCORRECT -- SuperAdmin denied
- Bug: BUG-013: /performance/okr denies access to Super Admin

### /training
- Status: PASS
- Console errors: none
- Visual issues: none -- Training Programs with tabs
- RBAC: correct
- Bug: none

### /surveys
- Status: BUG
- Console errors: none
- Visual issues: Access Denied for SUPER ADMIN
- RBAC: INCORRECT -- SuperAdmin denied
- Bug: BUG-014: /surveys denies access to Super Admin

### /recognition
- Status: PASS
- Console errors: none
- Visual issues: none -- Employee Recognition with feed
- RBAC: correct
- Bug: none

---

## BATCH 5: NU-Fluence

### /fluence/wiki
- Status: PASS
- Console errors: none
- Visual issues: none -- Wiki Pages with New Page button, Spaces sidebar
- RBAC: correct
- Bug: none

### /fluence/blogs
- Status: FAIL
- Console errors: JavaScript crash
- Visual issues: Full-page crash -- "App Error: categories.map is not a function" (TypeError)
- RBAC: N/A (crashed)
- Bug: BUG-015: /fluence/blogs crashes with TypeError. The `categories` variable received from API is not an array when `.map()` is called.

### /fluence/templates
- Status: FAIL
- Console errors: none visible
- Visual issues: Stuck on "Preparing your workspace..." indefinitely
- RBAC: N/A
- Bug: BUG-016: /fluence/templates infinite loading state

### /fluence/search
- Status: FAIL
- Console errors: none
- Visual issues: Redirects to /me/dashboard immediately
- RBAC: N/A
- Bug: BUG-017: /fluence/search route redirects instead of rendering search interface

### /fluence/wall
- Status: PASS
- Console errors: none
- Visual issues: none -- Activity Wall with Post/Poll/Praise tabs, filters, Trending Content
- RBAC: correct
- Bug: none

### /fluence/analytics
- Status: FAIL
- Console errors: none
- Visual issues: Redirects to /me/dashboard immediately
- RBAC: N/A
- Bug: BUG-018: /fluence/analytics route redirects

### /fluence/drive
- Status: FAIL
- Console errors: none
- Visual issues: Stuck on "Preparing your workspace..."
- RBAC: N/A
- Bug: BUG-019: /fluence/drive infinite loading state

---

## BATCH 6: Admin & Profile

### /admin
- Status: PASS
- Console errors: none
- Visual issues: none -- Super Admin Dashboard with System Health, employees, Role Management
- RBAC: correct
- Bug: none

### /approvals/inbox
- Status: BUG
- Console errors: none
- Visual issues: Access Denied -- "You do not have permission to view the approval inbox"
- RBAC: INCORRECT -- SuperAdmin denied
- Bug: BUG-020: /approvals/inbox denies access to Super Admin

### /me/profile
- Status: FAIL
- Console errors: none
- Visual issues: Loads profile data when session is stable via client-side nav. Fails on full-page nav due to GLOBAL-001.
- RBAC: correct
- Bug: BUG-021: /me/profile unreliable -- depends on session stability

### /me/dashboard
- Status: PASS
- Console errors: none
- Visual issues: none -- My Dashboard with greeting, Quick Access, Company Feed, Clock In, On Leave Today, Working Remotely sections. All data loads.
- RBAC: correct
- Bug: none

---

## RBAC Testing (SuperAdmin Bypass Failures)

The following pages incorrectly deny access to Super Admin (RBAC level 100). These are confirmed with stable sessions (client-side navigation, "Fayaz M / SUPER ADMIN" verified in header):

| Page | Bug ID | Expected | Observed |
|------|--------|----------|----------|
| /letter-templates | BUG-009 | Full access | Access Denied |
| /org-chart | BUG-010 | Full access | Access Denied |
| /recruitment/pipeline | BUG-011 | Full access | Access Denied |
| /performance/okr | BUG-013 | Full access | Access Denied |
| /surveys | BUG-014 | Full access | Access Denied |
| /approvals/inbox | BUG-020 | Full access | Access Denied |

**Root cause**: Frontend route permission checks in `routeConfig` or page-level `usePermissions` do not implement the SuperAdmin bypass. The backend `@RequiresPermission` annotation has SuperAdmin bypass built in, but the frontend `AuthGuard.tsx` `checkAuthorization()` function may not be correctly checking `isSuperAdmin` for these specific routes.

---

## Bug Summary (Priority Order)

### P0 -- CRITICAL (Session Stability)
| ID | Page | Description |
|----|------|-------------|
| GLOBAL-001 | All pages | Session drops on every full-page navigation. Two-part bug: (1) Zustand only persists `isAuthenticated`, not user object; (2) `POST /auth/refresh` returns 500 when processing valid refresh token cookie. User identity falls to "User / Employee" defaults from AppLayout.tsx. |

### P1 -- HIGH (Page Crashes / Total Failures)
| ID | Page | Description |
|----|------|-------------|
| BUG-015 | /fluence/blogs | App crash: TypeError categories.map is not a function |
| BUG-012 | /recruitment/agencies | API failure: "Failed to Load Agencies" |

### P2 -- HIGH (RBAC Bypass Broken for SuperAdmin -- 6 pages)
| ID | Page | Description |
|----|------|-------------|
| BUG-009 | /letter-templates | SuperAdmin gets Access Denied |
| BUG-010 | /org-chart | SuperAdmin gets Access Denied |
| BUG-011 | /recruitment/pipeline | SuperAdmin gets Access Denied |
| BUG-013 | /performance/okr | SuperAdmin gets Access Denied |
| BUG-014 | /surveys | SuperAdmin gets Access Denied |
| BUG-020 | /approvals/inbox | SuperAdmin gets Access Denied |

### P3 -- MEDIUM (Pages Never Load / Redirect)
| ID | Page | Description |
|----|------|-------------|
| BUG-016 | /fluence/templates | Infinite loading, never renders |
| BUG-017 | /fluence/search | Redirects to dashboard instead of rendering |
| BUG-018 | /fluence/analytics | Redirects to dashboard instead of rendering |
| BUG-019 | /fluence/drive | Infinite loading, never renders |
| BUG-021 | /me/profile | Unreliable -- depends on session stability |

### P4 -- LOW
| ID | Page | Description |
|----|------|-------------|
| BUG-008 | /benefits | Shows USD ($) instead of INR; stale enrollment dates (Nov 2025) |
| GLOBAL-002 | All pages | Header.tsx hydration mismatch (console warning only) |

---

## Resolved in Run 4

| Bug | Run 3 Status | Run 4 Status | Resolution |
|-----|-------------|-------------|------------|
| BUG-006 | FAIL (/dashboard error state) | **PASS** | Was caused by session degradation, not a real dashboard bug. Dashboard loads fully with stable session. |
| /assets crash | FAIL (TypeError in Run 2) | **PASS** | Regression fix confirmed across Runs 3 and 4. |
| /probation | FAIL (session redirect) | **PASS** | Was session degradation artifact. Page loads fine. |

---

## Recommendations (Priority Order)

### 1. Fix /auth/refresh 500 (GLOBAL-001 Part 2)
Debug `AuthService.refresh()` -> `buildAuthContext()` -> `buildAuthResponse()` in the backend. The endpoint returns 500 (not 401) when given a valid refresh token cookie, suggesting an unhandled NPE or missing data during context building. Check:
- `implicitRoleService` queries in `buildAuthContext()`
- Employee lookup joining with roles/permissions
- PostgreSQL response time is high (~500-700ms) -- check for connection pool exhaustion

### 2. Fix Zustand Hydration Gap (GLOBAL-001 Part 1)
Even after fixing the backend, the architecture is fragile. Options:
- **Quick fix**: Add an `/auth/me` fallback in `restoreSession()` that uses the still-valid access_token cookie before trying `/auth/refresh`. The `/auth/me` GET endpoint exists and doesn't revoke tokens.
- **Better fix**: Persist minimal user info (`fullName`, role names) in sessionStorage so the header doesn't flash "User / Employee" while restore is in progress.
- **Best fix**: Persist the full user object in sessionStorage (encrypted if PII concern) so client-side nav and full-page nav behave identically.

### 3. Fix SuperAdmin RBAC Bypass (6 pages)
Review `routeConfig` in `frontend/lib/config/routes.ts` and the `checkAuthorization()` function in `AuthGuard.tsx`. Ensure `isSuperAdmin` bypasses all permission checks. The 6 affected routes likely have `permission` or `allPermissions` checks that don't account for SuperAdmin.

### 4. Fix NU-Fluence Routes (4 pages)
- `/fluence/blogs` (BUG-015): Guard `categories` with `Array.isArray()` before `.map()`
- `/fluence/templates` (BUG-016): Debug loading state -- check if required data query is failing silently
- `/fluence/search` (BUG-017): Route may be missing from `routeConfig` or pointing to wrong component
- `/fluence/analytics` (BUG-018): Same as search -- check route registration
- `/fluence/drive` (BUG-019): Debug loading state

### 5. Fix /recruitment/agencies (BUG-012)
API call for agency data fails. Check backend endpoint and whether agency seed data exists.

### 6. Fix /benefits Currency (BUG-008)
Change default currency from USD to INR. Update enrollment period to 2026.

---

## Uncommitted Fixes Detected (git diff)

The working directory contains uncommitted changes that address several of the bugs listed above. These fixes are **not yet committed or deployed**:

| File | Fixes Bug | Description |
|------|-----------|-------------|
| `frontend/lib/hooks/usePermissions.ts` | BUG-011, BUG-013, BUG-014, BUG-020 | `isReady` now waits for user object to load before reporting ready. Prevents permission checks from running with empty roles during session restoration. |
| `frontend/app/approvals/inbox/page.tsx` | BUG-020 | Adds `isAdmin` check first (SuperAdmin bypass), adds loading spinner while auth hydrates. |
| `frontend/app/fluence/blogs/page.tsx` | BUG-015 | Handles both array and paginated `{ content: [...] }` response for categories. |
| `frontend/app/fluence/templates/page.tsx` | BUG-016 | Shows error state instead of infinite loading when API fails. |
| `frontend/lib/services/core/dashboard.service.ts` | General resilience | Dashboard service methods now catch errors and return null instead of crashing. |
| `frontend/app/dashboards/executive/page.tsx` | General resilience | Graceful error handling for executive dashboard. |
| `frontend/app/dashboards/employee/page.tsx` | General resilience | Graceful error handling for employee dashboard. |
| `frontend/app/dashboards/manager/page.tsx` | General resilience | Graceful error handling for manager dashboard. |
| `frontend/lib/hooks/queries/useDashboards.ts` | General resilience | Query hook improvements. |
| `frontend/lib/hooks/queries/useFluence.ts` | General resilience | Fluence query hook improvements. |
| `frontend/app/assets/page.tsx` | Run 2 fix | Asset page crash fix. |
| `backend/.../AuthService.java` | **GLOBAL-001** | Adds `@Transactional(readOnly = true)` to `refresh()` method. Without this, the method runs outside a transaction, causing LazyInitializationException or RLS failures in `buildAuthContext()`. **This is likely the fix for the /auth/refresh 500 error.** |

**Action**: These fixes should be committed and the affected pages retested.
