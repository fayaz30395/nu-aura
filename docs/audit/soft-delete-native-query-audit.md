# Soft-Delete Native Query Audit (S12-F / Wave-10 P2-1)

**Date:** 2026-05-12
**Scope:** All `@Query(value = ..., nativeQuery = true)` declarations and
`EntityManager.createNativeQuery(...)` calls under `backend/src/main/java`.
**Convention:** All `TenantAware` / `BaseEntity` subclasses carry
`@Where(clause = "is_deleted = false")` on the entity. JPQL queries inherit that filter
automatically. Native SQL bypasses the filter and MUST therefore include `is_deleted = false` (or a
`deleted_at IS NULL` equivalent) explicitly on every table involved that has the column. The column
convention used throughout the codebase is `is_deleted BOOLEAN NOT NULL DEFAULT FALSE`.

## Methodology

1. Grepped all `nativeQuery = true` and `createNativeQuery(` occurrences.
2. For each, identified the underlying table(s) and confirmed whether the entity carries
   `@Where(clause = "is_deleted = false")`.
3. Categorised the query as:

- **SAFE** — already filters `is_deleted = false` (or `deleted_at IS NULL`) on every relevant
  table.
- **INTENTIONAL** — query is meant to surface soft-deleted rows (none found in scope).
- **LEAK** — query targets one or more soft-deletable tables without filtering out soft-deleted
  rows.

4. Picked the 5 highest-impact LEAKs and inlined `is_deleted = false` predicates with a
   `// SOFT_DELETE_GUARD (S12-F)` comment. No other changes were made (no entity / service / JPQL
   refactors).

## Inventory (28 native queries — 26 `@Query` + 2 `EntityManager.createNativeQuery`)

| #  | File:Line                                                                            | Tables touched                               | Status                         | Notes                                                                                                                                                                                                                                                                                                        |
|----|--------------------------------------------------------------------------------------|----------------------------------------------|--------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1  | `NotificationTemplateRepository.java:43` `searchTemplates`                           | `notification_templates`                     | **SAFE**                       | `t.is_deleted = false` present in both main + count query.                                                                                                                                                                                                                                                   |
| 2  | `RoleRepository.java:52` `findAllDescendantIds`                                      | `roles`                                      | **LEAK (low-risk, not fixed)** | Recursive CTE does not filter `is_deleted`. Risk is bounded: soft-deleted roles still in the role-hierarchy parent chain can leak descendant IDs into role-resolution. Not in top-5 critical leaks (UUID list, no payload). Recommend follow-up: add `AND r.is_deleted = false` inside both legs of the CTE. |
| 3  | `WikiPageRepository.java:46` `searchByTenant`                                        | `wiki_pages`                                 | **SAFE**                       | `wp.is_deleted = false` present.                                                                                                                                                                                                                                                                             |
| 4  | `WikiPageRepository.java:73` `searchByTenantBroad`                                   | `wiki_pages`                                 | **LEAK — FIXED**               | Broad RAG-retrieval search; soft-deleted wiki pages would have leaked into LLM prompt context. Added `wp.is_deleted = false` to both main and count query.                                                                                                                                                   |
| 5  | `BlogPostRepository.java:39` `searchByTenant`                                        | `blog_posts`                                 | **SAFE**                       | `bp.is_deleted = false` present.                                                                                                                                                                                                                                                                             |
| 6  | `BlogPostRepository.java:66` `searchByTenantBroad`                                   | `blog_posts`                                 | **LEAK — FIXED**               | Symmetric to #4 — same RAG-retriever leak via blogs. Added `bp.is_deleted = false` to both main and count query.                                                                                                                                                                                             |
| 7  | `StepExecutionRepository.java:156` `findInboxForUser`                                | `step_executions`, `workflow_executions`     | **LEAK — FIXED**               | Paginated approval inbox. Soft-deleted approvals (e.g. cancelled requests) could re-surface in user inboxes. Added `s.is_deleted = false AND e.is_deleted = false` to both main and count query.                                                                                                             |
| 8  | `WorkflowExecutionRepository.java:74` `getAverageApprovalTimeInHours`                | `workflow_executions`                        | **LEAK — FIXED**               | Analytics aggregate used by dashboards. Soft-deleted approved workflows polluted the average. Added `is_deleted = false`.                                                                                                                                                                                    |
| 9  | `PayslipRepository.java:147` `findByRunWithEmployee`                                 | `payslips`, `employees`                      | **LEAK (not in top-5)**        | Used for payslip batch reports. Same pattern as #10 but lower blast radius (a single payroll run scope is already narrow). Recommend follow-up identical to the fix applied at #10.                                                                                                                          |
| 10 | `PayslipRepository.java:163` `findByPeriodWithEmployee`                              | `payslips`, `employees`                      | **LEAK — FIXED**               | Used by statutory filing generators (PF / ESI). Soft-deleted payslips OR employees must not appear in government filings. Added `p.is_deleted = false` plus `e.is_deleted = false` on the join.                                                                                                              |
| 11 | `EmployeeRepository.java:138` `findDepartmentDistributionForEmployees`               | `employees`, `departments`                   | **LEAK (low-risk, not fixed)** | Caller already passes a curated `employeeIds` list and `e.status = 'ACTIVE'`, so soft-deleted rows with `status = 'ACTIVE'` would have to slip through both checks. Recommend follow-up adding `AND e.is_deleted = false AND d.is_deleted = false`.                                                          |
| 12 | `EmployeeRepository.java:186` `countHiresByTenantIdAndJoiningDateRange`              | `employees`                                  | **LEAK (low-risk, not fixed)** | Analytics-only hire-count grouping. Recommend follow-up.                                                                                                                                                                                                                                                     |
| 13 | `EmployeeRepository.java:205` `countTerminationsByTenantIdAndExitDateRange`          | `employees`                                  | **LEAK (low-risk, not fixed)** | Analytics-only termination-count grouping. Recommend follow-up.                                                                                                                                                                                                                                              |
| 14 | `EmployeeRepository.java:229` `getEmployeeCountByDepartment`                         | `employees`, `departments`                   | **LEAK (low-risk, not fixed)** | Aggregate count; soft-deleted employees would inflate counts. Recommend follow-up.                                                                                                                                                                                                                           |
| 15 | `EmployeeRepository.java:237` `findDepartmentDistribution`                           | `employees`, `departments`                   | **LEAK (low-risk, not fixed)** | Same pattern as #14 (limited to ACTIVE status). Recommend follow-up.                                                                                                                                                                                                                                         |
| 16 | `EmployeeRepository.java:240` `findUpcomingBirthdays`                                | `employees`                                  | **SAFE**                       | `e.is_deleted = false` present (and `status = 'ACTIVE'`).                                                                                                                                                                                                                                                    |
| 17 | `EmployeeRepository.java:262` `findUpcomingAnniversaries`                            | `employees`                                  | **SAFE**                       | `e.is_deleted = false` present.                                                                                                                                                                                                                                                                              |
| 18 | `EmployeeRepository.java:284` `findUpcomingBirthdaysWithDepartment`                  | `employees`, `departments`                   | **LEAK (low-risk, not fixed)** | Variant of #16 but does NOT filter `is_deleted`. Recommend follow-up: add `AND e.is_deleted = false` to bring it in line with #16.                                                                                                                                                                           |
| 19 | `EmployeeRepository.java:308` `findUpcomingAnniversariesWithDepartment`              | `employees`, `departments`                   | **LEAK (low-risk, not fixed)** | Variant of #17 missing the filter. Recommend follow-up.                                                                                                                                                                                                                                                      |
| 20 | `EmployeeRepository.java:435` `hasSkipLevelReports`                                  | `employees`                                  | **SAFE**                       | Both `e1.is_deleted = false` and `e2.is_deleted = false` present.                                                                                                                                                                                                                                            |
| 21 | `EmployeeRepository.java:464` `findDepartmentHeadUserId`                             | `users`, `employees`, `departments`          | **LEAK (low-risk, not fixed)** | Used for escalation routing. Returning a soft-deleted manager's user-id would mis-route escalations. Recommend follow-up adding `is_deleted = false` to all three joined tables.                                                                                                                             |
| 22 | `LeaveRequestRepository.java:59` `findLeaveTypeDistribution`                         | `leave_requests`, `leave_types`              | **LEAK (low-risk, not fixed)** | Analytics aggregate. Recommend follow-up.                                                                                                                                                                                                                                                                    |
| 23 | `LeaveRequestRepository.java:101` `countApprovedLeaveDaysByEmployeeIdAndDateBetween` | `leave_requests`                             | **LEAK (low-risk, not fixed)** | Used inside leave-balance / accrual math. Soft-deleted approved leaves could double-charge balances. Recommend follow-up as a Wave-11 hot-fix candidate.                                                                                                                                                     |
| 24 | `LeaveRequestRepository.java:146` `findByEmployeeWithTypeAndName`                    | `leave_requests`, `leave_types`, `employees` | **LEAK (low-risk, not fixed)** | Leave-history list view. Recommend follow-up.                                                                                                                                                                                                                                                                |
| 25 | `LeaveRequestRepository.java:162` `findByDateRangeWithTypeAndName`                   | `leave_requests`, `leave_types`, `employees` | **LEAK (low-risk, not fixed)** | Manager / HR list view. Recommend follow-up.                                                                                                                                                                                                                                                                 |
| 26 | `LeaveBalanceRepository.java:51` `findBalancesByEmployeeId`                          | `leave_balances`, `leave_types`              | **LEAK (low-risk, not fixed)** | Employee leave-balance dashboard read. Recommend follow-up.                                                                                                                                                                                                                                                  |
| 27 | `FluenceContentRetriever.java:230` `searchWikiByBodyText` (createNativeQuery)        | `wiki_pages`                                 | **SAFE**                       | `wp.is_deleted = false` present.                                                                                                                                                                                                                                                                             |
| 28 | `FluenceContentRetriever.java:256` `searchBlogByBodyText` (createNativeQuery)        | `blog_posts`                                 | **SAFE**                       | `bp.is_deleted = false` present.                                                                                                                                                                                                                                                                             |

## Summary by Category

| Category                        | Count |
|---------------------------------|-------|
| **SAFE**                        | 9     |
| **INTENTIONAL**                 | 0     |
| **LEAK (total)**                | 19    |
| ↳ fixed in this audit           | 5     |
| ↳ deferred (lower blast radius) | 14    |
| **TOTAL audited**               | 28    |

## Fixes Applied (5 / 5 budget)

The five LEAKs chosen were the highest-impact paths: user-visible content surfaces, government
filings, and approval-inbox correctness. Each fix adds `is_deleted = false` inline with a marker
comment so future audits / greps can locate the guard.

| # | File                                                                                                    | Original                                                  | Fix                                                                                                                                                                 |
|---|---------------------------------------------------------------------------------------------------------|-----------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1 | `backend/src/main/java/com/hrms/infrastructure/knowledge/repository/WikiPageRepository.java:73`         | `WHERE wp.tenant_id = :tenantId AND (...)`                | `WHERE wp.tenant_id = :tenantId AND wp.is_deleted = false AND (...)` — applied to both main + count query (RAG retriever was prompting the LLM with deleted wikis). |
| 2 | `backend/src/main/java/com/hrms/infrastructure/knowledge/repository/BlogPostRepository.java:66`         | `WHERE bp.tenant_id = :tenantId AND (...)`                | `WHERE bp.tenant_id = :tenantId AND bp.is_deleted = false AND (...)` — same RAG retriever, blogs side.                                                              |
| 3 | `backend/src/main/java/com/hrms/infrastructure/workflow/repository/StepExecutionRepository.java:156`    | join s + e with no `is_deleted` predicates                | added `AND s.is_deleted = false AND e.is_deleted = false` to both main + count query — fixes approval-inbox showing cancelled (soft-deleted) approvals.             |
| 4 | `backend/src/main/java/com/hrms/infrastructure/payroll/repository/PayslipRepository.java:163`           | join payslips + employees with no `is_deleted` predicates | added `p.is_deleted = false` in WHERE and `e.is_deleted = false` in the LEFT JOIN ON clause — statutory filings (PF/ESI) must not include soft-deleted records.     |
| 5 | `backend/src/main/java/com/hrms/infrastructure/workflow/repository/WorkflowExecutionRepository.java:74` | aggregate without `is_deleted` predicate                  | added `AND is_deleted = false` — workflow-approval analytics.                                                                                                       |

## Deferred — Recommend Follow-up Sweep

19 LEAKs identified — 14 deferred. They are mostly analytics aggregates (counts / distributions) and
list-view joins where the user-visible blast radius is bounded (tenant scope, status filters,
curated id lists). Recommended sequencing:

1. `LeaveRequestRepository.java:101` `countApprovedLeaveDaysByEmployeeIdAndDateBetween` — touches
   leave-balance math, should be the next fix after this audit.
2. `EmployeeRepository.java:464` `findDepartmentHeadUserId` — escalation routing correctness.
3. `EmployeeRepository.java:284` and `:308` — birthday/anniversary widgets must be aligned with
   their `is_deleted = false` siblings at `:240` / `:262`.
4. `PayslipRepository.java:147` `findByRunWithEmployee` — symmetric to fixed #10.
5. `RoleRepository.java:52` `findAllDescendantIds` — add `AND r.is_deleted = false` inside both legs
   of the recursive CTE.
6. The remaining analytics counts (`EmployeeRepository.java:138 / :186 / :205 / :229 / :237`,
   `LeaveRequestRepository.java:59 / :146 / :162`, `LeaveBalanceRepository.java:51`).

## Build Verification

```bash
cd backend
mvn -DskipTests compile      # BUILD SUCCESS (~01:08 min)
mvn test-compile             # BUILD SUCCESS (~19.6s)
```

Both pass on the five fixes above with no test-source changes required.

## Suggested Commit Message

```
fix(soft-delete): close 5 native-query @Where bypasses (S12-F / Wave-10 P2-1)

Native @Query and EntityManager.createNativeQuery calls bypass Hibernate's
@Where(clause = "is_deleted = false") filter on the entity. Audited 28
native queries; identified 19 leaks; fixed the 5 highest-impact paths:

- WikiPageRepository.searchByTenantBroad         (RAG retriever — LLM context)
- BlogPostRepository.searchByTenantBroad         (RAG retriever — LLM context)
- StepExecutionRepository.findInboxForUser       (approval inbox correctness)
- PayslipRepository.findByPeriodWithEmployee     (PF/ESI statutory filings)
- WorkflowExecutionRepository.getAverageApprovalTimeInHours (workflow analytics)

Each fix adds an explicit AND is_deleted = false predicate marked with a
// SOFT_DELETE_GUARD (S12-F) comment for traceability. 14 remaining lower-
risk leaks are catalogued in docs/audit/soft-delete-native-query-audit.md
for a follow-up sweep.
```
