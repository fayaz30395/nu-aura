# RV-2FZHPY93YSY0: Investigated optimistic locking for PerformanceReview and found it already implemented, not a gap: PerformanceReview extends TenantAware -> BaseEntity, which already declares a @Version Long field; the performance_reviews table already has a 'version BIGINT DEFAULT 0' column (V0__init.sql); GlobalExceptionHandler already maps ObjectOptimisticLockingFailureException to 409/CONCURRENT_MODIFICATION generically for all entities. No PerformanceReviewRepository bulk/@Modifying queries bypass the entity save() path. Two overlapping submitManagerReview/submitSelfAssessment calls already 409 on the second save via Hibernate's version-checked UPDATE. Added PerformanceReviewOptimisticLockingTest confirming the @Version field and the exception-handler wiring by reflection (no DB integration-test infra exists in this codebase to exercise a live conflict, so this is the pragmatic proof matching the story's own compile-only Verify). No production code changed.

> **Story:** US-2FZF1K88SWSG
> **Author:** faylo-backend-engineer
> **Reviewer:** faylo-qa-reviewer
> **Verdict:** pass
> **Created:** 2026-09-20
> **Created-by:** faylo new

## Findings

...
