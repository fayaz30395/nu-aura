# RV-2FZ9AK2K41Q8: Ported PSAProject's billing shape onto HRMS Project: added billingType/isBillable/defaultBillingRate/clientId fields + independent BillingType enum (TIME_AND_MATERIAL/FIXED_PRICE/NON_BILLABLE/RETAINER, not imported from psa package). New V319 migration matching the 4 columns exactly (defaults NON_BILLABLE/false). Wired through Create/UpdateProjectRequest + ProjectResponse + ProjectService's existing builder/patch pattern, mirroring how budget/currency are handled. ProjectMember untouched per scope. mvn compile clean.

> **Story:** US-2FZ92MB7FK23
> **Author:** faylo-backend-engineer
> **Reviewer:** faylo-qa-reviewer
> **Verdict:** pass
> **Created:** 2026-09-20
> **Created-by:** faylo new

## Findings

...
