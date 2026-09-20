# US-2FYBYHPKK1HW: Add document-approval trigger endpoint via generic WorkflowService (not DocumentWorkflowService)

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

- **AC1:** POST endpoint starts a WorkflowExecutionRequest with entityType=DOCUMENT_REQUEST via existing workflowService.startWorkflow; approve/reject/pending-list reuse WorkflowController's live endpoints - no new approval logic built
  - **Verify:** shell bash -c "cd backend && mvn -q -DskipTests compile"
  - **Verified:** yes (2026-09-20)
