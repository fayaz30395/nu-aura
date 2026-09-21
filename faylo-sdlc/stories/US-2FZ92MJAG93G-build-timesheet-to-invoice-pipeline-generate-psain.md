# US-2FZ92MJAG93G: Build timesheet-to-invoice pipeline: generate PSAInvoice from approved HRMS TimeEntry, flip to BILLED

> **Epic:** EP-2FWVEHJV5G29
> **Tier:** async-review
> **Status:** Done
> **Created:** 2026-09-20
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** ProjectInvoiceGenerationService.generateInvoice(projectId, periodStart, periodEnd) creates one PSAInvoice from APPROVED+billable+unbilled TimeEntry rows, sets them BILLED with invoiceId, idempotent on re-run
  - **Verify:** shell bash -c "cd backend && mvn -q -DskipTests compile"
  - **Verified:** yes (2026-09-20)
