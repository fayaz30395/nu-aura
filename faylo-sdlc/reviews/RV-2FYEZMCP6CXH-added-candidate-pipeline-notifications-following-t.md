# RV-2FYEZMCP6CXH: Added candidate-pipeline notifications following the exact OfferAcceptedEvent/OfferDeclinedEvent + NotificationEventListener pattern: new OfferReadyToSendEvent (published from RecruitmentManagementService.onApproved — the internal-approval-complete point, not raw offer creation, since offer creation itself is provisional pending approval) and new CandidateStatusChangedEvent (published from moveCandidateStage when candidate.status actually changes). Both notify recruiter+hiring manager via NotificationEventListener.onOfferReadyToSend/onCandidateStatusChanged, reusing notifyRecruitmentStakeholders. Note: candidates are external (Candidate has no linked User/login), so this internal-Notification-table pattern cannot reach them directly — matches exactly what OfferAccepted/Declined already do (notify staff, not the candidate); true candidate-facing email would need new EmailService wiring, out of scope for matching the existing pattern. mvn compile passes.

> **Story:** US-2FYEQWPJCGE3
> **Author:** faylo-backend-engineer
> **Reviewer:** faylo-qa-reviewer
> **Verdict:** pass
> **Created:** 2026-09-20
> **Created-by:** faylo new

## Findings

...
