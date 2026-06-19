# Sidebar Fix Proposal — NU-AURA
**Date:** 2026-06-19 | **Phase:** 4 of 7

---

## Root Causes (Priority Ordered)

### [P1 — HIGH] Missing `activeMenuItem` prop on 78 pages

**Root cause:** `AppLayout.tsx:96` defaults `activeMenuItem = 'dashboard'`. Pages that do not explicitly pass the prop always highlight "Dashboard" in the sidebar, regardless of the actual current route.

**File:** `frontend/components/layout/AppLayout.tsx`  
**Line:** 96 (`activeMenuItem = 'dashboard'`)  
**Lines passing to NavPanel:** 350, 378

**Affected pages (78 total):**
- `/contracts`, `/contracts/[id]`, `/contracts/new`, `/contracts/templates`
- `/expenses/*` (5 sub-pages)
- `/attendance/comp-off`, `/attendance/my-attendance`, `/attendance/shift-swap`
- `/admin/audit`, `/admin/budget`
- `/biometric-devices`, `/compliance`, `/allocations`, `/allocations/summary`
- `/fluence/analytics`
- And 60+ more

**Evidence:**
- Browser validated: on `/contracts`, `aria-current="page"` is on `/dashboard` (wrong)
- On `/overtime` (which passes `activeMenuItem="overtime"`), the correct item is highlighted ✓
- NavPanel `isItemActive()` function at line 50-53 uses `activeId` — if `activeId` is `'dashboard'`, it always highlights Dashboard

---

### [P2 — MEDIUM] RECRUITMENT_ADMIN sees 54 sidebar items (same as SUPER_ADMIN)

**Root cause:** RECRUITMENT_ADMIN user (Suresh) also has `REPORTING_MANAGER` role, which resolves a very broad set of permissions via `RoleHierarchy.getReportingManagerPermissions()`. These permissions satisfy the `requiredPermission` gates in `menuSections.tsx`, making many sections visible. The sidebar is doing the RIGHT thing (filtering by resolved permissions) — but the permissions are too broad.

**This is PERM-ISSUE-001 (already documented).** It is NOT a sidebar bug per se — it's a permission seeding breadth issue. Fix is in the V305 migration and permission seeding, which was already committed in `a6a3922c`.

**Impact:** Misleading UX — RECRUITMENT_ADMIN sees Payroll, System Admin, Budget Planning links that redirect to denied when clicked.

**Note:** `canSeeAdminSection` (AppLayout lines 107-113) is CORRECT — it only includes SUPER_ADMIN, TENANT_ADMIN, HR_MANAGER. REPORTING_MANAGER is NOT included. The admin section visibility is driven by permissions resolved from the role hierarchy, not `canSeeAdminSection`.

---

### [P3 — LOW] Mobile nav hardcoded separately from `menuSections.tsx`

**Root cause:** `MobileBottomNav` uses a separate hardcoded 5-item config (Home/Team/Leave/Approvals/Me) that is not derived from `menuSections.tsx`. Any new menu section added to desktop won't automatically appear on mobile.

**File:** Likely `frontend/components/layout/shell/` — the mobile nav component  
**Impact:** Mobile nav cannot be role-filtered even if desired; must be maintained separately.

---

### [P4 — LOW] Hydration layout shift on collapse state

**Root cause:** `sidebarCollapsed` is persisted to localStorage via Zustand persist middleware. Initial server render always shows `expanded` (false), then on mount, Zustand rehydrates from localStorage. If user had collapsed it, there's a visible width flash (expanded → collapsed) on every page load.

**File:** `useUiStore` (Zustand store with persist), `AppLayout.tsx:135`

---

## Affected Roles

All authenticated users are affected by P1 (wrong active highlight). P2 affects RECRUITMENT_ADMIN + REPORTING_MANAGER users. P3-P4 affect all users.

---

## Risk Assessment

| Risk | Level | Mitigation |
|---|---|---|
| P1 fix: wrong menu ID in PATH_TO_MENU_ID map | LOW | Validated against live browser — all 54 hrefs confirmed from menuSections.tsx |
| P1 fix: explicit `activeMenuItem` overrides broken | NONE | Explicit prop still overrides auto-derived value (prop ?? auto) |
| P1 fix: performance | NEGLIGIBLE | useMemo with pathname dep — O(n) over ~80 items, called once per navigation |
| P2: V305 migration not yet run on Railway | LOW | V305 was committed in `a6a3922c` — needs Railway `SPRING_FLYWAY_ENABLED=true` flip (SEC-001 dependency) |
| P3 fix: mobile nav change | MEDIUM | If mobile nav is touched, must validate mobile view on all roles |
| P4 fix: hydration | LOW | Can use `suppressHydrationWarning` or initialize Zustand from cookie |

---

## Recommended Fix

### Fix 1 (P1) — Auto-derive `activeMenuItem` from `usePathname()` [IMPLEMENT]

**Location:** `frontend/components/layout/AppLayout.tsx`

**Change:**
1. Remove `= 'dashboard'` default from `activeMenuItem` destructuring (line 96)
2. Add `autoActiveMenuId` useMemo that does longest-prefix URL match against a `PATH_TO_MENU_ID` mapping table
3. Replace `activeMenuItem` in NavPanel calls with `activeMenuItem ?? autoActiveMenuId`

**Benefits:**
- Fixes all 78 affected pages in one change
- No per-page changes needed
- Explicit `activeMenuItem` prop continues to work as an override
- Zero regression risk on pages that already pass the prop

**Full mapping table:** Derived from `menuSections.tsx` hrefs (all 54 nav items mapped to their IDs).

---

### Fix 2 (P2) — Reduce REPORTING_MANAGER permission scope [DEFERRED]

Already partially addressed by V305 migration. Full remediation requires auditing `RoleHierarchy.getReportingManagerPermissions()` to remove permissions that unlock non-reporting menu sections (payroll, admin, budget). Deferred to next sprint — V305 must be applied first to measure residual impact.

---

### Fix 3 (P3) — Sync mobile nav with menuSections [DEFERRED]

Low complexity change but requires mobile testing across all roles. Defer to dedicated mobile UX sprint.

---

### Fix 4 (P4) — Suppress hydration flash [DEFERRED]

Can be addressed with `suppressHydrationWarning` on the nav container, or by storing collapsed state in a cookie instead of localStorage (allows SSR read). Defer — not a functional bug.

---

## Regression Risk

**Low.** The only code change is in `AppLayout.tsx`:
- Pages with explicit `activeMenuItem` prop: NO CHANGE (prop still wins)
- Pages without prop: NOW CORRECT (auto-derived from pathname)
- NavPanel rendering: unchanged
- Permission filtering: unchanged
- Route access control: unchanged

**Tests to run after fix:**
- Navigate to `/contracts` → Contracts should be highlighted ✓
- Navigate to `/leave` → Leave Management should be highlighted ✓  
- Navigate to `/overtime` → Overtime should be highlighted ✓
- Navigate to `/admin/budget` → Budget Planning should be highlighted ✓
- Navigate to `/me/dashboard` → My Dashboard should be highlighted ✓
- Collapse sidebar → no visual flash on next page load (P4 — may still flash, acceptable)
