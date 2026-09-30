# US-2GBAZQPR4FWQ: BUG-F1 + BUG-E2: dead primary CTAs (my-content empty state, My claims tile)

> **Epic:** EP-2G4FWY5JGW6W
> **Tier:** autonomous
> **Status:** Draft
> **Created:** 2026-09-25
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** The my-content empty-state CTA navigates to the create page, and the My claims tile selects the My claims view
  - **Verify:** shell bash -c "cd frontend && PLAYWRIGHT_BASE_URL=http://localhost:3010 npx playwright test --config=playwright.live.config.ts --project=chromium e2e/defect-regressions.spec.ts -g \"BUG-F1|BUG-E2\" --reporter=line"
  - **Verified:** no (2026-09-25)
