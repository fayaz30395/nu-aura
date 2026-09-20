# US-2FZ1XPWWEC3S: Fix JobBoardIntegrationService: SHINE/MONSTER silently marked ACTIVE/PAUSED without doing anything

> **Epic:** EP-2FWVEHJV5G29
> **Tier:** async-review
> **Status:** Done
> **Created:** 2026-09-20
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** postJob/pausePosting for unimplemented boards (SHINE, MONSTER) return/throw an unsupported-board error instead of falling through to the same success path used by implemented boards (NAUKRI/INDEED/LINKEDIN)
  - **Verify:** shell bash -c "cd backend && mvn -q -DskipTests compile"
  - **Verified:** yes (2026-09-20)
