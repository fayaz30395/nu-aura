# US-2FZ93JWJQSQ2: Fix TRAINING_UPDATE/TRAINING_DELETE permission gaps (403 for privileged roles)

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

- **AC1:** HR_ADMIN/TRAINING_CREATE role holders can PUT/DELETE training programs without 403; non-privileged roles still get 403
  - **Verify:** shell bash -c "cd backend && mvn -q -DskipTests compile"
  - **Verified:** yes (2026-09-20)
