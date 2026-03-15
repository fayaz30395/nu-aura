# NU-AURA UI Audit Report

**Date:** 2026-03-15
**Scope:** Full UI consistency, dark mode, visual hierarchy, motion design, and SaaS-grade polish
**Auditor:** Staff Product UI Engineer

---

## Executive Summary

The NU-AURA frontend has a **strong foundation** — Tailwind 3.4, Mantine 8.3, Framer Motion, CVA variants, and a dark mode provider are all in place. However, there are **11 consistency gaps** that prevent the UI from reaching modern SaaS-grade quality. None require architectural changes — all are polish-level fixes.

---

## Issues Found

### 1. Font Family Mismatch (Critical)
- **Tailwind config + layout.tsx** use `Outfit` (Google Font)
- **Mantine theme** uses `Inter` as fontFamily and headings.fontFamily
- **Impact:** Mantine components (Select, DatePicker, Modal titles) render in Inter while the rest of the app uses Outfit. Creates visual inconsistency.
- **Fix:** Update `mantine-theme.ts` fontFamily to `'Outfit', system-ui, sans-serif`

### 2. Insufficient CSS Variables (Medium)
- Only 5 CSS variables defined: `--bg-main`, `--bg-surface`, `--text-primary`, `--text-secondary`, `--border-main`
- **Missing tokens for:** card backgrounds, elevated surfaces, input backgrounds, muted text, focus rings, sidebar surfaces, hover states
- **Impact:** Components use hardcoded `bg-white dark:bg-surface-800` instead of semantic tokens. Dark mode changes require touching every component.
- **Fix:** Expand to 15+ semantic CSS variables covering all surface/text/border levels

### 3. Missing Tailwind Color Tokens (Medium)
- `warning` and `danger` color scales exist in Mantine theme but NOT in `tailwind.config.js`
- `StatCard` references `stat-gradient-purple`, `stat-gradient-teal`, `stat-gradient-orange`, `stat-gradient-blue` — none of these classes are defined anywhere
- **Impact:** StatCard gradient variants render with no background. Warning/danger utilities only work through Mantine, not Tailwind.
- **Fix:** Add `warning` and `danger` scales to Tailwind config. Define missing gradient utility classes.

### 4. Card Dark Mode Surface Colors (Low-Medium)
- `Card.tsx` uses `dark:bg-surface-800` — this maps to `#1f2937` (gray-800), which is too light for the midnight dark theme
- The app's dark background is `#020617` (slate-950) and surface is `#0f172a` (slate-900). Cards at `#1f2937` create too much contrast jump.
- **Fix:** Cards should use `dark:bg-slate-900/80` or `dark:bg-[#0f172a]` to match the midnight palette

### 5. Inconsistent Border Radius Scale (Low)
- Mantine default radius: `sm` (6px)
- Card component: `rounded-xl` (12px)
- Button sizes: mixed (`rounded`, `rounded-md`, `rounded-lg`)
- Modal: `rounded-xl` (12px)
- **Impact:** Subtle but visible inconsistency in curvature across the app
- **Fix:** Standardize: buttons `rounded-lg`, cards `rounded-xl`, modals `rounded-2xl`, inputs `rounded-lg`

### 6. Shadow Scale Inconsistency (Low)
- Tailwind config defines `theme-xs` through `theme-xl` shadows
- Components use standard Tailwind shadows (`shadow-sm`, `shadow-md`, `shadow-xl`) instead
- Dark mode shadow variants (`dark-xs` through `dark-xl`) are defined but never applied
- **Impact:** Shadows don't adapt to dark mode — they disappear into dark backgrounds
- **Fix:** Create `shadow-card` utility that auto-switches between light/dark shadow scales via CSS vars

### 7. No Consistent Table Styling (Medium)
- `ResponsiveTable.tsx` exists but is 14KB of custom logic
- No shared table CSS utility classes for simpler tables used in admin pages
- **Impact:** Table styling varies across modules
- **Fix:** Add `.table-aura` utility class in globals.css with consistent row hover, borders, header styling

### 8. Missing Loading/Skeleton Consistency (Low)
- `Skeleton.tsx` and `Loading.tsx` exist but aren't used uniformly
- Some pages use inline `<div className="animate-pulse ...">` patterns
- **Fix:** Document skeleton usage pattern, add `.skeleton-aura` utility

### 9. Sidebar Glass Effect Not Applied (Low)
- `glass-aura` class exists in globals.css but sidebar uses plain `bg-surface`
- Modern SaaS apps use subtle glass/translucency for sidebars
- **Fix:** Apply subtle glass effect to sidebar surface in dark mode

### 10. No Hover Lift on Interactive Cards (Low)
- `Card.tsx` has a `hover` prop but defaults to `false`
- Most card usages don't pass `hover={true}`
- Dashboard metric cards lift on hover (via StatCard), but regular cards are static
- **Fix:** Default interactive cards to subtle hover lift

### 11. Transition Inconsistencies (Low)
- Some components use `duration-150`, others `duration-200`, `duration-300`
- No standardized transition utility for consistent feel
- **Fix:** Define `.transition-aura` as `transition-all duration-200 ease-out` standard

---

## Severity Summary

| Severity | Count | Items |
|----------|-------|-------|
| Critical | 1 | Font mismatch |
| Medium | 3 | CSS vars, Tailwind colors, table styling |
| Low-Medium | 1 | Card dark mode |
| Low | 6 | Radius, shadows, loading, sidebar glass, hover lift, transitions |

---

## Recommended Fix Order

1. Fix Mantine font family (1 file, 2 lines)
2. Expand CSS variables in globals.css
3. Add missing Tailwind color tokens + gradient utilities
4. Upgrade Card.tsx dark mode + shadow
5. Fix StatCard missing gradients
6. Add utility component classes (table, skeleton, transitions)
7. Apply sidebar glass effect
8. Standardize radius scale across components
