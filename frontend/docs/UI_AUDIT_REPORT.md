# NU-AURA UI Quality Audit Report

**Date:** March 15, 2026
**Auditor:** Staff Frontend Engineer
**Scope:** Full frontend codebase — 60+ pages, 28 core components, theme system
**Benchmark:** Linear, Notion, Vercel, Stripe dashboard quality

---

## Executive Summary

NU-AURA's frontend is **well-engineered** — production-grade architecture, React Query data layer, Zustand state management, Framer Motion animations, Radix color system, and CSS variable theming. This puts you ahead of 90% of enterprise SaaS apps.

However, **visual consistency has drifted** across 60+ pages built incrementally. The issues are not bugs — they're entropy. Spacing values vary page-to-page, card styles mix `rounded-lg` and `rounded-2xl`, button padding isn't uniform, and dark mode has hardcoded colors that break contrast.

**Bottom line:** The architecture is A-tier. The visual polish is B-tier. This audit closes that gap.

---

## Severity Ratings

| Level | Meaning |
|-------|---------|
| 🔴 Critical | Breaks visual consistency or accessibility across multiple pages |
| 🟡 Moderate | Affects individual pages or components, visible to users |
| 🟢 Minor | Polish items, low user impact |

---

## 1. SPACING SYSTEM — 🔴 Critical

### Problem
The `compact-theme.ts` defines spacing tokens that **don't follow a strict 8px grid**:
- `gap-3` (12px) — not on grid
- `p-3` (12px) — not on grid
- `p-5` (20px) — not on grid
- `cardGapSmall: 'gap-3'` — off grid

Pages use these inconsistently:
- `attendance/page.tsx` → `p-4 md:p-5 lg:p-6` (16→20→24)
- `leave/page.tsx` → `space-y-6` + `gap-4` mixed
- `admin/page.tsx` → `p-6` everywhere
- `performance/page.tsx` → `p-6` + `gap-4` + `gap-6` mixed

### Impact
Users perceive the UI as "unfinished" without knowing why. Inconsistent density creates cognitive load — some pages feel cramped, others feel sparse.

### Fix
Lock spacing to strict 8px multiples: `4, 8, 16, 24, 32, 48, 64px`
Map to Tailwind: `p-1(4), p-2(8), p-4(16), p-6(24), p-8(32), p-12(48), p-16(64)`

**Allowed page-level spacing:**
- Page padding: `p-4 md:p-6 lg:p-8` (16→24→32)
- Section gap: `space-y-6` (24px)
- Card gap: `gap-4` or `gap-6` (16 or 24px)
- Card padding: `p-4` or `p-6` (16 or 24px)

**Banned values:** `gap-3`, `p-3`, `p-5`, `gap-5`, `space-y-5`

---

## 2. TYPOGRAPHY HIERARCHY — 🟡 Moderate

### Problem
Typography scale exists in `compact-theme.ts` but isn't enforced:
- `text-[10px]` used in sidebar and attendance (hardcoded pixel)
- `text-2xl` page titles on some pages, `text-xl` on others
- Section titles vary: `text-lg`, `text-base font-bold`, `text-sm font-semibold`
- Metadata text varies: `text-xs`, `text-[10px]`, `text-[11px]`

### Impact
No consistent visual hierarchy across pages. Users can't scan-read efficiently.

### Fix — Enforced Scale

| Role | Class | Size |
|------|-------|------|
| Page Title | `text-2xl font-bold tracking-tight` | 24px |
| Section Title | `text-lg font-semibold` | 18px |
| Card Title | `text-base font-semibold` | 16px |
| Body | `text-sm` | 14px |
| Caption/Meta | `text-xs` | 12px |
| Micro Label | `text-[11px] font-medium uppercase tracking-wider` | 11px |

**Banned:** `text-[10px]` (too small for accessibility), arbitrary pixel values.

---

## 3. CARD STYLING — 🔴 Critical

### Problem
Cards across pages use 5+ different patterns:

| Page | Border Radius | Padding | Border | Shadow |
|------|--------------|---------|--------|--------|
| leave | `rounded-2xl` | `p-5` | `border-surface-200` | none |
| admin | `rounded-2xl` | `p-6` | `border-surface-200` | `shadow-soft` |
| recruitment | `rounded-lg` | `p-4` | `border-surface-200` | none |
| performance | `rounded-lg` | `p-6` | `border-surface-200` | none |
| dashboard | `rounded-xl` | `p-4` | varies | `shadow-card` |

### Impact
The app looks like 5 different products stitched together. Card inconsistency is the #1 visual quality killer.

### Fix — Single Card Standard

```
Standard Card: card-aura class (already defined in globals.css)
- rounded-xl (12px)
- border: var(--border-main)
- shadow: var(--shadow-card)
- padding: p-4 (compact) or p-6 (spacious)
- hover: var(--shadow-card-hover) + translateY(-1px)
```

All pages MUST use `card-aura` or the `<Card>` component. No inline card styles.

---

## 4. DARK MODE — 🔴 Critical

### Problem
Multiple dark mode issues found:

**Hardcoded light-only colors:**
- `attendance/page.tsx:499-534` — Recharts tooltips use hardcoded hex: `#F3F4F6`, `#9CA3AF`, `#10B981`
- `performance/page.tsx:262,318,325,332` — `bg-orange-50`, `bg-blue-50`, `bg-green-50` without `dark:` variants
- `Loading.tsx:16` — `border-blue-200 dark:border-blue-900` uses Tailwind colors instead of CSS vars

**Contrast issues:**
- `attendance/page.tsx:352` — `text-indigo-100` may fail WCAG AA in dark mode
- `PremiumMetricCard.tsx` — `text-slate-400` without dark variant
- Various `surface-200` borders used without dark equivalents

**Opacity abuse in dark mode:**
- `dark:border-surface-800/50` — opacity on borders makes them nearly invisible on dark backgrounds

### Fix
1. Replace all hardcoded hex in charts with CSS variables
2. Every Tailwind color class needs a `dark:` counterpart
3. No opacity modifiers on dark mode borders — use solid dark tokens
4. Create chart color tokens as CSS variables

---

## 5. TABLE STYLING — 🟡 Moderate

### Problem
Tables are styled inline on each page instead of using a shared class:
- `leave/page.tsx` — Header: `bg-surface-50 dark:bg-surface-800/50`
- `admin/page.tsx` — Header: `bg-surface-50 dark:bg-surface-800/50`
- `recruitment/page.tsx` — Different table markup entirely
- `ResponsiveTable.tsx` — Has skeleton loading but basic styling

### Issues:
- No sticky headers (scroll loses context)
- Header text treatment varies (`uppercase tracking-wider` vs `font-medium`)
- Cell padding varies (`px-3 py-2` vs `px-4 py-3`)
- Divider colors differ (`surface-100` vs `surface-200`)

### Fix
Enforce `table-aura` class from `globals.css` on all tables. Add:
- Sticky headers (`sticky top-0 z-10`)
- Consistent header: `text-xs font-medium uppercase tracking-wider text-muted`
- Row hover: `bg-[var(--bg-card-hover)]`
- Cell padding: `px-4 py-3`

---

## 6. BUTTON CONSISTENCY — 🟡 Moderate

### Problem
The `Button.tsx` component has 12 variants and 8 sizes — but pages bypass it with inline button styles:
- `leave/page.tsx:180-186` — `px-5 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl`
- `performance/page.tsx:279` — `px-4 py-2 bg-orange-600 text-white rounded-md`
- `admin/page.tsx:251` — `hover:bg-surface-50` custom button

### Fix
All buttons MUST use the `<Button>` component. No inline button styles.

---

## 7. ANIMATION INCONSISTENCY — 🟢 Minor

### Problem
Pages mix inline Framer Motion values with the `variants.ts` library:
- leave: `y: 12`, duration: 0.25s
- admin: `y: 20`, duration: 0.25s
- dashboard: `y: 20`, duration: 0.3s
- recruitment: Uses `variants` properly

### Fix
All page-level entrance animations should use `variants.ts` — no inline animation values.

---

## 8. LOADING STATES — 🟡 Moderate

### Problem
- `Loading.tsx` only provides a spinner — no skeleton loaders
- `ResponsiveTable.tsx` has basic skeleton (`animate-pulse`, `h-12`)
- No skeleton variants for: stat cards, charts, forms

### Fix
Create skeleton variants matching actual content layout.

---

## 9. EMPTY STATES — 🟡 Moderate

### Problem
- `EmptyState.tsx` has inconsistent spacing (`py-12`, `mb-4`, `mb-6`)
- Some pages use `EmptyState`, others use inline empty divs
- Empty states lack visual engagement

### Fix
Standardize `EmptyState` spacing, require `<EmptyState>` component everywhere.

---

## 10. FOCUS & KEYBOARD ACCESSIBILITY — 🔴 Critical

### Problem
- Buttons have hover but missing `focus-visible:ring` states
- Cards with `onClick` missing focus states
- Some `<div onClick>` instead of `<button>`

### Fix
All interactive elements: `focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)]`

---

## 11. ICON SIZING — 🟢 Minor

### Problem
Icon containers vary: `h-8 w-8`, `h-10 w-10`, `h-12 w-12` without clear pattern.

### Fix — Standard per context:
- Page header icon: `h-8 w-8`
- Stat card icon: `h-10 w-10`
- Card inline icon: `h-5 w-5`
- Button icon: `h-4 w-4`

---

## 12. COMPACT-THEME DRIFT — 🟡 Moderate

### Problem
`compact-theme.ts` gradients use aliased color names:
```typescript
primary: 'from-indigo-500 to-purple-600'  // Actually Sky→Jade (aliased!)
```

### Fix
Use actual semantic names: `from-primary-500 to-info-600`

---

## Priority Matrix

| # | Issue | Severity | User Impact | Effort |
|---|-------|----------|-------------|--------|
| 1 | Spacing system | 🔴 | High | Medium |
| 3 | Card styling | 🔴 | High | Medium |
| 4 | Dark mode | 🔴 | High | High |
| 10 | Focus/keyboard | 🔴 | High | Low |
| 2 | Typography | 🟡 | Medium | Low |
| 5 | Tables | 🟡 | Medium | Medium |
| 6 | Buttons | 🟡 | Medium | Low |
| 8 | Loading states | 🟡 | Medium | Medium |
| 9 | Empty states | 🟡 | Medium | Low |
| 12 | Theme drift | 🟡 | Medium | Low |
| 7 | Animations | 🟢 | Low | Low |
| 11 | Icon sizes | 🟢 | Low | Low |

---

## Implementation Order

### Wave 1 — Foundation (everything inherits from this)
1. Fix `compact-theme.ts` spacing to strict 8px grid
2. Add design token utilities to `globals.css`
3. Standardize card classes
4. Fix focus states globally

### Wave 2 — Components
5. Refactor table styling
6. Improve loading skeletons
7. Standardize empty states
8. Fix button usage on pages

### Wave 3 — Pages (apply standards)
9. Polish dashboard page (set the reference)
10. Polish employees page
11. Fix dark mode on chart components
12. Normalize animation usage

### Wave 4 — Polish
13. Typography audit per-page
14. Icon sizing normalization
15. Compact-theme gradient fix
16. Full dark mode verification
