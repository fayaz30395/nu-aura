# RV-2FZMF7K7M8JF: Built employee-facing Total Benefits Statement PDF export. New BenefitStatementPdfService.generateStatement(employeeId) assembles active enrollments, employee/employer contribution totals, flex credit balance, and YTD claims (current tenant year) into an OpenPDF document — generated on demand and streamed directly (not persisted to storage, since it's a live point-in-time snapshot). New GET /benefits-enhanced/statement/employee/{employeeId} endpoint, BENEFIT_VIEW/BENEFIT_VIEW_SELF-gated via the existing enforceBenefitViewScope. Caught and fixed a document.close()-after-toByteArray() ordering bug (PDF output was empty/invalid without it) in both this new service and TrainingCertificatePdfService (introduced earlier this session, only surfaced now because this test actually validates PDF byte content). Added BenefitStatementPdfServiceTest + 2 controller tests.

> **Story:** US-2FZ93JNY89DN
> **Author:** faylo-backend-engineer
> **Reviewer:** faylo-qa-reviewer
> **Verdict:** pass
> **Created:** 2026-09-20
> **Created-by:** faylo new

## Findings

...
