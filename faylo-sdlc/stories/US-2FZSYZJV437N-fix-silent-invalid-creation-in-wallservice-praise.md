# US-2FZSYZJV437N: Fix silent invalid creation in WallService: PRAISE post with null recipient and POLL with null options both silently succeed instead of rejecting

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

- **AC1:** PRAISE requires recipientId, POLL requires non-empty pollOptions, both enforced with 400 on violation
  - **Verify:** shell mvn -q -DskipTests compile
  - **Verified:** yes (2026-09-21)
