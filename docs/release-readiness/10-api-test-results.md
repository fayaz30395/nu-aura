# 10 - API / Backend Test Results

## Backend automated tests (agent `be`, 2026-11-15)

Source: `evidence/logs/NU-BE-001-mvn-test.txt` (`mvn -o -q test` in /backend, HEAD 568b6aa3 + uncommitted tree, Docker/colima DOWN). No stale mvn processes were found at start; the earlier run had actually completed, so its log was reused (not re-run). Live jar not touched.

### Totals (maven console, authoritative)
| Metric | Value |
|---|---|
| Tests run | 5303 |
| Passed | 4528 |
| Failures | 0 |
| Errors | 772 |
| Skipped | 3 |
| Duration | 1m16s (surefire XML sum 68.7s) |
| Test classes with report | 428 (432 test-named files in src/test) |
| Classes with errors | 78 (list: `evidence/logs/NU-BE-002-docker-blocked-classes.txt`) |

Note: surefire XML sums to 5272 tests (31 fewer than console); console number used. Maven printed BUILD SUCCESS despite errors; no testFailureIgnore exists in the poms, so that run most likely passed `-Dmaven.test.failure.ignore` (unrecorded). Not a repo defect (DEF-BE-03 info).

### Error triage: real defect vs environment
All 772 errors (100%) have the same root cause: `IllegalStateException: Previous attempts to find a Docker environment failed` -> Spring `ApplicationContext` fails to load (`DataSourceAutoConfiguration$EmbeddedDatabaseConfiguration` condition / Testcontainers PostgreSQL). Zero assertion failures; zero non-Docker errors. Classification: **BLOCKED (environment: Docker down)**, not product defects. They are NOT PASS. Only 3 test sources reference Testcontainers directly; the rest inherit a shared Spring Boot integration context.

Skipped (3, assumption/`@Disabled` style - not PASS): `RlsTenantGucScopeTest#noBypassRlsRoleEnforcesTenantIsolation`, `RlsNoBypassTest#appRoleMustHaveNoBypassRls`, `RlsNoBypassTest#rlsPolicyIsolatesTenantData`. These are the tests that prove RLS actually blocks cross-tenant reads with a non-bypass role; they did not execute.

### Security / tenant / RLS / migration classes
Executed and passing (52 classes, 556 tests, no Docker needed) - mostly unit/mock level:
- Tenant/RLS: `common.security.TenantIsolationTest` (8), `security.TenantIsolationNegativeTest` (13), `security.MultiTenantAsyncIsolationTest` (5), `security.ScheduledJobTenantIsolationTest` (4), `architecture.RlsTenantGucScopeTest` (2, 1 skipped), `architecture.MigrationRlsGuardTest` (3), `common.security.RlsStartupProbeTest` (16), `infrastructure.kafka.TenantContextKafkaAspectTest` (11), `TenantContextRecordInterceptorTest` (5), `application.auth.service.SamlDefaultRoleTenantScopeTest` (4), `TenantProvisioningServiceTest` (2)
- RBAC/authz: `CustomPermissionEvaluatorTest` (25), `HasPermissionAtLeastTest` (25), `PermissionAspectTest` (16), `RbacAnnotationCoverageTest` (3), `PermissionScopeResolutionTest` (5), `PermissionScopeCacheTest` (14), `PermissionCacheEvictorTransactionalTest` (9), ~14 `*AuthzTest`/`*IdorTest` classes (helpdesk, feedback360, OKR, PIP, review cycle, LMS, timesheet, self-service, benefits, workflow definition)
- Auth/JWT: `AuthServiceTest` (22), `AuthControllerSecurityTest` (10), `JwtSecurityTest` (12), `JwtAuthenticationFilter*Test` (9), `SecurityContextTest` (61), `WebSocketSecurityConfigTest` (10), `WebSocketAuthTokenHandshakeInterceptorTest` (3)
- Migration: `api.migration.controller.DataMigrationControllerTest` (15; data-import controller, not Flyway)
- `integration.RlsNoBypassTest`: 2 tests, both SKIPPED (not pass).

BLOCKED by Docker (11 security-relevant classes, 117 tests): `common.security.RequiresPermissionAnnotationTest` (14), `e2e.AuthenticationE2ETest` (1), `integration.ArunManagerMigrationTest` (3), `integration.AuthControllerTest` (22), `integration.ExpenseItemAuthorizationIntegrationTest` (24), `integration.ExpenseItemTenantStampingTest` (2), `integration.MigrationTenantContextTest` (9), `integration.TenantTimeServiceIntegrationTest` (4), `integration.WorkflowDefinitionAuthorizationTest` (6), `security.RbacUseCaseBoundaryTest` (21), `security.SecurityUseCaseTest` (11). Also blocked (name does not match filter): `*ScopeIntegrationTest` (Expense/Leave/Recruitment scope), `AttendanceScopeQueryTest` (48), controller integration tests (Payroll 16, PerformanceReview 18, Recruitment 14, Home 24). Full list in the log file above.

Consequence: the only automated proof of DB-level tenant isolation (RLS with non-bypass role) and of scope-based authz against a real DB is NOT executed in this audit. Live isolation proof must come from the `tenant-rbac` agent's API tests.

| Test ID | Scenario | Steps actually run | Expected | Actual | Status | Evidence | Severity | Repro |
|---|---|---|---|---|---|---|---|---|
| NU-BE-001 | Full backend suite | `mvn -o -q test` | 0 fail/err | 5303 run, 772 err (all Docker), 3 skip | BLOCKED (partial: 4528 pass) | logs/NU-BE-001-mvn-test.txt | Medium | start colima, rerun |
| NU-BE-002 | Docker-dependent classes | triage of surefire XML | - | 78 classes / 772 tests unable to load context | BLOCKED | logs/NU-BE-002-docker-blocked-classes.txt | Medium | as above |
| NU-BE-003 | RLS non-bypass proof tests | surefire | execute | 3 skipped | NOT TESTED | NU-BE-001 | High (gap) | needs PG container |
| NU-BE-004 | Tenant isolation unit/arch tests | surefire | pass | 52 classes pass | PASS (unit level only) | NU-BE-001 | - | - |
| NU-BE-010 | Dependency tree | `mvn -o dependency:tree` | resolved versions | 368 lines | PASS (info) | logs/NU-BE-010-dependency-tree.txt | - | - |
| NU-BE-011 | OWASP dependency-check | `mvn -o ...dependency-check:check` | scan | plugin refuses offline mode; local NVD db dated 2026-05-14 (6 months stale) | BLOCKED | logs/NU-BE-011-owasp-dc.txt | - | needs online + fresh NVD |
| NU-BE-020 | CVE review of resolved versions | web research (spring.io, NVD/OSV mirrors, vendor advisories) | list | see below | INCONCLUSIVE (secondary sources, verify) | this file | High | - |
| NU-BE-030 | Flyway checksums files vs local DB | `scripts/be/flyway_checksum.py` + read-only psql | match | 286 match, 44 mismatch (V0-V315), 0 mismatch V329-V341 | FAIL (old range) / PASS (V329-V341) | logs/NU-BE-030-flyway-checksums.txt | Medium | see DEF-BE-02 |
| NU-BE-031 | Flyway V329-V341 | git log --all + psql | contiguous, applied, success | all 13 applied, success=t, checksums match | PASS | logs/NU-BE-031-flyway-v329-v341.txt | - | - |

## Dependency / CVE scan (resolved from `mvn dependency:tree`, project parent = spring-boot-starter-parent 3.5.14)

OWASP dependency-check could not run (Maven offline mode rejected by plugin; cached NVD DB is from 2026-05-14). CVE data below is from web search of vendor advisories and aggregators - treat as leads, verify on spring.io / tomcat.apache.org / NVD before acting. Pre-existing evidence: root and backend poms already override tomcat/netty/postgresql for earlier CVEs.

| Component | Resolved | Boot 3.5.14 BOM | Findings (secondary sources) | Fixed in |
|---|---|---|---|---|
| Spring Boot | 3.5.14 | - | 3.5.x OSS ended 2026-06-30; **3.5.16 (2026-06-25) is the last OSS release** | n/a (3.5.15/16 available) |
| Spring Framework | 6.2.18 | 6.2.18 | June-2026 batch (CVE-2026-41838 predictable WS session id, -41845 XSS JavaScriptUtils HIGH, -41844 open redirect, -41853 multipart smuggling, -41854 SSRF UriComponentsBuilder, -41848 AntPathMatcher DoS, -41842, -41852 SpEL), affect 6.2.0-6.2.18 | **6.2.19** (in Boot 3.5.15; or 6.2.18.1 patch) - inside Boot 3.5.x |
| Spring Framework | 6.2.19 | - | CVE-2026-59283 (SpEL safety-guard bypass, Aug 2026) lists 6.2.0-6.2.19 affected; only 7.0.9 shown as fix | No OSS 6.2.x fix found (needs 7.x or commercial) |
| Spring Security | 6.5.10 | 6.5.10 | CVE-2026-41694 SAML decrypt w/o valid signature (**app has saml2-service-provider**), -41003 XSS, -41706 open redirect, -47838 X.509 impersonation: affect <=6.5.10 | **6.5.11** (OSS; ships with Boot 3.5.15/16 likely - verify BOM) |
| Spring Security | 6.5.11 | - | CVE-2026-47841 WebAuthn UV bypass, -59276 info exposure list <=6.5.11 | no 6.5.x OSS fix identified |
| Tomcat embed | 10.1.59 (pom override; BOM 10.1.54) | 10.1.54 | 10.1.59 affected by CVE-2026-76183 WebSocket security-constraint bypass (CVSS 9.8, app uses WebSocket/STOMP) -> fixed 10.1.60; CVE-2026-101356 HTTP/2 mix-up (9.1) and -101296 JNDIRealm (9.1, JNDIRealm not used) reported fixed in 10.1.61 | **10.1.61** via `<tomcat.version>` override (works inside Boot 3.5.x) |
| Jackson | 2.21.2 | 2.21.2 | CVE-2026-54515 annotation bypass (5.3); another issue affects 2.19.0-<2.21.6 | 2.21.4 / 2.21.6 via `jackson-bom.version` override |
| Logback | 1.5.32 | 1.5.32 | deserialization issue through 1.5.32; RCE needs Janino on classpath | no fixed OSS version identified (check Janino absent) |
| Netty | 4.1.137 (pom override; BOM 4.1.132) | 4.1.132 | 4.1.137 fixes CVE-2026-75595, -17615 | current |
| PostgreSQL JDBC | 42.7.11 (override) | 42.7.10 | override covers CVE-2026-42198 | current |
| Others (not researched) | hibernate 6.6.49, POI 5.4.1, tika 3.3.1, openpdf 3.0.4, bcprov 1.85, nimbus-jose 9.37.4, opensaml 4.3.2, commons-compress 1.27.1, commons-io 2.18.0, guava 33.1.0, jsoup 1.22.2, kafka-clients 3.9.2, lettuce 6.6.0, snakeyaml 2.4 | | NOT TESTED (need OSV/NVD scan). nimbus-jose 9.37.4, guava 33.1.0, opensaml 4.3.2, commons-compress 1.27.1 are visibly old | - |

Answer on Spring 7: not needed for most items. Inside Boot 3.5.x: upgrade parent 3.5.14 -> 3.5.16 (last OSS) clears the Spring Framework June batch (6.2.19) and Spring Security 6.5.11 SAML/X.509 fixes; keep manual `tomcat.version` (10.1.61) and `jackson-bom.version` (>=2.21.6) overrides. Residual (SpEL guard bypass CVE-2026-59283, WebAuthn, logback) have no OSS 3.5.x fix found; the 3.5 line is EOL so future CVEs will not get OSS patches - plan Boot 4.0.x/4.1.x migration. Note: Boot 3.5.15 reportedly had a regression with an out-of-band fix (unverified).

## Flyway integrity (read-only; V329-V341 and whole history)
- V329-V341: 13 files, contiguous, no duplicates, no naming violations (`V<n>__<snake>.sql`). Introduced 2026-09-21..2026-09-30. V337-V340 were created on release/security branches (V338 on `security/workflow-definition-read-authz`) and now exist on main HEAD; no number collision (git log --all --diff-filter=A shows each version added once).
- Local `flyway_schema_history`: 331 rows, 0 failed, max version 341; V329-V341 all `success=t`, checksum equals Flyway-algorithm CRC of file (script `evidence/scripts/be/flyway_checksum.py`).
- Whole history: 330 files vs 331 applied. Gaps (historic, none in V329+): V27-29, V273-276, V278-281, V1 (file absent; DB row V1 = "pm schema initial", pm-module history). 44 files V0-V315 have checksum != DB (all 44 were edited in git after introduction, 3-8 commits each) - e.g. V0, V2-V12, V19, V65-V133, V171, V265-V268, V292, V307, V308, V313, V315.
- Only baseline: `baseline-version: 18`, `out-of-order: true`, `ignore-missing-migrations: true`, `repair-on-migrate: true` in base/dev config mask this locally. **Prod profile**: `validate-on-migrate: true`, `repair-on-migrate: false`, `out-of-order: false`. A prod/Railway DB migrated before those edits would fail Flyway validation at startup (memory notes V316 drift). Remote DB not inspected (needs authorization). Unverified here that the pm-module V1 does not collide.
