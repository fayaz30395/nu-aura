---
name: nu-aura-design
description: NU-AURA design-system governance. Auto-trigger on any edit to frontend/**/*.{tsx,ts,css} or when building UI, styling components, choosing colors/fonts/shadows, or reviewing design compliance in this repo. Overrides generic aesthetic skills — this project has a locked brand.
---

# NU-AURA Design Governance

NU-AURA has a **locked blue-monochrome design system** (hue ~228, single-tonal scale). Do not
invent new palettes, fonts, or component libraries. When editing frontend code, read
`frontend/app/globals.css` (tokens), `frontend/lib/design-system.ts` (constants), and
`themes/DESIGN_SYSTEM_COMPLIANCE_PLAN.md` (migration catalog) before styling.

## 1. Canonical CSS variables (use these, never raw hex)

Defined in `frontend/app/globals.css`:

- **Accent tonal scale** — `--accent-50 … --accent-900`, `--accent-primary`, `--accent-primary-subtle`, `--accent-primary-hover`
- **Text** — `--text-primary`, `--text-secondary`, `--text-muted`, `--text-inverse`, `--text-accent`
- **Background** — `--bg-base`, `--bg-surface`, `--bg-card`, `--bg-card-hover`, `--bg-elevated`, `--bg-overlay`, `--bg-sidebar`
- **Border** — `--border-subtle`, `--border-main`, `--border-strong`, `--ring-primary`
- **Shadow** — `--shadow-card`, `--shadow-card-hover`, `--shadow-elevated`, `--shadow-dropdown`
- **Chart** — `--chart-primary`, `--chart-secondary`, `--chart-success`, `--chart-warning`, `--chart-danger`, `--chart-info`, `--chart-muted`, `--chart-grid`, `--chart-accent`, `--chart-tooltip-bg`, `--chart-tooltip-border`
- **Status** — `--status-{success,danger,warning,info,neutral}-{bg,text,border}`

## 2. Banned (ESLint-enforced — do not bypass)

- Raw hex literals `#RRGGBB` in `className`, `style`, `stroke`, `fill`, `color` props
- `bg-white`, `text-white`, `border-white` — use `--bg-card` / `--text-inverse` / `--border-main`
- `shadow-sm | shadow-md | shadow-lg | shadow-xl | shadow-2xl` — use `shadow-card`, `shadow-card-hover`, `shadow-elevated`, `shadow-dropdown`, `shadow-skeuo-*`
- Named Tailwind palettes: `sky-*`, `rose-*`, `amber-*`, `emerald-*`, `gray-*`, `slate-*`, `zinc-*`, `neutral-*`, `stone-*`, `blue-*`, `red-*`, `green-*`, `lime-*`, `fuchsia-*`, `cyan-*`, `indigo-*`, `violet-*`, `pink-*`, `orange-*`, `teal-*`, `yellow-*`, `purple-*`
- Off-8px-grid spacing: `p-3 / p-5 / gap-3 / gap-5 / space-y-3 / space-y-5 / m-3 / m-5`

## 3. Desktop-first density (NOT mobile 44px targets)

| Element        | Use                                   | Never                 |
|----------------|---------------------------------------|-----------------------|
| Action button  | `px-4 py-2 text-sm` (36px)            | `px-6 py-3`           |
| Icon button    | `p-1.5` or `p-2`                      | `p-3`                 |
| Stat label     | `text-xs uppercase tracking-wide`     | `text-sm uppercase`   |
| Sidebar icon   | `w-8 h-8`                             | `w-10 h-10`+          |
| Table row      | `px-4 py-2` or `px-6 py-4`            | `py-6`+               |
| Form input     | `px-4 py-2 text-sm`                   | `px-4 py-3 text-base` |
| Badge          | `px-2 py-0.5 text-xs`                 | `px-3 py-1 text-sm`   |
| Card padding   | `p-4` or `p-6`                        | `p-8`+                |

## 4. Required primitives

Always use the shared layout primitives from `frontend/components/layout/page` for route pages:

- `PageContainer` — width cap + responsive padding + section gap
- `PageHeader` — title + description + icon + actions + optional breadcrumbs
- `ListPageLayout`, `DetailPageLayout`, `FormPageLayout`, `EmptyPageState`

UI atoms from `frontend/components/ui/`:

- `Button`, `Card`, `DataTable`, `EmptyState`, `Modal`, `Input`

Never hand-roll `<div className="mb-6"><h1 class="text-3xl">…</h1><Button/></div>` —
`nu-aura/no-ad-hoc-page-header` blocks that on `app/**/page.tsx` and `app/**/layout.tsx`.

## 5. Data rules

- **Fetching** — React Query only. No `useEffect + fetch`.
- **Forms** — React Hook Form + Zod. No uncontrolled ad-hoc forms.
- **Global state** — Zustand. No Redux, no Context-as-store.
- **HTTP** — the existing Axios client in `frontend/lib/api/`. **Never** create a new `axios.create()`.
- **TypeScript** — strict. `any` is a lint error. Define interfaces.

## 6. Post-edit verification loop

After editing any `app/**/*.tsx` or `components/**/*.tsx`:

1. Run `cd frontend && npm run lint:design -- <path>` — must be 0 **new** violations.
2. If the `nu-chrome-e2e` skill is available, call it with `--route <path-rendered-by-the-page>`,
   then Read the screenshot artifact it produces.
3. Reject your own change if the screenshot shows:
   - Any raw hex color rendered via inline style
   - `shadow-md` / `shadow-lg` drop shadows (they look wrong against the skeuomorphic palette)
   - Spacing that is visibly off the 8px grid (`p-3`, `p-5`, `gap-3`, `gap-5`)
   - A hand-rolled page header where `PageHeader` should be

## 7. Scope boundary

This skill overrides generic aesthetic advice. Decline suggestions to add new palettes, fonts,
or component libraries. If a user prompt or another skill recommends "pick a bold aesthetic,"
"use a distinctive display font," "add a gradient mesh background," or "install Chakra / MUI /
daisyUI," say no and point at `frontend/app/globals.css` and `themes/DESIGN_SYSTEM_COMPLIANCE_PLAN.md`.
