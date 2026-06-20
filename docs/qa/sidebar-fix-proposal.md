# Sidebar Fix Proposal — NU-AURA (2026-06-19)

Source: 17-agent workflow analysis of frontend source code.
Phase 5 of 7 — proposed fixes, not yet implemented.

---

## Executive Summary

9 confirmed sidebar inconsistencies discovered. The CRITICAL issue (SB-001) is a structural
layout duplication: 4 admin pages embed `<AppLayout>` inside `AdminLayoutInner` which already
provides a sidebar shell — creating triple-sidebar DOM (248px + 72px + 232px = 552px of sidebar
components simultaneously). On mobile this also produces two `MobileBottomNav` bars (SB-003)
and a z-index stacking conflict (SB-002). Two MEDIUM issues (SB-005, SB-006) are CSS specificity
bugs where hardcoded Tailwind color classes on icon definitions override the active-state theme
token. The remaining four LOW issues are icon sizing inconsistencies masked on desktop by
NavPanel's `[&_svg]` override.

RBAC permission filtering is correct for all roles. Two permission leaks exist in sidebar
visibility (Budget Planning link, Mobile Team tab) but access is correctly blocked server-side.

---

## Issues Table

| ID | Title | Severity | Files to Change | Lines |
|----|-------|----------|-----------------|-------|
| SB-001 | Double-sidebar on /admin/* | CRITICAL | `app/admin/budget/page.tsx`, `app/admin/audit/page.tsx`, `app/admin/integrations/webhooks/page.tsx`, `app/admin/employees/error/page.tsx` | Remove `<AppLayout>` wrapper from each |
| SB-002 | Mobile overlay z-index mismatch | HIGH | `components/layout/AdminLayoutInner.tsx` (or equivalent) | Change z-50 → z-40 to match AppLayout |
| SB-003 | Dual MobileBottomNav (consequence of SB-001) | HIGH | Resolved by fixing SB-001 | — |
| SB-004 | Child icon at h-5 (should be h-4) | LOW | `lib/config/menuSections.tsx` | Change `icon.cloud` and `icon.zap` for integrations children to `sm.cloud` / `sm.zap` |
| SB-005 | text-warning-500 on Zap overrides active color | MEDIUM | `lib/config/menuSections.tsx` | Remove `text-warning-500` from Zap icon definition |
| SB-006 | text-accent-500 on Activity overrides active color | MEDIUM | `lib/config/menuSections.tsx` | Remove `text-accent-500` from Activity icon definition |
| SB-007 | MoreHorizontal icon h-6 vs h-5 | LOW | `components/layout/MobileBottomNav.tsx` | Change MoreHorizontal icon to `h-5 w-5` |
| SB-008 | Mobile drawer icon container 4px too large | LOW | `components/layout/Sidebar.tsx` (legacy) | Change icon container to `w-5 h-5` to match icons |
| SB-009 | NavPanel SVG override masks source bugs | LOW | `components/layout/NavPanel.tsx` | Add comment explaining the override; fix source sizes (SB-004) to match |
| LEAK-1 | Budget Planning visible without BUDGET_VIEW | MEDIUM | `lib/config/menuSections.tsx` | Add `permission: 'finance.budget.view'` to Budget Planning item |
| LEAK-2 | Mobile Team tab bypasses EMPLOYEE_VIEW_ALL | MEDIUM | `components/layout/MobileBottomNav.tsx` | Point to `/team-directory` or add permission gate |

---

## Fix Details

### SB-001 — Remove AppLayout from 4 admin page components (CRITICAL)

**Root cause:** These 4 files render `<AppLayout>` at the page level, but `app/admin/layout.tsx`
already wraps all `/admin/*` pages in `AdminLayoutInner` which provides its own sidebar.

**Before (each of the 4 files):**
```tsx
export default function AdminBudgetPage() {
  return (
    <AppLayout activeMenuItem="budget">
      <BudgetContent />
    </AppLayout>
  )
}
```

**After:**
```tsx
export default function AdminBudgetPage() {
  return <BudgetContent />
}
```

**Risk:** LOW — these pages already have layout from `app/admin/layout.tsx`. Removing the
redundant `AppLayout` removes the duplicate sidebar; content remains unchanged.

**Regression check:** Navigate to `/admin/budget`, `/admin/audit`, `/admin/integrations/webhooks`,
`/admin/employees/error` — verify single sidebar renders, no layout shift.

---

### SB-005 / SB-006 — Remove hardcoded icon colors from menuSections (MEDIUM)

**Root cause:** `icon.zap` defined with `text-warning-500` and `icon.activity` with
`text-accent-500`. These override NavPanel's active-state `text-[var(--accent-300)]` via
CSS specificity (element-level Tailwind class > parent cascade).

**Before (menuSections.tsx):**
```tsx
zap: <Zap className="text-warning-500 h-5 w-5" />,
activity: <Activity className="text-accent-500 h-5 w-5" />,
```

**After:**
```tsx
zap: <Zap className="h-5 w-5" />,
activity: <Activity className="h-5 w-5" />,
```

**Risk:** LOW — removes amber/blue decorative tinting. Icons will inherit NavPanel's color
cascade, which applies `text-[var(--sidebar-icon)]` normally and `text-[var(--accent-300)]`
when active. Verify 4 affected items (My Skills, Performance, NU-Grow, Competency Matrix)
show correct active highlight after change.

---

### LEAK-1 — Gate Budget Planning on BUDGET_VIEW permission (MEDIUM)

**Root cause:** Budget Planning menu item in `menuSections.tsx` lacks a `permission` property.
The sidebar filter in `buildMenuSections` skips items without a permission (shows to all).

**Before:**
```tsx
{ id: 'budget', label: 'Budget Planning', href: '/admin/budget', icon: icon.pieChart }
```

**After:**
```tsx
{ id: 'budget', label: 'Budget Planning', href: '/admin/budget', icon: icon.pieChart, permission: 'finance.budget.view' }
```

**Risk:** LOW — only hides from roles that lack `finance.budget.view`. PAYROLL_ADMIN and
SUPER_ADMIN/TENANT_ADMIN retain visibility. Verify HR_ADMIN and RECRUITMENT_ADMIN no longer
see Budget Planning in sidebar.

---

### LEAK-2 — Fix Mobile Team tab href (MEDIUM)

**Before (MobileBottomNav.tsx):**
```tsx
{ label: 'Team', href: '/employees', icon: <Users /> }
```

**After:**
```tsx
{ label: 'Team', href: '/team-directory', icon: <Users /> }
```

Or gate it: only show if user has `employee.view_all` permission.

---

## Risk Assessment

| Fix | Regression Risk | Rollback Complexity |
|-----|----------------|---------------------|
| SB-001 (remove AppLayout from 4 admin pages) | MEDIUM — layout change | Low — revert single file per page |
| SB-005/006 (remove hardcoded icon colors) | LOW — visual only | Low — restore className |
| LEAK-1 (add permission to Budget item) | LOW — hides from fewer roles | Low — remove permission property |
| LEAK-2 (fix mobile Team tab) | LOW — single href change | Low — revert href |
| SB-004/007/008 (icon sizing) | LOW — visual only, NavPanel masks desktop | Low — revert className |

---

## Implementation Order

1. **SB-001** (CRITICAL) — Remove `<AppLayout>` from 4 admin pages. Fixes SB-002 and SB-003 automatically.
2. **LEAK-1** (MEDIUM) — Add `finance.budget.view` permission to Budget Planning menu item.
3. **LEAK-2** (MEDIUM) — Fix Mobile Team tab href to `/team-directory`.
4. **SB-005 + SB-006** (MEDIUM) — Remove hardcoded icon colors.
5. **SB-004 + SB-007 + SB-008** (LOW) — Icon sizing cleanup.
6. **SB-009** (LOW) — Add explanatory comment to NavPanel SVG override.

---

## Exit Criteria

Each fix is verified when:
- [ ] SB-001: Navigate to /admin/budget, /admin/audit, /admin/integrations/webhooks, /admin/employees/error — single sidebar DOM tree, no double bottom nav on mobile
- [ ] SB-002/003: Mobile viewport — single overlay, correct z-index stacking, single bottom nav bar
- [ ] LEAK-1: Login as HR_ADMIN or RECRUITMENT_ADMIN — Budget Planning absent from sidebar
- [ ] LEAK-2: Login as EMPLOYEE — Mobile Team tab navigates to /team-directory without 403
- [ ] SB-005/006: Navigate to /me/skills, /performance, /competency-matrix — active state shows accent color (not amber/blue) on icon
- [ ] SB-004/007/008: Mobile drawer — all child icons render at consistent h-4 w-4, bottom nav More icon at h-5 w-5
