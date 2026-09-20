# US-2FYDXEMGD2V1: Delete confirmed-dead frontend code (charts, CalibrationMatrix, feedback forms, hero, doc-workflow hooks, drive helpers, orphan test)

> **Epic:** EP-2FWVEHJV5G29
> **Tier:** autonomous
> **Status:** Done
> **Created:** 2026-09-20
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** 6 confirmed-dead files/clusters removed: components/charts/{6 files}+index.ts+lazy exports; CalibrationMatrix.tsx; FeedbackRequestForm.tsx+FeedbackResponseForm.tsx; AppLandingHero.tsx; useDocumentWorkflow.ts; driveHelpers.ts; useAnimation.test.ts
  - **Verify:** shell bash -c "cd frontend && npx tsc --noEmit"
  - **Verified:** yes (2026-09-20)
