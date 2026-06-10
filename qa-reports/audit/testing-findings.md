# Testing Audit — Findings (READ-ONLY)

Repo: `/Users/fayaz.m/IdeaProjects/nulogic/nu-aura`
Date: 2026-06-09 · Auditor: Auditor-Testing
Method: static inventory (find/grep). Full suite NOT run (per constraint). Counts are file/annotation-derived.

## Test inventory (counts table)

| Layer | Metric | Count | Notes |
|-------|--------|-------|-------|
| Backend | Total `*.java` test files | 306 | `backend/src/test` |
| Backend | `@Test` methods | 3,959 | aligns with reported ~4005 green |
| Backend | `@SpringBootTest` (full context integration) | 71 | |
| Backend | `@WebMvcTest` (controller slice) | 72 | |
| Backend | `@DataJpaTest` (repo slice) | 0 | **GAP** — no JPA-slice repository tests |
| Backend | Mockito unit (`@Mock`/`MockitoExtension`) | 197 | majority are pure unit |
| Backend | `@AutoConfigureMockMvc` | 137 | |
| Backend | ArchUnit architecture tests | 3 | Layer + Tenant + RLS guard |
| Backend | Testcontainers (real Postgres) | 1 base class | `AbstractPostgresIntegrationTest` — only ~2 files extend; nearly all integration runs on in-mem/H2, not PG16 |
| Frontend | Unit/component tests (`*.test.tsx/ts`) | 90 | jest/vitest; incl. `__tests__/integration/*` |
| Frontend | E2E specs (Playwright) | 111 | `frontend/e2e/**/*.spec.ts` |
| **Smoke** | dedicated smoke specs | 3 | `smoke`, `sub-app-smoke`, `all-demo-users-smoke` |

Test-pyramid shape: backend is **unit-heavy (197) with a healthy slice/integration mid-layer (143)** but a **near-empty real-DB integration floor (1 Testcontainers base)** — RLS/tenant behavior that depends on Postgres GUC + `NOBYPASSRLS` role is therefore largely *unproven in JUnit* and asserted only via architecture guards + CI. Frontend leans correctly on Playwright (111) over thin unit (90).

## Critical Flow Test Gap Matrix

| Journey | Covered | Test file(s) | Severity |
|---------|:------:|--------------|----------|
| Auth / login | Y | `integration/AuthControllerTest`, `e2e/AuthenticationE2ETest`, `common/security/JwtSecurityTest`, `JwtTokenProviderTest`, FE `e2e/auth.spec.ts`, `auth-flow.test.tsx` | — |
| RBAC permission enforcement | Y | `security/RbacUseCaseBoundaryTest`, `common/security/PermissionAspectTest`, `CustomPermissionEvaluatorTest`, `RequiresPermissionAnnotationTest`, `RbacAnnotationCoverageTest`, `RoleHierarchyTest`; FE `e2e/nu-rbac.spec.ts`, `rbac-action-matrix.spec.ts`, `PermissionGate.test.tsx` | — (strong) |
| Payroll run | Y | `application/payroll/service/PayrollRunServiceTest`, `PayrollPeriodLockTest`, `GlobalPayrollServiceTest`, `e2e/PayrollE2ETest`, FE `e2e/payroll-flow.spec.ts`, `payroll-statutory.spec.ts` | — |
| Leave apply → approve | Y | `e2e/LeaveRequestE2ETest`, `integration/LeaveRequestControllerIntegrationTest`, `crossmodule/LeaveApprovalPayrollImpactTest`, FE `leave-flow.test.tsx`, `e2e/approvals-workflows.spec.ts` | — |
| Expense claim | Y | `application/expense/service/ExpenseClaimServiceTest`, `integration/ExpenseClaimControllerTest`, `ExpenseClaimScopeIntegrationTest`, FE `e2e/expense-end-to-end.spec.ts`, `expense-flow.spec.ts` | — |
| Attendance | Y | `e2e/AttendanceE2ETest`, `integration/AttendanceControllerTest`, `application/attendance/service/AttendanceRecordServiceTest` | — |
| Recruitment apply | Partial | `integration/RecruitmentControllerTest`, `RecruitmentScopeIntegrationTest`, `application/recruitment/service/ApplicantServiceTest`, FE `e2e/recruitment-kanban.spec.ts` (+`recruitment-extended` w/ 3 always-skip branches). **No public career-page candidate-apply E2E found** | MEDIUM |
| Impersonation | Partial | `application/admin/service/ImpersonationExchangeTokenServiceTest` (9 tests, service-only). **No controller/integration/E2E test for the impersonation exchange-token endpoint** (the feature shipped in HEAD commit 880b551e) | HIGH |
| Tenant isolation / RLS | Partial | `security/TenantIsolationNegativeTest` (13), `MultiTenantAsyncIsolationTest`, `ScheduledJobTenantIsolationTest`, `architecture/RlsTenantGucScopeTest` (build-guard, 1), `common/security/RlsStartupProbeTest`. **End-to-end RLS leak proof requires Postgres `nu_app_rls` NOBYPASSRLS role — only 1 Testcontainers base exists; the actual cross-tenant-leak fix (commit 0ea63f6e) is guarded by a *static* ArchUnit rule, not a live pooled-connection DB test** | HIGH |

**Critical flows fully uncovered: 0 of 9. Partially covered (real risk): 3 — impersonation endpoint, RLS live-DB proof, public recruitment apply.**

## Missing test types

| Type | Present? | Detail |
|------|:--------:|--------|
| Contract tests | **No** | Zero Pact / spring-cloud-contract / stub-runner usage. FE↔BE API drift only caught by E2E. With 264 FE pages on one API, this is a real gap. |
| Repository slice tests (`@DataJpaTest`) | **No** | 0 found. Custom `@Query`/`@SQLRestriction` tenant filters untested at JPA layer. |
| Real-DB integration (Testcontainers) | **Barely** | 1 base class; vast majority of `@SpringBootTest` run without PG16 → Postgres-specific behavior (RLS, GUC, JSONB, partial indexes) not exercised in JUnit. |
| Performance / load tests | **Weak** | Only `performance/PerformanceUseCaseBenchmarkTest` (a JUnit micro-benchmark). No Gatling/JMeter/k6 load test; no SLA assertions on payroll-run or export endpoints. |
| Security tests | Partial | Good RBAC/JWT/tenant negative tests, but **no automated SAST/DAST/dependency-scan in test layer**, no auth-bypass fuzzing, no rate-limit (Bucket4j) behavioral test surfaced. |
| Chaos / resilience | **No** | Zero chaos/toxiproxy/fault-injection. Redis/Kafka/Elasticsearch fallback paths (documented as critical in CLAUDE.md) are not failure-tested. |
| Mutation testing | **No** | No PIT/Stryker — 3,959 assertions' effectiveness is unmeasured (count ≠ quality). |

## Smells

| Smell | Severity | Evidence |
|-------|----------|----------|
| Unconditional `test.skip()` inside `if (!visible)` guards | MEDIUM | 33 occurrences across `departments`, `approvals-workflows` (19!), `settings-security`, `my-space`, `recruitment-extended`, `nu-rbac`. These silently no-op when seed data/UI absent → **green run can mean "nothing was tested."** `approvals-workflows.spec.ts` is the worst offender — a core flow that may self-skip. |
| Conditional `test.skip(cond, reason)` (acceptable) | LOW | ~22 (helpdesk data-presence, mobile-viewport guards). Legitimate but inflate the "passing" count. |
| Disabled tests (`@Disabled`/`@Ignore`/`xit`/`.only`) | NONE (good) | Backend 0, frontend 0 `.only` leaks. No permanently-disabled tests — clean. |
| Backend "no-assertion" files | LOW | Only 3 true no-assert files, all non-test infra/config: `TestSecurityConfig`, `TestMeterRegistryConfig`, `architecture/LayerArchitectureTest` (ArchUnit rules evaluate without classic asserts — false positive). No trivial `assertTrue(true)` found. |
| Integration tests not on prod DB engine | HIGH | 137 `@AutoConfigureMockMvc` integration tests not pinned to Testcontainers Postgres → false confidence vs PG16 prod. |
| Mutation coverage unknown | MEDIUM | High `@Test` count with no mutation testing risks assertion-light tests passing trivially. |

## Top recommendations (priority order)
1. **HIGH** — Add controller/integration + E2E test for the impersonation exchange-token endpoint (shipped untested in HEAD).
2. **HIGH** — Convert the RLS cross-tenant fix from static ArchUnit guard to a **live pooled-connection Testcontainers test** using the `nu_app_rls` NOBYPASSRLS role.
3. **HIGH/MEDIUM** — Migrate `@SpringBootTest` integration tests onto `AbstractPostgresIntegrationTest` (Testcontainers PG16) to close the H2-vs-prod gap.
4. **MEDIUM** — Replace 33 silent `test.skip()` guards with deterministic seed fixtures so E2E green = E2E executed (start with `approvals-workflows.spec.ts`).
5. **MEDIUM** — Introduce contract tests (Pact/stub-runner) for the FE↔BE boundary; add `@DataJpaTest` for tenant-filtered repositories; add load + chaos coverage for Redis/Kafka fallback paths.
