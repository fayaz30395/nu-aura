# RV-2FZT8WJQK3W4: Fixed IDOR on MeetingController.getByEmployee: added enforceMeetingViewScope, mirroring FeedbackController.enforceFeedbackViewScope's ownership-check shape. Chose this over repointing the frontend to the secured OneOnOneMeetingController because that controller is a differently-shaped, much richer API (own DTOs, agenda/actions/dashboard) — not a drop-in replacement — and both controllers already have live distinct frontend callers. Allows self, the target's manager (via SecurityContext.getAllReporteeIds), or HR/admin scope; denies all others (throws AccessDeniedException -> 403). Added MeetingControllerTest covering self-allowed and unrelated-employee-denied.

> **Story:** US-2FZSWH5ZHSQD
> **Author:** faylo-backend-engineer
> **Reviewer:** faylo-qa-reviewer
> **Verdict:** pass
> **Created:** 2026-09-21
> **Created-by:** faylo new

## Findings

...
