# NU-AURA Frontend Experience Modernization

**Status:** Design review board complete (Phases 0–4). **Awaiting approval before implementation.**
**Date:** 2026-06-22 · **Scope:** frontend/ (Next.js 16 App Router) · **Method:** parallel read-only discovery → synthesis → scored audit → opt-in design layer → serial implementation plan.

## Objective
Introduce a **second visual altitude** — an opt-in "Studio Slate Elevation Layer" for **employee-facing** screens (warm, human, photo-forward; refs HiBob/Personio/Lattice). **Operator/admin screens stay dense.** This is a design-system evolution + composition refactor, **not** a product redesign.

## Non-goals
No features added/removed · no workflow/RBAC/API/business-logic/navigation changes · no new modules · no heavy deps · no glassmorphism/gradients/neon.

## Decisions taken (recorded)
1. **Phase 1 method:** synthesize from Phase 0 evidence (no re-fan of audit agents).
2. **EMPLOYEE-session validation gap:** noted; design proceeds; a real EMPLOYEE login or seeded demo account must be provisioned **before** Phase-3 visual validation / implementation. (No plain-EMPLOYEE demo account exists today — closest is TEAM_LEAD.)
3. **Warmth level:** **warm-neutral surface shift.** Light `bg #FAF8F5 / card #FFFFFF / hero-band #F4EFE9`; Dark `bg #14110E / card #1C1813 / hero-band #221D17`; accent `#2952A3` unchanged; radius 16–24px; soft warm-tinted shadows.

## Documents
| # | File | Phase |
|---|---|---|
| 01 | `01-discovery-and-inventories.md` | 0 — inventories + dependency maps |
| 02 | `02-consolidation-report.md` | 0 — duplicate consolidation |
| 03 | `03-audit-scored.md` | 1 — scored & ranked findings |
| 04 | `04-elevation-token-proposal.md` | 2 — opt-in token layer |
| 05 | `05-screen-strategies.md` | 3 — directory/profile/loading/empty/responsive |
| 06 | `06-dashboard-architecture.md` | 3 — dashboard maps + decomposition |
| 07 | `07-implementation-plan.md` | 4 — Epic→Subtask, dependency-ordered |
| 08 | `08-rbac-impact-report.md` | Pre-impl gate — presentation-only confirmation |
| 09 | `09-risks-and-rollback.md` | Risks + rollback strategy |

## Codebase scale (verified)
289 `page.tsx` · 84 route segments (no parenthesized groups) · 4 sub-apps (HRMS ~205, Grow ~29, Fluence 19, Hire ~16) · token layer centralized on `globals.css` CSS vars (Mantine + Tailwind + `design-system.ts` alias in; `DESIGN.md` canonical).

## Headline opportunity
~9,700–10,300 removable lines across ~426 files (consolidation), with the highest-value/lowest-cost band being the **identity layer**: one `ProfileHero` + rendering employee photos we already store + a shared `Avatar` primitive.
