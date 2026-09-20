# US-2FYZPAC6P52N: Wire nav links to orphaned cycle sub-routes (calibration, nine-box)

> **Epic:** EP-2FWVEHJV5G29
> **Tier:** autonomous
> **Status:** Done
> **Created:** 2026-09-20
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** app/performance/cycles/page.tsx (cycle list) links each cycle to its calibration and nine-box sub-routes, which currently have zero entry points anywhere in the app
  - **Verify:** shell bash -c "cd frontend && npx tsc --noEmit"
  - **Verified:** yes (2026-09-20)
