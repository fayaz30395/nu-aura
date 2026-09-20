# US-2FYEC05CBB21: Delete now-dead DocumentApprovalWorkflow/DocumentApprovalTask (superseded by generic WorkflowService trigger)

> **Epic:** EP-2FWVEHJV5G29
> **Tier:** autonomous
> **Status:** Done
> **Created:** 2026-09-20
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** DocumentApprovalWorkflow/DocumentApprovalTask entities+repos+the dead approve/reject/list methods in DocumentWorkflowService removed, now that US-2FYBYHPKK1HW routes approval through the generic WorkflowService instead
  - **Verify:** shell bash -c "cd backend && mvn -q -DskipTests compile"
  - **Verified:** yes (2026-09-20)
