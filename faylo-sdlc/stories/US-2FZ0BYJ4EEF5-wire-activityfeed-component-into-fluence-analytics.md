# US-2FZ0BYJ4EEF5: Wire ActivityFeed component into Fluence analytics page (replace inline duplicate)

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

- **AC1:** app/fluence/analytics/page.tsx uses ActivityFeed.tsx (filterable/paginated, actively maintained) instead of its cruder inline recentActivities.slice(0,10) block
  - **Verify:** shell bash -c "cd frontend && npx tsc --noEmit"
  - **Verified:** yes (2026-09-20)
