# NU-AURA Gap Report

Generated: 2026-05-24
Updated: 2026-05-26
Phase 1 status: blocked for formal build-kit audit; pragmatic P0 execution started from `docs/audit/release-readiness-100-note-2026-05-24.md`.

## Formal Audit Blocker

- [P0] [spec] `docs/build-kit/` is missing. The deployment-readiness skill requires `docs/build-kit/01-17` as the audit source of truth and says to halt if it is absent.

## Current P0 Clusters

- [P0] [repo/migrations] Worktree is dirty and historic Flyway migrations are modified. Release readiness requires immutable applied migrations and a reviewed forward-only migration chain.
- [P0] [realtime] Code-level WebSocket auth/subscription contract is repaired; live two-user and two-tenant browser smoke evidence is still required.
- [P0] [runtime] Frontend and backend are not currently reachable on local smoke endpoints.
- [P0] [backend-tests] Deterministic local backend test clusters now pass, but full backend verify is blocked locally by Docker/Testcontainers availability and missing Java 21.
- [P0] [frontend-release-env] Frontend mechanical gates pass, but production frontend build must not depend on localhost API configuration and design-system drift must be resolved or explicitly accepted.
- [P0] [e2e] Full role/lifecycle E2E evidence is missing for the current checkout.
- [P0] [security-hardening] Security, tenant isolation, RBAC, WebSocket tenant authorization, performance, and observability need current release evidence.

## 2026-05-26 Audit Intake

### Backend Gaps

(populated by Auditor-Backend)

### Frontend Gaps

(populated by Auditor-Frontend)

### DB Gaps

(populated by Auditor-DB)

### Test Gaps

(populated by Auditor-Tests)

### Hardening Gaps

(populated by Auditor-Hardening)

## Next Reconciliation

After `docs/build-kit/` is restored or replaced by an explicit spec source, run the formal five-track audit and replace this bootstrap report with evidence-backed findings.
