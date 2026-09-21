# RV-2FZH2MV75VSZ: Fixed bulk employee import rollback bug: EmployeeImportService.executeImport now routes each row through a self-proxied REQUIRES_NEW method (importRow), reusing the existing createUserForEmployee/createEmployee/saveCustomFieldValues logic. One row's DB-level failure (e.g. a race-condition duplicate employee_code missed by the earlier snapshot-based uniqueness check) now marks only that row's transaction rollback-only instead of poisoning the whole import, honoring the PARTIAL_SUCCESS reporting the method already claims. Same pattern as EmployeeService.batchUpdateStatus/LeaveRequestService.batchApprove. Added EmployeeImportServiceTest asserting a failing row doesn't drop the already-succeeded row from the result.

> **Story:** US-2FZFCYQ4MFBC
> **Author:** faylo-backend-engineer
> **Reviewer:** faylo-qa-reviewer
> **Verdict:** pass
> **Created:** 2026-09-20
> **Created-by:** faylo new

## Findings

...
