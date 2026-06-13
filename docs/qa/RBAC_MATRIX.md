# RBAC Matrix

Date: 2026-06-13

## Roles requiring validation

| Role | Expected coverage |
|---|---|
| SUPER_ADMIN | Full bypass for route, menu, page action, and API. |
| TENANT_ADMIN | Tenant-scoped administration only; no arbitrary permission/role bypass unless explicitly granted `SYSTEM:ADMIN`. |
| TENANT_ADMIN | Must be explicitly decided: frontend currently treats as admin-like in inline checks; validate backend parity. |
| HR_ADMIN / HR_MANAGER | Employee, recruitment, onboarding, approvals, documents, reports; no unrestricted system/security bypass. |
| MANAGER / TEAM_LEAD | Team-scoped views and approvals; no payroll/admin/security mutation. |
| EMPLOYEE | Self-service only; no admin lists, payroll runs, recruitment admin, role/user APIs. |
| RECRUITER / RECRUITMENT_ADMIN | Recruitment workflows; no payroll/system role admin unless separately granted. |
| FINANCE / FINANCE_ADMIN | Payroll/finance where granted; no user/role/security admin by default. |
| Anonymous / expired / invalid token | Redirect or 401/403; no protected content render. |

## Mandatory deny checks

| Actor | Route/API | Expected |
|---|---|---|
| Anonymous | `/me/dashboard`, `/employees`, `/admin` | Redirect to login or 401. |
| EMPLOYEE | `/admin`, `/admin/roles`, `/admin/permissions`, `/admin/users` | 403/redirect/denial UI. |
| EMPLOYEE | `/payroll/runs`, `/payroll/salary-structures`, `/payroll/components` | 403/redirect/denial UI. |
| EMPLOYEE | `/recruitment/candidates`, `/recruitment/jobs`, `/recruitment/pipeline` | 403/redirect/denial UI unless explicitly self-service/public. |
| EMPLOYEE | `GET /api/v1/roles`, `GET /api/v1/permissions`, `GET /api/v1/users` | 401/403/404. |
| EMPLOYEE | another employee profile/payslip/document | 403/404, never data leakage. |
| MANAGER | payroll config and role/permission admin | 403/redirect/denial UI. |
| HR_MANAGER | SuperAdmin role assignment | 403. |
| TENANT_ADMIN | SuperAdmin/global/system actions | 403/redirect/denial unless explicitly granted a matching permission or `SYSTEM:ADMIN`. |


## Mandatory allow checks

| Actor | Route/API | Expected |
|---|---|---|
| Authenticated user | `/me/dashboard`, `/me/profile`, `/me/documents`, `/me/leaves`, `/me/payslips` | Render own data only. |
| HR_MANAGER | `/employees`, relevant employee APIs | Tenant/scope-filtered data. |
| RECRUITMENT_ADMIN | NU-Hire candidates/jobs/interviews | Render and mutate as permitted. |
| SUPER_ADMIN | All protected routes/actions | Allowed with audit logs where applicable. |

## Known RBAC risks tracked

- Missing frontend route map coverage can allow any authenticated user through unknown routes; API must still protect data.
- TenantAdmin inline frontend bypass was removed from the shared permission hook; browser/API regression must still verify route-level coverage.
- TENANT_ADMIN inline frontend bypass may exceed route/backend semantics.
- Existing E2E RBAC soft-pass assertions were hardened in this change for employee boundaries and tenant isolation.
- User role assignment endpoint should be tested for stale permission revalidation behavior.
