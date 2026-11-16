# RBAC Audit — 2026-11-15 (agent: rbac)

Scope: real role x permission matrix from the dev DB, grant hygiene, code-vs-table permission mismatches, role catalog, plus a live API
spot check. Prior `tenant-rbac2` live logs (`evidence/logs/NU-SEC-RBAC-1x..24x`) were reused where noted; they were read, not re-run.
Mode: read-only (SQL SELECT as app role `hrms_user` with the NuLogic tenant GUC; GET-only live calls with demo accounts; one login per account).
Matrix CSV: `evidence/matrix-rbac.csv`. Defects: `evidence/defects-rbac.md`. Scripts: `evidence/scripts/rbac/`.

## Verdict: CONDITIONAL. Authorization is enforced server-side and the escalation paths tried were denied, but the seeded grants are incomplete.

- Enforcement works: every low-privilege probe to an admin surface returned 403; MANAGER reads are team-scoped (16 of 37 employees).
- High: seeded `role_permissions` are far behind `RoleHierarchy` defaults. Employees get 403 on Fluence, org chart, file service, mobile leave balance; 49 permission codes used in controllers are held only by SUPER_ADMIN (DEF-RBAC-01, -02).
- Medium: lookalike SUPER_ADMIN role codes can be created; no payroll maker-checker in grants; role catalog drift; scope ignored in employee update guard (DEF-RBAC-06, -07, -05, -10).
- Counts: 20 matrix rows: 8 PASS, 10 FAIL, 1 NOT TESTED, 1 INCONCLUSIVE. 11 defects: 2 High, 6 Medium, 3 Low.

## 1. Role catalog (explicit vs implicit)

| Source | Explicit | Implicit | Total |
|---|---|---|---|
| Code (`RoleHierarchy.java:46-58`) | 19 | 7 | 26 |
| DB, NuLogic tenant, system roles | 10 | 0 materialised (1 rule: reporting manager -> MANAGER) | 10 |
| DB, non-system roles | 5 lookalike debris rows (see DEF-RBAC-06), 0 permissions | - | - |

26 is the code count (19 + 7), not what the DB holds. DB roles: SUPER_ADMIN, TENANT_ADMIN, HR_ADMIN, HR_MANAGER, PAYROLL_ADMIN, FINANCE_ADMIN,
RECRUITMENT_ADMIN, MANAGER, TEAM_LEAD, EMPLOYEE. 11 code-defined explicit roles have no DB row; MANAGER and FINANCE_ADMIN are DB-only. Note the 5 non-system
rows are `super_admin`, `Super_Admin`, `SUPER_ADMIN ` (space), `SUPER-ADMIN`, `SUPER_ADMIN<U+200B>`.
Test tenants NUAURA_TEST_Alpha and _Beta each hold the 10 system roles with 0 role_permissions rows. User-role assignments (NuLogic): EMPLOYEE 19, TEAM_LEAD 4, SUPER_ADMIN 2,
one each for the rest; 10 users have no role. `app_roles` / `app_role_permissions`: 0 rows.

## 2. Role x permission-group matrix (NuLogic tenant, count of grants per group, system roles, non-deleted)

Group = permission `resource`. "-" = no grant. SUPER_ADMIN totals 396 grants (33 are legacy lowercase aliases). Scope values (SELF/TEAM/ALL) are in the DB; counts only here.

| group |EMPLOYEE|TEAM_LEAD|MANAGER|HR_MANAGER|HR_ADMIN|TENANT_ADMIN|PAYROLL_ADMIN|FINANCE_ADMIN|RECRUITMENT_ADMIN|SUPER_ADMIN|
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
|ATTENDANCE|3|5|6|7|7|3|1|-|3|9|
|CANDIDATE|-|-|2|2|2|2|-|-|2|2|
|COMPENSATION|-|-|-|-|-|4|4|4|-|4|
|EMPLOYEE|2|3|4|7|8|4|1|-|4|12|
|ESIGNATURE|-|-|-|-|-|4|-|-|-|4|
|FIELD_EMPLOYEE_BANK|-|-|-|-|-|-|-|-|-|2|
|FIELD_EMPLOYEE_SALARY|-|-|-|-|-|-|-|-|-|2|
|KNOWLEDGE|-|-|-|-|17|17|-|-|-|18|
|LEAVE|3|6|7|8|8|4|-|-|3|12|
|LEAVE_BALANCE|-|-|-|-|-|1|-|-|-|4|
|OKR|1|3|3|11|11|6|-|-|-|6|
|PAYROLL|1|1|1|8|8|3|3|5|1|7|
|PERMISSION|-|-|-|-|-|-|-|-|-|1|
|PLATFORM|1|1|1|1|2|-|-|-|1|4|
|RECRUITMENT|1|1|2|6|6|4|-|-|6|9|
|REVIEW|3|4|4|5|6|6|-|-|2|6|
|ROLE|-|-|-|2|2|1|-|-|-|4|
|SELF_SERVICE|1|-|-|-|-|-|-|-|-|5|
|SETTINGS|-|-|-|-|-|2|-|-|-|4|
|STATUTORY|-|-|-|2|2|2|2|2|-|2|
|SYSTEM|-|-|-|-|-|-|-|-|-|2|
|TDS|-|-|-|-|-|1|1|-|-|2|
|TENANT|-|-|-|-|-|-|-|-|-|1|
|USER|-|-|-|-|1|1|-|-|-|4|

Groups not shown here but checked: FIELD_EMPLOYEE_SALARY/BANK/ID_DOCS/TAX_ID (6 codes) are held by SUPER_ADMIN only, so HR_ADMIN and PAYROLL_ADMIN hold no field-level salary/bank grant.
ESIGNATURE: only TENANT_ADMIN and SUPER_ADMIN; no employee SIGN/VIEW grant. KNOWLEDGE: HR_ADMIN, TENANT_ADMIN, SUPER_ADMIN only.
SELF_SERVICE: only EMPLOYEE (1: SELF_SERVICE:UPDATE) and SUPER_ADMIN. PAYROLL:VIEW_SELF is held by 8 roles incl. EMPLOYEE.

## 3. Zero-permission roles

None among the 10 system roles in the NuLogic tenant (min: FINANCE_ADMIN 23). Zero: the 5 non-system lookalike rows, and all 20 system-role rows in the Alpha/Beta test tenants (SQL-seeded). New real tenants only get TENANT_ADMIN (DEF-RBAC-04).

## 4. Dangerous grants

| Check | Result |
|---|---|
| EMPLOYEE / TEAM_LEAD / MANAGER / RECRUITMENT_ADMIN with payroll admin perms | None. Payroll group = PAYROLL:VIEW_SELF only (plus PLATFORM:VIEW) |
| Any non-SUPER_ADMIN holding SYSTEM:ADMIN, TENANT:MANAGE, PERMISSION:MANAGE, FIELD:* | None |
| ROLE:MANAGE / USER:MANAGE | HR_ADMIN, TENANT_ADMIN (and SA). Escalation to SUPER_ADMIN denied in the tenant-rbac2 run (403) |
| PAYROLL:PROCESS + PAYROLL:APPROVE | Same 5 roles hold both (DEF-RBAC-07) |
| RECRUITMENT_ADMIN | EMPLOYEE:UPDATE ALL, EMPLOYEE:VIEW_ALL ALL, REVIEW:SUBMIT ALL: broader than RoleHierarchy default (DEF-RBAC-10) |
| MANAGER | LEAVE:APPROVE TEAM, EMPLOYEE/LEAVE/ATTENDANCE VIEW_ALL at TEAM scope. Live: 16 of 37 employees visible |
| MANAGE-implies-all | `SecurityContext.matchesPermissionHierarchy` lets X:MANAGE satisfy any X:* check; widens grants silently |

## 5. Permissions used in code but held only by SUPER_ADMIN or nobody

49 codes, listed in DEF-RBAC-02 (most relevant: TDS:DECLARE, DOCUMENT:UPLOAD/VIEW/DELETE, ORG_STRUCTURE:VIEW, LEAVE_BALANCE:VIEW, SHIFT:VIEW/ASSIGN, KNOWLEDGE:SPACE_MANAGE, COMPLIANCE:*, CUSTOM_FIELD:*, EXPENSE:MANAGE).
Method: parse `@RequiresPermission(...)` literals and `Permission.X` constants (365 constants, 254 distinct codes used) against `role_permissions` for non-SUPER_ADMIN roles. Caveat: MANAGE-implies-all makes a few reachable; others verified 403 live (section 8).

## 6. Code vs permissions table

- Codes used in controllers but absent from the `permissions` table: `USER:READ` (PlatformController.java:205,219,233). Only this one. `payroll.process` is a Javadoc example.
- `Permission.java` constants absent from the table: 0 (all 365 present).
- In table, not referenced by `@RequiresPermission` or a constant: 41, of which 33 are legacy lowercase dotted rows (SUPER_ADMIN only), 6 are FIELD:*, plus SELF_SERVICE:UPDATE and the header artifact. Duplicate role_permissions pairs: 51 (DEF-RBAC-08).
- Permission catalog is tenant-stamped (405 rows, one tenant): see DEF-TENANT-01 in `08-tenant-isolation.md`.

## 7. Code defaults vs DB (grant drift)

| Role | RoleHierarchy default | DB grants | in code, missing in DB | in DB, not in code |
|---|---:|---:|---:|---:|
| EMPLOYEE | 61 | 59 | 20 | 18 |
| TEAM_LEAD | 24 | 79 | 5 | 60 |
| HR_MANAGER | 94 | 161 distinct | 21 (incl. EMPLOYEE:CREATE) | 88 |
| HR_ADMIN | 106 | 197 | 24 (incl. SETTINGS:VIEW/UPDATE, AUDIT:VIEW) | 115 |
| TENANT_ADMIN | 123 | 186 | 1 | 64 |
| PAYROLL_ADMIN | 30 | 41 | 3 | 14 |
| RECRUITMENT_ADMIN | 22 | 75 | 6 | 59 |
| SUPER_ADMIN | 14 | 394 | 0 | 380 |

Numbers come from a text parse of the `get*Permissions()` methods (including inherited sets); treat them as approximate (+/- a few) but the direction is reliable. HR_MANAGER has no EMPLOYEE:CREATE in DB: employee creation is HR_ADMIN/TENANT_ADMIN only.

## 8. Live API checks (demo accounts, one login each, GET only)

Backend up (`/actuator/health` DOWN only for mail). Log: `evidence/logs/NU-SEC-RBAC-100-live-get-probe.txt`; script `evidence/scripts/rbac/live_probe.py`.
`finance@`, `jagadeesh@`, `suresh@`, `sumit@`, `arun@`, `tenant.admin@` x 14 endpoints. Highlights:

| Endpoint (permission) | arun EMPLOYEE | sumit MANAGER | jagadeesh HR_MGR | suresh RECRUIT | finance | tenant.admin |
|---|---|---|---|---|---|---|
| GET knowledge/wiki/pages (KNOWLEDGE:WIKI_READ) | 403 | 403 | 403 | 403 | 403 | 200 |
| GET files/exists (DOCUMENT:VIEW) | 403 | 403 | 403 | 403 | 403 | 403 |
| GET organization/chart (ORG_STRUCTURE:VIEW) | 403 | 403 | 403 | 403 | 403 | 403 |
| GET mobile/leave/balance (LEAVE_BALANCE:VIEW) | 403 | 403 | 403 | 403 | 403 | 501 |
| GET employees | 403 | 200 (16 of 37) | 200 | 200 | 403 | 200 |
| GET payroll/runs | 403 | 403 | 200 | 403 | 200 | 200 |
| GET roles / users | 403 / 403 | 403 / 403 | 200 / 403 | 403 / 403 | 403 / 403 | 200 / 200 |
| GET admin/system/overview (SYSTEM:ADMIN) | 403 | 403 | 403 | 403 | 403 | 403 |
| GET esignature/requests | 403 | 403 | 403 | 403 | 403 | 200 |

Admin surfaces are closed to low-privilege roles. Employees cannot reach Fluence, org chart, files, or mobile leave balance (DEF-RBAC-01). `/custom-fields` returned 404 for all (path guess wrong; not counted).
Reused from tenant-rbac2 per-role runs (`NU-SEC-RBAC-10..18`, 56 probes each; status counts only, not re-validated here): employee 21x200/33x403, team_lead 24/29, manager 26/26, hr_manager 33/14, recruit_admin 23/29, payroll_admin 17/33, finance_admin 10/43, hr_admin 34/8, tenant_admin 31/11 (plus 400/404 for payload and path issues).

## 9. Session and escalation (tenant-rbac2 logs, read only)

| Item | Result | Log |
|---|---|---|
| Role create with SYSTEM:ADMIN by tenant_admin/hr_admin | 403 | NU-SEC-RBAC-200 |
| Assign SUPER_ADMIN/HR_ADMIN by tenant_admin, hr_admin, hr_manager, manager, employee | all 403 | NU-SEC-RBAC-200 |
| Lookalike SUPER_ADMIN role codes | 5 of 5 accepted (201) | NU-SEC-RBAC-200 (DEF-RBAC-06) |
| Legacy alias system.admin on custom role | role created, no privilege gain | NU-SEC-RBAC-240 (DEF-RBAC-09) |
| Logout then replay access/refresh token | 401 | NU-SEC-RBAC-220 |
| User set INACTIVE, token reused | 200 for about 30 s, then 401 | NU-SEC-RBAC-230 |
| Role permission grant seen by existing session | not seen in 2 x 330 s; INCONCLUSIVE | NU-SEC-RBAC-210 (DEF-RBAC-11) |

## 10. Not tested / limits

- No write was issued by this run. EMPLOYEE:UPDATE scope bypass (DEF-RBAC-10) is code-verified only.
- Role-by-role UI route gating was not tested here (see fe-static results).
- SUPER_ADMIN demo/owner accounts were not used (runbook rule). SUPER_ADMIN column is DB-only.
- Alpha/Beta tenant role grants were counted, not exercised.
- Permission scope (SELF/TEAM/ALL) enforcement was spot-checked for MANAGER employee list only.
- Roles added by other agents tonight (the 5 lookalike rows, test users `nuaura_test_rbac_*`) are left in place; cleanup is the orchestrator's call.
