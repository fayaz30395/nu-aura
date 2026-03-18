# NU-AURA Deep Codebase Analysis — Design Document

**Date**: 2026-03-19
**Status**: Approved
**Scope**: Security remediation, scale readiness audit, code quality improvement

---

## Overview

Deep analysis of the NU-AURA codebase (1,432 Java files, 1,093 TS/TSX files, 39 Flyway migrations, 13 K8s manifests) identified 30 actionable items across three categories. Work is decomposed into three independent specs executed as: **A (now) → B + C (parallel)**.

### Codebase Grades

| Dimension | Grade | Score |
|-----------|-------|-------|
| Backend | B+ | 8.5/10 |
| Frontend | A- | 9/10 |
| Infrastructure | B | 8/10 |

---

## Spec A: Security & Critical Fixes

**Priority**: Execute immediately. 8 items. Must resolve before production deployment.

### A1 — Regenerate Google OAuth Secret (P0)

`client_secret_*.json` is committed to the repo with plaintext OAuth credentials. The secret `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` is compromised.

**Actions**:
- Regenerate OAuth client secret in Google Cloud Console
- Delete the committed file from the repo
- Scrub from git history using `git filter-repo`
- Add `client_secret*.json` pattern to `.gitignore`

**Files**: Root directory, `.gitignore`

### A2 — Align Java Version to 17 (P0)

Root `Dockerfile` and `backend/Dockerfile` reference Java 21 (`maven:3.9-eclipse-temurin-21-alpine`). CI uses Java 21. Project compiles for Java 17. This causes runtime class version mismatches.

**Actions**:
- Update all Dockerfiles to use `eclipse-temurin-17` base images
- Update `.github/workflows/ci.yml` `JAVA_VERSION` to `'17'`
- Verify `pom.xml` source/target is 17

**Files**: `Dockerfile`, `backend/Dockerfile`, `.github/workflows/ci.yml`

### A3 — Externalize docker-compose Credentials (P1)

`docker-compose.yml` contains hardcoded DB password, JWT secret, MinIO creds, and encryption key in plaintext.

**Actions**:
- Replace all credential values with `${VAR}` interpolation
- Update `.env.example` with placeholder values and documentation
- Verify `.env` is in `.gitignore` (already is)

**Files**: `docker-compose.yml`, `.env.example`

### A4 — Restrict K8s Network Policy (P1)

Network policy allows ingress from `0.0.0.0/0` on port 8080, effectively disabling the security policy.

**Actions**:
- Replace with GCP LB health check ranges: `130.211.0.0/22`, `35.191.0.0/16`
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

### A7 — Environment-Driven CORS Origins (P2)

CORS allowed origins are hardcoded to `localhost` ports in `SecurityConfig.java`.

**Actions**:
- Externalize to `app.cors.allowed-origins` config property
- Set via ConfigMap in K8s, environment variable in docker-compose
- Remove hardcoded localhost values from SecurityConfig

**Files**: `SecurityConfig.java`, `configmap.yaml`, `application.yml`

### A8 — Clean Up Untracked Sensitive Files (P2)

Binary documents (`NU-AURA_System_Forensics_Report.docx`, `march-19.docx`) and config files (`.mcp.json`) shouldn't be in the repo.

**Actions**:
- Remove binary docs from repo
- Add `*.docx`, `*.doc` patterns to `.gitignore`
- Add `.mcp.json` to `.gitignore`

**Files**: `.gitignore`, root directory

### Spec A Risks

- A1: Google login breaks until new secret is deployed. Coordinate with active users.
- A6: CSP tightening may break inline scripts. Requires frontend testing.

---

## Spec B: Scale Readiness Audit

**Priority**: Execute after Spec A. 10 items. Ensures platform handles 100+ tenants, 10K+ employees.

### B1 — Convert EAGER JPA Relationships to LAZY (P1)

22 JPA relationships use `FetchType.EAGER`, loading all roles/permissions on every user query. Risk of N+1 queries at scale.

**Actions**:
- Convert all `EAGER` to `LAZY` in `UserAppAccess`, `AppRole`, `RolePermission`, and ~12 other entities
- Add `@EntityGraph` annotations for explicit fetch joins where relationships are needed
- Test all auth/permission flows thoroughly

**Files**: ~15 entity files in `domain/`

**Risk**: Highest-risk item. Changing fetch strategy can break code that assumes relationships are loaded. Auth flows are critical path.

### B2 — Connection Pool Right-Sizing (P1)

Production HikariCP `max-pool-size: 50`. With 10 pods = 500 connections to Neon, exceeding typical limits.

**Actions**:
- Reduce to `max-pool-size: 20`
- Document formula: `pool = (core_count * 2) + disk_spindles`
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

### B5 — Kafka Resilience (P2)

No DLQ or retry policy. Failed events stored in `FailedKafkaEvent` table but not automatically retried.

**Actions**:
- Add exponential backoff retry (3 attempts, 1s/5s/30s)
- Configure DLQ topic for permanently failed events
- Add monitoring for DLQ depth

**Files**: New `KafkaRetryConfig.java`, Kafka consumer configs

### B6 — Cache Invalidation Audit (P2)

`CacheConfig.java` sets TTLs but no explicit `@CacheEvict` on entity mutations observed.

**Actions**:
- Audit all service methods with `@Cacheable` counterparts
- Add `@CacheEvict` to corresponding `update()`, `delete()` methods
- Verify tenant-scoped cache keys are properly evicted

**Files**: Service files paired with `@Cacheable` usage

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

Three services exceed 1,000 LOC: `AIRecruitmentService` (1,513), `ResourceManagementService` (1,137), `RecruitmentManagementService` (1,121).

**Actions**:
- Extract `AIRecruitmentService` → `ResumeParsingService`, `CandidateMatchingService`, `AIScoreService`
- Extract `ResourceManagementService` → `ResourceAllocationService`, `ResourceConflictService`
- Extract `RecruitmentManagementService` → `CandidatePipelineService`, `OfferManagementService`
- Use Facade pattern: original class delegates to sub-services
- Update all unit tests

**Files**: 3 service files → ~9 smaller files + updated tests

### C2 — Break Large Frontend Pages (P1)

Six pages exceed 1,400 LOC: `nu-mail` (1,639), `nu-drive` (1,616), `recruitment/candidates` (1,603), `attendance/regularization` (1,489), `payroll` (1,412), `training` (1,403).

**Actions**:
- Extract tab panels, modals, and table sections into co-located components
- Keep page.tsx as orchestrator (<300 LOC)
- Use barrel exports from `_components/` subdirectory

**Files**: 6 page files → page + extracted components per page

### C3 — Replace Broad Exception Catches (P1)

93 instances of `catch(Exception e)` across ~40 service files.

**Actions**:
- Replace with specific exceptions: `DataAccessException`, `EntityNotFoundException`, `BusinessException`, `ValidationException`
- Prioritize services with `@Transactional` methods (transaction rollback behavior changes with exception type)
- Group by module for systematic replacement

**Files**: ~40 service files

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

Only 8 `dynamic()` imports and 4 `<Suspense>` boundaries across 194 pages.

**Actions**:
- Add `dynamic()` for TipTap editor, report builder, payroll wizard
- Add `<Suspense>` boundaries on dashboard, recruitment, payroll pages
- Measure bundle size before/after

**Files**: ~10 page files

### C7 — Resolve TODO/FIXME Comments (P2)

4 TODOs in production code: `AiUsageService` (table dependency), `StorageMetricsService` (MinIO integration), `MobileService` (avatar field), 1 other.

**Actions**:
- Implement if straightforward, or convert to tracked backlog items
- Remove TODO comments from code in either case

**Files**: 4 service files

### C8 — Remove Unused Liquibase Dependency (P3)

`liquibase-core` v4.31.1 in `pom.xml` is unused. Flyway is the migration tool.

**Actions**:
- Remove `liquibase-core` from `pom.xml`
- Verify build succeeds without it

**Files**: `pom.xml`

### C9 — Refactor Admin Permissions Page (P3)

`/app/admin/permissions/page.tsx` uses controlled inputs with `useState` instead of React Hook Form + Zod.

**Actions**:
- Refactor to use `useForm` + Zod schema
- Maintain existing functionality

**Files**: 1 page file

### C10 — Migrate Chat Fetch to Axios (P3)

`fluence-chat.service.ts` uses raw `fetch()` for streaming.

**Actions**:
- Migrate to axios with `responseType: 'stream'`
- Maintain streaming behavior
- Use existing `apiClient` instance

**Files**: 1 service file

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
Week 1:  Spec A (all 8 items) — security is non-negotiable
Week 2+: Spec B + Spec C in parallel
         - B and C touch different files (domain entities vs page components)
         - Shared touchpoint: pom.xml (B: none, C: JaCoCo + Liquibase removal)
```

### Dependencies Between Specs

- **A → B**: A2 (Java version) must complete before B can be tested in CI
- **A → C**: No blocking dependency
- **B ↔ C**: Independent. Only shared file is `pom.xml` (coordinate C5/C8)

### Coordination Rules

- All changes on feature branches, merged via PR
- Each spec item = 1 PR (small, reviewable)
- B1 (EAGER→LAZY) gets its own integration test suite before merge
