# US-2G00S1G3CW28: Fix Fluence search Visibility filter: fully disconnected from query, changes UI but never affects results (useFluenceSearch never receives selectedVisibility)

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

- **AC1:** Selecting a visibility filter actually filters search results
  - **Verify:** shell bash -c "cd frontend && npx tsc --noEmit"
  - **Verified:** yes (2026-09-21)
