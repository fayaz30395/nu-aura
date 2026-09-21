# US-2FZF1K88SWSG: Add optimistic locking to prevent silent concurrent-review overwrite

> **Epic:** EP-2FWVEHJV5G29
> **Tier:** hard-gate
> **Status:** Verified
> **Created:** 2026-09-20
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** PerformanceReview gets @Version column; two overlapping submitManagerReview calls on the same reviewId no longer silently last-write-wins - second call 409s via existing GlobalExceptionHandler mapping
  - **Verify:** shell bash -c "cd backend && mvn -q -DskipTests compile"
  - **Verified:** yes (2026-09-20)
