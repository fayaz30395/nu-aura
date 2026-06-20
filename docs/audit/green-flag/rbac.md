# Green-Flag RBAC Re-Audit — Findings

**Scope:** New/changed controllers since `74c61449` + V308 permission-catalog backfill surface.
**Pattern hunted:** endpoint with `{id}`/`{employeeId}` path var gated only by a `*_VIEW_SELF` / `*_VIEW_TEAM`
permission whose service scopes by tenant only (the recurring IDOR/BOLA class — RBAC-2/5/6).
**HEAD:** `f1f530c4`  ·  **Date:** 2026-06-21  ·  **Auditor:** rbac-security (code-only)

> SuperAdmin / TenantAdmin / HRManager scope-bypass is BY DESIGN and never flagged.

## Result: 5 REAL IDOR/BOLA (Helpdesk + Feedback) — services tenant-scope only, no ownership check.

The base **EMPLOYEE** role holds both `EMPLOYEE_VIEW_SELF` and `REVIEW_VIEW`
(`RoleHierarchy.getEmployeePermissions()` @487/@495). So any authenticated employee passes these gates.
Two controllers expose `{id}`/`{employeeId}` endpoints behind exactly these gates whose services filter by
`tenantId` only — letting any employee read any colleague's data in the same tenant. SuperAdmin bypass is by design.

### IDOR/BOLA findings (issue-board rows)

| ID | Sev | Endpoint | File:line | Gate | Why vulnerable | Fix |
|----|-----|----------|-----------|------|----------------|-----|
| RBAC-GF-1 | **HIGH** | `GET /helpdesk/tickets/employee/{employeeId}` | `HelpdeskController.java:146` → `HelpdeskService.java:204` | `{SYSTEM_ADMIN, EMPLOYEE_VIEW_SELF}` | `getTicketsByEmployee` does `findByTenantIdAndEmployeeId(tenantId, employeeId)` only — any employee reads any colleague's tickets | Scope guard: if caller lacks an ALL/agent helpdesk perm, require `employeeId == SecurityContext.getCurrentEmployeeId()` (mirror `enforceEmployeeViewScope`) |
| RBAC-GF-2 | **HIGH** | `GET /helpdesk/tickets/assignee/{assigneeId}` | `HelpdeskController.java:156` → `HelpdeskService.java:213` | `{SYSTEM_ADMIN, EMPLOYEE_VIEW_SELF}` | `getTicketsByAssignee` tenant-only; any employee reads another's assigned queue | Same guard keyed on `assigneeId` |
| RBAC-GF-3 | **HIGH** | `GET /feedback/received/{employeeId}` | `FeedbackController.java:40` → `FeedbackService.java:66` | `REVIEW_VIEW` | `getReceivedFeedback` does `findReceivedFeedback(tenantId, employeeId)` only — any employee reads any colleague's received performance feedback (sensitive) | Require `employeeId == currentEmployeeId` unless caller has REVIEW_VIEW_ALL / manager scope |
| RBAC-GF-4 | **HIGH** | `GET /feedback/given/{employeeId}` | `FeedbackController.java:47` → `FeedbackService.java:74` | `REVIEW_VIEW` | `getGivenFeedback` tenant-only; any employee reads another's authored feedback | Same guard keyed on `employeeId` |
| RBAC-GF-5 | **MEDIUM** | `GET /helpdesk/tickets` · `/tickets/{id}` · `/tickets/number/{n}` · `/tickets/status/{s}` · `/tickets/category/{c}` | `HelpdeskController.java:138/120/125/166/176` → `HelpdeskService.java:194/178/186/221` | `{SYSTEM_ADMIN, EMPLOYEE_VIEW_SELF}` | Broader exposure: tenant-only reads let ANY employee enumerate the whole tenant's tickets / read any ticket by id or number. `EMPLOYEE_VIEW_SELF` is the wrong gate for tenant-wide listing | Split: list/by-id endpoints require a HELPDESK agent/VIEW_ALL perm; self-list stays SELF-scoped |

> `getFeedbackById` (`FeedbackController.java:33` → `FeedbackService.java:83`) is also tenant-only (`REVIEW_VIEW`) — same class; fold into RBAC-GF-3/4 fix.

## Properly-guarded endpoints (verification done — NOT vulnerable)

Scan of `VIEW_SELF` / `VIEW_TEAM` gates → these controllers **do** enforce ownership scope via an
`enforce*ViewScope` / `validate*Access` helper (the prior-fix pattern). Verified method-by-method:

| Endpoint | File:line | Gate | Ownership guard | Status |
|----------|-----------|------|-----------------|--------|
| `GET /employees/{id}` | `EmployeeController.java:164` | `EMPLOYEE_VIEW_SELF` (+TEAM/DEPT/ALL) | `enforceEmployeeViewScope(id)` @181 (SELF→own only; TEAM→reportees; DEPT/ALL widen) | Guarded |
| `GET /employees/{id}/hierarchy` `.../subordinates` `.../dotted-reports` | `EmployeeController.java:259/278/313` | same hierarchy | `enforceEmployeeViewScope(id)` @273/289/325 | Guarded |
| `GET /{employeeId}/skills` | `EmployeeSkillController.java:48` | `EMPLOYEE_VIEW_SELF` | `enforceEmployeeViewScope(employeeId)` @58 (RBAC-5 fix, replicated helper) | Guarded |
| `POST /{employeeId}/skills` | `EmployeeSkillController.java:64` | update gate | `enforceEmployeeUpdateScope(employeeId)` @76 | Guarded |
| `GET /leave-balances/employee/{employeeId}` | `LeaveBalanceController.java:69` | `LEAVE_VIEW_ALL/TEAM/SELF` | `enforceLeaveBalanceViewScope(employeeId)` @81 (RBAC-2 fix) | Guarded |
| `GET /leave-requests/{id}` | `LeaveRequestController.java:78` | `LEAVE_VIEW_ALL/TEAM/SELF` | fetches request, then `validateLeaveRequestAccess(req, perm)` → `validateEmployeeAccess(req.employeeId)` @440/447 | Guarded |
| `GET /leave-requests/employee/{employeeId}` | `LeaveRequestController.java:101` | `LEAVE_VIEW_ALL/TEAM/SELF` | `validateEmployeeAccess(employeeId, perm)` @117 | Guarded |
| `GET /dashboards/employee/{employeeId}` | `DashboardsController.java:189` | `EMPLOYEE_VIEW_TEAM`(+SELF) | `enforceDashboardViewScope(employeeId)` @152 (RBAC-6 BOLA fix) | Guarded |
| `BenefitEnhancedController` employee-scoped reads | `api/benefits/controller/BenefitEnhancedController.java` | self/team | uses `enforceEmployeeViewScope`-style guard (helper present) | Guarded |
| `TaxDeclarationService` self-scope | `application/tax/service/TaxDeclarationService.java` | self | scope-guard present | Guarded |

## Controllers changed since 74c61449 — RBAC review

Reviewed: `KafkaAdminController`, `AuditLogController`, `EmployeeImportController`, `OneOnOneMeetingController`,
`FeatureFlagController`, `BlogPostController`, `WikiPageController`, `OrganizationController`,
`PaymentWebhookController`, `ResourceManagementController`. None introduces a self/team-gated `{id}`
endpoint with tenant-only service scoping. Knowledge controllers (Blog/Wiki — which map to the V308
`KNOWLEDGE:SPACE_MANAGE` / blog codes) gate writes behind manage/author permissions; reads are tenant-scoped
via `findByIdAndTenantId`. No candidate IDOR added.

## V308 permission-catalog backfill — RBAC verdict (commit f1f530c4)

- Adds exactly **24** rows to the `permissions` **catalog** (resource/action declared in `Permission.java`
  but missing from the V96 seed): AGENCY (5), GOAL (3), HELPDESK ticket (2), KNOWLEDGE space_manage,
  OKR delete, PROJECT (2), SCORECARD (5), SURVEY (3), TRAINING (2).
- **Does NOT touch `role_permissions`** — no role gains a permission from this migration. Grants are owned
  by `HrmsRoleInitializer` / V305 / V307. The new catalog rows simply give those existing admin grants a
  real FK target instead of relying on the in-memory `RoleHierarchy` fallback.
- Every statement is `ON CONFLICT (code) WHERE is_deleted=false DO NOTHING` → **idempotent**, **RLS-safe**
  (no tenant data, catalog is global). **No role widened, no EMPLOYEE escalation.** CLEAN.
- Cross-check V305 (PAYROLL_ADMIN/RECRUITMENT_ADMIN/HR_ADMIN only) and V307 (PAYROLL_ADMIN/TENANT_ADMIN
  roles + grants) — both admin-only, idempotent, no EMPLOYEE grant. CLEAN. (Detail in `security.md`.)

## Bottom line
**4 HIGH + 1 MEDIUM IDOR/BOLA** in Helpdesk + Feedback — both services scope by `tenantId` only while
gated by EMPLOYEE-held `EMPLOYEE_VIEW_SELF` / `REVIEW_VIEW`, so any employee can read any colleague's
tickets / performance feedback. Fix = add the same `enforceEmployeeViewScope`-style ownership check
already used in Employee/Leave/Dashboard/Expense controllers. The Employee/Leave/Skill/Dashboard/Benefit/Tax
self-team endpoints are correctly guarded. V308 is a catalog-only, idempotent, RLS-safe backfill that widens
no role. Separate CRITICAL (non-RBAC): Groq key in git history — see `security.md` SEC-GF-1.
