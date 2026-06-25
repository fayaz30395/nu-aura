---
title: Documentation Coverage Report
tags: [meta, coverage, report]
generated: 2026-06-25
---

# Documentation Coverage Report — NU-AURA Obsidian Vault

Generated 2026-06-16 by full-codebase discovery (parallel section authors, each verifying against source); last updated 2026-06-25 (pass 6 — product/delivery layer plus graphify rebuild). This report records what the vault covers, the metrics it was built from, and every gap or discrepancy found so the next pass is targeted.

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
>
> **Pass 5 (2026-06-18, section reconciliation):** all 12 numbered sections re-audited
> against HEAD; counts updated to reflect new migrations (V300–V304), outbox poller
> (26th `@Scheduled` method), and Flyway re-enablement. Key updated figures: **286**
> frontend pages (was 283), **171** components (162 non-test; was 170), **180** live controllers (stable),
> **258** services (was 257), **289** repositories (was 288), **26** scheduled jobs (was 25),
> **293** migration files highest V304 (was 286 files / V294), **331** distinct tables /
> 344 CREATE TABLE statements (was 330/341). Readiness verdict updated to **92/100
> CONDITIONAL-GO** (QA iteration 6, 2026-06-18). Note count increased to **57** (added
> [[Readiness-Session-2026-06-18]] + [[Ruflo-Autopilot-Hazard]]). [[00-Home]] and
> [[docs/README.md]] reconciled to match — all missing sections now reachable from both
> map files.
>
> **Pass 6 (2026-06-25, product/delivery layer):** added stakeholder-facing section
> [[Product-Delivery-Index]] with [[Application-Map]], [[Product-Requirements-Document]],
> [[Work-Breakdown-Structure]], [[Product-Architecture]], and [[User-Manual]]. Added
> [[Graphify-Code-Graph]] after rebuilding `graphify-out/` from the current checkout:
> **58,943 nodes / 142,248 edges**, built from commit `da01fd4c`. Fresh count sweep for this
> product layer found **290** frontend pages, raw **184** `@RestController` files, **70**
> backend application contexts, **305** Flyway migration files, highest **V316**. These fresh
> counts are a product-doc snapshot; the older exhaustive leaf catalogs still need a full
> reconciliation pass before release quotation.

## 1. Coverage summary

| Area | Vault notes | Status | Evidence depth |
|------|-------------|--------|----------------|
| Architecture (C4 + decisions) | [[System-Overview]] [[Architecture-Decisions]] [[C4-Context]] [[C4-Container]] [[C4-Component]] | ✅ Complete | High — verified DDD layers + employee vertical slice (former `architecture/` folded in) |
| Code patterns | [[Code-Patterns]] | ✅ Complete | High — Redis/RLS/Kafka/locks excerpts grounded in file paths (former `patterns/` folded in) |
| Modules (4 sub-apps + platform) | [[Nu-HRMS]] [[Nu-Hire]] [[Nu-Grow]] [[Nu-Fluence]] [[Shared-Platform]] | ✅ Complete | High — controllers + routes grepped (former `apps/` folded in) |
| Frontend | [[Routes]] [[Pages]] [[Components]] [[Route-Map-Full]] | ✅ Complete | High — [[Route-Map-Full]] enumerates all **286** routes (exhaustive) |
| Backend | [[APIs]] [[Services]] [[Middleware]] [[Controller-Index]] [[Endpoint-Index]] [[Scheduled-Jobs]] | ✅ Complete | High — [[Controller-Index]] (180 live controllers 1:1) + [[Endpoint-Index]] (**1,711** endpoints per-method); filter order read from `SecurityConfig` |
| RBAC | [[Roles]] [[Permissions]] [[RBAC-Matrix]] [[Permission-Ownership]] | ✅ Complete | High — `RoleHierarchy.java` enumerated; per-permission/role→sub-app ownership mapped from `apps.ts` + `RoleHierarchy` app tags |
| Database | [[Schema]] [[ERD]] [[Migrations]] [[Table-Index]] [[Data-Dictionary]] | ✅ Complete | High — [[Table-Index]] (all **331** distinct tables) + [[Data-Dictionary]] (per-column on 90 core tables + **347-edge FK map**); highest migration V304 |
| DevOps | [[Deployment]] [[CI-CD]] [[Local-Setup]] | ✅ Complete | High — workflows + compose enumerated; local-dev run steps (former `setup/` folded in) |
| Security | [[Security-Audit]] | ✅ Complete | High — controls + known findings |
| Testing | [[QA-Strategy]] [[Test-Coverage]] [[Test-Catalog]] [[Readiness-Session-2026-06-18]] | ✅ Complete | High — [[Test-Catalog]] enumerates all suites (310 BE files / 74 integration / 90 Vitest / 117 Playwright; 4,076 BE green in CI); [[Readiness-Session-2026-06-18]] records 92/100 CONDITIONAL-GO verdict (2026-06-18) |
| Runbooks | [[Production-Support]] [[Incident-Response]] [[Ruflo-Autopilot-Hazard]] | ⚠️ Templated | Medium — no `docs/runbooks/` on disk; procedural detail is templated; [[Ruflo-Autopilot-Hazard]] is evidence-grounded (root cause diagnosed) |
| Decisions | [[ADR-001]]…[[ADR-005]] | ✅ Complete | High — reverse-engineered from code |
| Knowledge graph | [[Module-Relationships]] [[Data-Flows]] [[System-Flows]] [[Feature-Traceability]] [[Graphify-Code-Graph]] | ✅ Complete | High — flows traced to classes; [[Feature-Traceability]] adds the full vertical-slice matrix; [[Graphify-Code-Graph]] documents the local code graph |
| Product & delivery | [[Product-Delivery-Index]] [[Application-Map]] [[Product-Requirements-Document]] [[Work-Breakdown-Structure]] [[Product-Architecture]] [[User-Manual]] | ✅ Added | Medium-high — stakeholder-facing docs grounded in existing source/vault evidence; not a live user-training signoff |

**64 notes** across 14 numbered sections (plus [[00-Home]] and this report). Link and fence validation should be re-run after every docs pass. Mermaid diagrams span architecture, C4, ERD, sequence, flow, product, and delivery views. Recent additions: [[Graphify-Code-Graph]] and the [[Product-Delivery-Index]] section.

## 2. Verified metrics (point-in-time, 2026-06-18)

| Metric | Value | Source |
|--------|-------|--------|
| Backend `@RestController` live | 180 (raw grep 184; −4 = 1 disabled + 2 `@RestControllerAdvice` + 1 annotation source) | `grep -rl @RestController` + [[Controller-Index]] reconciliation |
| `api/*` domain packages (bounded contexts) | 68 | `ls api/` |
| `@Service` | 258 | grep |
| Repositories | 289 | grep |
| `@Scheduled` jobs | 26 methods / 16 components (24 `@SchedulerLock`-guarded; 1 per-pod Redis probe; 1 outbox poller no ShedLock) | grep `@Scheduled` |
| Kafka `@KafkaListener` | 7 (+ DLT); outbox fallback active on Railway (`app.kafka.enabled=false`) | grep |
| `@ExceptionHandler` (GlobalExceptionHandler) | 30 | source |
| Frontend `page.tsx` | 286 | `find frontend/app -name page.tsx` |
| `layout.tsx` / `error.tsx` / `loading.tsx` | 240 / 273 / 282 | `find` |
| Dynamic route segments | 28 | `find` |
| Components (`*.tsx` in components/) | 171 (162 non-test) | `find` |
| `use*` hook files / query hooks | 121 / 93 | `find` |
| Client components (`'use client'`) | ~1044 of 1327 `.tsx` (~79%) | grep |
| RBAC roles | 26 (19 explicit + 7 implicit) | `RoleHierarchy.java` |
| `@RequiresPermission` usages | ~1,750 (across ~188 non-test files) | grep |
| Flyway migrations | V0–V304 (293 files; highest = V304) | `find db -name 'V*.sql'` |
| Distinct table names | 331 (344 `CREATE TABLE` statements) | grep + [[Table-Index]] |
| RLS-touching migrations | 15+ | grep |
| Backend test files | 310 (`*Test*.java`); 74 extend `AbstractPostgresIntegrationTest` | `find` |
| Backend tests in CI (most recent) | 4,076 green | CI run |
| Frontend test files | 90 Vitest + 117 Playwright specs; 2,419 Vitest green | `find` |

### Fresh product-layer sweep (2026-06-25)

| Metric | Value | Source |
|--------|-------|--------|
| Frontend `page.tsx` | 290 | `find frontend/app -name page.tsx` |
| Raw `@RestController` files | 184 | `rg -l "@RestController" backend/src/main/java/com/nulogic` |
| Backend application top-level contexts | 70 | `find backend/src/main/java/com/nulogic/application -maxdepth 1 -mindepth 1 -type d` |
| Flyway migrations | 305 files; highest V316 | `find backend/src/main/resources/db/migration -name 'V*.sql'` |
| Graphify code graph | 58,943 nodes / 142,248 edges | `graphify update .` |

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
11. **Table count: 331 distinct (pass-5 correction).** Pass-3 counted 330 and attributed "~331" to a SQL-comment false positive in V15. Pass-5 section audit found V300 added `outbox_events`, making the real count **331** distinct table names (344 `CREATE TABLE` statements). See [[Table-Index]] / [[Schema]].
12. **JaCoCo enforced gate is 0.10, not 0.80 (pass-4).** `pom.xml` sets the `mvn verify` gate to a **0.10 ratchet floor**; **0.80 is the backlog target** (T3-15); ~0.19 is last reported. Earlier notes implied an 0.80 gate. See [[Test-Catalog]].
13. **Field-encryption spans 10 entities + plaintext PII gaps, not 3 (pass-4).** [[Schema]] noted 3 encrypted columns; actual `@Convert(EncryptedStringConverter)` covers **10 entities**, and PII columns (PF/ESI numbers, candidate `email`/`phone`/`resume_url`, `contract_signatures.signer_email`) are **plaintext**. Corrected in [[Schema]]; detailed in [[Data-Dictionary]]; open item in [[Security-Audit]].
14. **DB FKs are a floor (pass-4).** [[Data-Dictionary]] found **347** DB-enforced FK edges; several anchor relationships carry the parent id without a `REFERENCES` constraint (logical FKs), so true coupling exceeds 347.
15. **Scheduled jobs: 26, not 25 (pass-5).** V300 `outbox_events` migration + `OutboxEventProcessor.pollAndProcess` added the 26th `@Scheduled` method (fixedDelay=5s, no ShedLock, gated by `app.outbox.enabled=true` matchIfMissing=true). See [[Scheduled-Jobs]].
16. **Frontend pages: 286, not 283 (pass-5).** Three new routes added since pass-3: `/admin/users` (redirect), `/privacy`, `/terms`. See [[Route-Map-Full]].
17. **Frontend components: 171 total (162 non-test), not 170 (pass-5).** Pass-3 counted 170; pass-5 re-count finds 171 total (162 non-test) under `frontend/components/`; an earlier 179 figure came from a broader `*/components/*` scope. See [[Components]].
18. **Flyway high-water mark: V304 / 293 files (pass-5+).** Pass-4 recorded V294 / 286 files; V295–V303 committed between sessions; V304 (RLS on contract_signatures) also committed. See [[Migrations]].

## 4. Gaps & undocumented areas (candidates for next pass)

- **Leaf-level enumeration — CLOSED (pass 3–4).** Every route ([[Route-Map-Full]]), controller ([[Controller-Index]]), endpoint ([[Endpoint-Index]] + 5 per-sub-app catalogs, **1,711**), and table ([[Table-Index]]) is enumerated; [[Data-Dictionary]] adds per-column detail on 90 core tables + a complete **347-edge FK map**; [[Feature-Traceability]] joins them into per-feature slices. Remaining sampled depth: per-column detail for long-tail tables and per-endpoint DTO schemas.
- **Count-sweep follow-up — RESOLVED (pass 5).** [[00-Home]] and [[docs/README.md]] updated to 2026-06-18 authoritative figures. Section-2 metrics table updated in this report. [[APIs]] / [[System-Overview]] internal claims may still cite the raw-`grep` 184 controllers (reconciliation note in [[Controller-Index]]).
- **Test coverage below standard.** Backend JaCoCo line ~0.19; the **enforced `mvn verify` gate is a 0.10 ratchet floor** (0.80 is the backlog target, not the gate — discrepancy #12). Frontend Vitest threshold 60%. See [[Test-Catalog]] / [[Test-Coverage]].
- **Runbooks are templated.** `docs/runbooks/` doesn't exist on disk; [[Production-Support]] / [[Incident-Response]] procedural detail is aspirational pending real runbooks.
- **Scheduled-jobs deep-dive — closed.** [[Scheduled-Jobs]] enumerates all 26 jobs (schedules, ShedLock names + windows) and pointer-documents the WebSocket relay (`RedisWebSocketRelay`) and read-replica routing (`RoutingDataSourceConfig`); includes outbox poller (26th job, added 2026-06-18).
- **Per-permission sub-app ownership — closed.** [[Permission-Ownership]] maps every `Permission` family and role onto the four sub-apps + platform, grounded in `frontend/lib/config/apps.ts` (`permissionPrefixes`), `RoleHierarchy.java` app-tag comments, and `@RequiresPermission` controller packages.
- **Generated API client layer** (`frontend/lib/generated/api/*`) is gitignored — documented from `orval.config.ts` + snapshot, not read directly. See [[Routes]] / [[APIs]].
- **RBAC matrix reflects default grants** from `RoleHierarchy`, not live tenant `role_permissions` (admins can diverge per tenant). See [[RBAC-Matrix]].
- **Live RLS proof** (NOBYPASSRLS `nu_app_rls` role) is CI-only; local guard is static-source only. See [[Migrations]] / [[Code-Patterns]].
- **Product docs are stakeholder-level.** [[Product-Requirements-Document]], [[Work-Breakdown-Structure]],
  [[Product-Architecture]], and [[User-Manual]] are grounded in the vault and current source
  snapshot, but they are not signed-off customer training material or a Jira import.

## 5. Validation performed

- ✅ All 64 notes present in the numbered vault structure (plus Home + this report). Link integrity was re-checked 2026-06-18 after pass-5; pass-6 validation is recorded below.
- ✅ Pass 6 added 7 notes: [[Graphify-Code-Graph]], [[Product-Delivery-Index]], [[Application-Map]], [[Product-Requirements-Document]], [[Work-Breakdown-Structure]], [[Product-Architecture]], [[User-Manual]].
- ✅ Tests executed 2026-06-17: **FE Vitest 2,419/2,419 pass** (90 files); **BE test sources compile** (`mvn test-compile`, JDK 23, `-Djacoco.skip=true`); FE ESLint **0 errors** (82 design-system spacing warnings remain). **Not run locally:** BE full suite incl. 74 Testcontainers integration tests (Docker/colima down — CI authoritative, prior run 4,055 green) and Playwright (low local signal).
- ✅ Wikilink integrity: every `[[NoteBasename]]` resolves to an existing note (0 broken), including [[Permission-Ownership]], [[Readiness-Session-2026-06-18]], [[Ruflo-Autopilot-Hazard]], and the three merged-in notes [[Migrations]], [[Code-Patterns]], [[Local-Setup]].
- ✅ Mermaid fence balance: all code fences even (0 malformed blocks).
- ✅ Counts re-measured live from source (not copied from prior docs).
- ✅ Flat-doc references removed: Home and this report no longer point at the retired `architecture/`, `reference/`, `patterns/`, `setup/` folders.
- ⚠️ Not run: BE integration suite + coverage (needs Docker), browser route-walk of all 286 pages, Playwright (low local signal). Per-endpoint enumeration of all 180 controllers is now **done** ([[Endpoint-Index]]).

## 6. Estimated coverage

All 13 original engineering sections plus the new product/delivery section are authored and cross-linked; the former flat reference/architecture/patterns/setup content remains merged into the vault. All major modules and platform concerns are represented and verified against code. **Structural & module coverage is broad, and (as of pass 5) leaf-level coverage is exhaustive at method and column granularity**: every audited route (**286**), controller (**180** live), endpoint (**1,711**), table (**331** distinct), and test suite is enumerated, with per-column detail on 90 core tables + a complete **347-edge FK map**, all joined by [[Feature-Traceability]]. Pass 6 adds stakeholder-facing product/delivery docs and a refreshed graphify snapshot. Counts are point-in-time and will drift — re-measure before quoting in a release.

Related: [[00-Home]]
