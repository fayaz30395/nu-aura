# RV-2FZG741D9GZN: Bounded rating values on review-submission endpoints: added @Min(1)/@Max(5) to SelfAssessmentRequest.CompetencyRatingItem.rating and ManagerReviewRequest.overallRating (matching CalibrationRatingRequest), @DecimalMin/@DecimalMax(1-5) to ReviewRequest.overallRating (BigDecimal), plus @Valid on nested competencyRatings lists so item-level constraints are enforced. Controller params already had @Valid. Added MockMvc tests confirming 400 on out-of-range self-assessment, manager-review, and review-create payloads.

> **Story:** US-2FZF1JWJDQ84
> **Author:** faylo-backend-engineer
> **Reviewer:** faylo-qa-reviewer
> **Verdict:** pass
> **Created:** 2026-09-20
> **Created-by:** faylo new

## Findings

...
