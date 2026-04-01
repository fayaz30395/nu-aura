# Loop 11: UI/UX Audit -- Global Navigation, Dark Mode, Responsive, Accessibility

**Date:** 2026-04-01
**Scope:** Frontend code-level audit of Sidebar, AppSwitcher, dark mode, a11y, responsive design, design system compliance
**Method:** Static analysis via grep/read across `frontend/components/` and `frontend/app/`

---

## 1. Sidebar Navigation Audit

**File:** `frontend/components/ui/Sidebar.tsx`

### 1.1 Active State Highlighting -- PASS

The sidebar uses CSS custom properties (`--sidebar-active-bg`, `--sidebar-active-border`, `--sidebar-text-active`) for active state styling instead of hardcoded colors. No `primary-*` or `purple-*` classes found in the sidebar. The design system token approach means the theme CSS file controls colors centrally.

Active state also has a subtle blue glow: `0 0 12px rgba(58, 95, 217, 0.08)` which is blue-toned (not purple). **Compliant.**

### 1.2 Collapse/Expand Functionality -- PASS

- Toggle button with clear aria-label (`"Expand sidebar"` / `"Collapse sidebar"`)
- Width transitions between `SIDEBAR_WIDTH_EXPANDED (256px)` and `SIDEBAR_WIDTH_COLLAPSED (72px)`
- Collapsed state shows tooltips on hover for all items
- Flyover panel for items with children when collapsed
- Keyboard shortcut hint shown (Cmd+B)
- Section collapse state persisted to localStorage with namespaced keys

### 1.3 MY SPACE Items -- requiredPermission Check -- PASS (CRITICAL)

**File:** `frontend/components/layout/menuSections.tsx` (lines 199-213)

The MY SPACE section is explicitly documented and correctly implemented:
```
// Note: MY SPACE items have NO requiredPermission because they are self-service
```

All 6 MY SPACE items have **NO** `requiredPermission`:
- My Dashboard (`/me/dashboard`)
- My Profile (`/me/profile`)
- My Payslips (`/me/payslips`)
- My Attendance (`/me/attendance`)
- My Leaves (`/me/leaves`)
- My Documents (`/me/documents`)

**No violations found.** All other sections correctly use `requiredPermission`.

### 1.4 Route Completeness -- PASS

All sidebar items have `href` properties pointing to valid route paths. Routes are organized by app via `APP_SIDEBAR_SECTIONS` in `apps.ts`.

---

## 2. AppSwitcher Audit

**File:** `frontend/components/platform/AppSwitcher.tsx`

### 2.1 All 4 Sub-Apps Listed -- PASS

`APP_LIST` is sourced from `frontend/lib/config/apps.ts` which defines all 4 apps:

| App | Code | Entry Route | Available |
|-----|------|-------------|-----------|
| NU-HRMS | HRMS | `/me/dashboard` | true |
| NU-Hire | HIRE | `/recruitment` | true |
| NU-Grow | GROW | `/performance` | true |
| NU-Fluence | FLUENCE | `/fluence/wiki` | true |

All 4 apps are set `available: true`.

### 2.2 Lock Icon for Unauthorized Apps -- PASS

Lines 198-203: Lock overlay renders when `isLocked` (not available OR no access):
```tsx
{isLocked && (
  <div className="absolute inset-0 rounded-lg bg-black/40 flex items-center justify-center">
    <Lock className="w-4 h-4 text-white" />
  </div>
)}
```

Shows "Coming soon" for unavailable apps and "No access" for permission-gated apps.

### 2.3 Active App Indicator -- PASS

Active app shows a check badge (lines 205-210) and uses `bg-accent-subtle` with ring styling.

### 2.4 Navigation -- PASS

Uses `router.push()` with a 3-second hard-nav fallback for dev-mode compilation delays.

### 2.5 Accessibility -- PASS

- Trigger button has `aria-label="Switch application"`
- `aria-expanded` reflects open state
- Escape key closes dropdown
- Click outside closes dropdown

---

## 3. Dark Mode Audit

### 3.1 Hardcoded Hex Colors -- MINOR ISSUES

**Severity: Minor**

Most hex colors are confined to appropriate locations:

| Location | Issue | Severity |
|----------|-------|----------|
| `frontend/lib/utils/theme-colors.ts` | Hex fallbacks for CSS variable getter -- **acceptable** (fallback pattern) | Info |
| `frontend/styles/aura-dark-theme.css` | CSS variable definitions -- **correct location** | Info |
| `frontend/app/training/my-learning/page.tsx:56-58` | Hardcoded `#22c55e`, `#f59e0b`, `#3b82f6` for progress bar colors | Minor |
| `frontend/app/settings/page.tsx:270-273` | Google logo SVG fill colors -- **acceptable** (brand colors) | Info |
| `frontend/lib/data/mock-fluence.ts:42-70` | Hardcoded category colors in mock data | Minor |
| `frontend/app/expenses/reports/ExpenseCharts.tsx:21-22` | Recharts color palette with hardcoded hex | Minor |
| `frontend/components/dashboard/WelcomeBanner.tsx:85` | Inline gradient `#F59E0B, #D97706` for notification badge | Minor |

**Recommendation:** Chart colors and progress bars should use CSS variables from `theme-colors.ts` for dark mode adaptability.

### 3.2 Missing `dark:` Variants on bg-white / text-black -- PASS

- **`bg-white` without `dark:`:** 0 matches found in `frontend/app/` (previously an issue, now resolved)
- **`text-black` without `dark:`:** 0 matches found

### 3.3 Inline `style={{}}` with Hardcoded Colors -- LOW RISK

~80 inline style usages found. Most use CSS custom variables (`var(--bg-elevated)`, `var(--sidebar-border)`, etc.) which is the correct pattern. A few use `rgba()` for subtle effects (shadows, overlays) which adapt naturally.

**Notable exceptions:**
- `frontend/app/admin/shifts/page.tsx:285`: `borderTop: 4px solid ${shift.colorCode || '#3B82F6'}` -- dynamic data with fallback
- `frontend/components/dashboard/BirthdayWishingBoard.tsx:67`: Confetti particle colors -- acceptable decorative use

---

## 4. Accessibility Audit

### 4.1 Images Without `alt` -- PASS

All `<Image>` and `<img>` elements found include `alt` attributes. Next.js `Image` component enforces this at build time.

### 4.2 Icon-Only Buttons Without `aria-label` -- PASS (Sidebar)

Sidebar collapse button has `aria-label`. Flyover close button has `aria-label="Close"`. AppSwitcher trigger has `aria-label="Switch application"`.

### 4.3 Clickable `<div>` Elements -- LOW RISK

12 instances of `<div onClick=...>` found. All are overlay/backdrop dismissal patterns (click-outside-to-close), not interactive controls:
- `Header.tsx:188` -- mobile search overlay backdrop
- `NotificationDropdown.tsx:574,669,711` -- modal backdrops
- `FeedCard.tsx:140,624` -- dropdown dismiss layers
- `admin/roles/page.tsx:517` -- dropdown dismiss
- `workflows/page.tsx:403` -- menu dismiss
- `restricted-holidays/page.tsx:909` -- modal backdrop

**Verdict:** These are intentional overlay dismiss patterns, not user-facing buttons. No `role="button"` needed.

### 4.4 Inputs Without Labels -- PASS

No raw `<input>` elements without `aria-label` or `id` association found. Forms use React Hook Form + Zod with proper label binding.

### 4.5 Keyboard Navigation -- PASS (Sidebar)

- Section toggles use `<button>` with `aria-expanded`
- Flyover items with children have `aria-expanded` and `aria-haspopup`
- Escape key closes flyovers
- Tab order follows natural DOM order

---

## 5. Responsive Design Audit

### 5.1 Fixed Widths -- LOW RISK

| Pattern | Count | Assessment |
|---------|-------|------------|
| `max-w-[1400px]` | 2 | Container max-width with `mx-auto` -- **acceptable** |
| `max-w-[1600px]` | 10+ | Container max-width -- **acceptable** |
| `min-w-[800px]` | 2 | `CalibrationMatrix`, `shifts/page` -- scrollable data tables, **acceptable** |
| `min-w-[1200px]` | 2 | Gantt/Calendar views -- scrollable, **acceptable** |
| `w-[700px]` | 2 | Login page decorative blur circles -- **acceptable** (decorative, clipped) |

All large fixed widths are either:
- `max-w-*` containers (constrain max, not min)
- `min-w-*` on scrollable data tables/grids (standard pattern)
- Decorative elements

**No breakage-inducing fixed widths found.**

### 5.2 Responsive Breakpoints -- PASS

Layout components use responsive patterns:
- `hidden sm:block`, `hidden sm:flex` in AppSwitcher and Header
- `p-4 md:p-6 lg:p-8` progressive padding throughout page shells
- `flex-col sm:flex-row` responsive flex directions in DataTable pagination

### 5.3 Touch Targets -- PASS

Button component enforces minimum sizes. Sidebar items use `py-2.5` (40px+) with `px-4`. AppSwitcher grid items are `p-4` with `w-12 h-12` icons (48px). The only small interactive elements are icon buttons in `<Button>` wrappers which enforce 44px minimums.

---

## 6. Design System Compliance

### 6.1 Old Purple/Primary Colors -- FINDINGS

**`primary-*` classes:** 0 matches -- **FULLY MIGRATED**

**`purple-*` classes:** 7 occurrences in 2 files:

| File | Lines | Usage |
|------|-------|-------|
| `components/dashboard/BirthdayWishingBoard.tsx` | 188, 203, 216, 219, 227 | Birthday card theming (purple gradient, borders, text) |
| `app/expenses/mileage/page.tsx` | 245-246 | Mileage icon container (`bg-purple-100`, `text-purple-600`) |

**Severity: Minor** -- These are isolated thematic uses (birthday = purple is common), not systemic. However, per design system migration rules, they should use `sky-*` or semantic CSS variables.

### 6.2 Banned Spacing Values (gap-3, p-3, p-5) -- FINDINGS

**Total: 36 occurrences across 10 files**

| File | Count | Notes |
|------|-------|-------|
| `app/integrations/slack/page.tsx` | 9 | `gap-3`, `p-3` throughout |
| `components/expenses/ReceiptScanner.tsx` | 8 | `gap-3`, `p-3` in scanner UI |
| `app/expenses/mileage/page.tsx` | 6 | `gap-3`, `p-3`, `p-5` |
| `components/ui/DataTable.tsx` | 3 | `gap-3`, `px-3` in filter bar |
| `components/dashboard/HolidayCarousel.tsx` | 3 | `p-5` on carousel cards |
| `components/ui/ExportMenu.tsx` | 3 | `gap-3` in menu items |
| `app/admin/reports/page.tsx` | 1 | `p-5` on empty state |
| `app/admin/payroll/page.tsx` | 1 | `p-5` on empty state |
| `app/reset-password/page.tsx` | 1 | `p-3` on password rules |
| `components/ui/NotificationDropdown.tsx` | 1 | `gap-3` in notification items |

**Severity: Minor** -- These should use 8px grid values (`gap-2`/`gap-4`, `p-2`/`p-4`).

---

## Summary

| Category | Status | Critical | Major | Minor | Info |
|----------|--------|----------|-------|-------|------|
| Sidebar Navigation | PASS | 0 | 0 | 0 | 0 |
| MY SPACE Permissions | PASS | 0 | 0 | 0 | 0 |
| AppSwitcher | PASS | 0 | 0 | 0 | 0 |
| Dark Mode | PASS (minor) | 0 | 0 | 5 | 3 |
| Accessibility | PASS | 0 | 0 | 0 | 0 |
| Responsive Design | PASS | 0 | 0 | 0 | 0 |
| Design System (purple) | MINOR | 0 | 0 | 2 files | 0 |
| Design System (spacing) | MINOR | 0 | 0 | 10 files | 0 |

**Totals: 0 Critical, 0 Major, ~17 Minor, 3 Info**

### Top Recommendations

1. **Replace purple-* classes** in `BirthdayWishingBoard.tsx` and `expenses/mileage/page.tsx` with `sky-*` equivalents per design system migration
2. **Migrate chart hardcoded hex colors** in `ExpenseCharts.tsx` and `training/my-learning/page.tsx` to use `theme-colors.ts` CSS variable getters for dark mode
3. **Fix 8px grid violations** -- replace `gap-3`/`p-3`/`p-5` with `gap-2`/`gap-4`/`p-2`/`p-4` across the 10 affected files
4. All critical architecture patterns (MY SPACE ungated, AppSwitcher lock icons, dark mode CSS variable system, sidebar collapse/a11y) are correctly implemented
