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

## 1. Coverage summary

| Area | Vault notes | Status | Evidence depth |
|------|-------------|--------|----------------|
| Architecture (C4 + decisions) | [[System-Overview]] [[Architecture-Decisions]] [[C4-Context]] [[C4-Container]] [[C4-Component]] | ✅ Complete | High — verified DDD layers + employee vertical slice (former `architecture/` folded in) |
| Code patterns | [[Code-Patterns]] | ✅ Complete | High — Redis/RLS/Kafka/locks excerpts grounded in file paths (former `patterns/` folded in) |
| Modules (4 sub-apps + platform) | [[Nu-HRMS]] [[Nu-Hire]] [[Nu-Grow]] [[Nu-Fluence]] [[Shared-Platform]] | ✅ Complete | High — controllers + routes grepped (former `apps/` folded in) |
| Frontend | [[Routes]] [[Pages]] [[Components]] | ✅ Complete | High — counts measured live; route table sampled |
| Backend | [[APIs]] [[Services]] [[Middleware]] | ✅ Complete | High — filter order read from `SecurityConfig` (former `reference/api.md` folded in) |
| RBAC | [[Roles]] [[Permissions]] [[RBAC-Matrix]] | ✅ Complete | High — `RoleHierarchy.java` enumerated |
| Database | [[Schema]] [[ERD]] [[Migrations]] | ✅ Complete | High — migrations + sampled DDL; core ERD (former `reference/database.md` + `reference/migrations.md` folded in) |
| DevOps | [[Deployment]] [[CI-CD]] [[Local-Setup]] | ✅ Complete | High — workflows + compose enumerated; local-dev run steps (former `setup/` folded in) |
| Security | [[Security-Audit]] | ✅ Complete | High — controls + known findings |
| Testing | [[QA-Strategy]] [[Test-Coverage]] | ✅ Complete | Medium — counts live; coverage % reported not re-run |
| Runbooks | [[Production-Support]] [[Incident-Response]] | ⚠️ Templated | Medium — no `docs/runbooks/` on disk; procedural detail is templated |
| Decisions | [[ADR-001]]…[[ADR-005]] | ✅ Complete | High — reverse-engineered from code |
| Knowledge graph | [[Module-Relationships]] [[Data-Flows]] [[System-Flows]] | ✅ Complete | High — flows traced to classes |

**40 notes** across 13 sections (plus [[00-Home]] and this report). **0 unresolved wikilinks**, **0 unbalanced Mermaid fences** (validated). Mermaid diagrams across architecture, C4, ERD, sequence, and flow types. Recent additions: [[Migrations]], [[Code-Patterns]], [[Local-Setup]] (merge round) and [[Scheduled-Jobs]] (pass-2 re-verification).

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

## 4. Gaps & undocumented areas (candidates for next pass)

- **Test coverage below standard.** Backend JaCoCo line ~0.19 (target 0.80, per `pom.xml`); frontend Vitest threshold 60% (not 80%). Not independently re-run (needs Docker). See [[Test-Coverage]].
- **Runbooks are templated.** `docs/runbooks/` doesn't exist on disk; [[Production-Support]] / [[Incident-Response]] procedural detail is aspirational pending real runbooks.
- **Scheduled-jobs deep-dive — closed.** [[Scheduled-Jobs]] enumerates all 25 jobs (schedules, ShedLock names + windows) and pointer-documents the WebSocket relay (`RedisWebSocketRelay`) and read-replica routing (`RoutingDataSourceConfig`). Remaining thin spot: per-permission sub-app ownership.
- **Generated API client layer** (`frontend/lib/generated/api/*`) is gitignored — documented from `orval.config.ts` + snapshot, not read directly. See [[Routes]] / [[APIs]].
- **RBAC matrix reflects default grants** from `RoleHierarchy`, not live tenant `role_permissions` (admins can diverge per tenant). See [[RBAC-Matrix]].
- **Live RLS proof** (NOBYPASSRLS `nu_app_rls` role) is CI-only; local guard is static-source only. See [[Migrations]] / [[Code-Patterns]].

## 5. Validation performed

- ✅ All 40 notes present in the prescribed 13-section structure (plus Home + this report); link integrity re-checked 2026-06-16.
- ✅ Wikilink integrity: every `[[target]]` resolves to an existing note basename (0 broken), including the three merged-in notes [[Migrations]], [[Code-Patterns]], [[Local-Setup]].
- ✅ Mermaid fence balance: all code fences even (0 malformed blocks).
- ✅ Counts re-measured live from source (not copied from prior docs).
- ✅ Flat-doc references removed: Home and this report no longer point at the retired `architecture/`, `reference/`, `patterns/`, `setup/` folders.
- ⚠️ Not run: live test suite / coverage (needs Docker), browser route-walk of all 283 pages, per-endpoint enumeration of all 184 controllers (catalogued by domain in [[APIs]]).

## 6. Estimated coverage

All 12 prescribed sections + Home are authored and cross-linked; the former flat reference/architecture/patterns/setup content is now merged in, so the vault is self-contained. All major modules and platform concerns are represented and verified against code. **Structural & module coverage ≈ 100%; exhaustive leaf-level coverage (every endpoint/page/table individually) is intentionally sampled** with explicit pointers from the catalog notes ([[APIs]], [[Schema]], [[Migrations]]) to source.

Related: [[00-Home]]
