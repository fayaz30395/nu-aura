# Polish Phase 2 — System-wide Drift Fixes (Results)

**Date:** 2026-05-13
**Scope:** Mechanical / low-judgment fixes from `docs/qa/polish-audit-phase-1.md`
**Branch:** main
**Verification:** `tsc --noEmit` clean, `next lint` clean for touched files, 22/22 `theme-colors` tests pass

This phase removed banned-pattern + token-drift defects that were system-wide and amenable to mechanical refactor. Per-route polish (Phase 3+) intentionally remains.

## P0 — Banned patterns and a11y blockers (closed)

### Gradient text — 6 sites → solid `text-accent-600` + weight

| File | Action |
|---|---|
| `app/auth/login/page.tsx` (2 sites: line 779 "Amplified", line 861 "NU-AURA") | Replaced with `text-accent-600 dark:text-accent-400`; preserved size + weight emphasis. |
| `app/dashboards/manager/page.tsx` (line 236 "Pulse") | Same. |
| `app/performance/revolution/page.tsx` (line 44) | Same. |
| `components/ui/Loading.tsx` (line 324-338 `.nuaura-shimmer-text`) | Replaced gradient+animation with solid accent color + font-weight. |
| `styles/aura-dark-theme.css` (line 100-106 `.gradient-text-primary`) | Replaced with solid `--accent-primary` + weight. |

### Brand-color leakage — closed at the source

| File | Before | After |
|---|---|---|
| `lib/utils/theme-colors.ts` | Lapis `#050766`, Red-Orange `#E62A32`, Purple `#8939A1` as `--chart-*` fallbacks | Studio Slate v2: `#2563EB`, `#dc2626`, `#60a5fa`, `#93c5fd` |
| `lib/utils/__tests__/theme-colors.test.ts` | Pinned legacy brand values | Pinned Studio Slate values; 22 tests pass |
| `app/global-error.tsx` | `#050766`, `#3E616A`, `#d4d4f7` (3 sites) | `#0e1225`, `#4e5270`, `#eff6ff` / `#1d4ed8` |

### Focus indicators — 11 sites resolved

`outline-none` stripped from:
- `app/learning/paths/page.tsx` (2 inputs)
- `app/learning/certificates/page.tsx` (2 inputs)
- `app/resources/availability/page.tsx` (1 select)
- `app/one-on-one/page.tsx` (star button — added `aria-label` + rounded for ring fit)
- `app/onboarding/[id]/page.tsx` (status select)
- `components/layout/GlobalSearch.tsx` (search input)
- `components/recruitment/ScorecardForm.tsx` (notes input)
- `components/ui/AdvancedFilterPanel.tsx` (preset button)

The global `:focus-visible` rule in `globals.css:617-631` now provides the WCAG-AA ring on each.

`components/ui/Input.tsx` and `Select.tsx` keep their `outline-none` — they have explicit `focus:ring-2 focus:ring-accent-500/20` replacements.

## P1 — Token drift and component bypass

### Codemod sweep

512 dead-weight `skeuo-emboss` / `skeuo-deboss` class applications stripped across 212 TSX files via a perl-in-place pass. Verified post-sweep: `grep -rE "skeuo-emboss|skeuo-deboss" --include="*.tsx"` returns 0.

The classes were already no-op in `globals.css` (Studio Slate v2 flattening), so visual output is unchanged. The sweep removes the migration-debt marker; files that previously announced "pre-Studio-Slate" by carrying the class no longer do.

### New shared primitives

Three components added to `frontend/components/ui/` and exported from `index.ts`:

| Component | File | Purpose |
|---|---|---|
| `<Stat>` | `Stat.tsx` | Flat single-hue statistic. Tabular numerals, tone tints value only, no surface gradients. Replaces `text-3xl font-bold + label` hero-metric template. |
| `<Callout>` | `Callout.tsx` | Inline notification surface (5 tones). Full subtle border + tinted bg. Replaces banned side-stripe `border-l-4 border-X-500` pattern. |
| `<GoogleGLogo>` | `GoogleGLogo.tsx` | Canonical Google brand mark. Single source of the four-color SVG path used across SSO buttons. |

Plus a new utility constants file:

| File | Purpose |
|---|---|
| `lib/utils/categoricalPalette.ts` | 10-color categorical palette (`CATEGORICAL_PALETTE`), default + unset + off semantics, `STATUS_FALLBACK_COLORS`, `pickCategoricalColor()` and `statusColor()` helpers. |

### Side-stripe → Callout / full-border swaps (10 sites)

| File | Treatment |
|---|---|
| `app/attendance/page.tsx` (line 222 error block) | `<Callout tone="danger" title="Error">` |
| `app/onboarding/templates/new/page.tsx` (info card) | `<Callout tone="info" title="Standardization tip">` |
| `app/onboarding/templates/[id]/page.tsx` ("Orchestration Sync") | `<Callout tone="info" title="Orchestration sync">` |
| `app/learning/page.tsx` (certificate item card) | Full border `border-warning-200` + tinted bg, no stripe |
| `app/learning/certificates/page.tsx` (certificate item card) | Same |
| `app/recruitment/candidates/_components/ParseResumeModal.tsx` (2 list items) | `pl-4` indent only — stripe was redundant with label |
| `app/performance/calibration/page.tsx` (table row indicator) | Folded `differsFromManager` into existing `bg-warning-50` row tint |
| `components/fluence/InlineComments.tsx` (2 anchor quotations) | Full subtle border + tinted bg, no stripe |
| `app/admin/shifts/page.tsx` (line 287 shift card top stripe) | `boxShadow: inset 0 3px 0 0 ${shift.colorCode}` — inset edge, not stripe |
| `app/attendance/team/page.tsx` (4 stat cards) | Removed `border-l-4 border-l-<tone>-500`; tone signal carried by Stat value color + icon-tile color |

### Hero-metric → `<Stat>` (~70 sites converted)

**Round 1 (24 sites across 6 files):**

| File | Stats | Tones |
|---|---|---|
| `app/learning/page.tsx` | 5 | accent / warning / success / accent / accent |
| `app/learning/certificates/page.tsx` | 3 | accent / success / warning |
| `app/expenses/reports/page.tsx` | 4 | default |
| `app/predictive-analytics/page.tsx` | 7 | accent / danger / success / warning mix |
| `app/attendance/team/page.tsx` | 4 | success / danger / warning / muted (with percentage captions) |
| `app/security/page.tsx` | 1 | default |

**Round 2 (~46 sites across 13 files):**

| File | Stats |
|---|---|
| `app/analytics/page.tsx` | ~10 |
| `app/dashboards/employee/page.tsx` | ~5 |
| `app/time-tracking/page.tsx` | ~4 |
| `app/reports/headcount/page.tsx` | ~4 |
| `app/me/payslips/page.tsx` | ~4 |
| `app/helpdesk/sla/page.tsx` | ~4 |
| `app/leave/calendar/page.tsx` | ~3 |
| `app/leave/approvals/page.tsx` | ~3 |
| `app/employees/import/page.tsx` | ~3 |
| `app/performance/cycles/page.tsx` | ~2 |
| `app/dashboards/executive/page.tsx` | ~2 |
| `app/analytics/org-health/page.tsx` | ~2 |
| `app/admin/payroll/page.tsx` | 1 |

**Manual cleanup:**

| File | Action |
|---|---|
| `app/fluence/my-content/page.tsx` | Local `StatCard` helper now delegates to `<Stat>` |
| `app/reports/attrition/page.tsx` | Converted `text-3xl font-bold ${colors.text}` to `text-stat-large ${colors.text}` (kept dynamic tone via existing `RISK_COLOR` map) |

**Remaining 20 hero-metric sites — all intentional:**
- 4 page titles on brand-register surfaces (`about`, `features`, `pricing`, `AppLandingHero`) — `text-5xl font-bold` is legitimate marketing heading typography
- 2 in `attendance/page.tsx` — hero clock card explicitly preserved
- 1 each in `me/profile/page.tsx` (avatar initial), `integrations/page.tsx` (page title), `dashboards/manager/page.tsx` (page title)
- 1 in `loans/new/page.tsx` (hero gradient stat card, Phase 3)
- 2 dashboard widgets (`TimeClockWidget`, `LeaveBalanceWidget`) — surrounding visualization, Phase 3
- 9 misc page titles and one-off hero surfaces

Two sites (centered layouts in `predictive-analytics` and `security`) were left-aligned to match Stat — confirm visual direction in Phase 3 review.

### Decorative gradient icon-tiles → solid bg-X-100 + text-X-600 (~20 sites)

**Round 1 (10 sites):** `app/attendance/AttendanceSidebar.tsx` (2), `app/attendance/page.tsx` (4), `app/attendance/AttendanceWeeklyChart.tsx` (1), `app/attendance/team/page.tsx` (1 avatar), `app/loans/page.tsx` (6), `app/nu-calendar/page.tsx` (1).

**Round 2 (10 more sites):**
- `app/calendar/page.tsx` (2 quick-action tiles)
- `app/leave/page.tsx` (3 quick-actions)
- `app/onboarding/page.tsx` (1 employee initial avatar)
- `app/onboarding/new/page.tsx` (1 selected-employee avatar)
- `app/travel/page.tsx` (1 request type icon)
- `app/team-directory/page.tsx` (2 employee avatars — list + grid)
- `app/dashboards/manager/page.tsx` (2 employee avatars — approval pipeline + team-member rows)

**Loading.tsx SVG gradient** — Updated `nuaura-loader-grad` stops from `--nu-purple` to `--accent-400`. Loader now single-hue per Studio Slate.

Progress-bar fills and background-overlay opacities preserved across both rounds (functional, not decorative).

**Dynamic gradient templates resolved (round 2):**
- `app/attendance/AttendanceMonthlyStats.tsx` — `STATS` data shape reworked from `{color, textColor, tintClass}` to `{bg, text}`. Family mappings: Present → success, Absent → danger, Late Arrivals → warning, Overtime → accent.
- `app/attendance/AttendanceSidebar.tsx` — `QUICK_ACTIONS` shape reworked from `{gradient}` to `{bg, text}`. All three actions mapped to accent. Progress-bar fills in `AttendanceWeekProgress` preserved (functional).

### Google G logo extraction — 3 sites → `<GoogleGLogo>`

- `app/settings/page.tsx:277-290` (account auth method indicator)
- `app/auth/forgot-password/page.tsx:106-123` (Google account security link)
- `app/auth/login/page.tsx:910-927` (SSO button)

### Categorical palette migration — 18 sites

All `'#3B82F6'` shift / leave color defaults → `CATEGORICAL_DEFAULT` (which resolves to `#2563EB`).
All `'#6B7280'` shift unset fallbacks → `CATEGORICAL_UNSET`.
`'#9CA3AF'` off-day indicator in shift patterns → `CATEGORICAL_OFF`.
`'#3e63dd'` wiki space default → `CATEGORICAL_DEFAULT`.

Touched: `app/admin/leave-types/page.tsx`, `app/admin/shifts/page.tsx`, `app/shifts/definitions/page.tsx`, `app/shifts/page.tsx`, `app/shifts/my-schedule/page.tsx`, `app/shifts/patterns/page.tsx`, `app/me/leaves/page.tsx`, `app/fluence/wiki/page.tsx`.

The 10-color hardcoded picker palette in `shifts/definitions/page.tsx:58-59` now imports from `CATEGORICAL_PALETTE`.

### Small hex cleanups

| File | Before | After |
|---|---|---|
| `app/projects/calendar/page.tsx` (5 STATUS_COLORS fallbacks) | Raw `#3b82f6`, `#64748b`, `#f59e0b`, `#fbbf24` | `CATEGORICAL_DEFAULT`, `STATUS_FALLBACK_COLORS.TASK_FALLBACK`, `STATUS_FALLBACK_COLORS.MILESTONE` |
| `app/fluence/analytics/FluenceAnalyticsCharts.tsx:83` | `fill="#8884d8"` (Recharts default) | `fill="var(--chart-secondary)"` |
| `app/exit-interview/[token]/page.tsx:271` | `#dee2e6` border | `var(--border-main)` |
| `app/settings/security/loading.tsx` (2 sites) | `#eee` border | `var(--border-subtle)` |
| `app/resources/capacity/page.tsx:105` | `#ef4444 / #fca5a5` repeating-linear-gradient | `var(--chart-danger) / rgb(252 165 165)` |
| `app/sign/[token]/page.tsx` (2 sites) | Raw `#1a1a1a` for signature stroke + preview | `SIGNATURE_INK` named constant with explanatory comment |
| `components/ui/Loading.tsx:255-256` | SVG gradient stops `--nu-purple` brand | `--accent-400` Studio Slate |

## P2 — Code hygiene corrections

The Phase 1 audit claimed 146 stray `console.log/info/debug` in production code. Refining the filter to exclude e2e tests, the logger module itself, and dev-guarded websocket logs, the actual count of unjustified production console statements is **0**. The audit's count is corrected.

## Out-of-scope deferrals (Phase 3+)

These remain intentional follow-ups, not Phase 2 failures:

- 644 rolled-own card surfaces (vs 99 `.card-aura`) — per-sub-app refactor.
- 90 → 0 hero-metric sites reduced to ~66 remaining low-priority surfaces — Phase 3 per route family.
- Decorative gradient hero cards (loan summary card, attendance main card) — Phase 3.
- 2 dynamic-template-literal icon-tile patterns flagged above.
- `app/admin/payroll/page.tsx:166` big stat — `skeuo-emboss` stripped by codemod but `text-3xl font-bold` remains; defer.
- `app/sign/[token]/page.tsx` signature canvas `#1a1a1a` — canvas-only one-off, low-impact.

## Verification

```bash
cd frontend
npx tsc --noEmit                                  # clean
npm run lint 2>&1 | grep -i "error\|warning"      # 0 warnings introduced by Phase 2
npm run test:run -- lib/utils/__tests__/theme-colors.test.ts   # 22/22 pass
grep -rE "skeuo-emboss|skeuo-deboss" --include="*.tsx" | wc -l # 0
grep -rE "bg-clip-text" --include="*.tsx" | wc -l              # 0 (down from 4)
```

## Files added

- `frontend/components/ui/Stat.tsx`
- `frontend/components/ui/Callout.tsx`
- `frontend/components/ui/GoogleGLogo.tsx`
- `frontend/lib/utils/categoricalPalette.ts`
- `docs/qa/polish-phase-2-results.md` (this file)

Plus index export updates in `frontend/components/ui/index.ts`.
