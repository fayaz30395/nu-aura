# US-2G04TR3X33SD: Add backend endpoint for single learning path detail + its enrolled courses (currently only a list endpoint exists, frontend's new /learning/paths/[id] page has to reuse the list query and can't enumerate a path's courses)

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

- **AC1:** GET endpoint returns a single learning path with its ordered course list
  - **Verify:** shell mvn -q -DskipTests compile
  - **Verified:** yes (2026-09-21)
