# NU-AURA Design System Compliance Plan

> **Status**: DRAFT — Awaiting approval before implementation
> **Date**: 2026-04-01
> **Source of truth**: `themes/nu_aura_single_hue_design_system.pdf` + `themes/nu_aura_typography_spacing_alignment_balanced.pdf`
> **Brand identity**: `themes/nulogic.md`

---

## 1. Executive Summary

The NU-AURA frontend has **67 HIGH** and **6 MEDIUM** severity violations against the two design system PDFs. This document catalogs every violation, the exact fix, and which files are affected.

### Violation Counts

| Category | Severity | Files | Instances |
|----------|----------|-------|-----------|
| Raw hex in component code | HIGH | 15+ | 46 |
| Non-standard Tailwind colors | HIGH | 21 | 50+ |
| Mantine color refs in charts | HIGH | 8 | 12 |
| Legacy `sky-*` classes | MEDIUM | 18 | 104 |
| DataTable row height wrong | MEDIUM | 1 | 1 |
| Button padding inconsistent | MEDIUM | 1 | 1 |
| Typography tokens missing | LOW | 1 | 6 |
| Compact/density not wired | LOW | 1 | 1 |

---

## 2. Color Migration Rules

### 2.1 Single Hue Tonal Scale (Primary)

All primary UI (80-90%) should use the `accent-*` scale, which maps to NULogic Lapis Blue:

| Token | Light Mode | Dark Mode |
|-------|-----------|-----------|
| `accent-50` | `#eeeeff` | `rgba(5, 7, 102, 0.10)` |
| `accent-100` | `#d4d4f7` | `rgba(5, 7, 102, 0.18)` |
| `accent-200` | `#a8a8ef` | `#61629D` |
| `accent-300` | `#7c7ce6` | `#7c7ce6` |
| `accent-400` | `#5050de` | `#a8a8ef` |
| `accent-500` | `#2525b0` | `#B17DC1` |
| `accent-600` | `#0f0f8a` | `#a8a8ef` |
| `accent-700` | `#050766` | `#c4c4f5` |
| `accent-800` | `#040555` | `#d4d4f7` |
| `accent-900` | `#030344` | `#eeeeff` |

### 2.2 Semantic Colors (Independent Layer)

| Semantic | Token prefix | Use for |
|----------|-------------|---------|
| Success | `success-*` | Approved, active, present, positive |
| Danger | `danger-*` | Rejected, absent, errors, destructive |
| Warning | `warning-*` | Pending, late, caution |
| Info | `info-*` | Informational, neutral highlights |

### 2.3 Non-Standard Color → Semantic Mapping

| Current (non-compliant) | Replace with | Rationale |
|------------------------|-------------|-----------|
| `rose-*` | `danger-*` | Error/destructive states |
| `amber-*` | `warning-*` | Caution/pending states |
| `emerald-*` | `success-*` | Positive/success states |
| `lime-*` | `success-*` | Positive states |
| `cyan-*` | `info-*` | Informational |
| `pink-*` | `danger-*` | Lighter destructive |
| `orange-*` | `warning-*` | Caution states |
| `indigo-*` | `accent-*` | Primary tonal |
| `violet-*` | `nu-purple-*` | Brand secondary |
| `fuchsia-*` | `nu-purple-*` | Brand secondary |
| `teal-*` | `nu-teal-*` | Brand depth |
| `sky-*` | `accent-*` | Legacy primary |
| `purple-*` (raw TW) | `nu-purple-*` | Brand secondary |

### 2.4 Chart Color Variables

Already defined in `globals.css`. All charts must use these instead of raw hex:

| Variable | Light | Dark | Use for |
|----------|-------|------|---------|
| `--chart-primary` | `#050766` | `#a8a8ef` | Primary data series |
| `--chart-secondary` | `#8939A1` | `#B17DC1` | Secondary series |
| `--chart-success` | `#16a34a` | `#4ade80` | Positive metrics |
| `--chart-warning` | `#f59e0b` | `#fbbf24` | Caution metrics |
| `--chart-danger` | `#E62A32` | `#EE777C` | Negative metrics |
| `--chart-info` | `#61629D` | `#c4c4f5` | Informational |
| `--chart-accent` | `#EE777C` | `#EE777C` | Highlight |
| `--chart-muted` | `#c0c3c8` | `#2a4a55` | Gridlines, muted |
| `--chart-grid` | `#d8dadd` | `#2a4a55` | Axis gridlines |
| `--chart-tooltip-bg` | `#ffffff` | `#0e1e25` | Tooltip background |
| `--chart-tooltip-border` | `#c0c3c8` | `#2a4a55` | Tooltip border |
| `--chart-tooltip-text` | `#050766` | `#FFFFFF` | Tooltip text |

### 2.5 Raw Hex → CSS Variable Mapping (for charts)

| Raw Hex | CSS Variable |
|---------|-------------|
| `#3b82f6` | `var(--chart-primary)` |
| `#050766` | `var(--chart-primary)` |
| `#10b981` | `var(--chart-success)` |
| `#16a34a` | `var(--chart-success)` |
| `#e2e8f0` / `#E2E8F0` | `var(--chart-grid)` |
| `#8b5cf6` | `var(--chart-secondary)` |
| `#8884d8` | `var(--chart-secondary)` |
| `#dc2626` | `var(--chart-danger)` |
| `#f97316` | `var(--chart-warning)` |
| `#F59E0B` | `var(--chart-warning)` |
| `#94A3B8` / `#64748b` | `var(--chart-muted)` |
| Tooltip bg `rgba(255,255,255,0.95)` | `var(--chart-tooltip-bg)` |
| Tooltip border `#e2e8f0` | `var(--chart-tooltip-border)` |

### 2.6 Mantine Color Refs → CSS Variables

| Current | Replace with |
|---------|-------------|
| `var(--mantine-color-cyan-6)` | `var(--chart-info)` |
| `var(--mantine-color-green-6)` | `var(--chart-success)` |
| `var(--mantine-color-amber-6)` | `var(--chart-warning)` |
| `var(--mantine-color-red-6)` | `var(--chart-danger)` |
| `var(--mantine-color-blue-6)` | `var(--chart-primary)` |
| `var(--mantine-color-pink-6)` | `var(--chart-accent)` |
| `var(--mantine-color-orange-6)` | `var(--chart-warning)` |
| `var(--mantine-color-lime-6)` | `var(--chart-success)` |
| `var(--mantine-color-indigo-6)` | `var(--chart-info)` |
| `var(--nu-lapis-blue)` | `var(--chart-primary)` |

### 2.7 Exemptions

These hex values are **acceptable** and should NOT be replaced:
- Google OAuth brand colors: `#4285F4`, `#34A853`, `#FBBC05`, `#EA4335`
- SVG noise/texture data URIs in CSS custom properties

---

## 3. Typography & Spacing Fixes

### 3.1 Typography Token Layer

**Current**: Uses Tailwind defaults without named CSS custom properties.
**Required**: Add named tokens in `globals.css`:

```css
/* Typography Scale (Balanced Spec) */
--text-xs: 0.75rem;    /* 12px — metadata */
--text-sm: 0.875rem;   /* 14px — tables (primary) */
--text-base: 1rem;     /* 16px — default UI */
--text-md: 1.125rem;   /* 18px — emphasis */
--text-lg: 1.25rem;    /* 20px — section headers */
--text-xl: 1.5rem;     /* 24px — page headers */
```

### 3.2 DataTable Row Height

**File**: `frontend/components/ui/DataTable.tsx`
**Current**: `<td>` uses `py-3` (variable height)
**Fix**: Change row `<td>` to include `h-11` for 44px min-height

```diff
- <td className="px-4 py-3 ...">
+ <td className="px-4 py-2.5 h-11 ...">
```

### 3.3 Alignment Rules

**Spec**: Text→left, Numbers→right, Actions→right, Badges→center

DataTable already supports `alignClass()` but doesn't enforce it. Columns with numeric data should default to `text-right`.

### 3.4 Component Padding

| Component | Spec | Current | Fix needed? |
|-----------|------|---------|------------|
| Button md | `py-2 px-4` (8/16) | `h-11 px-4` | No — height-based sizing is fine |
| Button sm | `py-1.5 px-3` | `h-9 px-4` | No — acceptable |
| Card sm | `p-4` (16px) | `p-4` | Pass |
| Card md | `p-6` (24px) | `p-6` | Pass |

---

## 4. File-by-File Fix List

### 4.1 Chart Components (raw hex → CSS vars)

| File | Current hex values | Replacement |
|------|-------------------|-------------|
| `app/expenses/reports/ExpenseCharts.tsx` | 10 mantine-color-* refs | See §2.6 mapping |
| `app/admin/system/GrowthChart.tsx` | `#3b82f6`, `#10b981`, `#8b5cf6`, `#e2e8f0`, `#64748b` | chart-primary, chart-success, chart-secondary, chart-grid, chart-muted |
| `app/predictive-analytics/PredictiveCharts.tsx` | `#dc2626`, `#f97316`, `#16a34a` | chart-danger, chart-warning, chart-success |
| `app/dashboards/employee/EmployeeAttendanceChart.tsx` | `#3b82f6` | chart-primary |
| `app/dashboards/manager/ManagerCharts.tsx` | `#F59E0B`, `#E2E8F0`, `#94A3B8` | chart-warning, chart-grid, chart-muted |
| `app/dashboards/executive/ExecutiveCharts.tsx` | `#E2E8F0` | chart-grid |
| `app/performance/revolution/PerformanceSpiderChart.tsx` | `#e2e8f0`, `#10b981`, `#8b5cf6`, `#3b82f6` | chart-grid, chart-success, chart-secondary, chart-primary |
| `app/performance/competency-matrix/CompetencyCharts.tsx` | `#0369a1`, `#dc2626` | chart-primary, chart-danger |
| `components/charts/AttendanceTrendChart.tsx` | `#10b981`, `#e2e8f0` | chart-success, chart-grid |
| `components/charts/PayrollCostTrendChart.tsx` | `#8b5cf6`, `#e2e8f0` | chart-secondary, chart-grid |
| `components/charts/LeaveDistributionChart.tsx` | `#8884d8` | chart-secondary |
| `components/charts/DepartmentDistributionChart.tsx` | `#10b981` | chart-success |
| `components/charts/HeadcountTrendChart.tsx` | Multiple hex strokes | chart-primary, chart-grid |

### 4.2 Non-Standard Color Classes (Tailwind)

| File | Violations | Fix |
|------|-----------|-----|
| `app/auth/login/page.tsx` | `rose-*` (5), raw hex (10) | `rose-*` → `danger-*`, hex → CSS vars (except Google OAuth) |
| `app/attendance/page.tsx` | `rose-*` (2) | `rose-*` → `danger-*` |
| `app/features/page.tsx` | `rose-*` (4) | `rose-*` → `danger-*` |
| `app/workflows/page.tsx` | `rose-*`, `lime-*`, `fuchsia-*` (5) | `rose-*`→`danger-*`, `lime-*`→`success-*`, `fuchsia-*`→`nu-purple-*` |
| `app/expenses/mileage/page.tsx` | `emerald-*`, `amber-*` (4) | `emerald-*`→`success-*`, `amber-*`→`warning-*` |
| `app/admin/integrations/page.tsx` | `rose-*` (8) | `rose-*` → `danger-*` |
| `app/admin/settings/page.tsx` | `rose-*` | `rose-*` → `danger-*` |
| `app/org-chart/page.tsx` | `rose-*` | `rose-*` → `danger-*` |
| `app/fluence/blogs/page.tsx` | `rose-*`, `lime-*` | `rose-*`→`danger-*`, `lime-*`→`success-*` |
| `app/recruitment/candidates/page.tsx` | `lime-*` | `lime-*` → `success-*` |
| `components/fluence/MentionInput.tsx` | `rose-*` | `rose-*` → `danger-*` |
| `components/dashboard/PostComposer.tsx` | `rose-*` | `rose-*` → `danger-*` |
| `components/dashboard/StatCard.tsx` | `rose-*` | `rose-*` → `danger-*` |
| `components/dashboard/BirthdayWishingBoard.tsx` | `cyan-*`, `sky-*` | `cyan-*`→`info-*`, `sky-*`→`accent-*` |
| `app/wall/PostComposer.tsx` | `rose-*` | `rose-*` → `danger-*` |

### 4.3 Legacy `sky-*` Classes (18 files, 104 instances)

| File | Instance count | Fix |
|------|---------------|-----|
| `components/ui/DataTable.tsx` | 22 | `sky-*` → `accent-*` |
| `components/ui/TableFilterBar.tsx` | 10 | `sky-*` → `accent-*` |
| `components/ui/ExportMenu.tsx` | 4 | `sky-*` → `accent-*` |
| `components/ui/NotificationDropdown.tsx` | 10 | `sky-*` → `accent-*` |
| `components/dashboard/BirthdayWishingBoard.tsx` | 5 | `sky-*` → `accent-*` |
| `components/expenses/ReceiptScanner.tsx` | 12 | `sky-*` → `accent-*` |
| `app/expenses/mileage/page.tsx` | 21 | `sky-*` → `accent-*` |
| `app/integrations/slack/page.tsx` | 12 | `sky-*` → `accent-*` |
| `app/surveys/[id]/analytics/page.tsx` | 2 | `sky-*` → `accent-*` |
| `app/surveys/[id]/page.tsx` | 4 | `sky-*` → `accent-*` |
| `app/surveys/[id]/respond/page.tsx` | 9 | `sky-*` → `accent-*` |
| `app/employees/[id]/compensation/page.tsx` | 4 | `sky-*` → `accent-*` |
| `app/app/hire/page.tsx` | 1 | `sky-*` → `accent-*` |
| `app/app/fluence/page.tsx` | 1 | `sky-*` → `accent-*` |
| `app/app/hrms/page.tsx` | 1 | `sky-*` → `accent-*` |
| `app/app/grow/page.tsx` | 1 | `sky-*` → `accent-*` |
| `lib/utils/export.ts` | 1 | `FF0369A1` → `FF050766` |
| `e2e/scheduled-reports.spec.ts` | 3 | `bg-sky-700` → `bg-accent-700` |

### 4.4 Dashboard Widget Hex Colors

| File | Violations | Fix |
|------|-----------|-----|
| `components/dashboard/WelcomeBanner.tsx` | Hex backgrounds | → CSS vars (`--bg-*`, `--accent-*`) |
| `components/dashboard/TimeClockWidget.tsx` | Hex colors | → CSS vars |
| `components/dashboard/LeaveBalanceWidget.tsx` | Hex tooltip styles | → `--chart-tooltip-*` vars |
| `app/dashboards/employee/page.tsx` | Hex gradients | → CSS gradient vars |

### 4.5 Structural Fixes

| File | Issue | Fix |
|------|-------|-----|
| `components/ui/DataTable.tsx` | `<td>` rows use `py-3` (variable height) | Add `h-11` for 44px min-height |
| `e2e/scheduled-reports.spec.ts` | Tests assert `bg-sky-700` | Update to `bg-accent-700` |

---

## 5. Dark Theme Status

**`globals.css .dark {}`** — Already complete with NULogic brand colors (Dark Teal + Lapis Blue).
**`styles/aura-dark-theme.css`** — Was dead code with conflicting values (DM Sans, pure blue #0057FF). Needs rewrite to reference `globals.css` CSS variables for utility classes only.

---

## 6. What the nulogic.md Branding Doc Needs

The current `themes/nulogic.md` is a **corporate brand identity guide** (logos, colors, typography, voice). For NU-AURA as a product, it should also include:

1. **Dark mode tokens** — document the `.dark` CSS variable values
2. **Semantic color layer** — success/danger/warning/info definitions
3. **Monospace font** — Roboto Mono (used in code, metrics)
4. **Spacing/sizing system** — 8px grid, 44px touch targets
5. **Component mapping** — how brand colors map to sidebar, header, cards, buttons, charts
6. **Chart color palette** — the 12 `--chart-*` variables
7. **Single-hue governance rules** — no raw hex, all via tokens

---

## 7. Implementation Order (Recommended)

| Phase | Scope | Impact | Risk |
|-------|-------|--------|------|
| 1 | `sky-*` → `accent-*` (18 files) | Medium | Low — mechanical replace |
| 2 | Non-standard colors → semantic (21 files) | High | Low — color class rename |
| 3 | Chart hex → CSS vars (13 files) | High | Medium — verify chart rendering |
| 4 | Login page + dashboard widgets (5 files) | Medium | Medium — visual regression |
| 5 | DataTable 44px rows | Medium | Low — single file |
| 6 | Typography token layer | Low | Low — additive |
| 7 | Dark theme file cleanup | Low | None — file not imported |
| 8 | nulogic.md product section | Low | None — documentation |

---

## 8. Agents Already Dispatched (In Progress)

> **Note**: Some agents were dispatched before the "create as document" instruction. These agents may have already made changes to files.

| Agent | Files | Status |
|-------|-------|--------|
| sky-* UI components | DataTable, TableFilterBar, ExportMenu, NotificationDropdown, BirthdayWishingBoard, ReceiptScanner | Running |
| sky-* app pages | expenses, surveys, integrations, compensation, app/* entry pages, export.ts | Running |
| Chart hex fixes | 13 chart files | Running |
| Non-standard colors group 1 | attendance, features, workflows, expenses/mileage | Running |
| Non-standard colors group 2 | admin/*, org-chart, fluence/*, wall/*, MentionInput, PostComposer, StatCard | Running |
| Login + dashboard widgets | login, WelcomeBanner, TimeClockWidget, LeaveBalanceWidget, RichTextEditor | Running |
| DataTable structural fixes | DataTable.tsx, candidates, not-found, employee dashboard, e2e test | Running |
| Remaining violations scan | All other files with non-standard colors | Running |

---

## 9. Acceptance Criteria

After implementation:
- [ ] `grep -r "sky-[0-9]" frontend/app/ frontend/components/` returns 0 results
- [ ] `grep -r "rose-[0-9]" frontend/app/ frontend/components/` returns 0 results
- [ ] `grep -r "amber-[0-9]" frontend/app/ frontend/components/` returns 0 results
- [ ] `grep -r "emerald-[0-9]" frontend/app/ frontend/components/` returns 0 results
- [ ] `grep -r "lime-[0-9]" frontend/app/ frontend/components/` returns 0 results
- [ ] `grep -r "fuchsia-[0-9]" frontend/app/ frontend/components/` returns 0 results
- [ ] `grep -r "cyan-[0-9]" frontend/app/ frontend/components/` returns 0 results (except info-* refs)
- [ ] No raw hex in `stroke=`, `fill=`, or `style=` in chart TSX files (except Google brand colors)
- [ ] No `var(--mantine-color-*)` in chart files
- [ ] DataTable rows render at 44px height
- [ ] All semantic colors use `success-*`, `danger-*`, `warning-*`, `info-*`
- [ ] Visual regression check on: login, dashboard, charts, data tables, surveys
