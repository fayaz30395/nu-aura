# Loop 6 Fix Log: Frontend RBAC Permission Gates

> Developer Agent | 2026-03-31
> Scope: 8 frontend routes missing page-level permission gates (BUG-L6-001 through BUG-L6-008)

---

## Summary

Fixed all 8 frontend RBAC gaps identified in `loop6-payroll-qa-report.md`. Each page now follows the validated pattern from `/dashboards/executive/page.tsx`:

1. Import `usePermissions`, `Permissions`, `useAuth`
2. `useEffect` redirect for unauthorized users (to `/me/dashboard`)
3. Early `return null` guard before JSX rendering

Backend RBAC was already solid on all routes; these fixes add defense-in-depth at the frontend layer.

---

## Fixes Applied

### P0 (Compliance-Critical)

| Bug ID | Route | Permission Used | File |
|--------|-------|----------------|------|
| BUG-L6-002 | `/statutory-filings` | `STATUTORY:VIEW` | `frontend/app/statutory-filings/page.tsx` |
| BUG-L6-001 | `/statutory` | `STATUTORY:VIEW` | `frontend/app/statutory/page.tsx` |

### P1 (Operational)

| Bug ID | Route | Permission Used | File |
|--------|-------|----------------|------|
| BUG-L6-003 | `/tax` | `STATUTORY:VIEW` | `frontend/app/tax/page.tsx` |
| BUG-L6-004 | `/tax/declarations` | `TDS:DECLARE` OR `STATUTORY:VIEW` | `frontend/app/tax/declarations/page.tsx` |
| BUG-L6-006 | `/leave/approvals` | `LEAVE:APPROVE` | `frontend/app/leave/approvals/page.tsx` |

### P2 (Team/Admin Data)

| Bug ID | Route | Permission Used | File |
|--------|-------|----------------|------|
| BUG-L6-005 | `/lwf` | `STATUTORY:VIEW` | `frontend/app/lwf/page.tsx` |
| BUG-L6-007 | `/attendance/team` | `ATTENDANCE:VIEW_TEAM` OR `ATTENDANCE:VIEW_ALL` | `frontend/app/attendance/team/page.tsx` |
| BUG-L6-008 | `/overtime` | `OVERTIME:VIEW` OR `OVERTIME:REQUEST` OR `ATTENDANCE:MARK` | `frontend/app/overtime/page.tsx` |

---

## Pattern Used (from executive dashboard)

```tsx
// 1. Imports
import { usePermissions, Permissions } from '@/lib/hooks/usePermissions';
import { useAuth } from '@/lib/hooks/useAuth';

// 2. Inside component
const { isAuthenticated, hasHydrated } = useAuth();
const { hasPermission, isReady: permissionsReady } = usePermissions();

useEffect(() => {
  if (!hasHydrated || !permissionsReady) return;
  if (!isAuthenticated) { router.push('/auth/login'); return; }
  if (!hasPermission(Permissions.REQUIRED_PERMISSION)) {
    router.replace('/me/dashboard');
  }
}, [hasHydrated, permissionsReady, isAuthenticated, router, hasPermission]);

// 3. Early return guard before JSX
if (!hasHydrated || !permissionsReady || !hasPermission(Permissions.REQUIRED_PERMISSION)) {
  return null;
}
```

---

## Permission Mapping Rationale

- `/statutory`, `/statutory-filings`, `/lwf`: Backend uses `STATUTORY_VIEW` / `STATUTORY_MANAGE` -- gated on `STATUTORY:VIEW`
- `/tax`: Backend uses `STATUTORY_VIEW` / `TDS_DECLARE` -- gated on `STATUTORY:VIEW` (covers admin overview)
- `/tax/declarations`: Backend uses `TDS_DECLARE` / `STATUTORY_VIEW` -- gated on either (OR logic)
- `/leave/approvals`: Backend uses `LEAVE_APPROVE` / `LEAVE_REJECT` -- gated on `LEAVE:APPROVE`
- `/attendance/team`: Backend uses `ATTENDANCE_VIEW_TEAM` / `ATTENDANCE_VIEW_ALL` -- gated on either (OR logic)
- `/overtime`: Self-service tabs remain open; page gated on `OVERTIME:VIEW` OR `OVERTIME:REQUEST` OR `ATTENDANCE:MARK` (broad, since self-service is intentional)

---

## Notes

- SuperAdmin / TenantAdmin bypass all permission checks via `usePermissions` hook (mirrors backend behavior)
- No backend changes required -- all endpoints already had `@RequiresPermission` annotations
- Existing `PermissionGate` wrappers on individual buttons/tabs within these pages remain unchanged
