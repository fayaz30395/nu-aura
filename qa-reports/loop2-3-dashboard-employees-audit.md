# QA Audit Report: Dashboard & Employees Modules (Loop 2-3)

**Date**: 2026-04-01
**Auditor**: Claude Code QA
**Scope**: `/dashboard`, `/employees`, `/employees/[id]`
**Backend**: `DashboardController`, `EmployeeController`

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 1     |
| Medium   | 5     |
| Low      | 2     |
| Info     | 3     |

---

## Findings

### CRITICAL

#### CR-01: Banking & Tax fields exposed without RBAC gating on employee detail page

- **File**: `frontend/app/employees/[id]/page.tsx` (lines 676-689)
- **Description**: The "Banking & Tax" section (bank name, account number, IFSC code, Tax ID/SSN) is
  rendered for **all** users who can view the employee profile. There is no `PermissionGate`
  wrapping this section. Any user with `EMPLOYEE_VIEW_TEAM` or `EMPLOYEE_VIEW_DEPARTMENT` can see
  another employee's bank account number and tax ID.
- **Expected**: Sensitive financial fields should be gated behind a specific permission (e.g.,
  `PAYROLL_READ` or `EMPLOYEE_VIEW_SENSITIVE`) or at minimum hidden unless the viewer is HR Admin+
  or is viewing their own profile.
- **Impact**: PII exposure, potential compliance violation (GDPR/SOX).

---

### MEDIUM

#### MD-01: Dashboard uses

`NuAuraLoader` (full-page spinner) instead of skeleton for in-page loading

- **File**: `frontend/app/dashboard/page.tsx` (line 476)
- **Description**: When analytics data is loading (`!hasHydrated || isLoading`), the page renders
  `<NuAuraLoader message="Loading dashboard..." />` which is a full-screen branded spinner, not a
  content-aware skeleton. The route-level `loading.tsx` does use Mantine `Skeleton` components
  correctly, but the in-component loading path shows a plain spinner instead.
- **Expected**: Use a skeleton layout matching the dashboard structure (stat cards, attendance
  widget) for a smoother perceived-load experience, consistent with the `loading.tsx` file already
  present.
- **Impact**: UX degradation -- user sees a blank spinner instead of a content-shaped skeleton on
  slow API responses.

#### MD-02: Employee detail page uses a plain spinner instead of skeleton for loading state

- **File**: `frontend/app/employees/[id]/page.tsx` (lines 275-286)
- **Description**: Loading state renders
  `<div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-accent-700" />` --
  a raw CSS spinner, not `SkeletonTable` or `SkeletonCard`.
- **Expected**: Use skeleton components (`SkeletonCard` or a custom profile skeleton) that match the
  page layout.
- **Impact**: Inconsistent loading UX across the platform.

#### MD-03: `PUT /api/v1/employees/me` uses

`EMPLOYEE_VIEW_SELF` permission instead of an UPDATE permission

- **File**: `backend/src/main/java/com/hrms/api/employee/EmployeeController.java` (line 140)
- **Description**: The self-service profile update endpoint (`@PutMapping("/me")`) is annotated with
  `@RequiresPermission(Permission.EMPLOYEE_VIEW_SELF)`. A VIEW permission should not authorize a
  WRITE operation. Any user with view-self permission can mutate their own profile fields.
- **Expected**: Use a dedicated permission like `EMPLOYEE_UPDATE_SELF` or `EMPLOYEE_SELF_SERVICE`
  for the PUT endpoint to separate read and write authorization.
- **Impact**: Permission model inconsistency; violates least-privilege principle.

#### MD-04: Dashboard Check In/Out buttons lack explicit `disabled` prop -- relies solely on

`isLoading`

- **File**: `frontend/app/dashboard/page.tsx` (lines 622-636)
- **Description**: The Check In and Check Out buttons use `isLoading={isClockingIn}` which does
  disable the button via the Button component. However, `isClockingIn` is managed via local state (
  `setIsClockingIn`) and the async handler has no debounce or guard against rapid double-clicks
  before the state update propagates. A fast double-click could fire `handleCheckIn` twice before
  React re-renders.
- **Expected**: Add an explicit `disabled={isClockingIn}` prop alongside `isLoading`, or use the
  React Query mutation's `isPending` state directly (which updates synchronously on `mutateAsync`
  call) instead of manual state.
- **Impact**: Potential duplicate clock-in/out API calls on fast double-clicks.

#### MD-05: Dashboard Google API calls use raw `fetch` instead of the shared Axios client

- **File**: `frontend/app/dashboard/page.tsx` (lines 174-300)
- **Description**: The `loadGoogleNotifications` function makes 6+ direct `fetch()` calls to Google
  APIs (Gmail, Drive, Calendar). While these go to external Google endpoints (not the backend), the
  code bypasses the centralized error handling, interceptors, and retry logic of the shared Axios
  client. Each API call is also done sequentially in a loop rather than in parallel.
- **Expected**: While external API calls may justify direct `fetch`, the sequential `for...of` loop
  for email details (lines 182-207) should use `Promise.all` for parallel fetching. Consider
  extracting Google API calls into a dedicated service module under `lib/services/`.
- **Impact**: Slow dashboard load when Google token is present; missed error handling
  standardization.

---

### LOW

#### LO-01: Dashboard `loading.tsx` uses Mantine

`Skeleton` while the rest of the app uses custom CSS skeletons

- **File**: `frontend/app/dashboard/loading.tsx`
- **Description**: This file imports `{ Skeleton } from '@mantine/core'` while other loading states
  use `SkeletonTable` / `SkeletonCard` from `@/components/ui/Loading`. This is an inconsistency in
  the skeleton implementation approach.
- **Expected**: Standardize on one skeleton approach across the app. Either always use Mantine
  `Skeleton` or always use the custom components.
- **Impact**: Minor visual inconsistency; maintenance overhead from two skeleton patterns.

#### LO-02: Hardcoded "Cost Center" value in employee detail page

- **File**: `frontend/app/employees/[id]/page.tsx` (lines 458-459, 721)
- **Description**: The "Cost Center" field is hardcoded to display `"Not Set"` in two places. This
  is not dynamic data from the employee object.
- **Expected**: Either bind to `employee.costCenter` (if the field exists) or remove the field
  entirely until the feature is implemented. Showing "Not Set" as a static string is misleading.
- **Impact**: User confusion -- appears like broken data rather than an unimplemented feature.

---

### INFO / POSITIVE FINDINGS

#### IN-01: No `any` TypeScript types found

- **Files**: `dashboard/page.tsx`, `employees/page.tsx`, `employees/[id]/page.tsx`
- **Status**: PASS -- All files use proper typed interfaces.

#### IN-02: No hardcoded hex colors or `primary-*` / `purple` classes found

- **Files**: All audited dashboard and employee files
- **Status**: PASS -- Design system uses CSS variables (`var(--text-primary)`, etc.), semantic
  Tailwind classes (`accent-*`, `danger-*`, `success-*`), and `sky-*` palette references.

#### IN-03: All backend controller endpoints have `@RequiresPermission` annotations

- **Files**: `DashboardController.java`, `EmployeeController.java`
- **Status**: PASS -- Every `@GetMapping`, `@PostMapping`, `@PutMapping`, `@DeleteMapping` has a
  corresponding `@RequiresPermission` annotation. Data-scope enforcement (IDOR protection) is also
  implemented on `GET /{id}`.

---

## Detailed Checklist

### Dashboard (`/dashboard`)

| Check                                | Status | Notes                                                                                    |
|--------------------------------------|--------|------------------------------------------------------------------------------------------|
| Route-level `loading.tsx` exists     | PASS   | Uses Mantine Skeleton                                                                    |
| Route-level `error.tsx` exists       | PASS   | Proper error boundary with retry, categorized error messages                             |
| In-component loading state           | WARN   | Uses NuAuraLoader (full spinner) not skeleton (MD-01)                                    |
| Empty state handling                 | PASS   | Error card with retry button shown when analytics fail                                   |
| Error handling for API failures      | PASS   | Error state with retry + refresh buttons                                                 |
| RBAC permission check                | PASS   | Checks `DASHBOARD_VIEW`, redirects to `/me/dashboard` if missing                         |
| No `any` types                       | PASS   |                                                                                          |
| No hardcoded colors                  | PASS   |                                                                                          |
| Date formatting                      | PASS   | Uses `toLocaleTimeString`/`toLocaleDateString` with locale, no raw ISO strings displayed |
| Clock In/Out double-click protection | WARN   | Button disables via isLoading but race window exists (MD-04)                             |
| Google notification timestamps       | PASS   | Uses `formatRelativeTime()` helper                                                       |

### Employees List (`/employees`)

| Check                           | Status | Notes                                                                     |
|---------------------------------|--------|---------------------------------------------------------------------------|
| Loading state                   | PASS   | Uses `SkeletonTable` component                                            |
| Empty state                     | PASS   | Uses `EmptyState` component with contextual message                       |
| Error handling                  | PASS   | Error banner with user-friendly messages (403, 401, 500, network)         |
| Pagination                      | PASS   | Server-side pagination with page size 20, prev/next buttons, page counter |
| Search/filter                   | PASS   | Text search + status filter dropdown, resets to page 0                    |
| RBAC permission check           | PASS   | Checks `EMPLOYEE_READ` on mount, redirects if missing                     |
| Create/Delete permission gating | PASS   | Uses `PermissionGate` for Add/Import/Delete buttons                       |
| No `any` types                  | PASS   |                                                                           |
| No hardcoded colors             | PASS   |                                                                           |
| Form validation                 | PASS   | React Hook Form + Zod schema for create form                              |

### Employee Detail (`/employees/[id]`)

| Check                   | Status | Notes                                                                  |
|-------------------------|--------|------------------------------------------------------------------------|
| Loading state           | FAIL   | Plain CSS spinner, not skeleton (MD-02)                                |
| Error state             | PASS   | Error banner with back navigation                                      |
| 404 handling            | PASS   | Calls `notFound()` when employee not found                             |
| Profile tabs            | PASS   | 5 main tabs (About, Profile, Job, Documents, Assets) with sub-tabs     |
| RBAC on edit/delete     | PASS   | `PermissionGate` on Edit and Delete buttons                            |
| Salary field visibility | N/A    | No salary/compensation fields on this page (handled in payroll module) |
| Banking data visibility | FAIL   | Exposed to all viewers without permission gating (CR-01)               |
| Date formatting         | PASS   | Uses `formatDate()` helper with `toLocaleDateString`                   |
| No `any` types          | PASS   |                                                                        |

### Backend Controllers

| Check                                  | Status | Notes                                                         |
|----------------------------------------|--------|---------------------------------------------------------------|
| `@RequiresPermission` on all endpoints | PASS   | All endpoints annotated                                       |
| IDOR protection on `GET /{id}`         | PASS   | `enforceEmployeeViewScope()` with scope hierarchy             |
| `@Valid` on request bodies             | PASS   | Create and Update endpoints validated                         |
| Self-service field restriction         | PASS   | `PUT /me` strips admin-only fields                            |
| Permission model correctness           | WARN   | `PUT /me` uses VIEW_SELF instead of UPDATE permission (MD-03) |

---

## Recommendations (Priority Order)

1. **CR-01**: Wrap the "Banking & Tax" section in
   `<PermissionGate permission={Permissions.PAYROLL_READ}>` or equivalent. Alternatively, check if
   the current viewer is viewing their own profile.
2. **MD-03**: Create an `EMPLOYEE_UPDATE_SELF` permission and apply it to
   `PUT /api/v1/employees/me`.
3. **MD-02**: Replace the CSS spinner in `employees/[id]/page.tsx` with a profile-shaped skeleton
   layout.
4. **MD-01**: Replace `NuAuraLoader` in the dashboard's in-component loading with a skeleton
   matching `loading.tsx`.
5. **MD-04**: Use `checkInMutation.isPending` directly instead of manual `isClockingIn` state to
   eliminate the double-click race window.
6. **MD-05**: Parallelize Google API detail fetches with `Promise.all` and extract to a service
   module.
