# US-2FZ1XPPV5RPP: Fix PSAService.allocateResources duplicate-row risk (add existsBy check + unique constraint)

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

- **AC1:** allocateResources checks for an existing active allocation for (projectId, employeeId) before creating a new one, and psa_project_allocations gets a unique constraint, mirroring the existing ResourcePoolService.addMembersInternal pattern (existsBy check + uk_resource_pool_members_pool_employee)
  - **Verify:** shell bash -c "cd backend && mvn -q -DskipTests compile"
  - **Verified:** pending
