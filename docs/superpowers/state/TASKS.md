# NU-AURA Readiness - TASKS

Generated: 2026-05-24
Source note: `docs/audit/release-readiness-100-note-2026-05-24.md`

Schema: `- [ ] T-NNN | phase=N | wave=Nx | priority=P0|P1|P2 | module=<name> | depends=<id,id> | acceptance="<criteria>"`

## Phase 0 - Bootstrap / Blockers

- [ ] T-000 | phase=0 | wave=0 | priority=P0 | module=spec | depends= | acceptance="`docs/build-kit/01-17` or replacement spec source exists; formal build-kit audit can run without inventing requirements"
- [ ] T-001 | phase=0 | wave=0 | priority=P0 | module=repo | depends= | acceptance="worktree has no unrelated uncommitted release blockers; old Flyway migrations are not modified; all required changes are captured in forward-only migrations"

## Phase 2 - Dev Waves

### Wave 2a - Foundation

- [x] T-010 | phase=2 | wave=2a | priority=P0 | module=realtime | depends= | acceptance="WebSocket authenticates through httpOnly cookie handshake or bearer CONNECT, subscribes only to backend-delivered destinations, and frontend typecheck passes"
- [ ] T-011 | phase=2 | wave=2a | priority=P0 | module=migrations | depends=T-001 | acceptance="fresh DB and upgrade DB Flyway validations pass with reviewed V180-V253 migration chain"
- [ ] T-012 | phase=2 | wave=2a | priority=P0 | module=backend-tests | depends=T-001 | acceptance="backend `mvn verify` exits 0 in supported release environment"

### Wave 2b - Runtime and User Flows

- [ ] T-020 | phase=2 | wave=2b | priority=P0 | module=runtime | depends=T-010,T-011,T-012 | acceptance="backend/frontend services start; frontend root returns 200; backend health, liveness, and readiness are UP"
- [ ] T-021 | phase=2 | wave=2b | priority=P0 | module=auth | depends=T-020 | acceptance="SuperAdmin, HR, manager, employee, recruitment roles can login; logout invalidates access; protected routes redirect anonymous users"
- [ ] T-022 | phase=2 | wave=2b | priority=P0 | module=realtime | depends=T-020 | acceptance="two-user notification smoke passes without refresh and two-tenant negative subscription test blocks cross-tenant data"

## Phase 3 - QA

- [ ] T-030 | phase=3 | wave=3 | priority=P0 | module=frontend-gates | depends=T-010 | acceptance="frontend `npx tsc --noEmit`, lint, unit tests, design-system lint, and production build pass with production-safe env"
- [ ] T-031 | phase=3 | wave=3 | priority=P0 | module=e2e | depends=T-020,T-021,T-022 | acceptance="route smoke, critical journeys, My Space, sub-app smoke, and lifecycle E2E pass across target roles"

## Phase 4 - Hardening

- [ ] T-040 | phase=4 | wave=4 | priority=P0 | module=security | depends=T-031 | acceptance="release security checklist has no P0 findings; tenant isolation and SuperAdmin bypass evidence attached"
- [ ] T-041 | phase=4 | wave=4 | priority=P0 | module=performance | depends=T-031 | acceptance="critical journeys meet agreed latency budgets and have no blocking console errors"
- [ ] T-042 | phase=4 | wave=4 | priority=P0 | module=observability | depends=T-031 | acceptance="structured logs, health checks, metrics, rollback, backup/restore, and incident evidence attached"

## Phase 5 - Deploy Readiness

- [ ] T-050 | phase=5 | wave=5 | priority=P0 | module=release | depends=T-000,T-001,T-030,T-031,T-040,T-041,T-042 | acceptance="`DEPLOY_READINESS_REPORT.md` is GREEN with command, test, source, deploy, and rollback evidence"
