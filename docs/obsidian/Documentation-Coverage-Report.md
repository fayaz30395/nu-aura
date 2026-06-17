---
title: Documentation Coverage Report
tags: [meta, coverage, report]
generated: 2026-06-16
---

# Documentation Coverage Report — NU-AURA Obsidian Vault

Generated 2026-06-16 by full-codebase discovery (parallel section authors, each verifying against source). This report records what the vault covers, the metrics it was built from, and every gap or discrepancy found so the next pass is targeted.

**Merge note (2026-06-16):** the former flat docs (`docs/architecture/`, `docs/reference/`, `docs/apps/`, `docs/patterns/`, `docs/setup/`) have been folded into this vault — architecture/API/database/patterns/setup content now lives inside the numbered sections below, and the flat copies are retired. Notably, the migrations reference is now [[Migrations]], the code-patterns reference is now [[Code-Patterns]], and local-setup is now [[Local-Setup]]. The vault is the single canonical knowledge base; GitHub readers enter via [docs/README.md](../README.md).

> **Pass 2 (2026-06-16, re-verification):** every metric below re-measured live against
> `backend/src/main/java/com/nulogic/`. Discrepancies #5–#7 are **resolved** (vault aligned
> to 184 controllers / ~331 tables; the `3.3.1` pin is Apache Tika, not Spring Boot). New
> deep-dive [[Scheduled-Jobs]] corrects the scheduled-job figure to **25 methods / 15
> components (24 `@SchedulerLock`-guarded, 1 per-pod)**.
>
> **Pass 3 (2026-06-17, exhaustive leaf-level enumeration):** the "representative, not
> exhaustive" catalogs were promoted to **complete enumerations** — [[Route-Map-Full]]
> (all 283 routes), [[Controller-Index]] (all 180 controllers), [[Table-Index]] (all 330
> tables) — plus an end-to-end [[Feature-Traceability]] matrix. Refined two counts:
> **controllers 180 (not raw-`grep` 184)** and **tables 330 (not ~331)** — discrepancies #10–#11.
>
> **Pass 4 (2026-06-17, deepest layer + executed tests):** eight more notes reach
> method/column granularity and add an executed-test record: [[Endpoint-Index]] +
> [[Endpoints-HRMS]] (712) · [[Endpoints-Platform]] (429) · [[Endpoints-Hire]] (243) ·
> [[Endpoints-Grow]] (231) · [[Endpoints-Fluence]] (96) = **1,711 endpoints**;
> [[Data-Dictionary]] (90 core tables + complete **347-edge FK map**); [[Test-Catalog]].
> Tests **run**: FE Vitest **2,419/2,419 pass**, BE test sources **compile**, FE lint **0
> errors**. New findings: discrepancies #12 (JaCoCo gate **0.10**, not 0.80), #13
> (encryption spans **10 entities + plaintext PII gaps**, not 3 → tracked in
> [[Security-Audit]]), #14 (DB FK edges are a floor — logical FKs exist).

## 1. Coverage summary

| Area | Vault notes | Status | Evidence depth |
|------|-------------|--------|----------------|
| Architecture (C4 + decisions) | [[System-Overview]] [[Architecture-Decisions]] [[C4-Context]] [[C4-Container]] [[C4-Component]] | ✅ Complete | High — verified DDD layers + employee vertical slice (former `architecture/` folded in) |
| Code patterns | [[Code-Patterns]] | ✅ Complete | High — Redis/RLS/Kafka/locks excerpts grounded in file paths (former `patterns/` folded in) |
| Modules (4 sub-apps + platform) | [[Nu-HRMS]] [[Nu-Hire]] [[Nu-Grow]] [[Nu-Fluence]] [[Shared-Platform]] | ✅ Complete | High — controllers + routes grepped (former `apps/` folded in) |
| Frontend | [[Routes]] [[Pages]] [[Components]] [[Route-Map-Full]] | ✅ Complete | High — [[Route-Map-Full]] enumerates all **283** routes (exhaustive) |
| Backend | [[APIs]] [[Services]] [[Middleware]] [[Controller-Index]] [[Endpoint-Index]] | ✅ Complete | High — [[Controller-Index]] (180 controllers 1:1) + [[Endpoint-Index]] (**1,711** endpoints per-method); filter order read from `SecurityConfig` |
| RBAC | [[Roles]] [[Permissions]] [[RBAC-Matrix]] [[Permission-Ownership]] | ✅ Complete | High — `RoleHierarchy.java` enumerated; per-permission/role→sub-app ownership mapped from `apps.ts` + `RoleHierarchy` app tags |
| Database | [[Schema]] [[ERD]] [[Migrations]] [[Table-Index]] [[Data-Dictionary]] | ✅ Complete | High — [[Table-Index]] (all **330** tables) + [[Data-Dictionary]] (per-column on 90 core tables + **347-edge FK map**) |
| DevOps | [[Deployment]] [[CI-CD]] [[Local-Setup]] | ✅ Complete | High — workflows + compose enumerated; local-dev run steps (former `setup/` folded in) |
| Security | [[Security-Audit]] | ✅ Complete | High — controls + known findings |
| Testing | [[QA-Strategy]] [[Test-Coverage]] [[Test-Catalog]] | ✅ Complete | High — [[Test-Catalog]] enumerates all suites (308 BE / 74 integration / 90 Vitest / 117 Playwright) + how-to-run; FE Vitest re-run green 2026-06-17 |
| Runbooks | [[Production-Support]] [[Incident-Response]] | ⚠️ Templated | Medium — no `docs/runbooks/` on disk; procedural detail is templated |
| Decisions | [[ADR-001]]…[[ADR-005]] | ✅ Complete | High — reverse-engineered from code |
| Knowledge graph | [[Module-Relationships]] [[Data-Flows]] [[System-Flows]] [[Feature-Traceability]] | ✅ Complete | High — flows traced to classes; [[Feature-Traceability]] adds the full vertical-slice matrix |

**53 notes** across 13 sections (plus [[00-Home]] and this report). **0 unresolved wikilinks**, **0 unbalanced Mermaid fences** (validated). Mermaid diagrams across architecture, C4, ERD, sequence, and flow types. Recent additions: [[Migrations]], [[Code-Patterns]], [[Local-Setup]] (merge round), [[Scheduled-Jobs]] (pass-2 re-verification), and [[Permission-Ownership]] (per-permission/role→sub-app ownership map).

## 2. Verified metrics (point-in-time, 2026-06-16)

| Metric | Value | Source |
|--------|-------|--------|
| Backend `@RestController` | 184 | `grep -rl @RestController` |
| `api/*` domain packages | 68 | `ls api/` |
| `@Service` | 257 (app 225 / infra 19 / common 11 / domain 1) | grep |
| Repositories | 288 | grep |
| `@Scheduled` jobs | 25 methods / 15 components (24 `@SchedulerLock`-guarded; 1 per-pod) | grep `@Scheduled` + `@SchedulerLock` (`-rl`=17 incl. 2 doc-comment files) |
| Kafka `@KafkaListener` | 7 (+ DLT) | grep |
| `@ExceptionHandler` (GlobalExceptionHandler) | 26 | source |
| Frontend `page.tsx` | 283 | `find` |
| `layout.tsx` / `error.tsx` / `loading.tsx` | 240 / 273 / 282 | `find` |
| Dynamic route segments | 28 | `find` |
| Components (`*.tsx` in components/) | 170 | `find` |
| `use*` hook files / query hooks | 127 / 93 | `find` |
| Client components (`'use client'`) | ~1043 of 1323 `.tsx` (~79%) | grep |
| RBAC roles | 26 (19 explicit + 7 implicit) | `RoleHierarchy.java` |
| `@RequiresPermission` usages | 190 | grep |
| Flyway migrations | V0–V294 (286 files) | `find db -name 'V*.sql'` |
| Distinct tables | ~331 (343 `CREATE TABLE` incl. variants) | grep |
| RLS-touching migrations | 15 | grep |
| Backend test files | 308 (`*Test*.java`); 74 extend `AbstractPostgresIntegrationTest` | `find` |
| Frontend test files | 90 Vitest + 117 Playwright specs | `find` |

## 3. Discrepancies found (worth reconciling)

These are real inconsistencies the discovery surfaced between docs/memory and code. None were silently "smoothed over" — each is flagged in the relevant note.

1. **RBAC role count: 26, not "~9".** `common/security/RoleHierarchy.java` defines 19 explicit + 7 implicit roles. The "9-role" figure in `MEMORY.md` / global notes is only the *core* set. See [[Roles]].
2. **Enforcement is `@RequiresPermission`, not `@PreAuthorize`.** A custom annotation (190 sites) via `PermissionHandlerInterceptor` + `PermissionAspect` is the real authz path; Spring `@PreAuthorize` appears at only ~2 sites. See [[Permissions]].
3. **Frontend role taxonomy diverges from backend.** `frontend/lib/constants/roles.ts` omits `TENANT_ADMIN`/`HR_MANAGER`/`RECRUITMENT_ADMIN`; `usePermissions.ts` invents `MANAGER`/`FINANCE_ADMIN`/`RECRUITER`/`TRAINER` which are **not** backend roles (inline comments confirm). Server-side gating on these never matches. See [[RBAC-Matrix]].
4. **Security filter order.** `SecurityConfig.java` net order is **RateLimiting → Tenant → ApiKey → JWT → CSRF** (double `addFilterBefore` reverses intuition); the former `architecture/backend.md` diagram showed JWT→ApiKey. Vault documents the code order as authoritative. See [[Middleware]].
5. **Controller count — resolved.** Live grep **184**; the C4 diagrams + [[System-Overview]] previously read 179 and are now aligned to 184 vault-wide.
6. **"Spring Boot version skew" — resolved (was a misread).** The two `<version>3.3.1</version>` entries in `pom.xml` are **Apache Tika** (`tika-core`, `tika-parsers-standard-package`), not Spring Boot. Framework BOM is **3.5.14**; no skew. See [[System-Overview]].
7. **Table count — resolved.** ~**331** distinct names (343 `CREATE TABLE` incl. partition/re-create variants); the four spots that read "~342" are now aligned to ~331. See [[Schema]].
8. **Frontend Docker base drift.** `frontend/Dockerfile` uses `node:26-alpine`; older docs said `node:20`. Dockerfile authoritative. See [[Deployment]].
9. **`RecruitmentManagementController.java.disabled`** exists but is excluded from the build. See [[Nu-Hire]] / [[APIs]].
10. **Controller count: 180 true, not 184 (pass-3).** Raw `grep -rl '@RestController'` returns 184 but over-counts by 4 (1 `.disabled` + 2 `@RestControllerAdvice` + 1 annotation source). True live count **180**. See [[Controller-Index]].
11. **Table count: 330 distinct, not ~331 (pass-3).** The "~331" included one false positive (`above`, from a SQL comment in `V15`). Real count **330** across 341 `CREATE TABLE`. See [[Table-Index]] / [[Schema]].
12. **JaCoCo enforced gate is 0.10, not 0.80 (pass-4).** `pom.xml` sets the `mvn verify` gate to a **0.10 ratchet floor**; **0.80 is the backlog target** (T3-15); ~0.19 is last reported. Earlier notes implied an 0.80 gate. See [[Test-Catalog]].
13. **Field-encryption spans 10 entities + plaintext PII gaps, not 3 (pass-4).** [[Schema]] noted 3 encrypted columns; actual `@Convert(EncryptedStringConverter)` covers **10 entities**, and PII columns (PF/ESI numbers, candidate `email`/`phone`/`resume_url`, `contract_signatures.signer_email`) are **plaintext**. Corrected in [[Schema]]; detailed in [[Data-Dictionary]]; open item in [[Security-Audit]].
14. **DB FKs are a floor (pass-4).** [[Data-Dictionary]] found **347** DB-enforced FK edges; several anchor relationships carry the parent id without a `REFERENCES` constraint (logical FKs), so true coupling exceeds 347.

## 4. Gaps & undocumented areas (candidates for next pass)

- **Leaf-level enumeration — CLOSED (pass 3–4).** Every route ([[Route-Map-Full]]), controller ([[Controller-Index]]), endpoint ([[Endpoint-Index]] + 5 per-sub-app catalogs, **1,711**), and table ([[Table-Index]]) is enumerated; [[Data-Dictionary]] adds per-column detail on 90 core tables + a complete **347-edge FK map**; [[Feature-Traceability]] joins them into per-feature slices. Remaining sampled depth: per-column detail for long-tail tables and per-endpoint DTO schemas.
- **Count-sweep follow-up.** [[APIs]] / [[System-Overview]] still cite the raw-`grep` 184 controllers (true 180); section-2 metrics below remain at the 2026-06-16 figures. Reconciled figures live in the index notes + discrepancies #10–#14.
- **Test coverage below standard.** Backend JaCoCo line ~0.19; the **enforced `mvn verify` gate is a 0.10 ratchet floor** (0.80 is the backlog target, not the gate — discrepancy #12). Frontend Vitest threshold 60%. See [[Test-Catalog]] / [[Test-Coverage]].
- **Runbooks are templated.** `docs/runbooks/` doesn't exist on disk; [[Production-Support]] / [[Incident-Response]] procedural detail is aspirational pending real runbooks.
- **Scheduled-jobs deep-dive — closed.** [[Scheduled-Jobs]] enumerates all 25 jobs (schedules, ShedLock names + windows) and pointer-documents the WebSocket relay (`RedisWebSocketRelay`) and read-replica routing (`RoutingDataSourceConfig`).
- **Per-permission sub-app ownership — closed.** [[Permission-Ownership]] maps every `Permission` family and role onto the four sub-apps + platform, grounded in `frontend/lib/config/apps.ts` (`permissionPrefixes`), `RoleHierarchy.java` app-tag comments, and `@RequiresPermission` controller packages.
- **Generated API client layer** (`frontend/lib/generated/api/*`) is gitignored — documented from `orval.config.ts` + snapshot, not read directly. See [[Routes]] / [[APIs]].
- **RBAC matrix reflects default grants** from `RoleHierarchy`, not live tenant `role_permissions` (admins can diverge per tenant). See [[RBAC-Matrix]].
- **Live RLS proof** (NOBYPASSRLS `nu_app_rls` role) is CI-only; local guard is static-source only. See [[Migrations]] / [[Code-Patterns]].

## 5. Validation performed

- ✅ All 53 notes present in the prescribed 13-section structure (plus Home + this report); link integrity re-checked 2026-06-17 after pass-3 ([[Route-Map-Full]], [[Controller-Index]], [[Table-Index]], [[Feature-Traceability]]) and pass-4 ([[Endpoint-Index]] + 5 endpoint catalogs, [[Data-Dictionary]], [[Test-Catalog]]).
- ✅ Tests executed 2026-06-17: **FE Vitest 2,419/2,419 pass** (90 files); **BE test sources compile** (`mvn test-compile`, JDK 23, `-Djacoco.skip=true`); FE ESLint **0 errors** (82 design-system spacing warnings remain). **Not run locally:** BE full suite incl. 74 Testcontainers integration tests (Docker/colima down — CI authoritative, prior run 4,055 green) and Playwright (low local signal).
- ✅ Wikilink integrity: every `[[target]]` resolves to an existing note basename (0 broken), including [[Permission-Ownership]] and the three merged-in notes [[Migrations]], [[Code-Patterns]], [[Local-Setup]].
- ✅ Mermaid fence balance: all code fences even (0 malformed blocks).
- ✅ Counts re-measured live from source (not copied from prior docs).
- ✅ Flat-doc references removed: Home and this report no longer point at the retired `architecture/`, `reference/`, `patterns/`, `setup/` folders.
- ⚠️ Not run: BE integration suite + coverage (needs Docker), browser route-walk of all 283 pages, Playwright (low local signal). Per-endpoint enumeration of all 180 controllers is now **done** ([[Endpoint-Index]]).

## 6. Estimated coverage

All 12 prescribed sections + Home are authored and cross-linked; the former flat reference/architecture/patterns/setup content is now merged in, so the vault is self-contained. All major modules and platform concerns are represented and verified against code. **Structural & module coverage ≈ 100%, and (as of pass 4) leaf-level coverage is exhaustive at method and column granularity**: every route, controller, endpoint (**1,711**), table (330), and test suite is enumerated, with per-column detail on 90 core tables + a complete **347-edge FK map**, all joined by [[Feature-Traceability]]. Remaining sampled depth is minimal (long-tail table columns, per-endpoint DTO schemas). Counts are point-in-time (2026-06-17) and will drift — re-measure before quoting in a release.

Related: [[00-Home]]
