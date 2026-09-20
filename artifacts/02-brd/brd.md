# BRD — NU-AURA Visual Design / UI Quality Enhancement

**Engagement:** nu-aura (internal platform, not a client engagement — see Open Questions)
**Stage:** 02 — Business Requirements
**Source request:** "Enhance the platform's visual design/UI quality"
**Business-context input:** none provided at `business-context/` — no Stage 01 clarify pass was triggered and no engagement-specific business-context file exists in this repo. This BRD is grounded instead in the platform's own evidence base (design system spec, QA audit findings, architecture docs) per the rule against inventing business rules. Gaps that would normally come from `business-context/` are called out under Open Questions rather than assumed.

## 1. Problem Statement

NU-AURA ships a codified design system ("Studio Slate v2", `DESIGN.md`) with explicit tokens (color, typography, radius, spacing, component specs) and explicit anti-patterns ("Do's and Don'ts", `DESIGN.md:270-291` — no >1px colored border stripes, no gradient text, no decorative glassmorphism, no nested cards, no off-palette accent colors in chrome). Independent QA audits (`qa-reports/qa-100x/QA_UIUX_FINDINGS.md`, `qa-reports/qa-100x/QA_RELEASE_READINESS_REPORT.md`, iteration 7, 2026-06-18) show the shipped UI has drifted from that spec and from baseline accessibility/responsive standards at a scale that is a business risk, not cosmetic noise:

- **Dark mode inconsistency:** 64 of 286 pages (22.4%) have zero `dark:` Tailwind variants — a codified design-system requirement (`DESIGN.md` defines `dark-bg-app`, `dark-surface`, `dark-surface-hover` tokens) that is unmet on nearly a quarter of the product surface (`QA_UIUX_FINDINGS.md:11-21`).
- **Accessibility scale gaps:** 154 inputs without labels, 476 modals/dialogs without `aria-labelledby`/`aria-label`, 37 images without alt text, 32 icon-only buttons without `aria-label` — all WCAG Level A/AA failures (`QA_UIUX_FINDINGS.md:23-30`, issues A11Y-01…A11Y-04).
- **Color-contrast risk:** the `--text-muted` token combined with `text-xs`/`text-2xs` utility classes is used across 100+ table headers via `frontend/styles/tailwind-presets.ts` and is borderline-to-failing WCAG AA 4.5:1 contrast, especially in dark mode (`QA_UIUX_FINDINGS.md:32-38`).
- **Two competing styling systems in production:** Mantine 9 (`@mantine/core`) and Tailwind 3.4 are both active with no single source of truth reconciling them; `docs/obsidian/03-Frontend/Components.md:238` names this explicitly as a risk ("Mantine + Tailwind dual styling... uncoordinated tokens risk visual drift").
- **Component-library duplication risk:** 226 `lib/services/*` wrappers sit over 93 domain query hooks and Orval-generated clients (`Components.md:232-234`) — a parallel indirection layer unrelated to UI but evidence of the same "add rather than align" pattern QA finds in the component layer (e.g. `PremiumSpinner` vs `Spinner`, both present in `frontend/components/ui/`).
- **Independently confirmed by internal QA scoring:** overall release-readiness sat at 93/100 CONDITIONAL-GO as of iteration 7, with UI/UX explicitly named as one of the scored domains and dark mode / accessibility left OPEN rather than CLOSED (`QA_RELEASE_READINESS_REPORT.md:17-30,74-78`).

This is a live-product quality-debt problem: the design system exists and is documented, but enforcement and coverage lag the sanctioned spec across a 286-page, 171-component surface spanning all four sub-apps (NU-HRMS, NU-Hire, NU-Grow, NU-Fluence).

## 2. Target Users

- **All authenticated end users of the 4 sub-apps** (9 RBAC roles per `docs/obsidian/05-RBAC/`, 22 roles per QA seed audit) — every role navigates the same shared `AppLayout`/`ProductRail`/`NavPanel`/`TopBar` shell (`Components.md:73-83`), so shell-level and primitive-level (`ui/`) fixes have platform-wide reach.
- **Users who rely on assistive technology** — directly affected by the 154 unlabeled inputs, 476 under-labeled modals, and 32 unlabeled icon buttons (`QA_UIUX_FINDINGS.md:23-30`).
- **Users on dark-mode system settings** — directly affected by the 64 pages with no dark-mode variants (`QA_UIUX_FINDINGS.md:11-21`).
- **Frontend engineers building new pages/components** — the design-system-vs-implementation gap and the Mantine/Tailwind dual-styling risk make it easy to introduce further drift; this population is a secondary beneficiary of any enforcement tooling this initiative produces.

## 3. Success Metric

No target-setting business stakeholder or KPI owner is named in any available document — this is an internal engineering-quality initiative, not a customer-facing feature with a product-analytics baseline. In the absence of a business-context file specifying a committed metric, the following are proposed as measurable, evidence-anchored targets (to be confirmed by whoever owns platform quality gates, since no such owner is documented):

- **Dark-mode coverage:** 222/286 (77.6%) → 286/286 (100%) pages with `dark:` Tailwind variants, re-measured via the same method as `QA_UIUX_FINDINGS.md:16-17` (`grep -rl "dark:" frontend/app`).
- **Accessibility scale issues:** 0 of the 4 open A11Y issues (A11Y-01 through A11Y-04, `QA_UIUX_FINDINGS.md:174-177`) remaining OPEN; specifically 0 unlabeled inputs (currently 154), 0 unlabeled icon-only buttons (currently 32), 0 unlabeled modals (currently 476), 0 images without alt (currently 37).
- **Design-system conformance:** 0 violations of the documented `DESIGN.md` Do's/Don'ts list (border-stripe accents, gradient text, decorative glass, nested cards, off-palette chrome colors) across `frontend/app/**` and `frontend/components/**`, spot-checked by the same audit methodology used in `qa-reports/qa-100x/`.
- **QA UI/UX sub-score:** re-run the iteration-7 audit methodology and confirm the UI/UX-attributable findings move from OPEN to CLOSED, contributing to a higher overall release-readiness score than the last recorded 93/100 (`QA_RELEASE_READINESS_REPORT.md:17`).

## 4. Scope

In scope: the shared component library (`frontend/components/ui/`, 44 files / 38 non-test), the app shell (`layout/`, `shell/`), page-level Tailwind/Mantine usage across all 286 `page.tsx` routes, the `frontend/lib/theme/design-system.ts` token layer, dark-mode variant coverage, WCAG-relevant markup (labels, aria attributes, alt text, contrast), and responsive/visual polish (`sm:`/`md:`/`lg:`/`xl:` breakpoint usage, `overflow-x-auto` table containers).

Out of scope (unless a later stage's edge-case pass surfaces a hard dependency): backend APIs, RBAC/permission logic, the Mantine 9 vs Tailwind consolidation decision itself (flagged as an open architectural question, not resolved here), and net-new features/pages.

## 5. Open Questions (missing business rules — not assumed)

1. **No `business-context/` file exists for this initiative.** The BRD is grounded in code-level evidence (QA reports, `DESIGN.md`, Obsidian frontend docs) in its place. If a business stakeholder has a different problem framing, target user priority, or success metric, this BRD must be amended before PRD work proceeds further.
2. **No named business owner or committed success-metric threshold.** The metrics in Section 3 are proposed, not confirmed by a stakeholder — flagging per the "must not invent business rules" constraint rather than presenting them as agreed targets.
3. **Mantine 9 vs Tailwind consolidation** is identified as a structural risk (`Components.md:238`) but no business decision exists on whether to consolidate to one system, keep both under stricter governance, or defer. This BRD does not resolve it and treats current dual-system reality as a constraint, not a target state.
4. **Budget/timeline** are not specified anywhere in the available documentation; this initiative is scoped by evidence volume (pages/components/findings) only.

## 6. Related Evidence

- `DESIGN.md` — Studio Slate v2 design system (tokens, do/don't rules)
- `qa-reports/qa-100x/QA_UIUX_FINDINGS.md` — iteration 7 UI/UX audit (dark mode, accessibility, contrast, empty states, responsive)
- `qa-reports/qa-100x/QA_RELEASE_READINESS_REPORT.md` — overall scoring context (93/100 CONDITIONAL-GO)
- `docs/obsidian/03-Frontend/Components.md`, `docs/obsidian/03-Frontend/Pages.md` — component/page inventory and Mantine/Tailwind risk note
- `docs/obsidian/01-Architecture/Architecture-Decisions.md` (D8) — Next.js/frontend architecture context
- `frontend/lib/theme/design-system.ts` — token/utility source of truth for spacing, typography, cards, tables, status badges
