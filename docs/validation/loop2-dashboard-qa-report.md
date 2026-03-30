# Loop 2: Dashboards & Global Navigation - QA Report

> **QA Agent** | Sweep Loop 2 | 2026-03-31
> **Method:** Static code analysis (source-level reading, not browser testing)
> **Scope:** Dashboard routes (`/dashboard`, `/dashboards/executive`, `/dashboards/manager`, `/dashboards/employee`, `/me/dashboard`, `/home`), platform entry points (`/app/hrms`, `/app/hire`, `/app/grow`, `/app/fluence`), global navigation (Sidebar, Header, AppSwitcher, active app detection)

---

## 1. Test Execution Matrix

### 1.1 Dashboard Routes

| # | Route | Test Case | Status | Notes |
|---|-------|-----------|--------|-------|
| 1 | `/dashboard` | Data loading | PASS | Uses `useDashboardAnalytics`, `useAttendanceByDateRange`, `useMyTimeEntries`, `useOnboardingProcessesByStatus` -- all React Query |
| 2 | `/dashboard` | Loading state | PASS | Conditional `isAnalyticsLoading` renders NuAuraLoader spinner |
| 3 | `/dashboard` | Error handling | PARTIAL | Analytics error displayed as string. Google API errors caught per-service. No global error boundary at this route level. |
| 4 | `/dashboard` | RBAC (frontend) | PASS | Checks `hasPermission(Permissions.DASHBOARD_VIEW)` at line 137; redirects to `/me/dashboard` if missing |
| 5 | `/dashboard` | RBAC (backend) | PASS | Backend `DashboardController` has `@RequiresPermission(DASHBOARD_HR_OPS)` on `/api/v1/dashboard/metrics` |
| 6 | `/dashboard` | Empty state | PARTIAL | Most widgets render conditionally (e.g., `todayAttendance`, Google notifications). No explicit "no data" message for analytics section. |
| 7 | `/dashboard` | Cross-role | PASS | Employee without DASHBOARD_VIEW redirected to `/me/dashboard`; HR Admin/Manager with permission sees full dashboard |
| 8 | `/dashboards/executive` | Data loading | PASS | `useExecutiveDashboard(isAuthenticated && hasHydrated)` -- React Query, properly gated |
| 9 | `/dashboards/executive` | Loading state | PASS | Full `DashboardSkeleton` with grid skeleton cards |
| 10 | `/dashboards/executive` | Error handling | PASS | Explicit error card with "Try Again" button calling `refetch()` |
| 11 | `/dashboards/executive` | Error boundary | PASS | `error.tsx` exists at route level with categorized error display |
| 12 | `/dashboards/executive` | RBAC (frontend) | **FAIL** | DEF-35 -- No PermissionGate or `usePermissions` check. Only checks `isAuthenticated` and redirects to login if not. Any authenticated user can access. |
| 13 | `/dashboards/executive` | RBAC (backend) | PASS | `@RequiresPermission(Permission.DASHBOARD_EXECUTIVE)` on backend endpoint. Backend returns 403 for unauthorized roles. |
| 14 | `/dashboards/executive` | Empty state | PASS | Each widget section uses conditional rendering (`data.keyMetrics?.length > 0`, `data.strategicAlerts?.length > 0`). Strategic alerts shows "No active alerts" with CheckCircle icon. |
| 15 | `/dashboards/executive` | Financial data exposure | **FAIL** | DEF-36 -- Page renders full shell (title "Executive Dashboard", header, layout) before API call returns 403. Flash of protected UI reveals dashboard structure to unauthorized users. |
| 16 | `/dashboards/executive` | Widget navigation | N/A | No drill-down links from executive dashboard cards to detail pages |
| 17 | `/dashboards/manager` | Data loading | PASS | `useManagerDashboard(hasHydrated && isAuthenticated)` + `useManagerTeamProjects` -- both React Query |
| 18 | `/dashboards/manager` | Loading state | PASS | `DashboardSkeleton` component with grid skeletons |
| 19 | `/dashboards/manager` | Error handling | PASS | Error card with message display |
| 20 | `/dashboards/manager` | Error boundary | PASS | `error.tsx` exists at route level |
| 21 | `/dashboards/manager` | RBAC (frontend) | **FAIL** | DEF-37 -- No PermissionGate or `usePermissions` check. Only checks `isAuthenticated`. Any authenticated user can navigate here. |
| 22 | `/dashboards/manager` | RBAC (backend) | PASS | `@RequiresPermission(Permission.EMPLOYEE_VIEW_TEAM)` on backend. Returns 403 for non-managers. |
| 23 | `/dashboards/manager` | Empty state | PARTIAL | Error state renders on API failure (403), but the error message will say "Error Loading Dashboard" -- not a clear "You don't have access" message. |
| 24 | `/dashboards/manager` | Team projects retry | PASS | `useManagerTeamProjects` has custom retry logic: skips retry on 404 (endpoint not deployed) |
| 25 | `/dashboards/employee` | Data loading | PASS | `useEmployeeDashboard()` -- React Query, no conditional enable needed (self-service) |
| 26 | `/dashboards/employee` | Loading state | PASS | Full skeleton UI with grid cards |
| 27 | `/dashboards/employee` | Error handling | PASS | Error card with message + "Try Again" button (`window.location.reload()`) |
| 28 | `/dashboards/employee` | Error boundary | PASS | `error.tsx` exists at route level |
| 29 | `/dashboards/employee` | RBAC (frontend) | PASS-ISH | No frontend gate, but this is self-service data. Backend requires `EMPLOYEE_VIEW_SELF` or `SYSTEM_ADMIN`. |
| 30 | `/dashboards/employee` | RBAC (backend) | PASS | `@RequiresPermission({Permission.EMPLOYEE_VIEW_SELF, Permission.SYSTEM_ADMIN})` |
| 31 | `/dashboards/employee` | Empty state | PASS | Leave balances show "No leave balances available" with icon. Events show "No upcoming events". Attendance shows "No attendance records found". |
| 32 | `/dashboards/employee` | Widget navigation | PASS | Quick Actions section has buttons routing to `/me/attendance`, `/leave/apply`, `/me/payslips`, `/performance`, `/training` |
| 33 | `/me/dashboard` | Data loading | PASS | `useSelfServiceDashboard(user.employeeId)` -- React Query |
| 34 | `/me/dashboard` | RBAC | PASS | Self-service route, no permission gate needed (per CLAUDE.md: "MY SPACE items must NEVER have requiredPermission") |
| 35 | `/me/dashboard` | Spot-check | PASS | Previously validated in Loop 1; confirmed still functional |
| 36 | `/home` | Redirect behavior | PASS | Middleware at line 287 redirects `/home` and `/home/*` to `/me/dashboard`. Also has a `page.tsx` as client-side fallback. |
| 37 | `/home` | Redirect method | **NOTED** | Both middleware (server-side) and page.tsx (client-side via `useHomeDashboard`) handle `/home`. The page.tsx does NOT redirect -- it renders a full social-feed-style home page. See DEF-38. |

### 1.2 Platform Entry Points (`/app/*`)

| # | Route | Test Case | Status | Notes |
|---|-------|-----------|--------|-------|
| 38 | `/app/hrms` | Redirect target | PASS | `router.replace('/me/dashboard')` -- matches `PLATFORM_APPS.HRMS.entryRoute` |
| 39 | `/app/hire` | Redirect target | PASS | `router.replace('/recruitment')` -- matches `PLATFORM_APPS.HIRE.entryRoute` |
| 40 | `/app/grow` | Redirect target | PASS | `router.replace('/performance')` -- matches `PLATFORM_APPS.GROW.entryRoute` |
| 41 | `/app/fluence` | Redirect target | PASS | `router.push('/fluence/wiki')` -- matches `PLATFORM_APPS.FLUENCE.entryRoute` |
| 42 | `/app/fluence` | Redirect method inconsistency | **FAIL** | DEF-39 -- Uses `router.push` while all others use `router.replace`. This adds an unnecessary history entry. |
| 43 | `/app/*` | RBAC gating | **FAIL** | DEF-40 -- None of the `/app/*` entry points check if the user has access to the target app before redirecting. A user without recruitment permissions can navigate to `/app/hire` and get redirected to `/recruitment`, relying solely on that page's own gating (if any). |
| 44 | `/app/*` | Loading indicator | PASS | All show "Redirecting..." message in a centered card while `useEffect` fires |

### 1.3 App Switcher (Waffle Grid)

| # | Test Case | Status | Notes |
|---|-----------|--------|-------|
| 45 | Apps displayed | PASS | `APP_LIST` renders all 4 apps sorted by `order` in a 2x2 grid |
| 46 | Active app indicator | PASS | Active app shows check badge and accent styling |
| 47 | Lock icon for unauthorized | PASS | `isLocked` shows Lock icon overlay + "No access" text when `!hasAppAccess(code)` |
| 48 | Lock icon for unavailable | PASS | Shows "Coming soon" text for `!available` apps |
| 49 | Disabled click on locked | PASS | `disabled={isLocked}` prevents navigation |
| 50 | Keyboard escape to close | PASS | Escape key handler in `useEffect` |
| 51 | Click outside to close | PASS | `mousedown` listener on document |
| 52 | Navigation fallback | PASS | 3-second timeout with hard navigation fallback if `router.push` fails |
| 53 | RBAC fallback permissiveness | **FAIL** | DEF-41 -- `hasAppAccess` returns `true` when `permissions.length === 0` (line 64 of `useActiveApp.ts`). During the brief window between auth hydration and permission loading, ALL apps appear unlocked. |
| 54 | aria-label on trigger | PASS | `aria-label="Switch application"` with `aria-expanded` |

### 1.4 Global Navigation: Header

| # | Test Case | Status | Notes |
|---|-----------|--------|-------|
| 55 | AppSwitcher integration | PASS | Header renders `<AppSwitcher />` component |
| 56 | Notification badge | PASS | Uses `Math.max(wsUnreadCount, persistedUnreadCount)` -- WebSocket + REST fallback |
| 57 | SSR hydration safety | PASS | `isMounted` state flag prevents hydration mismatch |
| 58 | Theme toggle | PASS | `<ThemeToggle />` component present |
| 59 | Global search | PASS | Lazy-loaded `GlobalSearch` via `dynamic()` with `ssr: false` |
| 60 | User menu | PASS | `<UserMenu />` component with dropdown |

### 1.5 Global Navigation: Sidebar (App-Aware Sections)

| # | Test Case | Status | Notes |
|---|-----------|--------|-------|
| 61 | Active app detection | PASS | `useActiveApp()` uses `getAppForRoute(pathname)` to determine current app |
| 62 | Section filtering | PASS | `AppLayout` filters sidebar sections via `APP_SIDEBAR_SECTIONS[appCode]` |
| 63 | HRMS sections | PASS | 8 sections: home, my-space, people, hr-ops, finance, projects-workspace, reports-analytics, admin |
| 64 | HIRE sections | PASS | 1 section: hire-hub |
| 65 | GROW sections | PASS | 1 section: grow-hub |
| 66 | FLUENCE sections | PASS | 1 section: fluence-hub |
| 67 | Default fallback | PASS | Unknown routes default to HRMS via `getAppForRoute` fallback |
| 68 | Route mapping priority | PASS | HIRE/GROW/FLUENCE checked before HRMS catch-all to avoid prefix collisions |

### 1.6 App Config (`apps.ts`)

| # | Test Case | Status | Notes |
|---|-----------|--------|-------|
| 69 | Entry routes match redirects | PASS | `HRMS.entryRoute='/me/dashboard'`, `HIRE.entryRoute='/recruitment'`, `GROW.entryRoute='/performance'`, `FLUENCE.entryRoute='/fluence/wiki'` -- all match `/app/*` page redirects |
| 70 | Route prefix completeness | PASS | Comprehensive route prefix lists for each app |
| 71 | NU-Fluence availability | **NOTED** | `available: true` but CLAUDE.md says "Phase 2: frontend routes defined, UI not started". Users can navigate to Fluence but will likely hit empty/stub pages. |
| 72 | Duplicate route prefix `/me` | **NOTED** | HRMS `routePrefixes` lists `/me` twice (lines 59 and 62). Harmless but sloppy. |

---

## 2. Defects Found

### DEF-35: Executive Dashboard has NO frontend permission gate (CRITICAL)

| Field | Value |
|-------|-------|
| **Bug ID** | DEF-35 |
| **Module** | Dashboard |
| **Route** | `/dashboards/executive` |
| **Role** | Employee, Manager (any authenticated non-executive) |
| **Severity** | HIGH |
| **Reproduction** | 1. Log in as a regular Employee. 2. Navigate to `/dashboards/executive`. 3. Page renders the full dashboard shell (title, header, layout, skeleton). 4. API call returns 403. 5. Error card appears. |
| **Expected** | Frontend should check for `DASHBOARD:EXECUTIVE` permission before rendering anything, and show an "Access Denied" page or redirect. |
| **Actual** | Page only checks `isAuthenticated` (line 71). No `usePermissions` / `hasPermission` check. The page skeleton, title "Executive Dashboard", and layout chrome render before the API 403 replaces them with an error card. This leaks dashboard structure and confirms the existence of financial analytics features. |
| **Suspected Layer** | Frontend (`frontend/app/dashboards/executive/page.tsx`) |
| **Owner** | Frontend Developer |
| **Fix** | Add permission check similar to `/dashboard` page (which correctly checks `hasPermission(Permissions.DASHBOARD_VIEW)` and redirects). Add `if (!hasPermission(Permissions.DASHBOARD_EXECUTIVE)) { router.replace('/me/dashboard'); return; }` after hydration. |
| **Validation** | Verify that unauthorized users see redirect before any dashboard UI renders |

### DEF-36: Executive Dashboard flashes protected UI before 403 (MEDIUM)

| Field | Value |
|-------|-------|
| **Bug ID** | DEF-36 |
| **Module** | Dashboard |
| **Route** | `/dashboards/executive` |
| **Role** | Employee, Manager |
| **Severity** | MEDIUM |
| **Reproduction** | Same as DEF-35. Even with the 403, the loading skeleton renders inside the `AppLayout` wrapper with the title "Executive Dashboard" and subtitle "Comprehensive C-suite insights and analytics" visible. |
| **Expected** | No protected content structure should be visible to unauthorized users. |
| **Actual** | Lines 167-178: The loading state renders the full `AppLayout` with "Executive Dashboard" heading and description before data loading completes. When the API returns 403, the error handler replaces it, but the flash of protected UI is observable. |
| **Suspected Layer** | Frontend |
| **Owner** | Frontend Developer |
| **Fix** | Fixing DEF-35 (adding frontend permission check) will resolve this. The permission check should gate rendering before the loading skeleton. |
| **Validation** | Navigate as Employee, confirm no flash of dashboard UI |

### DEF-37: Manager Dashboard has NO frontend permission gate (HIGH)

| Field | Value |
|-------|-------|
| **Bug ID** | DEF-37 |
| **Module** | Dashboard |
| **Route** | `/dashboards/manager` |
| **Role** | Employee (non-manager) |
| **Severity** | HIGH |
| **Reproduction** | 1. Log in as a regular Employee (no direct reports). 2. Navigate to `/dashboards/manager`. 3. Page renders full manager dashboard shell. 4. API returns 403 (missing `EMPLOYEE:VIEW_TEAM` permission). 5. Error card appears with generic "Error Loading Dashboard" message. |
| **Expected** | Frontend should check for manager role or `EMPLOYEE:VIEW_TEAM` permission before rendering. Show a clear "You are not a manager" message or redirect. |
| **Actual** | Page only checks `isAuthenticated` (line 108). The loading skeleton renders with "Team Pulse" heading and department-specific text. Error message after 403 is generic ("Error Loading Dashboard") -- does not explain that the user lacks manager access. |
| **Suspected Layer** | Frontend (`frontend/app/dashboards/manager/page.tsx`) |
| **Owner** | Frontend Developer |
| **Fix** | Add `hasPermission(Permissions.EMPLOYEE_VIEW_TEAM)` check after hydration. Redirect non-managers to `/me/dashboard` or show a role-specific access denied message. |
| **Validation** | Log in as Employee, navigate to `/dashboards/manager`, confirm redirect or access denied |

### DEF-38: `/home` route has dual behavior -- middleware redirect vs full page (LOW)

| Field | Value |
|-------|-------|
| **Bug ID** | DEF-38 |
| **Module** | Navigation / Home |
| **Route** | `/home` |
| **Role** | All authenticated |
| **Severity** | LOW |
| **Reproduction** | 1. Middleware redirects `/home` to `/me/dashboard` (line 287-288). 2. However, `frontend/app/home/page.tsx` exists with a full social-feed-style dashboard (585 lines) using `useHomeDashboard()`. |
| **Expected** | Either the page renders OR middleware redirects. Not both existing simultaneously. |
| **Actual** | The middleware redirect takes precedence for server-rendered requests, so `page.tsx` never renders in normal flow. But `page.tsx` exists as a 585-line fully-built social dashboard (wall posts, celebrations, new joinees, clock in/out) that is effectively dead code. If middleware is bypassed (e.g., client-side navigation with `router.push('/home')`), the full page would render instead of redirecting. |
| **Suspected Layer** | Frontend (middleware + page.tsx conflict) |
| **Owner** | Frontend Developer |
| **Fix** | Decision needed: either (a) remove the middleware redirect and use `/home` as the social dashboard, or (b) remove `frontend/app/home/page.tsx` dead code. The social dashboard is a valuable feature that should be intentionally routed. |
| **Validation** | Clarify product intent for `/home` route |

### DEF-39: `/app/fluence` uses `router.push` instead of `router.replace` (LOW)

| Field | Value |
|-------|-------|
| **Bug ID** | DEF-39 |
| **Module** | Platform / Navigation |
| **Route** | `/app/fluence` |
| **Role** | All |
| **Severity** | LOW |
| **Reproduction** | 1. Navigate to `/app/fluence`. 2. Page redirects to `/fluence/wiki`. 3. Click browser back button. 4. User returns to `/app/fluence` instead of their previous page, creating a redirect loop. |
| **Expected** | `router.replace` (like the other 3 app entry points) so the redirect entry is removed from history. |
| **Actual** | Line 12 uses `router.push('/fluence/wiki')` while `/app/hrms`, `/app/hire`, and `/app/grow` all use `router.replace()`. |
| **Suspected Layer** | Frontend (`frontend/app/app/fluence/page.tsx`) |
| **Owner** | Frontend Developer |
| **Fix** | Change `router.push` to `router.replace` on line 12. |
| **Validation** | Navigate to `/app/fluence`, hit back button, confirm no redirect loop |

### DEF-40: `/app/*` entry points have NO RBAC gating before redirect (MEDIUM)

| Field | Value |
|-------|-------|
| **Bug ID** | DEF-40 |
| **Module** | Platform / Navigation |
| **Route** | `/app/hrms`, `/app/hire`, `/app/grow`, `/app/fluence` |
| **Role** | All authenticated |
| **Severity** | MEDIUM |
| **Reproduction** | 1. Log in as a user without recruitment permissions. 2. Navigate directly to `/app/hire`. 3. Page redirects to `/recruitment` without checking if user has NU-Hire access. |
| **Expected** | Entry points should check `hasAppAccess(code)` from `useActiveApp` before redirecting. If user lacks access, show an "Access Denied" page or redirect to their default app. |
| **Actual** | All 4 entry point pages have only a bare `useEffect(() => { router.replace(target) }, [router])` with no permission check. The AppSwitcher correctly gates access with lock icons, but direct URL navigation bypasses this. |
| **Suspected Layer** | Frontend (all `frontend/app/app/*/page.tsx` files) |
| **Owner** | Frontend Developer |
| **Fix** | Import `useActiveApp` in each entry page. Check `hasAppAccess(appCode)` before redirect. If denied, redirect to user's default app entry route or show access denied. |
| **Validation** | Navigate to `/app/hire` as Employee-only user, confirm access denied |

### DEF-41: AppSwitcher shows all apps as unlocked during permission loading race (MEDIUM)

| Field | Value |
|-------|-------|
| **Bug ID** | DEF-41 |
| **Module** | Platform / AppSwitcher |
| **Route** | All (global component) |
| **Role** | All authenticated |
| **Severity** | MEDIUM |
| **Reproduction** | 1. Log in. 2. Open AppSwitcher immediately (waffle grid). 3. During the brief window where Zustand has hydrated `isAuthenticated=true` but permissions array is still empty (React Query still fetching or Zustand not yet rehydrated permissions), `hasAppAccess` returns `true` for ALL apps because of the fallback at line 64: `if (!user \|\| permissions.length === 0) return true`. |
| **Expected** | During permission loading, apps should show a loading state or remain locked until permissions are confirmed. |
| **Actual** | All 4 apps appear unlocked (no lock icons) during the brief permission-loading window. User could click an app they don't have access to during this window. The backend would still return 403, but the UI incorrectly indicates access. |
| **Suspected Layer** | Frontend (`frontend/lib/hooks/useActiveApp.ts` line 64) |
| **Owner** | Frontend Developer |
| **Fix** | Change the fallback logic: when `permissions.length === 0` and the user IS authenticated (permissions should exist but haven't loaded), return `false` (locked) instead of `true`. Only return `true` as fallback when the user object itself is null (pre-auth state). Alternatively, add a `isPermissionsLoaded` flag and show skeleton/spinner in AppSwitcher until ready. |
| **Validation** | Log in, rapidly open AppSwitcher, confirm apps show loading state until permissions resolve |

---

## 3. Coverage Summary

### Routes Tested: 10/10

| Route | Sub-App | Risk | Validated | Key Finding |
|-------|---------|------|-----------|-------------|
| `/dashboard` | HRMS | P2 | YES | RBAC correct (frontend + backend) |
| `/me/dashboard` | Self-Service | P3 | YES (spot-check) | No issues |
| `/dashboards/executive` | HRMS | P0 | YES | DEF-35, DEF-36: No frontend RBAC |
| `/dashboards/manager` | HRMS | P1 | YES | DEF-37: No frontend RBAC |
| `/dashboards/employee` | HRMS | P3 | YES | Clean -- proper error/empty states |
| `/home` | Legacy | P3 | YES | DEF-38: Dual behavior |
| `/app/hrms` | Platform | P2 | YES | DEF-40: No RBAC on redirect |
| `/app/hire` | Platform | P2 | YES | DEF-40: No RBAC on redirect |
| `/app/grow` | Platform | P2 | YES | DEF-40: No RBAC on redirect |
| `/app/fluence` | Platform | P2 | YES | DEF-39: push vs replace, DEF-40: No RBAC |

### Global Navigation Components Tested: 4/4

| Component | File | Validated | Key Finding |
|-----------|------|-----------|-------------|
| AppSwitcher | `frontend/components/platform/AppSwitcher.tsx` | YES | DEF-41: Permission loading race |
| Header | `frontend/components/layout/Header.tsx` | YES | Clean |
| Sidebar (via AppLayout) | `frontend/components/layout/AppLayout.tsx` | YES | Clean -- proper app-aware filtering |
| useActiveApp | `frontend/lib/hooks/useActiveApp.ts` | YES | DEF-41: Fallback permissiveness |

### Test Matrix Summary

| Test Category | Total Tests | Pass | Fail | Partial | Noted |
|---------------|-------------|------|------|---------|-------|
| Data loading | 8 | 8 | 0 | 0 | 0 |
| Loading states | 7 | 7 | 0 | 0 | 0 |
| Error handling | 7 | 5 | 0 | 2 | 0 |
| Error boundaries | 5 | 5 | 0 | 0 | 0 |
| RBAC (frontend) | 10 | 4 | 4 | 1 | 1 |
| RBAC (backend) | 6 | 6 | 0 | 0 | 0 |
| Empty states | 5 | 3 | 0 | 2 | 0 |
| Navigation | 8 | 6 | 2 | 0 | 0 |
| App switcher | 10 | 8 | 1 | 0 | 1 |
| **TOTAL** | **66** | **52** | **7** | **5** | **2** |

### Defect Summary

| Bug ID | Severity | Module | Route | Issue |
|--------|----------|--------|-------|-------|
| DEF-35 | HIGH | Dashboard | `/dashboards/executive` | No frontend PermissionGate -- any authenticated user sees shell |
| DEF-36 | MEDIUM | Dashboard | `/dashboards/executive` | Flash of protected UI (title, layout) before 403 |
| DEF-37 | HIGH | Dashboard | `/dashboards/manager` | No frontend PermissionGate -- non-managers see shell |
| DEF-38 | LOW | Navigation | `/home` | Dead code: 585-line page.tsx bypassed by middleware redirect |
| DEF-39 | LOW | Platform | `/app/fluence` | `router.push` instead of `router.replace` -- back-button loop |
| DEF-40 | MEDIUM | Platform | `/app/*` (all 4) | No RBAC check before redirect -- direct URL bypasses AppSwitcher gating |
| DEF-41 | MEDIUM | Platform | AppSwitcher (global) | All apps show unlocked during permission loading race condition |

### Severity Distribution

- **HIGH:** 2 (DEF-35, DEF-37)
- **MEDIUM:** 3 (DEF-36, DEF-40, DEF-41)
- **LOW:** 2 (DEF-38, DEF-39)

---

## 4. Positive Findings

1. **Backend RBAC is solid.** All dashboard endpoints have appropriate `@RequiresPermission` annotations. Even without frontend gates, the backend will return 403 for unauthorized access. This is defense-in-depth working as designed.

2. **Error boundaries exist for all dashboard routes.** Each `/dashboards/*` route has a dedicated `error.tsx` with categorized error handling, retry buttons, and navigation fallbacks.

3. **App-aware sidebar works correctly.** `AppLayout` properly filters sidebar sections based on `APP_SIDEBAR_SECTIONS[appCode]`, and the route-to-app mapping in `getAppForRoute()` correctly prioritizes specific apps (HIRE, GROW, FLUENCE) before the HRMS catch-all.

4. **AppSwitcher is well-built.** Accessibility (aria-label, aria-expanded), keyboard handling (Escape), click-outside-to-close, and navigation fallback (3-second timeout with hard navigation) are all properly implemented.

5. **React Query usage is consistent.** All dashboard data fetching uses React Query with proper query keys, `enabled` flags, and error handling. No raw `useEffect + fetch` patterns found.

6. **`/dashboard` page has correct frontend RBAC.** It checks `hasPermission(Permissions.DASHBOARD_VIEW)` and redirects unauthorized users to `/me/dashboard`. This pattern should be replicated for executive and manager dashboards.

---

## 5. Recommendations for Loop 3

### Priority Fixes Before Loop 3
1. **Fix DEF-35 and DEF-37** (frontend RBAC on executive and manager dashboards) -- these are the highest-risk items and pattern-set for other routes.
2. **Fix DEF-40** (app entry point RBAC) -- quick fix across 4 small files.
3. **Fix DEF-41** (permission loading race) -- change `return true` to `return false` for the `permissions.length === 0` fallback when user is authenticated.

### Loop 3 Suggested Scope: Payroll & Compensation
| Route | Risk | Reason |
|-------|------|--------|
| `/payroll` | P0 | Financial data -- highest sensitivity |
| `/payroll/runs` | P0 | Already validated (spot-check) |
| `/payroll/salary-structures` | P0 | Salary structure definitions |
| `/payroll/components` | P0 | Pay component formulas |
| `/payroll/payslips` | P0 | Admin payslip view (not self-service) |
| `/payroll/bulk-processing` | P0 | Bulk operations |
| `/payroll/statutory` | P0 | Statutory deductions |
| `/compensation` | P0 | Salary revisions |
| `/me/payslips` | P2 | Self-service payslip (spot-check) |

### Systemic Pattern to Watch
The pattern of "backend has RBAC but frontend doesn't" is likely widespread. Loop 1 baseline analysis flagged 50+ routes with "NO PermissionGate". The `/dashboard` page is a rare example of correct frontend gating -- most routes rely solely on backend 403 responses, which creates flash-of-protected-content issues.
