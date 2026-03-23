# NU-AURA Frontend Bug Report

**Date:** 2026-03-24
**Auditor:** Claude Code (Opus 4.6) — Code-Level Scan
**Scope:** 205 page.tsx files, 123 component files, hooks, services

---

## Summary

| Metric | Value |
|--------|-------|
| Total pages scanned | 205 |
| Pages with full implementations | ~190 |
| Placeholder/stub pages | 2 (payroll/salary-structures, payroll/components) |
| Redirect-only pages | 5 (okr, feedback360, allocations, organization-chart, fluence) |
| Error boundaries (error.tsx) | 183 (comprehensive) |
| Loading states (loading.tsx) | 178 (comprehensive) |
| @ts-ignore / @ts-nocheck | 0 |
| Raw useEffect+fetch (anti-pattern) | 0 |
| TODO/FIXME in production code | 1 (me/documents/page.tsx — minor) |

| Severity | Count |
|----------|-------|
| CRITICAL | 1 |
| HIGH | 5 |
| MEDIUM | 6 |
| LOW | 4 |

---

## CRITICAL Bugs

### BUG-C01: Broken CSS class `dark:bg-[var(--bg-secondary)]900` in 6 files

**Files and lines:**
- `frontend/app/home/page.tsx` line 343
- `frontend/app/analytics/page.tsx` line 102
- `frontend/app/onboarding/[id]/page.tsx` line 370
- `frontend/app/approvals/inbox/page.tsx` line 344
- `frontend/app/onboarding/new/page.tsx` lines 126, 245

**Description:** The CSS class `dark:bg-[var(--bg-secondary)]900` is malformed. It concatenates a Tailwind arbitrary value `[var(--bg-secondary)]` with a literal `900` suffix, producing an invalid class that Tailwind will silently ignore. In dark mode, these elements will have no background color, causing invisible or overlapping text.

**Suggested fix:** Replace with `dark:bg-[var(--bg-secondary)]` (the CSS variable already resolves to the correct dark shade) or use a proper Tailwind class like `dark:bg-slate-900`.

---

## HIGH Bugs

### BUG-H01: Legacy `primary-*` color classes not migrated (969 occurrences across 133 page files + 238 in 55 component files)

**Description:** The design system was migrated from purple (`primary-*`) to sky (`sky-*`) per MEMORY.md. However, 133 page.tsx files still contain `primary-*` references (total 969 occurrences) and 55 component files contain 238 more. These will render using whatever `primary` maps to in the Tailwind config, which may not match the intended sky palette.

**Worst offenders (page files):**
- `frontend/app/auth/login/page.tsx` — 21 occurrences
- `frontend/app/home/page.tsx` — 22 occurrences
- `frontend/app/departments/page.tsx` — 18 occurrences
- `frontend/app/employees/page.tsx` — 7 occurrences
- `frontend/app/expenses/page.tsx` — 17 occurrences
- `frontend/app/letters/page.tsx` — 34 occurrences
- `frontend/app/performance/cycles/page.tsx` — 18 occurrences
- `frontend/app/performance/pip/page.tsx` — 17 occurrences
- `frontend/app/performance/feedback/page.tsx` — 14 occurrences
- `frontend/app/recruitment/pipeline/page.tsx` — 14 occurrences
- `frontend/app/recruitment/interviews/page.tsx` — 14 occurrences
- `frontend/app/reports/scheduled/page.tsx` — 15 occurrences

**Worst offenders (components):**
- `frontend/components/payroll/BulkProcessingWizard.tsx` — 18 occurrences
- `frontend/components/dashboard/FeedCard.tsx` — 13 occurrences
- `frontend/components/ui/StatCard.tsx` — 13 occurrences
- `frontend/components/layout/NotificationDropdown.tsx` — 13 occurrences
- `frontend/components/layout/GlobalSearch.tsx` — 11 occurrences
- `frontend/components/ui/Sidebar.tsx` — 11 occurrences
- `frontend/components/resources/EmployeeStep.tsx` — 11 occurrences
- `frontend/components/training/SkillGapAnalysis.tsx` — 10 occurrences

**Suggested fix:** Batch replace `primary-*` with `sky-*` per the migration patterns documented in MEMORY.md.

### BUG-H02: Fluence Wall page — Trending Sidebar is permanent skeleton with no data fetching

**File:** `frontend/app/fluence/wall/page.tsx` lines 17-37

**Description:** The `TrendingSidebar` component renders 4 `<Skeleton>` elements with a "Trending content coming soon..." message. It has no API hook, no `useQuery`, and no data fetching logic. This is a hardcoded placeholder that will always show skeleton lines — users will think the page is loading forever.

**Suggested fix:** Either implement trending content data fetching via a React Query hook, or replace the skeleton with a proper empty state/coming-soon card (without skeleton animation).

### BUG-H03: Fluence Wall page missing AppLayout wrapper

**File:** `frontend/app/fluence/wall/page.tsx`

**Description:** This page uses Mantine's `<Container>` directly without wrapping in `<AppLayout>`. All other Fluence sub-pages (wiki, blogs, templates, search, drive, dashboard, my-content) use `<AppLayout>`. This means the Wall page will render without the sidebar and header, creating an inconsistent navigation experience.

**Suggested fix:** Wrap the page content in `<AppLayout activeMenuItem="fluence">`.

### BUG-H04: Payroll salary-structures and components pages are "Coming soon" stubs

**Files:**
- `frontend/app/payroll/salary-structures/page.tsx` (22 lines)
- `frontend/app/payroll/components/page.tsx` (22 lines)

**Description:** These pages show only a centered icon + "Coming soon" text. They are linked from the Payroll hub page (`/payroll`) and will be confusing to users who navigate to them expecting functional pages. The existing `/payroll/structures` page (199 lines) appears to be the actual salary structures implementation, making `/payroll/salary-structures` a duplicate dead-end.

**Suggested fix:** Either redirect `/payroll/salary-structures` to `/payroll/structures`, or implement the pages. Consider removing the hub links until pages are ready.

### BUG-H05: Admin layout uses hardcoded `surface-*` and `primary-*` color classes

**File:** `frontend/app/admin/layout.tsx` lines 302-326

**Description:** The admin layout loading/access-denied states use `bg-surface-50`, `text-surface-600`, `text-surface-900`, `border-surface-200`, and `border-t-primary-600`. These are not CSS variable-based and may not match the design system. The main application uses `var(--bg-*)` and `var(--text-*)` CSS custom properties consistently elsewhere.

**Suggested fix:** Replace `bg-surface-50` with `bg-[var(--bg-surface)]`, `text-surface-600` with `text-[var(--text-secondary)]`, etc.

---

## MEDIUM Bugs

### BUG-M01: `surface-*` color classes used inconsistently across 20+ component and loading/error files (223 occurrences)

**Files (top offenders):**
- `frontend/components/layout/NotificationDropdown.tsx` — 42 occurrences
- `frontend/components/resource-management/EmployeeCapacityDisplay.tsx` — 25 occurrences
- `frontend/components/resource-management/AllocationApprovalModal.tsx` — 24 occurrences
- `frontend/components/resources/ProjectStep.tsx` — 24 occurrences
- `frontend/components/resources/EmployeeStep.tsx` — 24 occurrences
- `frontend/components/layout/GlobalSearch.tsx` — 23 occurrences

**Description:** 223 occurrences of `bg-surface-*`, `text-surface-*`, `border-surface-*` classes exist in component files. These likely resolve via Tailwind config but are inconsistent with the CSS variable pattern (`var(--bg-*)`, `var(--text-*)`) used in most page files.

### BUG-M02: Helpdesk page has unused variable `_isLoading`

**File:** `frontend/app/helpdesk/page.tsx` line 29

**Description:** The variable `_isLoading` is computed but never referenced in the template. The underscore prefix suggests it was intentionally marked unused, but the loading state is not communicated to the user — stat cards just show "..." while loading, with no skeleton or spinner.

**Suggested fix:** Use the loading state to show skeleton cards or a loading overlay.

### BUG-M03: Duplicate "Escalations" and "SLA Dashboard" quick action buttons all navigate to same route

**File:** `frontend/app/helpdesk/page.tsx` lines 131-173

**Description:** All three quick action buttons ("SLA Policies", "Escalations", "SLA Dashboard") navigate to the same route `/helpdesk/sla`. The Escalations button should likely go to a different view or filtered state, and the Knowledge Base page (`/helpdesk/knowledge-base`) is not linked from the hub.

**Suggested fix:** Link "Escalations" to a filtered view or separate route. Add a Knowledge Base quick action.

### BUG-M04: Payroll page hub uses old `primary-*` gradient colors for card icons

**File:** `frontend/app/payroll/page.tsx` lines 24-25, 108

**Description:** The Payroll Runs card uses `from-primary-500 to-primary-600` gradient and `hover:border-primary-300` which should be migrated to sky palette per the design system.

### BUG-M05: `home/page.tsx` textarea uses mixed color systems

**File:** `frontend/app/home/page.tsx` line 343

**Description:** A single textarea element mixes three different color systems:
- `bg-[var(--bg-surface)]` (CSS variables)
- `dark:bg-[var(--bg-secondary)]900` (malformed CSS variable — see BUG-C01)
- `focus:ring-brand-200 dark:focus:ring-primary-700` (brand-* and primary-*)
- `focus:border-brand-300 dark:focus:border-primary-600` (brand-* and primary-*)

This creates an inconsistent and broken dark mode experience.

### BUG-M06: My Attendance page uses `surface-*` classes

**File:** `frontend/app/attendance/my-attendance/page.tsx` — 4 occurrences

**Description:** Uses `bg-surface-*` / `text-surface-*` classes inconsistent with the CSS variable pattern used by the rest of the attendance module.

---

## LOW Bugs

### BUG-L01: `as any` usage in test files (acceptable but noted)

**Files:**
- `frontend/lib/services/payroll.service.test.ts` — 12 occurrences
- `frontend/lib/services/employee.service.test.ts` — 4 occurrences
- `frontend/lib/services/attendance.service.test.ts` — 12 occurrences
- `frontend/lib/services/leave.service.test.ts` — 10 occurrences

**Description:** Test files use `as any` for mock data. While common in test code, proper mock types would improve test reliability. The project has `type-guards.ts` utilities specifically designed to replace `as any` patterns.

### BUG-L02: Minor TODO comment in production code

**File:** `frontend/app/me/documents/page.tsx` line 49

**Description:** `// TODO: Consider moving label/description to a backend endpoint when the API supports it.`

This is a minor reminder but should be tracked in a backlog.

### BUG-L03: Hardcoded notification count in admin layout

**File:** `frontend/app/admin/layout.tsx` line 373

**Description:** `notificationCount={3}` is hardcoded. This should come from an API query or notification store.

**Suggested fix:** Use the notification hook/store to get the real count.

### BUG-L04: Admin layout `eslint-disable` for exhaustive-deps

**File:** `frontend/app/admin/layout.tsx` line 251

**Description:** `// eslint-disable-next-line react-hooks/exhaustive-deps` with `JSON.stringify(permissions)` as a dependency — this is a workaround for object reference stability. Not a bug, but `useMemo` with a stable key would be cleaner.

---

## Positive Findings

The following areas are well-implemented:

1. **Error boundaries:** 183 `error.tsx` files covering nearly every route — excellent crash recovery.
2. **Loading states:** 178 `loading.tsx` files for Suspense boundaries — good perceived performance.
3. **Zero `@ts-ignore` / `@ts-nocheck`:** No TypeScript escape hatches in production code.
4. **Zero raw `useEffect+fetch`:** All data fetching uses React Query consistently.
5. **React Hook Form + Zod:** Used consistently across all form pages (payroll runs, departments, employees, recruitment candidates, etc.).
6. **RBAC enforcement:** Pages consistently check permissions via `usePermissions` hook and redirect unauthorized users.
7. **Type-safe utility functions:** `type-guards.ts` provides utilities to avoid `as any` patterns.
8. **Comprehensive API hook coverage:** `usePayroll`, `useDepartments`, `useEmployees`, `useAttendance`, `useHelpdeskSla` — hooks are well-structured with proper query keys.

---

## Recommended Fix Priority

1. **Immediate (Day 1):** Fix BUG-C01 (broken CSS class in 6 files) — causes visual breakage in dark mode
2. **Sprint Priority:** Fix BUG-H01 (primary-* color migration) — 1,207 total occurrences across 188 files
3. **Sprint Priority:** Fix BUG-H03 (Wall page missing AppLayout) — navigation inconsistency
4. **Backlog:** Fix BUG-H02 (Wall trending sidebar stub), BUG-H04 (payroll stub pages), BUG-H05 (admin layout colors)
5. **Backlog:** Fix BUG-M01 through BUG-M06 (color consistency, unused vars, duplicate routes)
6. **Low Priority:** BUG-L01 through BUG-L04 (test types, TODOs, hardcoded values)
