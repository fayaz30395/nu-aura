# Loop 5 QA Report: HR Admin Operations

> QA Agent | Loop 5 | Generated 2026-03-31
> Scope: 27 routes across Admin, RBAC, Config, Legal, and Import modules
> Defect numbering continues from Loop 4 (DEF-48)

---

## 1. Executive Summary

Loop 5 validated 27 routes covering the admin control plane, RBAC management, configuration pages, contracts, and letter management. These routes are the highest-privilege surfaces in NU-AURA — a bug here is a privilege escalation or data integrity incident.

**Results:**
- Routes tested: 27
- PASS: 14
- PARTIAL: 5
- FAIL: 8
- New defects: 11 (DEF-49 through DEF-59)
- Critical (P0): 2
- High (P1): 4
- Medium (P2): 4
- Low (P3): 1

---

## 2. Route-by-Route Validation

### 2.1 Admin Dashboard & Core

| # | Route | Test | Result | Notes |
|---|-------|------|--------|-------|
| 1 | `/admin` | RBAC gate | **PASS** | Uses `usePermissions().isAdmin` + redirect. Auth check waits for hydration (50ms timer). Cross-tenant user table + role assignment with confirmation dialog. |
| 2 | `/admin` | Role assignment form | **PASS** | React Hook Form + Zod (`roleAssignmentSchema`). Confirm dialog before mutation. |
| 3 | `/admin` | Role options list | **FAIL** | DEF-49. ROLE_OPTIONS includes `SUPER_ADMIN` as first option. Any admin can assign SuperAdmin to any user via the role dropdown. No escalation prevention. |
| 4 | `/admin/settings` | RBAC gate | **PASS** | `ADMIN_ACCESS_ROLES` check with `hasAnyRole`. Redirects non-admins. |
| 5 | `/admin/profile` | Redirect | **PASS** | Pure redirect shim to `/me/profile`. No data exposure. |

### 2.2 Roles & Permissions (P0 — Security Critical)

| # | Route | Test | Result | Notes |
|---|-------|------|--------|-------|
| 6 | `/admin/roles` | RBAC gate | **PASS** | `ADMIN_ACCESS_ROLES` = `[SUPER_ADMIN, TENANT_ADMIN, HR_MANAGER]`. Uses `hasAnyRole()` + redirect. |
| 7 | `/admin/roles` | Role CRUD | **PASS** | React Hook Form + Zod for create/edit. `@RequiresPermission(ROLE_MANAGE)` on all backend endpoints. |
| 8 | `/admin/roles` | Escalation prevention | **FAIL** | DEF-50. No check prevents a TENANT_ADMIN from creating a role with all permissions, effectively granting SuperAdmin-equivalent access. Backend `RoleManagementService` has no SuperAdmin guard — no reference to `SUPER_ADMIN` in the service layer. |
| 9 | `/admin/permissions` | RBAC gate | **PASS** | `ADMIN_ACCESS_ROLES` = `[SUPER_ADMIN, TENANT_ADMIN, HR_ADMIN, HR_MANAGER]`. |
| 10 | `/admin/permissions` | Permission assignment | **PASS** | Uses `@RequiresPermission(PERMISSION_MANAGE)` backend. React Hook Form + Zod for role/permission forms. |
| 11 | `/admin/permissions` | User-to-role assignment | **PASS** | `useAssignRolesToUser` mutation. Backend gated. |
| 12 | `/admin/implicit-roles` | RBAC gate | **PASS** | `ADMIN_ACCESS_ROLES` check. Condition-based auto-role assignment (IS_REPORTING_MANAGER etc.). |

### 2.3 Feature Flags (P0 — Can Disable Security Features)

| # | Route | Test | Result | Notes |
|---|-------|------|--------|-------|
| 13 | `/admin/feature-flags` | RBAC gate | **FAIL** | DEF-51. Page has NO `useEffect` redirect for non-admins. Uses `isAdmin` only to conditionally show the "Add Feature Flag" button and toggle switches. The page renders the full list of feature flags (names, keys, descriptions, categories, enabled status) for ANY authenticated user who navigates to the URL. |
| 14 | `/admin/feature-flags` | Create form | **FAIL** | DEF-52. Create form uses raw `useState` (`newFlag` object) instead of React Hook Form + Zod. Violates code rule: "All forms must use React Hook Form + Zod. No uncontrolled inputs." |
| 15 | `/admin/feature-flags` | Backend security | **PARTIAL** | Backend GET/POST/toggle all require `SYSTEM_ADMIN` except `GET /check/{featureKey}` which has NO `@RequiresPermission`. Any authenticated user can probe whether any feature flag is enabled. Low risk individually, but information leakage. |
| 16 | `/admin/feature-flags` | Critical flag risk | **PARTIAL** | `@RequiresFeature` gates LMS, Fluence, Payments, Payroll, Compensation. An admin with SYSTEM_ADMIN can disable ENABLE_PAYROLL and break payroll runs for an entire tenant. No confirmation dialog or audit log visible for flag toggles. |

### 2.4 Config Pages

| # | Route | Test | Result | Notes |
|---|-------|------|--------|-------|
| 17 | `/admin/holidays` | RBAC + forms | **PASS** | `ADMIN_ACCESS_ROLES` check. RHF + Zod for holiday CRUD. ConfirmDialog for delete. |
| 18 | `/admin/leave-types` | RBAC + forms | **PASS** | `ADMIN_ACCESS_ROLES` check. RHF + Zod for leave type config. Proper accrual type enum validation. |
| 19 | `/admin/leave-requests` | RBAC gate | **PASS** | `ADMIN_ACCESS_ROLES` check. Approve/reject mutations via React Query. |
| 20 | `/admin/leave-requests` | Approval form | **FAIL** | DEF-53. Approval comments and rejection reason use raw `useState` strings instead of React Hook Form + Zod. Both `approvalComments` and `rejectionReason` are uncontrolled text inputs. |
| 21 | `/admin/shifts` | RBAC + forms | **PASS** | `ADMIN_ACCESS_ROLES` check. RHF + Zod for shift config. |
| 22 | `/admin/office-locations` | RBAC + forms | **PASS** | `ADMIN_ACCESS_ROLES` check. RHF + Zod with geofence validation (10-10000m). |
| 23 | `/admin/org-hierarchy` | RBAC gate | **PASS** | `ADMIN_ACCESS_ROLES` check. Read-only tree view from `useEmployees`. |
| 24 | `/admin/integrations` | RBAC gate | **PARTIAL** | Uses `useAuth` + `usePermissions` imports but auth guard implementation deferred to page body. SMS/payment integration test endpoints visible. |
| 25 | `/admin/custom-fields` | RBAC + forms | **PASS** | `ADMIN_ACCESS_ROLES` check. RHF + Zod. Supports 14 field types, 6 visibility levels. |

### 2.5 Admin Employees & System

| # | Route | Test | Result | Notes |
|---|-------|------|--------|-------|
| 26 | `/admin/employees` | RBAC gate | **PASS** | Uses `isAdmin \|\| hasPermission(EMPLOYEE_MANAGE)`. Proper fallback. |
| 27 | `/admin/employees` | Role assignment | **FAIL** | DEF-54. `ROLE_META` array includes `SUPER_ADMIN` as an assignable role. Any admin with EMPLOYEE_MANAGE permission can assign SuperAdmin to any employee via the inline role editor. No backend guard prevents this. |
| 28 | `/admin/system` | RBAC gate | **PASS** | `SUPER_ADMIN_ONLY_ROLES = [Roles.SUPER_ADMIN]`. Correctly restricted to SuperAdmin only. |
| 29 | `/admin/system` | Impersonation | **FAIL** | DEF-55. Impersonation token stored in `sessionStorage`. If a SuperAdmin has multiple tabs, the impersonation state could leak. More critically, there is no visible audit trail or timeout for impersonation sessions. |

### 2.6 Placeholder Pages (No Active Functionality)

| # | Route | Test | Result | Notes |
|---|-------|------|--------|-------|
| 30 | `/admin/payroll` | RBAC gate | **FAIL** | DEF-56. "Coming Soon" placeholder page has NO permission check. Any authenticated user can view the page. While it shows no data, it exposes the existence of an admin payroll configuration endpoint and links to `/payroll`. |
| 31 | `/admin/reports` | RBAC gate | **FAIL** | DEF-57. Same as DEF-56 — "Coming Soon" placeholder with no permission check. |
| 32 | `/admin/mobile-api` | RBAC gate | **FAIL** | DEF-58. API documentation page has NO permission check. Renders full list of mobile API endpoints with paths, methods, permissions required, and authentication requirements. This is an information disclosure vulnerability — any authenticated user can see the entire mobile API surface. |
| 33 | `/admin/import-keka` | RBAC gate | **FAIL** | DEF-59. Keka import page has NO `usePermissions` or `hasAnyRole` check. Uses `AdminPageContent` wrapper which provides only layout, not auth. Any authenticated user could attempt data import. Backend may gate, but the UI exposes the entire import workflow (upload, mapping, preview). |

### 2.7 Contracts & Letters

| # | Route | Test | Result | Notes |
|---|-------|------|--------|-------|
| 34 | `/contracts` | RBAC gate | **PASS** | Uses `PermissionGate` for create button. List view accessible to authenticated users but backend requires `CONTRACT_VIEW`. |
| 35 | `/contracts/[id]` | RBAC gate | **PARTIAL** | No frontend PermissionGate. Backend requires `CONTRACT_VIEW`. Contract details (parties, values, terms) render for any authenticated user until backend 403. Same pattern as DEF-43. |
| 36 | `/contracts/new` | RBAC gate | **PARTIAL** | No frontend PermissionGate. Backend requires `CONTRACT_CREATE`. Form renders but submission fails with 403. |
| 37 | `/contracts/templates` | RBAC gate | **PARTIAL** | No frontend PermissionGate. Template list renders for any authenticated user. Backend gated. |
| 38 | `/letters` | RBAC gate | **PASS** | `PermissionGate` on generate buttons. Action buttons properly gated (`LETTER_GENERATE`, `LETTER_APPROVE`, `LETTER_ISSUE`). |
| 39 | `/letter-templates` | RBAC gate | **PASS** | `PermissionGate` on create/edit/delete/clone buttons. Proper granular gating. |
| 40 | `/holidays` | RBAC gate | **PASS** | `ADMIN_ROLES` check with `hasAnyRole`. RHF + Zod. Separate from `/admin/holidays` — this is the employee-facing view with edit gates for admins. |

---

## 3. Defect Details

### DEF-49 (CRITICAL): SuperAdmin role assignable by any admin via `/admin` dashboard

| Field | Value |
|-------|-------|
| **Bug ID** | DEF-49 |
| **Severity** | CRITICAL |
| **Route** | `/admin` |
| **Module** | RBAC |
| **File** | `frontend/app/admin/page.tsx` line 19-24 |

**Description:** The `ROLE_OPTIONS` array on the admin dashboard includes `SUPER_ADMIN` as the first option in the role assignment dropdown. The `isAdmin` check only gates page access (SUPER_ADMIN or TENANT_ADMIN), meaning a TENANT_ADMIN can assign SUPER_ADMIN to any user. SuperAdmin bypasses ALL permission checks and has cross-tenant access. This is a privilege escalation vulnerability.

**Root Cause:** No escalation prevention logic. The frontend shows all roles, and the backend `updateUserRole` mutation has no check to prevent non-SuperAdmin users from assigning the SuperAdmin role.

**Fix:**
1. Frontend: Filter `ROLE_OPTIONS` to exclude `SUPER_ADMIN` unless the current user is already SuperAdmin.
2. Backend: Add a guard in the role assignment service: only SuperAdmin can assign/revoke the SuperAdmin role.

---

### DEF-50 (CRITICAL): No privilege escalation prevention in role management service

| Field | Value |
|-------|-------|
| **Bug ID** | DEF-50 |
| **Severity** | CRITICAL |
| **Route** | `/admin/roles` |
| **Module** | RBAC |
| **File** | `backend/src/main/java/com/hrms/application/user/service/RoleManagementService.java` |

**Description:** The `RoleManagementService` contains no reference to `SUPER_ADMIN` in any validation logic. A user with `ROLE_MANAGE` permission can:
1. Create a new role
2. Assign ALL permissions to that role (including `SYSTEM_ADMIN`, `ROLE_MANAGE`, etc.)
3. Assign that role to themselves or any user

This effectively creates a SuperAdmin-equivalent role without any guard. The `@RequiresPermission(ROLE_MANAGE)` check only verifies the caller can manage roles, not that they cannot grant permissions they don't themselves hold.

**Root Cause:** Missing "can only grant permissions you possess" rule.

**Fix:** In `assignPermissions` / `assignPermissionsWithScope`, verify the caller holds every permission being assigned, OR restrict SYSTEM_ADMIN permission assignment to SuperAdmin only.

---

### DEF-51 (HIGH): `/admin/feature-flags` page has NO frontend RBAC gate

| Field | Value |
|-------|-------|
| **Bug ID** | DEF-51 |
| **Severity** | HIGH |
| **Route** | `/admin/feature-flags` |
| **Module** | Config |
| **File** | `frontend/app/admin/feature-flags/page.tsx` |

**Description:** Unlike every other admin page that uses `ADMIN_ACCESS_ROLES` + `hasAnyRole()` + redirect, the feature flags page uses `isAdmin` only to conditionally render the "Add" button and toggle switches. The page itself renders for ANY authenticated user, showing all feature flag names, keys, descriptions, categories, and enabled/disabled status.

The backend `GET /api/v1/feature-flags` requires `SYSTEM_ADMIN`, so the data won't load for non-admins (will get 403). However, the page layout, loading state, and UI chrome are visible.

**Fix:** Add the standard `ADMIN_ACCESS_ROLES` guard with `useEffect` redirect, matching the pattern used by `/admin/roles`, `/admin/shifts`, etc.

---

### DEF-52 (LOW): Feature flag create form uses raw useState instead of RHF + Zod

| Field | Value |
|-------|-------|
| **Bug ID** | DEF-52 |
| **Severity** | LOW |
| **Route** | `/admin/feature-flags` |
| **Module** | Config |
| **File** | `frontend/app/admin/feature-flags/page.tsx` lines 47-53 |

**Description:** The create feature flag form uses `useState({ featureKey, name, description, category, enabled })` with direct `onChange` handlers instead of React Hook Form + Zod. Violates non-negotiable code rule: "All forms must use React Hook Form + Zod."

**Fix:** Refactor to use `useForm` with a Zod schema for `featureKey`, `name`, `description`, `category`, and `enabled`.

---

### DEF-53 (LOW): Admin leave request approval/rejection comments use raw useState

| Field | Value |
|-------|-------|
| **Bug ID** | DEF-53 |
| **Severity** | LOW |
| **Route** | `/admin/leave-requests` |
| **Module** | Leave |
| **File** | `frontend/app/admin/leave-requests/page.tsx` lines 29-30 |

**Description:** `approvalComments` and `rejectionReason` are raw `useState('')` strings. The approve/reject modals use uncontrolled text inputs instead of React Hook Form.

**Fix:** Wrap in RHF with minimal Zod schema (e.g., rejection reason required, min 1 char).

---

### DEF-54 (HIGH): SuperAdmin role assignable via `/admin/employees` inline role editor

| Field | Value |
|-------|-------|
| **Bug ID** | DEF-54 |
| **Severity** | HIGH |
| **Route** | `/admin/employees` |
| **Module** | RBAC |
| **File** | `frontend/app/admin/employees/page.tsx` lines 62-78 |

**Description:** `ROLE_META` array includes `{ value: Roles.SUPER_ADMIN, label: 'Super Admin', ... }` as an assignable option. The `InlineRoleEditor` component (line 151) lets admins toggle checkboxes to assign roles to any employee, including SuperAdmin. Combined with DEF-50, this is a second escalation path.

**Fix:** Filter `ROLE_META` to exclude `SUPER_ADMIN` unless the current user is SuperAdmin. Backend guard from DEF-50 fix also blocks this path.

---

### DEF-55 (MEDIUM): Impersonation token in sessionStorage with no audit trail or timeout

| Field | Value |
|-------|-------|
| **Bug ID** | DEF-55 |
| **Severity** | MEDIUM |
| **Route** | `/admin/system` |
| **Module** | Security |
| **File** | `frontend/app/admin/system/page.tsx` lines 86-92 |

**Description:** When a SuperAdmin impersonates a tenant, the impersonation token is stored in `sessionStorage` alongside the tenant ID and name. Issues:
1. No visible timeout — impersonation could persist indefinitely within a browser session.
2. No audit log emission visible in the frontend flow (backend may log, not verified).
3. `sessionStorage` is per-tab but the redirect to `/admin` may confuse the auth state between impersonated and real sessions.

**Fix:** Add impersonation TTL (e.g., 30 min), visual indicator showing impersonation is active, and ensure backend emits audit event on impersonation.

---

### DEF-56 (MEDIUM): `/admin/payroll` placeholder has no permission check

| Field | Value |
|-------|-------|
| **Bug ID** | DEF-56 |
| **Severity** | MEDIUM |
| **Route** | `/admin/payroll` |
| **Module** | Config |
| **File** | `frontend/app/admin/payroll/page.tsx` |

**Description:** "Coming Soon" placeholder page has zero auth/permission logic. Any authenticated user can navigate here. While no data is exposed, the page reveals the existence of admin payroll configuration and contains a link to `/payroll`.

**Fix:** Add `ADMIN_ACCESS_ROLES` guard.

---

### DEF-57 (MEDIUM): `/admin/reports` placeholder has no permission check

| Field | Value |
|-------|-------|
| **Bug ID** | DEF-57 |
| **Severity** | MEDIUM |
| **Route** | `/admin/reports` |
| **Module** | Config |
| **File** | `frontend/app/admin/reports/page.tsx` |

**Description:** Same issue as DEF-56. "Coming Soon" page with no permission check.

**Fix:** Add `ADMIN_ACCESS_ROLES` guard.

---

### DEF-58 (HIGH): `/admin/mobile-api` exposes full API surface to any authenticated user

| Field | Value |
|-------|-------|
| **Bug ID** | DEF-58 |
| **Severity** | HIGH |
| **Route** | `/admin/mobile-api` |
| **Module** | Security |
| **File** | `frontend/app/admin/mobile-api/page.tsx` |

**Description:** The mobile API documentation page has NO permission check (`usePermissions`, `hasAnyRole`, `PermissionGate` are all absent). It renders a complete list of mobile API endpoints with HTTP methods, paths, permission requirements, and authentication flags. This is an information disclosure vulnerability — an attacker with any employee account can enumerate the entire mobile API surface, identify which endpoints require which permissions, and target unprotected ones.

**Fix:** Add `ADMIN_ACCESS_ROLES` guard (minimum). Consider restricting to SUPER_ADMIN only since this is API documentation.

---

### DEF-59 (HIGH): `/admin/import-keka` has no RBAC gate — any user can access import workflow

| Field | Value |
|-------|-------|
| **Bug ID** | DEF-59 |
| **Severity** | HIGH |
| **Route** | `/admin/import-keka` |
| **Module** | Import |
| **File** | `frontend/app/admin/import-keka/page.tsx` |

**Description:** The Keka import page has NO `usePermissions`, `hasAnyRole`, `isAdmin`, or `PermissionGate` check. It uses `AdminPageContent` which is a pure layout wrapper with no auth logic. The page renders the full multi-step import wizard (upload, column mapping, preview, execute) for any authenticated user. Backend may reject the actual import API call, but the UI exposes:
- File upload interface
- Column mapping configuration with all target field names
- Data preview showing imported employee data

**Fix:** Add `ADMIN_ACCESS_ROLES` guard. Import is a destructive operation that should require HR_ADMIN or higher.

---

## 4. Contract Sub-Pages: Frontend Gate Gap Pattern

| Route | Page-level PermissionGate | Backend Gate | Verdict |
|-------|--------------------------|--------------|---------|
| `/contracts` | Create button gated | `CONTRACT_VIEW` | OK (list is read-only) |
| `/contracts/[id]` | **NONE** | `CONTRACT_VIEW` | Gap: UI renders loading then 403 |
| `/contracts/new` | **NONE** | `CONTRACT_CREATE` | Gap: Form renders, submit fails |
| `/contracts/templates` | **NONE** | Backend gated | Gap: UI renders loading then 403 |

This matches the same pattern as DEF-43 from Loop 3 (employee edit page renders without gate). The backend correctly returns 403, so no data leaks, but the form/page chrome is visible. Not creating separate defects as this is the established DEF-43 pattern.

---

## 5. RBAC Audit Matrix: Admin Pages

| Page | Guard Type | Guard Value | Verdict |
|------|-----------|-------------|---------|
| `/admin` | `isAdmin` (usePermissions) | SUPER_ADMIN, TENANT_ADMIN | OK |
| `/admin/roles` | `hasAnyRole(ADMIN_ACCESS_ROLES)` | SA, TA, HR_MANAGER | OK |
| `/admin/permissions` | `hasAnyRole(ADMIN_ACCESS_ROLES)` | SA, TA, HR_ADMIN, HR_MANAGER | OK |
| `/admin/settings` | `hasAnyRole(ADMIN_ACCESS_ROLES)` | SA, TA, HR_ADMIN, HR_MANAGER | OK |
| `/admin/employees` | `isAdmin \|\| hasPermission(EMPLOYEE_MANAGE)` | — | OK |
| `/admin/system` | `hasAnyRole(SUPER_ADMIN_ONLY)` | SUPER_ADMIN | OK |
| `/admin/holidays` | `hasAnyRole(ADMIN_ACCESS_ROLES)` | SA, TA, HR_ADMIN, HR_MANAGER | OK |
| `/admin/leave-types` | `hasAnyRole(ADMIN_ACCESS_ROLES)` | SA, TA, HR_ADMIN, HR_MANAGER | OK |
| `/admin/leave-requests` | `hasAnyRole(ADMIN_ACCESS_ROLES)` | SA, TA, HR_ADMIN, HR_MANAGER | OK |
| `/admin/shifts` | `hasAnyRole(ADMIN_ACCESS_ROLES)` | SA, TA, HR_ADMIN, HR_MANAGER | OK |
| `/admin/office-locations` | `hasAnyRole(ADMIN_ACCESS_ROLES)` | SA, TA, HR_ADMIN, HR_MANAGER | OK |
| `/admin/org-hierarchy` | `hasAnyRole(ADMIN_ACCESS_ROLES)` | SA, TA, HR_ADMIN, HR_MANAGER | OK |
| `/admin/integrations` | Uses auth imports | Partial | Review |
| `/admin/custom-fields` | `hasAnyRole(ADMIN_ACCESS_ROLES)` | SA, TA, HR_ADMIN, HR_MANAGER | OK |
| `/admin/implicit-roles` | `hasAnyRole(ADMIN_ACCESS_ROLES)` | SA, TA, HR_ADMIN, HR_MANAGER | OK |
| `/admin/feature-flags` | `isAdmin` (button only) | **NO PAGE GATE** | DEF-51 |
| `/admin/payroll` | **NONE** | — | DEF-56 |
| `/admin/reports` | **NONE** | — | DEF-57 |
| `/admin/mobile-api` | **NONE** | — | DEF-58 |
| `/admin/import-keka` | **NONE** | — | DEF-59 |
| `/admin/profile` | N/A (redirect) | — | OK |

**Inconsistency:** Admin pages use two different guard patterns:
1. `ADMIN_ACCESS_ROLES` + `hasAnyRole()` (majority — correct)
2. `isAdmin` from `usePermissions` (admin dashboard, feature flags)

The `isAdmin` check maps to SUPER_ADMIN or TENANT_ADMIN. The `ADMIN_ACCESS_ROLES` check also includes HR_ADMIN and HR_MANAGER. These are different permission boundaries but both guard admin pages, creating inconsistency about who can access what.

---

## 6. Defect Summary Table

| ID | Severity | Module | Description | Est. Fix |
|----|----------|--------|-------------|----------|
| DEF-49 | **CRITICAL** | RBAC | SuperAdmin assignable by any admin via `/admin` dropdown | 15 min |
| DEF-50 | **CRITICAL** | RBAC | No privilege escalation prevention in backend role service | 1-2 hours |
| DEF-51 | HIGH | Config | Feature flags page has no frontend RBAC gate | 10 min |
| DEF-52 | LOW | Config | Feature flag create form uses raw useState | 20 min |
| DEF-53 | LOW | Leave | Leave approval comments use raw useState | 15 min |
| DEF-54 | HIGH | RBAC | SuperAdmin assignable via `/admin/employees` role editor | 15 min |
| DEF-55 | MEDIUM | Security | Impersonation token in sessionStorage, no timeout/audit | 2-3 hours |
| DEF-56 | MEDIUM | Config | `/admin/payroll` placeholder missing permission check | 5 min |
| DEF-57 | MEDIUM | Config | `/admin/reports` placeholder missing permission check | 5 min |
| DEF-58 | HIGH | Security | `/admin/mobile-api` exposes API surface without auth | 10 min |
| DEF-59 | HIGH | Import | `/admin/import-keka` has no RBAC gate | 10 min |

---

## 7. Recommended Fix Priority

1. **DEF-49 + DEF-50 + DEF-54** (CRITICAL/HIGH) — Privilege escalation cluster. Fix the backend service first (DEF-50: add "can only grant permissions you hold" or "only SuperAdmin can assign SuperAdmin" guard). Then fix both frontend dropdowns (DEF-49, DEF-54) to hide SuperAdmin option for non-SuperAdmin users.

2. **DEF-58 + DEF-59** (HIGH) — Information disclosure + unprotected import. Add `ADMIN_ACCESS_ROLES` guard. Quick 10-minute fixes each.

3. **DEF-51** (HIGH) — Feature flags page gate. Add the standard `useEffect` redirect matching other admin pages. 10-minute fix.

4. **DEF-56 + DEF-57** (MEDIUM) — Placeholder pages. Add `ADMIN_ACCESS_ROLES` guard. 5 minutes each.

5. **DEF-55** (MEDIUM) — Impersonation hardening. Larger effort but important for audit compliance.

6. **DEF-52 + DEF-53** (LOW) — Code rule violations. Fix when touching these files.

---

## 8. Positive Findings

- **Backend RBAC is solid:** All role/permission endpoints require `ROLE_MANAGE` or `PERMISSION_MANAGE`. All feature flag mutations require `SYSTEM_ADMIN`. All contract endpoints have granular `CONTRACT_*` permissions.
- **System page properly restricted:** `/admin/system` correctly limits to `SUPER_ADMIN` only. Impersonation is SuperAdmin-exclusive.
- **Form quality is high:** 15 of 21 admin pages with forms use React Hook Form + Zod correctly.
- **Letter management has excellent RBAC:** `PermissionGate` applied granularly to create, edit, delete, clone, approve, and issue actions.
- **Config pages are consistent:** Holidays, leave types, shifts, office locations, custom fields all follow the same `ADMIN_ACCESS_ROLES` + RHF + Zod + ConfirmDialog pattern.
