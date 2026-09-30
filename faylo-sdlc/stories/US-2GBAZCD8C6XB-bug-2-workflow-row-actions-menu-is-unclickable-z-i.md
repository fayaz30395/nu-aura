# US-2GBAZCD8C6XB: BUG-2: workflow row-actions menu is unclickable (z-index trapped inside PageTransition)

> **Epic:** EP-2G4FWY5JGW6W
> **Tier:** async-review
> **Status:** Draft
> **Created:** 2026-09-25
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** The row actions menu opens, its items are hittable, and Escape closes it
  - **Verify:** shell bash -c "cd frontend && PLAYWRIGHT_BASE_URL=http://localhost:3010 npx playwright test --config=playwright.live.config.ts --project=chromium e2e/defect-regressions.spec.ts -g BUG-2 --reporter=line"
  - **Verified:** no (2026-09-25)
