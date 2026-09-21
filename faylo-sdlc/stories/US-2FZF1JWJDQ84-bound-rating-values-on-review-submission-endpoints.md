# US-2FZF1JWJDQ84: Bound rating values on review-submission endpoints (self, manager, generic)

> **Epic:** EP-2FWVEHJV5G29
> **Tier:** async-review
> **Status:** Done
> **Created:** 2026-09-20
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** SelfAssessmentRequest competency ratings, ManagerReviewRequest.overallRating, ReviewRequest.overallRating rejected with 400 outside valid scale, matching CalibrationRatingRequest's existing @Min/@Max pattern
  - **Verify:** shell bash -c "cd backend && mvn -q -DskipTests compile"
  - **Verified:** yes (2026-09-20)
