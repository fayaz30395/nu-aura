# RV-2FZRGJMN4TT2: Decided to formalize the split rather than fully merge the two F&F settlement writers. Full merge would mean reconciling FullAndFinalSettlementResponse and FnFCalculationResponse (different shapes, both with live frontend consumers) for no added safety — the one dangerous divergence point, approval, was already consolidated onto FnFCalculationService.approve in the prior story. Documented ownership in-code: FnFCalculationService's class javadoc states it's canonical for calc+approval and lists what ExitManagementService duplicates and why; ExitManagementService's settlement-section comment points back and states any future cross-cutting mutation must delegate the same way approveSettlement already does. No behavior change, no test change (compile-only verify).

> **Story:** US-2FZRCP9MG4NV
> **Author:** faylo-backend-engineer
> **Reviewer:** faylo-qa-reviewer
> **Verdict:** pass
> **Created:** 2026-09-20
> **Created-by:** faylo new

## Findings

...
