# US-2FZ9342C8D6Q: Enforce benefit plan eligibility rules (grade/dept/tenure/waiting period) at enrollment

> **Epic:** EP-2FWVEHJV5G29
> **Tier:** async-review
> **Status:** Draft
> **Created:** 2026-09-20
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** POST /benefits-enhanced/enrollments rejects enrollment when employee grade/dept/tenure/waiting-period doesn't meet plan eligibility rules
  - **Verify:** shell bash -c "cd backend && mvn -q -DskipTests compile"
  - **Verified:** pending
