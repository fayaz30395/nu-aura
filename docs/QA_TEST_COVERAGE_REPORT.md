# QA Test Coverage Report — Nu-HRMS Beta Launch

> **Date:** 2026-03-22 | **Author:** QA Lead Agent | **Sprint:** Internal Beta Launch (1 Week)
> **Scope:** 8 Must-Have Modules for Beta Launch

---

## Executive Summary

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Backend test classes | 126 | 120+ | PASS |
| Frontend unit tests | 48 | - | LOW |
| Frontend E2E specs (Playwright) | 48 + 3 (mobile/a11y/edge) | 45+ | PASS |
| Controller modules with tests | 17/68 | 100% must-have | GAP |
| Service modules with tests | ~20/60+ | 80% | GAP |
| Must-have module coverage | Partial (see below) | 100% | AT RISK |

**Overall Assessment:** Backend has solid security and core module tests but significant gaps in must-have modules (Benefits has **zero** tests). Frontend has strong E2E coverage via Playwright (48 specs) but only 48 unit tests across 92 services. Critical path workflows have partial coverage. **Benefits and Asset modules are the biggest risk areas.**

---

## 1. Test Coverage Matrix by Module

### 1.1 Must-Have Modules — Backend Coverage

| # | Module | Controllers | Controller Tests | Services | Service Tests | E2E Tests (Backend) | Integration Tests | Risk |
|---|--------|-------------|-----------------|----------|--------------|---------------------|-------------------|------|
| 1 | **Employee Management** | 6 | 2 (EmployeeController, DepartmentController) | 9 | 4 (Employee, EmployeeImportParser, EmployeeImportValidation, Department) | - | 1 (EmployeeLifecycle) | MEDIUM |
| 2 | **Attendance & Time Tracking** | 5 | 1 (AttendanceController) | 6 | 3 (AttendanceRecord, OfficeLocation, Holiday) | 1 (AttendanceE2E) | - | MEDIUM |
| 3 | **Leave Management** | 3 | 2 (LeaveRequestController, LeaveRequestScopeTest) | 3 | 3 (LeaveRequest, LeaveBalance, LeaveType) | 1 (LeaveRequestE2E) | 2 (LeaveRequestController, LeaveRequestScope) | LOW |
| 4 | **Benefits Administration** | 2 | **0** | 2 | **0** | **0** | **0** | **CRITICAL** |
| 5 | **Asset Management** | 1 | 1 (AssetManagementController) | 1 | **0** | **0** | **0** | HIGH |
| 6 | **Job Posting & Candidates** | 4 | 1 (RecruitmentController) | 6 | 2 (ApplicantService, RecruitmentManagement) | - | 1 (RecruitmentScope) | MEDIUM |
| 7 | **Interview Scheduling** | (within recruitment) | **0** | 2 (InterviewManagement, InterviewGeneration) | **0** | **0** | **0** | **HIGH** |
| 8 | **Onboarding Workflows** | 1 | 1 (OnboardingManagementController) | 1 | **0** | - | 1 (OfferLetterWorkflow) | MEDIUM |

### 1.2 Must-Have Modules — Frontend Coverage

| # | Module | E2E Specs (Playwright) | Unit Tests (Vitest) | Service Tests | Risk |
|---|--------|----------------------|---------------------|---------------|------|
| 1 | **Employee Management** | employee.spec.ts, org-chart.spec.ts | employee-flow.test.tsx | employee.service.test.ts | LOW |
| 2 | **Attendance & Time Tracking** | attendance.spec.ts | attendance.test.ts (validation) | attendance.service.test.ts | LOW |
| 3 | **Leave Management** | leave.spec.ts | leave-flow.test.tsx, leave.test.ts (validation) | leave.service.test.ts | LOW |
| 4 | **Benefits Administration** | benefits.spec.ts | **None** | benefits.service.test.ts | MEDIUM |
| 5 | **Asset Management** | assets.spec.ts | **None** | **None** | HIGH |
| 6 | **Job Posting & Candidates** | recruitment-kanban.spec.ts | **None** | recruitment.service.test.ts | MEDIUM |
| 7 | **Interview Scheduling** | **None (within recruitment)** | **None** | **None** | **CRITICAL** |
| 8 | **Onboarding Workflows** | onboarding-offboarding.spec.ts | **None** | onboarding.service.test.ts | LOW |

### 1.3 Cross-Cutting Concerns — Coverage

| Area | Test Count | Details | Risk |
|------|-----------|---------|------|
| **Security (RBAC)** | 11 | JwtSecurity, DataScope, TenantIsolation, PermissionAspect, SecurityContext, CustomPermissionEvaluator, RequiresPermission, AccountLockout, RateLimit, AsyncContext, MultiTenantAsync | LOW |
| **Authentication** | 3 | AuthController (unit + security), AuthenticationE2E | LOW |
| **Approval Workflows** | 4 | ApprovalService (unit), ApprovalCallbackHandler, WorkflowStepProcessor, ApprovalChain (integration) | LOW |
| **Architecture** | 2 | LayerArchitecture, TenantScopingArchitecture | LOW |
| **Performance** | 1 | QueryCountTest | MEDIUM |
| **Webhooks** | 3 | WebhookService, WebhookDelivery, WebhookController (integration) | LOW |
| **Notifications** | 2 | NotificationService, SmsNotification | LOW |
| **Analytics** | 4 | AnalyticsService, DashboardAnalytics, ScheduledReport, AnalyticsE2E | LOW |

---

## 2. Critical Path Workflows — Test Coverage

### 2.1 Employee Onboarding End-to-End

| Step | Backend Test | Frontend Test | Gap |
|------|-------------|---------------|-----|
| Create employee profile | EmployeeServiceTest | employee-flow.test.tsx | Covered |
| Assign department | DepartmentServiceTest | employee.spec.ts | Covered |
| Set up user account/credentials | AuthServiceTest | auth-flow.test.tsx | Covered |
| Trigger onboarding workflow | OfferLetterWorkflow (integration) | onboarding-offboarding.spec.ts | Partial — no service-level test for OnboardingService |
| Assign assets | AssetManagementControllerTest | assets.spec.ts | **No service test** |
| Enroll in benefits | **None** | benefits.spec.ts | **CRITICAL GAP — no backend tests** |
| Send welcome notification | NotificationServiceTest | notification-flow.test.tsx | Covered |

### 2.2 Leave Request + Approval Flow

| Step | Backend Test | Frontend Test | Gap |
|------|-------------|---------------|-----|
| Employee submits leave request | LeaveRequestServiceTest | SM-03 (smoke), leave.spec.ts | Covered |
| Leave balance validation | LeaveBalanceServiceTest | leave-flow.test.tsx | Covered |
| Manager receives approval task | ApprovalServiceTest | SM-04 (smoke) | Covered |
| Manager approves/rejects | ApprovalCallbackHandlerTest | SM-05 (smoke) | Covered |
| Leave balance deducted | LeaveBalanceServiceTest | - | Backend only |
| Notification sent | NotificationServiceTest | notification-flow.test.tsx | Covered |

**Status: WELL COVERED** — This is the best-tested workflow in the system.

### 2.3 Attendance Check-in/Check-out

| Step | Backend Test | Frontend Test | Gap |
|------|-------------|---------------|-----|
| Employee checks in | AttendanceRecordServiceTest | attendance.spec.ts | Covered |
| Geofence validation | OfficeLocationServiceTest | - | Backend only |
| Employee checks out | AttendanceRecordServiceTest | attendance.spec.ts | Covered |
| Auto-regularization | - | - | **No test for scheduled job** |
| Monthly attendance report | - | - | **No test** |

### 2.4 Job Posting + Candidate Application

| Step | Backend Test | Frontend Test | Gap |
|------|-------------|---------------|-----|
| Create job posting | RecruitmentManagementServiceTest | recruitment-kanban.spec.ts | Covered |
| Publish to job boards | - | - | **No integration test** |
| Candidate applies | ApplicantServiceTest | - | Backend only |
| Resume parsing (AI) | AIRecruitmentServiceFileParsingTest | - | Backend only |
| Move through pipeline stages | RecruitmentScopeIntegrationTest | recruitment-kanban.spec.ts | Covered |

### 2.5 Interview Scheduling

| Step | Backend Test | Frontend Test | Gap |
|------|-------------|---------------|-----|
| Schedule interview | **None** | **None** | **CRITICAL GAP** |
| Send calendar invite | **None** | **None** | **CRITICAL GAP** |
| Record interview feedback | **None** | **None** | **CRITICAL GAP** |
| Update candidate status | RecruitmentManagementServiceTest | recruitment-kanban.spec.ts | Partial |

### 2.6 Benefits Enrollment

| Step | Backend Test | Frontend Test | Gap |
|------|-------------|---------------|-----|
| View available plans | **None** | benefits.spec.ts (E2E) | **No backend test** |
| Employee enrolls | **None** | benefits.spec.ts (E2E) | **No backend test** |
| Flex allocation | **None** | - | **No test at all** |
| Claim submission | **None** | - | **No test at all** |

### 2.7 Asset Assignment

| Step | Backend Test | Frontend Test | Gap |
|------|-------------|---------------|-----|
| View available assets | AssetManagementControllerTest | assets.spec.ts | Partial |
| Assign asset to employee | AssetManagementControllerTest | assets.spec.ts | Partial |
| Asset return/reclaim | - | - | **No test** |
| Asset tracking/audit | - | - | **No test** |

---

## 3. Test Gap Analysis — By Severity

### 3.1 CRITICAL (Must fix before beta)

| ID | Gap | Module | Impact | Recommendation |
|----|-----|--------|--------|----------------|
| GAP-001 | Zero backend tests for Benefits | Benefits | Benefits enrollment could silently fail | Add BenefitManagementServiceTest + BenefitControllerTest |
| GAP-002 | Zero tests for Interview Scheduling | Recruitment | Interview scheduling is core hiring workflow | Add InterviewManagementServiceTest |
| GAP-003 | No frontend unit tests for Asset module | Assets | No validation of asset assignment UI logic | Add asset.service.test.ts |

### 3.2 HIGH (Should fix before beta)

| ID | Gap | Module | Impact | Recommendation |
|----|-----|--------|--------|----------------|
| GAP-004 | No service test for AssetService | Assets | Service logic untested | Add AssetServiceTest |
| GAP-005 | No service test for OnboardingService | Onboarding | Onboarding workflow logic untested | Add OnboardingServiceTest |
| GAP-006 | 51 controller modules have zero tests | Cross-cutting | 75% of controllers untested | Prioritize must-have module controllers |
| GAP-007 | No test for auto-regularization scheduled job | Attendance | Silent failures in cron job | Add scheduled job test |
| GAP-008 | No test for job board integration sync | Recruitment | External integration could silently break | Add JobBoardIntegrationServiceTest |

### 3.3 MEDIUM (Post-beta backlog)

| ID | Gap | Module | Impact | Recommendation |
|----|-----|--------|--------|----------------|
| GAP-009 | Employee module: 5/9 services untested | Employee | Gaps in import, lifecycle, directory services | Add tests incrementally |
| GAP-010 | Attendance: 3/6 services untested | Attendance | Shift, overtime, comp-off logic untested | Add tests incrementally |
| GAP-011 | Recruitment: 4/6 services untested | Recruitment | Pipeline, communication services untested | Add tests incrementally |
| GAP-012 | No frontend component tests beyond Button | Components | 122 components untested | Add tests for critical interactive components |
| GAP-013 | No load testing infrastructure | Performance | Unknown behavior at 50-100 concurrent users | Set up k6/JMeter |

### 3.4 LOW (Technical debt)

| ID | Gap | Module | Impact | Recommendation |
|----|-----|--------|--------|----------------|
| GAP-014 | Frontend service tests cover happy path only | Services | No error state testing | Add error/edge case tests |
| GAP-015 | No visual regression tests | UI | Design system drift undetected | Set up Chromatic or Percy |
| GAP-016 | No contract tests (Pact/similar) | Integration | API contract drift between FE/BE | Evaluate Pact.js |

---

## 4. Existing Smoke Test Suite Assessment

### 4.1 Current Smoke Tests (smoke.spec.ts)

The existing smoke test suite covers **7 scenarios** in serial mode:

| ID | Test | Modules Covered | Verdict |
|----|------|----------------|---------|
| SM-01 | Login -> dashboard loads | Auth | GOOD |
| SM-02 | Employees list + Add button visible | Employee | GOOD |
| SM-03 | Employee submits leave request | Leave | GOOD |
| SM-04 | Manager accesses approvals page | Approvals | GOOD |
| SM-05 | Integrated leave apply -> approve flow | Leave + Approvals | EXCELLENT |
| SM-06 | Core routes render (8 routes) | Cross-cutting | GOOD |
| SM-07 | Unauthenticated redirect to /auth/login | Auth/Security | GOOD |

### 4.2 Smoke Test Gaps

Missing smoke tests for **5 of 8 must-have modules:**

| Module | Smoke Test Exists | Needed |
|--------|------------------|--------|
| Employee Management | SM-02 (list only) | Add: create employee, view profile |
| Attendance | SM-06 (route only) | Add: check-in, check-out |
| Leave Management | SM-03, SM-04, SM-05 | SUFFICIENT |
| Benefits | **None** | Add: view plans, enrollment |
| Asset Management | **None** | Add: view assets, assign |
| Job Posting & Candidates | **None** | Add: create job, view pipeline |
| Interview Scheduling | **None** | Add: schedule interview |
| Onboarding | **None** | Add: start onboarding workflow |

### 4.3 Recommended Smoke Test Suite (Expanded)

Add these smoke tests to `smoke.spec.ts`:

```
SM-08: Employee profile creation (admin creates employee, profile loads)
SM-09: Attendance check-in/check-out (employee checks in, checks out, record appears)
SM-10: Benefits plan listing (employee can view available benefit plans)
SM-11: Asset inventory loads (admin can see asset list)
SM-12: Job posting creation (recruiter creates a job, appears in listing)
SM-13: Candidate pipeline loads (recruiter can view pipeline kanban)
SM-14: Onboarding task list renders (HR starts onboarding for new hire)
SM-15: RBAC enforcement (employee cannot access /admin routes, gets 403 or redirect)
```

---

## 5. Performance Testing Plan

### 5.1 Load Testing Requirements

| Metric | Target | Tool |
|--------|--------|------|
| Concurrent users | 50-100 | k6 or Apache JMeter |
| API response time (p95) | < 500ms | k6 |
| Database query time (p95) | < 100ms | Spring Boot Actuator + Prometheus |
| Page load time (p95) | < 3s | Lighthouse CI |
| Error rate under load | < 1% | k6 |

### 5.2 Critical Endpoints to Load Test

| Priority | Endpoint | Expected RPS | Rationale |
|----------|----------|-------------|-----------|
| P0 | `POST /api/v1/auth/login` | 10 | Auth bottleneck, rate limited (5/min) |
| P0 | `GET /api/v1/employees` | 50 | Most frequently accessed list |
| P0 | `GET /api/v1/attendance/check-in` | 100 | Morning spike (all employees) |
| P0 | `GET /api/v1/leave/requests` | 30 | High-traffic self-service |
| P1 | `GET /api/v1/dashboard` | 50 | Landing page for all users |
| P1 | `POST /api/v1/leave/requests` | 20 | Leave request submission |
| P1 | `GET /api/v1/workflow/inbox` | 30 | Manager approvals queue |
| P2 | `GET /api/v1/recruitment/jobs` | 10 | Recruiter-only traffic |
| P2 | `GET /api/v1/benefits/plans` | 10 | Benefits browsing |

### 5.3 Performance Baseline (from existing tests)

- `QueryCountTest.java` exists — validates N+1 query prevention
- No load testing infrastructure currently exists
- Rate limiting configured: 5/min auth, 100/min API, 5/5min exports
- HikariCP pool: 10 max (dev), 20 max (prod)

### 5.4 Recommended Load Test Scenarios

```
Scenario 1: Morning Rush (Attendance)
  - 100 employees check in within 15-minute window
  - Measure: API latency, DB connection pool utilization, Redis cache hit rate

Scenario 2: Leave Request Storm
  - 50 employees submit leave requests + 10 managers approve simultaneously
  - Measure: Approval workflow latency, Kafka consumer lag, notification delivery

Scenario 3: Sustained Dashboard Traffic
  - 100 concurrent users on dashboard, refreshing every 30s for 10 minutes
  - Measure: API p95, DB query p95, memory footprint

Scenario 4: Recruitment Pipeline
  - 20 recruiters viewing pipelines + 50 applicants submitting simultaneously
  - Measure: Elasticsearch query latency, file upload throughput (MinIO)
```

---

## 6. Security Testing Gaps

| Area | Current Coverage | Gap | Risk |
|------|-----------------|-----|------|
| SQL Injection | No dedicated tests | **No parameterized query validation tests** | MEDIUM (Spring Data JPA mitigates) |
| XSS | sanitize.test.ts (frontend) | No backend XSS sanitization tests | MEDIUM |
| CSRF | SecurityConfig enforces double-submit | No test verifying CSRF rejection | LOW (framework-level) |
| Rate Limiting | RateLimitFilterTest, RateLimitConfigTest | Covered | LOW |
| Tenant Isolation | TenantIsolationTest, TenantIsolationNegativeTest | Covered | LOW |
| Permission Bypass | PermissionAspectTest, SecurityContextTest | Covered | LOW |
| JWT Manipulation | JwtSecurityTest | Covered | LOW |
| Account Lockout | AccountLockoutServiceTest | Covered | LOW |
| Password Policy | - | **No test for password complexity rules** | MEDIUM |
| OWASP Headers | Next.js middleware + Spring Security | **No automated header validation test** | LOW |

---

## 7. Recommendations — Priority Order

### Immediate (Before Beta Launch)

1. **Write BenefitManagementServiceTest** — Zero coverage on a must-have module (GAP-001)
2. **Write InterviewManagementServiceTest** — Zero coverage on interview scheduling (GAP-002)
3. **Write AssetServiceTest** — Only controller test exists, no service logic tested (GAP-004)
4. **Expand smoke.spec.ts** with SM-08 through SM-15 — Cover all 8 modules (Section 4.3)
5. **Write OnboardingServiceTest** — Onboarding workflow logic untested (GAP-005)

### Short-Term (Beta Week)

6. Set up k6 load testing for top 5 endpoints (Section 5.2)
7. Add RBAC smoke test (SM-15) to validate permission enforcement for Employee/Manager/Admin roles
8. Run Playwright E2E suite on all 8 modules in CI pipeline
9. Add frontend unit tests for asset.service.ts

### Post-Beta

10. Increase controller test coverage from 25% to 80% (GAP-006)
11. Add visual regression tests (Chromatic/Percy)
12. Implement API contract tests (Pact)
13. Add frontend component tests for top 20 interactive components
14. Set up Lighthouse CI for page load performance monitoring

---

## 8. Test Infrastructure Summary

### Backend

| Framework | Version | Purpose |
|-----------|---------|---------|
| JUnit 5 | (Spring Boot 3.4.1 managed) | Unit + integration tests |
| Mockito | (Spring Boot managed) | Mocking |
| Spring Boot Test | 3.4.1 | Integration test context |
| JaCoCo | 0.8.13 | Code coverage (80% minimum) |
| ArchUnit | (via LayerArchitectureTest) | Architecture enforcement |

### Frontend

| Framework | Version | Purpose |
|-----------|---------|---------|
| Vitest | ^3.2.4 | Unit tests |
| @vitest/coverage-v8 | ^3.2.4 | Code coverage |
| @testing-library/react | ^14.2.0 | Component testing |
| Playwright | ^1.57 | E2E tests |
| @axe-core/playwright | ^4.11.0 | Accessibility testing |

### Test Commands

```bash
# Backend
cd backend && ./mvnw test              # Run all tests
cd backend && ./mvnw verify            # Run tests + JaCoCo coverage

# Frontend unit tests
cd frontend && npm test                 # Vitest watch mode
cd frontend && npm run test:run         # Single run
cd frontend && npm run test:coverage    # Coverage report

# Frontend E2E
cd frontend && npx playwright test smoke.spec.ts --project=chromium    # Smoke only
cd frontend && npx playwright test                                      # Full suite
```

---

## 9. Coverage Metrics Summary

### Backend Coverage by Test Type

| Type | Count | Coverage |
|------|-------|----------|
| Unit tests (service + controller) | ~80 | Core business logic |
| Integration tests | 13 | Cross-module workflows |
| E2E tests (backend) | 7 | Full request lifecycle |
| Security tests | 15 | RBAC, tenant isolation, rate limiting |
| Architecture tests | 2 | Layer + tenant scoping |
| Performance tests | 1 | N+1 query detection |
| **Total** | **~118** | |

### Frontend Coverage by Test Type

| Type | Count | Coverage |
|------|-------|----------|
| Unit tests (Vitest) | 48 | Services, hooks, utils, validations |
| Integration tests | 7 | Auth, employee, leave, approval, compensation, notification, payroll flows |
| E2E tests (Playwright) | 48 | All major modules + smoke suite |
| Accessibility tests | 1 | axe-core scan |
| Mobile tests | 1 | Mobile navigation |
| Edge case tests | 2 | Network + validation |
| **Total** | **~107** | |

### Must-Have Module Risk Matrix

| Module | Backend Risk | Frontend Risk | Overall Risk | Action Required |
|--------|-------------|---------------|--------------|-----------------|
| Employee Management | MEDIUM | LOW | LOW | Add 3 more service tests |
| Attendance | MEDIUM | LOW | LOW | Add scheduled job test |
| Leave Management | LOW | LOW | **LOW** | Sufficient |
| Benefits | **CRITICAL** | MEDIUM | **CRITICAL** | Write all tests |
| Asset Management | HIGH | HIGH | **HIGH** | Write service + frontend tests |
| Job Posting & Candidates | MEDIUM | MEDIUM | MEDIUM | Add 2 service tests |
| Interview Scheduling | **CRITICAL** | **CRITICAL** | **CRITICAL** | Write all tests |
| Onboarding | MEDIUM | LOW | MEDIUM | Add service test |

---

## Document Version

- **Created:** 2026-03-22
- **Owner:** QA Lead Agent
- **Status:** Discovery Phase Complete — Gaps Identified
- **Next Review:** After gap remediation (Day 3)
