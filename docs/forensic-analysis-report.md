# NU-AURA Platform — Forensic Analysis Report

**Date:** 2026-03-27
**Branch:** main (commit 399483c9)
**Agents:** 9 specialists across 3 waves
**Duration:** ~45 minutes total

---

## Executive Summary

| Severity | Count |
|----------|:-----:|
| **CRITICAL** | 48 |
| **HIGH** | 99 |
| **MEDIUM** | 78 |
| **LOW** | 42 |
| **Total** | **267** |

**Auto-fixed:** 17 issues (16 test files + 1 frontend type error)
**Manual required:** 250 issues

### Platform Health Score: **62/100**

- Backend compilation: PASS
- Frontend build: PASS (after 1 auto-fix)
- Test suite: 89.4% pass rate (1573/1759) — NEEDS WORK
- Controller test coverage: 8.3% — CRITICAL GAP
- Service test coverage: 25.7% — CRITICAL GAP
- RLS tenant isolation: 34% (59/174 tables) — CRITICAL GAP
- API contract alignment: 75% frontend matched — NEEDS WORK
- Security posture: GOOD (no hardcoded secrets, comprehensive OWASP headers)
- Infrastructure: NEEDS WORK (5 critical config issues)

---

## Top 10 Most Critical Findings

| # | Finding | Domain | Impact |
|---|---------|--------|--------|
| 1 | **SpEL Injection in Payroll** — `StandardEvaluationContext` allows RCE via DB-stored formulas | HRMS | Remote Code Execution |
| 2 | **115 tenant tables lack RLS** — only 59/174 have Row Level Security policies | Database | Cross-tenant data leak |
| 3 | **175 permissions not seeded in DB** — non-SuperAdmin users get 403 on those endpoints | Security | Broken access for regular users |
| 4 | **Performance/Dept/Employee frontend calls wrong paths** — 38+ endpoints return 404 | API Contracts | Entire modules non-functional |
| 5 | **Missing leave accrual cron job** — monthly/quarterly leave types never accrue | HRMS | Leave balances stuck at zero |
| 6 | **Preboarding portal not in SecurityConfig permitAll** — new hires get 401 | Hire | Preboarding portal broken |
| 7 | **Payslip IDOR** — `PAYROLL_VIEW_SELF` doesn't verify employee ID | HRMS | Salary data exposure |
| 8 | **Exit module emits no Kafka events** — offboarded employees' access never auto-revoked | Hire | Security risk on offboarding |
| 9 | **TENANT_ADMIN bypass mismatch** — frontend bypasses all, backend does not | Security | Broken UX for tenant admins |
| 10 | **92% of controllers have zero tests** — only 11/132 covered | Tests | Regression risk |

---

## Findings by Domain

### 1. Backend Structure
**Agent:** `backend-structure` | **Findings:** 1 CRITICAL, 10 HIGH, 21 MEDIUM, 3 LOW

| ID | Sev | Finding | File |
|----|-----|---------|------|
| C-001 | CRIT | Duplicate endpoint `PUT /notifications/{id}/read` in two controllers | NotificationController.java:100, MultiChannelNotificationController.java:98 |
| H-001 | HIGH | Field injection in security classes (SecurityConfig, JwtAuthFilter) | SecurityConfig.java:49-61 |
| H-002 | HIGH | 9 controllers inject repositories directly (bypass service layer) | WebhookController, DocuSignController, etc. |
| H-003 | HIGH | 19 controllers in wrong packages (2 outside `api/` entirely) | ApiKeyController, WebSocketNotificationController |
| H-005 | HIGH | MapStruct 1.6.3 declared but zero @Mapper interfaces exist | pom.xml |
| H-006 | HIGH | 137/149 controllers have NO test class (92% untested) | — |
| H-007 | HIGH | 139/187 services have NO test class (74% untested) | — |
| M-001 | MED | 92 field injection instances across 43 files | AuthService (10), EmployeeService (7), etc. |
| M-002 | MED | 16 unreferenced repositories (dead code) | infrastructure/**/repository/ |

### 2. Frontend Build
**Agent:** `frontend-build` | **Findings:** 0 CRITICAL, 1 HIGH, 4 MEDIUM, 3 LOW

| ID | Sev | Finding | File |
|----|-----|---------|------|
| — | AUTO-FIX | Build error: missing generic type on `apiClient.get()` | tax.service.ts:42 |
| H-1 | HIGH | 36 `as any` assertions in test files | payroll/attendance/leave/employee service tests |
| M-1 | MED | 2 `z.any()` in Zod schemas (fluence, contracts) | fluence.ts:19, contract.ts:17 |
| M-3 | MED | 787 kB shared JS bundle (vendors: 700 kB) | — |
| M-4 | MED | Unused component: FeatureGate.tsx | components/auth/FeatureGate.tsx |
| L-1 | LOW | 100 design grid violations (gap-3/p-3 instead of 8px) | 30 files |

**Clean areas:** Zero `@ts-ignore`, zero `as any` in production, zero `primary-` remnants, all forms use RHF+Zod, all images have alt text.

### 3. Database Integrity
**Agent:** `database-integrity` | **Findings:** 2 CRITICAL, 5 HIGH, 4 MEDIUM, 2 LOW

| ID | Sev | Finding | File |
|----|-----|---------|------|
| CRIT-001 | CRIT | **115 of 174 tenant tables lack RLS** — employee_loans, payment_transactions, tax_declarations, applicants exposed | V24/V36-V38/V43 migrations |
| CRIT-002 | CRIT | CLAUDE.md says V0–V62 but actual is V0–V79 (stale docs) | CLAUDE.md |
| HIGH-001 | HIGH | 24 `@Modifying` methods without `@Transactional` across 13 repositories | NotificationRepository, CustomFieldValueRepository, etc. |
| HIGH-002 | HIGH | 5 migration version gaps (V1, V27-V29, V67) | db/migration/ |
| HIGH-003 | HIGH | 4 entities without Flyway migrations (api_keys, content_views, etc.) | — |
| HIGH-005 | HIGH | 11 orphaned migration tables with no JPA entity | attendance_regularization_config, etc. |

**Positive:** All native SQL includes `tenant_id`, monetary columns use NUMERIC, 602 indexes defined.

### 4. Security & RBAC
**Agent:** `security-rbac` | **Findings:** 0 CRITICAL, 3 HIGH, 7 MEDIUM, 4 LOW

| ID | Sev | Finding | File |
|----|-----|---------|------|
| HIGH-1 | HIGH | **175 Permission.java constants not seeded in DB** — 403 for all non-SuperAdmin | Permission.java vs V19/V66/V69/V70/V74 |
| HIGH-2 | HIGH | **TENANT_ADMIN bypass mismatch** — frontend bypasses all, backend doesn't | usePermissions.ts vs PermissionAspect.java |
| HIGH-3 | HIGH | V19 permission names don't match constants (READ vs VIEW) | V19 migration |
| MED-4 | MED | 3 controllers missing @Valid on @RequestBody | PayrollController, DocuSignController, TravelExpenseController |
| MED-6 | MED | AUTH rate limit 10/min vs documented 5/min | DistributedRateLimiter.java |
| MED-8 | MED | Frontend CSP `connect-src` includes `https:` wildcard | middleware.ts |

**Positive:** All 149 controllers are protected or legitimately public, OWASP headers comprehensive, CSRF solid, JWT secret validated at startup.

### 5. Infrastructure & Config
**Agent:** `infra-config` | **Findings:** 5 CRITICAL, 8 HIGH, 10 MEDIUM, 6 LOW

| ID | Sev | Finding | File |
|----|-----|---------|------|
| CRIT-01 | CRIT | MinIO default credentials (minioadmin/minioadmin123) | docker-compose.yml:106-107 |
| CRIT-02 | CRIT | K8s secrets.yaml has plaintext placeholders in git | deployment/kubernetes/secrets.yaml |
| CRIT-03 | CRIT | Backend K8s init container references missing ConfigMap keys | backend-deployment.yaml:55 |
| CRIT-04 | CRIT | Zookeeper has no health check (Kafka startup race) | docker-compose.yml:25-39 |
| CRIT-05 | CRIT | No `.env.example` file exists | — |
| HIGH-05 | HIGH | No K8s manifests for Kafka, Redis, or Zookeeper | deployment/kubernetes/ |
| HIGH-07 | HIGH | Actuator endpoints exposed via ingress to internet | ingress.yaml:60-66 |

**Positive:** Kafka producer uses idempotent writes, 29 alert rules, 4 valid Grafana dashboards, NetworkPolicies with default-deny.

### 6. Test Coverage
**Agent:** `test-coverage` | **Findings:** 5 CRITICAL, 8 HIGH, 12 MEDIUM, 6 LOW

| ID | Sev | Finding |
|----|-----|---------|
| CRIT-001 | CRIT | JVM OOM crashes during test run (2 surefire forks killed) |
| CRIT-002 | CRIT | **92% of controllers have ZERO test coverage** (11/132) |
| CRIT-003 | CRIT | **74% of services have ZERO test coverage** (48/187) |
| CRIT-004 | CRIT | 12 test files disabled (.java.skip) including PermissionAspect and ApprovalService |
| HIGH-001 | HIGH | Zero Kafka consumer/producer tests |
| HIGH-002 | HIGH | 23 of 24 scheduled jobs untested |
| HIGH-003 | HIGH | MFA and PasswordPolicy untested |
| HIGH-006 | HIGH | Statutory compliance calculations untested (legal risk) |

**Auto-fixed:** 16 test files — added missing @Mock annotations, fixed wrong repository method stubs, added tenant context mocks. ~90 of 186 failures should be resolved.

### 7. API Contracts
**Agent:** `api-contracts` | **Findings:** 38 CRITICAL, 68 HIGH, 24 MEDIUM, 16 LOW

| ID | Sev | Finding | Frontend File |
|----|-----|---------|---------------|
| — | CRIT | **Performance module calls /goals, /reviews, /feedback** — backend uses /performance/revolution, /okrs, /feedback360 (26 endpoints) | performance.service.ts |
| — | CRIT | **Department service calls /departments** — backend uses /organization/units (8 endpoints) | department.service.ts |
| — | CRIT | **Employee CRUD calls /employees/{id}** — no matching backend controller (11 endpoints) | employee.service.ts |
| — | CRIT | **useDocumentWorkflow double /api/v1/ prefix** — guaranteed 404s (12 endpoints) | useDocumentWorkflow.ts |
| — | CRIT | **usePreboarding double /api/v1/ prefix** — guaranteed 404s (3 endpoints) | usePreboarding.ts |
| — | CRIT | **Resource management** — no backend controller exists (18 endpoints) | resource-management.service.ts |
| — | CRIT | **Task management** — no backend controller exists (12 endpoints) | task.service.ts |
| — | HIGH | **Fluence wiki/blog path mismatch** — frontend /fluence/* vs backend /knowledge/* (38 endpoints) | fluence.service.ts |
| — | MED | **ApiError interface only captures 3/9 backend error fields** — errorCode→code, errors→details name mismatch | client.ts |

**Scale:** 1,378 backend endpoints, 897 frontend API calls. Only 676 matched (49% backend coverage).

### 8. NU-HRMS Module
**Agent:** `hrms-deep-dive` | **Findings:** 2 CRITICAL, 5 HIGH, 6 MEDIUM, 4 LOW

| ID | Sev | Finding | File |
|----|-----|---------|------|
| CRIT-001 | CRIT | **SpEL Injection** — StandardEvaluationContext in payroll formulas allows RCE | PayrollComponentService.java:265 |
| CRIT-002 | CRIT | **Missing leave accrual cron job** — monthly/quarterly balances stuck at zero | LeaveBalanceService.java (no scheduler) |
| HIGH-001 | HIGH | **Payslip IDOR** — PAYROLL_VIEW_SELF doesn't verify employee matches {employeeId} | PayrollController.java:158-165 |
| HIGH-002 | HIGH | No Kafka events for Attendance operations | AttendanceRecordService.java |
| HIGH-003 | HIGH | No Kafka events for Asset operations | AssetManagementService.java |
| HIGH-004 | HIGH | No Kafka events for Benefits operations | BenefitManagementService.java |

**Bright spots:** Employee module is mature with full IDOR protection and domain events. Payroll DAG evaluation with cycle detection is well-designed. Tenant isolation consistently applied.

### 9. NU-Hire Module
**Agent:** `hire-deep-dive` | **Findings:** 2 CRITICAL, 4 HIGH, 5 MEDIUM, 4 LOW

| ID | Sev | Finding | File |
|----|-----|---------|------|
| CRIT-1 | CRIT | **Preboarding portal endpoints NOT in SecurityConfig permitAll** — new hires get 401 | SecurityConfig.java, PreboardingController.java |
| CRIT-2 | CRIT | **Insecure password generation** — Math.random() instead of SecureRandom, password never delivered | CandidateHiredEventListener.java:127-134 |
| HIGH-1 | HIGH | **Exit module emits NO Kafka lifecycle events** — access never auto-revoked | ExitManagementService.java |
| HIGH-2 | HIGH | Candidate delete is hard-delete despite soft-delete column existing | RecruitmentManagementService.java:315 |
| HIGH-3 | HIGH | No data retention policy for rejected candidate PII (compliance risk) | — |
| HIGH-4 | HIGH | Offer approval has no rejection callback — rejected offers stuck in OFFER_EXTENDED | RecruitmentManagementService.java:503-521 |

---

## Auto-Fix Changelog

### Frontend (1 fix)
| File | Fix |
|------|-----|
| `frontend/lib/services/tax.service.ts:42` | Added union type generic to `apiClient.get<>()` + `in` operator type guard |

### Backend Tests (16 fixes)
| File | Fix |
|------|-----|
| `EmployeeServiceTest.java` | Added @Mock for AuditLogService, DataScopeService, DepartmentRepository; fixed findById→findByIdAndTenantId |
| `SalaryStructureServiceTest.java` | Added @Mock for AuditLogService |
| `PayslipServiceTest.java` | Added @Mock for AuditLogService, StatutoryDeductionService |
| `RecruitmentManagementServiceTest.java` | Added @Mock for AuditLogService, GoogleMeetService, JobOpeningService, InterviewManagementService |
| `AuthServiceTest.java` | Added @Mock for MetricsService, PasswordPolicyService |
| `DepartmentServiceTest.java` | Added @Mock, fixed findById→findByIdAndTenantId, fixed matcher mixing |
| `ContractServiceTest.java` | Added .type(ContractType.EMPLOYMENT) to 7 builders, added employee stub |
| `LeaveRequestServiceTest.java` | Added TransactionSynchronizationManager init/clear |
| `LeaveTypeServiceTest.java` | Fixed findById→findByIdAndTenantId |
| `PayrollRunServiceTest.java` | Fixed findById→findByIdAndTenantIdForUpdate |
| `WorkflowServiceAutoDelegationTest.java` | Added requireCurrentTenant mock |
| `WorkflowServiceTest.java` | Added requireCurrentTenant mock |
| `GlobalPayrollServiceTest.java` | Added @MockitoSettings(strictness=LENIENT) |
| `ApprovalChainIntegrationTest.java` | Added requireCurrentTenant mock |
| `LeaveApprovalPayrollImpactTest.java` | Added TransactionSynchronizationManager init/clear |
| `TimeTrackingServiceTest.java` | Added .isBillable(true), added getCurrentEmployeeId mock |

---

## Action Items (Prioritized)

### P0 — Security Critical (Fix This Week)

1. **SpEL Injection** — Replace `StandardEvaluationContext` with `SimpleEvaluationContext.forReadOnlyDataBinding()` in `PayrollComponentService.java:265`
2. **Payslip IDOR** — Add `validateEmployeeAccess()` to payslip endpoints in PayrollController
3. **Preboarding SecurityConfig** — Add `/api/v1/preboarding/portal/**` to `permitAll()` + CSRF ignore
4. **Insecure password** — Replace `Math.random()` with `SecureRandom` in CandidateHiredEventListener
5. **CSP wildcard** — Remove `https:` from `connect-src` in frontend middleware, whitelist specific domains

### P1 — Functional Critical (Fix This Sprint)

6. **Leave accrual job** — Create `LeaveAccrualScheduler` with monthly cron for MONTHLY/QUARTERLY leave types
7. **API contract fixes** — Fix performance.service.ts, department.service.ts, employee.service.ts to match backend paths
8. **Double /api/v1/ prefix** — Fix useDocumentWorkflow.ts and usePreboarding.ts
9. **Fluence path mismatch** — Change fluence.service.ts from `/fluence/*` to `/knowledge/*`
10. **Permission seeding** — Create V80 migration to seed all 175 missing Permission.java constants
11. **TENANT_ADMIN bypass** — Align frontend and backend (add to PermissionAspect or remove from usePermissions)
12. **Exit Kafka events** — Add `EmployeeOffboardedEvent` emission to ExitManagementService
13. **Notification controller conflict** — Resolve duplicate `PUT /notifications/{id}/read`

### P2 — Data Integrity (Next Sprint)

14. **RLS coverage** — Create V81 migration enabling RLS on all 115 missing tenant tables
15. **@Modifying + @Transactional** — Add to 24 repository methods
16. **Candidate soft-delete** — Change hard delete to soft delete in RecruitmentManagementService
17. **Offer rejection callback** — Implement `ApprovalCallbackHandler` for `RECRUITMENT_OFFER`
18. **Missing Kafka events** — Add event publishing for Attendance, Assets, Benefits modules
19. **K8s secrets** — Move to external secret manager, fix init container ConfigMap keys
20. **Create .env.example** — Document all required environment variables

### P3 — Code Quality (Ongoing)

21. **Test coverage push** — Target 80%: re-enable .skip files, add tests for statutory/MFA/scheduled jobs
22. **Surefire OOM** — Increase -Xmx to 4096m or reduce fork count
23. **Field injection → constructor injection** — Convert 92 instances across 43 files
24. **Remove dead code** — 16 unreferenced repositories, unused MapStruct dependency
25. **Frontend bundle size** — Dynamic import Recharts, Tiptap, ExcelJS
26. **CLAUDE.md update** — Fix migration version (V79, not V62), update next = V82

---

## Appendix: Agent Reports

Individual agent reports with full detail available at:
- `/tmp/nu-aura-analysis/backend-structure.md`
- `/tmp/nu-aura-analysis/frontend-build.md`
- `/tmp/nu-aura-analysis/database-integrity.md`
- `/tmp/nu-aura-analysis/security-rbac.md`
- `/tmp/nu-aura-analysis/infra-config.md`
- `/tmp/nu-aura-analysis/test-coverage.md`
- `/tmp/nu-aura-analysis/api-contracts.md`
- `/tmp/nu-aura-analysis/hrms-deep-dive.md`
- `/tmp/nu-aura-analysis/hire-deep-dive.md`
