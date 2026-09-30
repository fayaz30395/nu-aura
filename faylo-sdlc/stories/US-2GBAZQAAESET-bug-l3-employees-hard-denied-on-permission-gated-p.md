# US-2GBAZQAAESET: BUG-L3: employees hard-denied on permission-gated pages (deny decided on an empty role set)

> **Epic:** EP-2G4FWY5JGW6W
> **Tier:** async-review
> **Status:** Draft
> **Created:** 2026-09-25
> **Created-by:** faylo new

## User Story

**As a** ...
**I want** ...
**So that** ...

## Acceptance Criteria

- **AC1:** A page that redirects on a failed permission check waits for the user object (isPermissionReady), and isReady keeps the semantics AuthGuard depends on
  - **Verify:** shell bash -c "cd frontend && npx vitest run lib/hooks/usePermissions.test.ts lib/hooks/__tests__/usePermissions.test.ts"
  - **Verified:** yes (2026-09-25)
- **AC2:** LMS:ENROLL and LMS:CERTIFICATE_VIEW are restored to the employee-level roles V66 intended
  - **Verify:** shell bash -c "cd backend && grep -q \"LMS:CERTIFICATE_VIEW\" src/main/resources/db/migration/V334__restore_employee_lms_enroll_and_certificate_grants.sql"
  - **Verified:** yes (2026-09-25)
