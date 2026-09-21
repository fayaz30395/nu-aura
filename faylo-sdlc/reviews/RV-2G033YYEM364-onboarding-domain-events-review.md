# RV-2G033YYEM364: Onboarding domain events review

> **Story:** US-2FZSYYESQ81V
> **Author:** backend-lead
> **Reviewer:** async-qa-reviewer
> **Verdict:** approve
> **Created:** 2026-09-21
> **Created-by:** faylo new

## Findings

Added OnboardingProcessStatusChangedEvent, published via DomainEventPublisher whenever a process's status actually changes (task-driven recalculateProgress, manual updateStatus, updateProgress, and the two ApprovalCallbackHandler transitions). NotificationEventListener.onOnboardingProcessStatusChanged notifies the employee and, if assigned, the buddy. Compiles clean.
