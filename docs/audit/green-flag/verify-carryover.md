# Carry-Over Re-Verification — HEAD f1f530c4

**Agent:** verify-carryover · **Date:** 2026-06-21 · **Method:** static code read at current HEAD (moved past last green-flag run 74c61449). Code-only, no browser/deploy.

## REGRESSIONS / CONTRADICTIONS (READ FIRST)

**SEC-4 (Groq key) — board claim is FACTUALLY WRONG.** The board says "verify `git log -S 'gsk_ryq7hgo9' --all` shows no history hit" / "confirm it never entered git history." It DID enter git history.

- The full key value `gsk_ryq7hgo9...` was committed in `backend/start-backend.sh` in commit **83f70807** ("test", 2026-03-16, author Fayaz):
  `export OPENAI_API_KEY="${OPENAI_API_KEY:-gsk_ryq7hgo9…}"` (full value present in that commit's diff).
- It was later neutralized to empty (`OPENAI_API_KEY:-}`) in commit **fb465678**, and `start-backend.sh` at HEAD line 50 is clean.
- BUT the key remains readable in history: `git log --all -S '<full-key>'` returns commits 83f70807 and fb465678.
- HEAD-tracked files no longer contain the value (only `ISSUE_BOARD.md` mentions the `gsk_ryq7hgo9...` *prefix* in prose).

This is **not** a code regression introduced by a later commit — it is a pre-existing history exposure that the board incorrectly recorded as "no history hit." The remediation (rotate key + purge history) is still required and is currently understated. Severity: HIGH (live credential in immutable git history; must rotate at console.groq.com and rewrite history before any public repo exposure). Key value NOT reproduced here.

No code-level functional regressions found. All other Closed/Fixed items still hold at HEAD.

## Verification Table

| Item | File:line | Still Fixed? | Evidence |
|------|-----------|--------------|----------|
| BA-1/REG-1 | PayrollRunService.java:386-389, 538 | YES | `leaveDays = computeApprovedLeaveDays(...)`; `presentDays = computePresentDays(...)`; computed `workingDays = countWorkingDays(...)` (360). APPROVED-only filter: `if (leave.getStatus() != APPROVED) continue` (538). No hardcoded 30/30/0. |
| DATA-2/REG-3 (SUSPENDED enum) | User.java:197 | YES | `SUSPENDED` present in `enum UserStatus`. |
| DATA-2 (isEnabled wired) | UserPrincipal.java:65-105 | YES | account flags derived from `user.getStatus()`; `status == ACTIVE` / `status != LOCKED` instead of hardcoded true. |
| DATA-2 (user deactivation on termination) | EmployeeService.java:~726 | YES | `deleteEmployee` sets `linkedUser.setStatus(UserStatus.INACTIVE); userRepository.save(linkedUser)`. |
| DATA-1 (endDate>=startDate) | LeaveRequestService.java:336-340 | YES | `validateDateRange`: `if (endDate.isBefore(startDate)) throw...`; called from create (102) and update (419). |
| BA-2 (onRejected releasePendingLeave) | LeaveRequestService.java:541,567 | YES | `onRejected(...)` calls `leaveBalanceService.releasePendingLeave(...)` at 567. |
| RBAC-1 (enforceEmployeeViewScope) | EmployeeController.java:181,273,289,325; BenefitEnhancedController.java:39 | YES | Scope guard called on all employee GETs; mirrored in benefits controller. |
| RBAC-2 (leave-balances scope) | LeaveBalanceController.java:42,81,99 | YES | `enforceLeaveBalanceViewScope(employeeId)` called at 81 and 99. |
| RBAC-3 (statutory Permission.* constants) | ESIController.java:30,42; TDSController.java:30; TaxDeclarationController.java:74,80 | YES | `@RequiresPermission(Permission.STATUTORY_VIEW/_MANAGE)` constants, not underscore string literals. |
| RBAC-4 (benefit claim ownership) | BenefitEnhancedService.java:407-418 | YES | submitClaim: non-admin must own enrollment (`currentEmployeeId.equals(enrollment.getEmployeeId())` else AccessDeniedException). |
| RBAC-5b (EmployeeSkillController:58) | EmployeeSkillController.java:58 | YES | `enforceEmployeeViewScope(employeeId)` present before fetch. |
| RBAC-6b (DashboardsController:195) | DashboardsController.java:158,195 | YES | `enforceEmployeeDashboardViewScope(employeeId)` called at 195. |
| SEC-3 (statutory payslip tenant filter) | StatutoryService.java:308; MonthlyStatutoryContributionRepository.java:19 | YES | `findByPayslipIdAndTenantId(payslipId, tenantId)`. |
| SEC-4 wall (reactions tenantId) | WallService.java:315; PostReactionRepository.java:97 | YES | `findAllByPostIdAndTenantIdWithDetails(postId, tenantId, ...)`. |
| SEC-4 wall (comments tenantId) | WallService.java:350; PostCommentRepository.java:24 | YES | `findTopLevelCommentsByPostIdAndTenantId(postId, tenantId, ...)`. |
| INT-1 (PAYROLL_PROCESSING_DLT) | DeadLetterHandler.java:128 | YES | `PAYROLL_PROCESSING_DLT` in `@KafkaListener` topics array. |
| INT-2 (DocuSign .timeout()) | DocuSignApiClient.java (6×), DocuSignAuthService.java:274 | YES | 7 `.timeout(Duration.ofSeconds(30))` sites — superset of 3 cited. |
| INT-4 (webhook stale sweep) | WebhookDeliveryService.java:516-527; WebhookDeliveryRepository.java:76,90 | YES | `reclaimStaleInFlightDeliveries` resets PENDING/DELIVERING → RETRYING before retry loop. |
| DEV-1 (workflow pessimistic lock) | WorkflowService.java:664,1122 | YES | `findByIdAndTenantIdForUpdate` (PESSIMISTIC_WRITE) on approval path + re-check terminal state. |
| PROD-1 (payroll run detail page) | frontend/app/payroll/runs/[id]/page.tsx | YES | File exists. |
| PROD-4 (IN-only enforcement) | PayrollRunService.java:79-80; PayslipService.java:175 | YES | Run creation blocked for non-IN (US/UK 501 stubs); controller maps to 501. |
| SEC-3b (DEMO_CREDENTIALS_ENABLED default) | application.yml:121; application-prod.yml:98 | YES | `demoCredentialsEnabled: ${DEMO_CREDENTIALS_ENABLED:false}` in both base + prod (fail-closed). V270 + V272 lockdown migrations present. Live env override is a separate user action. |
| SEC-4 (Groq key in git history) | start-backend.sh @ commit 83f70807 / fb465678 | **NO** | Key value committed in 83f70807, neutralized in fb465678, but still in history. Board's "no history hit" claim is wrong. Empty at HEAD (start-backend.sh:50). |

## Summary

- **Verified still fixed:** 21 of 22 code/config items.
- **Regressed / contradicted:** 1 — SEC-4 Groq key (board claim "never entered git history" is false; key IS in history, rotation + history purge required).
- **No functional code regressions** introduced by commits between 74c61449 and f1f530c4.
