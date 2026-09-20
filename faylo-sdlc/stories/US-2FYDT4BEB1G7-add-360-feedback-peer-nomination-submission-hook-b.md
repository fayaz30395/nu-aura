# US-2FYDT4BEB1G7: Add 360-feedback peer nomination submission hook (backend endpoint live, frontend unreachable)

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

- **AC1:** frontend/app/performance/360-feedback/page.tsx (or a nomination sub-flow) calls POST /cycles/{cycleId}/requests via a new useCreateFeedback360Request hook so cycle admins/employees can actually nominate peers
  - **Verify:** shell bash -c "cd frontend && npx tsc --noEmit"
  - **Verified:** yes (2026-09-20)
