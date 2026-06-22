# Phase 0 — Consolidation Opportunity Report

Duplicate UI patterns reimplemented instead of reusing shared components. **Total ~9,700–10,300 removable lines across ~426 files.** Estimates marked *(est.)*.

| # | Category | Sites | Lines removable *(est.)* | Severity |
|---|---|---|---|---|
| 1 | Loading states | ~504 | ~5,160 | **Critical** |
| 2 | Tables | 66 | ~3,200–4,800 | High |
| 3 | Page headers | 55 | ~375 | High |
| 4 | Cards | 280 | ~280 | Medium |
| 5 | Stat widgets | ~50 blocks | ~320 | Medium |
| 6 | Avatars | 8 | ~120 | Medium |
| 7 | Profile heroes | 3 | ~120 | Medium |
| 8 | Empty states | ~120 | ~120–240 | Low-Med |

## 1. Loading states (Critical)
- **271 `loading.tsx`** import raw `Skeleton` from `@mantine/core` (e.g. `app/benefits/loading.tsx:3`, `app/employees/loading.tsx:3`, `app/attendance/loading.tsx:3`); only **7** use shared `@/components/ui/Skeleton` (`app/loading.tsx`, `app/me/loading.tsx`, `app/leave/loading.tsx`, `app/loans/loading.tsx`, `app/admin/employees/loading.tsx`, `app/recruitment/agencies/loading.tsx` + `[id]`).
- **233 inline `animate-spin`** across **155 files** bypass `Spinner` (e.g. `app/payments/page.tsx:414`, `app/expenses/page.tsx:376`, `app/recruitment/candidates/[id]/page.tsx:34`, `app/learning/courses/[id]/page.tsx:124`).
- **Duplicate symbols** `SkeletonStatCard`/`SkeletonCard`/`SkeletonTable` defined in **both** `Skeleton.tsx` and `Loading.tsx` (slightly different markup).

## 2. Tables (High)
60 inline `<table>` + 6 Mantine `Table` (`app/contracts/[id]/page.tsx:8`, `app/tax/page.tsx:7`, `app/payroll/salary-structures/page.tsx:6`, `app/admin/import-keka/page.tsx:7`, `app/admin/system/page.tsx:6`, `app/contracts/page.tsx:13`) vs only 7 uses of `ResponsiveTable`. ~40 are non-trivial migration candidates; calendars/specialized stay custom.

## 3. Page headers (High)
15 local `function PageHeader` (e.g. `app/attendance/page.tsx:321`, `app/me/dashboard/page.tsx:380`, `app/payroll/page.tsx:247`, `app/leave/page.tsx:166`, `app/reports/page.tsx:229`) + ~40 bare `<h1>` with 4 different class conventions (`text-xl font-bold`, `text-2xl font-bold`, `text-page-title`, `text-aura-title`). No shared `PageHeader`.

## 4. Cards (Medium)
272 inline `rounded-{lg|xl} border p-{4|5|6}` divs (e.g. `app/loans/new/page.tsx:170`, `app/calendar/[id]/page.tsx:178,291,303,313`, `app/expenses/page.tsx:484,906,1134`) + 8 Mantine Card files. Token inconsistency across `border-main`/`border-subtle`/`surface-*`.

## 5. Stat widgets (Medium)
Legacy `StatCard` (40 uses, marked "prefer `<Stat>`") vs `Stat` (~20). ~16 inline stat grids bypass both (`app/recruitment/agencies/page.tsx:207–238`, `app/admin/holidays/page.tsx:280–296`, `app/tax/page.tsx:143–152`, `app/benefits/page.tsx:903`).

## 6. Avatars (Medium)
6 local avatar fns, **0 use shared `EmployeeAvatar`**: `AvatarInitials` (`employees/[id]/page.tsx:152`), `HeatAvatar` (`attendance/page.tsx:441`), `LeaveAvatar` (`leave/page.tsx:205`), `AssigneeAvatar` (`assets/page.tsx:183`), `OwnerAvatar` (`reports/page.tsx:457`), `RequesterAvatar` (`approvals/inbox/_components/RequesterAvatar.tsx:56`) + 2 inline in `team-directory/page.tsx:47,99`.

## 7. Profile heroes (Medium — project spine)
3 impls, 0 shared: `employees/[id]/page.tsx:415–470`, `me/profile/page.tsx:300–345`, `team-directory/page.tsx:40–130`.

## 8. Empty states (Low-Med)
`EmptyState` used 349× (best-adopted), but ~30–40% of employee screens are DIY (`employees/directory/page.tsx:726–736`, `me/leaves/page.tsx:511–529`, `me/documents/page.tsx:199–211`) or bare `<p>` (`me/attendance/page.tsx:381,642`, `attendance/shift-swap/page.tsx:494`). `EmptyStatePresets.noEmployees` defined but unused.

## Sequencing note
Consolidation is **interleaved with** the elevation work, not a separate sweep: shared `Avatar` + `ProfileHero` (cats 6/7) land first as the identity layer; loading/empty (cats 1/8) land as state-hygiene on employee routes; cards/headers/tables/stats (cats 2/3/4/5) are opportunistic during touched-file edits. Full 426-file migration is a follow-up program, not gated by this redesign.
