# RV-2FZR3W2FVWM5: Consolidated the duplicate F&F settlement service logic. Root cause: both offboarding F&F surfaces already shared one FullAndFinalSettlement entity/table (no duplicate data model) but had two independent, uncoordinated service implementations of create+approve. FnFCalculationService (backing /offboarding/fnf) is canonical — real statutory gratuity calc (Payment of Gratuity Act incl. 240-day rule), auto-computation from employee/salary data, and a status-guarded approve (DRAFT/PENDING_APPROVAL only). ExitManagementService's settlement methods (backing /offboarding/[id]/fnf) were thin manual CRUD: createSettlement had no guard against a second row for the same exitProcessId, and approveSettlement approved from any status with no state-machine check. Fixed both gaps by consolidating onto FnFCalculationService: createSettlement now rejects if a settlement already exists for the exit process; approveSettlement delegates to FnFCalculationService.approve instead of duplicating the status guard. Added ExitManagementServiceSettlementConsolidationTest covering both. Found and flagged (not touched) a third redundant frontend page bypassing fnf.service.ts entirely with raw fetch calls to the same endpoints.

> **Story:** US-2FZQPK4ZEDN6
> **Author:** faylo-backend-engineer
> **Reviewer:** faylo-qa-reviewer
> **Verdict:** pass
> **Created:** 2026-09-20
> **Created-by:** faylo new

## Findings

...
