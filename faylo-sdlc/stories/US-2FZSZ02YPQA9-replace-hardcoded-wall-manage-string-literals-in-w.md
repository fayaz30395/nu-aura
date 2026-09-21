# US-2FZSZ02YPQA9: Replace hardcoded WALL:MANAGE string literals in WallService with Permission enum constant, extract duplicated ownership-or-admin check into shared helper

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

- **AC1:** WallService uses Permission enum like every other Fluence service; ownership check deduplicated
  - **Verify:** shell mvn -q -DskipTests compile
  - **Verified:** yes (2026-09-21)
