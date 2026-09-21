# US-2G01Q24P61Z6: Consolidate duplicate salary-structures pages: /payroll/salary-structures (list-only, in nav) vs /payroll/structures (full CRUD, not in nav but still linked from payroll home and admin payroll pages) - same data, two inconsistent UIs

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

- **AC1:** Single salary-structures UI, all links point to the same canonical page, dead route removed
  - **Verify:** shell bash -c "cd frontend && npx tsc --noEmit"
  - **Verified:** yes (2026-09-21)
