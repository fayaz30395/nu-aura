# NU-AURA Design System

## Current State

**Color palette:** Slate/Sky (migrated from Purple in March 2026)
**Typography:** IBM Plex Sans / Serif / Mono
**Component library:** Mantine UI + custom components in `frontend/components/ui/`
**Spacing grid:** 8px

## Color Tokens

| Element           | Token           | Value   |
|-------------------|-----------------|---------|
| Primary CTA       | `sky-700`       | #0369A1 |
| Primary hover     | `sky-800`       | #075985 |
| Background (dark) | `slate-900`     | #0F172A |
| Sidebar           | `--bg-sidebar`  | #1e1b4b |
| Accents           | `sky-*` palette | Various |
| Focus ring        | `sky-700`       | #0369A1 |

### Quick Replace Patterns

```tsx
// Buttons
bg-primary-600 hover:bg-primary-700 → bg-sky-700 hover:bg-sky-800

// Badges
bg-primary-100 text-primary-700 → bg-sky-100 text-sky-700

// Focus rings
focus:ring-primary-500 → focus:ring-sky-700

// Gradients
from-primary-500 to-primary-600 → from-sky-700 to-sky-800

// Text colors
text-primary-600 dark:text-primary-400 → text-sky-700 dark:text-sky-400
```

## Typography

| Variant       | Font          | Weight | Size |
|---------------|---------------|--------|------|
| Page title    | IBM Plex Sans | 700    | 24px |
| Section title | IBM Plex Sans | 600    | 18px |
| Card title    | IBM Plex Sans | 600    | 16px |
| Body          | IBM Plex Sans | 400    | 14px |
| Code/mono     | IBM Plex Mono | 400    | 13px |

Font variables: `--font-sans`, `--font-serif`, `--font-mono` (loaded in `frontend/app/layout.tsx`)

## Component Conventions

- **Buttons:** `<Button>` component with 11 variants — no raw `<button>`
- **Cards:** `card-aura` with interactive variant
- **Tables:** `table-aura` with built-in pagination, sort, search
- **Badges:** `badge-status` with Sky palette
- **Inputs:** `input-aura` with label + error integration
- **Loading:** `NuAuraLoader`, `SkeletonTable`, `SkeletonStatCard`, `SkeletonCard`
- **Empty states:** `<EmptyState>` with icon + title + description + action
- **Dark mode:** Toggle `.dark` on `<html>`, all elements adapt via CSS vars

## Spacing

8px grid. Banned Tailwind classes: `gap-3`, `p-3`, `p-5`, `gap-5`, `space-y-3`, `space-y-5`, `m-3`,
`m-5`

## Design Token File

`frontend/styles/design-tokens.css` — spacing scale, typography scale, z-index scale (10, 20, 30,
50), touch targets (44px minimum)
