# RV-2FZN0YM2A0G8: Added daily PolicyAcknowledgmentReminderScheduler (cron 06:00 UTC, ShedLock-guarded): for each active tenant, finds (employee, policy) gaps via ComplianceService.findPendingAcknowledgmentGaps (extracted/reused from the existing dashboard pendingAcknowledgments count) and sends a REMINDER notification to the employee's linked user account. Idempotency/no-spam: policy_acknowledgment_reminders (V322, unique on tenant+policy+employee) tracks last-reminded timestamp; a pair is skipped if reminded within the last 7 days. Employees with no linked user account are skipped safely. Added PolicyAcknowledgmentReminderSchedulerTest covering first-reminder, cooldown-skip, cooldown-elapsed-resend, and no-user-account cases.

> **Story:** US-2FZ93KN09R89
> **Author:** faylo-backend-engineer
> **Reviewer:** faylo-qa-reviewer
> **Verdict:** pass
> **Created:** 2026-09-20
> **Created-by:** faylo new

## Findings

...
