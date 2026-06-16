---
title: Test Coverage
tags: [testing, qa, coverage, metrics, jacoco, vitest, playwright]
---

# Test Coverage

## Purpose

A **measured snapshot** of NU-AURA's test inventory and coverage state: file counts taken
live from this checkout, pass/verdict status from the release reports, coverage by layer,
and the gaps / quarantined tests. Read [[QA-Strategy]] for the *how* and *why*; this note is
the *what we actually have today*. Every count below the "Measured" heading was produced by
running `find`/`grep` against the working tree on **2026-06-16**; everything under
"Historical" is sourced from `MEMORY.md` and the release reports and is labelled as such.

## Context

Counts are evidence, not aspiration. The headline tension: NU-AURA has a **broad** test
suite (hundreds of files across both stacks) but **shallow** measured line coverage
(backend JaCoCo ~0.19, frontend Vitest gated at 60%). The org 80% standard
([[CI-CD]], coding standards) is a backlog target, not a met bar. See [[Security-Audit]]
and [[RBAC-Matrix]] for why tenant/RBAC depth is prioritised over raw line %.

## Measured — Test Inventory (live, 2026-06-16)

### Backend (`backend/src/test`)

| Metric | Count | Command |
|--------|------:|---------|
| Total `*Test*.java` files | **308** | `find backend/src/test -name "*Test*.java" \| wc -l` |
| Total `.java` test files | 309 | `find backend/src/test -name "*.java" \| wc -l` |
| `*IT.java` / `*IntegrationTest.java` | 26 | suffix find |
| `*Test.java` (unit/slice) | 305 | suffix find |
| Extend `AbstractPostgresIntegrationTest` (PG16) | **74** | `grep -rl` |
| Files referencing JUnit 5 (`org.junit.jupiter`) | 314 | `grep -rl` |
| Files referencing Testcontainers/`@Container` | 3 (direct); PG16 via abstract base = 74 | `grep -rl` |
| RLS guard tests | 2 — `RlsTenantGucScopeTest`, `RlsStartupProbeTest` | `find -iname "*Rls*"` |

> Note: `*Test*.java` (308) overlaps the IT count; the 26 ITs are the PG-backed integration
> tier, ~74 classes touch a real Postgres container through the abstract base, and the
> remainder are unit/slice tests using Spring Boot Test + Mockito.

### Frontend (`frontend`, excluding `node_modules`)

| Metric | Count | Command |
|--------|------:|---------|
| Vitest unit/component (`*.test.ts(x)`, excl. `e2e/`) | **90** | `find … -name '*.test.ts*'` |
| Vitest `*.spec.ts(x)` excl. e2e | 0 | `find …` |
| Playwright e2e specs (`frontend/e2e/*.spec.ts`) | **117** | `find frontend/e2e -name '*.spec.ts'` |
| Production/live-target e2e specs | 2 | `*.production/.live.spec.ts` |
| `__tests__/integration` flow tests | 7 | approval, compensation, employee, payroll, leave, notification, auth |
| e2e specs containing `test.skip`/`fixme` | ~10 | `grep -rl` |

E2E coverage areas (from `frontend/e2e/` tree): `accessibility/`, `edge-cases/`, `mobile/`,
`pages/`, plus visual-regression snapshot dirs (`*.spec.ts-snapshots/`) for attendance,
auth, dashboard, home, navigation. Exercises [[Pages]] and [[Components]] across all four
sub-apps.

## Measured — Coverage Configuration

| Target | Configured threshold | Source | Reality |
|--------|---------------------:|--------|---------|
| Backend line coverage | goal **0.80** (T3-15) | `backend/pom.xml` JaCoCo | **~0.19** (cached report 2026-05-20, per pom comment) — *not independently re-measured this session* |
| Frontend statements/branches/functions/lines | **60%** each | `frontend/vitest.config.ts` `thresholds` | gated at 60%, below the 80% org standard |
| Org standard | 80% | coding standards / [[CI-CD]] | aspirational; not met by either stack |

**Coverage percentages are not independently measured here** — running JaCoCo/v8 requires a
full test execution (Docker for Testcontainers). The 0.19 figure is *per the `backend/pom.xml`
comment*; the 60% figure is the *configured gate*, not an achieved number.

## Historical — Pass Status (from reports / MEMORY.md)

Distinguished explicitly from measured counts above; these are **reported**, not re-run here:

| Claim | Value | Source |
|-------|-------|--------|
| Backend tests green | **4,055** (also cited 4,005 / 4,029 / 4,047 across runs) | `MEMORY.md`, GREEN_FLAG_REPORT |
| Frontend tests green | **2,419** | `MEMORY.md` (green-flag verified 2026-06-11) |
| Green baseline | `rc-2026-06-09-baseline` = 4,029 tests green via Testcontainers PG16 | DEPLOY_READINESS_REPORT |
| CI status | both workflows green on `main` HEAD `ac03c6ba` | DEPLOY_READINESS_REPORT |
| Test-file count (audit) | "308 test files incl. tenant-isolation + RBAC-boundary suites" | GREEN_FLAG_REPORT qa agent |

> The ~4,000+ figure is the **executed test-method count** (assertions/cases), not the file
> count — consistent with 308 backend test files each holding many `@Test` methods. The 308
> file count is corroborated live above.

## Coverage by Layer / Module

| Layer | Strength | Evidence |
|-------|----------|----------|
| Tenant isolation / RLS | **Strongest** — no leaks found | `RlsTenantGucScopeTest`, data-agent audit, [[Security-Audit]] |
| RBAC boundaries | Strong — 180 controllers, 0 unguarded mutators | GREEN_FLAG_REPORT rbac agent, [[RBAC-Matrix]] |
| API controllers | Broad slice coverage mirroring `api/**` packages | `backend/src/test/java/com/nulogic/api/**` |
| Payroll / leave (HRMS) | Hardened post-audit (state machine, balance math) | green-flag fixes BA-1/DATA-1/BA-2, [[Nu-HRMS]] |
| Frontend UI primitives | Component tests for `ui/*` + store/util | `components/ui/*.test.tsx`, `lib/**` |
| Frontend flows | 7 integration flow suites | `__tests__/integration/` |
| E2E journeys | 117 specs incl. a11y/mobile/visual | `frontend/e2e/` |

## Gaps & Quarantined / Flaky Tests

- **Low measured line coverage** — backend ~0.19, frontend 60% gate: the biggest gap vs the
  80% standard. Breadth without depth.
- **FINANCE_ADMIN boundary untested (QA-2)** — no seeded FINANCE_ADMIN user, so the payroll
  permission boundary has never been positively tested ([[RBAC-Matrix]]).
- **Skipped e2e** — ~10 specs carry `test.skip`/`fixme`; readiness report notes ~33
  conditional `test.skip()` historically; some integration historically on H2 not PG16 (T-2).
- **RLS live proof outstanding** — `RlsTenantGucScopeTest` is a static source scan; a
  NOBYPASSRLS-live run still needs the `nu_app_rls` role (T-3, [[Deployment]]).
- **Local Playwright low-signal** — cold-compile timeouts on the primary dev machine; trust
  CI + browser QA against :8080 ([[QA-Strategy]], [[Production-Support]]).
- **Historical unit flake** — `LeaveBalanceControllerTest…ByYear` flagged (F-1) to confirm
  green in CI.

## qa-reports Artifacts

Release/QA evidence lives in `qa-reports/`:

- `qa-reports/PRODUCTION_READINESS_ASSESSMENT.md`, `AGENT-OS.md`, `audit-backlog.md/json`
- `qa-reports/live-qa-2026-06-11.md`, `browser-qa-findings.md`, `QA_OVERNIGHT_GOAL.md`
- `qa-reports/autonomous-run-2026-06-11*.md`, `live-deployed-endpoint-smoke-*.json`
- Root: `DEPLOY_READINESS_REPORT.md`, `GREEN_FLAG_REPORT.md`
- `frontend/playwright-report*/` — Playwright HTML/JSON output

## Related Links

[[00-Home]] · [[QA-Strategy]] · [[CI-CD]] · [[Deployment]] · [[System-Overview]] ·
[[APIs]] · [[Services]] · [[Middleware]] · [[Components]] · [[Pages]] · [[Security-Audit]] ·
[[RBAC-Matrix]] · [[Production-Support]] · [[Nu-HRMS]] · [[Nu-Hire]] · [[Nu-Grow]] ·
[[Nu-Fluence]]

## Risks

- Treating the **4,000+/2,419 green** figures as *coverage* — they are pass counts of test
  methods, not line coverage. Real line coverage (~0.19 backend) is far lower.
- File-count growth can mask **untested branches**; raise JaCoCo floors as coverage rises
  rather than relying on file breadth.
- Skipped/quarantined specs silently erode the e2e safety net if not tracked.

## Operational Notes

- Re-measure file counts: `find backend/src/test -name "*Test*.java" | wc -l` ·
  `find frontend -name '*.test.ts*' | grep -v node_modules | grep -v '/e2e/' | wc -l` ·
  `find frontend/e2e -name '*.spec.ts' | wc -l`.
- Re-measure coverage (needs Docker for backend): `mvn jacoco:report -pl .` →
  `backend/target/site/jacoco/index.html`; `npm run test:coverage` →
  `frontend/coverage/index.html`.
- Authoritative pass status is **CI on `main`** ([[CI-CD]]), not local runs (Testcontainers
  Docker/colima gotcha, Playwright cold-compile flake).
