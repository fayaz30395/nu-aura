# RV-2FZFGSD788TH: Populated pendingAcknowledgments in compliance dashboard: counts distinct in-scope active employees who have a published policy past its acknowledgment window (effectiveDate + acknowledgmentFrequencyDays) without a recorded acknowledgment for the current version. Added PolicyAcknowledgmentRepository.findAcknowledgedEmployeeIds and reused DataScopeService/EmployeeRepository for scoping. Added unit tests covering zero-pending and one-pending-employee cases.

> **Story:** US-2FZ93K93RN6C
> **Author:** faylo-backend-engineer
> **Reviewer:** faylo-qa-reviewer
> **Verdict:** pass
> **Created:** 2026-09-20
> **Created-by:** faylo new

## Findings

...
