# RV-2FZT9YJX37QP: Fixed mass-assignment on MeetingController.scheduleMeeting: replaced raw @RequestBody OneOnOneMeeting entity binding with the OneOnOneMeetingRequest DTO already used by the secured OneOnOneMeetingController for the identical entity. managerId now comes from SecurityContext.getCurrentEmployeeId() instead of the request body; id/tenantId/status/audit fields/notes/cancellation fields are no longer client-settable at creation (MeetingService.scheduleMeeting builds a fresh entity from the whitelisted DTO fields only). Backward compatible with the current frontend payload (Jackson ignores unknown JSON properties).

> **Story:** US-2FZSWHDK4MK3
> **Author:** faylo-backend-engineer
> **Reviewer:** faylo-qa-reviewer
> **Verdict:** pass
> **Created:** 2026-09-21
> **Created-by:** faylo new

## Findings

...
