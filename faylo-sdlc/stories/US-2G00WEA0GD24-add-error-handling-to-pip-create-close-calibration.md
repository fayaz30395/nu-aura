# US-2G00WEA0GD24: Add error handling to PIP create/close, calibration save, and feedback create/delete mutations - all currently fail silently with no onError/try-catch, unlike sibling goals/reviews pages

> **Epic:** EP-2FWT73TBXRCF
> **Tier:** async-review
> **Status:** Done
> **Created:** 2026-09-21
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** Failed mutations show a visible error message on all 4 pages
  - **Verify:** shell bash -c "cd frontend && npx tsc --noEmit"
  - **Verified:** yes (2026-09-21)
