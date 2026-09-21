# US-2G00TYNYVWFW: Fix onboarding templates page: Edit/Delete card buttons have no handlers and missing stopPropagation, clicking Delete navigates to detail page instead of deleting

> **Epic:** EP-2FWT73TBXRCF
> **Tier:** async-review
> **Status:** Draft
> **Created:** 2026-09-21
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** Edit/Delete buttons work correctly and do not trigger the parent card's navigate-on-click
  - **Verify:** shell bash -c "cd frontend && npx tsc --noEmit"
  - **Verified:** pending
