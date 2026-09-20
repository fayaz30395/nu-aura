# US-2FXA9A0ES10G: Fix hardcoded Performance Revolution spider-chart + owner name (Grow gap)

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

- **AC1:** PerformanceRevolutionService.getPerformanceSpider() returns real per-employee competency data instead of hardcoded numbers; getOkrGraph ownerName resolves the real employee name instead of literal Owner
  - **Verify:** shell bash -c "cd backend && mvn -q -DskipTests compile"
  - **Verified:** yes (2026-09-20)
