# US-2FZSYXMVVJ9W: Fix comp-off proportional accrual: CompOffService always computes 0 days for overtime between minOvertimeMinutes and halfDayMinutes

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

- **AC1:** Proportional branch awards 0.5 days once overtime crosses configured minimum
  - **Verify:** shell mvn -q -DskipTests compile
  - **Verified:** pending
