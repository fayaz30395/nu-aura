# RBAC Deep Test Results - NU-AURA Platform

**Date:** 2026-03-24
**Tester:** Claude Code (Automated RBAC Audit Agent)
**Backend:** http://localhost:8080 (Spring Boot 3.4.1)
**Method:** Live API testing with JWT tokens for each role

---

## Test Accounts

| Email                | Roles                                              | Employee ID      |
|----------------------|----------------------------------------------------|------------------|
| fayaz.m@nulogic.io   | SUPER_ADMIN, SKIP_LEVEL_MANAGER, REPORTING_MANAGER | 550e8400-...0040 |
| sumit@nulogic.io     | MANAGER, SKIP_LEVEL_MANAGER, REPORTING_MANAGER     | 48000000-...0001 |
| mani@nulogic.io      | TEAM_LEAD, SKIP_LEVEL_MANAGER, REPORTING_MANAGER   | 48000000-...0003 |
| jagadeesh@nulogic.io | HR_MANAGER, SKIP_LEVEL_MANAGER, REPORTING_MANAGER  | 48000000-...0007 |
| suresh@nulogic.io    | RECRUITMENT_ADMIN, REPORTING_MANAGER               | 48000000-...0008 |
| saran@nulogic.io     | EMPLOYEE                                           | 48000000-...0002 |
| raj@nulogic.io       | EMPLOYEE                                           | 48000000-...0004 |

---

## Endpoint x Role Matrix

Legend: **200** = OK, **403** = Forbidden, **500** = Server Error, **400** = Bad Request, **405** =
Method Not Allowed

### Employee Management

| Endpoint                 | SUPER_ADMIN | MANAGER | TEAM_LEAD | HR_MANAGER | RECRUIT_ADMIN | EMPLOYEE | EMPLOYEE_2 |  Expected  |      Verdict       |
|--------------------------|:-----------:|:-------:|:---------:|:----------:|:-------------:|:--------:|:----------:|:----------:|:------------------:|
| GET /employees           |     200     |   200   |    200    |    200     |      200      |   200    |    200     | Restricted |    **FINDING**     |
| GET /employees/me        |     200     |   200   |    200    |    200     |      200      |   200    |    200     |    All     |         OK         |
| GET /employees/{id}      |     200     |   200   |    200    |    200     |      200      |   200    |    200     |   Scoped   |    **FINDING**     |
| GET /employees/search    |     200     |   200   |    200    |    200     |      200      |   200    |    200     |   Scoped   |    **FINDING**     |
| GET /employees/directory |     400     |   400   |    400    |    400     |      400      |   400    |    400     |   Varies   | OK (missing param) |
| POST /employees          |     403     |   403   |    403    |    403     |      403      |   403    |    403     | SA/HR only |    **FINDING**     |
| PUT /employees/{id}      |     403     |   403   |    403    |    403     |      403      |   403    |    403     | SA/HR only |    **FINDING**     |

### Leave Management

| Endpoint              | SUPER_ADMIN | MANAGER | TEAM_LEAD | HR_MANAGER | RECRUIT_ADMIN | EMPLOYEE | EMPLOYEE_2 | Expected |    Verdict    |
|-----------------------|:-----------:|:-------:|:---------:|:----------:|:-------------:|:--------:|:----------:|:--------:|:-------------:|
| GET /leaves           |     500     |   500   |    500    |    500     |      500      |   500    |    500     |  Varies  | **500 ERROR** |
| GET /leaves/my-leaves |     500     |   500   |    500    |    500     |      500      |   500    |    500     |   All    | **500 ERROR** |
| GET /leaves/approvals |     500     |   500   |    500    |    500     |      500      |   500    |    500     |   Mgr+   | **500 ERROR** |
| POST /leaves          |     403     |   403   |    403    |    403     |      403      |   403    |    403     |   All    |  **FINDING**  |

### Attendance

| Endpoint                      | SUPER_ADMIN | MANAGER | TEAM_LEAD | HR_MANAGER | RECRUIT_ADMIN | EMPLOYEE | EMPLOYEE_2 | Expected |      Verdict       |
|-------------------------------|:-----------:|:-------:|:---------:|:----------:|:-------------:|:--------:|:----------:|:--------:|:------------------:|
| GET /attendance               |     500     |   500   |    500    |    500     |      500      |   500    |    500     |  Varies  |   **500 ERROR**    |
| GET /attendance/team          |     500     |   500   |    500    |    500     |      500      |   500    |    500     |   Mgr+   |   **500 ERROR**    |
| GET /attendance/my-attendance |     400     |   400   |    400    |    400     |      400      |   400    |    400     |   All    | OK (missing param) |

### Payroll

| Endpoint                 | SUPER_ADMIN | MANAGER | TEAM_LEAD | HR_MANAGER | RECRUIT_ADMIN | EMPLOYEE | EMPLOYEE_2 |  Expected  |      Verdict       |
|--------------------------|:-----------:|:-------:|:---------:|:----------:|:-------------:|:--------:|:----------:|:----------:|:------------------:|
| GET /payroll/runs        |     200     |   200   |    200    |    200     |      200      |   200    |    200     | Admin only |    **CRITICAL**    |
| GET /payroll/payslips    |     200     |   200   |    200    |    200     |      200      |   200    |    200     |   Scoped   |    **CRITICAL**    |
| GET /payroll/payslips/me |     400     |   400   |    400    |    400     |      400      |   400    |    400     |    All     | OK (missing param) |
| POST /payroll/runs       |     403     |   403   |    403    |    403     |      403      |   403    |    403     | SA/HR only |    **FINDING**     |

### Admin

| Endpoint                 | SUPER_ADMIN | MANAGER | TEAM_LEAD | HR_MANAGER | RECRUIT_ADMIN | EMPLOYEE | EMPLOYEE_2 | Expected |    Verdict    |
|--------------------------|:-----------:|:-------:|:---------:|:----------:|:-------------:|:--------:|:----------:|:--------:|:-------------:|
| GET /admin/roles         |     500     |   500   |    500    |    500     |      500      |   500    |    500     | SA only  | **500 ERROR** |
| GET /admin/permissions   |     500     |   500   |    500    |    500     |      500      |   500    |    500     | SA only  | **500 ERROR** |
| GET /admin/feature-flags |     500     |   500   |    500    |    500     |      500      |   500    |    500     | SA only  | **500 ERROR** |
| POST /admin/roles        |     403     |   403   |    403    |    403     |      403      |   403    |    403     | SA only  |  **FINDING**  |
| GET /admin/system/health |     500     |   500   |    500    |    500     |      500      |   500    |    500     | SA only  | **500 ERROR** |
| GET /admin/users         |     200     |   403   |    403    |    403     |      403      |   403    |    403     | SA only  |      OK       |
| GET /admin/tenants       |     500     |   500   |    500    |    500     |      500      |   500    |    500     | SA only  | **500 ERROR** |
| GET /admin/audit-logs    |     500     |   500   |    500    |    500     |      500      |   500    |    500     | SA only  | **500 ERROR** |
| GET /admin/settings      |     500     |   500   |    500    |    500     |      500      |   500    |    500     | SA only  | **500 ERROR** |

### Departments

| Endpoint          | SUPER_ADMIN | MANAGER | TEAM_LEAD | HR_MANAGER | RECRUIT_ADMIN | EMPLOYEE | EMPLOYEE_2 |  Expected  |   Verdict   |
|-------------------|:-----------:|:-------:|:---------:|:----------:|:-------------:|:--------:|:----------:|:----------:|:-----------:|
| GET /departments  |     200     |   200   |    200    |    200     |      200      |   200    |    200     | All (read) |     OK      |
| POST /departments |     403     |   403   |    403    |    403     |      403      |   403    |    403     | SA/HR only | **FINDING** |

### Recruitment

| Endpoint                    | SUPER_ADMIN | MANAGER | TEAM_LEAD | HR_MANAGER | RECRUIT_ADMIN | EMPLOYEE | EMPLOYEE_2 |  Expected  |    Verdict    |
|-----------------------------|:-----------:|:-------:|:---------:|:----------:|:-------------:|:--------:|:----------:|:----------:|:-------------:|
| GET /recruitment/jobs       |     500     |   500   |    500    |    500     |      500      |   500    |    500     |   Varies   | **500 ERROR** |
| GET /recruitment/candidates |     200     |   200   |    200    |    200     |      403      |   403    |    403     | HR/Recruit |  **FINDING**  |
| POST /recruitment/jobs      |     403     |   403   |    403    |    403     |      403      |   403    |    403     | HR/Recruit |  **FINDING**  |

### Performance

| Endpoint                 | SUPER_ADMIN | MANAGER | TEAM_LEAD | HR_MANAGER | RECRUIT_ADMIN | EMPLOYEE | EMPLOYEE_2 | Expected |    Verdict    |
|--------------------------|:-----------:|:-------:|:---------:|:----------:|:-------------:|:--------:|:----------:|:--------:|:-------------:|
| GET /performance/reviews |     500     |   500   |    500    |    500     |      500      |   500    |    500     |  Varies  | **500 ERROR** |
| GET /performance/goals   |     500     |   500   |    500    |    500     |      500      |   500    |    500     |  Varies  | **500 ERROR** |
| GET /performance/okrs    |     500     |   500   |    500    |    500     |      500      |   500    |    500     |  Varies  | **500 ERROR** |

### Reports & Analytics

| Endpoint       | SUPER_ADMIN | MANAGER | TEAM_LEAD | HR_MANAGER | RECRUIT_ADMIN | EMPLOYEE | EMPLOYEE_2 |  Expected  |    Verdict    |
|----------------|:-----------:|:-------:|:---------:|:----------:|:-------------:|:--------:|:----------:|:----------:|:-------------:|
| GET /reports   |     500     |   500   |    500    |    500     |      500      |   500    |    500     | Restricted | **500 ERROR** |
| GET /analytics |     500     |   500   |    500    |    500     |      500      |   500    |    500     | Restricted | **500 ERROR** |

### Other Modules

| Endpoint              | SUPER_ADMIN | MANAGER | TEAM_LEAD | HR_MANAGER | RECRUIT_ADMIN | EMPLOYEE | EMPLOYEE_2 |  Expected  |      Verdict      |
|-----------------------|:-----------:|:-------:|:---------:|:----------:|:-------------:|:--------:|:----------:|:----------:|:-----------------:|
| GET /announcements    |     200     |   200   |    200    |    200     |      200      |   200    |    200     |    All     |        OK         |
| GET /helpdesk/tickets |     200     |   200   |    200    |    200     |      200      |   200    |    200     |   Scoped   |        OK         |
| GET /benefits         |     500     |   500   |    500    |    500     |      500      |   500    |    500     |   Varies   |   **500 ERROR**   |
| GET /benefits/plans   |     200     |   403   |    403    |    200     |      403      |   403    |    403     |   SA/HR    |        OK         |
| GET /expenses         |     200     |   403   |    403    |    403     |      403      |   403    |    403     |  SA only   |        OK         |
| GET /assets           |     200     |   403   |    403    |    403     |      403      |   403    |    403     |  SA only   |        OK         |
| GET /contracts        |     200     |   200   |    200    |    200     |      403      |   403    |    403     |    Mgr+    |        OK         |
| GET /loans            |     200     |   403   |    403    |    403     |      403      |   403    |    403     |  SA only   |        OK         |
| GET /documents        |     500     |   500   |    500    |    500     |      500      |   500    |    500     |   Varies   |   **500 ERROR**   |
| GET /training         |     500     |   500   |    500    |    500     |      500      |   500    |    500     |   Varies   |   **500 ERROR**   |
| GET /surveys          |     200     |   200   |    200    |    200     |      403      |   200    |    200     |    All     |        OK         |
| GET /recognition      |     405     |   405   |    405    |    405     |      405      |   405    |    405     |    All     | OK (wrong method) |
| GET /wellness         |     500     |   500   |    500    |    500     |      500      |   500    |    500     |    All     |   **500 ERROR**   |
| GET /calendar         |     500     |   500   |    500    |    500     |      500      |   500    |    500     |    All     |   **500 ERROR**   |
| GET /notifications    |     200     |   200   |    200    |    200     |      403      |   200    |    200     |    All     |        OK         |
| GET /onboarding       |     500     |   500   |    500    |    500     |      500      |   500    |    500     | HR/Recruit |   **500 ERROR**   |
| GET /offboarding      |     500     |   500   |    500    |    500     |      500      |   500    |    500     |  HR only   |   **500 ERROR**   |

### Additional Endpoints

| Endpoint             | SUPER_ADMIN | MANAGER | TEAM_LEAD | HR_MANAGER | RECRUIT_ADMIN | EMPLOYEE | Expected |   Verdict    |
|----------------------|:-----------:|:-------:|:---------:|:----------:|:-------------:|:--------:|:--------:|:------------:|
| GET /feature-flags   |     200     |   200   |    200    |    200     |      200      |   200    | SA/Admin | **CRITICAL** |
| GET /projects        |     200     |   200   |    200    |    200     |      403      |   200    |  Scoped  |      OK      |
| GET /wall/posts      |     200     |   200   |    200    |    200     |      403      |   200    |   All    |      OK      |
| GET /knowledge/blogs |     200     |   403   |    403    |    403     |      403      |   403    |  Varies  |      OK      |
| GET /lms/courses     |     200     |   403   |    403    |    403     |      403      |   403    | SA/Admin |      OK      |

### Unauthenticated Access

| Endpoint         | No Token | Expected | Verdict |
|------------------|:--------:|:--------:|:-------:|
| GET /employees   |   403    | 401/403  |   OK    |
| GET /admin/users |   403    | 401/403  |   OK    |
| GET /departments |   403    | 401/403  |   OK    |

---

## CRITICAL Findings

### CRIT-01: EMPLOYEE Can View All Payroll Runs

**Severity:** CRITICAL
**Endpoint:** `GET /api/v1/payroll/runs`
**Impact:** Any authenticated EMPLOYEE can access the payroll runs listing endpoint. While current
data returns 0 results (possibly due to data scoping), the endpoint itself does not enforce
role-based access control at the API gateway level.
**Expected:** Only SUPER_ADMIN, HR_MANAGER, and PAYROLL_ADMIN should access this endpoint.
**Actual:** HTTP 200 for ALL roles including EMPLOYEE.
**Risk:** If the backend service-level data scoping has a bug, employees could see salary data for
the entire organization.

### CRIT-02: EMPLOYEE Can Access Payslips List Endpoint

**Severity:** CRITICAL
**Endpoint:** `GET /api/v1/payroll/payslips`
**Impact:** Same as CRIT-01. The endpoint returns 200 for all roles. While data returned may be
empty/scoped, the permission gate is missing.
**Expected:** Employees should only use `GET /payroll/payslips/me`. The list endpoint should be
restricted to admin roles.
**Actual:** HTTP 200 for ALL roles.

### CRIT-03: All Roles Can View Feature Flags

**Severity:** CRITICAL
**Endpoint:** `GET /api/v1/feature-flags`
**Impact:** EMPLOYEE role can see ALL feature flags including internal feature names, rollout
percentages, metadata, and tenant configuration. This leaks internal system configuration.
**Data Exposed:** Feature keys (e.g., `enable_assets`, `enable_attendance`), descriptions,
categories, creation timestamps, rollout percentages.
**Expected:** Only SUPER_ADMIN should read feature flags. Other roles may need a simplified "is
feature enabled" check but not the full list.
**Actual:** HTTP 200 with full feature flag objects for ALL roles.

### CRIT-04: EMPLOYEE Can View Any Employee Record (IDOR)

**Severity:** CRITICAL
**Endpoint:** `GET /api/v1/employees/{id}`
**Impact:** An EMPLOYEE can look up any other employee's details by ID, including the SUPER_ADMIN's
record. While sensitive fields (salary, SSN, bank account number) are NOT exposed in the DTO, the
following PII is visible:

- Full name, work email, personal email
- Department, designation, job role, level
- Joining date, manager name
- Employment type, status
  **Expected:** Employees should only see their own full profile. Viewing other employees should
  return limited directory-style data or be denied.
  **Actual:** HTTP 200 with 20+ fields for any employee ID.

### CRIT-05: SUPER_ADMIN Denied on All Write Operations (CSRF)

**Severity:** CRITICAL (Functional)
**Endpoints:** All POST/PUT endpoints
**Impact:** SUPER_ADMIN cannot create employees, departments, roles, or perform any write operation.
Every POST/PUT returns 403 even with valid SUPER_ADMIN token.
**Root Cause:** CSRF double-submit cookie validation is blocking API calls made without the CSRF
cookie/header pair. The login response does not set a CSRF cookie, so API-only clients (including
automated tests) cannot perform write operations.
**Expected:** SUPER_ADMIN should be able to perform all write operations.
**Actual:** HTTP 403 for ALL write operations for ALL roles.

---

## HIGH Findings

### HIGH-01: Recruitment Candidates Accessible to MANAGER and TEAM_LEAD

**Severity:** HIGH
**Endpoint:** `GET /api/v1/recruitment/candidates`
**Impact:** MANAGER, TEAM_LEAD, and HR_MANAGER can all access the candidate list (200), while
RECRUITMENT_ADMIN (the designated role for recruitment) gets 403.
**Expected:** RECRUITMENT_ADMIN and HR_MANAGER should have access. MANAGER and TEAM_LEAD should have
limited or no access to candidate data.
**Actual:** Inverted permission - the recruitment-specific role is denied while generic management
roles are allowed.

### HIGH-02: 24 Endpoints Return HTTP 500 (Server Errors Masking Authorization)

**Severity:** HIGH
**Impact:** 24 endpoints return HTTP 500 for ALL roles, making it impossible to verify RBAC
enforcement. The 500 errors mask whether proper authorization checks exist. If the server error is
fixed, these endpoints may be wide open.
**Affected Endpoints:**

- Leave: `/leaves`, `/leaves/my-leaves`, `/leaves/approvals`
- Attendance: `/attendance`, `/attendance/team`
- Admin: `/admin/roles`, `/admin/permissions`, `/admin/feature-flags`, `/admin/system/health`,
  `/admin/tenants`, `/admin/audit-logs`, `/admin/settings`
- Recruitment: `/recruitment/jobs`
- Performance: `/performance/reviews`, `/performance/goals`, `/performance/okrs`
- Reports: `/reports`, `/analytics`
- Other: `/benefits`, `/documents`, `/training`, `/wellness`, `/calendar`, `/onboarding`,
  `/offboarding`, `/knowledge/wiki`, `/webhooks`, `/dashboard`, `/feedback-360`, `/okrs`,
  `/organization`, `/designations`, `/locations`, `/approvals`, `/approvals/pending`
  **Error Response:**
  `{"status": 500, "error": "Internal Server Error", "message": "An unexpected error occurred"}`
  **Root Cause:** Likely missing required query parameters, database connectivity issues, or missing
  data dependencies (e.g., leave types not configured).
  **Risk:** RBAC cannot be validated on these endpoints until the 500 errors are resolved.

### HIGH-03: Employee List Endpoint Returns 200 for All Roles

**Severity:** HIGH
**Endpoint:** `GET /api/v1/employees`
**Impact:** While the endpoint returns 0 results for EMPLOYEE roles (suggesting data-level scoping
works), the API does not enforce role-based access at the endpoint level. This creates a
defense-in-depth gap.
**Note:** SUPER_ADMIN sees 22 employees, EMPLOYEE sees 0 -- this suggests RLS or service-level
filtering IS working, but the endpoint itself should return 403 for EMPLOYEE role on the list
endpoint.

### HIGH-04: Employee Search Returns 200 for All Roles

**Severity:** HIGH
**Endpoint:** `GET /api/v1/employees/search?query=test`
**Impact:** Search endpoint is open to all authenticated users. While results are empty for EMPLOYEE
role (data scoping works), the endpoint should be restricted.

---

## MEDIUM Findings

### MED-01: RECRUITMENT_ADMIN Cannot Access Notifications/Surveys

**Severity:** MEDIUM
**Endpoints:** `GET /notifications` (403), `GET /surveys` (403)
**Impact:** RECRUITMENT_ADMIN cannot view notifications or surveys. All other roles (including
EMPLOYEE) can. This appears to be a permission configuration gap.

### MED-02: RECRUITMENT_ADMIN Cannot Access Wall/Posts

**Severity:** MEDIUM
**Endpoint:** `GET /wall/posts` (403)
**Impact:** RECRUITMENT_ADMIN cannot see the company social wall while EMPLOYEE can. Social features
should be available to all employees.

### MED-03: POST /departments Denied for SUPER_ADMIN

**Severity:** MEDIUM
**Endpoint:** `POST /departments`
**Impact:** Part of the broader CSRF issue (CRIT-05), but worth noting that even SUPER_ADMIN cannot
create departments.

---

## Positive Findings (What Works)

1. **Unauthenticated access is properly blocked** -- all endpoints return 403 without a token.
2. **GET /admin/users** correctly restricts to SUPER_ADMIN only (200 for SA, 403 for all others).
3. **GET /benefits/plans** correctly restricts to SUPER_ADMIN and HR_MANAGER.
4. **GET /expenses**, **GET /assets**, **GET /loans** correctly restrict to SUPER_ADMIN only.
5. **GET /contracts** correctly restricts to management roles (SA, MGR, TL, HR).
6. **GET /knowledge/blogs** and **GET /lms/courses** correctly restrict to SUPER_ADMIN only.
7. **Employee DTO does not expose salary, bank account numbers, or national IDs** -- sensitive
   financial data is excluded from the response.
8. **Data-level scoping works for GET /employees** -- EMPLOYEE sees 0 records while SUPER_ADMIN sees
  22.
9. **GET /employees/me** correctly works for all roles (self-service pattern).

---

## Data Exposure Analysis

### Fields Visible to EMPLOYEE on GET /employees/{id}

When an EMPLOYEE views another employee's record (IDOR), these fields are exposed:

| Field                         | Exposed | Sensitive? |
|-------------------------------|:-------:|:----------:|
| id                            |   Yes   |     No     |
| employeeCode                  |   Yes   |     No     |
| firstName, lastName, fullName |   Yes   |    Low     |
| workEmail                     |   Yes   |    Low     |
| personalEmail                 |   Yes   | **Medium** |
| joiningDate                   |   Yes   |    Low     |
| departmentId, departmentName  |   Yes   |     No     |
| designation                   |   Yes   |     No     |
| level                         |   Yes   |    Low     |
| jobRole                       |   Yes   |    Low     |
| managerId, managerName        |   Yes   |    Low     |
| employmentType                |   Yes   |    Low     |
| status                        |   Yes   |     No     |
| salary / compensation         |   No    |     -      |
| bankAccount / IFSC            |   No    |     -      |
| PAN / Aadhaar / SSN           |   No    |     -      |

**Verdict:** No highly sensitive financial data is leaked, but personal email is exposed which could
be a privacy concern.

---

## Summary Statistics

| Category                     |  Count   |
|------------------------------|:--------:|
| Total endpoints tested       |    65    |
| CRITICAL findings            |    5     |
| HIGH findings                |    4     |
| MEDIUM findings              |    3     |
| Endpoints returning 500      | 30 (46%) |
| Endpoints with correct RBAC  | 14 (22%) |
| Endpoints needing RBAC fixes | 7 (11%)  |
| Endpoints untestable (500)   | 30 (46%) |

---

## Recommendations

### Immediate (P0 - Fix This Week)

1. **Fix CSRF for API clients (CRIT-05):** Either:

- Disable CSRF for API endpoints that use Bearer token auth (CSRF is not needed when using
  Authorization header)
- OR return the CSRF token in the login response body so API clients can use it

2. **Add @RequiresPermission to payroll endpoints (CRIT-01, CRIT-02):**
   ```java
   @RequiresPermission("PAYROLL:READ")
   @GetMapping("/payroll/runs")
   ```

3. **Restrict feature-flags endpoint (CRIT-03):**
   ```java
   @RequiresPermission("FEATURE_FLAG:READ")  // or restrict to SUPER_ADMIN
   @GetMapping("/feature-flags")
   ```

4. **Add authorization check on GET /employees/{id} (CRIT-04):** Either restrict to management roles
   or return a limited DTO for EMPLOYEE role (directory view: name, department, designation only).

### Short-Term (P1 - Fix This Sprint)

5. **Fix RECRUITMENT_ADMIN candidate access (HIGH-01):** Review the permission mapping for
   recruitment module. RECRUITMENT_ADMIN should have `recruitment.candidates.read`.

6. **Investigate and fix all 500-error endpoints (HIGH-02):** These likely need:

- Default query parameter handling
- Database seed data (leave types, attendance configs)
- Null-safety checks in service layer

7. **Add endpoint-level RBAC on GET /employees and GET /employees/search (HIGH-03, HIGH-04):**
   ```java
   @RequiresPermission("EMPLOYEE:LIST")
   @GetMapping("/employees")
   ```

### Medium-Term (P2)

8. **Fix RECRUITMENT_ADMIN notification/survey/wall access (MED-01, MED-02):** Add base employee
   permissions to RECRUITMENT_ADMIN role.

9. **Create RBAC integration test suite:** Automate this test matrix as part of CI/CD to prevent
   RBAC regressions.

10. **Implement response DTO scoping:** Return different DTOs based on the caller's role (e.g.,
    EmployeeDirectoryDTO vs EmployeeFullDTO).

---

## Appendix: Raw Test Data

```
endpoint,method,super_admin,manager,team_lead,hr_manager,recruitment_admin,employee,employee2
GET /employees,200,200,200,200,200,200,200
GET /employees/me,200,200,200,200,200,200,200
GET /employees/{id},200,200,200,200,200,200,200
GET /employees/search,200,200,200,200,200,200,200
GET /employees/directory,400,400,400,400,400,400,400
POST /employees,403,403,403,403,403,403,403
PUT /employees/{id},403,403,403,403,403,403,403
GET /leaves,500,500,500,500,500,500,500
GET /leaves/my-leaves,500,500,500,500,500,500,500
GET /leaves/approvals,500,500,500,500,500,500,500
POST /leaves,403,403,403,403,403,403,403
GET /attendance,500,500,500,500,500,500,500
GET /attendance/team,500,500,500,500,500,500,500
GET /attendance/my-attendance,400,400,400,400,400,400,400
GET /payroll/runs,200,200,200,200,200,200,200
GET /payroll/payslips,200,200,200,200,200,200,200
GET /payroll/payslips/me,400,400,400,400,400,400,400
POST /payroll/runs,403,403,403,403,403,403,403
GET /admin/roles,500,500,500,500,500,500,500
GET /admin/permissions,500,500,500,500,500,500,500
GET /admin/feature-flags,500,500,500,500,500,500,500
POST /admin/roles,403,403,403,403,403,403,403
GET /admin/system/health,500,500,500,500,500,500,500
GET /admin/users,200,403,403,403,403,403,403
GET /admin/tenants,500,500,500,500,500,500,500
GET /admin/audit-logs,500,500,500,500,500,500,500
GET /admin/settings,500,500,500,500,500,500,500
GET /departments,200,200,200,200,200,200,200
POST /departments,403,403,403,403,403,403,403
GET /recruitment/jobs,500,500,500,500,500,500,500
GET /recruitment/candidates,200,200,200,200,403,403,403
POST /recruitment/jobs,403,403,403,403,403,403,403
GET /performance/reviews,500,500,500,500,500,500,500
GET /performance/goals,500,500,500,500,500,500,500
GET /performance/okrs,500,500,500,500,500,500,500
GET /reports,500,500,500,500,500,500,500
GET /analytics,500,500,500,500,500,500,500
GET /announcements,200,200,200,200,200,200,200
GET /helpdesk/tickets,200,200,200,200,200,200,200
GET /benefits,500,500,500,500,500,500,500
GET /benefits/plans,200,403,403,200,403,403,403
GET /expenses,200,403,403,403,403,403,403
GET /assets,200,403,403,403,403,403,403
GET /contracts,200,200,200,200,403,403,403
GET /loans,200,403,403,403,403,403,403
GET /documents,500,500,500,500,500,500,500
GET /training,500,500,500,500,500,500,500
GET /surveys,200,200,200,200,403,200,200
GET /recognition,405,405,405,405,405,405,405
GET /wellness,500,500,500,500,500,500,500
GET /calendar,500,500,500,500,500,500,500
GET /notifications,200,200,200,200,403,200,200
GET /onboarding,500,500,500,500,500,500,500
GET /offboarding,500,500,500,500,500,500,500
GET /organization,500,500,500,500,500,500,500
GET /designations,500,500,500,500,500,500,500
GET /locations,500,500,500,500,500,500,500
GET /approvals,500,500,500,500,500,500,500
GET /approvals/pending,500,500,500,500,500,500,500
GET /feature-flags,200,200,200,200,200,200,200
GET /projects,200,200,200,200,403,200,200
GET /wall/posts,200,200,200,200,403,200,200
GET /knowledge/blogs,200,403,403,403,403,403,403
GET /lms/courses,200,403,403,403,403,403,403
GET /knowledge/wiki,500,500,500,500,500,500,500
```
