# US-2G019SFHC7ND: Fix loans page View Active Loans button - pushes ?filter=active query param that the page never reads, click just reloads unfiltered list

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

- **AC1:** View Active Loans button actually filters the list to active loans
  - **Verify:** shell bash -c "cd frontend && npx tsc --noEmit"
  - **Verified:** yes (2026-09-21)
