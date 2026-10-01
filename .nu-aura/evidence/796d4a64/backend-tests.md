# Backend test evidence — commit `796d4a64`

Date: 2026-09-30 (America/Argentina local, -03)
JDK: OpenJDK 23.0.2 (Homebrew). Project target `release=21`. Maven 3.9.9.
Postgres: Testcontainers (real PG, Flyway applied per JVM).

## Full suite (authoritative)

Command: `mvn -o -pl . test`
Result: **BUILD SUCCESS** — `Tests run: 4724, Failures: 0, Errors: 0, Skipped: 2`
Raw log: `/tmp/backend-full-test.log` (22626 lines; ephemeral).

## Targeted pre-runs in the same session (sequential, single JVM)

### RBAC / IDOR / security battery — 20 classes
Result: **Tests run: 295, Failures: 0, Errors: 0 — BUILD SUCCESS**

Classes: PermissionScopeCacheTest, HasPermissionAtLeastTest, PermissionScopeResolutionTest,
JwtAuthenticationFilterScopeTest, DataScopeServiceTest, RbacUseCaseBoundaryTest,
SecurityUseCaseTest, BenefitEnhancedIdorTest, SelfServiceIdorTest, HelpdeskControllerIdorTest,
PerformanceRevolutionControllerIdorTest, FeedbackControllerIdorTest,
ExpenseItemAuthorizationIntegrationTest, LeaveRequestScopeIntegrationTest, LoanScopeIntegrationTest,
RecruitmentScopeIntegrationTest, ExpenseClaimScopeIntegrationTest, LeaveRequestControllerScopeTest,
RbacAnnotationCoverageTest, RequiresPermissionAnnotationTest.

### Migration / RLS batch
Result: **Tests run: 54, Failures: 0, Errors: 0, Skipped: 2 — BUILD SUCCESS**

Notable:
- `ArunManagerMigrationTest` — "V332 ... real Postgres, full Flyway chain": chain applies cleanly.
- `RlsNoBypassTest` — "V341 forward-only correction under a non-BYPASSRLS migration role": 9 pass.
- `MigrationRlsGuardTest` — migrations set tenant GUC before writing forced-RLS tables: 3 pass.
- `RlsStartupProbeTest` — 16 pass.
- `WorkflowDefinitionViewMatrixTest` — 4 pass.
- `PermissionCacheEvictorTransactionalTest` — 9 pass; `CacheEvictTransactionOrderingTest` — 1 pass.

## Analytics fix verification

`AnalyticsE2ETest` — 10/10 PASS after the tenant-zone fix (commit `796d4a64`); included in the
4724-test green full run.

## Notes

- `mvn -o` (offline) used; local `~/.m2` fully populated.
- Two skipped tests are pre-existing `@Disabled` (see surefire reports).
- Backend `build` capability is proven by the compile phase of the same `mvn test` invocation.
