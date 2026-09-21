# RV-2FZGTQ8SFCGJ: Fixed bulk attendance check-in/out rollback bug: AttendanceRecordService.bulkCheckIn/bulkCheckOut now route each employee through a self-proxied REQUIRES_NEW method (checkInForBulk/checkOutForBulk), reusing the existing single-employee checkIn/checkOut logic instead of the batched saveAll() path. One employee's failure no longer rolls back the batch, honoring the BulkResult partial-success contract. Removed the now-dead in-memory batch duration helper and its unused imports. Updated AttendanceRecordServiceTest bulk-operation tests to mock the single-item repository calls and added an explicit assertion that a failing employee's exception doesn't block the successful employee's save.

> **Story:** US-2FZFCYCKZTZ9
> **Author:** faylo-backend-engineer
> **Reviewer:** faylo-qa-reviewer
> **Verdict:** pass
> **Created:** 2026-09-20
> **Created-by:** faylo new

## Findings

...
