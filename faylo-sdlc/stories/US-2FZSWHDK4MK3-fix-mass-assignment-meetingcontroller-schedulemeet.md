# US-2FZSWHDK4MK3: Fix mass-assignment: MeetingController.scheduleMeeting binds RequestBody directly to JPA entity OneOnOneMeeting

> **Epic:** EP-2FWT73TBXRCF
> **Tier:** hard-gate
> **Status:** Done
> **Created:** 2026-09-21
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** Endpoint uses a request DTO, not the raw entity
  - **Verify:** shell mvn -q -DskipTests compile
  - **Verified:** yes (2026-09-21)
