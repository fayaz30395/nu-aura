# RV-2FZJVSGFTTYE: Built real training-certificate PDF generation (decision: build, not remove — OpenPDF already used by LetterPdfService, mirrored that pattern). New TrainingCertificatePdfService renders a real certificate (employee full name, program name, completion date, assessment score) via OpenPDF and uploads to storage under a new CATEGORY_CERTIFICATES (added to FileStorageService's category allow-list). TrainingManagementService.generateCertificate now calls it and sets certificateIssued=true, replacing the previous fake string-concatenation certificateUrl that pointed at a file that was never created. Download route reused as-is (generic /api/v1/files/download/direct). Added TrainingCertificatePdfServiceTest (verifies a real non-empty PDF stream is uploaded) and TrainingManagementServiceTest cases for the completed/non-completed paths.

> **Story:** US-2FZ93KTZBPA5
> **Author:** faylo-backend-engineer
> **Reviewer:** faylo-qa-reviewer
> **Verdict:** pass
> **Created:** 2026-09-20
> **Created-by:** faylo new

## Findings

...
