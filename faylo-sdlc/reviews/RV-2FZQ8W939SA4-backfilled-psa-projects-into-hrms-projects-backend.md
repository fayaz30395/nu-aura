# RV-2FZQ8W939SA4: Backfilled PSA projects into HRMS projects (backend side): V324 inserts every psa_projects row not already matched by (project_code, tenant_id) in projects, carrying billing_type/is_billable/default_billing_rate/budget/client_id/project_manager_id; maps PSAProject.status ACTIVE->Project.status IN_PROGRESS (the one non-1:1 value), defaults priority=MEDIUM (no PSA equivalent field). Validated against dev DB via a transactional dry-run (inserted a test psa_projects row, ran the migration inline, confirmed the projects row with correct mapped fields, rolled back — 0 real PSA rows existed in dev to backfill for real). Deprecated PSAInvoiceController.createInvoice with a pointer to the new POST /api/v1/projects/{id}/invoices/generate endpoint, left in place per AC (not removed). Frontend repoint of the PSA invoice UI to the new endpoint is NOT done here — that's frontend scope, flagged to team-lead-frontend-2.

> **Story:** US-2FZ92MRRMTV6
> **Author:** faylo-backend-engineer
> **Reviewer:** faylo-qa-reviewer
> **Verdict:** pass
> **Created:** 2026-09-20
> **Created-by:** faylo new

## Findings

...
