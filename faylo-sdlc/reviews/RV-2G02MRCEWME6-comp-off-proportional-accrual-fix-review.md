# RV-2G02MRCEWME6: Comp-off proportional accrual fix review

> **Story:** US-2FZSYXMVVJ9W
> **Author:** backend-lead
> **Reviewer:** backend-lead
> **Verdict:** approve
> **Created:** 2026-09-21
> **Created-by:** faylo new

## Findings

calculateCompOffDays floored any overtime under halfDayMinutes to 0 (BigDecimal remainder bug). Since minOvertimeMinutes is already enforced by the caller and 0.5 days is the minimum accrual unit, collapsed the proportional branch to always award 0.5 days below the full-day threshold. Compiles clean.
