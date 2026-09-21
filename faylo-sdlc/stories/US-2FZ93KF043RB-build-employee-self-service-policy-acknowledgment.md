# US-2FZ93KF043RB: Build employee self-service policy acknowledgment view

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

- **AC1:** Employee sees pending-acknowledgment policies from GET /acknowledgments/pending/{employeeId} and can acknowledge each via POST /policies/{id}/acknowledge
  - **Verify:** shell bash -c "cd frontend && npx tsc --noEmit"
  - **Verified:** yes (2026-09-20)
