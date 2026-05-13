# Design

Snapshot of the as-built **Studio Slate v2** visual system. Tokens live in `frontend/app/globals.css`. Tailwind bridge in `frontend/tailwind.config.js`. Component utilities are emitted as `@layer components` and `@layer utilities`.

## Theme

Studio Slate v2 — flat modern surfaces, vivid functional accent, warm dark sidebar. No skeuomorphic depth, no gradient text, no glassmorphism by default. Color is a signal, not decoration.

**Mode strategy:** light mode is canonical for desk work (HR admins, payroll, long sessions in tables). Dark mode is provided for low-light reading and personal preference, with full token coverage. Sidebar is always warm dark (`#0E111A`) — even in light mode, to anchor navigation and let the working surface read as the foreground.

## Color

OKLCH-equivalent tinted neutrals plus one saturated accent. Strategy is **Restrained** in the impeccable sense: tinted neutrals carry 90%+ of the surface, the accent is reserved for primary action, focus, active state, and key signal.

### Anchor

- **Accent / Primary** — `#2563EB` (Tailwind blue-600). Used for primary buttons, focus rings, active sidebar item, link text, chart-primary, key data emphasis.
- **Dark-mode accent** — `#5B8CF5` (lighter for visibility on warm-dark surfaces).

### Surfaces (light)

| Token | Value | Role |
|---|---|---|
| `--bg-main` | `#F5F7FA` | App background |
| `--bg-surface` | `#ffffff` | Default surface |
| `--bg-card` | `#ffffff` | Card body |
| `--bg-card-hover` | `#f0f2f7` | Hover state |
| `--bg-elevated` | `#ffffff` | Dropdowns, popovers |
| `--bg-sidebar` | `#0E111A` | Sidebar (warm dark, both modes) |
| `--bg-overlay` | `rgba(14, 17, 26, 0.40)` | Modal scrim |

### Surfaces (dark)

| Token | Value | Role |
|---|---|---|
| `--bg-main` | `#0B0D13` | App background |
| `--bg-surface` | `#12151E` | Default surface |
| `--bg-card` | `#12151E` | Card body |
| `--bg-card-hover` | `#181C27` | Hover state |
| `--bg-elevated` | `#181C27` | Dropdowns, popovers |

### Text hierarchy

| Token | Light | Dark |
|---|---|---|
| `--text-heading` | `#0e1225` | `#f0f2f7` |
| `--text-primary` | `#1c2033` | `#e8eaf0` |
| `--text-secondary` | `#4e5270` | `#8b90aa` |
| `--text-muted` | `#8186a0` | `#5a5f78` |
| `--text-inverse` | `#ffffff` | `#0e1225` |

Tinted toward the cool blue/violet axis. Never pure gray, never pure black.

### Borders

| Token | Light | Dark |
|---|---|---|
| `--border-subtle` | `#eceef5` | `#161c30` |
| `--border-main` | `#dfe2ed` | `#1e2440` |
| `--border-strong` | `#b8bccf` | `#2a3255` |
| `--border-focus` | `#2563EB` | `#5B8CF5` |

### Semantic

Success `#16a34a` / Danger `#dc2626` / Warning `#d97706` / Info `#2563EB` (same as accent). Every semantic surface has a paired `*-bg`, `*-text`, `*-border` token for both modes — see `--status-*` block.

### NULogic brand colors (preserved for logo / brand contexts only)

Lapis `#050766`, Red-orange `#E62A32`, Purple `#8939A1`, Dark teal `#133E49`. **Do not introduce these into product UI** — they exist for the corporate logo and brand-adjacent marketing surfaces. The product is single-hue (blue).

## Typography

Three-family system, served via `next/font` with CSS variables.

| Family | CSS var | Use |
|---|---|---|
| **Montserrat** | `var(--font-display)` | Headings, page titles, stat numbers |
| **Open Sans** | `var(--font-sans)` | Body, labels, table cells, all running text |
| **Roboto Mono** | `var(--font-mono)` | Tabular figures, large stat values, code |

### Scale

Tailwind defaults plus two micro sizes for dense desktop UI:

| Class | Size | Line | Use |
|---|---|---|---|
| `text-3xl` | 30px | 36px | `.text-page-title`, `.text-stat-large` |
| `text-2xl` | 24px | 32px | `h1`, `h2`, `.text-stat-medium` |
| `text-xl` | 20px | 28px | `h3`, `.text-section-title` |
| `text-lg` | 18px | 28px | `h4` |
| `text-base` | 16px | 24px | `h5`, `.text-card-title` |
| `text-sm` | 14px | 20px | Body, `.text-body`, `.btn-primary` |
| `text-xs` | 12px | 16px | `.text-caption`, table headers, labels |
| `text-3xs` | 11px | 16px | Compact labels |
| `text-2xs` | 10px | 14px | Badge text, micro-labels |

Headings: `font-semibold tracking-tight`, `letter-spacing: -0.01em`, `line-height: 1.2`.
Body: `line-height: 1.6` on `body`, antialiased, `text-rendering: optimizeLegibility`.

### Composed classes

`.text-page-title`, `.text-section-title`, `.text-card-title`, `.text-body`, `.text-body-secondary`, `.text-caption`, `.text-micro`, `.text-stat-large`, `.text-stat-medium`. Use these instead of raw scale to keep family + weight + color coupled.

## Spacing

Tailwind default spacing scale. Desktop-first compact rhythm:

- Card padding: `p-4` (16px) standard, `p-3` (12px) compact.
- Button height: `h-9` (36px) primary / secondary / ghost — the platform default.
- Input height: `h-9` (36px), `px-3.5`, `rounded-xl`.
- Table row: 44px (`height: 44px` in `.table-aura`), `px-4 py-2` cell padding.
- Icon button: `w-8 h-8` (32px) when sitting next to `h-9` controls.

Never invent gaps outside the scale. If a 13px feels right, the system is wrong — fix the system.

## Elevation

Flat by default. Three-tier shadow scale only:

| Token | Use |
|---|---|
| `--shadow-card` | Card resting |
| `--shadow-card-hover` | Card hover |
| `--shadow-elevated` | Elevated surfaces (popovers, drawers) |
| `--shadow-dropdown` | Dropdowns, menus (deepest) |

Skeuomorphic tokens (`--shadow-skeuo-*`, `--gradient-skeuo-*`) are intentionally flattened to no-ops or to the standard tokens for backward compatibility. **Do not reintroduce embossed / debossed / heavy-inner-shadow surfaces.**

## Components

All from `globals.css @layer components`. Use these — do not reimplement.

### Cards

- `.card-aura` — default card; `rounded-xl`, subtle border, card shadow.
- `.card-elevated` — slight bump for popovers / floating panels.
- `.card-interactive` — clickable card; `translateY(-1px)` on hover.
- `.glass-aura` — backdrop-blur surface; **use rarely**, only when content sits over imagery or strong color.
- `.panel-inset` — flat inset panel for nested groups; use instead of nested cards.

**Never nest cards.** If you find yourself wrapping a `.card-aura` inside another `.card-aura`, restructure.

### Buttons

- `.btn-primary` — `bg-accent-primary`, white text, soft blue shadow, `h-9`, `rounded-xl`. Lift `-0.5px` on hover, press to `+1px`.
- `.btn-secondary` — bordered, neutral; same height and radius.
- `.btn-ghost` — transparent, hover fills with card-hover; same height.
- `.btn-skeuo` / `.skeuo-button` — backward-compat, flattened to btn-secondary behavior.

### Inputs

- `.input-aura` — `h-9`, `rounded-xl`, border, focus ring `0 0 0 3px rgba(37,99,235,0.15)`.
- `.skeuo-input` — backward-compat alias.

### Tables

- `.table-aura` — sticky header at `--bg-elevated`, 44px rows, hover fills with card-hover. Header text: `text-xs font-semibold uppercase tracking-wider`.

### Status badges

`.badge-status` + one of `.status-success | .status-danger | .status-warning | .status-info | .status-neutral`. Or the Tailwind-utility variants: `.badge-success`, etc.

Light: tinted bg + dark text + matching subtle border. Dark: deeper bg-with-opacity + light text + matching border.

**Color + label, never color alone.** Add an icon and a word.

### Sidebar

Warm-dark in both modes. Active item: `--sidebar-active-bg` (10–15% accent alpha) + left border `--sidebar-active-border`. Hover: 5–6% white wash. Text-muted at 38–42% white. Section headings at the same muted level.

### Empty state

`.empty-state` + `.empty-state-icon` + `.empty-state-title` + `.empty-state-description`. Centered, 20-padding, muted icon at 30% opacity. **Always include a recovery action** (button or link) below the description.

### Skeletons

`.skeleton-aura` (rounded, shimmer) or `.skeleton-shimmer` (overlay). 1.5–1.8s shimmer, `prefers-reduced-motion: reduce` collapses to static.

### Focus rings

`.focus-ring-aura` — `0 0 0 2px var(--bg-main), 0 0 0 4px var(--border-focus)`. Already auto-applied globally to `button:focus-visible`, `a:focus-visible`, `[role="button"]:focus-visible`, `input:focus-visible`. Do not strip without replacement.

## Motion

Short, snappy, ease-out only. Bounce / elastic are banned.

| Token | Duration | Use |
|---|---|---|
| `100ms` | Press feedback | Button active state, transform |
| `150ms` | Color / border swap | Surface hover transitions |
| `180ms` | Default UI transition | Card hover, theme transition |
| `200ms` | State change | Toggle, expansion |
| `260–280ms` | Page enter | `pageEnter`, `riseIn` |
| `1.5–1.8s` | Continuous loop | Shimmer, skeleton |

**Easing:** `cubic-bezier(0.4, 0, 0.2, 1)` (standard ease-out). Available as `transition-DEFAULT` / `transition-smooth`.

**Reduced motion:** every `prefers-reduced-motion: reduce` block already disables `card-lift`, `card-interactive:hover` transform, page-enter animations, shimmer.

Use the named utilities (`.page-reveal`, `.stagger-children`, `animate-fade-in`, `animate-rise-in`) instead of inline transitions.

## Layout

- Container max widths follow Tailwind defaults; most app pages do NOT use a max-width container — they fill the working area with sidebar + topbar fixed.
- **Body line length** capped at 65–75ch in long-form contexts (Fluence wiki articles, blog posts). Tables and dashboards are not subject to this — they use available width.
- **Section rhythm:** `mb-2` between `.section-header` and content; cards in a grid use `gap-4` (16px); cards in a list use `gap-3` (12px).
- **No max-w-7xl-everywhere reflex.** Most app surfaces use the full working area.

## Charts (Recharts)

| Token | Light | Dark |
|---|---|---|
| `--chart-primary` | `#2563EB` | `#5B8CF5` |
| `--chart-secondary` | `#60a5fa` | `#93c5fd` |
| `--chart-grid` | `#eceef5` | `#1e2440` |
| `--chart-tooltip-bg` | `#ffffff` | `#12151E` |

Use the `--chart-*` tokens, not raw hex, so charts adapt with theme.

## Editor (NU-Fluence Tiptap)

Preserved in `globals.css` `.fluence-editor-*` rules:

- Canvas: `min-h-[400px]`, `rounded-lg`, `border-subtle`, focus ring on container.
- ProseMirror: 3xl/2xl/xl heading scale, accent-blue blockquote left border, accent-tinted inline code, muted placeholder at 60% opacity.
- Tables: full-width, bordered, header `bg-surface` semibold.

## Patterns to avoid

These are real failure modes seen in the codebase or in HRMS competitors. Polish should remove them on sight:

- **Side-stripe `border-left: 4px solid color` cards.** Already banned by impeccable's absolute bans. Replace with full subtle border + tinted bg.
- **Gradient text.** Banned. Use solid `--accent-primary`, emphasis via weight.
- **Decorative glassmorphism.** `.glass-aura` is permitted but only when content sits over imagery or saturated color. Never glass over a flat white card.
- **Nested cards.** Always wrong. Use `.panel-inset` for nested grouping.
- **Hero-metric template.** Big number + small label + gradient bar. SaaS cliché — use `.text-stat-large` with `.stat-label` and tabular numerals, nothing else.
- **Identical card grids.** Same-size-icon-heading-text repeated 6 times. Vary, group, or list.
- **Modal-first reflex.** Inline edit and drawer first; modal only when blocking confirmation is needed.

## File map

| Concern | File |
|---|---|
| Tokens (light + dark) | `frontend/app/globals.css` |
| Tailwind bridge + brand scales | `frontend/tailwind.config.js` |
| Mantine theme (compact) | `frontend/styles/compact-theme.ts` |
| Aura dark theme (legacy override) | `frontend/styles/aura-dark-theme.css` |
| Mantine dark config | `frontend/tailwind.config.aura-dark.js` |
| Reference HTML preview | `docs/design-system/NU-AURA-SINGLE-HUE-DESIGN-SYSTEM-v2.html` |
| Long-form principles | `docs/design-system/nulogic.md` |
