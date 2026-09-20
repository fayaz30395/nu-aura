# US-2FX6BNSG0WXF: Column visibility toggle on candidates table (FIX-012 Keka parity)

> **Epic:** EP-2FWVEHJV5G29
> **Tier:** autonomous
> **Status:** Done
> **Created:** 2026-09-19
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** app/recruitment/candidates/page.tsx table uses the existing ColumnVisibilityToggle component, matching employees/page.tsx and admin/leave-requests/page.tsx rollout pattern
  - **Verify:** shell grep -q "ColumnVisibilityToggle" frontend/app/recruitment/candidates/page.tsx
  - **Verified:** yes (2026-09-19)
