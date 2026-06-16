---
title: Documentation Coverage Report
tags: [meta, coverage, report]
generated: 2026-06-16
---

# Documentation Coverage Report — NU-AURA Obsidian Vault

Generated 2026-06-16 by full-codebase discovery (parallel section authors, each verifying against source). This report records what the vault covers, the metrics it was built from, and every gap or discrepancy found so the next pass is targeted.

## 1. Coverage summary

| Area | Vault notes | Status | Evidence depth |
|------|-------------|--------|----------------|
| Architecture (C4 + decisions) | [[System-Overview]] [[Architecture-Decisions]] [[C4-Context]] [[C4-Container]] [[C4-Component]] | ✅ Complete | High — verified DDD layers + employee vertical slice |
| Modules (4 sub-apps + platform) | [[Nu-HRMS]] [[Nu-Hire]] [[Nu-Grow]] [[Nu-Fluence]] [[Shared-Platform]] | ✅ Complete | High — controllers + routes grepped |
| Frontend | [[Routes]] [[Pages]] [[Components]] | ✅ Complete | High — counts measured live; route table sampled |
| Backend | [[APIs]] [[Services]] [[Middleware]] | ✅ Complete | High — filter order read from `SecurityConfig` |
| RBAC | [[Roles]] [[Permissions]] [[RBAC-Matrix]] | ✅ Complete | High — `RoleHierarchy.java` enumerated |
| Database | [[Schema]] [[ERD]] | ✅ Complete | High — migrations + sampled DDL; core ERD |
| DevOps | [[Deployment]] [[CI-CD]] | ✅ Complete | High — workflows + compose enumerated |
| Security | [[Security-Audit]] | ✅ Complete | High — controls + known findings |
| Testing | [[QA-Strategy]] [[Test-Coverage]] | ✅ Complete | Medium — counts live; coverage % reported not re-run |
| Runbooks | [[Production-Support]] [[Incident-Response]] | ⚠️ Templated | Medium — no `docs/runbooks/` on disk; procedural detail is templated |
| Decisions | [[ADR-001]]…[[ADR-005]] | ✅ Complete | High — reverse-engineered from code |
| Knowledge graph | [[Module-Relationships]] [[Data-Flows]] [[System-Flows]] | ✅ Complete | High — flows traced to classes |

**37 notes** across 13 sections. **0 unresolved wikilinks**, **0 unbalanced Mermaid fences** (validated). Mermaid diagrams across architecture, C4, ERD, sequence, and flow types.

## 2. Verified metrics (point-in-time, 2026-06-16)

| Metric | Value | Source |
|--------|-------|--------|
| Backend `@RestController` | 184 | `grep -rl @RestController` |
| `api/*` domain packages | 68 | `ls api/` |
| `@Service` | 257 (app 225 / infra 19 / common 11 / domain 1) | grep |
| Repositories | 288 | grep |
| `@Scheduled` jobs | 17 (all ShedLock-guarded) | grep |
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
4. **Security filter order.** `SecurityConfig.java` net order is **RateLimiting → Tenant → ApiKey → JWT → CSRF** (double `addFilterBefore` reverses intuition); `docs/architecture/backend.md`'s diagram shows JWT→ApiKey. Vault documents the code order as authoritative. See [[Middleware]].
5. **Controller count drift.** Live grep 184 vs docs' 179 (controllers added since the docs snapshot).
6. **Spring Boot version skew.** Docs + `.claude/CLAUDE.md` state BOM 3.5.14; `pom.xml` contains a literal `3.3.1` (likely a plugin/transitive pin, not the parent). Flagged in [[System-Overview]] — verify before quoting.
7. **Table count.** Measured ~331 distinct names vs docs' "~342" (CREATE statements include partition/re-create variants). See [[Schema]].
8. **Frontend Docker base drift.** `frontend/Dockerfile` uses `node:26-alpine`; `docs-v2` says `node:20`. Dockerfile authoritative. See [[Deployment]].
9. **`RecruitmentManagementController.java.disabled`** exists but is excluded from the build. See [[Nu-Hire]] / [[APIs]].

## 4. Gaps & undocumented areas (candidates for next pass)

- **Test coverage below standard.** Backend JaCoCo line ~0.19 (target 0.80, per `pom.xml`); frontend Vitest threshold 60% (not 80%). Not independently re-run (needs Docker). See [[Test-Coverage]].
- **Runbooks are templated.** `docs/runbooks/` doesn't exist on disk; [[Production-Support]] / [[Incident-Response]] procedural detail is aspirational pending real runbooks.
- **No dedicated deep-dives yet** for: the 17 scheduled jobs (catalog only), WebSocket/STOMP relay topology, read-replica routing (`RoutingDataSourceConfig`), and per-permission sub-app ownership.
- **Generated API client layer** (`frontend/lib/generated/api/*`) is gitignored — documented from `orval.config.ts` + snapshot, not read directly.
- **RBAC matrix reflects default grants** from `RoleHierarchy`, not live tenant `role_permissions` (admins can diverge per tenant).
- **Live RLS proof** (NOBYPASSRLS `nu_app_rls` role) is CI-only; local guard is static-source only.

## 5. Validation performed

- ✅ All 37 notes present in the prescribed 13-section structure.
- ✅ Wikilink integrity: every `[[target]]` resolves to an existing note basename (0 broken).
- ✅ Mermaid fence balance: all code fences even (0 malformed blocks).
- ✅ Counts re-measured live from source (not copied from prior docs).
- ⚠️ Not run: live test suite / coverage (needs Docker), browser route-walk of all 283 pages, per-endpoint enumeration of all 184 controllers (catalogued by domain with pointers to `docs/reference/api.md`).

## 6. Estimated coverage

All 12 prescribed sections + Home are authored and cross-linked; all major modules and platform concerns are represented and verified against code. **Structural & module coverage ≈ 100%; exhaustive leaf-level coverage (every endpoint/page/table individually) is intentionally sampled** with explicit pointers to the flat reference docs for full enumeration.

Related: [[00-Home]]
