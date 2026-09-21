# US-2G00ZAHWVF5F: Fix Payslips and Assets pages: isError from the query hook is discarded, failed fetch renders identically to genuine empty state (No Payslips Found / No assets assigned)

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

- **AC1:** Both pages distinguish a fetch error from a genuine empty result
  - **Verify:** shell bash -c "cd frontend && npx tsc --noEmit"
  - **Verified:** yes (2026-09-21)
