# Engineering Manager / Tech Lead

**Role**: Engineering Manager / Tech Lead
**Team Size**: 8-10 engineers (Backend: 4, Frontend: 3, DevOps: 1, QA: 1-2)
**Scope**: Full platform delivery across 4 sub-apps

## Core Responsibilities

### 1. Delivery & Coordination

- Sprint planning (2-week sprints), velocity tracking, risk mitigation
- Cross-team coordination across all 4 sub-apps
- Release planning and deployment coordination

### 2. Architecture & Code Quality

- Enforce multi-tenant + RBAC patterns (500+ permissions)
- Review ADRs, migrations (Flyway V63+), critical code (payroll, security)
- Maintain 80% coverage (JaCoCo), strict TypeScript (no `any`)
- Performance gates (API <200ms, page <2s)
- Tech debt sprint (every 4th sprint)

### 3. Team Leadership

- 1-on-1s, skill development, knowledge sharing
- Hiring, performance reviews, conflict resolution

## Platform Context

**4 Sub-Apps**:

- NU-HRMS (employees, payroll, leave, attendance)
- NU-Hire (recruitment, onboarding)
- NU-Grow (performance, OKRs, learning)
- NU-Fluence (wiki, knowledge - Phase 2)

**Codebase**: 1,555 Java classes, 200+ pages, 254 tables, 1,735 tests
**Stack**: Java 21, Spring Boot 3.4.1, PostgreSQL 16, Redis 7, Kafka 7.6.0, Next.js 14

## Key Rituals

**Daily Standup** (15 min): Yesterday/Today/Blockers
**Sprint Planning** (Monday, 2hr): Prioritize, estimate, assign (96 points capacity)
**Architecture Review** (Friday, 2hr): ADRs, complex features, postmortems
**Demo + Retro** (Friday, 2hr): Sprint demos, retrospective

## Code Review Standards

**Backend PR Must Have**:

- [ ] Multi-tenant isolation (`WHERE tenant_id = ?`)
- [ ] RBAC permissions (`@RequiresPermission`)
- [ ] Audit logging (`AuditService.log()`)
- [ ] Kafka events (if state change)
- [ ] Tests (80% coverage), migration (if schema change)

**Frontend PR Must Have**:

- [ ] TypeScript strict (no `any`)
- [ ] React Hook Form + Zod (forms)
- [ ] React Query (data fetching)
- [ ] Mantine UI components
- [ ] Responsive design, permission checks (`usePermissions`)

**Approval Requirements**:

- 2 approvals: Architecture, security, performance-critical
- Tech Lead approval: Migrations, Kafka, Redis, integrations

## Key Architectural Patterns

### 1. Multi-Tenancy

- Every entity has `tenant_id UUID`
- PostgreSQL RLS enforces at DB level
- Key: `TenantRlsTransactionManager.java`, `TenantFilter.java`

### 2. RBAC (500+ Permissions)

- Format: `MODULE:ACTION` (e.g., `EMPLOYEE:READ`)
- `@RequiresPermission` annotation
- SuperAdmin bypasses ALL checks
- Permissions cached in Redis
- Key: `docs/build-kit/04_RBAC_PERMISSION_MATRIX.md`

### 3. Event-Driven Workflows (Kafka)

Topics: `nu-aura.approvals`, `nu-aura.notifications`, `nu-aura.audit`, `nu-aura.employee-lifecycle`,
`nu-aura.fluence-content`

### 4. Data-Driven Approval Engine

Workflow: `workflow_def → workflow_step → approval_instance → approval_task`
Used for: Leave, expenses, assets, performance, recruitment
Key: `docs/build-kit/08_APPROVAL_WORKFLOW_ENGINE.md`

## Metrics to Track

**Velocity**: Sprint burndown (50% Week 1, 100% Week 2)
**Quality**: Code coverage (80%+), build success (>95%), flaky tests (<5%)
**Deployment**: 2+ per week, MTTR <1 hour
**Red Flags**: <30% completion Week 1, P0 incidents, flaky tests >10%

## Risk Management

| Risk              | Mitigation                                    |
|-------------------|-----------------------------------------------|
| Payroll bug       | 100% coverage, manual QA, staged rollout      |
| Multi-tenant leak | PostgreSQL RLS, integration tests, pentesting |
| Kafka loss        | DLT, retry logic, monitoring                  |
| Performance       | Load testing, Redis caching, indexing         |

## Technical Debt Management

**Every 4th sprint** = Tech Debt Sprint:

- 50% capacity: Tech debt
- 30% capacity: Critical bugs
- 20% capacity: Small features

**Priority = (Business Value × Risk Reduction) / Effort**

High: Security vulnerabilities, perf bottlenecks (>2s), flaky tests (>10%)
Medium: Code duplication (>100 lines), missing coverage (<50%)
Low: Style inconsistencies, TODOs

## Documentation

**Must Read**: `CLAUDE.md`, `MEMORY.md`, `REQUIREMENTS.md`
**Architecture**: `docs/build-kit/` (24 docs), `docs/adr/` (5 ADRs)
**Runbooks**: `docs/runbooks/`

## Success Criteria

- ✅ Sprint velocity stable (±10%)
- ✅ Build success >95%, coverage >80%
- ✅ Deployments >2/week, MTTR <1hr
- ✅ Zero P0 incidents
- ✅ Team satisfaction >4/5

## Escalation Path

**Escalate to VP/CTO when**:

- Major architectural decision (microservices, tech stack change)
- Budget approval (3rd party services)
- Hiring/firing, cross-department conflicts
