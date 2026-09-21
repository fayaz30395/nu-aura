# US-2G00S1PDXKT1: Investigate: dashboard Company Feed widget gets 403 from GET /api/v1/wall/posts for some roles and silently shows empty state instead of surfacing error

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

- **AC1:** Either fix the underlying permission gap causing the 403, or surface a real error state instead of a misleading empty state
  - **Verify:** shell mvn -q -DskipTests compile
  - **Verified:** yes (2026-09-21)
