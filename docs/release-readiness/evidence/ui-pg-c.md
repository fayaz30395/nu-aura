# UI pages wave C (people and admin), worker ui-pg-c

Status: partially done. Lint drift and tokens fixed in the assigned folders; the table migration, page headers and Add Employee modal screenshot are NOT done.

## Changed (files touched, all inside assigned folders)
- `app/analytics/page.tsx`: "Absent" attendance donut uses the neutral `chartColors.muted()` instead of saturated `chartColors.danger()`; arbitrary px sizes to scale classes.
- `app/analytics/org-health/page.tsx`: `max-w-[1600px]` to `max-w-screen-2xl`; arbitrary heights to scale.
- `app/reports/page.tsx`, `app/reports/loading.tsx`, `app/reports/utilization/page.tsx`: arbitrary sizes to scale; added `aria-label` to the icon-only refresh button.
- `app/settings/page.tsx`, `app/settings/privacy/page.tsx`, `app/settings/security/api-keys/page.tsx`: arbitrary sizes to scale.
- `app/admin/page.tsx`, `app/admin/audit/page.tsx`, `app/admin/budget/page.tsx`, `app/admin/employees/page.tsx`, `app/admin/permissions/page.tsx`, `app/admin/integrations/webhooks/page.tsx`: arbitrary sizes to scale; table `min-w-[...px]` to `min-w-max`; `min-h-[60px]` to `min-h-16`.
- `app/admin/shifts/page.tsx`: hex fallback `#2563EB` to `var(--accent)`.
- `app/approvals/inbox/page.tsx`: arbitrary sizes to scale.
- `app/team-directory/page.tsx`: `max-w` arbitrary value to scale.
- `app/employees/_components/ProfileSheet.tsx`, `EmployeeAvatar.tsx`: arbitrary sizes to scale.

Method: scripted class-token replacement (`/tmp`-free, scratch script) over the files above, then manual edits for the hex, icon-button and chart-colour items. No logic, API, permission, route, data-testid or aria-id changes.

## Checks
- `npm run lint:design-system` (drift): total 635 to 387 repo-wide (before this wave: 635; after: 387). Assigned folders: 115 to 6.
- Remaining in assigned folders (6, all `arbitrary-size`): `analytics/page.tsx:212,619` and `reports/page.tsx:431,551` (`tracking-[0.18em]` / `tracking-[0.1em]`); `EmployeeAvatar.tsx:15` (`text-[8px]` initials in a 22px box) and `:67` (avatar font tracking).
- `npx tsc --noEmit`: clean (no output).
- `npx eslint --max-warnings=0` on all 19 touched files: exit 0.
- `npx vitest run` on employees, analytics, reports, settings, admin/audit, admin/budget, admin/shifts, approvals, team-directory: 1 file, 12 tests passed.

## Screenshots (`evidence/screenshots/`)
Login as the runbook demo account `jagadeesh@` (HR_MANAGER). Horizontal page overflow measured 0px in every shot.
- `NU-PG-C-employees-directory-{light,dark}-1440.png`, `NU-PG-C-employees-directory-light-390.png`
- `NU-PG-C-hr-dashboard-{light,dark}-1440.png`, `NU-PG-C-hr-dashboard-light-390.png`
- `NU-PG-C-admin-list-{light,dark}-1440.png` (`/admin/employees`)

Viewed: directory light 1440, admin list dark 1440.

## Round 2 (2026-11-16)
- Drift in assigned folders: 6 to 0 (repo-wide 381). `analytics`/`reports` tracking to `tracking-widest`; `EmployeeAvatar` initials 8px to `text-3xs` in a `h-6` box (deliberate: fits the token scale).
- `app/admin/employees/page.tsx`: table migrated to `ResponsiveTable` (columns, loading/error/empty props), search in `toolbar`, `TablePagination` for server pages, role editor rendered below the table. Header now `PageHeader` (breadcrumb Admin / Employees, primary "Create Employee"). Actions column visible at 1440 (`NU-PG-C-admin-list-light-1440.png`).
- `app/employees/_components/AddEmployeeModal.tsx`: rendered through `createPortal` to `document.body`. Before, the fixed overlay anchored to a transformed page wrapper and the modal sat at the bottom with its footer off-screen. Verified: centred at 1440 light and dark, 390 light; footer (Cancel / Add Employee) visible; body scrolls at 390.
- Account for the modal shots: `admin@` (runbook demo admin), after waiting out the login limit.

## Not done / open
1. **Hand-rolled tables still present (18):** `admin/office-locations`, `admin/roles`, `admin/departments`, `admin/permissions`, `admin/leave-requests`, `admin/benefit-plans`, `admin/leave-types`, `admin/custom-fields`, `admin/implicit-roles` (x2), `admin/page.tsx`, `reports/utilization` (x2), `reports/builder`, `reports/page.tsx`, `analytics/org-health`, `departments`. Not migrated in this pass.
2. **Page headers:** only `admin/employees` moved to `PageHeader`. About 40 other pages in these folders still use their own header markup.
3. **Loading/empty/error states not audited** beyond the existing `loading.tsx` files.
5. **Shell issue seen (not my folder):** in the sidebar footer the org avatar overlaps the "All Modules Active" text at 1440 dark.
6. Tailwind 3.4 has no `h-22`/`h-65`/`w-120`; the mapping used nearest scale steps, so some boxes shifted by 2-4px.
