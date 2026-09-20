# US-2FYBYJFZTKF8: Build document access ACL endpoints (grant/revoke/list) from DocumentWorkflowService

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

- **AC1:** POST /documents/{documentId}/access, DELETE /documents/access/{accessId}, GET /documents/{documentId}/access expose existing grantAccess/revokeAccess/getDocumentAccessForUser, gated by Permission.DOCUMENT_ACCESS_MANAGE
  - **Verify:** shell bash -c "cd backend && mvn -q -DskipTests compile"
  - **Verified:** yes (2026-09-20)
