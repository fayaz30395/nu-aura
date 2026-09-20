# US-2FZ3774CR9Z1: Fix DocumentController IDOR: validate documentId exists+tenant-scoped before grant/expiry/approval writes

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

- **AC1:** grantAccess/setExpiry/requestApproval in DocumentController resolve documentId against the real file/document table scoped to TenantContext before writing, 404 if absent - matching the pattern in EmployeeDocumentController and ResourcePoolService
  - **Verify:** shell bash -c "cd backend && mvn -q -DskipTests compile"
  - **Verified:** yes (2026-09-20)
