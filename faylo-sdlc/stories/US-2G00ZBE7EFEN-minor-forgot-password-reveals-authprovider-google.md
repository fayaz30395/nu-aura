# US-2G00ZBE7EFEN: Minor: forgot-password reveals authProvider (GOOGLE vs local) for a submitted email - mild account-enumeration info disclosure

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

- **AC1:** Forgot-password response doesn't reveal which auth method an email uses
  - **Verify:** shell bash -c "cd frontend && npx tsc --noEmit"
  - **Verified:** yes (2026-09-21)
