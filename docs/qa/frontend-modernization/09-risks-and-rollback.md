# Risks & Rollback

| # | Risk | Likelihood | Impact | Mitigation | Rollback |
|---|---|---|---|---|---|
| R1 | Elevation layer leaks into operator screens (density loss) | Med | High | Opt-in scope only; route-allowlist on `AppLayout`; tokens inert until `data-altitude` set; explicit exclusion list in `04`. | Remove attribute from leaked route. |
| R2 | Dashboard decomposition drops/alters a role branch | Med | **Critical** | Preserve 3 `Array.push` predicates verbatim; role-matrix test (5 roles) asserts identical widget sets; keep original file until parity verified. | File swap to original `page.tsx`. |
| R3 | `ProfileHero` changes a permission-gated action's visibility | Low | High | Actions passed through existing `PermissionGate`s; per-screen RBAC checklist in `08`. | Revert consumer to inline hero. |
| R4 | Visual validation blocked — no EMPLOYEE-role session | **High** | Med | Provision real EMPLOYEE login or seed demo account **before** Epic B validation (decision #2). | Validate with TEAM_LEAD + note RBAC-trim delta; do not ship unvalidated employee screens. |
| R5 | Warm surface shift fails dark-mode / contrast (WCAG AA) | Med | Med | Validate warm-charcoal surfaces light+dark; check contrast on `#221D17` band vs text; accent `#2952A3` unchanged. | Fall back to "light/space/photo only" treatment (cool slate) — token block swap. |
| R6 | Skeleton standardization breaks a `loading.tsx` import | Med | Low | Phased migration, employee routes first; build+typecheck each batch. | Per-file revert. |
| R7 | Card-grid view state (URL/localStorage) regresses table users | Low | Med | Default `table` retained for operators; both views preserved; no feature loss. | Drop persistence, keep `useState`. |
| R8 | CLS introduced by new skeleton geometry mismatch | Low | Med | Match skeleton dims to real content (D2); measure CLS at 375/1440. | Revert skeleton to prior. |
| R9 | Monolith split exceeds diff-review budget | Med | Low | Section-by-section commits; clean diffs for Codex review; ≤500 lines/file. | Squash/re-split. |
| R10 | Token drift fixes (accent/radius) scope-creep into redesign | Low | Low | Recorded as out-of-scope in `01`/`03`; not bundled with elevation work. | N/A (not undertaken). |

## Hard guardrails
- **No worktree isolation** in this repo (documented corruption hazard). Serial writes on `main`.
- **No code until this gate is approved.** Docs only so far.
- Every implementation item ends in a **PAUSE for review** (per `07`).
- External **Codex review** pass expected — keep diffs clean and reviewable.

## Open decisions for owner
1. **EMPLOYEE session** provisioning method (real login vs seeded demo account vs demo-flag) — blocks Epic B validation.
2. **Compensation create-gate** security fix (`08` ⚠️) — separate task; approve scope/owner.
3. Proceed order confirmation: A → B → {C,D,E} → F.
