# RV-2FZQ2SDFC92T: Built the timesheet-to-invoice pipeline: new ProjectInvoiceGenerationService.generateInvoice(projectId, periodStart, periodEnd) queries project_time_entries for APPROVED+billable+unbilled (invoiceId IS NULL) rows in the period, sums hours/amount (per-entry billingRate falling back to Project.defaultBillingRate), creates one DRAFT PSAInvoice keyed to the shared HRMS Project/clientId, then flips the matched entries to BILLED with invoiceId set. Idempotent by construction: a second run finds nothing left to bill (invoiceId no longer NULL) and throws IllegalStateException rather than creating an empty invoice. Added invoice_id column to project_time_entries (V323) and a new POST /api/v1/projects/{id}/invoices/generate endpoint (PAYROLL_PROCESS-gated) for item 2 to repoint the PSA frontend at. Added ProjectInvoiceGenerationServiceTest covering the happy path (multi-entry sum + default-rate fallback), project-not-found, and the idempotent re-run case.

> **Story:** US-2FZ92MJAG93G
> **Author:** faylo-backend-engineer
> **Reviewer:** faylo-qa-reviewer
> **Verdict:** pass
> **Created:** 2026-09-20
> **Created-by:** faylo new

## Findings

...
