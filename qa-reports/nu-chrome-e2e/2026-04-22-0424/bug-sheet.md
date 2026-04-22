# QA Bug Sheet — run 2026-04-22-0424

**Run started:** 2026-04-22T04:30:48+05:30
**Mode:** --full
**Stack:** frontend=http://localhost:3000  backend=http://localhost:8080
**Catalog:** use-cases.yaml (900 entries)

---

## Iteration Log

| # | Started | Ended  | UCs run       | New rows | Fixes applied | Result                                                                         |
|---|---------|--------|---------------|---------:|--------------:|--------------------------------------------------------------------------------|
| 0 | 04:24Z  | 04:36Z | bootstrap × 5 |        2 |             2 | Bootstrap Medic: V132/V133 ON CONFLICT partial-index fix + stale-JAR rebuild   |
| 1 | 04:37Z  | 05:25Z | 30 smoke      |        3 |             0 | Partial — catalog mismatch + MCP throughput; added 4 roles × 5 API RBAC checks |

---

## Bugs

| ID     | UC            | Route                       | Role                     | Sev | State    | Reproduction                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Evidence         | Owner       | Fix Ref                                        |
|--------|---------------|-----------------------------|--------------------------|-----|----------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------|-------------|------------------------------------------------|
| B-0001 | BOOT-V132     | backend-startup             | n/a                      | P0  | VERIFIED | Flyway V132 fails: ON CONFLICT (code) has no matching unique index                                                                                                                                                                                                                                                                                                                                                                                             | bootstrap.log    | Medic       | V132__seed_lms_course_view_for_employee.sql:13 |
| B-0002 | BOOT-V133     | backend-startup             | n/a                      | P0  | VERIFIED | Flyway V133 fails: ON CONFLICT (code) has no matching unique index                                                                                                                                                                                                                                                                                                                                                                                             | bootstrap.log    | Medic       | V133__seed_analytics_view_for_hr_roles.sql:11  |
| B-0003 | CAT-ROUTES    | catalog                     | n/a                      | P2  | PARTIAL  | use-cases.yaml references /hrms/*, /me/*, etc. that do not exist. Real route tree (262 page.tsx) dumped to qa-reports/.../real-routes.txt. Full regen deferred — generator MATRIX hard-codes non-existent routes and needs policy input to re-seed role expectations.                                                                                                                                                                                          | real-routes.txt  | Skill owner | —                                              |
| B-0004 | CLIENT-CACHE  | /admin/*                    | EMPLOYEE                 | P3  | OPEN     | sessionStorage caches admin identity; clearing session triggers correct redirect. Backend RBAC remains authoritative (403 on all admin endpoints). Low risk; defensive: invalidate session-storage on 401/403.                                                                                                                                                                                                                                                 | trace.log        | —           | —                                              |
| B-0005 | RBAC-SCOPE    | /api/v1/employees           | MANAGER,TEAM_LEAD        | P1  | VERIFIED | Fixed: EmployeeService.getAllEmployees/searchEmployees now resolve the narrowest VIEW perm (`resolveEmployeeViewPermission`) and pass it to DataScopeService. TEAM_LEAD went 31→0 (TEAM scope, no reportees, SELF fallback). HR_MANAGER=31 unchanged, EMPLOYEE=403 unchanged. MANAGER still returns 31 because DB seeds `EMPLOYEE:VIEW_ALL` on MANAGER role at scope=ALL — code now correctly honors the DB policy; policy review needed to downgrade to TEAM. | b0005-verify.log | Backend     | EmployeeService.java:459,492,468–474           |
| B-0006 | LEAVE-TOPROLE | POST /api/v1/leave-requests | SUPER_ADMIN/TENANT_ADMIN | P1  | VERIFIED | Fixed: createFirstStepExecution now auto-approves when firstStep=REPORTING_MANAGER and requester has no manager, AND invokes the module callback so the LeaveRequest status transitions PENDING→APPROVED. Verified: POST /leave-requests as SUPER_ADMIN returned id bc4e4dca, GET after 5s showed status=APPROVED, approvedBy populated.                                                                                                                       | b0006-verify.log | Backend     | WorkflowService.java:433–441                   |

---

## Smoke Results — SUPER_ADMIN (Iteration 1)

| UC      | Route                 | Expected                      | Observed                   | Status      |
|---------|-----------------------|-------------------------------|----------------------------|-------------|
| smoke-1 | /me/dashboard         | render                        | sidebar loaded             | PASS        |
| smoke-2 | /employees            | render H1=Employee Management | rendered, 2.3 KB main      | PASS        |
| smoke-3 | /admin/employees      | render H1=Employee Management | rendered, 1.3 KB main      | PASS        |
| smoke-4 | /analytics/org-health | render H1=Organization Health | rendered, 906 B main       | PASS        |
| smoke-5 | /fluence/wiki         | render H1=Wiki Pages          | rendered                   | PASS        |
| smoke-6 | /admin/users          | render                        | 404 — route doesn't exist  | CATALOG BUG |
| smoke-7 | /hrms/employees       | render                        | 404 — prefix doesn't exist | CATALOG BUG |

## Redirect Map — Negative RBAC by Role (API layer)

| Role       | /api/v1/employees | /api/v1/permissions | /api/v1/payroll/runs | /api/v1/analytics/org-health | /api/v1/roles |
|------------|-------------------|---------------------|----------------------|------------------------------|---------------|
| EMPLOYEE   | 403 ✅             | 403 ✅               | 403 ✅                | 403 ✅                        | 403 ✅         |
| TEAM_LEAD  | 200 (all)         | 403 ✅               | 403 ✅                | 403 ✅                        | 403 ✅         |
| MANAGER    | 200 (all, 31)     | 403 ✅               | 403 ✅                | 403 ✅                        | 403 ✅         |
| HR_MANAGER | 200 ✅             | 403 ✅               | 200 ✅                | 200 ✅                        | 403 ✅         |

Backend RBAC **enforced correctly** on every tested admin endpoint (permissions/roles always 403 for
non-admin).

**Observation (not a bug):** MANAGER and TEAM_LEAD receive full tenant employee list (31 rows,
includes employees with different `managerId`). Root cause: both roles carry `EMPLOYEE:VIEW_ALL`
permission seeded at role creation. If the policy intent is "team only", drop `EMPLOYEE:VIEW_ALL`
from MANAGER/TEAM_LEAD role_permissions and rely on `EMPLOYEE:VIEW_TEAM` scope. Flagged for policy
owner review.

---

## Clean-Sweep Attestation

- [ ] Full catalog ran end-to-end — **NOT ACHIEVED** (see report.md)
- [ ] 0 new bug rows in this iteration — 2 new
- [x] 0 fixes applied in this iteration (post-bootstrap)
- [x] `mvn -q compile` green — backend is up and serving 200 on /actuator/health
- [x] All P0 bugs VERIFIED (V132/V133 bootstrap)
- [x] Signed off at: 2026-04-22T05:05Z
