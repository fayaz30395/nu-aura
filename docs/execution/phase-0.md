# Phase 0: Audit & Stabilization Baseline -- Execution Checklist

**Started:** 2026-03-19
**Status:** Complete

---

## Task 1: Technical Baseline Report

**Output:** [docs/technical-baseline.md](../technical-baseline.md)

- [x] **Failing/disabled tests audit**
  - Found: 3 `.disabled` test files (EmployeeServiceTest, LeaveServiceTest, EmployeeControllerIntegrationTest)
  - Found: 0 `@Disabled` / `@Ignore` annotations
  - Found: 0 `test.skip` / `describe.skip` / `it.skip` in frontend
  - Found: 0 `TODO` / `FIXME` in test files

- [x] **API contract mismatch analysis**
  - Scanned: 120+ backend controllers across 100+ RequestMapping base paths
  - Scanned: 80+ frontend service files in `frontend/lib/services/`
  - Found: 3 frontend services calling non-existent backend endpoints (spotlight, linkedin, pm/tasks)
  - Found: 3 frontend services using wrong base path (missing `/api/v1/` prefix)
  - Found: 19+ backend controllers with no corresponding frontend service

- [x] **Hard-delete call site inventory**
  - Found: 14 repository-level `DELETE FROM` JPQL queries
  - Found: 56+ service-level `.delete()` / `.deleteAll()` JPA calls
  - Critical: Payroll entities (PayrollRun, Payslip, SalaryStructure) are hard-deleted
  - Redis `.delete()` calls excluded (appropriate for cache eviction)

- [x] **Stub/mock integration inventory**
  - Found: 5 placeholder mobile services (approval, sync, notification, leave, dashboard)
  - Found: 2 mock infrastructure services (MockPaymentService, MockSmsService)
  - Found: 2 placeholder methods in KekaImportService

- [x] **Critical module health assessment**
  - Payroll: 3 controllers, 7 services, 8 entities, 6 tests -- hard-deletes on financial records
  - Leave: 3 controllers, 3 services, 3 entities, 8+ tests -- 1 disabled test file
  - Attendance: 5 controllers, 7 services, 5 entities, 5 tests -- gaps in CompOff/Mobile tests
  - Contract: 2 controllers, 4 services, 10 entities, 1 test -- severely under-tested
  - Payment: 3 controllers, 4 services, 10 entities, 0 tests -- zero test coverage

---

## Task 2: CI Guardrails

- [x] **Layer boundary tests (ArchUnit)**
  - Pre-existing: `backend/src/test/java/com/hrms/architecture/LayerArchitectureTest.java`
  - Already covers: controller-to-repository prohibition, service-to-controller prohibition, domain independence, naming conventions
  - ArchUnit 1.2.1 already in `pom.xml` as test dependency

- [x] **Tenant scoping enforcement test**
  - Created: `backend/src/test/java/com/hrms/architecture/TenantScopingArchitectureTest.java`
  - Tests: Critical module entities (payroll, leave, attendance, employee, recruitment, contract, asset, expense, payment) must have `tenantId` field
  - Tests: Repository location (repos should not be in domain package)
  - Tests: Service layer integrity (no reverse deps on controllers, domain free from infrastructure)
  - Includes: Documented exemption list for legitimately tenant-unscoped entities (enums, events, child entities)

---

## Task 3: Execution Tracking

- [x] This file (`docs/execution/phase-0.md`)

---

## Key Metrics

| Metric | Value |
|--------|-------|
| Backend test files (active) | 104 |
| Backend test files (disabled) | 3 |
| Frontend E2E specs | 36 |
| Backend controllers | 120+ |
| Frontend services | 80+ |
| API contract mismatches | 6 (3 missing endpoints, 3 wrong paths) |
| Hard-delete call sites | 70+ |
| Placeholder services | 7 |
| Modules with zero test coverage | 1 (Payment) |
| Modules with critical test gaps | 1 (Contract -- 1 test for 4 services) |

---

## Files Created in This Phase

| File | Purpose |
|------|---------|
| `docs/technical-baseline.md` | Full technical baseline report |
| `docs/execution/phase-0.md` | This execution checklist |
| `backend/src/test/java/com/hrms/architecture/TenantScopingArchitectureTest.java` | Tenant scoping + additional CI guardrail tests |

---

## Recommendations for Phase 1

1. **P0 -- Hard-delete on financial entities:** Convert PayrollRun, Payslip, SalaryStructure, Contract deletes to soft-deletes immediately
2. **P0 -- API path mismatches:** Fix the 3 frontend services using wrong base paths (resource-management, tax, timesheet)
3. **P1 -- Missing backend endpoints:** Implement SpotlightController and LinkedInPostController, or remove dead frontend services
4. **P1 -- Payment module tests:** Add at least controller + service unit tests for payment module
5. **P1 -- Contract module tests:** Add controller tests and tests for 3 untested services
6. **P2 -- Mobile services:** Replace placeholder implementations with real service integrations
7. **P2 -- Restore disabled tests:** Investigate and restore the 3 `.disabled` test files
8. **P2 -- Architecture violations:** Move payment repositories from `domain/` to `infrastructure/`
