# RV-2FYEQ6HAY3GE: 3 notification gaps closed: EMPLOYEE_TERMINATED now notifies manager + HR_ADMIN role + ASSET_MANAGER role (IT stand-in, no dedicated IT role exists) via new NotificationEventListener.onEmployeeTerminated; REVIEW_COMPLETED now notifies the reviewed employee via onPerformanceReviewCompleted (added alongside existing PerformanceCompensationListener, same event, separate concern); LEAVE_CANCELLED now notifies the employee's manager via new notifyLeaveCancelled, added to LeaveRequestService.cancelLeaveRequest mirroring the existing notifyLeaveApproved/Rejected structure. mvn compile clean.

> **Story:** US-2FYE7QMTP2D2
> **Author:** faylo-backend-engineer
> **Reviewer:** faylo-qa-reviewer
> **Verdict:** pass
> **Created:** 2026-09-20
> **Created-by:** faylo new

## Findings

...
