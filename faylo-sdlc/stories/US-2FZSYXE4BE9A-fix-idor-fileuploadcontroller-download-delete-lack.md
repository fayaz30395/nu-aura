# US-2FZSYXE4BE9A: Fix IDOR: FileUploadController download/delete lacks per-employee scope check (upload has it, read/delete don't) - any DOCUMENT_VIEW holder can access any employee's payslip/PAN/Aadhaar

> **Epic:** EP-2FWT73TBXRCF
> **Tier:** hard-gate
> **Status:** Draft
> **Created:** 2026-09-21
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** download/delete re-derives entityId from FileMetadata and applies same self/manager/HR scope check as upload
  - **Verify:** shell mvn -q -DskipTests compile
  - **Verified:** pending
