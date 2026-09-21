# RV-2FZJ2KWXCR4T: Added compensating cleanup for orphaned storage files: found two synchronous upload-then-DB-insert sites with zero error handling on the insert — EmployeeDocumentController.uploadEmployeeDocument (FileMetadata) and FluenceAttachmentService.uploadAttachment (KnowledgeAttachment). Both now wrap the repository save() in try/catch; on insert failure they best-effort delete the just-uploaded storage object via FileStorageService.deleteFile() (itself wrapped so a cleanup failure doesn't mask the original error) and rethrow the original exception. Added FluenceAttachmentServiceTest confirming the orphaned object is deleted when the DB insert throws. No dedicated receipt+DB-insert site exists (OcrReceiptService.scanReceipt uploads but never persists a DB row itself — the claim/item save happens later, decoupled), so this covers the two real synchronous upload+insert code paths in the codebase.

> **Story:** US-2FZFCYHX5ZNF
> **Author:** faylo-backend-engineer
> **Reviewer:** faylo-qa-reviewer
> **Verdict:** pass
> **Created:** 2026-09-20
> **Created-by:** faylo new

## Findings

...
