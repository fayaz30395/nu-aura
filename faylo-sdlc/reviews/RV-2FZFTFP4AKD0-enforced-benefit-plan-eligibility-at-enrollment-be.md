# RV-2FZFTFP4AKD0: Enforced benefit plan eligibility at enrollment: BenefitEnhancedService.enrollEmployee now validates eligibleGrades (vs Employee.level), eligibleDepartments (vs Employee.departmentId), minServiceMonths and waitingPeriodDays (vs joiningDate) before creating an enrollment, throwing IllegalArgumentException (400) on violation. Criteria are opt-in: blank/zero fields impose no restriction. 3 unit tests added covering grade, tenure, and waiting-period rejection paths.

> **Story:** US-2FZ9342C8D6Q
> **Author:** faylo-backend-engineer
> **Reviewer:** faylo-qa-reviewer
> **Verdict:** pass
> **Created:** 2026-09-20
> **Created-by:** faylo new

## Findings

...
