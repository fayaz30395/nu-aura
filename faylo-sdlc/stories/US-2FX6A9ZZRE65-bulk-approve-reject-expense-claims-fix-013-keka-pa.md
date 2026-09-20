# US-2FX6A9ZZRE65: Bulk approve/reject expense claims (FIX-013 Keka parity)

> **Epic:** EP-2FWVEHJV5G29
> **Tier:** async-review
> **Status:** Done
> **Created:** 2026-09-19
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** POST /api/v1/expenses/batch-approve and /batch-reject exist, gated by EXPENSE_APPROVE (there is no separate EXPENSE_REJECT permission — reject also requires EXPENSE_APPROVE, matching the single-item /{claimId}/reject endpoint), reuse existing per-claim approve/reject via self-proxy, with unit tests
  - **Verify:** shell bash -c "grep -q '\"/batch-approve\"' backend/src/main/java/com/nulogic/api/expense/controller/ExpenseClaimController.java && grep -q '\"/batch-reject\"' backend/src/main/java/com/nulogic/api/expense/controller/ExpenseClaimController.java && grep -q 'batchApprove\|batchReject' backend/src/main/java/com/nulogic/application/expense/service/ExpenseClaimService.java"
  - **Verified:** yes (2026-09-19)
