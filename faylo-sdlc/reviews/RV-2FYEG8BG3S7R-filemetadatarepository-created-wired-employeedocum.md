# RV-2FYEG8BG3S7R: FileMetadataRepository created + wired: EmployeeDocumentController now persists FileMetadata on upload, GET /employees/{id}/documents lists real records, delete cleaned up via shared FileStorageService.deleteFile choke point (soft-delete, benefits all callers not just employee docs). Frontend list/upload/delete swapped from session-local state to real API calls via react-query. mvn compile clean, frontend tsc/eslint clean.

> **Story:** US-2FYE6BD3P1N9
> **Author:** faylo-backend-engineer
> **Reviewer:** faylo-qa-reviewer
> **Verdict:** pass
> **Created:** 2026-09-20
> **Created-by:** faylo new

## Findings

...
