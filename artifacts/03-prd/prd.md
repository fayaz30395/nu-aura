# PRD — NU-AURA Visual Design / UI Quality Enhancement

**Stage:** 03 — Product Requirements
**Derived from:** `artifacts/02-brd/brd.md`
**EARS notation:** WHEN (trigger) / IF (precondition) / SHALL (mandatory system behavior)

## Epic 1 — Dark-Mode Coverage Parity

**User story:** As a user with system dark mode enabled, I want every page in NU-HRMS, NU-Hire, NU-Grow, and NU-Fluence to render with correct dark-mode styling, so that I never hit a page that flashes light-themed and breaks the reading experience.

**Evidence:** 64/286 pages currently lack `dark:` variants (`QA_UIUX_FINDINGS.md:11-21`), against a design system that defines explicit dark tokens (`DESIGN.md` `dark-bg-app`, `dark-surface`, `dark-surface-hover`).

**Acceptance Criteria:**
- AC1.1 — WHEN a user with `color-scheme: dark` (or the app's dark-mode toggle) loads any of the 64 named pages (list in `QA_UIUX_FINDINGS.md:21`, e.g. `/app/payroll/page.tsx`, `/app/fluence/wiki/new/page.tsx`), the SHALL system render all surfaces, text, and borders using the `dark-*` tokens defined in `DESIGN.md`, not the light-mode defaults.
- AC1.2 — IF a page introduces a new Tailwind utility class with a `bg-`, `text-`, or `border-` prefix, THEN the SHALL system require a corresponding `dark:` variant be present before merge (enforced by the tooling in Epic 4).
- AC1.3 — WHEN dark-mode coverage is re-measured with `grep -rl "dark:" frontend/app | wc -l` against `find frontend/app -name page.tsx | wc -l`, the SHALL system report 286/286 (100%) pages with at least one `dark:` variant.

## Epic 2 — Accessibility Remediation (WCAG A/AA)

**User story:** As a user of assistive technology (screen reader, voice control), I want every interactive control and image to be programmatically labeled, so that I can operate every page without ambiguity.

**Evidence:** `QA_UIUX_FINDINGS.md:23-30,174-177` — 154 inputs without labels, 476 modals without `aria-labelledby`/`aria-label`, 37 images without alt text, 32 icon-only buttons without `aria-label`; existing PASS baselines to preserve: `SlidePanel.tsx` full dialog contract, `AccessibleFormField.tsx` (`role="alert"`+`aria-live`), `Toast.tsx`, `PremiumSpinner.tsx`, skip-link in `app/layout.tsx:79`.

**Acceptance Criteria:**
- AC2.1 — WHEN a form field is rendered anywhere in `frontend/app/**` or `frontend/components/**`, the SHALL system associate it with a `<label>` via `htmlFor`/`id` (matching the pattern already verified in commit `4092c0dd`'s 16-component fix set) or an explicit `aria-label`.
- AC2.2 — WHEN a modal/dialog/drawer component (`Modal.tsx`, `SlidePanel.tsx`, or any Mantine `Modal`/`Drawer` usage) is opened, the SHALL system expose `role="dialog"`, `aria-modal="true"`, and either `aria-labelledby` (pointing to a visible title) or `aria-label` — matching the existing `SlidePanel.tsx` contract as the reference implementation.
- AC2.3 — WHEN an `<img>` or icon-only `<button>`/`ActionIcon` is rendered, the SHALL system provide non-empty `alt` text or `aria-label` describing its function, following the pattern already applied in the 5 files fixed in iteration 7 (`offboarding/[id]/fnf`, `offboarding/[id]/exit-interview`, `lwf`, `tax/declarations`).
- AC2.4 — IF a new component is added to `frontend/components/ui/` that renders a dialog, form input, or icon-only control, THEN the SHALL system require the corresponding a11y attributes as a condition of the component being accepted into the shared library (enforced by Epic 4 tooling).
- AC2.5 — WHEN this epic is complete, the SHALL system show all four issues A11Y-01 through A11Y-04 (`QA_UIUX_FINDINGS.md:174-177`) reported as CLOSED under the same audit methodology that opened them.

## Epic 3 — Color-Contrast & Typography Conformance

**User story:** As a user reading dense tables (attendance, payroll, timesheets), I want header and metadata text to meet WCAG AA contrast in both light and dark mode, so that small text stays legible.

**Evidence:** `QA_UIUX_FINDINGS.md:32-38` — `--text-muted` token at `text-xs`/`text-2xs` sizes is borderline-to-failing AA 4.5:1, applied globally via `frontend/styles/tailwind-presets.ts` table-header preset used across 100+ table headers.

**Acceptance Criteria:**
- AC3.1 — WHEN any text rendered at `text-xs` (12px) or smaller uses the `--text-muted` token, the SHALL system guarantee a contrast ratio ≥ 4.5:1 against its background in both light and dark color schemes, by either raising the token's luminance delta or requiring a larger/bolder treatment at that size.
- AC3.2 — WHEN `frontend/styles/tailwind-presets.ts`'s table-header preset is updated to satisfy AC3.1, the SHALL system apply the fix once at the preset level so all 100+ consuming table headers inherit it without per-page edits.
- AC3.3 — IF a page overrides the shared table-header preset with a page-local class combining a muted text token and a sub-12px size, THEN the SHALL system flag it as a design-system violation per `DESIGN.md`'s token-usage rules.

## Epic 4 — Design-System Conformance Enforcement

**User story:** As a frontend engineer, I want a way to know when a change violates the documented Studio Slate v2 rules, so that visual drift doesn't reaccumulate after this initiative closes.

**Evidence:** `DESIGN.md:270-291` (Do's/Don'ts: no >1px border-stripe accents, no gradient text, no decorative glassmorphism, no nested cards, no off-palette accent colors in chrome, no reintroduced skeuomorphic shadows); `Components.md:238` (Mantine + Tailwind dual-styling drift risk).

**Acceptance Criteria:**
- AC4.1 — WHEN a pull request modifies any file under `frontend/app/**` or `frontend/components/**`, the SHALL system check the diff against the `DESIGN.md` Do's/Don'ts list (border-stripe accents, `background-clip: text` gradient text, decorative `blur()` glass on flat surfaces, nested `.card`-in-`.card` structures, non-navy accent colors in shared chrome) and surface a warning on violation.
- AC4.2 — WHEN a new shared UI primitive is proposed for `frontend/components/ui/`, the SHALL system require it to reuse existing `design-system.ts` tokens (`layout`, `typography`, `card`, `table`, `status`, `input`, `iconSize`) rather than hardcoding spacing/typography values, consistent with the file's own stated purpose ("Import these constants instead of hardcoding Tailwind classes").
- AC4.3 — IF a proposed component duplicates the responsibility of an existing `ui/` primitive (e.g. a second spinner alongside `Spinner.tsx` and `PremiumSpinner.tsx`), THEN the SHALL system require justification or consolidation before it is added, to prevent further component-library sprawl beyond the current 171-component / 226-service-wrapper footprint (`Components.md:23,232-234`).

## Epic 5 — Responsive Polish

**User story:** As a user on a narrow viewport or a dense data table, I want tables and grids to remain usable without column collapse or unlabeled horizontal scroll.

**Evidence:** `QA_UIUX_FINDINGS.md:133-146` — Responsive Score 82/100; `overflow-x-auto` used on 15 table containers but some lack `min-width` constraints (risk at 320px); `attendance/shift-swap/page.tsx` complex assignment grid lacks an explicit scroll-container treatment (UX-09, OPEN).

**Acceptance Criteria:**
- AC5.1 — WHEN a table wider than its container is rendered on a viewport ≤ 320px, the SHALL system provide a horizontally scrollable container (`overflow-x-auto`) with an explicit `min-width` on the inner table so columns do not visually collapse.
- AC5.2 — WHEN `attendance/shift-swap/page.tsx`'s assignment grid is rendered at ≤ 320px, the SHALL system apply the same scroll-container treatment verified elsewhere (UX-09 resolution), closing the one remaining OPEN responsive finding.

## Traceability to BRD Success Metrics

| PRD Epic | BRD Success Metric |
|---|---|
| Epic 1 | Dark-mode coverage 222/286 → 286/286 |
| Epic 2 | A11Y-01…A11Y-04 OPEN → CLOSED |
| Epic 3 | Contrast risk in `--text-muted` table-header preset resolved |
| Epic 4 | 0 `DESIGN.md` Do's/Don'ts violations; component sprawl contained |
| Epic 5 | Responsive Score 82/100 → no remaining OPEN responsive findings |

## Open Questions Carried Forward from BRD

- No confirmed business owner/threshold for the success metrics (BRD Section 3) — PRD acceptance criteria use the audit's own re-measurement methodology as the closure bar in the absence of a stakeholder-set target.
- Mantine/Tailwind consolidation is out of scope for this PRD; Epic 4 only enforces token discipline within the current dual-system reality.
