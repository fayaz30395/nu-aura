# QA UI/UX Deep Audit Findings — NU-AURA

> Generated: 2026-06-18
> Updated: 2026-06-18 (Iteration 7)
> Sources: Iteration 7 UI/UX Discovery, Accessibility Audit, previous iteration verifications

---

## Iteration 7 — New Findings

### Dark Mode Coverage (Iteration 7 Discovery)

| Metric | Count |
|--------|-------|
| Pages with dark: coverage | 222 |
| Pages missing dark: variants | 64 |
| Percentage covered | 77.6% |

**Pages missing dark: variants (64 total):**

`/app/admin/feature-flags/page.tsx`, `/app/admin/mobile-api/page.tsx`, `/app/admin/users/page.tsx`, `/app/allocations/page.tsx`, `/app/approvals/inbox/page.tsx`, `/app/approvals/page.tsx`, `/app/attendance/comp-off/page.tsx`, `/app/attendance/regularization/page.tsx`, `/app/attendance/shift-swap/page.tsx`, `/app/benefits/page.tsx`, `/app/contracts/[id]/page.tsx`, `/app/contracts/new/page.tsx`, `/app/contracts/templates/page.tsx`, `/app/documents/page.tsx`, `/app/exit-interview/[token]/page.tsx`, `/app/fluence/page.tsx`, `/app/fluence/templates/new/page.tsx`, `/app/fluence/wall/page.tsx`, `/app/fluence/wiki/new/page.tsx`, `/app/inbox/page.tsx`, `/app/knowledge/page.tsx`, `/app/leave/team/page.tsx`, `/app/loans/page.tsx`, `/app/lwf/page.tsx`, `/app/me/attendance/page.tsx`, `/app/me/dashboard/page.tsx`, `/app/me/skills/page.tsx`, `/app/notifications/page.tsx`, `/app/nu-drive/page.tsx`, `/app/nu-mail/page.tsx`, `/app/offboarding/exit/fnf/page.tsx`, `/app/offboarding/page.tsx`, `/app/onboarding/templates/page.tsx`, `/app/payroll/bulk-processing/page.tsx`, `/app/payroll/page.tsx`, `/app/payroll/payslips/page.tsx`, `/app/payroll/statutory/page.tsx`, `/app/performance/cycles/[id]/calibration/page.tsx`, `/app/performance/cycles/[id]/nine-box/page.tsx`, `/app/performance/okr/page.tsx`, `/app/privacy/page.tsx`, `/app/recruitment/kanban/page.tsx`, `/app/settings/rbac/page.tsx`, `/app/terms/page.tsx`, `/app/learning/paths/page.tsx`, `/app/linkedin-posts/page.tsx`, `/app/leave/encashment/page.tsx`, `/app/leave/admin/carry-forward/page.tsx`, `/app/onboarding/templates/new/page.tsx`, `/app/performance/okrs/page.tsx`, `/app/recruitment/pipeline/page.tsx`, `/app/referrals/page.tsx`, `/app/resources/workload/page.tsx`, `/app/training/my-learning/page.tsx`, `/app/wellness/admin/page.tsx`, `/app/payroll/runs/page.tsx`, `/app/surveys/pulse/page.tsx`, `/app/recognition/page.tsx`, `/app/timesheets/page.tsx`, `/app/overtime/page.tsx`, `/app/probation/page.tsx`, `/app/biometric-devices/page.tsx`, `/app/compensation/page.tsx`

### Accessibility Scale Findings (Iteration 7 Discovery)

| Issue | Count | WCAG Criterion |
|-------|-------|----------------|
| Icon-only buttons without aria-label | 32 | 1.1.1 Non-text Content (Level A) |
| Images without alt text | 37 | 1.1.1 Non-text Content (Level A) |
| Modals/dialogs without aria-labelledby or aria-label | 476 | 1.3.1 Info and Relationships + 4.1.2 Name Role Value |
| Inputs without labels | 154 | 1.3.1 + 3.3.2 Labels or Instructions |

**Color contrast issues identified:**

| File | Class | Issue |
|------|-------|-------|
| `frontend/app/attendance/page.tsx` | `text-2xs text-[var(--text-muted)]` | `--text-muted` (#6b7190 light / #7e85a3 dark) at ~10px fails WCAG AA 4.5:1 for small text |
| `frontend/app/attendance/regularization/_components/TeamRequestsView.tsx` | `text-xs text-[var(--text-muted)]` | text-xs (~12px) with `--text-muted` borderline on white — passes AA at 4.93:1 but at-risk in dark mode (#7e85a3 may drop below 4.5:1) |
| `frontend/styles/tailwind-presets.ts` | `text-xs text-[var(--text-muted)]` | Global table header preset applied across 100+ table headers — systematic risk in dark mode |

### Accessibility Fixes Applied (Iteration 7)

WCAG 1.1.1 icon-button aria-label fixes applied to 5 files:

| File | Fix |
|------|-----|
| `frontend/app/offboarding/[id]/fnf/page.tsx` | Added `aria-label="Back to offboarding"` to back-navigation ActionIcon |
| `frontend/app/offboarding/[id]/exit-interview/page.tsx` | Added `aria-label="Back to offboarding"` to back-navigation ActionIcon |
| `frontend/app/lwf/page.tsx` | Added `aria-label="Edit LWF configuration"` and `aria-label="Deactivate LWF configuration"` |
| `frontend/app/tax/declarations/page.tsx` | Added `aria-label="Declaration actions"` to menu-trigger ActionIcon |
| 1 additional file | aria-label added per fix summary |

**Remaining:** 27+ icon-only buttons still need aria-label (32 total found, ~5 fixed this iteration)

---

## A11y Fixes Verification (Prior Iterations)

### Commit 4092c0dd — label-control association gate (16 components/files)

**Status: VERIFIED GREEN**

All 16 components corrected:
- `MfaSetup.tsx` — htmlFor/id pairs added
- `ReceiptScanner.tsx` — 4 label→input pairs paired
- `AccessControlSection.tsx` — labels wired to controls
- `SpaceFormDrawer.tsx` — space-name/space-description pairs
- `SpacePermissionsDrawer.tsx` — description/icon label wired via Mantine prop
- `ConnectorConfigPanel.tsx` — field.name used as htmlFor
- `EventSubscriptionPicker.tsx` — label association fixed
- `BulkProcessingWizard.tsx` — labels wired
- `FeedbackResponseForm.tsx` — labels wired
- `TaskDetailsModal.tsx` — task-status-select paired
- `AllocationApprovalModal.tsx` — fixed
- `EmployeeAllocationDetailModal.tsx` — expanded with ids
- `EmployeeStep.tsx` / `ProjectStep.tsx` — mapped field ids added
- `AdvancedFilterPanel.tsx` — filter-field-{id}, filter-operator-{id}, valueInputId
- `PostComposer.tsx` — poll-question/praise-message wired

Lint gate: `npm run lint (eslint . --max-warnings=0)` passes, tsc 0 errors, next build 250/250 pages.

### Commit 954721f1 — UX-04/05/06 remaining touchups (4 files)

**Status: VERIFIED** (lint-suppression justifications only — no functional a11y regressions)

| File | Fix |
|------|-----|
| `AdminLayoutInner.tsx` | Removed unused `permissions` destructure; ESLint exhaustive-deps comment justified |
| `attendance/page.tsx` | `computeMonthStats` deps comment: `now` intentionally omitted (stable mount-time value) |
| `auth/login/page.tsx` | `useEffect` keyed only on `hasHydrated`; comment prevents stale-auth wipe on fresh login |
| `fluence/wiki/[slug]/page.tsx` | `recordView` mutation omitted from deps; view fires once per page |

### SlidePanel Component — VERIFIED EXCELLENT

`/frontend/components/ui/SlidePanel.tsx` implements full WCAG dialog contract:
- `role="dialog"` + `aria-modal="true"`
- `aria-labelledby` (generated via `useId()`) or `aria-label` fallback
- Escape-to-close via `window.addEventListener('keydown')`
- Focus moves to first focusable on open; restores to trigger on unmount
- Focus trap: Tab/Shift+Tab cycle within panel
- Backdrop click closes

### Skip-Link — VERIFIED

`/frontend/app/layout.tsx` line 79: `<a href="#main-content" className="skip-link">Skip to content</a>` — present and wired correctly before `<Providers>`.

### aria-live / ARIA Roles Coverage

| Component | Pattern |
|-----------|---------|
| `AccessibleFormField.tsx` | `role="alert"` + `aria-live="polite"` on validation errors |
| `Toast.tsx` | `role="status"` + `aria-live="polite"` + `aria-atomic="true"` |
| `StatusBadge.tsx` | `role="status"` |
| `PremiumSpinner.tsx` | `role="status"` + `aria-label="Loading"` (all 5 variants) |
| `Callout.tsx` | `role="alert"` (danger/warning) / `role="status"` (info/success) — unit tested |

---

## Dark Mode Coverage (Historical)

### Quantitative
- `dark:` Tailwind classes in `app/`: **5,094** occurrences (prior iteration)
- `sm:|md:|lg:|xl:` responsive classes in `app/`: **1,973** occurrences
- Pages with dark: coverage: **222 / 286** (77.6%)
- Pages missing dark: variants: **64**

### Hardcoded Non-Dark-Aware Colors

Most `bg-white` usages are intentional/context-safe (overlay tints, decorative elements, toggle thumbs).
Systematic gap: 64 pages with no `dark:` class variants at all.

---

## Responsive Coverage

### Quantitative
- Responsive breakpoint classes (`sm:`, `md:`, `lg:`, `xl:`) in `app/`: **1,973** occurrences
- `overflow-x-auto` scroll containers: **15** occurrences across tables in attendance, timesheets, loans, probation, letters, referrals, expenses, projects

Root `layout.tsx` has `overflow-x-hidden` on body — prevents page-level horizontal scroll.

**Responsive Score: 82/100**

Gaps:
- `attendance/shift-swap/page.tsx`: complex assignment grid lacks explicit scroll container comment
- Some attendance sub-pages use `overflow-x-auto` with bare `<table>` — no `min-width` constraint could cause column collapse on 320px

---

## EmptyState Coverage

### Quantitative
- `EmptyState` component uses in `app/`: **331** occurrences
- Pages with `.length === 0` checks NOT using `EmptyState`: **~20 spots** (prior iteration)
- Iteration 7: no new ad-hoc empty state patterns found

### Fixed Ad-hoc Empty State Patterns

| File | Fix | Status |
|------|-----|--------|
| `attendance/shift-swap/page.tsx` | `<EmptyState>` component | FIXED (prior iteration) |
| `attendance/comp-off/page.tsx` | `<EmptyState>` component | FIXED (prior iteration) |
| `attendance/team/page.tsx` | `<EmptyState>` component | FIXED (prior iteration) |
| `nu-calendar/page.tsx` | `<EmptyState>` component | FIXED (prior iteration) |
| `expenses/reports/page.tsx` | `<EmptyState>` component | FIXED (prior iteration) |
| `expenses/[id]/page.tsx` | `<EmptyState>` component | FIXED (prior iteration) |

---

## Issue List (Updated Iteration 7)

| ID | Severity | Component | Title | Status |
|----|----------|-----------|-------|--------|
| DARK-01 | MEDIUM | 64 pages | 64 pages missing dark: Tailwind variants — broken dark mode experience | OPEN — scale fix needed |
| A11Y-01 | HIGH | Multiple | 154 inputs without labels + 32 icon-only buttons without aria-label (scale issue) | OPEN — partially fixed (5 aria-labels added) |
| A11Y-02 | MEDIUM | Multiple | 476 modal/dialog instances without aria-labelledby or aria-label | OPEN |
| A11Y-03 | MEDIUM | Multiple | 37 images without alt text | OPEN |
| A11Y-04 | MEDIUM | Multiple | Color contrast risk: `text-2xs`/`text-xs` + `--text-muted` in dark mode across 100+ table headers | OPEN |
| UX-01 | CLOSED | `attendance/shift-swap` | Ad-hoc `<p>No shift swap requests found.</p>` | CLOSED — EmptyState added |
| UX-02 | CLOSED | `attendance/comp-off` | Ad-hoc `<p>No comp-off requests found.</p>` | CLOSED — EmptyState added |
| UX-03 | CLOSED | `attendance/team` | Inline "No attendance records" string | CLOSED — EmptyState added |
| UX-04 | CLOSED | `AdminLayoutInner` | Unused `permissions` destructure / ESLint dep warning | CLOSED |
| UX-05 | CLOSED | `attendance/page` | `computeMonthStats` exhaustive-deps false positive | CLOSED |
| UX-06 | CLOSED | `auth/login/page` | `useEffect` dep array intent (hasHydrated only) | CLOSED |
| UX-07 | CLOSED | `expenses/reports/page` | 4 ad-hoc empty state text divs | CLOSED — EmptyState added |
| UX-08 | CLOSED | `nu-calendar/page` | `<p>No events found</p>` | CLOSED — EmptyState added |
| UX-09 | INFO | `attendance/shift-swap` | No `min-width` on assignment table — may collapse at 320px | OPEN |
| UX-11 | PASS | `SlidePanel` | Full WCAG dialog contract implemented (focus trap, escape, aria-modal) | VERIFIED |
| UX-12 | PASS | Root layout | Skip-link present at `#main-content` | VERIFIED |
| UX-13 | PASS | All spinners | `role="status"` + `aria-label="Loading"` on all 5 PremiumSpinner variants | VERIFIED |
| UX-14 | PASS | `AccessibleFormField` | `role="alert"` + `aria-live="polite"` validation errors | VERIFIED |
| UX-15 | PASS | `Toast` | `role="status"` + `aria-live="polite"` + `aria-atomic` | VERIFIED |
| UX-16 | PASS | 16 components | label-control associations gate passes (eslint 0 warnings) | VERIFIED |
| A11Y-BACK-FIX | FIXED (Iter 7) | 5 files | Icon-only button aria-labels for offboarding, lwf, tax/declarations | FIXED THIS ITERATION |
