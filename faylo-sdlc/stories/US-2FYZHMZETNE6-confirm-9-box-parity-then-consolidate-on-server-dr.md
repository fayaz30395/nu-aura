# US-2FYZHMZETNE6: Confirm 9-box parity then consolidate on server-driven implementation, delete client-computed duplicate

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

- **AC1:** Server-driven /performance/cycles/[id]/nine-box confirmed to cover everything the client-computed /performance/9box shows (same data, same or better fidelity); once confirmed, /performance/9box deleted and any nav/links redirected to the server-driven route
  - **Verify:** shell bash -c "cd frontend && npx tsc --noEmit"
  - **Verified:** yes (2026-09-20)
