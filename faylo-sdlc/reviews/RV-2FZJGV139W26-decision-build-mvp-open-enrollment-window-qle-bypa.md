# RV-2FZJGV139W26: Decision: build MVP open-enrollment window + QLE bypass rather than full Keka-parity scope. Added nullable enrollmentWindowStart/End on BenefitPlanEnhanced (null=always open, backward compatible with existing plans) and qualifyingLifeEvent/qleReason on BenefitEnrollment/EnrollmentRequest. enrollEmployee now rejects enrollment outside the window (400) unless the request declares a QLE. Flyway V320 adds the 4 columns. Deferred (documented): QLE approval/audit trail, QLE-type catalog/enum, automatic annual-window scheduling, employee-facing UI for window/QLE (frontend follow-up needed). Added 2 new tests (window rejection + QLE bypass) to BenefitEnhancedServiceEligibilityTest.

> **Story:** US-2FZ935RGM35F
> **Author:** faylo-backend-engineer
> **Reviewer:** faylo-qa-reviewer
> **Verdict:** pass
> **Created:** 2026-09-20
> **Created-by:** faylo new

## Findings

...
