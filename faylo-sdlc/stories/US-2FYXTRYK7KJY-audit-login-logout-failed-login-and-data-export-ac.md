# US-2FYXTRYK7KJY: Audit login/logout/failed-login and data-export actions for missing audit log entries

> **Epic:** EP-2FWVEHJV5G29
> **Tier:** async-review
> **Status:** Done
> **Created:** 2026-09-20
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** AuthController login/logout/failed-login paths call AuditLogService; AuditAction.EXPORT is actually invoked at real export call sites
  - **Verify:** shell bash -c "cd backend && mvn -q -DskipTests compile"
  - **Verified:** yes (2026-09-20)
