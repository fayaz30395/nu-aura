# US-2FWVER467QRE: FR-5: responsive table scroll-container fix (shift-swap page)

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

- **AC1:** attendance/shift-swap/page.tsx table is wrapped in `.table-shell` (overflow-x-auto + min-width:720px, per globals.css:1055-1063). FRD's cited "comp-off/team/nu-calendar" per-page overflow-x-auto pattern has drifted since drafting - only team/page.tsx still has an inline wrapper (frontend/app/attendance/team/page.tsx:534), comp-off has none, and the sanctioned `.table-shell` utility class was defined in CSS but adopted by zero pages before this fix. Flagging for a follow-up FR-5 sweep across all `table-aura` tables platform-wide, out of scope for this single-page ticket.
  - **Verify:** shell grep -q 'table-shell' frontend/app/attendance/shift-swap/page.tsx
  - **Verified:** yes (2026-09-19)
