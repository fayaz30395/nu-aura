# Aura Batch 3 Transformation Guide

**Target Folders:** calendar, careers, company-spotlight, compensation, compliance, contact
**Files per folder:** page.tsx, layout.tsx, loading.tsx, error.tsx (+ nested routes)
**Total files:** ~25 files across 6 folders

## Transformation Checklist

All changes are **visual/design only** — business logic, data fetching, hooks, and component props remain unchanged.

### Core Token Replacements

| Old Pattern | Aura Token | Notes |
|---|---|---|
| `bg-[var(--bg-primary)]` → `bg-[var(--bg-app)]` | Color system alignment |
| `bg-[var(--bg-surface)]` / `bg-[var(--bg-card)]` | `bg-[var(--surface)]` | Token consolidation |
| `rounded-xl` / `rounded-12` | `rounded-[var(--r-lg)]` | Radius system (12px) |
| `rounded-lg` / `rounded-10` | `rounded-[var(--r-control)]` | Button/input radius (10px) |
| `text-[var(--text-primary)]` | `text-[var(--text-1)]` | Typography tokens |
| `text-[var(--text-secondary)]` | `text-[var(--text-2)]` | Body copy |
| `text-[var(--text-muted)]` / `text-[var(--text-tertiary)]` | `text-[var(--text-3)]` | Muted/caption |
| Hardcoded hex colors (any `#` value) | Aura CSS vars | Replace with token equivalents |
| Old status colors: `danger-*`, `warning-*`, `success-*` | `--err-*`, `--warn-*`, `--ok-*` | Semantic status tokens |
| `border-surface-*`, `border-neutral-*` | `border-[var(--border)]` | Border consolidation |
| Shadow classes | `shadow-[var(--sh-sm)]`, `--sh-md`, `--sh-lg` | Aura shadow system |

### Component Additions

**Every page** should include:
```tsx
import {PageTransition, Reveal, Stagger, StaggerItem} from '@/components/motion';
```

Wrap main content:
- **page.tsx**: `<PageTransition>` root + `<Reveal>` on section titles + `<Stagger>` on lists
- **loading.tsx**: `<PageTransition>` root with skeleton grids
- **error.tsx**: `<Reveal>` on error message, `<PageTransition>` root
- **layout.tsx**: No motion needed (shell layer)

### Typography Utilities

All numerics (money, IDs, dates, counts, stats) must use:
- `.num` OR `.tabular-nums` class
- OR `font-mono` with `font-variant-numeric: tabular-nums`
- Example: `<p className="text-[var(--text-1)] font-mono tabular-nums">$148,000</p>`

Use semantic tokens for headings:
- Page title (h1): `.text-aura-title` (28/700/-0.02em)
- Section heads (h2): `text-xl font-bold` (20px)
- Labels/column heads: `.text-aura-micro` (10.5/700 uppercase)

### Focus/Accessibility

Every interactive element needs:
```tsx
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2
```

**Icon-only buttons** must have `aria-label`:
```tsx
<button aria-label="Previous" className="...">
  <ChevronLeft />
</button>
```

### Empty/Loading/Error States

All three must be intentional:
- **Empty state**: Icon (40-48px) + heading + description + CTA button
- **Loading state**: PageTransition + skeleton matching content shape
- **Error state**: Alert icon + error message + retry button

### Motion System Preservation

- Use only `transform` and `opacity` for animations
- `.hover-lift` on cards (built-in pattern)
- `.press-scale` on buttons
- Never rest an element at `opacity: 0`
- Reduced motion safe via media queries in motion components

---

## Files to Update (by folder)

### calendar/ (9 files)
- [ ] page.tsx — Main calendar view
- [ ] loading.tsx ✓ DONE
- [ ] error.tsx
- [ ] [id]/page.tsx — Event detail
- [ ] [id]/loading.tsx
- [ ] [id]/error.tsx
- [ ] new/page.tsx — Create event
- [ ] new/loading.tsx
- [ ] new/error.tsx

### careers/ (4 files)
- [ ] page.tsx — Job listings
- [ ] layout.tsx
- [ ] loading.tsx
- [ ] error.tsx

### company-spotlight/ (3 files)
- [ ] page.tsx
- [ ] loading.tsx
- [ ] error.tsx

### compensation/ (3 files)
- [ ] page.tsx
- [ ] loading.tsx
- [ ] error.tsx

### compliance/ (3 files)
- [ ] page.tsx
- [ ] loading.tsx
- [ ] error.tsx

### contact/ (3 files)
- [ ] page.tsx
- [ ] loading.tsx
- [ ] error.tsx

---

## Transformation Pattern by File Type

### page.tsx
1. Add `import {PageTransition, Reveal, Stagger, StaggerItem} from '@/components/motion'`
2. Replace all hardcoded hex colors with Aura tokens
3. Wrap root div with `<PageTransition>`
4. Wrap section titles with `<Reveal>`
5. Wrap card/list grids with `<Stagger>` → `<StaggerItem>` for each item
6. Add `.tabular-nums` to all numerics
7. Replace `rounded-xl` → `rounded-[var(--r-lg)]`
8. Replace `rounded-lg` / `rounded-10` → `rounded-[var(--r-control)]`
9. Add `focus-visible:ring-[var(--ring)]` to all buttons/interactive
10. Verify all text color tokens map to `--text-1/2/3`

### loading.tsx
1. Add `import {PageTransition} from '@/components/motion'`
2. Wrap with `<PageTransition>`
3. Replace `bg-[var(--bg-card)]` → `bg-[var(--surface)]`
4. Replace all `border-surface-*`, `border-neutral-*` → `border-[var(--border)]`
5. Ensure skeleton heights match final content

### error.tsx
1. Add `import {PageTransition, Reveal} from '@/components/motion'`
2. Wrap with `<PageTransition>`
3. Wrap error content with `<Reveal>`
4. Replace alert colors with semantic status tokens
5. Ensure icon has `focus-visible:ring`

### layout.tsx
1. Only if not already using AppLayout (most are)
2. Preserve existing structure — no motion needed at layout level

---

## Quick Checklist for Each File

Before committing, verify:
- [ ] PageTransition imported and wraps root content
- [ ] No hardcoded hex colors remain
- [ ] All numerics use `.tabular-nums` or equivalent
- [ ] All buttons have focus rings
- [ ] Icon-only buttons have aria-labels
- [ ] Border and surface tokens use Aura vars
- [ ] Radius tokens use `--r-lg` (12px) or `--r-control` (10px)
- [ ] Status badges use `--ok-*`, `--warn-*`, `--err-*`
- [ ] JSX balanced (no missing closing tags)
- [ ] Imports are correct (no dupes)
- [ ] Behavior/hooks/data-fetching unchanged

---

## Example Transformations

### Before (Mixed old tokens + hardcoded hex)
```tsx
<div className="bg-[var(--bg-surface)] rounded-xl border border-neutral-200 dark:border-neutral-800 p-6">
  <h2 className="text-[var(--text-primary)] text-xl font-bold">${148000}</h2>
</div>
```

### After (Aura tokens)
```tsx
<div className="bg-[var(--surface)] rounded-[var(--r-lg)] border border-[var(--border)] p-6">
  <h2 className="text-[var(--text-1)] text-aura-title">${148000}</h2>
</div>
```

### Before (No motion, mixed styling)
```tsx
export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <h1>Calendar</h1>
      <div className="grid grid-cols-3 gap-4">
        {events.map(e => <Card key={e.id}>{e.title}</Card>)}
      </div>
    </div>
  );
}
```

### After (Aura motion + tokens)
```tsx
import {PageTransition, Reveal, Stagger, StaggerItem} from '@/components/motion';

export default function CalendarPage() {
  return (
    <PageTransition>
      <div className="space-y-6">
        <Reveal>
          <h1 className="text-aura-title">Calendar</h1>
        </Reveal>
        <Stagger>
          <div className="grid grid-cols-3 gap-4">
            {events.map(e => (
              <StaggerItem key={e.id}>
                <Card className="hover-lift">{e.title}</Card>
              </StaggerItem>
            ))}
          </div>
        </Stagger>
      </div>
    </PageTransition>
  );
}
```

---

## Running the Transformation

**Using sed/bash** (for bulk replacements):
```bash
# Replace old bg tokens with Aura surface
find ./frontend/app/{calendar,careers,company-spotlight,compensation,compliance,contact} -name "*.tsx" \
  -exec sed -i 's/bg-\[var(--bg-surface)\]/bg-[var(--surface)]/g' {} \;

# Replace rounded-xl with Aura r-lg
find ./frontend/app/{calendar,careers,company-spotlight,compensation,compliance,contact} -name "*.tsx" \
  -exec sed -i 's/rounded-xl/rounded-[var(--r-lg)]/g' {} \;

# Replace borders
find ./frontend/app/{calendar,careers,company-spotlight,compensation,compliance,contact} -name "*.tsx" \
  -exec sed -i 's/border-\(surface\|neutral\)-[0-9]*/border-[var(--border)]/g' {} \;
```

**Manual approach** (recommended for quality):
1. Open each file from the checklist above
2. Follow the pattern-specific steps
3. Test locally before committing

---

## Quality Gates

All pages must pass:
- JSX balanced (no unmatched tags)
- All imports resolved
- No console.log or debug statements
- Focus rings visible (test with keyboard nav)
- Light + dark mode parity verified
- Reduced motion respected
- Numerics using tabular-nums (test with money values)

