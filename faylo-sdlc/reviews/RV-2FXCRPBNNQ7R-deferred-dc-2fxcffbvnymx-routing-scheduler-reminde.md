# RV-2FXCRPBNNQ7R: Deferred DC-2FXCFFBVNYMX: routing scheduler reminder creation through ContractReminderService's single-upsert methods (find-any-pending, update date) would collapse the documented/tested 30/15/7-day multi-window expiry-reminder cadence into 1 reminder per contract+type — a regression, confirmed by existing tests asserting multi-window creation. Implemented conservative option instead: added reconcileStaleReminders() to ContractLifecycleScheduler, deleting pending reminders whose date no longer matches a currently-valid target date (root-causes the described staleness bug — a contract end-date change no longer leaves orphaned stale reminder rows — without touching the multi-window design or existing idempotency checks). Also added GET /contracts/reminders/today, GET /contracts/reminders/overdue, PATCH /contracts/reminders/{id}/complete to ContractController (CONTRACT_VIEW / CONTRACT_UPDATE permissions, matching existing convention), backed by the previously-orphaned ContractReminderService read methods. New ContractReminderDto mirrors ContractDto's style. mvn compile clean; 55 tests pass (ContractControllerTest, ContractLifecycleSchedulerTest, ContractReminderServiceTest) including the pre-existing multi-window/idempotency assertions.

> **Story:** US-2FXCB6GNEF0X
> **Author:** faylo-backend-engineer
> **Reviewer:** faylo-qa-reviewer
> **Verdict:** pass
> **Created:** 2026-09-20
> **Created-by:** faylo new

## Findings

...
