# US-2FZSWJ2S3PN6: Wire calibration-rating validation: PUT /performance/reviews/{id}/calibration-rating accepts raw unvalidated Integer, dead CalibrationRatingRequest DTO already has correct @Min(1)@Max(5)

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

- **AC1:** Endpoint rejects out-of-range calibration ratings (1-5) with 400
  - **Verify:** shell mvn -q -DskipTests compile
  - **Verified:** pending
