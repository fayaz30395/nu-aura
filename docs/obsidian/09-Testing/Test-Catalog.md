---
title: Test Catalog — Suites, Coverage & How to Run
tags: [testing, qa, coverage, catalog, index]
---

# Test Catalog — Suites, Coverage & How to Run

> A **deep enumeration** of NU-AURA's entire automated-test landscape: every suite, where it
> lives, how many files it holds, and the exact command to run it. This is the *map* — read
> [[QA-Strategy]] for the *how/why* of the testing approach and [[Test-Coverage]] for the
> measured coverage snapshot. Every count below was produced by a real `find`/`grep` against
> the working tree on **2026-06-18**; commands are shown so any figure can be re-derived.

## Counts

| Stack | Suite | Count | Command |
|-------|-------|------:|---------|
| Backend | Total `*Test*.java` files | **310** | `find backend/src/test -name '*Test*.java' \| wc -l` |
| Backend | Integration (extend `AbstractPostgresIntegrationTest`) | **74** | `grep -rl AbstractPostgresIntegrationTest backend/src/test \| wc -l` |
| Backend | Unit / slice (remainder) | **236** | `310 − 74` |
| Frontend | Vitest unit/component (`*.test.ts(x)`, excl. `e2e/`, `node_modules`) | **90** | `find frontend \( -name '*.test.ts' -o -name '*.test.tsx' \) \| grep -v node_modules \| grep -v '/e2e/' \| wc -l` |
| Frontend | Playwright e2e specs (`frontend/e2e/*.spec.ts`) | **117** | `find frontend/e2e -name '*.spec.ts' \| wc -l` |

> The **74 integration** tests are the Postgres-backed tier — they spin up a real PG16
> Testcontainer through the shared `AbstractPostgresIntegrationTest` base and therefore
> **require Docker/colima**. The other **236** are unit/slice tests (Spring Boot Test +
> Mockito, JUnit 5) that run without a container. The `310`/`236`/`74` split is a file count;
> the executed *method/case* count is much higher (CI reports ~4,076 backend assertions — see
> [[Test-Coverage]]).

## Backend tests by package

Top-level package under `backend/src/test/java/com/nulogic/` (command:
`for d in backend/src/test/java/com/nulogic/*/; do echo "$(find "$d" -name '*Test*.java' | wc -l)  $(basename "$d")"; done | sort -rn`).

| Package | `*Test*.java` files | What it covers |
|---------|--------------------:|----------------|
| `application` | **103** | Service-layer / use-case logic (the largest tier) |
| `api` | **88** | Controller slice tests mirroring `api/**` ([[Controller-Index]]) |
| `integration` | **61** | Cross-layer flows against a real PG16 container |
| `common` | **31** | Shared utilities, converters, helpers |
| `e2e` | 7 | Backend end-to-end journeys |
| `security` | 6 | Auth, RBAC boundaries, RLS guards |
| `infrastructure` | 5 | Persistence/adapter wiring |
| `config` | 3 | Spring config / wiring |
| `architecture` | 3 | ArchUnit-style boundary/layer rules |
| `performance` | 2 | Perf-sensitive paths |
| `domain` | 1 | Pure domain logic |

> The **74** `AbstractPostgresIntegrationTest` classes are not confined to the `integration`
> package — they are distributed across `api`, `application`, `integration`, and `e2e`
> wherever a real DB is needed. The package table counts *files*; the Docker dependency is a
> cross-cutting property keyed off the base class, not the directory.

## Frontend tests by area

### Vitest (90 files) — command: `find frontend \( -name '*.test.ts' -o -name '*.test.tsx' \) | grep -v node_modules | grep -v '/e2e/' | sed 's|^frontend/||' | awk -F/ '{print $1}' | sort | uniq -c`

| Area | Files | What it covers |
|------|------:|----------------|
| `lib/` | **74** | Utilities, data transforms, hooks, stores, API clients |
| `components/` | 9 | UI primitives + component behaviour |
| `__tests__/` | 7 | Integration flow suites (approval, compensation, employee, payroll, leave, notification, auth) |

### Playwright (117 specs) — command: `find frontend/e2e -name '*.spec.ts' | sed 's|^frontend/e2e/||' | awk -F/ '{if (NF>1) print $1; else print "(root)"}' | sort | uniq -c`

| Area | Files | What it covers |
|------|------:|----------------|
| `e2e/` (root) | **110** | Page/journey specs across all four sub-apps |
| `e2e/generated/` | 3 | Auto-generated journey specs |
| `e2e/edge-cases/` | 2 | Boundary / error-path journeys |
| `e2e/mobile/` | 1 | Mobile-viewport journeys |
| `e2e/accessibility/` | 1 | Automated a11y (axe via `@axe-core/playwright`) |

- **RBAC sweep:** `frontend/e2e/nu-rbac.spec.ts` (the sweep spec) drives off
  `frontend/nu-rbac.config.ts` (the role/route matrix) to verify each role only reaches its
  permitted routes — see [[RBAC-Matrix]] and [[Feature-Traceability]].
- **Production/live-target specs (2):** `production-readiness.production.spec.ts` and
  `api-backend-trace.production.spec.ts` (run via the separate `playwright.production.config.ts`).
- **Playwright projects** (`frontend/playwright.config.ts`): `setup`, `chromium`, `firefox`,
  `mobile-chrome`, `mobile-safari`, `tablet`. `testDir: ./e2e`, `baseURL` defaults to
  `http://localhost:3000`.

## How to run

### Backend (`mvn`, from `backend/`)

```bash
mvn test                      # full suite (unit + integration)
mvn -Dtest=SomeServiceTest test   # single class
mvn verify                    # runs JaCoCo coverage gate (enforced floor 0.10)
```

- **Docker/colima required** for the **74** `AbstractPostgresIntegrationTest` classes — they
  start a PG16 Testcontainer. With Docker down they error/skip; see [[Local-Setup]] for the
  colima socket gotcha.
- **JDK:** CI pins **JDK 21** (`<java.version>21</java.version>` in `pom.xml`). On a local
  **JDK 23** the JaCoCo agent crashes the surefire fork — run with **`-Djacoco.skip=true`**:
  `mvn test -Djacoco.skip=true`.

### Frontend (`npm`, from `frontend/`)

```bash
npm run lint              # eslint . --max-warnings=0
npm run lint:design-system  # 8px-grid styling-drift check
npx vitest run            # unit/component suite (or: npm run test:run)
npm run test:coverage     # vitest run --coverage (v8, 60% gate)
npx playwright test       # e2e (or: npm run test:e2e)
npm run test:e2e:chromium # single project
npm run test:e2e:production  # production-target specs (separate config)
```

- **Playwright is low-signal on local machines** (cold-compile timeouts on the primary dev
  box, per project history) — **CI is authoritative** for e2e. See [[QA-Strategy]].

## Latest local run

Recorded **2026-06-18** (QA Iteration 6 / final gate). The full backend suite was *not* runnable locally (Docker down); 263 unit-only tests were run without containers.

| Suite | Result | Notes |
|-------|--------|-------|
| Frontend Vitest | **90 files / 2,419 tests — ALL PASS** | `tsc` exit 0; `eslint --max-warnings=0` exit 0 |
| Frontend ESLint | **exit 0** | a11y gate enabled (`jsx-a11y/label-has-associated-control`); 491 fixes across 102 `app/` files + 33 fixes in `components/` — no remaining errors |
| Backend `mvn test` (local, no Docker) | **263/263 PASS** | Unit/slice tests only; JaCoCo skipped locally |
| Backend full suite | **NOT run locally** | Docker/colima **was down**; 74 Testcontainers integration tests excluded |

> **CI is the source of truth** for the backend full run. The most recent green CI run recorded **4,076 tests
> green** via Testcontainers PG16 ([[CI-CD]], [[Test-Coverage]]).

## Coverage posture

| Target | Configured threshold | Source | Reality |
|--------|---------------------:|--------|---------|
| Backend line coverage | enforced floor **0.10**; backlog target **0.80** (T3-15) | `backend/pom.xml` JaCoCo `COVEREDRATIO` | **~0.19 reported** (cached JaCoCo report 2026-05-20, per pom comment) — *not re-run here* |
| Frontend statements/branches/functions/lines | **60%** each | `frontend/vitest.config.ts` `thresholds` | gated at 60%, below the 80% org standard |
| Org standard | 80% | coding standards / [[CI-CD]] | aspirational; not met by either stack |

**Honesty note:** coverage **percentages were not re-measured in this catalog**. JaCoCo line
coverage (~0.19) is *as reported by the pom comment*, not a fresh run; the Vitest 60% figure is
the *configured gate*, not an achieved number. Re-measuring backend coverage requires a full
Testcontainers run (Docker). The headline tension stands: a **broad** suite (310 backend + 207
frontend files) but **shallow** measured line coverage.

## Related Links

[[QA-Strategy]] · [[Test-Coverage]] · [[Controller-Index]] · [[Local-Setup]] · [[CI-CD]] ·
[[Feature-Traceability]] · [[RBAC-Matrix]] · [[00-Home]]
