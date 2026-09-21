# RV-2FZHV4D2TEES: Validated review-cycle date ordering: ReviewCycleRequest gained @AssertTrue checks rejecting endDate before startDate and selfReviewDeadline/managerReviewDeadline outside [startDate, endDate] (each check is opt-in: null dates impose no constraint). Controller endpoints (createCycle/updateCycle) already had @Valid. Added ReviewCycleRequestTest covering all three rejection cases plus a valid-cycle pass case.

> **Story:** US-2FZF1KCRXXW7
> **Author:** faylo-backend-engineer
> **Reviewer:** faylo-qa-reviewer
> **Verdict:** pass
> **Created:** 2026-09-20
> **Created-by:** faylo new

## Findings

...
