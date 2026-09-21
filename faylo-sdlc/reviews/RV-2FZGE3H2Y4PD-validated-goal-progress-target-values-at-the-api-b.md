# RV-2FZGE3H2Y4PD: Validated goal progress/target values at the API boundary: GoalService.updateProgress now rejects null/out-of-range (0-100) progressPercentage with IllegalArgumentException (400) — root-caused in the service since GoalController is its only caller. GoalRequest gained @PositiveOrZero on targetValue/currentValue and an @AssertTrue cross-field check rejecting dueDate before startDate. Controller endpoints already had @Valid. Updated an existing test that had encoded the old exceeds-100 bug as expected behavior; added new unit tests for rejection paths and GoalRequest bean-validation tests.

> **Story:** US-2FZF1K3ATY44
> **Author:** faylo-backend-engineer
> **Reviewer:** faylo-qa-reviewer
> **Verdict:** pass
> **Created:** 2026-09-20
> **Created-by:** faylo new

## Findings

...
