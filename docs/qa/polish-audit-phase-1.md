# Polish Audit — Phase 1: System-wide Drift

**Date:** 2026-05-13
**Scope:** All frontend surfaces (`frontend/app`, `frontend/components`, `frontend/lib`)
**Branch:** main @ `784371df`
**Reference:** PRODUCT.md, DESIGN.md (Studio Slate v2)

## Executive summary

NU-AURA's design system (Studio Slate v2) is well-defined in `frontend/app/globals.css`. The frontend has substantial drift from it, concentrated in three failure modes:

1. **Pre-Studio-Slate code that was never migrated** — `skeuo-emboss`, gradient stat backgrounds, ornamental icon-tiles. Visible because skeuo tokens were *flattened to no-op* rather than *removed*, so violations compile fine but the styling is dead-weight.
2. **One-off card and input implementations** that bypass `.card-aura` / `.input-aura` / `.btn-*`. 644 rolled-own surfaces vs 99 uses of `.card-aura` is a 6:1 inversion of the system intent.
3. **Hero-metric SaaS template overuse** — explicitly banned by DESIGN.md, present on at least 20 dashboard pages. Mostly Learning, Certificates, Expenses Reports, Predictive Analytics, Attendance, Loans.

**Severity totals (P0 = banned / a11y blocker; P1 = token drift; P2 = cosmetic):**

| Category | P0 | P1 | P2 |
|---|---|---|---|
| Banned patterns | 6 | 28 | – |
| Token drift | 3 | ~50 | – |
| Component bypass | – | ~600 | – |
| Hero-metric cliché | – | 20 | – |
| Decorative gradient | – | 30+ | – |
| A11y focus | 13 | – | – |
| Code hygiene | – | – | 162 |

Phase 2 should land P0 first (gradient text, brand-color leakage, missing focus rings) — these are highly visible and small in count. P1 is the bulk of the work and should be scoped by sub-app in Phase 3+.

---

## P0 — Must fix (banned patterns, a11y blockers)

### 1. Gradient text (banned, absolute)

DESIGN.md: *Banned. Use solid `--accent-primary`, emphasis via weight.*

| File | Line | Snippet |
|---|---|---|
| `app/auth/login/page.tsx` | 779 | `<span className="bg-clip-text text-transparent" ...>` |
| `app/auth/login/page.tsx` | 861 | `Welcome to <span className="bg-clip-text text-transparent font-extrabold" ...>` |
| `app/dashboards/manager/page.tsx` | 237 | `text-transparent bg-clip-text bg-gradient-to-r from-accent-700 to-accent-600 ... skeuo-emboss>Pulse</span>` |
| `app/performance/revolution/page.tsx` | 44 | `bg-clip-text text-transparent bg-gradient-to-r from-accent-700 to-accent-600 ...` |
| `components/ui/Loading.tsx` | 334-335 | `-webkit-background-clip: text; background-clip: text;` |
| `styles/aura-dark-theme.css` | 103-104 | `-webkit-background-clip: text; background-clip: text;` |

**Root cause:** one-off implementation. Replace with solid `text-accent-600` (light) / `text-accent-400` (dark) + `font-extrabold`. The visual emphasis is preserved by weight + size; the gradient adds no information.

### 2. Brand-color leakage in product UI

DESIGN.md: *Do not introduce these into product UI — they exist for the corporate logo and brand-adjacent marketing surfaces. The product is single-hue (blue).*

| File | Line | Color | Severity |
|---|---|---|---|
| `app/global-error.tsx` | 70, 123, 205 | `#050766` Lapis | P0 — global error UI, all users hit this |
| `lib/utils/theme-colors.ts` | 19 | fallback for `--chart-primary` is `#050766` | P0 — every chart inherits the wrong fallback when CSS vars fail |
| `lib/utils/theme-colors.ts` | 20 | fallback for `--chart-secondary` is `#8939A1` | P0 |
| `lib/utils/theme-colors.ts` | 23 | fallback for `--chart-danger` is `#E62A32` | P0 |
| `lib/utils/theme-colors.ts` | 34 | fallback for `--chart-tooltip-text` is `#050766` | P0 |
| `app/auth/login/page.tsx` | 795-796 | `var(--nu-purple)`, `var(--nu-dark-teal)` in app-switcher tiles | P1 — marketing-adjacent surface, defensible if confined to login hero |
| `lib/utils/__tests__/theme-colors.test.ts` | 13, 18, 33, 70, 83-87, 151, 162 | pinned brand-color expectations | P1 — pin Studio Slate values instead |

**Root cause:** missing token + stale tests. Fix:
- Replace `#050766` → `#2563EB` and `#8939A1` → `#60a5fa` and `#E62A32` → `#dc2626` in `theme-colors.ts` fallbacks.
- Update tests to pin Studio Slate values.
- `app/global-error.tsx` should use `--accent-primary` or `text-accent-600` rather than raw hex (cannot rely on CSS vars in a global error boundary, so use computed hex `#2563EB` for light + check whether dark mode applies).

### 3. Missing focus indicators (WCAG AA blocker)

PRODUCT.md: *WCAG 2.1 AA baseline. Visible focus rings on every focusable element.*

Stripping `outline` without a visible replacement fails 2.4.7 Focus Visible. `focus:border-accent-600` alone is insufficient — border swap is not a perceptible focus indicator on most surfaces.

| File | Line | Problem |
|---|---|---|
| `app/learning/paths/page.tsx` | 154, 164 | `focus:outline-none focus:border-accent-600` (no ring) |
| `app/learning/certificates/page.tsx` | 184, 194 | same |
| `app/resources/availability/page.tsx` | 166 | `focus:outline-none focus:border-accent-500` (no ring) |
| `app/restricted-holidays/page.tsx` | 617 | `focus:outline-none` (truncated, may have ring) — verify |
| `app/one-on-one/page.tsx` | 1046 | `focus:outline-none` on a clickable area |
| `app/onboarding/[id]/page.tsx` | 298 | `outline-none cursor-pointer hover:text-accent-500` (no visible focus) |
| `components/ui/AdvancedFilterPanel.tsx` | 618 | `focus:outline-none cursor-pointer` |
| `components/ui/Input.tsx` | 113 | `outline-none` in a base component (likely has focus:ring elsewhere — verify) |
| `components/ui/Select.tsx` | 57 | same |
| `components/layout/GlobalSearch.tsx` | 796 | `outline-none` on search input |
| `components/recruitment/ScorecardForm.tsx` | 255 | `outline-none border-none p-0` on a text input |

**Root cause:** one-off implementation. Fix by:
- Removing `focus:outline-none` from the className strings — the global `button:focus-visible / input:focus-visible` rule in `globals.css:617-631` already provides the system ring.
- Or, if a specialized ring is required, switching to `focus-ring-aura` utility (also already in globals.css:609-614).
- For `components/ui/Input.tsx` and `Select.tsx`: keep `outline-none` only if a `focus-visible:ring-*` rule is present in the same class chain. Audit each base component case-by-case.

---

## P1 — Token drift and component bypass

### 4. Side-stripe colored borders (banned, but lower stakes than gradient text)

DESIGN.md: *Already banned by impeccable's absolute bans. Replace with full subtle border + tinted bg.*

Confirmed colored `border-l-{2,4}` instances:

| File | Line | Pattern |
|---|---|---|
| `app/attendance/page.tsx` | 222 | `border-l-4 border-danger-500` alert |
| `app/learning/page.tsx` | 329 | `border-l-4 border-warning-500` card |
| `app/learning/certificates/page.tsx` | 219 | `border-l-4 border-warning-500` card |
| `app/recruitment/candidates/_components/ParseResumeModal.tsx` | 364, 387 | `border-l-2 border-accent-300 / border-info-300` block-quote style |
| `app/performance/calibration/page.tsx` | 631 | conditional `border-l-2 border-warning-400` |
| `app/onboarding/templates/new/page.tsx` | 131 | `border-l-4 border-accent-500` |
| `app/onboarding/templates/[id]/page.tsx` | 254 | `border-l-4 border-accent-600` |
| `components/fluence/InlineComments.tsx` | 133, 348 | `border-l-2 border-warning-400` quoted reply |

28 total `border-l-{2|4|8}` matches, ~10 are clearly the banned colored-accent pattern (above). Remainder are component-internal dividers (acceptable).

**Fix pattern:**

```diff
- className="p-4 tint-danger border-l-4 border-danger-500 rounded-lg ..."
+ className="p-4 rounded-lg border border-danger-200 bg-danger-50 dark:bg-danger-950/20 dark:border-danger-800"
```

For quoted-reply pattern in `InlineComments.tsx`, use full subtle border + tinted bg; lift hierarchy via padding-left and font-style, not via stripe.

**Root cause:** missing-token. The pattern recurs because there is no `.callout-info` / `.callout-warning` / `.callout-danger` shared component. Phase 2 should introduce one.

### 5. Hard-coded hex outside tokens

DESIGN.md: *Use the `--chart-*` tokens, not raw hex.* (Also implicit for everything else.)

#### 5a. Categorical shift/leave color picker (intentional but un-tokenized)

`app/shifts/definitions/page.tsx` lines 58-59 declare a 10-color palette as raw hex:

```js
'#3B82F6', '#F59E0B', '#8B5CF6', '#EF4444', '#10B981',
'#EC4899', '#F97316', '#06B6D4', '#6366F1', '#84CC16',
```

Used as default for: shifts (`#3B82F6`), leave types (`#3B82F6`), wiki spaces (`#3e63dd`), me/leaves (`#6b7280`).

**Root cause:** missing-token. The system has no "categorical palette" tokens. Phase 2: introduce `--categorical-1..10` in globals.css, expose to TS via a shared constant.

#### 5b. Google OAuth brand colors (acceptable, but duplicated)

3 surfaces render the Google "G" with the same hex four-color path:
- `app/settings/page.tsx` lines 280-289
- `app/auth/forgot-password/page.tsx` lines 108-120
- `app/auth/login/page.tsx` lines 914-926

**Root cause:** one-off implementation. Extract to `<GoogleGLogo />` component. The Google brand colors are correctly raw hex; the bug is the triplication.

#### 5c. Project status fallbacks

`app/projects/calendar/page.tsx` 123-215 uses raw hex (`#3b82f6`, `#64748b`, `#fbbf24`, `#f59e0b`) as STATUS_COLORS fallbacks.

`app/resources/capacity/page.tsx:105` hardcodes `repeating-linear-gradient(45deg, #ef4444, ...)`. Use `--danger-500` / `--danger-300`.

`app/exit-interview/[token]/page.tsx:271` uses Bootstrap-era `#dee2e6` border. Use `--border-main`.

`app/sign/[token]/page.tsx` 63, 600 uses `#1a1a1a` for signature stroke. Use computed `--text-primary` (signature is on a canvas so requires hex; tokenize to a `SIGNATURE_INK` constant).

`app/settings/security/loading.tsx` 87, 107 uses `#eee` borders. Use `var(--border-subtle)`.

`app/fluence/analytics/FluenceAnalyticsCharts.tsx:83` uses `fill="#8884d8"` (Recharts default). Use `var(--chart-secondary)`.

### 6. Decorative gradients (≠ banned, but cliché)

30+ `bg-gradient-to-{br|r}` instances, almost entirely in icon-tile decoration and stat-card backgrounds. Pattern:

```jsx
<div className="h-8 w-8 rounded-lg bg-gradient-to-br from-accent-500 to-accent-700 ...">
  <Icon />
</div>
```

Hot spots:
- `app/attendance/AttendanceMonthlyStats.tsx` (4)
- `app/attendance/AttendanceSidebar.tsx` (5)
- `app/attendance/page.tsx` (7)
- `app/attendance/team/page.tsx` (3)
- `app/loans/page.tsx`, `app/loans/new/page.tsx`, `app/loans/[id]/page.tsx` (8)
- `app/probation/page.tsx`
- `app/nu-calendar/page.tsx`
- `app/contact/page.tsx`

**Issue:** these decorative icon-tiles compound the "generic SaaS hero" feel that PRODUCT.md anti-references explicitly. None of them carry information; they are pure ornament.

**Recommended fix:** swap gradients for solid `bg-accent-100` / `bg-success-100` / `bg-warning-100` (light) and `bg-accent-500/10` (dark), with icon at `text-accent-600`. Same legibility, half the noise, and consistent with the Studio Slate "color earns its place" principle.

### 7. Hero-metric template overload

DESIGN.md: *Big number + small label + gradient bar. SaaS cliché — use `.text-stat-large` with `.stat-label` and tabular numerals, nothing else.*

Pages applying `text-3xl font-bold` (instead of the system `.text-stat-large` which is `font-semibold + tabular-nums + mono`):

| File | Stats count |
|---|---|
| `app/learning/page.tsx` | 5 |
| `app/learning/certificates/page.tsx` | 3 |
| `app/expenses/reports/page.tsx` | 4 |
| `app/predictive-analytics/page.tsx` | 7+ |
| `app/attendance/team/page.tsx` | 4 (with `font-bold` instead of system class) |
| `app/admin/payroll/page.tsx` | applies `skeuo-emboss` |
| `app/security/page.tsx`, `app/loans/new/page.tsx`, `app/contact/page.tsx`, `app/about/page.tsx`, `app/features/page.tsx` | hero `text-5xl font-bold skeuo-emboss` |

90 total matches for `text-3xl|4xl|5xl` + `font-bold|extrabold` in TSX.

**Root cause:** conceptual misalignment + missing component. The system *has* `.text-stat-large` declared in `globals.css:707-711`. Pages don't use it. Phase 2: write a `<Stat label value />` component and replace the 90 inline call sites mechanically.

### 8. Rolled-own card surfaces

99 uses of `.card-aura` vs ~644 hand-rolled card-like surfaces (`rounded-{lg|xl|2xl}` + `border` + `bg-*`). That ratio is the deepest single sign of system bypass.

These won't all be wrong — some are buttons, some are tags, some are inputs. But spot-checking confirms many are cards that bypassed `.card-aura`:

- Manual `bg-white dark:bg-surface-900 rounded-xl border border-surface-200 ...` recurring across attendance, dashboards, recruitment, fluence
- Manual `bg-[var(--bg-card)] rounded-lg shadow-[var(--shadow-card)] border ...` recurring instead of `.card-aura`

**Root cause:** one-off implementation, often token-aware but verbose. Phase 3 (per-sub-app) should replace these as it polishes each route.

### 9. `skeuo-emboss` / `skeuo-deboss` dead-weight

DESIGN.md: *Skeuomorphic tokens are intentionally flattened to no-ops or to the standard tokens for backward compatibility. Do not reintroduce embossed / debossed / heavy-inner-shadow surfaces.*

512 usages of `skeuo-emboss` or `skeuo-deboss` in TSX. The class is a no-op (per `globals.css:894`: `text-shadow: none`). So this is **strictly visual noise in code, not in pixels** — but it's a marker for "this file hasn't been touched since pre-Studio-Slate v2."

**Root cause:** conceptual misalignment + tech debt. Phase 2 can remove all 512 mechanically via codemod — strip the class, no visual change. Files with this class are also disproportionately the ones with hero-metrics and gradient backgrounds, so it doubles as a migration-priority heatmap.

### 10. `box-shadow: var(--shadow-elevated)` inline

Inline `shadow-[var(--shadow-elevated)]` and `shadow-[var(--shadow-dropdown)]` are everywhere. They work and use tokens, so they're not wrong per se. But:

- Many are over-shadowed (`.card-elevated` is meant for popovers, not stat cards).
- Many sit *underneath* a gradient bg or skeuo-emboss, layering visual weight.

Spot-check `app/attendance/page.tsx:233`: a `bg-gradient-to-br from-accent-600` card with `shadow-[var(--shadow-dropdown)]` — a stat card with the deepest shadow in the system. This is a "look at me" card; the system says cards should fade.

**Root cause:** conceptual misalignment. Re-tier shadows during Phase 3.

### 11. Modal-first reflex (signal, not verdict)

338 modal/disclosure references across 58 files. Many are correct (Mantine `<Modal>` for blocking confirmation: delete, terminate, force-close). Sample violations to confirm:

- Inline-edit candidates implemented as modal (settings, profile fields)
- Drawer-shaped flows implemented as modal (filters, panels)

Needs per-instance review in Phase 3+ — too noisy to triage in a system-wide audit.

---

## P2 — Code hygiene

### 12. Stray `console.log/info/debug` in production code

146 instances. Polish.md: *Remove debug logging in production.*

```bash
grep -rnE "console\.(log|debug|info)" frontend --include="*.tsx" --include="*.ts" \
  | grep -vE "\.test\.|/__tests__/|// console" | wc -l
# 146
```

Recommended: enable an ESLint rule `no-console` (with `allow: ['warn', 'error']`) and fix the violations as a single sweep. Don't ship without it.

### 13. TODOs/FIXMEs

16 in production TSX/TS. Polish.md: *Remove commented code, clean up TODOs.* Triage each: convert to issue, fix, or remove the marker.

### 14. Inline `style={{...}}` with pixel values

25 matches. Most are defensible (`calc(100vh - 380px)`, `maxHeight`, `minHeight`). Two are not:

- `app/settings/security/loading.tsx:87,107` — `1px solid #eee` (use token).
- `app/admin/shifts/page.tsx:287` — `borderTop: '4px solid ${shift.colorCode}'` — banned side-stripe pattern *and* fallback `#3B82F6`. Replace with full subtle border + tinted bg using the shift color as bg accent.

### 15. Banned classes that flatten to no-op

`skeuo-emboss`, `skeuo-deboss`, `skeuo-surface`, `skeuo-card`, `skeuo-button`, `skeuo-input`, `skeuo-glass`, `skeuo-toggle`, `skeuo-table-header`. All are backward-compat shims; per DESIGN.md they should be removed during touched-file cleanup, not preserved. Phase 2 codemod can strip them.

---

## Drift root-cause summary

| Root cause | % of findings | Phase 2 strategy |
|---|---|---|
| **One-off implementation** when shared component exists | ~55% | Swap to `.card-aura`, `.btn-primary`, `.input-aura`, `.text-stat-large`. Introduce `<Stat>`, `<Callout>`, `<GoogleGLogo>` components for currently-missing primitives. |
| **Missing token** (categorical palette, signature ink, badge gradient) | ~25% | Add tokens to `globals.css`. New tokens: `--categorical-1..10`, `--signature-ink`. |
| **Conceptual misalignment** (hero-metric template, gradient-icon-tiles, modal-first) | ~20% | Per-sub-app rework in Phase 3+; cannot be codemod'd. |

## Recommended Phase 2 sequencing

1. **A11y blockers** (½ day) — remove `outline-none` strips, ensure all interactive elements rely on the global `focus-visible` rule. Verify with NVDA / VoiceOver on auth + leave-request + payslip flows.
2. **Gradient text + brand-color leakage** (½ day) — 6 files. Mechanical replace.
3. **Codemod sweep** (1 day) — strip `skeuo-emboss` / `skeuo-deboss`, swap raw `console.log` to `// removed`. Enable `no-console` lint rule.
4. **Introduce `<Stat>` + `<Callout>` + `<GoogleGLogo>` components** (½ day) — write the three primitives.
5. **First-pass replace of 90 hero-metric sites with `<Stat>`** (1 day) — mechanical.
6. **First-pass replace of 10 side-stripe callouts with `<Callout>`** (½ day) — mechanical.
7. **Decorative-gradient sweep** (1 day) — replace `bg-gradient-to-br from-X-500 to-X-700` icon-tiles with solid `bg-X-100` + `text-X-600`. Touches ~30 files.

Total Phase 2 estimate: ~5 days. After Phase 2 completes, Phase 3 (per-sub-app polish) hits a much cleaner codebase.

## Out of scope for this audit

- Per-sub-app information-architecture review (Phase 3+).
- Cross-bundle pattern consistency between HRMS / Hire / Grow / Fluence (Phase 5).
- Mantine theme audit (`frontend/styles/compact-theme.ts`) — separate pass.
- Backend code quality.
- Performance / bundle / Core Web Vitals.

---

## Evidence appendix

All scan commands re-runnable from `frontend/` directory. Counts captured 2026-05-13.

```bash
# Side-stripe candidates
grep -rnE "border-l-(2|4|8)\s+border-(red|blue|green|yellow|purple|amber|orange|emerald|rose|sky|indigo|cyan|teal|violet|pink|fuchsia|accent|brand|primary|info|success|warning|danger|nu-)" --include="*.tsx"

# Gradient text
grep -rnE "(bg-clip-text|background-clip:\s*text)" --include="*.tsx" --include="*.css"

# Hard-coded brand colors in product code
grep -rnE "#(050766|E62A32|e62a32|8939A1|8939a1|133E49|133e49)" --include="*.tsx" --include="*.ts" \
  | grep -vE "(brand|logo|Logo|preserved|--nu-)"

# outline-none without ring
grep -rnE "outline-none" --include="*.tsx" \
  | grep -vE "focus-visible|focus:ring|focus-ring|focus:shadow"

# Hero-metric candidates
grep -rnE "text-(3xl|4xl|5xl).+\b(font-bold|font-extrabold)\b" --include="*.tsx"

# Decorative gradient surfaces
grep -rnE "bg-gradient-to|background:\s*linear-gradient" --include="*.tsx" \
  | grep -vE "(skeleton|shimmer|--gradient-|var\(--nu-gradient)"

# skeuo-emboss flattened class still applied
grep -rnE "skeuo-emboss|skeuo-deboss" --include="*.tsx" | wc -l

# Console statements
grep -rnE "console\.(log|debug|info)" --include="*.tsx" --include="*.ts" \
  | grep -vE "\.test\.|/__tests__/" | wc -l
```
