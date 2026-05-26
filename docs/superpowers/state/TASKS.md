# NU-AURA Readiness — TASKS

Schema: `- [ ] T-NNN | phase=N | wave=Nx | priority=P0|P1|P2 | module=<name> | depends=<id,id> | acceptance="<criteria>"`

## Phase 1 — AUDIT
(populated after Phase 1 auditors run)

## Phase 2 — DEV WAVES
(populated from GAP_REPORT.md after Phase 1 gate approval)

## Phase 3 — QA
- [ ] T-Q01 | phase=3 | wave=3a | priority=P0 | module=qa | depends=phase-2-complete | acceptance="nu-chrome-super-e2e exits 0"
- [ ] T-Q02 | phase=3 | wave=3a | priority=P0 | module=qa | depends=phase-2-complete | acceptance="nu-aura-e2e-lifecycle exits 0"
- [ ] T-Q03 | phase=3 | wave=3a | priority=P0 | module=qa | depends=phase-2-complete | acceptance="mvn test and npm test both exit 0"

## Phase 4 — HARDENING
- [ ] T-H01 | phase=4 | wave=4a | priority=P0 | module=security | depends=phase-3-complete | acceptance="senior-security report has zero P0 findings"
- [ ] T-H02 | phase=4 | wave=4a | priority=P0 | module=perf | depends=phase-3-complete | acceptance="no N+1s on top 20 endpoints; bundle within budget"
- [ ] T-H03 | phase=4 | wave=4a | priority=P0 | module=observability | depends=phase-3-complete | acceptance="structured logs + traces on all critical paths"

## Phase 5 — DEPLOY READINESS
- [ ] T-D01 | phase=5 | wave=5a | priority=P0 | module=release | depends=phase-4-complete | acceptance="DEPLOY_READINESS_REPORT.md shows green on all 4 criteria"
