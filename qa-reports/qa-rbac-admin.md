# QA Report: RBAC Boundaries & Admin Panel Flows

**Date:** 2026-04-02
**Tester:** QA Engineer 3 (Automated)
**Environment:** localhost:3000 (frontend) / localhost:8080 (backend) / dev profile
**Backend Version:** Spring Boot 3.4.1 / Java 17
**Frontend Version:** Next.js 14 (App Router)

---

## Executive Summary

Testing covered 4 flow groups: RBAC boundaries, admin panel, reports/analytics, and app
switcher/platform. One **CRITICAL** defect was found: Flyway migration V96 deletes all
`role_permissions` records without re-seeding them, causing all non-SuperAdmin users to receive 403
on every protected endpoint. Multiple backend 500 errors were also found across attendance, leave,
recruitment, integrations, and reports modules.

**Overall Verdict: FAIL (1 critical, 6 major, 2 minor defects)**

---

## FLOW GROUP 20 -- RBAC Boundary Testing

### Authentication Layer

| Test                                          | Result   | Notes                                                                                                                                         |
|-----------------------------------------------|----------|-----------------------------------------------------------------------------------------------------------------------------------------------|
| Unauthenticated access to protected APIs      | **PASS** | All return 401                                                                                                                                |
| Unauthenticated access to protected pages     | **PASS** | All return 307 redirect to /auth/login                                                                                                        |
| Invalid JWT token                             | **PASS** | Returns 401                                                                                                                                   |
| Public pages accessible without auth          | **PASS** | /auth/login (200), /reset-password (200)                                                                                                      |
| Login with email/password                     | **PASS** | Returns JWT + roles + permissions                                                                                                             |
| JWT tokens not in response body (cookie-only) | **INFO** | Tokens appear in BOTH response body AND cookie; body should be stripped per code comments (line 64-65 of AuthController) but they are present |

### SuperAdmin Bypass Testing

| Endpoint                                  | Status | Result                            |
|-------------------------------------------|--------|-----------------------------------|
| GET /api/v1/employees                     | 200    | **PASS**                          |
| GET /api/v1/roles                         | 200    | **PASS**                          |
| GET /api/v1/permissions                   | 200    | **PASS**                          |
| GET /api/v1/admin/settings                | 200    | **PASS**                          |
| GET /api/v1/analytics/dashboard           | 200    | **PASS**                          |
| GET /api/v1/departments                   | 200    | **PASS**                          |
| GET /api/v1/benefits/plans                | 200    | **PASS**                          |
| GET /api/v1/assets                        | 200    | **PASS**                          |
| GET /api/v1/feature-flags                 | 200    | **PASS**                          |
| GET /api/v1/leave-types                   | 200    | **PASS**                          |
| GET /api/v1/office-locations              | 200    | **PASS**                          |
| GET /api/v1/audit-logs                    | 200    | **PASS**                          |
| GET /api/v1/payroll/runs                  | 200    | **PASS**                          |
| GET /api/v1/holidays/year/2026            | 200    | **PASS**                          |
| GET /api/v1/workflow/definitions          | 200    | **PASS**                          |
| GET /api/v1/attendance                    | 500    | **FAIL** -- Internal server error |
| GET /api/v1/leave/requests                | 500    | **FAIL** -- Internal server error |
| GET /api/v1/recruitment/jobs              | 500    | **FAIL** -- Internal server error |
| GET /api/v1/reports                       | 500    | **FAIL** -- Internal server error |
| GET /api/v1/integrations                  | 500    | **FAIL** -- Internal server error |
| GET /api/v1/custom-fields/entity/EMPLOYEE | 500    | **FAIL** -- Internal server error |
| GET /api/v1/analytics/executive-dashboard | 500    | **FAIL** -- Internal server error |
| GET /api/v1/reports/custom                | 500    | **FAIL** -- Internal server error |

### RBAC Boundary Testing (Employee Role -- Saran V)

| Endpoint                         | Expected | Actual  | Result            |
|----------------------------------|----------|---------|-------------------|
| GET /api/v1/employees            | 403      | 403     | **PASS**          |
| GET /api/v1/roles                | 403      | 403     | **PASS**          |
| GET /api/v1/permissions          | 403      | 403     | **PASS**          |
| GET /api/v1/admin/settings       | 403      | 403     | **PASS**          |
| GET /api/v1/audit-logs           | 403      | 403     | **PASS**          |
| GET /api/v1/feature-flags        | 403      | 403     | **PASS**          |
| GET /api/v1/departments          | 403      | 403     | **PASS**          |
| GET /api/v1/analytics/dashboard  | 403      | 403     | **PASS**          |
| GET /api/v1/payroll/runs         | 403      | 403     | **PASS**          |
| GET /api/v1/workflow/definitions | 403      | 403     | **PASS**          |
| GET /api/v1/employees/me         | 200      | **403** | **CRITICAL FAIL** |
| GET /api/v1/auth/me              | 200      | 200     | **PASS**          |

### RBAC Boundary Testing (Team Lead Role -- Mani S)

| Endpoint                        | Expected | Actual  | Result            |
|---------------------------------|----------|---------|-------------------|
| GET /api/v1/employees           | 403      | 403     | **PASS**          |
| GET /api/v1/roles               | 403      | 403     | **PASS**          |
| GET /api/v1/permissions         | 403      | 403     | **PASS**          |
| GET /api/v1/admin/settings      | 403      | 403     | **PASS**          |
| GET /api/v1/audit-logs          | 403      | 403     | **PASS**          |
| GET /api/v1/feature-flags       | 403      | 403     | **PASS**          |
| GET /api/v1/analytics/dashboard | 403      | 403     | **PASS**          |
| GET /api/v1/payroll/runs        | 403      | 403     | **PASS**          |
| GET /api/v1/employees/me        | 200      | **403** | **CRITICAL FAIL** |

### RBAC Boundary Testing (HR Manager Role -- Jagadeesh N)

| Endpoint                        | Expected     | Actual  | Result            |
|---------------------------------|--------------|---------|-------------------|
| GET /api/v1/roles               | 403          | 403     | **PASS**          |
| GET /api/v1/permissions         | 403          | 403     | **PASS**          |
| GET /api/v1/admin/settings      | 403          | 403     | **PASS**          |
| GET /api/v1/audit-logs          | 403          | 403     | **PASS**          |
| GET /api/v1/feature-flags       | 403          | 403     | **PASS**          |
| GET /api/v1/employees           | 200 expected | **403** | **CRITICAL FAIL** |
| GET /api/v1/analytics/dashboard | 200 expected | **403** | **CRITICAL FAIL** |
| GET /api/v1/departments         | 200 expected | **403** | **CRITICAL FAIL** |

### Cross-Tenant Data Isolation

| Test                                | Result   | Notes                                               |
|-------------------------------------|----------|-----------------------------------------------------|
| Employee data scoped to tenant      | **PASS** | All 24 employees belong to single tenant            |
| Spoofed X-Tenant-ID header rejected | **PASS** | Returns "Invalid or inactive tenant" (403)          |
| JWT tenant overrides header tenant  | **PASS** | JwtAuthenticationFilter sets TenantContext from JWT |
| Auth/me returns correct tenant      | **PASS** | Returns 660e8400-e29b-41d4-a716-446655440001        |

---

## CRITICAL DEFECT: V96 Migration Deletes All role_permissions

**Severity:** CRITICAL
**Component:** `backend/src/main/resources/db/migration/V96__canonical_permission_reseed.sql`

### Root Cause

V96 migration performs:

1. Phase 1: `DELETE FROM role_permissions;` -- Deletes ALL role-to-permission mappings
2. Phase 2: `DELETE FROM permissions;` -- Deletes all permissions
3. Phase 3: Re-inserts 338 permissions
4. Phase 4: Re-inserts 6 field-level permissions

**There is NO Phase 5 to re-insert role_permissions.**

### Impact

- All non-SuperAdmin users get 403 on EVERY protected endpoint
- SuperAdmin works because PermissionAspect has `SecurityContext.isTenantAdmin()` bypass (line 51)
- The `/api/v1/auth/me` endpoint FALSELY reports permissions because AuthService falls back to
  `RoleHierarchy.getDefaultPermissions()` (line 509), but SecurityService (used by
  JwtAuthenticationFilter) does NOT have this fallback
- This creates a dangerous discrepancy: frontend shows permissions, backend denies access

### Affected Users

ALL non-SuperAdmin roles: EMPLOYEE, TEAM_LEAD, HR_MANAGER, HR_ADMIN, HIRING_MANAGER, TENANT_ADMIN,
APP_ADMIN, CANDIDATE, VIEWER

### Fix Required

Add Phase 5 to V96 (or create V100) that maps permissions to roles in the `role_permissions` table.
Alternatively, add the same `RoleHierarchy.getDefaultPermissions()` fallback to
`SecurityService.getCachedPermissionsForUser()`.

---

## FLOW GROUP 21 -- Admin Panel

### Frontend Page Rendering (SuperAdmin)

| Page                    | HTTP Status | Result   |
|-------------------------|-------------|----------|
| /admin                  | 200         | **PASS** |
| /admin/roles            | 200         | **PASS** |
| /admin/permissions      | 200         | **PASS** |
| /admin/settings         | 200         | **PASS** |
| /admin/feature-flags    | 200         | **PASS** |
| /admin/custom-fields    | 200         | **PASS** |
| /admin/holidays         | 200         | **PASS** |
| /admin/leave-types      | 200         | **PASS** |
| /admin/office-locations | 200         | **PASS** |
| /admin/integrations     | 200         | **PASS** |
| /workflows              | 200         | **PASS** |

### Backend API (SuperAdmin)

| Endpoint                                  | Status  | Response Size | Result                   |
|-------------------------------------------|---------|---------------|--------------------------|
| GET /api/v1/roles                         | 200     | 2.1 KB        | **PASS**                 |
| GET /api/v1/permissions?page=0&size=5     | 200     | 69 KB         | **PASS**                 |
| GET /api/v1/admin/settings                | 200     | 176 B         | **PASS**                 |
| GET /api/v1/feature-flags                 | 200     | 3.8 KB        | **PASS**                 |
| GET /api/v1/holidays/year/2026            | 200     | 4.4 KB        | **PASS**                 |
| GET /api/v1/leave-types                   | 200     | 4.3 KB        | **PASS**                 |
| GET /api/v1/office-locations              | 200     | 315 B         | **PASS**                 |
| GET /api/v1/workflow/definitions          | 200     | 10.7 KB       | **PASS**                 |
| GET /api/v1/audit-logs?page=0&size=5      | 200     | 2.9 KB        | **PASS**                 |
| GET /api/v1/departments                   | 200     | 3.7 KB        | **PASS**                 |
| GET /api/v1/custom-fields/entity/EMPLOYEE | **500** | --            | **FAIL** -- Server error |
| GET /api/v1/integrations/connectors       | **500** | --            | **FAIL** -- Server error |

---

## FLOW GROUP 22 -- Reports & Analytics

### Frontend Page Rendering (SuperAdmin)

| Page                  | HTTP Status | Result                |
|-----------------------|-------------|-----------------------|
| /reports              | 200         | **PASS**              |
| /reports/builder      | 200         | **PASS**              |
| /reports/attrition    | 200         | **PASS**              |
| /reports/leave        | 200         | **PASS**              |
| /reports/headcount    | 200         | **PASS**              |
| /analytics            | 200         | **PASS**              |
| /dashboards/executive | 200         | **PASS**              |
| /dashboards/manager   | 200         | **PASS**              |
| /dashboards/employee  | **500**     | **FAIL** -- SSR error |
| /predictive-analytics | 200         | **PASS**              |

### Backend API (SuperAdmin)

| Endpoint                                  | Status  | Result                   |
|-------------------------------------------|---------|--------------------------|
| GET /api/v1/analytics/dashboard           | 200     | **PASS**                 |
| GET /api/v1/analytics/executive-dashboard | **500** | **FAIL** -- Server error |
| GET /api/v1/scheduled-reports             | 200     | **PASS**                 |
| GET /api/v1/reports/custom                | **500** | **FAIL** -- Server error |

---

## FLOW GROUP 23 -- App Switcher & Platform

### Frontend Page Rendering (SuperAdmin)

| Page                    | HTTP Status | Result   |
|-------------------------|-------------|----------|
| /settings/profile       | 200         | **PASS** |
| /settings/security      | 200         | **PASS** |
| /settings/notifications | 200         | **PASS** |

### App Switcher Architecture

| Check                              | Result   | Notes                                                         |
|------------------------------------|----------|---------------------------------------------------------------|
| All 4 sub-apps defined in apps.ts  | **PASS** | HRMS, HIRE, GROW, FLUENCE                                     |
| RBAC gating via permissionPrefixes | **PASS** | Each app defines permission prefixes                          |
| Lock icon for inaccessible apps    | **PASS** | Lucide Lock icon rendered for apps user lacks permissions for |
| Sidebar app-aware filtering        | **PASS** | useActiveApp hook determines active app from route            |
| NU-Fluence marked as unavailable   | **PASS** | `available: false` (Phase 2)                                  |

### Security Headers & Protection

| Check                                | Result   | Notes                                                                    |
|--------------------------------------|----------|--------------------------------------------------------------------------|
| Sensitive actuator endpoints blocked | **PASS** | /actuator/env, /configprops, /heapdump, /beans, /mappings all return 403 |
| Safe actuator endpoints accessible   | **PASS** | /actuator/health, /info, /metrics, /prometheus return 200                |
| Frontend middleware auth check       | **PASS** | All authenticated routes listed, redirect to /auth/login                 |
| OWASP security headers               | **PASS** | Set in both Next.js middleware and Spring Security                       |
| CSRF disabled (JWT-based)            | **PASS** | Stateless API, JWT in httpOnly cookie                                    |

### Frontend Pages with 500 Errors

| Page                 | Issue                                                    |
|----------------------|----------------------------------------------------------|
| /dashboards/employee | SSR rendering error (uses useEmployeeDashboard hook)     |
| /leave/approvals     | SSR rendering error (uses useLeaveRequestsByStatus hook) |

---

## Defect Summary

### CRITICAL

| ID           | Title                                                                 | Component                            | Impact                                                                                                                    |
|--------------|-----------------------------------------------------------------------|--------------------------------------|---------------------------------------------------------------------------------------------------------------------------|
| **RBAC-001** | V96 migration deletes all role_permissions without re-seeding         | V96__canonical_permission_reseed.sql | All non-SuperAdmin users get 403 on every protected endpoint. Platform is non-functional for all roles except SuperAdmin. |
| **RBAC-002** | Auth/me permission response inconsistent with actual RBAC enforcement | AuthService vs SecurityService       | Frontend shows permissions the user does not actually have, creating misleading UX and false sense of access              |

### MAJOR

| ID          | Title                                                 | Component                 | Impact                                  |
|-------------|-------------------------------------------------------|---------------------------|-----------------------------------------|
| **API-001** | GET /api/v1/attendance returns 500                    | AttendanceController      | Attendance module broken for all users  |
| **API-002** | GET /api/v1/leave/requests returns 500                | LeaveController           | Leave module broken for all users       |
| **API-003** | GET /api/v1/recruitment/jobs returns 500              | RecruitmentController     | Recruitment module broken for all users |
| **API-004** | GET /api/v1/analytics/executive-dashboard returns 500 | ExecutiveDashboardService | Executive dashboard broken              |
| **API-005** | GET /api/v1/integrations returns 500                  | IntegrationController     | Integrations module broken              |
| **API-006** | GET /api/v1/custom-fields/entity/EMPLOYEE returns 500 | CustomFieldController     | Custom fields broken                    |

### MINOR

| ID         | Title                                        | Component                                 | Impact                                           |
|------------|----------------------------------------------|-------------------------------------------|--------------------------------------------------|
| **FE-001** | /dashboards/employee returns 500 (SSR error) | frontend/app/dashboards/employee/page.tsx | Employee dashboard page crashes on server render |
| **FE-002** | /leave/approvals returns 500 (SSR error)     | frontend/app/leave/approvals/page.tsx     | Leave approvals page crashes on server render    |

---

## Test Environment Details

- **Backend:** Spring Boot 3.4.1, dev profile, PostgreSQL (Neon), Redis 8.6.1
- **Frontend:** Next.js 14 (App Router), dev mode
- **Test Users:**
  - SuperAdmin: fayaz.m@nulogic.io (SUPER_ADMIN + SKIP_LEVEL_MANAGER + REPORTING_MANAGER)
  - Employee: saran@nulogic.io (EMPLOYEE)
  - Team Lead: mani@nulogic.io (TEAM_LEAD + REPORTING_MANAGER)
  - HR Manager: jagadeesh@nulogic.io (HR_MANAGER + SKIP_LEVEL_MANAGER + REPORTING_MANAGER)
- **Tenant:** 660e8400-e29b-41d4-a716-446655440001 (NuLogic)
- **Password:** Welcome@123 (all demo users, set in V49 migration)
- **DB database high latency noted:** 467ms response time on health check

---

## Recommendations

1. **IMMEDIATE (P0):** Create a new migration (V100 or similar) that seeds `role_permissions` for
   all roles, mapping the 344 permissions from V96 to the appropriate roles based on
   `RoleHierarchy.getDefaultPermissions()`.

2. **HIGH (P1):** Add the `RoleHierarchy.getDefaultPermissions()` fallback to
   `SecurityService.getCachedPermissionsForUser()` to match AuthService behavior, preventing the
   permission discrepancy.

3. **HIGH (P1):** Investigate and fix the 8 backend 500 errors (attendance, leave, recruitment,
   integrations, custom-fields, executive-dashboard, reports/custom, reports).

4. **MEDIUM (P2):** Fix SSR errors on /dashboards/employee and /leave/approvals pages.

5. **LOW (P3):** Verify that JWT tokens are properly stripped from login response body (
   AuthController lines 64-66 clear them, but they appear in the response).
