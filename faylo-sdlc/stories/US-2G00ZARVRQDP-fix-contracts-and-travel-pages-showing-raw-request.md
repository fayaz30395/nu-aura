# US-2G00ZARVRQDP: Fix Contracts and Travel pages showing raw 'Request failed with status code 403' error banner alongside a contradictory 'No X found' empty state simultaneously - replace with a single friendly permission-denied or error message

> **Epic:** EP-2FWT73TBXRCF
> **Tier:** async-review
> **Status:** Done
> **Created:** 2026-09-21
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** Contracts and Travel show one consistent, friendly message on fetch failure instead of a raw error + contradictory empty state
  - **Verify:** shell bash -c "cd frontend && npx tsc --noEmit"
  - **Verified:** yes (2026-09-21)
