# RV-2FXC74NVXCK2: Wired ScorecardForm (react-hook-form+zod, real backend at /recruitment/scorecards via ScorecardController) into InterviewScorecardModal as a per-interview 'Submit Scorecard' toggle. Confirmed the two type families represent genuinely different backend concepts: InterviewScorecardModal shows Interview.rating/feedback/notes (simple fields on the Interview entity), while ScorecardForm/useScorecard operate on a separate InterviewScorecard entity (criteria, weights, recommendation, templates) with its own real controller/service/repository — reconcilable as complementary features on the same modal, not duplicate typing, so no decision defer needed. tsc --noEmit clean.

> **Story:** US-2FXC19K3YS5M
> **Author:** faylo-frontend-engineer
> **Reviewer:** faylo-qa-reviewer
> **Verdict:** pass
> **Created:** 2026-09-20
> **Created-by:** faylo new

## Findings

...
