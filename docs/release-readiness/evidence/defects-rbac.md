# RBAC defects (agent: rbac, 2026-11-15). Evidence: DB read as app role hrms_user (NuLogic tenant), code reading, live GETs with demo accounts.

| ID | Sev | Summary |
|---|---|---|
| DEF-RBAC-01 | High | Seeded role_permissions lag RoleHierarchy defaults: employees/managers lack core self-service perms; no non-admin role has any KNOWLEDGE perm |
| DEF-RBAC-02 | High | 49 permission codes used by @RequiresPermission are held only by SUPER_ADMIN (TENANT_ADMIN included in the gap) |
| DEF-RBAC-03 | Low | USER:READ used in code, absent from permissions table |
| DEF-RBAC-04 | Medium | New-tenant provisioning creates only TENANT_ADMIN; EMPLOYEE/MANAGER/HR roles do not exist or have zero perms |
| DEF-RBAC-05 | Medium | Role catalog drift: 8 of 19 code-defined explicit roles exist in DB; MANAGER and FINANCE_ADMIN exist in DB but not in code; implicit roles unused |
| DEF-RBAC-06 | Medium | POST /roles accepts lookalike codes of SUPER_ADMIN (case, space, hyphen, zero-width); 5 debris rows remain in the DB |
| DEF-RBAC-07 | Medium | No segregation of duties on payroll: PAYROLL:PROCESS and PAYROLL:APPROVE held by the same 5 roles |
| DEF-RBAC-08 | Low | 33 legacy lowercase permission rows (SUPER_ADMIN only) and 51 duplicate (role, permission) rows; no unique index |
| DEF-RBAC-09 | Low | Role API accepts legacy alias system.admin; not exploitable today |
| DEF-RBAC-10 | Medium | enforceEmployeeUpdateScope ignores permission scope; MANAGER (TEAM) and PAYROLL/RECRUITMENT_ADMIN can PUT any employee (code-verified, live write not run) |
| DEF-RBAC-11 | Medium (inconclusive) | A permission granted to a role was not seen by an existing session in 2 x 330s polls |

## DEF-RBAC-01 High
- Evidence: EMPLOYEE has 59 DB grants; RoleHierarchy.getEmployeePermissions has 61, and 20 of those are missing in DB: TDS:DECLARE, SELF_SERVICE:VIEW_PAYSLIP/VIEW_LETTERS/DOCUMENT_REQUEST/PROFILE_UPDATE, DOCUMENT:UPLOAD/VIEW, WALL:POST/REACT/COMMENT, SURVEY:SUBMIT, MEETING:*, BENEFIT:*, OVERTIME:REQUEST, OKR:CREATE/UPDATE, PROJECT:VIEW. Zero KNOWLEDGE:* rows for EMPLOYEE, TEAM_LEAD, MANAGER, HR_MANAGER, PAYROLL_ADMIN, RECRUITMENT_ADMIN, FINANCE_ADMIN. Same for ESIGNATURE (only TENANT_ADMIN, SUPER_ADMIN) and ORG_STRUCTURE:VIEW, LEAVE_BALANCE:VIEW (SUPER_ADMIN only).
- Live repro (twice, 2 runs of live_probe + earlier probe): arun@ (EMPLOYEE) gets 403 on GET /knowledge/wiki/pages, /files/exists, /organization/chart, /mobile/leave/balance; jagadeesh@ (HR_MANAGER) 403 on wiki and org chart. Log: evidence/logs/NU-SEC-RBAC-100-live-get-probe.txt.
- Root cause: enforcement reads role_permissions (SecurityService.getCachedPermissions); RoleHierarchy defaults only feed the login display list and new-tenant seeding (TenantProvisioningService.java:178-196). Seeds in the dev DB never caught up with the code defaults.
- Files: backend/src/main/java/com/nulogic/common/security/RoleHierarchy.java:517 (getEmployeePermissions), application/auth/service/AuthService.java:738,798 (fallback only when no rows).
- Fix: forward-only Flyway migration granting the intended rows (scope per RoleHierarchy; SELF for employee rows) idempotently (WHERE NOT EXISTS). Pick the version with `git log --all --diff-filter=A -- '*V3*'` first (V337-V340 exist on release branches). Decide product intent for KNOWLEDGE read for all employees first.
- Effort: 0.5 day plus re-run of RBAC matrix.

## DEF-RBAC-02 High
- 49 codes referenced by @RequiresPermission have no holder besides SUPER_ADMIN (or none): ALLOCATION:APPROVE, BENEFIT:CLAIM_SUBMIT/ENROLL/VIEW_SELF, BUDGET:CREATE, COMPLIANCE:MANAGE/VIEW, CURRENCY:MANAGE, CUSTOM_FIELD:CREATE/DELETE/UPDATE/VIEW, DASHBOARD:EXECUTIVE, DOCUMENT:ACCESS_MANAGE/DELETE/UPLOAD/VIEW, EXCHANGE_RATE:MANAGE, EXPENSE:MANAGE/SETTINGS/VIEW_TEAM, FEEDBACK:DELETE, HELPDESK:SLA_MANAGE/TICKET_ASSIGN, INTEGRATION:READ, KNOWLEDGE:SPACE_MANAGE, LEAVE_BALANCE:ENCASH/VIEW, LMS:COURSE_MANAGE, MIGRATION:IMPORT, MILESTONE:VIEW, NOTIFICATION:CREATE/MANAGE/SEND, ORG_STRUCTURE:VIEW, POSITION:VIEW, PREDICTIVE_ANALYTICS:MANAGE/VIEW, PROJECT:DELETE/UPDATE (no holder at all), REFERRAL:MANAGE, SHIFT:ASSIGN/VIEW, SYSTEM:ADMIN, TDS:DECLARE, TENANT:MANAGE, TRAINING:DELETE/UPDATE (no holder), TRAVEL:UPDATE.
- Caveat: SecurityContext.matchesPermissionHierarchy lets X:MANAGE satisfy any X:* check, so some of these are reachable via a MANAGE grant (e.g. tenant_admin passed USER:READ through USER:MANAGE). Probe 2026-11-15: tenant.admin got 403 on /files/exists (DOCUMENT:VIEW) and /organization/chart.
- Files: controllers named above (grep `@RequiresPermission`), script: evidence/scripts/rbac/ (inline analysis in 09-rbac-audit.md#5).
- Fix: same migration as DEF-RBAC-01; for the genuinely SUPER_ADMIN-only ones (TENANT:MANAGE, SYSTEM:ADMIN, MIGRATION:IMPORT) leave as is and document.
- Effort: 0.5 day.

## DEF-RBAC-03 Low
- `USER:READ` at api/platform/controller/PlatformController.java:205,219,233; table has USER:VIEW and USER:MANAGE only. Works for TENANT_ADMIN/HR_ADMIN only through the MANAGE-implies-all hierarchy. Fix: change annotation to Permission.USER_VIEW and grant it, or add USER:READ to catalog. Effort: 10 min.
- Not a defect: `payroll.process` appears only in a Javadoc example (RequiresPermission.java).

## DEF-RBAC-04 Medium
- TenantProvisioningService.java:103-116 creates only TENANT_ADMIN (permissions seeded at :178). EMPLOYEE, HR_*, MANAGER roles are not created, so a newly provisioned tenant cannot assign a working employee role. DB check: the NUAURA_TEST_Alpha/Beta tenants (SQL-seeded) hold all 10 system roles with 0 role_permissions rows each; real onboarding would hit the same zero-permission state for any role created after provisioning.
- Fix: seed the standard role set with seedRolePermissions for each. Effort: 0.5 day. Low urgency if NU-AURA runs single-tenant for Keka replacement.

## DEF-RBAC-05 Medium
- Code: 19 explicit (RoleHierarchy.java:46-51) + 7 implicit (:54-58) = 26. DB (NuLogic tenant): 10 system explicit roles: EMPLOYEE, TEAM_LEAD, MANAGER, HR_MANAGER, HR_ADMIN, TENANT_ADMIN, PAYROLL_ADMIN, FINANCE_ADMIN, RECRUITMENT_ADMIN, SUPER_ADMIN.
- Missing from DB (11): HR_EXECUTIVE, DEPARTMENT_MANAGER, CONTRACTOR, PROJECT_ADMIN, ASSET_MANAGER, EXPENSE_MANAGER, HELPDESK_ADMIN, TRAVEL_ADMIN, COMPLIANCE_OFFICER, LMS_ADMIN, INTERN. In DB but not in code: MANAGER (default perms = empty set), FINANCE_ADMIN.
- Implicit roles: implicit_role_rules has 1 row (IS_REPORTING_MANAGER -> MANAGER, scope TEAM); implicit_user_roles has 0 rows; REPORTING_MANAGER, SKIP_LEVEL_MANAGER, DEPARTMENT_HEAD, MENTOR, INTERVIEWER, PERFORMANCE_REVIEWER, ONBOARDING_BUDDY are not materialised. Runbook-listed FINANCE_MANAGER, IT_ADMIN, REPORTING_MANAGER roles do not exist in the DB. app_roles has 0 rows.
- Fix: decide the supported role set; add missing roles or remove them from RoleHierarchy/ALL_EXPLICIT_ROLES and the runbook. Effort: 0.5 day.

## DEF-RBAC-06 Medium
- POST /api/v1/roles as tenant.admin returned 201 for codes `super_admin`, `SUPER_ADMIN ` (trailing space), `Super_Admin`, `SUPER-ADMIN`, `SUPER_ADMIN<U+200B>` (evidence/logs/NU-SEC-RBAC-200-escalation-attempts.txt). Uniqueness is exact-match (roles idx_role_code_tenant on code). Verified in DB today: the 5 rows exist, non-system, 0 permissions, created_by tenant.admin; GET /roles as HR_MANAGER lists the zero-width one. No privilege gain found (all lookalikes have 0 perms; SecurityContext.isSuperAdmin matches exact code) but they enable social-engineering of the role-assignment UI.
- Cleanup needed (not done: read-only audit): soft-delete these 5 roles via the app or by the orchestrator.
- Fix: normalize + validate role code on create (`^[A-Z][A-Z0-9_]{2,49}$`, upper-cased, trimmed, reject reserved names case-insensitively). Files: role create service/controller (POST /api/v1/roles). Effort: 1-2 h with test.

## DEF-RBAC-07 Medium
- PAYROLL:PROCESS and PAYROLL:APPROVE are both held by HR_ADMIN, HR_MANAGER, PAYROLL_ADMIN, FINANCE_ADMIN, TENANT_ADMIN (and SUPER_ADMIN). One user can process and approve a run. Whether the service enforces approver != processor was not checked in this task (see payroll audit). Fix: split approve to FINANCE_ADMIN only or enforce a maker-checker rule in PayrollRunService. Effort: 0.5 day.

## DEF-RBAC-08 Low
- 33 lowercase dotted rows (employee.read ... system.admin) exist in permissions, all granted to SUPER_ADMIN only, none referenced by @RequiresPermission. role_permissions has 51 (role, permission) pairs with more than one non-deleted row (HR_ADMIN 19, HR_MANAGER 21, RECRUITMENT_ADMIN 5, TEAM_LEAD 3, SUPER_ADMIN 2, PAYROLL_ADMIN 1) and no unique index on (role_id, permission_id) (only partial non-unique indexes). Risk: a revoke that soft-deletes one row leaves the permission active (not tested). Fix: dedupe, add partial unique index in a forward-only migration; drop alias rows after confirming no tenant data depends on them. Effort: 2 h.

## DEF-RBAC-09 Low
- tenant.admin created a role with permissionCodes ["system.admin"] (201) while ["SYSTEM:ADMIN"] returned 403. The holder still got 403 on /admin/system/* (SecurityContext.matchesNormalizedFormat skips SYSTEM). Fix: reject legacy aliases in role create/update. Effort: 30 min.

## DEF-RBAC-10 Medium (code-verified)
- api/employee/EmployeeController.java:241-259: enforceEmployeeUpdateScope allows any caller holding EMPLOYEE:VIEW_ALL, whatever its scope. DB: MANAGER holds EMPLOYEE:VIEW_ALL at scope TEAM; PAYROLL_ADMIN and RECRUITMENT_ADMIN at ALL. They can PUT /api/v1/employees/{id} (EMPLOYEE:UPDATE required: MANAGER has it at SELF, RECRUITMENT_ADMIN at ALL, PAYROLL_ADMIN does not) for any employee. Fields writable are personal/contact fields per the controller comment. Reads are correctly scoped (sumit sees 16 of 37 employees, evidence/logs/NU-SEC-RBAC-101-manager-employee-scope.txt).
- Not reproduced live: no write issued against real demo employees. Fix: use SecurityContext.hasPermissionAtLeast(EMPLOYEE_VIEW_ALL, RoleScope.ALL) or restrict by role. Effort: 1 h plus test.

## DEF-RBAC-11 Medium (inconclusive)
- tenant-rbac2 log NU-SEC-RBAC-210: after role membership was inserted by SQL (app path 500s, DEF-HRMS-02) and CANDIDATE:VIEW was granted via PUT /roles/{id}/permissions, the existing session stayed 403 for 330 s, then again for another 330 s. Cause unknown: either the permission cache is keyed by role-code list and not evicted for this role, or the SQL-made membership is not in the session's role set. Needs a rerun with membership created via the app. The run's summary file was never written; only raw logs exist. Related, passed: logout revocation (NU-SEC-RBAC-220) and deactivated-user rejection after ~30 s (NU-SEC-RBAC-230).
