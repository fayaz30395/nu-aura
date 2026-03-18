# NU-AURA Deep Codebase Analysis — Design Document

**Date**: 2026-03-19
**Status**: Approved
**Scope**: Security remediation, scale readiness audit, code quality improvement

---

## Overview

Deep analysis of the NU-AURA codebase (1,432 Java files, 1,093 TS/TSX files, 40 Flyway migrations V0-V39, 13 K8s manifests) identified 28 actionable items across three categories. Work is decomposed into three independent specs executed as: **A (now) → B + C (parallel)**.

### Codebase Grades

| Dimension | Grade | Score |
|-----------|-------|-------|
| Backend | B+ | 8.5/10 |
| Frontend | A- | 9/10 |
| Infrastructure | B | 8/10 |

---

## Spec A: Security & Critical Fixes

**Priority**: Execute immediately. 7 items. Must resolve before production deployment.

### A1 — Rotate Google OAuth Secret (P1)

`client_secret_*.json` exists as an untracked local file (NOT committed to git history). `.gitignore` already covers `**/client_secret*.json`. However, the secret may have been shared or exposed outside git. Rotate as a precaution.

**Actions**:
- Regenerate OAuth client secret in Google Cloud Console
- Delete the local untracked file
- Verify `.gitignore` pattern `**/client_secret*.json` is adequate (it is)

**Files**: Root directory (local cleanup only)

### A2 — Align Java Version to 17 (P0)

Root `Dockerfile` and `backend/Dockerfile` reference Java 21 (`maven:3.9-eclipse-temurin-21-alpine`). CI uses Java 21. Project compiles for Java 17. This causes runtime class version mismatches.

**Actions**:
- Update all Dockerfiles to use `eclipse-temurin-17` base images
- Update `.github/workflows/ci.yml` `JAVA_VERSION` to `'17'`
- Verify `pom.xml` source/target is 17

**Files**: `Dockerfile`, `backend/Dockerfile`, `.github/workflows/ci.yml`

### A3 — Remove Real Credentials from docker-compose Defaults (P1)

`docker-compose.yml` already uses `${VAR:-default}` interpolation, but the default fallback values contain real Neon DB credentials (e.g., `npg_p3Nnmrd9PvhB`) and the JDBC URL contains the actual Neon endpoint. These should not be in version control even as defaults.

**Actions**:
- Remove real Neon DB password from default fallback (force explicit `.env`)
- Remove real Neon JDBC URL from default fallback
- Keep innocuous defaults for local-only services (Redis, MinIO)
- Update `.env.example` with clear placeholder values and setup instructions
- Also check `application-dev.yml` for embedded Neon credentials

**Files**: `docker-compose.yml`, `.env.example`, `application-dev.yml`

### A4 — Restrict K8s Network Policy (P1)

Network policy allows ingress from `0.0.0.0/0` on port 8080. The existing comment explains this is required for GKE GCE ingress (bypasses in-cluster controllers, connects directly to node IPs). However, Cloud Armor should be the enforcement layer.

**Actions**:
- Verify Cloud Armor `hrms-security-policy` is configured in GCP before tightening
- If Cloud Armor is active: restrict ingress to GCP LB health check ranges (`130.211.0.0/22`, `35.191.0.0/16`)
- If Cloud Armor is not yet configured: document this as a prerequisite and defer tightening
- Restrict SMTP egress to specific relay IPs
- Tighten HTTPS egress namespace selector

**Files**: `deployment/kubernetes/network-policy.yaml`

### A5 — Fix K8s Init Container (P1)

Init container uses `nc -z` (netcat) which only checks port reachability, not database readiness. Uses outdated `busybox:1.36`.

**Actions**:
- Replace with `pg_isready` using `postgres:17-alpine` image
- Add resource requests/limits to init container
- Update to current image version

**Files**: `deployment/kubernetes/backend-deployment.yaml`

### A6 — Tighten Ingress CSP (P2)

`ingress.yaml` CSP header includes `unsafe-inline` and `unsafe-eval`, contradicting modern security standards.

**Actions**:
- Remove `unsafe-inline` and `unsafe-eval`
- Use nonce-based or hash-based script loading
- Test frontend for inline script breakage

**Files**: `deployment/kubernetes/ingress.yaml`

### A7 — Clean Up Untracked Sensitive Files (P2)

Binary documents (`NU-AURA_System_Forensics_Report.docx`, `march-19.docx`) and config files (`.mcp.json`) shouldn't be in the repo.

**Actions**:
- Remove binary docs from repo
- Add `*.docx`, `*.doc` patterns to `.gitignore`
- Add `.mcp.json` to `.gitignore`

**Files**: `.gitignore`, root directory

### Spec A Risks

- A1: Google login breaks until new secret is deployed. Coordinate with active users.
- A4: Tightening network policy without Cloud Armor can break production ingress. Verify Cloud Armor first.
- A6: CSP tightening may break inline scripts. Requires frontend testing.

### Removed Items (from original analysis)

- **~~A7 (old) — Environment-Driven CORS Origins~~**: Already implemented. `SecurityConfig.java` uses `@Value("${app.cors.allowed-origins:...}")` with localhost as default fallback. Production overrides via environment variable. No action needed.

---

## Spec B: Scale Readiness Audit

**Priority**: Execute after Spec A. 10 items. Ensures platform handles 100+ tenants, 10K+ employees.

### B1 — Convert EAGER JPA Relationships to LAZY (P1)

7 JPA relationships across 5 entities use `FetchType.EAGER` (`AppRole`, `UserAppAccess`, `Announcement`, `RolePermission`, `Webhook`), loading related data on every query. The auth-related ones (`AppRole`, `UserAppAccess`, `RolePermission`) are highest risk — they load all roles/permissions on every user query.

**Actions**:
- Convert all 7 `EAGER` to `LAZY` in the 5 affected entities
- Add `@EntityGraph` annotations for explicit fetch joins where relationships are needed
- Test all auth/permission flows thoroughly — this is the critical path
- Execute this item first within Spec B to allow maximum testing time

**Files**: 5 entity files in `domain/`

**Risk**: Highest-risk item. Changing fetch strategy can break code that assumes relationships are loaded. Auth flows are critical path.

### B2 — Connection Pool Right-Sizing (P1)

Production HikariCP `max-pool-size: 50`. With 10 pods = 500 connections to Neon, exceeding typical limits.

**Actions**:
- Reduce to `max-pool-size: 20`
- Justify based on Neon's connection limits (not the HikariCP spinning-disk formula which is irrelevant for cloud SSDs)
- Make configurable via ConfigMap

**Files**: `application.yml`, `configmap.yaml`

### B3 — RLS Performance at Scale (P1)

RLS policies (V36-V39) untested with 100+ tenant_ids. May cause seq scans instead of index scans.

**Actions**:
- Benchmark queries with 100+ tenant_ids
- Add composite indexes on `(tenant_id, <filtered_column>)` where missing
- Verify query plans use index scans
- Create seed script for benchmarking

**Files**: New migration V40, entity `@Index` annotations

### B4 — HPA Tuning (P2)

Scale-up doubles capacity (100%) every 30s — overshoot risk. Scale-down stabilization 300s is conservative.

**Actions**:
- Reduce scale-up to 50% increase
- Add environment-specific HPA configs (dev: relaxed, prod: conservative)
- Align frontend maxReplicas with backend

**Files**: `deployment/kubernetes/hpa.yaml`

### B5 — Kafka Consumer Retry Configuration (P2)

DLQ infrastructure already exists (`DeadLetterHandler.java`, `FailedKafkaEvent` entity, `KafkaAdminController` with replay endpoint). What's missing is a `DefaultErrorHandler` with `BackOff` in the Kafka consumer factory — failed messages go straight to the dead letter handler without retry attempts.

**Actions**:
- Add `DefaultErrorHandler` with exponential `BackOff` (3 attempts: 1s/5s/30s) to `KafkaConfig.java` consumer factory
- Add monitoring/alerting for DLQ depth (FailedKafkaEvent count)
- Verify existing replay endpoint works end-to-end

**Files**: `KafkaConfig.java` (consumer factory configuration)

### B6 — Cache Invalidation Completeness Audit (P2)

35 `@CacheEvict` annotations exist across 8 files, and 20 `@Cacheable` annotations across 12 files. Eviction exists but may not cover all mutation paths (e.g., bulk updates, admin overrides, cascade deletes).

**Actions**:
- Audit all 12 files with `@Cacheable` to verify corresponding `@CacheEvict` coverage
- Identify mutation paths that bypass eviction (bulk operations, direct repository calls)
- Verify tenant-scoped cache keys are properly evicted on tenant-specific mutations
- Document cache strategy per entity type

**Files**: Service files paired with `@Cacheable` usage (~12 files)

### B7 — Query Optimization for Large Tables (P2)

Verify pagination strategy for high-volume tables (employees, attendance_records, leave_requests).

**Actions**:
- Identify tables >100K rows in production
- Verify keyset/cursor pagination, not OFFSET-based
- Add `EXPLAIN ANALYZE` for top 10 most-executed queries

**Files**: Repository files, service query methods

### B8 — Redis Failover Handling (P2)

Rate limiter gracefully falls back to in-memory. Cache layer behavior on Redis failure is unclear.

**Actions**:
- Add `@CacheErrorHandler` to return stale/bypass cache on Redis failure
- Ensure no 500 errors on Redis outage
- Add circuit breaker pattern for Redis calls

**Files**: `CacheConfig.java`, `RateLimitingFilter.java`

### B9 — Bulk Operation Performance (P3)

Attendance import, payroll runs, bulk leave accrual may load entire result sets into memory.

**Actions**:
- Verify JDBC batch inserts use configured `batch_size: 20`
- Check for `findAll()` calls that should be paginated/streamed
- Profile memory usage during bulk payroll run

**Files**: `AttendanceImportService`, `PayrollRunService`, `LeaveBalanceService`

### B10 — Async Context Propagation (P3)

Tests exist but need verification that tenant_id and security context propagate to `@Async` methods, scheduled jobs, and Kafka consumers.

**Actions**:
- Review `SecurityContext.java` thread-local implementation
- Verify `TaskDecorator` wraps async threads with tenant context
- Test scheduled jobs (Quartz) for proper tenant scoping

**Files**: `SecurityContext.java`, async service methods

### Spec B Risks

- B1: EAGER→LAZY conversion can break auth flows. Requires comprehensive testing.
- B3: Benchmarking needs a seed script with 100+ tenants. May need temporary test infrastructure.

---

## Spec C: Code Quality & Refactoring

**Priority**: Execute in parallel with Spec B. 12 items. All refactors preserve existing behavior.

### C1 — Break Large Backend Services (P1)

Three services exceed 1,000 LOC: `AIRecruitmentService` (1,513), `ResourceManagementService` (1,137), `RecruitmentManagementService` (1,121). Note: `ResourceConflictService` already exists as an extracted sub-service — verify what extraction has already been done before prescribing further splits.

**Actions**:
- Audit existing sub-services for `ResourceManagementService` (e.g., `ResourceConflictService` already exists)
- Extract `AIRecruitmentService` → `ResumeParsingService`, `CandidateMatchingService`, `AIScoreService`
- Extract remaining `ResourceManagementService` responsibilities → `ResourceAllocationService` (if not already done)
- Extract `RecruitmentManagementService` → `CandidatePipelineService`, `OfferManagementService`
- Use Facade pattern: original class delegates to sub-services
- Each service refactor = 1 PR (3 separate PRs)
- Update all unit tests per PR

**Files**: 2-3 service files → ~6-8 smaller files + updated tests

### C2 — Break Large Frontend Pages (P1)

Six pages exceed 1,400 LOC: `nu-mail` (1,639), `nu-drive` (1,616), `recruitment/candidates` (1,603), `attendance/regularization` (1,489), `payroll` (1,412), `training` (1,403).

**Actions**:
- Extract tab panels, modals, and table sections into co-located components
- Keep page.tsx as orchestrator (<300 LOC)
- Use barrel exports from `_components/` subdirectory

**Files**: 6 page files → page + extracted components per page

### C3 — Replace Broad Exception Catches (P1)

~297 instances of `catch(Exception e)` across ~96 service files. Scope is significantly larger than initially estimated — must be split into multiple PRs.

**Actions**:
- Replace with specific exceptions: `DataAccessException`, `EntityNotFoundException`, `BusinessException`, `ValidationException`
- Prioritize services with `@Transactional` methods (transaction rollback behavior changes with exception type)
- Split into 4 PRs by layer: (1) core services, (2) Kafka/event handlers, (3) integration services, (4) infrastructure/config
- Group by module within each PR for systematic replacement

**Files**: ~96 service files across 4 PRs

### C4 — Break Large Frontend Components (P2)

`CompanyFeed.tsx` (1,507), `Header.tsx` (1,221), `CreateAllocationModal.tsx` (1,012).

**Actions**:
- Extract `CompanyFeed` → `FeedItem`, `FeedComposer`, `FeedFilters`
- Extract `Header` → `HeaderNav`, `HeaderSearch`, `HeaderNotifications`
- Extract `CreateAllocationModal` → `AllocationForm`, `AllocationPreview`

**Files**: 3 component files → ~10 smaller files

### C5 — Add JaCoCo Code Coverage (P2)

No code coverage metrics tracked. CLAUDE.md requires all endpoints covered by tests.

**Actions**:
- Add JaCoCo Maven plugin to `pom.xml`
- Set initial minimum threshold at 60%
- Add coverage report generation to CI pipeline
- Configure `jacoco:check` to fail build if coverage drops

**Files**: `pom.xml`, `.github/workflows/ci.yml`

### C6 — Add Frontend Code Splitting (P2)

14 `dynamic()` imports across 10 files and 4 `<Suspense>` boundaries across 194 pages. Baseline is better than initially estimated but still has room for improvement on heavy pages.

**Actions**:
- Add `dynamic()` for report builder, payroll wizard, and other heavy modal components
- Add `<Suspense>` boundaries on dashboard, recruitment, payroll pages
- Measure bundle size before/after

**Files**: ~8 page files

### C7 — Resolve TODO/FIXME Comments (P2)

4 TODOs across 3 files: `AiUsageService` (2 TODOs — table dependency), `StorageMetricsService` (MinIO integration), `MobileService` (avatar field).

**Actions**:
- Implement if straightforward, or convert to tracked backlog items
- Remove TODO comments from code in either case

**Files**: 3 service files

### C8 — Remove Unused Liquibase Dependency and Legacy Directory (P3)

`liquibase-core` v4.31.1 in `pom.xml` is unused (Flyway is the migration tool). Additionally, `backend/src/main/resources/db/changelog/` is a legacy Liquibase directory marked "DO NOT USE" in CLAUDE.md but still exists.

**Actions**:
- Remove `liquibase-core` from `pom.xml`
- Delete `backend/src/main/resources/db/changelog/` directory
- Verify build succeeds without either

**Files**: `pom.xml`, `backend/src/main/resources/db/changelog/`

### C9 — Refactor Admin Permissions Page (P3)

`/app/admin/permissions/page.tsx` uses controlled inputs with `useState` instead of React Hook Form + Zod.

**Actions**:
- Refactor to use `useForm` + Zod schema
- Maintain existing functionality

**Files**: 1 page file

### C10 — ~~Migrate Chat Fetch to Axios~~ REMOVED

**Reason**: `fluence-chat.service.ts` uses `fetch()` for SSE/streaming chat. Axios `responseType: 'stream'` works in Node.js but NOT in browsers. For browser-based SSE streaming, `fetch()` with `ReadableStream` is the correct approach. Migrating to axios would introduce a regression. No action needed.

### C11 — Add Strategic React.memo (P3)

Only 1 explicit `React.memo` across 107 components.

**Actions**:
- Add to modal content components (prevent parent re-renders)
- Add to large table row renderers
- Add to sidebar section components
- Profile before/after to verify improvement

**Files**: ~8 component files

### C12 — Expand E2E Test Coverage (P3)

31 Playwright specs miss: admin workflows, document workflows, custom fields CRUD, app switcher.

**Actions**:
- Add 5-8 new Playwright specs covering gaps
- Focus on admin role management, document upload/approval, app switching

**Files**: `frontend/e2e/`

### Spec C Risks

- C1: Service refactoring changes class boundaries. All existing unit tests must be updated. Controller injection points change.
- C3: Exception narrowing may surface hidden error paths. Requires understanding what each service can actually throw.
- C2/C4: Low-risk — extracting existing code with no behavioral change.

---

## Execution Plan

```
Week 1-1.5: Spec A (7 items) — security is non-negotiable
            A1 requires GCP Console access; A2 requires CI pipeline changes
Week 2+:    Spec B + Spec C in parallel
            - B and C touch different files (domain entities vs page components)
            - Shared touchpoint: pom.xml (B: none, C: JaCoCo + Liquibase removal)
```

### Recommended Order Within Each Spec

**Spec B** (execute in this order):
1. B1 (EAGER→LAZY) — highest risk, do first for maximum testing time
2. B2 (connection pool) — quick win
3. B3 (RLS benchmarking) — needs seed script
4. B5-B10 in priority order

**Spec C** (execute in this order):
1. C3 (exception catches) — highest value, 4 PRs
2. C1 (service refactoring) — 3 PRs
3. C2, C4 (page/component splitting) — low risk
4. C5-C12 in priority order

### Dependencies Between Specs

- **A → B**: A2 (Java version) must complete before B can be tested in CI
- **A → C**: No blocking dependency
- **B ↔ C**: Independent. Only shared file is `pom.xml` (coordinate C5/C8)

### Coordination Rules

- All changes on feature branches, merged via PR
- Most spec items = 1 PR, except: C1 (3 PRs), C3 (4 PRs)
- B1 (EAGER→LAZY) gets its own integration test suite before merge

### Items Removed After Review

| Item | Reason |
|------|--------|
| A7 (old — CORS externalization) | Already implemented via `@Value` with env override |
| C10 (chat fetch migration) | Axios streaming doesn't work in browsers; `fetch()` is correct for SSE |
