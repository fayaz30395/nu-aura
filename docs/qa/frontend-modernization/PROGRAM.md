# NU-AURA FRONTEND MODERNIZATION — Program Brief (canonical)

> This is the persisted program prompt. The **AUTH BINDING** below is an amendment added
> 2026-06-22 per user instruction ("always use demo account") and takes precedence over any
> ad-hoc account choice. Full verified session details: [`auth-inventory.md`](./auth-inventory.md).

## AUTH BINDING (standing — do not deviate)
- **Always use the low-privilege demo employee account** for every runtime verification step
  (baseline, network-parity, axe, screenshot-diff, keyboard/landmark).
- Canonical account: **`arun@nulogic.io` / `Welcome@123`** — roles `["EMPLOYEE"]`, employeeId
  `48000000-e001-0000-0000-000000000009`. Backup: `anshuman@nulogic.io` / `Welcome@123`.
- Run authenticated checks **only on the HTTPS live frontend** https://hrms-frontend-vert.vercel.app
  (local HTTP cannot hold `Secure` cookies). Static gates (tsc/test/lint/build) run locally.
- If demo logins are disabled on live (SEC-3b), employee-session verification becomes unreachable →
  STOP and report; do not produce an empty baseline or push unverified runtime claims.

---

## MISSION
Modernize EMPLOYEE-FACING experiences with a Studio Slate "Elevation Layer" while preserving all
existing RBAC, workflows, APIs, queries, and operator density. Presentation-only.

## AUTONOMY
Fully autonomous end-to-end: DISCOVER → AUDIT → BASELINE → TOKEN SOURCE → DESIGN EXPLORATION →
IMPLEMENT, committing + pushing PR-ready diffs per screen on `main`. Human plan-approval gate WAIVED.
DONE = every employee-facing screen passes ALL Success Criteria. STOP loudly only on: an RBAC change
that cannot be verified, no employee session reachable, or push-auth failure.

## NON-NEGOTIABLE RULES
- Presentation-only. Zero change to RBAC, APIs, queries, data transforms, or fetch timing.
- Every finding cites file:line + component + confidence (High/Med/Low) or "Evidence not found."
- CHANGE-CLASS each change: PRESENTATION (allowed) · EXTRACTION (allowed w/ render-tree equivalence
  note) · BEHAVIORAL (FORBIDDEN — flag & defer). Dashboard "refactor" = EXTRACTION only.

## DESIGN CONSTRAINT — Studio Slate Elevation Layer (employee-facing only)
Preserve flat surfaces, warm dark sidebar, `#2952A3` accent, compact density, 36px controls, xs labels.
Elevation Layer is OPT-IN via AppLayout `altitude='elevated'` + additive `--elv-*` tokens ONLY; operator/
admin screens never opt in. Forbid: global redesign, density reduction, marketing aesthetics,
glassmorphism, heavy gradients, neon, gratuitous animation.

## SUCCESS CRITERIA (per employee screen — ALL hold = DONE)
- A11y WCAG 2.2 AA: 0 new axe violations vs baseline; contrast ≥4.5:1 text / 3:1 UI; keyboard-reachable; landmarks.
- Density invariant: click-count ≤ baseline; 36px controls; xs labels; no above-the-fold loss at 1440.
- Perf budget: LCP<2.5s, INP<200ms, CLS<0.1, app-page JS ≤300kb gz; no net +10kb gz/screen w/o justification.
- Behavioral parity: identical network requests (endpoints, count, query keys) pre/post — proven via browser MCP capture.

## SEVERITY RUBRIC
CRITICAL: RBAC/gating risk, or BEHAVIORAL change masquerading as presentation.
HIGH: a11y violation, density/click regression, perf-budget breach, broken responsive.
MEDIUM: maintainability/consolidation debt, inconsistent tokens.  LOW: cosmetic.

## ENV / GOTCHAS
- Ports: FE 3000, BE 8080. FE `npm run dev` (webpack; first route hit compiles on demand → first curl may 000).
- Local BE typically DOWN; use the live Railway+Vercel stack for auth (see AUTH BINDING).
- Reading `.env*` is BLOCKED — never attempt.
- macOS: no `timeout` (use `gtimeout`/omit). No `typecheck` script → `npx tsc --noEmit`.
  `npm test`=vitest · `npm run lint`=eslint --max-warnings=0 · `npm run build`=next build --webpack (needs NEXT_PUBLIC_API_URL).
- ALWAYS `rm -f .git/index.lock` before committing. Conventional commits, NO attribution trailer.
- `git push` may fail (auth) → commit LOCALLY + surface to user.
- Output root: `docs/qa/frontend-modernization/` (subdirs `visual-baseline/`, `v0-concepts/`).

## STEPS
1. Working-Tree Reconciliation → `00-working-tree-reconciliation.md`
2. Discovery + Audit (one parallel Workflow) → inventory + audit docs
3. Visual Baseline (browser MCP, demo account) → `visual-baseline/`
4. Token Source of Truth → `04-elevation-token-proposal.md`
5. Vercel v0 Design Exploration (reference only) → `v0-concepts/`
SYNTHESIS → 6 buckets sorted by severity rubric.
IMPLEMENT → serial, one screen/pass, full gate chain, commit+push, update MEMORY.md/vault, loop until DONE.

## IMPLEMENT gate chain (per screen)
build → `npx tsc --noEmit` → `npm test` → RBAC re-verify → network-parity → axe-clean → CWV-in-budget →
screenshot-diff (375/768/1440 · light/dark · keyboard · landmarks) → `rm -f .git/index.lock` →
`git add -p` → conventional commit → `git push origin main` (fallback: local + report) → update memory → next.
