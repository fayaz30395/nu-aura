# US-2FYBYK78PV8B: Build document expiry tracking endpoints + scheduler from DocumentWorkflowService

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

- **AC1:** PUT /documents/{documentId}/expiry, GET /documents/expiring, GET /documents/expired expose existing setDocumentExpiry/getExpiringDocuments/getExpiredDocuments; new scheduler (modeled on ContractLifecycleScheduler) dispatches reminders and calls markReminderSent
  - **Verify:** shell bash -c "cd backend && mvn -q -DskipTests compile"
  - **Verified:** yes (2026-09-20)
