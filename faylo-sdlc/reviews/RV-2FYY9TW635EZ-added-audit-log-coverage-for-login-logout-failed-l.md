# RV-2FYY9TW635EZ: Added audit-log coverage for login/logout/failed-login (AuthService: success on login/googleLogin/loginAfterMfa, failure on account-locked + both password-login catch blocks when email resolves to a real user, logout on token revoke) using existing AuditLogService.logAction + AuditAction.LOGIN/LOGOUT — no schema change. Wired existing AuditAction.EXPORT into the two real export choke points: ExportController.buildResponse (single point for all 6 /export/* endpoints) and CustomReportController.export. mvn compile clean; AuthServiceTest 19/19 green (added AuditLogService mock).

> **Story:** US-2FYXTRYK7KJY
> **Author:** faylo-backend-engineer
> **Reviewer:** faylo-qa-reviewer
> **Verdict:** pass
> **Created:** 2026-09-20
> **Created-by:** faylo new

## Findings

...
