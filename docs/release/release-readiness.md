# Nu-Aura — Release Readiness

Last updated: 2026-09-30 · Base commit: `798f46c8` (`main`) · Working tree: DIRTY (uncommitted)
Canonical workflow: `.nu-aura/orchestration/workflow.yaml` · Owner: ORCHESTRATOR

## Overall status

**BLOCKED** — no deterministic release candidate yet; P0 credential exposure open; P1 production
host unreachable and release reconciliation unresolved.

## Gate summary

| Gate | Status | Evidence |
|---|---|---|
| Workflow integrity | PASS | `node scripts/nu-aura-workflow-validate.mjs` → matrix in sync |
| Frontend build/typecheck | BLOCKED | `npx tsc --noEmit` fails on missing `lib/generated/**`; must run `api:generate` first (`.nu-aura/evidence/798f46c8/frontend-typecheck.md`) |
| Frontend unit tests | NOT_RUN | — |
| Frontend lint | NOT_RUN | — |
| Backend compile | NOT_RUN | — |
| Backend unit tests | NOT_RUN | — |
| Backend integration tests | NOT_RUN | — |
| E2E | NOT_RUN (local) / PASS on release branch CI | `gh run list` run 36219329597 (release/v339-security-remediation) = success |
| RBAC P0 (BLOCKER-001) | IN_PROGRESS | code fix present; execution/live verification pending |
| Security / secrets | FAIL (HUMAN_REQUIRED) | `docs/security/security-review.md` |
| Regression | NOT_RUN | — |
| Infrastructure (frontend) | PASS | https://hrms-frontend-vert.vercel.app → 200 |
| Infrastructure (backend) | FAIL | https://nu-aura-backend.onrender.com/actuator/health → 404 |

## Blockers

| ID | Sev | Title | Status |
|---|---|---|---|
| BLOCKER-001 | P0 | RBAC scope flattening | IN_PROGRESS |
| BLOCKER-002 | P0 | 7 exposed credentials unrotated | HUMAN_REQUIRED |
| BLOCKER-003 | P1 | Backend not hosted (404) | HUMAN_REQUIRED |
| BLOCKER-004 | P1 | main Security Scan CI failing | IN_PROGRESS (runner disk flake) |
| BLOCKER-005 | P1 | Release reconciliation / dirty tree | IN_PROGRESS |
| BLOCKER-006 | P2 | Flyway gap V338–V340; V341 untracked | IN_PROGRESS |

## Human actions required

1. Rotate the 7 exposed credentials (JWT_SECRET first; APP_SECURITY_ENCRYPTION_KEY requires dual-key migration).
2. Host/authorize the production backend + credentials (`nu-aura-backend.onrender.com` = 404).
3. Authorize production deployment.
4. DR/RTO/RPO decisions (single-region today).

## Evidence

`.nu-aura/evidence/798f46c8/` — discovery, rbac-blocker-001, ci-security-scan, frontend-typecheck,
working-tree-classification.

## Final assessment

Not deployable. Two independent gate families are short: (a) security — credential exposure, and
(b) verification — the release candidate is not frozen and the backend gate has no execution
evidence. The frontend build is blocked only by a missing generation step, not a product defect.
