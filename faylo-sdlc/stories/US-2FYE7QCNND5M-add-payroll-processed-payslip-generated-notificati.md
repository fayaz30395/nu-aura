# US-2FYE7QCNND5M: Add PAYROLL_PROCESSED + PAYSLIP_GENERATED notifications

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

- **AC1:** PayrollRunService fires a notification to affected employees when a payroll run completes; PayslipService/PayslipPdfService fires one when a payslip is generated, reusing the existing NotificationService pattern
  - **Verify:** shell bash -c "cd backend && mvn -q -DskipTests compile"
  - **Verified:** yes (2026-09-20)
