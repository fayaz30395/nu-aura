# US-2G00ZA0Y39D9: Add client-side leave balance check before submit on leave apply form - user with 0 days can submit 10-day request, only caught server-side (encashment form already has this check, apply form doesn't)

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

- **AC1:** Apply form blocks submission when requested days exceed available balance, matching encashment form
  - **Verify:** shell bash -c "cd frontend && npx tsc --noEmit"
  - **Verified:** yes (2026-09-21)
