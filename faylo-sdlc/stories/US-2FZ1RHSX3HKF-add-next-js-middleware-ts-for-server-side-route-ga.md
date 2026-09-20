# US-2FZ1RHSX3HKF: Add Next.js middleware.ts for server-side route gating (currently client-only)

> **Epic:** EP-2FWVEHJV5G29
> **Tier:** hard-gate
> **Status:** Done
> **Created:** 2026-09-20
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** middleware.ts checks auth cookie/session on protected routes before render, matching the permission model AuthGuard.tsx already enforces client-side, closing the gap where a Server Component could leak data before client-side redirect fires
  - **Verify:** shell bash -c "cd frontend && npx tsc --noEmit"
  - **Verified:** yes (2026-09-20)
