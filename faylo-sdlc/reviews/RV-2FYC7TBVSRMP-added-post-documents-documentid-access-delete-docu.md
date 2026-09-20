# RV-2FYC7TBVSRMP: Added POST /documents/{documentId}/access, DELETE /documents/access/{accessId}, GET /documents/{documentId}/access to DocumentController, gated Permission.DOCUMENT_ACCESS_MANAGE. Thin DocumentAccessDto + GrantDocumentAccessRequest mirroring ContractDto style. Wired to existing DocumentWorkflowService.grantAccess/revokeAccess plus a new listAccess() thin read method (documentAccessRepository.findByTenantIdAndDocumentId already existed, just unexposed). mvn compile clean.

> **Story:** US-2FYBYJFZTKF8
> **Author:** faylo-backend-engineer
> **Reviewer:** faylo-qa-reviewer
> **Verdict:** pass
> **Created:** 2026-09-20
> **Created-by:** faylo new

## Findings

...
