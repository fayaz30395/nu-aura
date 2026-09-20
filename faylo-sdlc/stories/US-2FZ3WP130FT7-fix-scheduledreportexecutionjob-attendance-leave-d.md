# US-2FZ3WP130FT7: Fix ScheduledReportExecutionJob: attendance/leave/default reports email fabricated zero-data

> **Epic:** EP-2FWVEHJV5G29
> **Tier:** async-review
> **Status:** Done
> **Created:** 2026-09-20
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** generateReport() builds real attendance/leave aggregation data (presentDays/absentDays/records/balances/totalEmployees etc computed from actual repositories) for ATTENDANCE, LEAVE, and default report types instead of hardcoded zero/empty placeholders - matching the pattern already used for whichever report types (if any) already compute real data
  - **Verify:** shell bash -c "cd backend && mvn -q -DskipTests compile"
  - **Verified:** yes (2026-09-20)
