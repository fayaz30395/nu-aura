# US-2FZSWHXP80HH: Add missing validation to GoalRequest DTO (employeeId, title, goalType unvalidated)

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

- **AC1:** GoalRequest rejects null/blank required fields with 400
  - **Verify:** shell mvn -q -DskipTests compile
  - **Verified:** pending
