# RV-2FXBABNGJW1F: Wired DocuSign into the internal e-signature flow: ESignatureService.sendForSignature() now creates a DocuSign envelope for the primary signer when the tenant has DocuSign connected and an active template mapping exists for the document type (falls back to internal token-based signing otherwise). DocuSignController's webhook now bridges envelope completion/decline back to SignatureApproval via ESignatureService.signDocument/declineDocument when entityType=SignatureApproval. Decision DC-2FXAQEN3BKW5 deferred to human with conservative default applied: DocuSign replaces internal e-sign per-tenant when configured, with automatic fallback. Verified via isolated worktree (unrelated concurrent WIP in EmployeeController blocked the shared tree at the time): mvn compile clean, DocuSignControllerTest (23 tests) + RecruitmentManagementServiceTest (27 tests) all pass. Live tree now also compiles clean.

> **Story:** US-2FXAK3826HTN
> **Author:** faylo-backend-engineer
> **Reviewer:** faylo-qa-reviewer
> **Verdict:** pass
> **Created:** 2026-09-20
> **Created-by:** faylo new

## Findings

...
