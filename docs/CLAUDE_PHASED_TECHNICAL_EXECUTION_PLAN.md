# Claude Phased Technical Execution Plan

## Objective
Provide a phase-based technical execution plan for stabilizing NU-AURA to enterprise HRMS production standards.

## Execution Rules (Apply to All Phases)
- Work module-by-module with small PRs (`max 600-800 LOC changed` per PR).
- Avoid adding new frameworks/dependencies unless strictly required.
- Every phase must end with passing checks:
  - Backend compile/tests
  - Frontend lint/typecheck/tests
- Do not start the next phase until all current phase exit criteria are met.

## Phase 0: Baseline and Safety Rails (2-3 days)
### Scope
- Create a technical baseline report: failing endpoints, failing tests, API contract mismatches, hard-delete call sites, stub integrations.
- Add CI guardrails:
  - fail build on `.disabled` tests
  - fail on TODO markers in critical modules (`payroll`, `leave`, `attendance`, `contract`, `payment`)
- Add architecture test rules for:
  - layer boundaries
  - tenant scoping enforcement

### Exit Criteria
- Baseline report committed in `docs/technical-baseline.md`.
- CI fails deterministically on new critical regressions.

## Phase 1: Data Integrity and Compliance Core (1-2 weeks)
### Scope
- Implement enforced soft-delete behavior across sensitive entities:
  - employee
  - payroll
  - contract
  - department
  - leave
  - attendance
- Replace direct repository `delete()` usage in critical services with soft-delete service methods.
- Add DB constraints/index updates to support:
  - soft-delete uniqueness
  - query performance
- Add audit events for delete/deactivate operations.

### Exit Criteria
- No hard delete remains in critical HR domains.
- Tests validate soft-delete visibility rules and recovery paths.
- Flyway migration scripts are forward-only and clean.

## Phase 2: Payments Module Hardening (1-2 weeks)
### Scope
- Choose one path:
  - Option A: feature-flag and hide non-production payment capabilities.
  - Option B: implement real provider integration for at least one gateway end-to-end.
- Remove permissive webhook behavior.
- Enforce:
  - signature verification
  - idempotency
- Align backend APIs with frontend expectations (or update frontend to actual backend contract).
- Add transaction-state machine constraints and retry/dead-letter handling.

### Exit Criteria
- No stub adapter path is used in active payment flows.
- Webhook handling is replay-safe and signature-verified.
- Frontend/backend payment flows pass integration tests.

## Phase 3: Contract Lifecycle Automation Completion (4-6 days)
### Scope
- Implement scheduled expiry and renewal reminder generation per tenant.
- Ensure idempotent reminder creation.
- Prevent duplicate reminders across scheduler runs.
- Add observability for:
  - scheduler outcomes
  - tenant-level failure isolation

### Exit Criteria
- Reminder jobs generate expected records in test fixtures.
- Scheduler metrics/logging report success/failure counts by tenant.

## Phase 4: API Contract Normalization (1 week)
### Scope
- Generate a canonical API contract inventory from controllers and frontend services/hooks.
- Resolve mismatches:
  - missing endpoints
  - wrong DTO fields
  - inconsistent pagination
  - inconsistent status enums
- Add contract tests for high-risk modules.

### Exit Criteria
- Contract mismatch report is zero for core modules.
- Frontend pages for payroll/leave/attendance/payment/contract run without contract errors.

## Phase 5: Test Depth for Critical Business Flows (1-2 weeks)
### Scope
- Re-enable disabled tests and fix root causes.
- Add E2E/integration coverage for cross-module flows:
  - leave approval -> payroll LOP impact
  - attendance regularization -> payroll day count/overtime
  - employee lifecycle changes -> permissions + reporting lines
  - offboarding/FnF -> payroll settlement consistency
- Add mutation/negative-path tests for:
  - security
  - tenant isolation

### Exit Criteria
- Critical-flow test suite is green and stable in CI.
- Minimum coverage thresholds are met for critical modules.

## Phase 6: Reliability, Observability, and Operational Readiness (1 week)
### Scope
- Add module SLO metrics and alerts for:
  - payroll run
  - leave approval
  - attendance ingestion
  - notification delivery
- Add runbooks for:
  - incident handling
  - data correction workflows
- Add background job dashboards and retry/dead-letter operational tooling.

### Exit Criteria
- Dashboards and alerts are live for all critical pipelines.
- Runbooks are reviewed and executable by engineering/on-call.

## Phase 7: Documentation and Go-Live Gate (3-4 days)
### Scope
- Update README/setup/docs to reflect actual repo structure and supported capabilities.
- Publish production readiness matrix per module (`ready`, `partial`, `disabled`).
- Execute final hardening pass and release checklist.

### Exit Criteria
- Documentation matches actual system behavior.
- Go-live checklist is signed off with no critical open defects.

## Required Per-Phase Execution Process
1. Create `phase-x` branch.
2. Open tracking checklist in `docs/execution/phase-x.md`.
3. Implement in vertical slices:
   - backend
   - migration
   - tests
   - frontend adjustments
4. Run and record commands:
   - `mvn -pl backend test`
   - `mvn -pl backend -DskipTests compile`
   - `npm run lint` (frontend)
   - `npm run test:run` (frontend)
5. Submit phase PR with:
   - what changed
   - risk and rollback
   - evidence (tests/metrics/screenshots/logs)

## Next Action
Start Phase 1 by generating a ticket-level breakdown with explicit acceptance criteria per module.
