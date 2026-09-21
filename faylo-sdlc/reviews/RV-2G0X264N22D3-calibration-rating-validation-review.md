# RV-2G0X264N22D3: Calibration rating validation review

> **Story:** US-2FZSWJ2S3PN6
> **Author:** backend-lead
> **Reviewer:** async-qa-reviewer
> **Verdict:** approve
> **Created:** 2026-09-21
> **Created-by:** faylo new

## Findings

Wired dead CalibrationRatingRequest DTO (@NotNull @Min(1) @Max(5)) into PUT /review-cycles/reviews/{id}/calibration-rating, replacing raw @RequestParam Integer. Updated ReviewCycleControllerTest to send JSON body instead of query param. Test suite passes.
