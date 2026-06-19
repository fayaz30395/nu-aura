# Sidebar Fix Proposal
Date: 2026-06-19

## Root Cause

The sidebar's **active-highlight** layer has three independent, partially-redundant mapping mechanisms that have drifted out of sync:

1. **Per-page hardcoded `activeMenuItem`** props (253 occurrences across the app), some of which pass IDs that no longer exist in `menuSections.tsx`.
2. The **`PATH_TO_MENU_ID`** auto-derivation table (`AppLayout.tsx:328`).
3. The **`LEGACY_ID_REMAP`** table (`AppLayout.tsx:92`) that rescues stale per-page IDs.

When a page passes an `activeMenuItem` that is (a) not a real menu ID and (b) not a `LEGACY_ID_REMAP` key, the resolved value never matches any `NavRow`, so the sidebar silently highlights the fallback (`my-dashboard`) or nothing. Visibility/RBAC is **not** affected — this is purely the highlight state.

The two concrete offenders are `company-spotlight` and `linkedin-posts`. Several dead `PATH_TO_MENU_ID` entries (`biometric-devices`, `compliance`, `allocations`) point at non-existent IDs but are harmless.

## Affected Roles

All roles equally (highlight bug is role-independent). No role sees a section it shouldn't; the one product question is whether **HR_ADMIN** should be inside `canSeeAdminSection`.

## Affected Pages

- `/company-spotlight` — `app/company-spotlight/page.tsx` (passes `activeMenuItem="company-spotlight"`, 3 call sites)
- `/linkedin-posts` — `app/linkedin-posts/page.tsx` (passes `activeMenuItem="linkedin-posts"`)
- Pages passing the section ID `finance` as an item (1 call site) — never matches a row
- `/feedback360` — highlights `performance-grow` instead of `feedback360-grow` (cosmetic)
- Secondary routes with no mapping (`/goals`, `/executive`, `/documents`) — fall back to `my-dashboard`

## Risk Assessment

- **Risk of fix:** LOW — changes are additive route→id mappings and removal of invalid hardcoded props; no permission logic touched.
- **Regression risk:** LOW. The only behavioral change is *which* item highlights. Removing an invalid `activeMenuItem` lets the deterministic `PATH_TO_MENU_ID` path take over. No navigation, RBAC, or data flow changes.

## Fixes (ordered by priority)

### FIX-SIDEBAR-1 — Remove invalid hardcoded `activeMenuItem` values
- Files: `app/company-spotlight/page.tsx`, `app/linkedin-posts/page.tsx`
- Change: Delete the `activeMenuItem="company-spotlight"` / `activeMenuItem="linkedin-posts"` props (these IDs don't exist). With no prop, `autoActiveMenuId` resolves via `PATH_TO_MENU_ID`. Since neither route is in that table, they correctly fall back to `my-dashboard` (no false highlight on an unrelated item).
- Risk: LOW (removes dead props).
- Test: Navigate to `/company-spotlight` and `/linkedin-posts`; verify no incorrect sidebar item shows as active. (These are marketing/utility pages outside the core nav.)

### FIX-SIDEBAR-2 — Correct the `/feedback360` mapping
- File: `components/layout/AppLayout.tsx`
- Change: In `PATH_TO_MENU_ID`, change `'/feedback360': 'performance-grow'` to `'/feedback360': 'feedback360-grow'` so the 360-feedback page highlights the matching GROW item.
- Risk: LOW (one-line id correction).
- Test: Navigate to `/feedback360`; verify "360 Feedback" highlights, not "Performance Hub".

### FIX-SIDEBAR-3 — Remove dead `PATH_TO_MENU_ID` entries (cleanup)
- File: `components/layout/AppLayout.tsx`
- Change: Remove `'/biometric-devices': 'biometric-devices'`, `'/compliance': 'compliance'`, `'/allocations': 'allocations'` — none have a corresponding menu item, so they map to nothing. Either delete them or add real menu items if these pages should appear in nav.
- Risk: LOW (dead-code removal).
- Test: TypeScript clean; navigating those routes shows fallback highlight (unchanged behavior).

### FIX-SIDEBAR-4 — (Optional) Filter mobile bottom nav by permission
- File: `components/layout/AppLayout.tsx` (`mobileNavItems` useMemo)
- Change: Filter each app's hardcoded `NavItem[]` through `hasPermission` (or restrict to self-service routes) so EMPLOYEE doesn't see Team/Approvals tabs they can't use.
- Risk: MEDIUM (mobile UX change; verify each role still gets a usable 4-item bar).
- Test: Log in as EMPLOYEE on mobile; verify bottom nav shows only permitted destinations.

### FIX-SIDEBAR-5 — (Product decision, not a code fix) HR_ADMIN Admin section
- File: `components/layout/AppLayout.tsx:130` (`canSeeAdminSection`)
- Question: Should HR_ADMIN see the Admin section header? Currently only SUPER_ADMIN / TENANT_ADMIN / HR_MANAGER do. If HR_ADMIN is expected to manage holidays/leave-types/roles, add `roles.includes(Roles.HR_ADMIN)`.
- Risk: MEDIUM if changed (widens admin visibility — confirm with product before editing).
- Test: Confirm intended role model first.

## Fixes Already Done
- 1bf35bcc: `/fluence` added to `apps.ts` `routePrefixes` (FLUENCE app resolves correctly).
- 90798199: `PATH_TO_MENU_ID` + `autoActiveMenuId` useMemo introduced (auto-derive active item from pathname; fixed the 78-page "Dashboard" mis-highlight).

## Acceptance Criteria
- [ ] All 7 roles: correct menu sections visible (verified — no change needed; HR_ADMIN admin-section is a product question, not a bug)
- [ ] All routes: correct active-state highlighting (FIX-1, FIX-2, FIX-3)
- [ ] Mobile nav: role-aware (FIX-4, optional — currently app-aware only)
- [ ] TypeScript clean after fixes
- [ ] No RBAC leaks (confirmed — visibility gating is sound; mobile bar is server-gated even where links over-show)
