# FRD — NU-AURA Visual Design / UI Quality Enhancement

**Stage:** 04 — Functional Requirements
**Derived from:** `artifacts/03-prd/prd.md`
**Note:** No Stage-01 clarify pass and no `faylo-business-analyst` edge-case artifact exist for this initiative (no `artifacts/01-clarify/answers.md` found in this repo). Edge cases below are derived directly from the QA audit evidence already cited in the BRD/PRD, not invented.

## FR-1 — Dark-Mode Variant Backfill (Epic 1)

**Inputs:** The 64 named page files (`QA_UIUX_FINDINGS.md:21`), e.g. `frontend/app/payroll/page.tsx`, `frontend/app/fluence/wiki/new/page.tsx`, `frontend/app/attendance/comp-off/page.tsx`, `frontend/app/admin/users/page.tsx` (full list in cited source). Each file's existing Tailwind utility classes with `bg-`/`text-`/`border-` prefixes and no `dark:` counterpart.

**Outputs:** Same 64 files, each utility class paired with a `dark:` variant sourced from the `dark-*` tokens in `DESIGN.md` (`dark-bg-app: #070a14`, `dark-surface: #11162a`, `dark-surface-hover: #182040`) or the existing CSS-var pattern already used elsewhere (`var(--text-primary)`, `var(--bg-card)` etc., per `design-system.ts` typography/card definitions).

**Blast radius:** 64 of 286 `page.tsx` files (22.4%) across all 4 sub-apps; no shared component changes required unless a page's dark-mode gap originates in a shared component it consumes (must be checked per-page, not assumed page-local).

**Edge cases:**
- A page may use a shared component (e.g. `StatCard`, `Card`) that itself has correct dark-mode CSS-var support — in that case the page-level gap is in page-local markup only, not the component; conflating the two would cause duplicate/conflicting dark styling.
- `bg-white` usages that are "intentional/context-safe" (overlay tints, decorative elements, toggle thumbs) per `QA_UIUX_FINDINGS.md:128` must NOT be blanket-converted to dark variants — each occurrence needs a per-instance decision, not a global find/replace.
- Root `layout.tsx` sets `overflow-x-hidden` on `<body>`; dark-mode fixes must not alter layout overflow behavior.

## FR-2 — Accessibility Attribute Backfill (Epic 2)

**Inputs:** 154 unlabeled form inputs, 476 modals/dialogs without `aria-labelledby`/`aria-label`, 37 images without `alt`, 32 icon-only buttons without `aria-label` (`QA_UIUX_FINDINGS.md:23-30`). Reference-correct implementations already in the codebase: `frontend/components/ui/SlidePanel.tsx` (full WCAG dialog contract: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` via `useId()`, focus trap, Escape-to-close, focus restore), `frontend/components/ui/AccessibleFormField.tsx` (`role="alert"` + `aria-live="polite"`), and the 16-component label-association fix set from commit `4092c0dd` (e.g. `MfaSetup.tsx`, `ReceiptScanner.tsx`, `AdvancedFilterPanel.tsx`).

**Outputs:**
- Each of the 154 inputs: an `htmlFor`/`id` pair to a visible `<label>`, or `aria-label` where no visible label is appropriate.
- Each of the 476 modals/dialogs: `role="dialog"` + `aria-modal="true"` + `aria-labelledby`/`aria-label`, matching `SlidePanel.tsx`'s contract.
- Each of the 37 images: non-empty `alt` (or `alt=""` only if the image is confirmed decorative).
- Each of the 32 icon-only buttons: `aria-label` describing the action, following the pattern from the 5 files already fixed in iteration 7 (`app/offboarding/[id]/fnf/page.tsx`, `app/offboarding/[id]/exit-interview/page.tsx`, `app/lwf/page.tsx`, `app/tax/declarations/page.tsx`, +1 unnamed file).

**Blast radius:** Cross-cutting across `frontend/app/**` and `frontend/components/**` — the 476 modal count in particular implies most feature areas (`fluence/`, `dashboard/`, `resource-management/`, `recruitment/`, etc.) are touched, not a contained subset. This is the largest-blast-radius item in the initiative.

**Edge cases:**
- Mantine's built-in `Modal`/`Drawer` components may already emit some ARIA attributes by default (Mantine 9 has its own accessibility baseline) — the 476 count must be re-verified per-instance to avoid adding redundant/conflicting `aria-*` attributes on top of Mantine's own.
- Icon-only buttons inside `PermissionGate`/`FeatureGate` wrappers that conditionally render `null` need `aria-label` added to the underlying control, not the gate wrapper.
- `AccessibleFormField.tsx`'s existing `role="alert"` pattern must be preserved exactly when new labeled fields are wired through it, to avoid double-announcing errors to screen readers.

## FR-3 — Table-Header Contrast Fix (Epic 3)

**Inputs:** `frontend/styles/tailwind-presets.ts` table-header preset (currently `text-xs text-[var(--text-muted)]`); `--text-muted` token values `#6b7190` (light) / `#7e85a3` (dark) per `DESIGN.md`.

**Outputs:** Updated preset value(s) — either a higher-contrast token for sub-12px text, or a minimum size/weight floor — verified against WCAG AA 4.5:1 in both `data-theme="light"` and `data-theme="dark"` states.

**Blast radius:** Single file (`tailwind-presets.ts`), propagates to 100+ table headers automatically (per `QA_UIUX_FINDINGS.md:38`) — a low-blast-radius, high-leverage fix. Two known page-local occurrences already identified for direct verification: `frontend/app/attendance/page.tsx` (`text-2xs text-[var(--text-muted)]`) and `frontend/app/attendance/regularization/_components/TeamRequestsView.tsx` (`text-xs text-[var(--text-muted)]`).

**Edge cases:**
- Changing `--text-muted` globally affects every other consumer of that token (captions, metadata labels per `design-system.ts` `typography.caption`), not just table headers — a global token change requires re-auditing all `--text-muted` usages for contrast, not just the table-header preset.
- If the fix is scoped to the table-header preset only (not the global token), the two page-local direct usages above will NOT inherit the fix and need separate edits.

## FR-4 — Design-System Conformance Check (Epic 4)

**Inputs:** `DESIGN.md` Do's/Don'ts list (lines 270-291); `frontend/lib/theme/design-system.ts` token exports (`layout`, `typography`, `card`, `table`, `chartColors`, `motion`, `status`, `tint`, `input`, `iconSize`); the existing `frontend/components/ui/` inventory (44 files, 38 non-test) as the canonical primitive set.

**Outputs:** A documented/automatable rule set (lint rule, PR checklist, or codemod-assisted audit script — mechanism to be decided at architecture stage) that flags: `border-left`/`border-right` > 1px used as colored accents, `background-clip: text` gradient text, decorative `blur()` on flat surfaces, `.card` nested inside `.card`, non-navy accent colors (Lapis/Red-orange/Purple/dark-teal or sub-app accent hues `prod-hrms`/`prod-hire`/`prod-grow`/`prod-fluence`) used in shared chrome rather than sub-app-scoped contexts, and hardcoded spacing/typography values that duplicate an existing `design-system.ts` export.

**Blast radius:** Tooling/process addition — does not itself modify page/component files, but gates all future changes to `frontend/app/**` and `frontend/components/**`.

**Edge cases:**
- Sub-app accent colors (`prod-hrms`, `prod-hire`, `prod-grow`, `prod-fluence`) ARE permitted in sub-app-scoped contexts (e.g. `ProductRail` app-switcher icons) per `DESIGN.md` — the rule must distinguish "chrome" (forbidden) from "sub-app identity surface" (permitted), not blanket-ban the four hues.
- `PremiumSpinner.tsx` and `Spinner.tsx` coexisting in `frontend/components/ui/` is a pre-existing duplication this rule set would flag — FR-4 does not mandate resolving pre-existing duplication, only preventing new instances, unless the architecture stage decides otherwise.

## FR-5 — Responsive Table Scroll-Container Fix (Epic 5)

**Inputs:** 15 existing `overflow-x-auto` table containers (attendance, timesheets, loans, probation, letters, referrals, expenses, projects per `QA_UIUX_FINDINGS.md:137`); `attendance/shift-swap/page.tsx` assignment grid (no scroll-container treatment, UX-09).

**Outputs:** Each of the 15 containers gets an explicit `min-width` on the inner `<table>` sized to its column count; `attendance/shift-swap/page.tsx` gets the same `overflow-x-auto` + `min-width` treatment already applied to `attendance/comp-off`, `attendance/team`, `nu-calendar`, `expenses/reports`, `expenses/[id]` (per the UX-01/02/03/07/08 CLOSED fixes).

**Blast radius:** ~16 files, isolated to table-heavy pages in NU-HRMS attendance/finance modules.

**Edge cases:**
- `min-width` values must be set per-table based on actual column count — a single global `min-width` constant would either overflow narrow tables unnecessarily or under-constrain wide ones.

## Cross-Cutting Risk for Architect Sizing

- **Total surface:** up to 286 pages and 171 components are in scope depending on epic; FR-2 (accessibility) has the widest blast radius (476 modal instances platform-wide) and should be sized as the largest ticket cluster.
- **Dual-styling-system constraint (Mantine 9 + Tailwind 3.4, unresolved per BRD Open Questions):** any fix touching a Mantine-wrapped component (modals, inputs) must account for Mantine's own theming/accessibility defaults so fixes don't duplicate or conflict with framework-level behavior — this affects FR-2 specifically.
- **No regression tooling gap identified:** `frontend/e2e/accessibility/a11y.spec.ts` already exists as an a11y-focused Playwright spec — FR-2/FR-4 acceptance should extend this existing suite rather than create a parallel one.
