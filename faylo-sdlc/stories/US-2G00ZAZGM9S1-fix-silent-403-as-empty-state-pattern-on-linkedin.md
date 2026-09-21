# US-2G00ZAZGM9S1: Fix silent-403-as-empty-state pattern on LinkedIn Posts, Departments (dept-head dropdown), and Expenses (pending-approvals) - permission errors are indistinguishable from genuine empty results, should surface a permission notice instead

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

- **AC1:** 403 responses on these three surfaces show a permission-denied indicator, not a fake empty state
  - **Verify:** shell bash -c "cd frontend && npx tsc --noEmit"
  - **Verified:** yes (2026-09-21)
