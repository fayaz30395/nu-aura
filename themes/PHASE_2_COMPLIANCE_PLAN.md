# NU-AURA Design System — Phase 2 Compliance Plan

> **Status**: Post-rescan after Phase 1 sweep (~230 edits across ~60 files)
> **Date**: 2026-04-01
> **Remaining violations**: ~200 across 4 categories

---

## Rescan Results Summary

| Category | Violations | Files | Severity |
|----------|-----------|-------|----------|
| Remaining color (slate, gray, rose, mantine, hex) | 43 | 23 | HIGH |
| Chart/dashboard raw hex | 62+ | 8 | HIGH |
| Accessibility (focus-visible, aria-label, cursor-pointer) | 230+ | 100+ | HIGH |
| Structural (inline buttons, arbitrary font sizes, border-radius) | 120+ | 20+ | MEDIUM |

---

## Category 1: Remaining Color Violations (43 instances)

### 1.1 `slate-*` → `surface-*` (8 instances)

| File | Lines | Current | Fix |
|------|-------|---------|-----|
| `app/workflows/page.tsx` | 44 | `bg-slate-100 dark:bg-slate-800/30` | `bg-surface-100 dark:bg-surface-800/30` |
| `components/charts/HeadcountTrendChart.tsx` | 32 | `stroke-slate-200 dark:stroke-slate-700` | `stroke-surface-200 dark:stroke-surface-700` |
| `components/charts/DepartmentDistributionChart.tsx` | 29 | `stroke-slate-200 dark:stroke-slate-700` | `stroke-surface-200 dark:stroke-surface-700` |
| `components/org-chart/OrgNode.tsx` | 29-31 | `bg-slate-50`, `bg-slate-50/60` | `bg-surface-50`, `bg-surface-50/60` |
| `components/org-chart/OrgChartFilters.tsx` | 63-64 | `bg-slate-200 dark:bg-slate-700` | `bg-surface-200 dark:bg-surface-700` |
| `app/company-spotlight/page.tsx` | 16,26,36,129 | `from-slate-600 to-slate-700` | `from-surface-600 to-surface-700` |

### 1.2 `gray-*` → `surface-*` (5 instances)

| File | Lines | Fix |
|------|-------|-----|
| `app/expenses/mileage/page.tsx` | 217,231,339,342,399 | All `gray-*` → `surface-*` |

### 1.3 Remaining `rose-*` (1 instance)

| File | Line | Fix |
|------|------|-----|
| `components/wall/PostComposer.tsx` | 39 | `text-rose-500` → `text-danger-500` |

### 1.4 Mantine variable refs (2 instances)

| File | Line | Current | Fix |
|------|------|---------|-----|
| `app/lwf/error.tsx` | 18 | `var(--mantine-color-danger-6)` | `var(--status-danger-text)` |
| `components/fluence/ActivityFeed.tsx` | 77 | `var(--mantine-color-dimmed)` | `var(--text-muted)` |

### 1.5 `global-error.tsx` inline hex (1 file)

| File | Lines | Fix |
|------|-------|-----|
| `app/global-error.tsx` | 44,109 | `#3b82f6` → `var(--accent-primary)`, `#f9fafb` → `var(--bg-main)` |

### 1.6 `PremiumSpinner.tsx` SVG gradient (1 file)

| File | Lines | Fix |
|------|-------|-----|
| `components/ui/PremiumSpinner.tsx` | 138-140 | `#1e3a8a`→`var(--accent-900)`, `#3b82f6`→`var(--accent-500)`, `#60a5fa`→`var(--accent-300)` |

---

## Category 2: Chart/Dashboard Raw Hex (62+ instances, 8 files)

### 2.1 Predictive Analytics (12 hex values)

**File**: `app/predictive-analytics/page.tsx`

| Current | Replacement |
|---------|------------|
| `CRITICAL: '#dc2626'` | `CRITICAL: 'var(--chart-danger)'` |
| `HIGH: '#f97316'` | `HIGH: 'var(--chart-warning)'` |
| `MEDIUM: '#f59e0b'` | `MEDIUM: 'var(--chart-warning)'` |
| `LOW: '#16a34a'` | `LOW: 'var(--chart-success)'` |
| `GOOD: '#16a34a'` | `GOOD: 'var(--chart-success)'` |
| `INFO: '#0284c7'` | `INFO: 'var(--chart-info)'` |
| Fallback `'#64748b'` | `'var(--chart-muted)'` |

### 2.2 Expense Analytics (13 hex values)

**File**: `components/expenses/ExpenseAnalytics.tsx`

Replace hardcoded category colors with chart CSS vars:
- `TRAVEL: '#3b82f6'` → `var(--chart-primary)`
- `ACCOMMODATION: '#8b5cf6'` → `var(--chart-secondary)`
- `MEALS: '#f59e0b'` → `var(--chart-warning)`
- `TRANSPORT: '#10b981'` → `var(--chart-success)`
- `OFFICE_SUPPLIES: '#6366f1'` → `var(--chart-info)`
- `EQUIPMENT: '#ec4899'` → `var(--chart-accent)`
- `MEDICAL: '#ef4444'` → `var(--chart-danger)`
- Others → cycle through chart palette

### 2.3 BirthdayWishingBoard decorative (15+ hex)

**File**: `components/dashboard/BirthdayWishingBoard.tsx`

Balloon SVG colors, confetti, flags — decorative animations. Replace with:
- Balloon: cycle `var(--accent-300)` through `var(--accent-600)`
- Confetti: use chart palette vars
- Flags: same as balloon

### 2.4 Employee Dashboard leave balance fallback (2 hex)

**File**: `app/dashboards/employee/page.tsx`
- `|| '#3b82f6'` → `|| 'var(--accent-primary)'`

### 2.5 Nine-Box Grid (2 hex)

**File**: `app/performance/cycles/[id]/nine-box/page.tsx`
- `'#6ee7b7'` → `var(--chart-success)` with opacity
- `'#34d399'` → `var(--chart-success)`

### 2.6 Team Attendance Chart (1 hex)

**File**: `app/attendance/team/TeamStatusChart.tsx`
- `fill="#3b82f6"` → `fill="var(--chart-primary)"`

### 2.7 SpaceFormDrawer preset colors (8 hex)

**File**: `components/fluence/SpaceFormDrawer.tsx`
- User-selectable preset colors — **EXEMPT** (intentional UX choice, like RichTextEditor)

---

## Category 3: Accessibility (230+ violations)

### 3.1 Missing focus-visible rings (119 motion.button elements)

**Top files**: wall/ReactionBar.tsx, wall/CommentThread.tsx, wall/WallCards.tsx, fluence/FluenceChatWidget.tsx

**Fix**: Add to all `motion.button`:
```
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2
```

### 3.2 Missing aria-labels on icon-only buttons (30+)

**Top files**: wall/WallCards.tsx, fluence/FluenceChatWidget.tsx, wall/CommentThread.tsx

**Fix**: Add `aria-label="Description"` to every icon-only button.

### 3.3 Missing cursor-pointer (~40% of onClick handlers)

**Top files**: wall/CommentThread.tsx, attendance/regularization/ViewTabs.tsx, wall/ReactionBar.tsx

**Fix**: Add `cursor-pointer` to all elements with onClick handlers.

---

## Category 4: Structural (120+ violations)

### 4.1 Inline button styling (10 instances)

**Files**: attendance/regularization modals, loans/[id], settings/*, settings/sso

**Fix**: Replace with `<Button variant="primary">` from `@/components/ui/Button`.

### 4.2 Arbitrary font sizes (99 instances of `text-[10px]`/`text-[11px]`)

**Files**: NotificationDropdown, Sidebar, Header, FluenceChatWidget, Breadcrumbs

**Fix**: These are typically for micro-text (badges, counts). Define `text-2xs` utility:
```css
.text-2xs { font-size: 0.625rem; /* 10px */ line-height: 0.875rem; }
```

### 4.3 Border-radius inconsistency (informational)

Distribution: 72% `rounded-lg`, 16% `rounded-xl`, 13% `rounded-md`. This is acceptable — follows size hierarchy naturally.

---

## Execution Order

| Phase | Scope | Files | Priority |
|-------|-------|-------|----------|
| 2A | Remaining colors (slate, gray, rose, mantine, hex) | 12 | P0 |
| 2B | Chart/dashboard hex → CSS vars | 7 | P0 |
| 2C | Accessibility (focus-visible, aria-label, cursor-pointer) | 15+ | P1 |
| 2D | Inline buttons → Button component | 5 | P2 |
| 2E | Arbitrary font sizes → standard scale | 7 | P3 |
