# RV-2FYF0ED7HHAJ: 5 mid-priority notification gaps closed: GOAL_CREATED/UPDATED via direct WebSocketNotificationService injection in GoalService (no existing event infra there, YAGNI on adding one for a single trigger); REVIEW_STARTED reuses REVIEW_PENDING type, notifies each review's assigned reviewer (self/manager) in ReviewCycleService.activateCycle; DOCUMENT_UPLOADED wired in EmployeeDocumentController (the literal upload action, not the generic FileStorageService used by many other upload categories) notifying the employee; TRAINING_ENROLLED direct in TrainingManagementService.enrollEmployee; TRAINING_COMPLETED via new NotificationEventListener.onTrainingCompleted reusing the existing TrainingCompletedEvent (alongside TrainingSkillUpdateListener, same event, separate concern). mvn compile clean.

> **Story:** US-2FYERYV698AZ
> **Author:** faylo-backend-engineer
> **Reviewer:** faylo-qa-reviewer
> **Verdict:** pass
> **Created:** 2026-09-20
> **Created-by:** faylo new

## Findings

...
