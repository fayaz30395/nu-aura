# NU-AURA UI Primitives — Mantine + Tailwind Rule (T3-13)

**One source of truth, two delivery layers.** CSS variables in `app/globals.css`
are canonical. `tailwind.config.js` and `styles/mantine-theme.ts` both map to
those variables. Components must not invent a third styling layer.

## The Rule

| Concern | Use | Why |
|---|---|---|
| Form inputs (text/number/password/date/select/multiselect/autocomplete) | **Mantine** | Built-in a11y, labels, error/help wiring, popover positioning. |
| Modals, drawers, menus, popovers, tooltips, notifications, tabs | **Mantine** | Focus traps, portals, ARIA. Reinventing is a footgun. |
| Page layout, grids, spacing, typography, simple containers | **Tailwind** | Utility classes win for layout; no JS runtime. |
| Buttons, badges, cards (the local primitives) | **`components/ui/` wrappers** | They wrap Tailwind + CSS vars; keep using them. |
| Color / spacing / radius values | **CSS vars from `globals.css`** | Both Mantine and Tailwind read from these. Never hard-code hex. |

## Patterns

```tsx
// ✅ Mantine for form inputs — a11y semantics belong here
import { TextInput, Select } from '@mantine/core';
<TextInput label="Email" error={errors.email} />
<Select label="Role" data={ROLES} />

// ✅ Tailwind for layout
<div className="grid grid-cols-2 gap-4 p-6">
  <Card>...</Card>
</div>

// ✅ Local primitive for buttons/cards (wraps Tailwind + tokens)
import { Button } from '@/components/ui/Button';
<Button variant="primary">Save</Button>

// ✅ Reference tokens via CSS vars, not hex
<div className="text-[var(--text-primary)] bg-[var(--bg-card)]" />
```

## Anti-patterns (the drift checker flags these)

```tsx
// ❌ Raw <input> outside components/ui/ — use Mantine TextInput
<input type="text" className="border ..." />

// ❌ Inline style — bypasses tokens
<div style={{ color: '#1c2033', padding: 12 }} />

// ❌ Hex literal in Tailwind arbitrary — use a CSS var
<span className="text-[#1c2033]" />

// ❌ Inventing a third layer (raw CSS module + Tailwind + Mantine)
import styles from './Thing.module.css';
```

## Visibility

```bash
npm run lint:design-system        # report drift (never fails CI today)
node scripts/check-styling-drift.mjs --json    # machine-readable
```

Baseline and trend live in
`docs/architecture/improvement-backlog.md` under T3-13. Migration of existing
drift is a separate housekeeping task — this rule applies to **new** code.

## When in doubt

- It has a form semantic (label/error/required)? → Mantine.
- It traps focus or escapes the DOM tree (modal/dropdown)? → Mantine.
- It's flex/grid/spacing/typography? → Tailwind.
- It's a button/card/badge? → `components/ui/`.
- You need a custom color or radius? → Add a CSS var in `globals.css`, then
  consume from both `tailwind.config.js` and `mantine-theme.ts`.
