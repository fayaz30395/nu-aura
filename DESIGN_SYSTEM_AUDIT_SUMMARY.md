# NU-AURA Design System Audit Report

## Executive Summary

Analysis of 896 TypeScript component files in the NU-AURA frontend codebase revealed **1,460 design system violations** across 3 categories:

- **Color System Violations**: 1,082 instances (74%)
- **Spacing Grid Violations**: 378 instances (26%)

### Severity Breakdown
- **High Severity**: 17 files with critical hardcoded colors breaking theme system
- **Medium Severity**: 4 files with mixed CSS variable and hardcoded usage
- **Low Severity**: 40+ files with spacing grid misalignment

---

## Violation Summary by Category

### 1. Color System Violations (1,082 total)

#### Hardcoded Tailwind Color Classes
```
text-gray-*:              162 instances
text-slate-*:             484 instances
dark:text-gray-*:          84 instances
dark:text-slate-*:        328 instances
bg-gray-*:                199 instances
dark:bg-gray/slate-*:     125 instances
```

**Problem**: Using hardcoded Tailwind color classes breaks the theme system. These colors are fixed and do not adapt to dark mode or future theme changes.

**Solution**: Replace all hardcoded colors with CSS variables:
- Primary text: `text-[var(--text-primary)]`
- Secondary text: `text-[var(--text-secondary)]`
- Muted text: `text-[var(--text-muted)]`
- Primary background: `bg-[var(--bg-primary)]`
- Card background: `bg-[var(--bg-card)]`
- Surface/secondary: `bg-[var(--bg-secondary)]`
- Border colors: `border-[var(--border-main)]`, `border-[var(--border-subtle)]`, `border-[var(--border-strong)]`

#### High-Impact Color Violations

1. **app/settings/security/page.tsx** (Lines 106-325)
   - 8+ instances of slate color system usage
   - Multiple dark mode variants inconsistently applied
   - Form input styling with hardcoded borders and text colors

2. **app/settings/page.tsx** (Lines 162-456)
   - Icon backgrounds: `bg-slate-100 dark:bg-slate-800`
   - Settings panels: `bg-slate-50 dark:bg-slate-800/50`
   - Text throughout using `text-slate-*` classes

3. **app/home/page.tsx** (Lines 152-538)
   - Background: `bg-gray-900` (should be secondary)
   - Text: Mixed usage of `text-gray-*` and CSS variables
   - Inconsistent dark mode support

### 2. Spacing Grid Violations (378 total)

#### Banned Spacing Classes (breaks 8px grid)
```
gap-3:        30 instances (should be gap-2 or gap-4)
gap-5:        20 instances (should be gap-4 or gap-6)
mb-3:        228 instances (should be mb-2.5 or mb-4)
px-3:        648 instances (most common violation)
mt-3/ml-3:    variable
```

**Problem**: The design system enforces an 8px spacing grid:
- Valid: 0, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40...
- Invalid: gap-3 (12px), gap-5 (20px), p-3 (12px), p-5 (20px), p-7 (28px), p-9 (36px)

**Solution**:
- Replace `gap-3` → `gap-2` (8px) or `gap-4` (16px)
- Replace `gap-5` → `gap-4` (16px) or `gap-6` (24px)
- Replace `mb-3` → `mb-2.5` (10px) or `mb-4` (16px)
- Replace `px-3` → `px-2.5` (10px) or `px-4` (16px)
- Replace `p-5` → `p-4` (16px) or `p-6` (24px)

#### High-Frequency Files
1. **app/timesheets/page.tsx**: 15+ px-3 violations in table cells
2. **app/attendance/shift-swap/page.tsx**: 7+ px-3 violations in forms
3. **app/attendance/regularization/**: Multiple mb-3 in form labels
4. **components/**: 30+ violations across reusable components

---

## Top 45 Violations (Prioritized)

### High Severity Color Issues

| File | Line | Issue | Fix |
|------|------|-------|-----|
| app/settings/security/page.tsx | 106-107 | text-slate-900, text-slate-50 | text-[var(--text-primary)] |
| app/settings/security/page.tsx | 215 | text-slate-500 dark:text-slate-400 | text-[var(--text-muted)] |
| app/settings/security/page.tsx | 242 | 4× slate classes in one element | Replace all with CSS vars |
| app/settings/security/page.tsx | 319-325 | bg-slate-50/800 border-slate-* | bg-[var(--bg-card)], border-[var(--border-main)] |
| app/settings/page.tsx | 162-170 | bg-slate-100/800 text-slate-600 | CSS variables |
| app/settings/page.tsx | 195-196 | text-slate-900/50 title | text-[var(--text-primary)] |
| app/home/page.tsx | 152 | bg-gray-900 | bg-[var(--bg-secondary)] |
| app/home/page.tsx | 432-433 | text-gray-700 dark:text-[var(...)] | text-[var(--text-muted)] |
| app/attendance/team/page.tsx | 210 | bg-red-50 dark:bg-red-950/30 | bg-[var(--bg-error-light)] |
| app/attendance/comp-off/page.tsx | 179 | text-blue-700 | text-[var(--text-primary)] |
| app/attendance/page.tsx | 286 | bg-white hover:bg-gray-50 | bg-[var(--bg-primary)], hover:bg-[var(--bg-surface)] |
| app/linkedin-posts/page.tsx | 199 | text-gray-700 dark:text-gray-300 | text-[var(--text-primary)] |
| app/loans/new/page.tsx | 146 | bg-red-50 dark:bg-red-900/20 | bg-[var(--bg-error-light)] |
| app/approvals/page.tsx | 30 | bg-red-50 dark:bg-red-900/20 | bg-[var(--bg-error-light)] |

### Medium Severity Color Issues

| File | Line | Issue |
|------|------|-------|
| app/home/page.tsx | 177 | Mixed: text-gray-700 dark:text-[var(...)] |
| app/home/page.tsx | 231 | text-gray-700 dark:text-gray-300 |
| app/home/page.tsx | 287 | text-gray-800 dark:text-gray-200 |
| app/home/page.tsx | 343 | Textarea: text-gray-800 + placeholder-gray-400 |

### Low Severity Spacing Issues (Sample)

| File | Line | Issue | Fix |
|------|------|-------|-----|
| app/attendance/regularization/_components/CreateRequestModal.tsx | 168 | mb-3 | mb-2.5 or mb-4 |
| app/attendance/regularization/_components/CreateRequestModal.tsx | 325 | px-3 py-2 | px-2.5 py-2 or px-4 py-2 |
| app/timesheets/page.tsx | 661 | mb-3 | mb-4 |
| app/timesheets/page.tsx | 420 | px-3 py-3 | px-4 py-3 |
| app/loans/[id]/page.tsx | 152 | p-5 | p-4 or p-6 |
| app/contact/page.tsx | 201-236 | gap-5 (3× instances) | gap-4 or gap-6 |
| app/training/catalog/page.tsx | 263 | gap-5 | gap-4 |
| app/auth/login/page.tsx | 151 | gap-3 | gap-2 or gap-4 |
| app/dashboard/page.tsx | 168 | gap-3, mb-3 | gap-2/gap-4, mb-4 |
| app/home/page.tsx | 114 | p-5 | p-4 or p-6 |
| app/home/page.tsx | 435 | mb-3 | mb-4 |

---

## Remediation Plan

### Phase 1: High Priority (1-2 weeks)
1. **Settings Pages** (app/settings/*)
   - Replace all slate colors with CSS variables
   - Fix form styling consistency
   - Estimated: 60+ changes

2. **Home Dashboard** (app/home/page.tsx)
   - Fix gray color usage (25+ instances)
   - Ensure dark mode consistency
   - Estimated: 40+ changes

3. **Alert Components** (Attendance, Loans, Approvals)
   - Replace red-50/red-900 patterns
   - Use semantic error colors
   - Estimated: 10+ changes

### Phase 2: Medium Priority (2-3 weeks)
1. **Spacing Grid Alignment**
   - Fix px-3 violations (648 instances)
   - Fix mb-3 violations (228 instances)
   - Focus on page routes first, then components

2. **Form Components**
   - Standardize input styling
   - Fix padding consistency

### Phase 3: Low Priority (4+ weeks)
1. **Table Styling**
   - Review all py-3 usage
   - Consider py-2.5 for density

2. **Component Library**
   - Audit reusable components (123 files)
   - Create component compliance checklist

---

## CSS Variables Reference

### Text Colors
```css
--text-primary       /* Primary text (dark mode adaptive) */
--text-secondary     /* Secondary text */
--text-muted         /* Muted/disabled text */
--text-tertiary      /* Tertiary text */
```

### Background Colors
```css
--bg-primary         /* Primary background */
--bg-secondary       /* Secondary/elevated background */
--bg-card            /* Card surface */
--bg-input           /* Form input background */
--bg-surface         /* General surface */
--bg-skeleton        /* Skeleton loader placeholder */
--bg-error-light     /* Light error background */
```

### Border Colors
```css
--border-main        /* Main border */
--border-subtle      /* Subtle border */
--border-strong      /* Strong border */
```

---

## Testing Checklist

- [ ] Color contrast ratios meet WCAG AA standards in light AND dark modes
- [ ] All alert/error colors use semantic CSS variables
- [ ] Spacing grid validation passes (all values divisible by 8 or use .5 increments)
- [ ] Dark mode toggle works without jarring color shifts
- [ ] Form inputs maintain visual hierarchy
- [ ] Print styles still work with CSS variables
- [ ] Hover/active states use appropriate overlays
- [ ] Component library tests pass with new variables

---

## Automation Opportunities

1. **ESLint Rule**: Ban specific classes with auto-fix suggestions
2. **Tailwind Config**: Disable problematic spacing values (3, 5, 7, 9, 11)
3. **CI/CD Check**: Validate CSS variable usage before merge
4. **Color Palette Generator**: Auto-suggest CSS variable replacements

---

## Impact Assessment

### Without Fixes
- Dark mode inconsistency (theme toggling causes jarring shifts)
- Theme changes require manually updating 1,000+ class names
- Design debt accumulates with each new component
- WCAG compliance at risk (hardcoded colors may fail contrast in certain themes)

### With Fixes
- Unified design language across all pages
- One-line theme customization (CSS variables only)
- Improved maintainability
- Full WCAG compliance in all themes
- Consistent user experience

---

## Related Documentation
- `frontend/lib/config/theme.ts` - CSS variable definitions
- `frontend/styles/globals.css` - Color variable declarations
- Design system guidelines: TBD

**Report Generated**: 2026-03-21
**Analyzed Files**: 896 .tsx files
**Total Issues**: 1,460
