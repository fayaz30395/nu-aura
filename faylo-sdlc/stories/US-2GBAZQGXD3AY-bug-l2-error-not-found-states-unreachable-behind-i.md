# US-2GBAZQGXD3AY: BUG-L2: error/not-found states unreachable behind isLoading, plus an inaccessible spinner

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

- **AC1:** 4xx responses are not retried (the not-found branch is reachable without waiting out a second timeout)
  - **Verify:** shell bash -c "cd frontend && npx vitest run lib/__tests__/queryClient.test.ts"
  - **Verified:** yes (2026-09-25)
- **AC2:** LMS loading states use the shared Spinner (role=status + accessible name); no bare animate-spin divs remain on those routes
  - **Verify:** shell bash -c "cd frontend && PLAYWRIGHT_BASE_URL=http://localhost:3010 npx playwright test --config=playwright.live.config.ts --project=chromium e2e/defect-regressions.spec.ts -g BUG-L2 --reporter=line"
  - **Verified:** no (2026-09-25)
