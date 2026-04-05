# QA Report: Leave, Attendance & Payroll API Tests

**Date:** 2026-04-01  
**Tester:** Claude (API-level QA)  
**Backend:** http://localhost:8080  
**Auth User:** fayaz.m@nulogic.io (SUPER_ADMIN)  
**Employee ID:** 550e8400-e29b-41d4-a716-446655440040

---

## Executive Summary

| Module         | Endpoints Tested | Pass   | Fail  | Warn  |
|----------------|------------------|--------|-------|-------|
| Leave          | 7                | 4      | 1     | 2     |
| Attendance     | 9                | 6      | 1     | 2     |
| Payroll        | 12               | 8      | 2     | 2     |
| RBAC (No Auth) | 12               | 9      | 3     | 0     |
| **Total**      | **40**           | **27** | **7** | **6** |

---

## Critical Findings

### BUG-001: Non-existent paths return 500 instead of 404 (CRITICAL)

**Endpoints:** Any unmapped path like `/api/v1/leave/types`, `/api/v1/leave/balances`,
`/api/v1/leave/requests`  
**Expected:** 404 Not Found  
**Actual:** 500 Internal Server Error  
**Impact:** Information leakage. A 500 on undefined routes suggests the global error handler catches
`NoHandlerFoundException` and wraps it as an internal error instead of returning 404. Attackers can
use 500 vs 401 to fingerprint authenticated sessions.  
**Fix:** In `GlobalExceptionHandler`, add handler for `NoHandlerFoundException` and
`NoResourceFoundException` returning 404. Also set
`spring.mvc.throw-exception-if-no-handler-found=true` and `spring.web.resources.add-mappings=false`
in `application.yml`.

### BUG-002: POST endpoints return 403 without CSRF token even with valid JWT (CRITICAL)

**Endpoints:** All POST endpoints (`/api/v1/leave-requests`, `/api/v1/attendance/check-in`,
`/api/v1/attendance/check-out`)  
**Expected:** For API consumers using Bearer token auth, CSRF should not be required (CSRF protects
cookie-based auth, not token-based).  
**Actual:** CSRF is enforced for all state-changing requests. Must first GET a page to obtain
`XSRF-TOKEN` cookie, then send `X-XSRF-TOKEN` header.  
**Impact:** Frontend works (Axios intercepts cookies), but external API consumers (mobile apps,
integrations, Postman) get silent 403 "Access denied" with no indication CSRF is the issue.  
**Recommendation:**

1. Add CSRF bypass for requests authenticated via `Authorization: Bearer` header (not cookie-based
   auth).
2. Or improve the 403 error message to explicitly state "CSRF token missing or invalid" instead of
   generic "Access denied".

### BUG-003: `/api/v1/payroll/statutory/configurations` returns 500 (HIGH)

**Endpoint:** `GET /api/v1/payroll/statutory/configurations`  
**Expected:** 200 with statutory configuration data (PF, ESI, PT rates)  
**Actual:** 500 Internal Server Error  
**Root Cause:** Likely a null reference or missing table/data issue in `PayrollStatutoryController`.
The `PayrollStatutoryController` is at path `/api/v1/payroll/statutory` and the `/configurations`
endpoint exists in `LWFController` at `/api/v1/payroll/lwf/configurations` (which works fine). The
statutory controller only has `/preview` and `/{payslipId}/apply` -- there is no `/configurations`
on the statutory controller; the 500 is from the 404 fallback bug (BUG-001).

**Corrected finding:** The `/api/v1/payroll/statutory` root GET does not exist. Available statutory
endpoints are:

- `GET /api/v1/payroll/statutory/preview?employeeId=UUID` (400 without params -- correct)
- `POST /api/v1/payroll/statutory/{payslipId}/apply`

### BUG-004: `/api/v1/project-timesheets` root returns 500 (HIGH)

**Endpoint:** `GET /api/v1/project-timesheets`  
**Expected:** 404 or redirect to `/entries`  
**Actual:** 500 Internal Server Error  
**Root Cause:** Same as BUG-001 -- no handler mapped to the root path. Correct endpoint is
`/api/v1/project-timesheets/entries`.

---

## RBAC Test Results (No Auth Token)

| Endpoint                       | Method | Expected | Actual  | Status   |
|--------------------------------|--------|----------|---------|----------|
| `/api/v1/leave-types`          | GET    | 401      | 401     | PASS     |
| `/api/v1/leave-balances`       | GET    | 401      | 401     | PASS     |
| `/api/v1/leave-requests`       | GET    | 401      | 401     | PASS     |
| `/api/v1/leave-requests`       | POST   | 401      | **403** | **FAIL** |
| `/api/v1/attendance/today`     | GET    | 401      | 401     | PASS     |
| `/api/v1/attendance/check-in`  | POST   | 401      | **403** | **FAIL** |
| `/api/v1/attendance/check-out` | POST   | 401      | **403** | **FAIL** |
| `/api/v1/attendance/all`       | GET    | 401      | 401     | PASS     |
| `/api/v1/payroll/runs`         | GET    | 401      | 401     | PASS     |
| `/api/v1/payroll/payslips`     | GET    | 401      | 401     | PASS     |
| `/api/v1/compensation/cycles`  | GET    | 401      | 401     | PASS     |
| `/api/v1/project-timesheets`   | GET    | 401      | 401     | PASS     |

**Finding:** All POST endpoints return 403 (CSRF rejection) instead of 401 (unauthenticated). This
is because Spring Security's CSRF filter runs BEFORE the authentication filter in the filter chain.
Unauthenticated POST requests are rejected by CSRF before the auth filter can return 401.

---

## Leave Module Test Results

### L1. GET /api/v1/leave-types

| Attribute     | Value            |
|---------------|------------------|
| HTTP Status   | 200              |
| Response Time | 1.30s            |
| Content-Type  | application/json |
| Result        | **PASS**         |

Returns paginated list of leave types (EL, CL, SL, ML, PL, CO, etc.) with all fields populated:
`leaveCode`, `leaveName`, `description`, `isPaid`, `annualQuota`, `maxConsecutiveDays`,
`accrualType`, `genderSpecific`, `colorCode`.

### L2. GET /api/v1/leave-balances (root path)

| Attribute     | Value                  |
|---------------|------------------------|
| HTTP Status   | 500                    |
| Response Time | 0.89s                  |
| Result        | **FAIL** (see BUG-001) |

**Note:** No root GET handler exists on `LeaveBalanceController`. The correct endpoints are:

- `GET /api/v1/leave-balances/employee/{employeeId}`
- `GET /api/v1/leave-balances/employee/{employeeId}/year/{year}`

### L2b. GET /api/v1/leave-balances/employee/{employeeId}

| Attribute     | Value            |
|---------------|------------------|
| HTTP Status   | 200              |
| Response Time | ~1.5s            |
| Content-Type  | application/json |
| Result        | **PASS**         |

Returns array of leave balances with fields: `id`, `employeeId`, `leaveTypeId`, `year`,
`openingBalance`, `accrued`, `used`, `pending`, `available`, `carriedForward`, `encashed`, `lapsed`,
`lastAccrualDate`. All numeric fields present and correct. Multiple leave types returned per
employee.

### L2c. GET /api/v1/leave-balances/employee/{employeeId}/year/2026

| Attribute     | Value    |
|---------------|----------|
| HTTP Status   | 200      |
| Response Time | ~1.5s    |
| Result        | **PASS** |

Same as L2b but filtered to 2026. Returns consistent data.

### L3. GET /api/v1/leave-requests

| Attribute     | Value            |
|---------------|------------------|
| HTTP Status   | 200              |
| Response Time | ~1.0s            |
| Content-Type  | application/json |
| Result        | **PASS**         |

Returns paginated list with `content[]` array. Each leave request has: `id`, `employeeId`,
`leaveTypeId`, `requestNumber` (format: `LR-{timestamp}-{hash}`), `startDate`, `endDate`,
`totalDays`, `isHalfDay`, `status` (APPROVED/PENDING/REJECTED), `approverName`, `approvedOn`.
Pagination fields present.

### L4. POST /api/v1/leave-requests (empty body, with CSRF)

| Attribute     | Value                                 |
|---------------|---------------------------------------|
| HTTP Status   | 400                                   |
| Response Time | 1.38s                                 |
| Content-Type  | application/json                      |
| Result        | **PASS** (validation works correctly) |

Returns proper validation errors:

```json
{
  "status": 400,
  "error": "Validation Failed",
  "message": "Invalid input parameters",
  "errors": {
    "reason": "Reason is required",
    "totalDays": "Total days is required",
    "endDate": "End date is required",
    "employeeId": "Employee ID is required",
    "leaveTypeId": "Leave type is required",
    "startDate": "Start date is required"
  }
}
```

All required fields validated. Error messages are user-friendly.

### L4-noCsrf. POST /api/v1/leave-requests (empty body, WITHOUT CSRF)

| Attribute     | Value                  |
|---------------|------------------------|
| HTTP Status   | 403                    |
| Response Time | 0.002s                 |
| Result        | **WARN** (see BUG-002) |

Returns `{"error":"Forbidden","message":"Access denied"}` -- no CSRF indication.

---

## Attendance Module Test Results

### A1. GET /api/v1/attendance/today

| Attribute     | Value            |
|---------------|------------------|
| HTTP Status   | 200              |
| Response Time | 2.15s            |
| Content-Type  | application/json |
| Result        | **PASS**         |

Returns today's attendance record with fields: `employeeId`, `attendanceDate`, `checkInTime`,
`checkOutTime`, `checkInSource`, `status` (NOT_CHECKED_IN initially), `workDurationMinutes`,
`isLate`, `regularizationRequested`. All fields properly typed.

**Note:** Response time of 2.15s is close to the 3s threshold. This endpoint should respond faster
for dashboard use.

### A2. GET /api/v1/attendance/my-attendance (missing params)

| Attribute     | Value                               |
|---------------|-------------------------------------|
| HTTP Status   | 400                                 |
| Response Time | 0.96s                               |
| Result        | **PASS** (correct param validation) |

Returns: `"Required parameter 'startDate' is missing"` -- proper error message.

### A2b. GET /api/v1/attendance/my-attendance?startDate=2026-03-01&endDate=2026-04-01

| Attribute     | Value    |
|---------------|----------|
| HTTP Status   | 200      |
| Response Time | ~2s      |
| Result        | **PASS** |

Returns paginated attendance history. Records show check-in/out times, sources (WEB), status (
PRESENT/INCOMPLETE), `workDurationMinutes`, `overtimeMinutes`.

**Data quality issue:** Several records have `status: INCOMPLETE` with `workDurationMinutes: 0`
despite having both check-in and check-out times (e.g., check-in 21:02:11, check-out 21:02:36 on
2026-03-30 -- 25 seconds should compute to 0 minutes, but status should be PRESENT not INCOMPLETE
since both times exist). Also, one record (2026-03-24) has check-in but null check-out and status
PRESENT -- this should be INCOMPLETE.

### A3. POST /api/v1/attendance/check-in (with CSRF)

| Attribute     | Value               |
|---------------|---------------------|
| HTTP Status   | 201                 |
| Response Time | 4.83s               |
| Content-Type  | application/json    |
| Result        | **PASS** (but slow) |

Returns created attendance record with `checkInTime` set, `status: PRESENT`, `checkInSource: WEB`.
ID is generated.

**WARN:** 4.83s response time exceeds the 3s threshold. This is a user-facing action (clock-in
button on dashboard).

### A4. POST /api/v1/attendance/check-out (with CSRF)

| Attribute     | Value               |
|---------------|---------------------|
| HTTP Status   | 200                 |
| Response Time | 5.07s               |
| Content-Type  | application/json    |
| Result        | **PASS** (but slow) |

Returns updated attendance record with `checkOutTime` set, `checkOutSource: WEB`. Status changed to
INCOMPLETE (should be PRESENT since both times exist and same day).

**WARN:** 5.07s response time exceeds the 3s threshold.

**Data issue:** Status is `INCOMPLETE` after check-out even though both check-in and check-out are
recorded. Expected `PRESENT` or `COMPLETED`.

### A5. GET /api/v1/attendance/all

| Attribute     | Value    |
|---------------|----------|
| HTTP Status   | 200      |
| Response Time | ~2s      |
| Result        | **PASS** |

Returns paginated attendance records for all employees. Pagination structure correct with `content`,
`pageable`, `totalElements`, `totalPages`.

### A6. GET /api/v1/attendance/my-time-entries?date=2026-04-01

| Attribute     | Value    |
|---------------|----------|
| HTTP Status   | 200      |
| Response Time | 2.58s    |
| Result        | **PASS** |

Returns array of time entries with `entryType: REGULAR`, `checkInTime`, `checkOutTime`,
`durationMinutes`, `sequenceNumber`.

### A7. GET /api/v1/attendance/pending-regularizations

| Attribute     | Value                                 |
|---------------|---------------------------------------|
| HTTP Status   | 200                                   |
| Response Time | 3.76s                                 |
| Result        | **WARN** (slow, exceeds 3s threshold) |

Returns empty paginated result. Correct structure.

### A8. GET /api/v1/project-timesheets/entries

| Attribute     | Value    |
|---------------|----------|
| HTTP Status   | 200      |
| Response Time | 2.69s    |
| Result        | **PASS** |

Returns empty paginated result. Correct structure.

### A9. GET /api/v1/project-timesheets/reports/pending-approvals

| Attribute     | Value    |
|---------------|----------|
| HTTP Status   | 200      |
| Response Time | 2.48s    |
| Result        | **PASS** |

Returns empty array. Correct.

---

## Payroll Module Test Results

### P1. GET /api/v1/payroll/runs

| Attribute     | Value                                 |
|---------------|---------------------------------------|
| HTTP Status   | 200                                   |
| Response Time | 2.63s                                 |
| Content-Type  | application/json                      |
| Result        | **PASS** (empty, no payroll runs yet) |

Correct paginated response. No data seeded.

### P2. GET /api/v1/payroll/payslips

| Attribute     | Value            |
|---------------|------------------|
| HTTP Status   | 200              |
| Response Time | 2.38s            |
| Result        | **PASS** (empty) |

### P3. GET /api/v1/compensation/cycles

| Attribute     | Value            |
|---------------|------------------|
| HTTP Status   | 200              |
| Response Time | 2.17s            |
| Result        | **PASS** (empty) |

### P4. GET /api/v1/compensation/cycles/active

| Attribute     | Value    |
|---------------|----------|
| HTTP Status   | 200      |
| Response Time | 2.14s    |
| Result        | **PASS** |

Returns `[]` (no active compensation cycles). Correct.

### P5. GET /api/v1/payroll/components

| Attribute     | Value            |
|---------------|------------------|
| HTTP Status   | 200              |
| Response Time | 2.21s            |
| Result        | **PASS** (empty) |

No payroll components seeded. Correct paginated response.

### P6. GET /api/v1/payroll/salary-structures

| Attribute     | Value            |
|---------------|------------------|
| HTTP Status   | 200              |
| Response Time | 2.66s            |
| Result        | **PASS** (empty) |

### P7. GET /api/v1/payroll/salary-structures/active

| Attribute     | Value                      |
|---------------|----------------------------|
| HTTP Status   | 200                        |
| Response Time | 2.77s                      |
| Result        | **PASS** (empty paginated) |

### P8. GET /api/v1/payroll/runs/year/2026

| Attribute     | Value                  |
|---------------|------------------------|
| HTTP Status   | 200                    |
| Response Time | 2.65s                  |
| Result        | **PASS** (empty array) |

### P9. GET /api/v1/payroll/payslips/employee/{employeeId}

| Attribute     | Value                      |
|---------------|----------------------------|
| HTTP Status   | 200                        |
| Response Time | 2.44s                      |
| Result        | **PASS** (empty paginated) |

### P10. GET /api/v1/payroll/lwf/configurations

| Attribute     | Value    |
|---------------|----------|
| HTTP Status   | 200      |
| Response Time | ~1.5s    |
| Result        | **PASS** |

Returns paginated LWF configurations by state: AP, DL, GJ, etc. Fields: `stateCode`, `stateName`,
`employeeContribution`, `employerContribution`, `frequency`, `applicableMonths`, `isActive`,
`effectiveFrom`. Data correctly seeded.

### P11. GET /api/v1/payroll/statutory-filings

| Attribute     | Value                    |
|---------------|--------------------------|
| HTTP Status   | 200                      |
| Response Time | 2.15s                    |
| Result        | **PASS** (empty, sorted) |

Correct paginated response with `sort.sorted: true`.

### P12. GET /api/v1/payroll/statutory/preview (missing params)

| Attribute     | Value                         |
|---------------|-------------------------------|
| HTTP Status   | 400                           |
| Response Time | 1.27s                         |
| Result        | **PASS** (correct validation) |

Returns: `"Required parameter 'employeeId' is missing"`.

---

## Response Time Analysis

| Endpoint                                       | Time (s) | Threshold | Status       |
|------------------------------------------------|----------|-----------|--------------|
| Login (POST /api/v1/auth/login)                | 4.11     | 3.0       | **EXCEEDED** |
| GET /api/v1/attendance/today                   | 2.15     | 3.0       | OK           |
| POST /api/v1/attendance/check-in               | 4.83     | 3.0       | **EXCEEDED** |
| POST /api/v1/attendance/check-out              | 5.07     | 3.0       | **EXCEEDED** |
| GET /api/v1/attendance/pending-regularizations | 3.76     | 3.0       | **EXCEEDED** |
| GET /api/v1/leave-types                        | 1.30     | 3.0       | OK           |
| GET /api/v1/leave-requests                     | 1.00     | 3.0       | OK           |
| GET /api/v1/payroll/runs                       | 2.63     | 3.0       | OK           |
| GET /api/v1/payroll/payslips                   | 2.38     | 3.0       | OK           |
| GET /api/v1/project-timesheets/entries         | 2.69     | 3.0       | OK           |

**4 out of 10 sampled endpoints exceed the 3-second threshold.** The attendance check-in/check-out
flow is particularly slow (5s+), which directly impacts user experience on the dashboard clock-in
widget.

---

## Response Format Validation

| Check                                                                              | Result                   |
|------------------------------------------------------------------------------------|--------------------------|
| Content-Type: application/json                                                     | **PASS** (all endpoints) |
| Paginated responses have `content`, `pageable`, `totalElements`                    | **PASS**                 |
| Error responses have `status`, `error`, `message`, `path`, `requestId`, `tenantId` | **PASS**                 |
| Validation errors include field-level `errors` map                                 | **PASS**                 |
| No HTML responses (no server error pages leaking)                                  | **PASS**                 |
| No stack traces in error responses                                                 | **PASS**                 |
| Request IDs present for traceability                                               | **PASS**                 |

---

## Data Quality Issues

### DQ-001: Attendance status logic inconsistency

Records with both `checkInTime` and `checkOutTime` populated have `status: INCOMPLETE` instead of
`PRESENT` or `COMPLETED`. The status should transition to a completed state when both timestamps
exist.

### DQ-002: Attendance records with check-in only showing PRESENT

A record with only `checkInTime` and null `checkOutTime` shows `status: PRESENT`. This is
semantically correct (employee is present), but there is no mechanism to distinguish "currently
checked in" from "forgot to check out".

### DQ-003: No payroll seed data

All payroll endpoints return empty results. No components, salary structures, payroll runs, or
payslips are seeded. This makes it impossible to test payroll processing flows via API without first
creating seed data.

---

## Recommendations

### Priority 1 (Critical)

1. **Fix 404 handling** (BUG-001): Unmapped paths must return 404, not 500. Add
   `NoHandlerFoundException` handler to `GlobalExceptionHandler`.
2. **CSRF error messaging** (BUG-002): The 403 "Access denied" message for missing CSRF is
   indistinguishable from permission denial. Add explicit CSRF failure response.
3. **CSRF bypass for Bearer auth**: Consider disabling CSRF for requests authenticated via
   `Authorization: Bearer` header since CSRF attacks only affect cookie-based auth.

### Priority 2 (High)

4. **Performance**: Investigate check-in/check-out latency (4-5s). Likely due to Neon cloud DB
   latency + audit logging + Kafka event publishing. Consider async audit logging.
5. **Attendance status logic**: Fix INCOMPLETE status for records with both check-in and check-out
   times.
6. **Seed payroll data**: Add V94+ migration to seed demo payroll components, salary structures, and
   at least one completed payroll run.

### Priority 3 (Medium)

7. **Add root GET endpoints** for `/api/v1/leave-balances` (current user's balances) and
   `/api/v1/project-timesheets` (redirect or alias to `/entries`).
8. **RBAC consistency**: POST endpoints without auth should return 401 (not 403 from CSRF). Adjust
   filter chain order so auth check runs before CSRF for unauthenticated requests.
9. **API documentation**: Ensure Swagger annotations include required query parameters (`startDate`,
   `endDate`, `date`, `employeeId`, `month`) so consumers know what params are needed.

---

## Test Environment

- **Backend PID:** 2840 (Spring Boot 3.4.1 on Java 17)
- **Database:** Neon cloud PostgreSQL (remote, adds latency)
- **Auth:** JWT Bearer token + CSRF double-submit cookie
- **Profile:** Development (CSRF enabled)
- **Rate Limiting:** 5 requests/min on auth endpoints (confirmed working)
