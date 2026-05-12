# Repo layout cleanup — master plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the NU-AURA monorepo to a clean canonical layout — surface cleanup, doc consolidation, frontend internals, backend internals, test backfill, CI expansion, skill rationalisation — across 7 sequential phases.

**Architecture:** Each phase ships as its own PR with independent rollback. Phases 1–4 are structural (no functional change). Phase 5 is net-additive (test code only). Phase 6 adds CI workflows. Phase 7 is process/docs. No phase depends on later phases shipping.

**Tech Stack:** Git (worktree-per-phase), Java 21 + Spring Boot 3.4.1 (Phase 4–5), Next.js 14 + TypeScript (Phase 3), Maven, JaCoCo, Playwright, Vitest, GitHub Actions.

**Spec:** [`docs/superpowers/specs/2026-05-13-repo-layout-cleanup-design.md`](../specs/2026-05-13-repo-layout-cleanup-design.md)

---

## Phase index

| # | Branch | Plan file | Risk | Effort |
|---|---|---|---|---|
| 1 | `chore/repo-layout-cleanup` | [`2026-05-13-phase-1-surface-cleanup.md`](2026-05-13-phase-1-surface-cleanup.md) — **ready to execute** | Low | 1 day |
| 2 | `chore/docs-consolidation` | `2026-05-13-phase-2-docs-consolidation.md` — written when Phase 1 merges | Low | 1–2 days |
| 3 | `chore/frontend-internals` | `2026-05-13-phase-3-frontend-internals.md` — written when Phase 2 merges | Medium | 3–5 days |
| 4 | `chore/backend-internals` | `2026-05-13-phase-4-backend-internals.md` — written when Phase 3 merges | High | 5–7 days |
| 5 | `chore/test-coverage-backfill` | `2026-05-13-phase-5-test-backfill.md` (sub-phased 5a/5b/5c) — written when Phase 4 merges | Medium | 3–4 weeks |
| 6 | `chore/ci-workflows` | `2026-05-13-phase-6-ci-workflows.md` — written when Phase 5 merges | Low | 1–2 days |
| 7 | `chore/skill-rationalisation` | `2026-05-13-phase-7-skill-rationalisation.md` — can run after Phase 1 | Low | 1.5 days |

**Why write phase plans just-in-time?** Plans for work 4+ weeks out are stale by the time they're executed. Each phase plan is authored when the prior phase merges, with knowledge of what actually shipped and what surprises occurred.

---

## Cross-phase dependencies (locked order)

```
Phase 1 (surface cleanup)
   ↓
Phase 2 (docs consolidation)  — fills the doc buckets Phase 1 introduced
   ↓
Phase 3 (frontend internals)  — routes, lib boundaries, hooks, components
   ↓
Phase 4 (backend internals)   — package rename + structural rationalisation
   ↓
Phase 5 (test backfill)       — tests reference post-rename package paths
   ↓
Phase 6 (CI workflows)        — runs the new tests in PR validation
   
Phase 7 (skill rationalisation) — independent, can land after Phase 1
```

---

## Locked decisions (from spec section 13.0)

| Decision | Value |
|---|---|
| Java root package | Rename `com.hrms` → `com.nulogic` |
| Frontend API layer | Split by kind: `lib/api/` = raw axios, `lib/services/` = business logic |
| Architecture docs | Merge `docs/build-kit/` into `docs/architecture/` (topic subfolders) |
| Route winners | `organization-chart` (del `org-chart`); `calendar` (del `nu-calendar`); keep both `goals/` and `okr/`; nest `letters/templates`; nest `statutory/filings` |
| PR shape | One PR per phase, sequential |
| Test strategy | Full backfill (80% JaCoCo across all modules) |

---

## Universal verification gates

Every phase PR must pass these before merge:

1. `cd backend && mvn clean package` succeeds
2. `cd frontend && npm ci && npm run build && npx tsc --noEmit` all succeed
3. `docker-compose config` validates
4. `.github/workflows/ci.yml` passes on the branch
5. `git status` clean after a full build — no untracked artifacts (proves `.gitignore` is correct)
6. Smoke test: `./scripts/dev/start-dev.sh` (or equivalent for that phase's branch), sign in as SuperAdmin, navigate one page

Phase-specific gates are documented inside each phase plan.

---

## Phase 2 — task outline (detailed plan to be written when Phase 1 merges)

1. Move `docs/build-kit/00_MASTER_PLAN.md` … `17_*.md` into `docs/architecture/<topic>/` by topic (RBAC, database, payroll, etc.)
2. Move `docs/build-kit/ADR-*.md` + `ADR-INDEX.md` into `docs/adr/` and renumber to ADR-005..ADR-010
3. Normalise filename casing across `docs/` to lowercase-kebab (rename CamelCase, SCREAMING_SNAKE, UPPER-KEBAB files)
4. Rewrite `docs/architecture/README.md` as the index of the merged tree
5. Update all cross-references in `docs/` to the new paths
6. Update `CLAUDE.md` and `MEMORY.md` build-kit references
7. Delete the now-empty `docs/build-kit/` directory
8. Verification: `grep -rn "build-kit/" docs/ backend/ frontend/ scripts/` returns zero matches

---

## Phase 3 — task outline

### Phase 3a: Route consolidation
1. Delete `frontend/app/org-chart/` (canonical: `organization-chart/`)
2. Delete `frontend/app/nu-calendar/` (canonical: `calendar/`)
3. Move `frontend/app/letter-templates/` → `frontend/app/letters/templates/`
4. Move `frontend/app/statutory-filings/` → `frontend/app/statutory/filings/`
5. Add redirect rules to `frontend/middleware.ts` for the 4 deleted paths
6. Update sidebar navigation in `frontend/components/layout/Sidebar.tsx` (or equivalent)
7. Grep-and-fix any internal links referencing the old paths

### Phase 3b: Lib boundary enforcement
1. Document the `lib/api/` (raw axios) vs `lib/services/` (business logic) split in `docs/architecture/frontend/api-layer.md`
2. Add an ESLint rule to `eslint-plugin-nu-aura/` that flags axios imports outside `lib/api/`
3. Move `lib/utils.ts` content into `lib/utils/index.ts`; delete `lib/utils.ts`
4. Move `lib/websocket.ts` → `lib/services/websocket.ts`; update all imports
5. Move `lib/design-system.ts` → `lib/theme/design-system.ts`; update all imports
6. Re-check `lib/api/` files — any with business logic? Refactor to `services/`

### Phase 3c: Auth hooks consolidation
1. Audit `useAuth`, `useAuthStatus`, `usePermissions`, `useSessionTimeout`, `useTokenRefresh` — document each's purpose
2. Decide which to merge, which to keep
3. Refactor consumers; remove duplicates
4. Add tests for the consolidated hooks

### Phase 3d: Components dedup
1. Merge `frontend/components/resources/` (4 files) into `frontend/components/resource-management/`
2. Move `frontend/components/ui/EDITABLECELL_USAGE.md` → `docs/architecture/frontend/editable-cell.md`
3. Decide `components/org-chart/` vs `app/org-chart/_components/` (recommend route-local; delete the `components/` copy)
4. Update all import sites

---

## Phase 4 — task outline

### Phase 4a: Java package rename `com.hrms` → `com.nulogic`
**This task touches ~1,800 Java files. Use IntelliJ's "Refactor → Rename Package" — do NOT do manual sed.**
1. Branch from `main` after Phase 3 merges
2. In IntelliJ: right-click `com.hrms` → Refactor → Rename → `com.nulogic`
3. Apply IntelliJ's preview — verify it covers `import`, `package`, fully-qualified strings
4. Manual sweep — these are NOT covered by IntelliJ's refactor:
   - `application*.yml`: `base-package`, `spring.kafka.consumer.value-deserializer.spring.json.trusted.packages`
   - Any `@JsonTypeInfo` / `@JsonSubTypes` with FQN strings
   - `logback-spring.xml` logger names
   - `pom.xml` if `mainClass` is FQN-pinned
   - Test resource fixtures with FQN strings
5. Verification: `git grep "com\.hrms"` returns zero matches
6. Kafka payload compatibility: introduce one-week dual-class-alias window via custom `JsonDeserializer` accepting both old and new FQN
7. `mvn clean package` + `docker-compose up` + smoke test

### Phase 4b: Move misplaced packages
1. Move `domain/kafka` → `infrastructure/kafka`
2. Move `domain/ai` → `infrastructure/ai`
3. Move `domain/file` → `infrastructure/storage`
4. Move `domain/event` → `infrastructure/event`
5. Move `domain/tenant` → `infrastructure/tenant`
6. Move `domain/bgv` (background verification) — decide if it's domain or infra
7. Update Spring `@ComponentScan` if explicit
8. `mvn clean package` after each move

### Phase 4c: Application module rationalisation
For each of `application/{admin,dashboard,mobile,publicapi,security,migration,meeting,home}`:
- If it has business-rule logic with domain entities → create matching `domain/<name>` and split
- If it's pure orchestration → keep in `application/`
- If it's cross-cutting → move to `common/`

### Phase 4d: Config consolidation
1. Move all `@Configuration` classes scattered under module paths into a per-module `config/` sub-package
2. Top-level `config/` package collapses to true cross-cutting configs only

---

## Phase 5 — task outline (sub-phased)

### Phase 5a: api/ module test backfill
Backfill the 27 untested `api/` modules:
budget, calendar, common, compensation, compliance, customfield, esignature, exit, lms, meeting, mobile, monitoring, organization, platform, preboarding, probation, psa, publicapi, referral, resourcemanagement, selfservice, survey, timetracking, travel, wall, webhook, plus the empty `api/analytics/controller/`.

For each module: controller test + integration test against TestContainers Postgres.

### Phase 5b: domain/ test backfill
Cover the 363 domain classes (currently 1 test). Each entity, value object, and domain service gets unit tests. Use existing `application/` tests as integration coverage where they cross domain boundaries.

### Phase 5c: infrastructure/ test backfill
Cover the 311 infrastructure classes (currently 1 test). JPA repository tests with TestContainers; Kafka producer/consumer tests with Testcontainers Kafka; Redis adapter tests with Testcontainers Redis.

**Per-sub-phase gate:** JaCoCo report shows ≥80% line coverage for that module.

---

## Phase 6 — task outline

1. Create `.github/workflows/pr-validation.yml` — runs on `pull_request` to `main` or `develop`: typecheck, lint, unit tests, build (no deploy)
2. Create `.github/workflows/security-scan.yml` — CodeQL Java + JS, secret scan, container scan (Trivy), runs on push to `main` + weekly cron
3. Create `.github/workflows/deploy.yml` — manual trigger, deploys to GKE staging then production with approval gate
4. Document each workflow in `docs/runbooks/ci-workflows.md`

---

## Phase 7 — task outline

1. Inventory the 10 QA/e2e/fix-loop skills (`nu-e2e`, `nu-e2e-qa`, `nu-aura-e2e-lifecycle`, `nu-chrome-e2e`, `nu-aura-full-platform-qa`, `playwright-autonomous`, `qa-dev-loop`, `nu-validate`, `nu-validate-fix-loop`, `autonomous-fix-loop`) — document each's true scope by reading SKILL.md and recent invocations
2. Pick canonical skills per axis:
   - **E2E test authoring** — pick one of `nu-e2e`, `nu-aura-e2e-lifecycle`
   - **Cross-platform QA sweep** — pick one of `nu-e2e-qa`, `nu-chrome-e2e`, `nu-aura-full-platform-qa`
   - **Autonomous fix loop** — pick one of `playwright-autonomous`, `qa-dev-loop`, `autonomous-fix-loop`, `nu-validate-fix-loop`
   - **Code+UX audit** — `nu-validate`
3. Document the canonical set in `docs/runbooks/qa-skills.md`
4. Delete deprecated skill folders
5. Update `MEMORY.md` and `CLAUDE.md` skill references

---

## Execution

Phase 1 plan is ready at [`2026-05-13-phase-1-surface-cleanup.md`](2026-05-13-phase-1-surface-cleanup.md). Open that file and begin task 1.

When Phase 1 merges:
- The lead writes the Phase 2 detailed plan using `superpowers:writing-plans` against the Phase 2 outline above
- Cycle repeats for each subsequent phase
