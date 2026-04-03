# NU-AURA — Final Bug Status Report
**Run Date:** 2026-04-03  
**Audit Type:** Comprehensive Static Code Analysis (All Use Cases)  
**Scope:** 6 parallel agents × full codebase — Auth, Employees, Attendance, Leave, Payroll, Benefits, Expenses, Loans, Recruitment, Performance, Training, OKR, Feedback360, RBAC, Platform, Workflow, Assets, Travel, Letters, Fluence, Resources, Projects, Timesheets, F&F, Announcements, Helpdesk  
**Total Use Cases Audited:** ~120 across all modules  

---

## Executive Summary

| Severity | Count | Status |
|----------|-------|--------|
| **P0 — Critical (Security/Tenant breach)** | 2 | Must fix before release |
| **P1 — High (Runtime crash / auth bypass / data corruption)** | 12 | Must fix before release |
| **P2 — Medium (HTTP contract / logic gaps)** | 8 | Fix in next sprint |
| **Previously Fixed (this session)** | 10 | ✅ Done |
| **False Alarms (confirmed safe)** | 8 | ✅ Closed |

**TOTAL NEW BUGS: 22**  
**GO / NO-GO: ❌ NO-GO — 2 P0 security bugs must be fixed before release**

---

## P0 — Critical (Security / Tenant Isolation)

### BUG-NEW-001 · TENANT ISOLATION BREACH — F&F Exit Process Creation
- **Severity:** P0 — Cross-tenant data access
- **File:** `backend/src/main/java/com/hrms/application/exit/service/ExitManagementService.java:51`
- **Description:** `createExitProcess()` uses `employeeRepository.findById(request.getEmployeeId())` — no tenant filter. Tenant A admin can initiate an exit/F&F process for a Tenant B employee by supplying their UUID.
- **Root Cause:** `findById()` instead of `findByIdAndTenantId()`
- **Fix:**
  ```java
  // Change line 51 from:
  employeeRepository.findById(request.getEmployeeId())
  // To:
  employeeRepository.findByIdAndTenantId(request.getEmployeeId(), tenantId)
  ```

### BUG-NEW-002 · AUTHORIZATION BYPASS — Announcement Targeting Leak
- **Severity:** P0 — Employee A can view targeted announcements sent to Employee B
- **File:** `backend/src/main/java/com/hrms/api/announcement/controller/AnnouncementController.java:51-55`
- **Description:** `GET /api/v1/announcements/active?employeeId={uuid}` accepts any `employeeId` parameter with only `EMPLOYEE_VIEW_SELF` permission. No check that the `employeeId` matches the authenticated user. Any employee can spy on another's targeted announcements.
- **Root Cause:** Missing ownership check in controller/service
- **Fix:** Add to `getActiveAnnouncements()` service:
  ```java
  UUID currentEmployeeId = SecurityContext.getCurrentEmployeeId();
  if (!employeeId.equals(currentEmployeeId) 
      && !SecurityContext.hasPermission(Permission.EMPLOYEE_VIEW_ALL)) {
      throw new AccessDeniedException("Cannot view another employee's announcements");
  }
  ```

---

## P1 — High (Runtime Crash / Auth Bypass / Data Corruption)

### BUG-NEW-003 · WRONG PERMISSION — ReviewCycle UPDATE uses CREATE permission
- **Severity:** P1 — Permission bypass: anyone with REVIEW_CREATE can update cycles
- **File:** `backend/src/main/java/com/hrms/api/performance/ReviewCycleController.java:72`
- **Fix:** `@RequiresPermission(Permission.REVIEW_CREATE)` → `@RequiresPermission(Permission.REVIEW_UPDATE)`

### BUG-NEW-004 · WRONG PERMISSION — ReviewCycle DELETE uses CREATE permission
- **Severity:** P1 — Permission bypass: anyone with REVIEW_CREATE can delete cycles
- **File:** `backend/src/main/java/com/hrms/api/performance/ReviewCycleController.java:82`
- **Fix:** `@RequiresPermission(Permission.REVIEW_CREATE)` → `@RequiresPermission(Permission.REVIEW_DELETE)`

### BUG-NEW-005 · WRONG PERMISSION — ReviewCycle COMPLETE uses CREATE permission
- **Severity:** P1 — Permission bypass: anyone with REVIEW_CREATE can close cycles
- **File:** `backend/src/main/java/com/hrms/api/performance/ReviewCycleController.java:89`
- **Fix:** `@RequiresPermission(Permission.REVIEW_CREATE)` → `@RequiresPermission(Permission.REVIEW_APPROVE)`

### BUG-NEW-006 · WRONG PERMISSION — PerformanceReview UPDATE uses CREATE permission
- **Severity:** P1 — Permission bypass
- **File:** `backend/src/main/java/com/hrms/api/performance/PerformanceReviewController.java:99`
- **Fix:** `@RequiresPermission(Permission.REVIEW_CREATE)` → `@RequiresPermission(Permission.REVIEW_UPDATE)`

### BUG-NEW-007 · NPE — Wiki page logs space.getId() on lazy uninitialized relation
- **Severity:** P1 — NullPointerException crashes wiki page creation
- **File:** `backend/src/main/java/com/hrms/application/knowledge/service/WikiPageService.java:53`
- **Description:** `page.getSpace().getId()` called in log statement. `space` field is `@ManyToOne(LAZY)` and may not be set on the input entity; `getSpace()` returns null → NPE.
- **Fix:**
  ```java
  log.info("Created wiki page: {} in space: {}", saved.getId(), 
      Optional.ofNullable(page.getSpace()).map(WikiSpace::getId).orElse(null));
  ```

### BUG-NEW-008 · EMPTY RESPONSE — ResourcePool getPool() returns empty body
- **Severity:** P1 — Frontend deserialization breaks (null body on typed endpoint)
- **File:** `backend/src/main/java/com/hrms/api/resourcemanagement/ResourcePoolController.java:141-143`
- **Description:** `return ResponseEntity.ok().build()` returns HTTP 200 with no body, but the method signature promises `ResponseEntity<ResourcePoolSummary>`. Frontend JSON parse fails.
- **Fix:** Return proper stub response or 404:
  ```java
  return ResponseEntity.notFound().build();
  // OR return a stub summary:
  return ResponseEntity.ok(ResourcePoolSummary.empty(id));
  ```

### BUG-NEW-009 · AUTHORIZATION BYPASS — Cancel Leave has no ownership check
- **Severity:** P1 — Any user with LEAVE_CANCEL permission can cancel any employee's leave
- **File:** `backend/src/main/java/com/hrms/application/leave/service/LeaveRequestService.java` (cancelLeaveRequest method)
- **Description:** `cancelLeaveRequest()` only validates tenant isolation. No check that the cancelling user owns the request or has manager authority over the requestor.
- **Fix:**
  ```java
  UUID currentEmployeeId = SecurityContext.getCurrentEmployeeId();
  if (!request.getEmployeeId().equals(currentEmployeeId) 
      && !SecurityContext.hasPermission(Permission.LEAVE_MANAGE)) {
      throw new AccessDeniedException("Cannot cancel another employee's leave request");
  }
  ```

### BUG-NEW-010 · DATA CORRUPTION — Loan approval amount comparison inverted
- **Severity:** P1 — Approved amounts higher than requested are silently dropped
- **File:** `backend/src/main/java/com/hrms/application/loan/service/LoanService.java:88`
- **Description:** `approvedAmount.compareTo(loan.getPrincipalAmount()) <= 0` means "only update if approved ≤ original." If a manager approves more than requested, the override is silently ignored.
- **Fix:**
  ```java
  // From:
  if (approvedAmount != null && approvedAmount.compareTo(loan.getPrincipalAmount()) <= 0) {
  // To:
  if (approvedAmount != null && approvedAmount.compareTo(BigDecimal.ZERO) > 0) {
  ```

### BUG-NEW-011 · MISSING TRANSACTION — Benefit plan activate/deactivate without @Transactional
- **Severity:** P1 — State changes may not roll back on failure
- **File:** `backend/src/main/java/com/hrms/application/benefits/service/BenefitManagementService.java:85,98`
- **Description:** `activatePlan()` and `deactivatePlan()` call `repository.save()` without `@Transactional`. If a downstream call (e.g., audit log) fails, the DB write is not rolled back.
- **Fix:** Add `@Transactional` to both methods.

### BUG-NEW-012 · NPE — Feedback360 response submission throws RuntimeException on missing request
- **Severity:** P1 — Unhandled RuntimeException leaks stack trace to client (500 with no proper error body)
- **File:** `backend/src/main/java/com/hrms/api/feedback/Feedback360Controller.java:207-208`
- **Fix:**
  ```java
  Feedback360Request feedbackRequest = feedback360Service.getRequestById(tenantId, request.getRequestId())
      .orElseThrow(() -> new IllegalArgumentException("Feedback request not found"));
  ```

### BUG-NEW-013 · MISSING VISIBILITY CHECK — Feedback360 responses visible to all tenants
- **Severity:** P1 — Any user with FEEDBACK_360_VIEW can read any other employee's feedback responses
- **File:** `backend/src/main/java/com/hrms/api/feedback/Feedback360Controller.java:245`
- **Description:** `getResponse()` only checks tenant_id, not that the requesting user is the reviewer, subject, or HR.
- **Fix:** Add identity check in service: caller must be reviewer OR subject OR have HR admin permission.

### BUG-NEW-014 · SCOPE LEAK — Manager list not filtered by data scope
- **Severity:** P1 — User with VIEW_TEAM scope can see managers from other departments
- **File:** `backend/src/main/java/com/hrms/application/employee/service/EmployeeService.java` (getManagerEmployees, ~line 511-526)
- **Description:** `getManagerEmployees()` only filters by level, not by the caller's data scope.
- **Fix:** Apply `dataScopeService.getScopeSpecification()` in `getManagerEmployees()` as done in `getAllEmployees()`.

---

## P2 — Medium (HTTP Contract / Logic Gaps / Non-Blocking)

### BUG-NEW-015 · HTTP 200 vs 201 — Loan creation returns wrong status code
- **Severity:** P2  
- **File:** `backend/src/main/java/com/hrms/api/loan/controller/LoanController.java:38`
- **Fix:** `ResponseEntity.ok(...)` → `ResponseEntity.status(HttpStatus.CREATED).body(...)`

### BUG-NEW-016 · HTTP 200 vs 201 — TimeTracking entry creation returns wrong status code
- **Severity:** P2  
- **File:** `backend/src/main/java/com/hrms/api/timetracking/controller/TimeTrackingController.java:32-39`
- **Fix:** Same as above — use `HttpStatus.CREATED`

### BUG-NEW-017 · MISSING ENDPOINT — Goal DELETE not implemented
- **Severity:** P2 — Users cannot delete goals; data accumulates indefinitely
- **File:** `backend/src/main/java/com/hrms/api/okr/GoalController.java` (no DeleteMapping)
- **Fix:** Add `@DeleteMapping("/{id}")` with `@RequiresPermission(Permission.GOAL_DELETE)`

### BUG-NEW-018 · BROKEN HELPDESK WORKFLOW — All write ops require SYSTEM_ADMIN
- **Severity:** P2 — Helpdesk staff cannot manage tickets; only super admins can
- **File:** `backend/src/main/java/com/hrms/api/helpdesk/controller/HelpdeskController.java`
- **Fix:** Replace `SYSTEM_ADMIN` on update/assign/resolve/close with a `HELPDESK_TICKET_MANAGE` permission

### BUG-NEW-019 · LOGIC ERROR — Blog "active" endpoint returns archived posts
- **Severity:** P2 — Archived blog posts appear as "active" to users
- **File:** `backend/src/main/java/com/hrms/api/knowledge/controller/BlogPostController.java:114-121`
- **Fix:** Filter `status != ARCHIVED` in `getActivePosts()` service method

### BUG-NEW-020 · TYPE SAFETY — CustomField permissions use raw strings
- **Severity:** P2 — No compile-time validation; typos silently bypass security
- **File:** `backend/src/main/java/com/hrms/api/customfield/controller/CustomFieldController.java` (all endpoints)
- **Fix:** Add `CUSTOM_FIELD_CREATE/VIEW/UPDATE/DELETE` constants to `Permission.java`

### BUG-NEW-021 · MISSING VALIDATION — Payroll run has no pre-flight salary structure check
- **Severity:** P2 — Payroll run starts successfully then fails async via Kafka with cryptic error
- **File:** `backend/src/main/java/com/hrms/application/payroll/service/PayrollRunService.java` (initiateProcessing)
- **Fix:** Before transitioning to PROCESSING, validate all employees in run have active salary structures

### BUG-NEW-022 · FRONTEND — Payroll service hardcodes query string (bypasses axios normalization)
- **Severity:** P2  
- **File:** `frontend/lib/services/hrms/payroll.service.ts:279`
- **Description:** `'/payroll/components?page=${page}&size=${size}&sort=evaluationOrder,asc'` — hardcoded query string instead of axios `params` object
- **Fix:**
  ```typescript
  apiClient.get('/payroll/components', { params: { page, size, sort: 'evaluationOrder,asc' } })
  ```

---

## Previously Fixed Bugs (This Session — Already Committed)

| Bug ID | Description | Commit |
|--------|-------------|--------|
| BUG-QA2-003 | Letter GET 404 after POST create (null employeeId in enrichLetterResponse) | f202ad09 |
| BUG-QA2-005 | Platform applications 500 (LazyInit on permissions collection) | f202ad09 |
| BUG-QA2-009 | Employee deactivation 500 (LazyInit on User.roles in updateEmployee) | 2c86a9d0 |
| BUG-QA2-011 | Resource pool endpoints returning 404 (controller not implemented) | 2a52841a |
| BUG-QA2-012 | Self-service profile update 500 | 2c86a9d0 |
| BUG-QA2-007 | Half-day enum MORNING/FIRST_HALF normalization | Existing fix |
| BUG-QA2-006 | SQL injection guard | Existing fix |
| BUG-QA2-008 | @FutureOrPresent on retroactive leave | Existing fix |
| Various | Cookie path, FnF path, leave path, statutory controllers false alarms | a280c136 |

---

## Confirmed False Alarms (Not Bugs)

| ID | Description | Reason |
|----|-------------|--------|
| NEW-LEAVE-001 | Half-day MORNING/FIRST_HALF normalization | Already fixed — BUG-QA2-007 FIX comment in source |
| NEW-PLAT-001 | Letter markLetterDownloaded NPE | Null guard already in place (grep confirms) |
| BUG-008 | Report POST path mismatch | Paths match |
| BUG-009 | Feature flag path mismatch | Paths match |
| BUG-010 | FnF path mismatch | Paths match |
| BUG-011 | Leave path mismatch | Paths match |
| BUG-012 | Cookie path semantics | Correct behavior |
| BUG-013 | Statutory controllers missing | All present |

---

## Bug Priority Fix Order

### Immediate (Before Any Production Access)
1. **BUG-NEW-001** — F&F tenant isolation (P0, security critical)
2. **BUG-NEW-002** — Announcement RBAC leak (P0, security critical)

### Before Release
3. **BUG-NEW-003/004/005/006** — Review cycle/review permission mismatches (4 lines, easy fix)
4. **BUG-NEW-009** — Leave cancel ownership check
5. **BUG-NEW-010** — Loan approval amount logic inversion
6. **BUG-NEW-013** — Feedback360 visibility
7. **BUG-NEW-007** — Wiki LazyInit NPE (crashes wiki create)
8. **BUG-NEW-008** — ResourcePool empty response body
9. **BUG-NEW-011** — Benefit plan transaction boundaries
10. **BUG-NEW-012** — Feedback360 RuntimeException handling
11. **BUG-NEW-014** — Manager list scope leak

### Next Sprint (P2 — Non-blocking)
12. BUG-NEW-015/016 — HTTP 200 vs 201 (loans, timesheets)
13. BUG-NEW-017 — Goal DELETE endpoint
14. BUG-NEW-018 — Helpdesk permission granularity
15. BUG-NEW-019 — Blog "active" filtering
16. BUG-NEW-020 — CustomField string permissions
17. BUG-NEW-021 — Payroll pre-flight validation
18. BUG-NEW-022 — Frontend payroll service query string

---

## Module Health Summary

| Module | Status | Bugs |
|--------|--------|------|
| Auth | ✅ CLEAN | 0 |
| Employees (CRUD) | ⚠️ 1 bug | P1 scope leak on managers |
| Attendance | ✅ CLEAN | 0 |
| Leave | ⚠️ 1 bug | P1 cancel ownership |
| Payroll | ⚠️ 1 bug | P2 pre-flight validation |
| Benefits | ⚠️ 1 bug | P1 missing @Transactional |
| Expenses | ✅ CLEAN | 0 |
| Loans | ⚠️ 2 bugs | P1 amount logic, P2 status code |
| Recruitment | ✅ CLEAN | 0 |
| Onboarding/Offboarding | ✅ CLEAN | 0 |
| Performance Reviews | ⚠️ 4 bugs | P1 wrong permissions ×4 |
| OKR / Goals | ⚠️ 1 bug | P2 missing DELETE |
| Feedback 360 | ⚠️ 2 bugs | P1 visibility, P1 NPE |
| Training/LMS | ✅ CLEAN | 0 |
| RBAC / Platform | ✅ CLEAN | 0 |
| Workflow Engine | ✅ CLEAN | 0 |
| Assets | ✅ CLEAN | 0 |
| Travel | ✅ CLEAN | 0 |
| Letters | ✅ CLEAN | 0 (fix already committed) |
| Announcements | 🔴 1 bug | P0 RBAC leak |
| F&F / Exit | 🔴 1 bug | P0 tenant isolation |
| Helpdesk | ⚠️ 1 bug | P2 over-permissioned |
| Fluence/Wiki | ⚠️ 1 bug | P1 LazyInit NPE |
| Fluence/Blog | ⚠️ 1 bug | P2 active filter |
| Resources | ⚠️ 1 bug | P1 empty stub body |
| Projects/Timesheets | ⚠️ 1 bug | P2 HTTP status |
| Custom Fields | ⚠️ 1 bug | P2 string permissions |
| Frontend | ⚠️ 1 bug | P2 query string |
| Settings | ✅ CLEAN | 0 |
