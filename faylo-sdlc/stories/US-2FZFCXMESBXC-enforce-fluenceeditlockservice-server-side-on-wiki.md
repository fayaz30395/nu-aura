# US-2FZFCXMESBXC: Enforce FluenceEditLockService server-side on wiki/blog update (currently advisory-only)

> **Epic:** EP-2FWVEHJV5G29
> **Tier:** hard-gate
> **Status:** Verified
> **Created:** 2026-09-20
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** WikiPageService.updatePage/BlogPostService.updatePost reject 409/423 when a valid edit lock is held by a different user - backend becomes source of truth, not just UI courtesy check
  - **Verify:** shell bash -c "cd backend && mvn -q -DskipTests compile"
  - **Verified:** yes (2026-09-20)
