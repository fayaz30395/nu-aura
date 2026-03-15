---
name: nu-aura-frontend
description: |
  Design system, UI patterns, and coding conventions for the NU-AURA HRMS platform frontend.
  Use this skill whenever working on ANY frontend file in the NU-AURA project — pages, components,
  hooks, styles, or config. This includes: creating new pages or components, editing existing UI,
  fixing styling issues, adding features to any module, working with forms/tables/charts/modals,
  or reviewing frontend code. Trigger on any mention of NU-AURA, nu-aura, HRMS frontend,
  Mantine UI, or any of the 60+ app modules (employees, attendance, leave, payroll, recruitment,
  performance, etc.). Even if the user just says "fix this page" or "add a button", use this skill
  to ensure consistency with the established design system.
---

# NU-AURA Frontend Design System & Conventions

This skill encodes the locked-in design decisions, color palette, component patterns, and coding rules for the NU-AURA platform frontend. Every UI change must follow these conventions to maintain visual consistency across 60+ pages and 28 core components.

## Tech Stack (Locked — Do Not Suggest Alternatives)

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict mode) |
| Components | Mantine UI |
| Styling | Tailwind CSS + CSS custom properties |
| Data fetching | React Query (TanStack Query v5) |
| Client state | Zustand (auth, UI only) |
| HTTP | Axios — use existing instance in `frontend/lib/`, never create new |
| Forms | React Hook Form + Zod — always, no exceptions |
| Animation | Framer Motion |
| Charts | Recharts |
| PDF | jsPDF |

## Brand Palette: Indigo Primary

The brand color is **Radix Indigo** (`#3e63dd` at scale 9). All color references go through CSS custom properties or Tailwind's semantic classes — never hardcode hex values in components.

### Tailwind Color Mapping (from `tailwind.config.js`)

```
primary   → Radix Indigo    (brand color)
secondary → Radix Slate     (neutrals)
accent    → Radix Orange    (warm emphasis)
success   → Radix Grass     (green)
info      → Radix Blue      (blue)
warning   → Radix Amber     (yellow)
danger    → Radix Tomato    (red)
surface   → Radix Slate     (backgrounds)
```

Legacy aliases (`teal`, `purple`, `violet`, `cyan`) all map to the primary or info scales. Use `primary-*` for brand elements, not legacy names.

### CSS Custom Properties

All theme-aware colors live in `globals.css` as CSS variables. Use these via Tailwind arbitrary values:

**Text:** `text-[var(--text-primary)]`, `text-[var(--text-secondary)]`, `text-[var(--text-muted)]`
**Backgrounds:** `bg-[var(--bg-card)]`, `bg-[var(--bg-secondary)]`, `bg-[var(--bg-page)]`
**Borders:** `border-[var(--border-main)]`, `border-[var(--border-subtle)]`

Never use raw `text-surface-900 dark:text-surface-50` patterns. Always use the CSS variable equivalents above. This ensures correct behavior in both light and dark mode from a single class.

### Dark Mode

Dark mode is handled entirely by CSS variables — the `.dark` class on `<html>` swaps all `--bg-*`, `--text-*`, `--border-*` values. Components that use CSS variables automatically adapt. Never add `dark:` variants for colors that already have CSS variable equivalents.

### Sidebar: Dark Themed

The sidebar uses a dark background in light mode (`--bg-sidebar: #1e1b4b`) and blends with the dark bg in dark mode (`#0c0c0e`). Sidebar-specific CSS variables:

```
--sidebar-text           (light: white/70%, dark: #a1a1aa)
--sidebar-text-active    (light: white, dark: #f4f4f5)
--sidebar-text-muted     (light: white/40%, dark: #71717a)
--sidebar-border         (light: white/10%, dark: #27272a)
--sidebar-section-text   (light: white/45%, dark: #71717a)
--sidebar-active-bg      (light: white/15%, dark: indigo/15%)
--sidebar-active-border  (#818cf8 both modes)
```

The logo in the sidebar always uses `brightness-0 invert` to appear white.

## Spacing: Strict 8px Grid

Every spacing value must land on the 8px grid: **4, 8, 16, 24, 32, 48, 64px**.

**Banned classes:** `gap-3`, `p-3`, `p-5`, `gap-5`, `space-y-3`, `space-y-5`, `m-3`, `m-5`

| Intent | Class |
|--------|-------|
| Page padding | `p-4 md:p-6 lg:p-8` |
| Section gap | `space-y-6` |
| Card grid gap | `gap-4 md:gap-6` |
| Card padding | `p-4` or `p-6` |
| Form field gap | `space-y-4` |
| Inline element gap | `gap-2` or `gap-4` |

## Typography Hierarchy

Import from `frontend/lib/design-system.ts` or use the CSS utility classes:

| Token | Size | Weight | CSS Class |
|-------|------|--------|-----------|
| Page title | 24px | Bold | `text-page-title` |
| Section title | 18px | Semibold | `text-section-title` |
| Card title | 16px | Semibold | `text-card-title` |
| Body | 14px | Normal | `text-body` |
| Body secondary | 14px | Normal | `text-body-secondary` |
| Caption | 12px | Normal | `text-caption` |
| Micro label | 12px | Medium uppercase | `text-micro` |
| Stat large | 24px | Bold tabular | `text-stat-large` |
| Stat medium | 20px | Bold tabular | `text-stat-medium` |

**Banned sizes:** `text-[10px]`, `text-[11px]` — use `text-xs` (12px) minimum for accessibility.

## Component Patterns

### Cards

```tsx
// Standard card
<div className="card-aura p-4">...</div>

// Interactive card (hover lift)
<div className="card-interactive p-4">...</div>

// Elevated card (stronger shadow)
<div className="card-elevated p-6">...</div>
```

### Tables

```tsx
<div className="table-aura">
  <table>
    <thead>
      <tr>
        <th>Name</th>  {/* Styling handled by table-aura */}
      </tr>
    </thead>
    <tbody>
      <tr className="hover:bg-[var(--bg-card-hover)] transition-colors">
        <td>...</td>
      </tr>
    </tbody>
  </table>
</div>
```

The `table-aura` class provides: rounded corners, border, sticky header support, alternating row styles, and responsive overflow.

### Status Badges

Use the semantic status classes — they auto-adapt to dark mode:

```tsx
<span className="badge-status status-success">Active</span>
<span className="badge-status status-danger">Terminated</span>
<span className="badge-status status-warning">Pending</span>
<span className="badge-status status-info">In Progress</span>
<span className="badge-status status-neutral">Inactive</span>
<span className="badge-status status-purple">Admin</span>
<span className="badge-status status-orange">Overdue</span>
```

Or import from the design system: `import { status } from '@/lib/design-system'`

### Tinted Backgrounds

For colored card backgrounds (like stat cards or alert areas):

```tsx
<div className="tint-success p-4 rounded-lg">...</div>
<div className="tint-info p-4 rounded-lg">...</div>
<div className="tint-danger p-4 rounded-lg">...</div>
```

### Form Inputs

All forms must use React Hook Form + Zod. For styling:

```tsx
<input className="input-aura" />
<label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
  Label
</label>
```

The `input-aura` class provides: consistent height, padding, border, background, focus ring, and dark mode support.

### Loading States

```tsx
import { NuAuraLoader, SkeletonTable, SkeletonStatCard, SkeletonCard } from '@/components/ui/Loading';

// Full page loading (auth guard, initial load)
<NuAuraLoader message="Loading dashboard..." />

// Table loading
<SkeletonTable rows={8} columns={5} />

// Stat card loading
<SkeletonStatCard />

// Generic card loading
<SkeletonCard lines={4} />
```

Never use a plain spinner or "Loading..." text.

### Empty States

```tsx
import { EmptyState } from '@/components/ui/EmptyState';

<EmptyState
  icon={<Users className="h-8 w-8" />}
  title="No employees found"
  description="Add your first employee to get started."
  action={{ label: "Add Employee", onClick: handleAdd }}
/>
```

### Buttons

Always use the `<Button>` component from `@/components/ui/Button`:

```tsx
import { Button } from '@/components/ui/Button';

<Button variant="primary">Save</Button>
<Button variant="outline">Cancel</Button>
<Button variant="danger">Delete</Button>
<Button variant="ghost">More</Button>
<Button size="xs">Small</Button>
```

Never create inline-styled buttons with raw `<button>` elements.

## Animation Presets

Import from `frontend/lib/design-system.ts`:

```tsx
import { motion as ds } from '@/lib/design-system';

// Page entrance (use on the main content wrapper)
<motion.div {...ds.pageEnter}>

// Staggered list
<motion.div {...ds.staggerContainer}>
  {items.map(item => (
    <motion.div key={item.id} {...ds.staggerItem}>
```

Standard values: `y: 8` for entrance (not 12 or 20), `duration: 0.25`, `ease: 'easeOut'`.

## Chart Colors

For Recharts and d3 charts, use CSS variable references:

```tsx
import { chartColors } from '@/lib/design-system';

<Bar dataKey="value" fill={chartColors.primary} />
<Line stroke={chartColors.info} />
```

For runtime hex values (e.g., Recharts tooltips), use the utility:

```tsx
import { chartColors } from '@/lib/utils/theme-colors';

const color = chartColors.primary(); // returns resolved hex
const palette = chartColors.palette(); // returns array of 7 hex colors
```

## File Structure

```
frontend/
├── app/                    # Next.js App Router pages
│   ├── <module>/page.tsx   # Each module's main page
│   ├── globals.css         # CSS variables, component classes
│   └── layout.tsx          # Root layout
├── components/
│   ├── ui/                 # Shared UI components (Button, Card, Modal, etc.)
│   ├── layout/             # Header, AppLayout, Footer
│   ├── platform/           # AppSwitcher, platform-level components
│   └── dashboard/          # Dashboard-specific widgets
├── lib/
│   ├── design-system.ts    # Design tokens (import from here)
│   ├── config/apps.ts      # App definitions, route→app mapping
│   ├── hooks/              # React Query hooks, custom hooks
│   ├── services/           # API service functions
│   ├── theme/              # Mantine theme config
│   ├── types/              # TypeScript interfaces
│   ├── utils/              # Utility functions
│   └── validations/        # Zod schemas
└── styles/
    └── compact-theme.ts    # Spacing/density overrides
```

## Non-Negotiable Rules

1. **Read before writing.** Always read the existing file before making changes. Never rewrite what works.
2. **No new Axios instances.** Use the existing one in `frontend/lib/`.
3. **No `any` in TypeScript.** Define proper interfaces.
4. **All forms: React Hook Form + Zod.** No uncontrolled inputs.
5. **All data fetching: React Query.** No raw `useEffect` + `fetch`.
6. **SuperAdmin bypasses all RBAC.** Never block them from any UI.
7. **Run `npx tsc --noEmit` after every change** and fix all errors.
8. **Use CSS variables for colors**, not hardcoded `surface-*` or `text-gray-*` patterns.
9. **Use semantic `primary-*` classes**, not legacy aliases (`teal-*`, `jade-*`).
10. **Use design-system.ts imports** for spacing, typography, and chart colors.

## Platform Architecture

NU-AURA is a bundle platform with 4 sub-apps accessed via a waffle grid app switcher:

- **NU-HRMS** — Core HR (employees, attendance, leave, payroll, benefits, assets)
- **NU-Hire** — Recruitment & onboarding (job postings, candidates, pipeline)
- **NU-Grow** — Performance & learning (reviews, OKRs, 360 feedback, LMS, surveys)
- **NU-Fluence** — Knowledge management (Phase 2, not yet built)

Single login shared across all sub-apps. Sidebar is app-aware (shows only sections for the active sub-app based on route pathname). Route mapping is in `frontend/lib/config/apps.ts`.

## Quick Reference: What to Import

```tsx
// Design tokens
import { layout, typography, card, table, chartColors, motion, status, tint, input, iconSize } from '@/lib/design-system';

// UI components
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { NuAuraLoader, SkeletonTable, SkeletonStatCard } from '@/components/ui/Loading';
import { StatCard } from '@/components/ui/StatCard';

// Chart colors (runtime hex values)
import { chartColors } from '@/lib/utils/theme-colors';
```
