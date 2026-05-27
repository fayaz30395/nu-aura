# Polish Phase 3 — Sub-App Per-Route Polish (Progress Log)

**Date opened:** 2026-05-13
**Status:** In progress (multi-session). Dashboard widget family closed.

Phase 3 takes the per-route systematic polish from `polish.md` — alignment, IA, typography, color, interaction states, motion, content, icons, forms, edge cases, responsiveness, perf, code quality — and applies it per route family. Bigger than Phase 2 (which was system-wide mechanical fixes), narrower than per-route.

## Sub-deliverable 1 — Dashboard widget family (CLOSED 2026-05-13)

Four widgets compose every employee's daily landing surface. All four touched in this session.

### `components/dashboard/WelcomeBanner.tsx`

| Change | Reason |
|---|---|
| Shadow tint changed from `--nu-lapis-blue` (legacy brand Lapis `#050766`) to `--accent-primary` (Studio Slate `#2563EB`) | Brand-color leak in product UI per DESIGN.md. Lapis is reserved for logo/marketing. |
| Fallback `rgba(5, 7, 102, 0.25)` updated to `rgba(37, 99, 235, 0.22)` to match the new token | Keep Safari ≤16.1 fallback aligned to Studio Slate accent |
| Comment block rewritten to describe Studio Slate accent rather than Lapis | Match code intent |
| Mesh orb / noise overlay / gradient surface preserved | Daily landing hero is purposeful color; orbs use blueish rgba close to accent |
| `QuickAccessWidget` (pending actions) left as-is | Already Studio Slate aligned: `bg-warning-100`, `bg-accent-100`, `text-warning-600`, `text-accent-600` |

### `components/dashboard/TimeClockWidget.tsx`

| Change | Reason |
|---|---|
| Clock-in button shadow tint changed from `--nu-lapis-blue` to `--accent-primary` | Brand-color leak fix |
| Fallback `rgba(5, 7, 102, 0.35)` → `rgba(37, 99, 235, 0.32)` | Match the new token |
| Comment block rewritten | Match code intent |
| Time-display + completed-state + button architecture preserved | Already Studio Slate aligned |

### `components/dashboard/LeaveBalanceWidget.tsx`

| Change | Reason |
|---|---|
| Request-Leave button shadow tint changed from `--nu-lapis-blue` to `--accent-primary` | Brand-color leak fix |
| Fallback `rgba(5, 7, 102, 0.25)` → `rgba(37, 99, 235, 0.22)` | Match the new token |
| Comment block rewritten | Match code intent |
| `CircularProgress` ring colors preserved (`--chart-danger`, `--chart-warning`, `--accent-primary`) | Already Studio Slate aligned via chart tokens |
| Drop-shadow glow on progress arc preserved | Functional emphasis; uses the dynamic ring color |

### `components/dashboard/HolidayCarousel.tsx`

| Change | Reason |
|---|---|
| **Bug fix**: 3 instances of `p-4text-white` (no space) → `p-4 text-white` | Tailwind class concatenation typo. Silently caused `text-white` to fail compilation, so the holiday card may have rendered with default text color where white was intended. Real defect, not just polish. |
| Gradient surface `bg-gradient-to-br from-accent-600 to-accent-800` preserved | Studio Slate accent gradient; this widget is the dashboard's deliberate color-rich spot, purposeful |
| `text-accent-200`, `bg-white/20` overlays preserved | Function over flat surfaces here — the white overlay creates contrast over the accent gradient |

### Verification

- `npx tsc --noEmit`: clean
- `npm run lint`: 0 new warnings (5 pre-existing warnings unchanged from Phase 2 baseline)
- Visual diff not captured in this session — the dashboard route is high-traffic; manual QA recommended before next deploy

## Sub-deliverable 1b — Hero cards flattened (CLOSED 2026-05-13)

Four flagged decorative hero stat cards from Phase 2's flag list now flattened to Studio Slate per polish.md "Hero stat card pattern: rare and purposeful, or nothing":

| File | Line | Treatment | Outcome |
|---|---|---|---|
| `app/attendance/page.tsx` | 226-349 | **B — warm dark** (`bg-[var(--bg-sidebar)]`) | Daily clock-in is a genuine landing-emphasis surface; mirrors WelcomeBanner. Dropped accent-gradient Card + radial-dot mesh + corner blur orb + `text-white drop-shadow` chrome. Buttons collapsed to `btn-primary` / white check-out. ~45% class-string reduction. |
| `app/calendar/page.tsx` | 241 | **A — clean card** (`card-aura`) | "Today's Events" is a small list, not emphasis. Replaced gradient + `bg-white/10` rows with `card-aura` + `badge-status status-info` + neutral row surfaces. |
| `app/learning/courses/[id]/page.tsx` | 155 | **B — warm dark** | Course header is a landing context. Swapped accent gradient + `text-accent-200/100` cascade for `bg-[var(--bg-sidebar)]` + `text-white/60` tokens. Mandatory badge now `bg-warning-500` solid. |
| `app/loans/new/page.tsx` | 294 | **A + `<Stat>`** | EMI panel is a stat. Replaced gradient wrapper + manual `text-4xl` with `card-elevated` + `<Stat tone="accent">`. ~50% reduction. |

No entangled cases — all four flattened safely. The two warm-dark surfaces (attendance, learning course header) join WelcomeBanner as the system's three legitimate "landing emphasis" hero patterns.

## Sub-deliverable 2 — Leave family (PARTIAL, 2026-05-13)

Touched: `app/leave/page.tsx`. The other leave routes (`/leave/calendar`, `/leave/approvals`, `/me/leaves`) were partially polished by Phase 2's `<Stat>` sweep and the categorical-palette migration; no remaining banned patterns flagged for them.

### `app/leave/page.tsx`

| Change | Reason |
|---|---|
| `getLeaveTypeGradient()` (returned tailwind gradient class fragment) renamed `getLeaveTypeTone()` and reshaped to return `{bg, text, bar}` per type — flat tint pair + solid bar color | DESIGN.md bans decorative gradient icon tiles; the helper drove gradient classes for 4 leave-balance cards on the page. |
| Icon tile JSX changed from `<div className="p-4 rounded-xl bg-gradient-to-br ${gradient}"><Icon className="...text-white"/></div>` to `<div className="p-3 rounded-xl ${tone.bg} ${tone.text}"><Icon className="..."/></div>` | Drop the gradient, drop `text-white`, let icon inherit from parent's tone color, drop `p-4` for `p-3` to match icon-tile sizing across the codebase. |
| Progress bar fill changed from `bg-gradient-to-r ${gradient}` to solid `${tone.bar}` | Progress bars carry tone, not gradient — DESIGN.md's "color earns its place." |
| Hover shadow `--shadow-dropdown` → `--shadow-card-hover` on the surrounding balance card | Match the 3-tier shadow scale. `--shadow-dropdown` is the deepest and reserved for true overlays. |
| "Apply for Leave" CTA button replaced inline `bg-gradient-to-r from-accent-500 to-accent-700 ...` (huge className) with `btn-primary gap-2` system class | Drop 200+ chars of bespoke styling; system button handles hover/focus/active uniformly. |
| Removed redundant `focus-visible:outline-none focus-visible:ring-2 ...` from the `<Plus>` icon | The icon isn't focusable; lint-fixer cargo-culted ring utilities onto a decorative child. Global `:focus-visible` on the parent button handles it. |

The remaining `bg-gradient-to-r` at line 450 (in `me/leaves/page.tsx`) is a horizontal progress-bar fill — functional, kept per DESIGN.md.

### Verification

- `npx tsc --noEmit`: clean
- `npm run lint`: 0 new warnings (5 pre-existing warnings unchanged)
- Leave page now has zero decorative gradients

## Mantine theme audit (READ-ONLY, 2026-05-13) — **significant finding**

`frontend/styles/compact-theme.ts` is named like a Mantine theme but is **not actually a Mantine `createTheme()` / `MantineThemeOverride` config**. It's a plain TypeScript object that exports Tailwind utility-class strings, used by some components as a class catalogue. **No `MantineProvider` is configured with Studio Slate tokens anywhere in the codebase.**

As a result, every Mantine component (`Card`, `Modal`, `Menu`, `Popover`, `Notification`, `Table`, `TextInput`, etc.) is rendering with Mantine library defaults — not Studio Slate v2 tokens. The drift is invisible to the Tailwind-driven parts of the app but real anywhere Mantine renders.

**Auditor's 0/8 alignment scorecard:**

| Axis | State |
|---|---|
| Primary color | **Missing** — Mantine defaults to its built-in blue `#228be6`, not `#2563EB` |
| Surface colors | **Missing** — no reference to `--bg-card` / `--bg-elevated` / `--bg-surface` |
| Border / divider | **Missing** — Mantine `Divider`/`Card` borders use default `gray.3` / `dark.4` |
| Border radius | **Drifted** — `compact-theme.ts` says `rounded-lg` (8px), `globals.css` `.btn-primary` says `rounded-xl` (12px), Mantine falls back to `sm` (~4px) |
| Typography | **Missing** — no `fontFamily` / `headings.fontFamily` references; Open Sans / Montserrat / Roboto Mono not propagated to Mantine |
| Component density | **Drifted** — `compact-theme.ts` codifies `h-10` (40px) for buttons/inputs; canonical spec is `h-9` (36px) |
| Dark mode | **Missing** — Mantine's `colorScheme` not wired to the `<html class="dark">` toggle; states can desync |
| Component-level overrides | **Missing** — no `components: { Button, Modal, Input, ... }` block at all |

**Sub-deliverable proposal for next session:** "Mantine theme reconciliation" — a focused 1-day session to (a) write a real `createTheme()` config wired to Studio Slate tokens, (b) propagate to `<MantineProvider>` at the app root, (c) sync `colorScheme` with the Tailwind dark-mode class, (d) standardize button/input height at 36px across `globals.css`, DESIGN.md, and the new Mantine theme. The current `compact-theme.ts` should be renamed to `tailwind-presets.ts` (or split) to reflect what it actually is.

**Also flagged for reconciliation:** `frontend/styles/aura-dark-theme.css` and `frontend/tailwind.config.aura-dark.js` (legacy dark-mode files referenced in DESIGN.md file map — should be checked alongside the Mantine work).

## Brand-register page audit (READ-ONLY, 2026-05-13) — content + design finding

### Headline

NU-AURA has 5 marketing-shaped pages — about, pricing, features, contact, AppLandingHero — that PRODUCT.md says don't need to exist. NU-AURA is internal. There is no customer, no pricing in dollars, no "Start Free Trial", no "Join our growing team." These pages were authored against product-register vocabulary but ship marketing copy. **Worst-of-both**: neither committed brand register (no imagery, no distinctive typography, no committed palette) nor honoring product-register restraint (gradient tiles, hero-metric stats, banned side-stripes, identical icon grids).

### The one correct brand surface

`app/auth/login/page.tsx` **left panel** is the only intentional brand-register surface in the codebase. It correctly uses `--nu-lapis-blue` / `--nu-purple` gradients in its AnimatedBackground (login L221-242) and on the floating app-icon tiles (L793-796). DESIGN.md sanctions exactly this scope. Login's right card is product-register and correct. Leave the left panel alone — it's the reference.

### Marketing-page violations (specific)

- **`about/page.tsx`** (lines 109, 126): two banned side-stripe `border-l-4 border-l-accent-500` / `border-l-info-500` cards. Lines 169, 209, 246: decorative `bg-gradient-to-br from-accent-500 to-accent-700` icon tiles. Line 239: hero-metric template.
- **`pricing/page.tsx`** L241: `ring-2 ring-accent-500/50 scale-105` decorative emphasis on "Most Popular". L246-250: 3× gradient icon tiles. L268: color-only success cue (a11y).
- **`features/page.tsx`** L166-330: 5 mixed accent gradients (some mix `from-accent-700 to-danger-600` — color-mixing in product UI). L428: heavy shadow on flat-surface system. L529: `Button className="btn-primary"` redundancy.
- **`contact/page.tsx`** L144: 3× gradient method tiles. L288-290: double-styled input (manual override of `input-aura`). L375: `MapPin` color contrast on `accent-950` unverified.
- **`AppLandingHero.tsx`** L66-76: 12s continuous-loop animated background. L80-101: 5 floating particles. L115: spring easing (banned). L124: `text-surface-*` instead of token. **Highest-impact product-register fix** in the audit.

### Auth-pages partial drift

- `login/page.tsx` L1029: `skeuo-button` class (backward-compat shim, should be `btn-primary`). L807: inline `boxShadow ... inset 0 1px 0 rgba(255,255,255,0.15)` skeuomorphic emboss on app-icon tiles — borderline (brand panel) but worth flagging.
- `forgot-password/page.tsx` L66, 163: page-wide `bg-gradient-to-br from-accent-50 via-surface-50 to-surface-100` is the SaaS "purple-gradient hero deck" anti-reference at smaller scale. L71, 168: `from-accent-500 to-accent-700` logo tile + `shadow-accent-500/25`. L180: `skeuo-card` shim. L217: form input duplicates `input-aura` with manual overrides.

### Cross-cutting

- **Decorative accent-gradient icon tiles** appear 11+ times across these 5 pages — same trope DESIGN.md bans elsewhere.
- **All 5 marketing pages share identical `<header>` chrome** (sticky `bg-[var(--bg-elevated)] backdrop-blur-lg` topbar with "NU-AURA" wordmark + "Get Started"). If pages stay, header should be a shared component.
- **Brand-color gate is otherwise holding** — no other audited file misuses `--nu-*` tokens.

### Recommended Phase 3 sub-task scope

**Step 0 (content decision, before styling):** Confirm with stakeholders whether about / pricing / features / contact pages should exist at all. Per PRODUCT.md (internal platform, no customer surface), they may be safe to delete. Route audit: check whether anything internal links to them.

**Step 1 (if pages stay):** Convert `AppLandingHero` to product register — drop continuous-loop animation, drop particles, drop spring motion, swap `text-surface-*` for token references. Highest-traffic of the seven surfaces.

**Step 2:** Convert `forgot-password` to match `login`'s right-card treatment — solid `var(--bg-main)` page bg, drop `skeuo-card`, drop accent page gradient.

**Step 3 (if marketing pages stay):** Make a real register decision for about / pricing / features / contact. Either commit to brand register (imagery + distinctive type + considered palette) or convert to product register (drop gradients, drop side-stripes, drop hero-metric vanity stats). Current state is the worst-of-both.

## Sub-deliverable 3 — Settings family rolled-own card sweep (CLOSED 2026-05-13)

Audited 13 files in `app/settings/**`. Converted 4 hand-rolled card surfaces:

| File | Conversion |
|---|---|
| `app/settings/loading.tsx` | 2× `bg-* rounded-lg border ...` → `.card-aura` (stats + content section skeletons) |
| `app/settings/notifications/loading.tsx` | 1× hand-rolled row card → `.card-aura` |
| `app/settings/security/page.tsx` | 1× nested device-row → `.panel-inset` (correctly avoiding nested-card ban inside `<Card>`) |

**10 files inspected, no conversion needed** — `settings/page.tsx`, `notifications/page.tsx`, `profile/page.tsx`, `sso/page.tsx`, and their `loading.tsx` / `error.tsx` siblings were all using Mantine `<Card>` components (which fall under the Mantine theme reconciliation, not this sweep). One status panel in `security/page.tsx:140` was left as a decorative state panel (success/warning bg-tinted with border-2) — out of scope.

This sub-task validates the audit approach: in the settings family, the actual rolled-own card surfaces were rare (4/13 files). Most "non-`.card-aura`" surfaces are legitimate Mantine renders. The 644-surface estimate from Phase 1 likely overcounts because the grep pattern matched many non-card uses (buttons with `rounded-lg border`, inputs, toggle knobs). The system bypass is real, but smaller per route family than the raw grep suggests.

**Settings-family totals after sweep:** `.card-aura` 0 → 3, `.panel-inset` 0 → 1.

## Sub-deliverable 4..N — Pending

Suggested next route families to polish:

1. **Leave family** (`/leave`, `/leave/calendar`, `/leave/approvals`, `/me/leaves`). Already partially touched in Phase 2; many cards are now `<Stat>` but a per-route IA pass is still needed. The dynamic `getLeaveTypeGradient()` helper in `app/leave/page.tsx:241` still needs reshaping to flat tints (flagged by gradient-sweeper-2).

2. **Attendance family** (`/attendance`, `/attendance/team`, `/attendance/regularization`). Attendance/page main "hero clock card" (`bg-gradient-to-br from-accent-600 via-accent-600 to-accent-700` at line ~233) is the last decorative-hero surface in this family — needs purposeful flattening or keep-as-is decision.

3. **Hero card systematic review**: Flagged from Phase 2 for manual decision (keep as deliberate hero vs flatten):
   - `app/attendance/page.tsx:233` (employee daily clock-in hero card)
   - `app/calendar/page.tsx:241` ("Today's Events" hero card)
   - `app/learning/courses/[id]/page.tsx:155` (course header hero)
   - `app/loans/new/page.tsx:294` (loan-amount hero card)

4. **Rolled-own card audit**: 644 surfaces vs 99 `.card-aura` per Phase 1 audit. Per-route conversion as Phase 3 visits each route family.

5. **Mantine theme alignment** (`frontend/styles/compact-theme.ts`) — separate audit needed; Mantine has its own theme layer that may have drifted from Studio Slate tokens.

6. **Brand register pages** (`about`, `pricing`, `features`, `AppLandingHero`) — distinct treatment from product UI. Should follow brand reference rules from `impeccable/reference/brand.md`, not product. Separate sub-deliverable.

## Phase 3 working principles

- One route family per sub-deliverable. Resist sprawl.
- Use `<Stat>`, `<Callout>`, `<GoogleGLogo>` primitives introduced in Phase 2.
- For every page polished: verify alignment, focus states, copy, empty/error/loading/success states, motion, responsive at sm/md/lg breakpoints.
- Convert rolled-own cards to `.card-aura` opportunistically as each route is visited.
- Never invent tokens. Always import from `lib/utils/categoricalPalette.ts` for entity colors.
- Match the impeccable polish.md checklist on each route — don't skim.
