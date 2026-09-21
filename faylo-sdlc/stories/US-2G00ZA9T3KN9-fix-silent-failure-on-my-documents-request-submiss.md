# US-2G00ZA9T3KN9: Fix silent failure on My Documents request submission - createMutation has no onError/try-catch, modal just re-enables submit with no visible error

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

- **AC1:** Failed document request shows a visible error message
  - **Verify:** shell bash -c "cd frontend && npx tsc --noEmit"
  - **Verified:** yes (2026-09-21)
