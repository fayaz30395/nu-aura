# US-2G00WEGARKRE: Replace raw free-text employeeId inputs with EmployeeSearchAutocomplete on one-on-one meeting Participant/Assignee fields and feedback Recipient field - inconsistent with PIP/360-feedback, and contributes to the already-filed meeting IDOR since any string is accepted client-side

> **Epic:** EP-2FWT73TBXRCF
> **Tier:** async-review
> **Status:** Draft
> **Created:** 2026-09-21
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** All employee-selection fields use the same autocomplete component, no raw ID text entry
  - **Verify:** shell bash -c "cd frontend && npx tsc --noEmit"
  - **Verified:** pending
