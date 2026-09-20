# RV-2FYYBAW8563J: Added 4 employee-lifecycle notification handlers to existing NotificationEventListener (onEmployeeCreated->manager in-app, onEmployeePromoted->employee in-app+email + manager in-app, onEmployeeStatusChanged->HR_ADMIN/HR_MANAGER role in-app, onEmployeeDepartmentChanged->employee+old/new manager in-app). Confirmed EMPLOYEE_TRANSFERRED has no distinct domain event class -- DepartmentChangedEvent already carries old/new manager IDs, so wired only that one to avoid double-notify. EMPLOYEE_UPDATED and attendance check-in/out intentionally left unwired per spec. mvn compile clean.

> **Story:** US-2FYY5845HBS3
> **Author:** faylo-backend-engineer
> **Reviewer:** faylo-qa-reviewer
> **Verdict:** pass
> **Created:** 2026-09-20
> **Created-by:** faylo new

## Findings

...
