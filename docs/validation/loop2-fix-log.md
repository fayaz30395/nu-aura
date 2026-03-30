# Loop 2: Dashboard & Navigation — Fix Log

> **Developer Agent** | 2026-03-31
> **Scope:** 7 defects from `loop2-dashboard-qa-report.md`

---

## Fixes Applied

### DEF-35 (HIGH): Executive Dashboard missing PermissionGate — FIXED

**File:** `frontend/app/dashboards/executive/page.tsx`

**Changes:**
1. Imported `usePermissions` and `Permissions` from `@/lib/hooks/usePermissions`
2. Added `hasPermission(Permissions.DASHBOARD_EXECUTIVE)` check in `useEffect` — redirects to `/me/dashboard` if unauthorized
3. Gated the `useExecutiveDashboard` query with the permission check (`enabled` flag) so no API call fires for unauthorized users
4. Added early return (`return null`) before any loading/error/content rendering until `permissionsReady && hasPermission(DASHBOARD_EXECUTIVE)` is confirmed

**Result:** Unauthorized users are redirected before any dashboard shell, title, or skeleton renders.

---

### DEF-36 (MEDIUM): Executive Dashboard flashes protected UI — FIXED

**File:** `frontend/app/dashboards/executive/page.tsx`

**Changes:** Same as DEF-35. The render guard (`if (!hasHydrated || !permissionsReady || !hasPermission(...)) return null`) prevents any DOM from appearing before permission is verified.

**Result:** No flash of "Executive Dashboard" title, skeleton, or layout chrome for unauthorized users.

---

### DEF-37 (HIGH): Manager Dashboard missing PermissionGate — FIXED

**File:** `frontend/app/dashboards/manager/page.tsx`

**Changes:**
1. Imported `usePermissions` and `Permissions`
2. Added `hasPermission(Permissions.EMPLOYEE_VIEW_TEAM)` check — matches backend `@RequiresPermission(Permission.EMPLOYEE_VIEW_TEAM)`
3. Gated both `useManagerDashboard` and `useManagerTeamProjects` queries with the permission check
4. Added early return before any loading/error/content rendering until permission confirmed
5. Redirect non-managers to `/me/dashboard`

**Result:** Non-managers see no manager dashboard UI and are redirected immediately.

---

### DEF-38 (LOW): `/home` route dual behavior — DEFERRED

**Decision:** This requires a product decision (use the social dashboard or remove the dead code). Not a security issue — middleware redirect takes precedence. Flagged for product review.

---

### DEF-39 (LOW): `/app/fluence` uses `router.push` instead of `router.replace` — FIXED

**File:** `frontend/app/app/fluence/page.tsx`

**Changes:** Changed `router.push('/fluence/wiki')` to `router.replace('/fluence/wiki')` for consistency with all other `/app/*` entry points.

**Result:** Back button no longer creates a redirect loop when navigating from `/app/fluence`.

---

### DEF-40 (MEDIUM): `/app/*` entry points have NO RBAC gating — FIXED

**Files:**
- `frontend/app/app/hrms/page.tsx`
- `frontend/app/app/hire/page.tsx`
- `frontend/app/app/grow/page.tsx`
- `frontend/app/app/fluence/page.tsx`

**Changes (all 4 files):**
1. Imported `useActiveApp` hook and `useAuth`
2. Added `hasAppAccess(code)` check before `router.replace()` in `useEffect`
3. Added access-denied UI with explanation and redirect button when user lacks app-level permission
4. Redirect only fires after `hasHydrated` to avoid SSR/hydration issues

**Result:** Direct URL navigation to `/app/hire` (etc.) by an unauthorized user shows "Access Denied" instead of blindly redirecting to the target route.

---

### DEF-41 (MEDIUM): AppSwitcher shows all apps unlocked during permission loading — FIXED

**File:** `frontend/lib/hooks/useActiveApp.ts`

**Changes:** Split the fallback logic at line 64:
- `if (!user) return true` — Pre-auth state: allow (auth guard handles gating)
- `if (permissions.length === 0) return false` — Authenticated but permissions still loading: locked

**Before:** `if (!user || permissions.length === 0) return true` (all apps unlocked during loading)
**After:** Apps appear locked until permissions finish loading.

**Result:** During the brief permission-loading window, apps show lock icons instead of appearing unlocked.

---

## Summary

| Bug ID | Severity | Status | File(s) Changed |
|--------|----------|--------|-----------------|
| DEF-35 | HIGH | FIXED | `frontend/app/dashboards/executive/page.tsx` |
| DEF-36 | MEDIUM | FIXED | (same as DEF-35) |
| DEF-37 | HIGH | FIXED | `frontend/app/dashboards/manager/page.tsx` |
| DEF-38 | LOW | DEFERRED | Product decision needed |
| DEF-39 | LOW | FIXED | `frontend/app/app/fluence/page.tsx` |
| DEF-40 | MEDIUM | FIXED | 4 files in `frontend/app/app/*/page.tsx` |
| DEF-41 | MEDIUM | FIXED | `frontend/lib/hooks/useActiveApp.ts` |

**Total:** 6/7 defects fixed, 1 deferred (product decision).
