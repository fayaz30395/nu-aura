# US-2GBAZ3KJ6CTS: BUG-L1: learning paths list + enrol endpoints missing — Programs page loads forever

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

- **AC1:** GET /api/v1/lms/learning-paths returns a page whose fields match what /learning/paths renders (incl. isEnrolled), and POST /learning-paths/{id}/enroll enrols the caller in every member course, idempotently
  - **Verify:** shell bash -c "cd backend && mvn -q -Dtest=LmsLearningPathContractTest,LmsServiceTest -Dsurefire.failIfNoSpecifiedTests=false test"
  - **Verified:** pending
- **AC2:** The /learning/paths page leaves its loading state and shows either real paths or an honest empty/error state
  - **Verify:** shell bash -c "cd frontend && PLAYWRIGHT_BASE_URL=http://localhost:3010 npx playwright test --config=playwright.live.config.ts --project=chromium e2e/defect-regressions.spec.ts -g BUG-L1 --reporter=line"
  - **Verified:** pending
