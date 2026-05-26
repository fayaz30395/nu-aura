# Backend Verify - 2026-05-24

Status: blocked in current local environment; deterministic local test failures repaired.

## Commands Run

- `mvn -q -pl backend -Dtest=LeaveRequestControllerScopeTest,HomeControllerTest,InterviewGenerationServiceTest,ProjectTimesheetBillingTest,ContractServiceTest test` - passed.
- `mvn -q -pl backend -Dtest=ExecutiveDashboardServiceTest,AssetManagementServiceTest,BudgetPlanningServiceTest,EmployeeImportParserServiceTest,FnFCalculationServiceTest,WebhookDeliveryServiceTest,WebhookServiceTest test` - passed.
- `mvn -q -pl backend -Dtest=LeaveRequestControllerScopeTest,HomeControllerTest,InterviewGenerationServiceTest,ProjectTimesheetBillingTest,ContractServiceTest,ExecutiveDashboardServiceTest,AssetManagementServiceTest,BudgetPlanningServiceTest,EmployeeImportParserServiceTest,FnFCalculationServiceTest,WebhookDeliveryServiceTest,WebhookServiceTest test` - passed.
- `mvn -q -pl backend verify` - not release-green in this local environment.

## Surefire Summary From Full Verify Attempt

- Report XML files: `1198`
- Tests observed: `3917`
- Failures: `0`
- Errors: `667`
- Skipped: `11`
- Failing report classes by classifier: `docker=120`

The current Surefire XML classification shows the remaining backend verify errors are Testcontainers/Docker gated, not local assertion failures in the repaired deterministic clusters.

## Environment Evidence

- `java -version`: OpenJDK `23.0.2`.
- `mvn -version`: Maven `3.9.9` running on Java `23.0.2`.
- `/usr/libexec/java_home -V`: Java `23`, `18`, and `11` are installed; Java `21` is not listed.
- `docker info`: Docker client exists, but the daemon is not reachable at `unix:///Users/fayaz.m/.colima/default/docker.sock`.

## Release Decision

T-012 remains open. Backend release verification requires a supported Java 21 runtime and a reachable Docker/Testcontainers environment, then `mvn verify` must exit `0`.
