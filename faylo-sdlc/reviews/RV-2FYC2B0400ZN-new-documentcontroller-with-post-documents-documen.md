# RV-2FYC2B0400ZN: New DocumentController with POST /documents/{documentId}/request-approval, thin wrapper calling workflowService.startWorkflow(entityType=DOCUMENT_REQUEST). No new approve/reject/pending-list logic — those already live on WorkflowController. DocumentApprovalWorkflow/DocumentApprovalTask and DocumentWorkflowService's initiate/approve/reject methods are now dead code, left in place pending a future cleanup ticket. Gated with existing Permission.DOCUMENT_APPROVE. mvn compile clean.

> **Story:** US-2FYBYHPKK1HW
> **Author:** faylo-backend-engineer
> **Reviewer:** faylo-qa-reviewer
> **Verdict:** pass
> **Created:** 2026-09-20
> **Created-by:** faylo new

## Findings

...
