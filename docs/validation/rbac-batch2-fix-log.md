# RBAC Batch 2 Fix Log — Projects, Resources, Allocations, Time Tracking

**Date:** 2026-03-31
**Scope:** 15 pages across 4 modules gated with `usePermissions` + `useEffect` redirect to
`/me/dashboard`

## Pattern Applied

Each page received:

1. Import `usePermissions, Permissions` from `@/lib/hooks/usePermissions`
2. `const { hasAnyPermission, isReady: permissionsReady } = usePermissions();`
3. `const hasAccess = hasAnyPermission(...)` with appropriate permission constants
4. `useEffect` that calls `router.replace('/me/dashboard')` when `permissionsReady && !hasAccess`
5. Early `return null` guard: `if (!permissionsReady || !hasAccess) return null;`

## Pages Fixed

| #  | Page                                                | Permission(s)                                                | Status                                                        |
|----|-----------------------------------------------------|--------------------------------------------------------------|---------------------------------------------------------------|
| 1  | `frontend/app/projects/page.tsx`                    | PROJECT_VIEW, PROJECT_MANAGE                                 | Gated                                                         |
| 2  | `frontend/app/projects/[id]/page.tsx`               | PROJECT_VIEW, PROJECT_MANAGE                                 | Gated                                                         |
| 3  | `frontend/app/projects/gantt/page.tsx`              | PROJECT_VIEW, PROJECT_MANAGE                                 | Gated                                                         |
| 4  | `frontend/app/projects/resource-conflicts/page.tsx` | PROJECT_VIEW, RESOURCE_VIEW, PROJECT_MANAGE                  | Gated                                                         |
| 5  | `frontend/app/resources/page.tsx`                   | RESOURCE_VIEW, RESOURCE_MANAGE                               | Gated                                                         |
| 6  | `frontend/app/resources/approvals/page.tsx`         | ALLOCATION_APPROVE, RESOURCE_VIEW, RESOURCE_MANAGE           | Gated                                                         |
| 7  | `frontend/app/resources/availability/page.tsx`      | RESOURCE_VIEW, RESOURCE_MANAGE                               | Gated                                                         |
| 8  | `frontend/app/resources/capacity/page.tsx`          | RESOURCE_VIEW, RESOURCE_MANAGE                               | Gated                                                         |
| 9  | `frontend/app/resources/pool/page.tsx`              | RESOURCE_VIEW, RESOURCE_MANAGE                               | Gated                                                         |
| 10 | `frontend/app/resources/workload/page.tsx`          | RESOURCE_VIEW, RESOURCE_MANAGE                               | Gated                                                         |
| 11 | `frontend/app/allocations/page.tsx`                 | ALLOCATION_VIEW, PROJECT_VIEW, ALLOCATION_MANAGE             | Gated (redirect page)                                         |
| 12 | `frontend/app/allocations/summary/page.tsx`         | ALLOCATION_VIEW, PROJECT_VIEW, ALLOCATION_MANAGE             | Gated                                                         |
| 13 | `frontend/app/time-tracking/page.tsx`               | TIMESHEET_VIEW, TIME_TRACKING_VIEW, TIME_TRACKING_MANAGE     | Gated (had element-level PermissionGate, now also page-level) |
| 14 | `frontend/app/time-tracking/[id]/page.tsx`          | TIMESHEET_VIEW, TIME_TRACKING_VIEW, TIME_TRACKING_MANAGE     | Gated                                                         |
| 15 | `frontend/app/time-tracking/new/page.tsx`           | TIMESHEET_CREATE, TIME_TRACKING_CREATE, TIME_TRACKING_MANAGE | Gated                                                         |

## Notes

- SuperAdmin and TenantAdmin roles automatically bypass all permission checks via
  `hasAnyPermission` (the hook returns `true` for admins).
- The `MODULE:MANAGE` permission hierarchy is respected by the hook (e.g., `PROJECT:MANAGE` implies
  `PROJECT:VIEW`).
- `time-tracking/page.tsx` already had element-level `PermissionGate` wrappers for create/update
  buttons; the page-level gate was missing and is now added.
- `allocations/page.tsx` is a redirect-only page; RBAC check runs before the redirect to
  `/allocations/summary`.
