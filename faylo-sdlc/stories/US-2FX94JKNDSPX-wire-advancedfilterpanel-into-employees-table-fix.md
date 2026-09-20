# US-2FX94JKNDSPX: Wire AdvancedFilterPanel into employees table (FIX-017 Keka parity)

> **Epic:** EP-2FWVEHJV5G29
> **Tier:** autonomous
> **Status:** Done
> **Created:** 2026-09-20
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** app/employees/page.tsx uses the existing AdvancedFilterPanel component (851 lines, built but zero usages) for multi-field filtering, applying conditions client-side against the fetched employee list
  - **Verify:** shell grep -q "AdvancedFilterPanel" frontend/app/employees/page.tsx
  - **Verified:** yes (2026-09-20)
