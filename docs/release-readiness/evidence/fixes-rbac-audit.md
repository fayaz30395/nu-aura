# Fixes: RBAC grants, audit persistence, wiki, scope (2026-11-15)

Backend rebuilt (`mvn -o -DskipTests package`) and restarted via `~/.config/nu-aura/run-be.sh`. Flyway applied V345 (no applied migration edited).

| Item | Status | Change |
|---|---|---|
| 1 Audit saves fail | Fixed, 2 root causes | (a) `AuditEventConsumer.mapToAuditLog` pre-set the id on a `@GeneratedValue`+`@Version` entity, so Spring Data called persist() on a "detached" entity; removed `setId` (idempotency stays in IdempotencyService). (b) Found after (a): `OutboxEventProcessor.processOneEvent` starts a REQUIRES_NEW tx before the event tenant is known, so `app.current_tenant_id` was empty and RLS rejected every tenant-row insert from outbox consumers (`audit_logs_tenant_rls`). Now sets the tx-local GUC right after `TenantContext.setCurrentTenant` (new `OutboxEventRepository.applyTenantToTransaction`). Likely also affected other outbox consumers (notifications, approvals). |
| 2 DEF-RBAC-01 | Fixed | `V345__grant_missing_employee_defaults_knowledge_read_and_admin_update_delete.sql`: per-tenant set_config, NOT EXISTS guard, tenants without permission rows skipped. EMPLOYEE gets the 20 missing RoleHierarchy defaults at SELF (TDS:DECLARE, SELF_SERVICE:VIEW_PAYSLIP/VIEW_LETTERS/DOCUMENT_REQUEST/PROFILE_UPDATE, DOCUMENT:UPLOAD/VIEW, WALL:POST/REACT/COMMENT, SURVEY:SUBMIT, MEETING:VIEW/CREATE, BENEFIT:VIEW_SELF/ENROLL/CLAIM_SUBMIT, OVERTIME:REQUEST, OKR:CREATE/UPDATE, PROJECT:VIEW). KNOWLEDGE:WIKI_READ, BLOG_READ, SEARCH (scope ALL, read only) to EMPLOYEE, MANAGER, TEAM_LEAD, HR_MANAGER. Not granted: TEMPLATE_READ, any create/update/delete/publish. Dry-run as app role (RLS on) before apply: 40 rows for NuLogic tenant. |
| 3 DEF-RBAC-02 | Partly fixed | PROJECT:UPDATE/DELETE and TRAINING:UPDATE/DELETE granted at ALL to HR_ADMIN and TENANT_ADMIN (same migration). Codes left SUPER_ADMIN-only for a human decision (live query after V345, NuLogic tenant, includes more than the original 49 because it counts all holders-none-but-SA): ALERT:*, ALLOCATION:*, ASSET:ASSIGN/CREATE, BADGE:MANAGE, BUDGET:CREATE, CHECKLIST:*, COMPLIANCE:MANAGE/VIEW, CURRENCY:MANAGE, CUSTOM_FIELD:*, DASHBOARD:EMPLOYEE/EXECUTIVE/HR_OPS/MANAGER/WIDGETS, DOCUMENT:ACCESS_MANAGE/DELETE/MANAGE_CATEGORY/VERSION_MANAGE/VIEW_ALL, EXCHANGE_RATE:MANAGE, EXPENSE:ADVANCE_MANAGE/MANAGE/SETTINGS/VIEW_TEAM, FEEDBACK:DELETE, HELPDESK:CATEGORY_MANAGE/SLA_MANAGE/TICKET_ASSIGN/TICKET_RESOLVE, INTEGRATION:READ, KNOWLEDGE:SPACE_MANAGE, LEAVE_BALANCE:ENCASH/VIEW/VIEW_ALL, LEAVE_TYPE:VIEW, LETTER:*, LMS:COURSE_CREATE/COURSE_MANAGE/MODULE_CREATE/QUIZ_CREATE, LWF:*, MIGRATION:EXPORT/IMPORT, MILESTONE:*, NOTIFICATION(S):*, ORG_STRUCTURE:*, OVERTIME:VIEW, PERMISSION:MANAGE, POINTS:MANAGE, POLICY:MANAGE, POSITION:*, PREDICTIVE_ANALYTICS:*, PROBATION:VIEW_TEAM, PROJECT:MANAGE, RECOGNITION:MANAGE, REFERRAL:MANAGE, SHIFT:*, SYSTEM:ADMIN, TENANT:MANAGE, TRAINING:EDIT, TRAVEL:MANAGE/UPDATE, USER:VIEW, WORKFLOW:CREATE. |
| 4 DEF-RBAC-10 | Fixed | `EmployeeController.enforceEmployeeUpdateScope` now requires `hasPermissionAtLeast(EMPLOYEE_VIEW_ALL, RoleScope.ALL)`. The copies in EmployeeSkillController / EmployeeDocumentController are NOT changed (out of brief). |
| 5 Wiki | Fixed | `GET /pages/{id}/versions` returns new `WikiPageVersionDto` (no lazy entity). `UpdateWikiPageRequest.status/visibility` are `@NotBlank`, so PUT without them is 400 (was NPE 500). |
| 6 Payslip header | Fixed | `PayslipPdfService` takes `TenantRepository`, prints the tenant name; if none, the name line is omitted. The fake address line "123 Business Street..." is still there (not in brief). |

## Live verification (demo accounts, one login each; log: logs/NU-RBAC-FIX-live.txt, script: scripts/rbac-fix/live.sh)
- Employee arun: GET wiki pages 200 (was 403). HR_MANAGER jagadeesh 200, MANAGER sumit 200.
- Wiki versions as tenant.admin and saran: 200 (was 500).
- Audit: audit_logs rose 334 -> 338 after 4 logins (LOGIN rows); 0 `audit_logs_tenant_rls` errors after restart.
- Manager scope: sumit PUT /employees/{id} on 3 team members returned 403 ACCESS_DENIED (was allowed by the old code path). Allowed side (ALL scope, e.g. HR_MANAGER) not exercised live, to avoid writing real demo data.
- PUT wiki without status/visibility: not reproducible live (no demo account holds KNOWLEDGE:WIKI_UPDATE, they get 403 first); covered by `UpdateWikiPageRequestValidationTest` (2 tests).
- Local note: CSRF is enforced on this stack (`X-XSRF-TOKEN` needed on mutating calls) despite CSRF_ENABLED=false in run-be.sh.
- Not live-tested: payslip header (unit test only), employee blog list (endpoint path guessed wrong, 400/401 on guesses).

## Tests
- Targeted: AuditEventConsumerTest (8; id assertion changed to isNull), PayslipPdfServiceTest (5; constructor), WikiPageServiceTest (12), OutboxEventProcessorTest, UpdateWikiPageRequestValidationTest (2): all pass.
- Full `mvn -o test`: 5321 run, 0 failures, 772 errors (Docker/Testcontainers, same as baseline), 3 skipped. Baseline 5317 -> +4 = my 2 new tests plus 2 from other agents.

## Remaining / not done
DEF-RBAC-05, 06, 11 and TENANT-01 (skipped per brief). Manager/other roles still lack the employee self-service defaults (only EMPLOYEE granted; users hold EMPLOYEE plus a role). No KNOWLEDGE_WIKI_UPDATE holder among demo roles except SUPER_ADMIN (product decision).
