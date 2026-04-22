# Bug Fix Verification Results

**Date**: 2026-04-09
**Tester**: Verification Agent (curl against localhost:8080)
**Server**: Running instance (note: may have stale build for some fixes)

---

## TEST-1: BUG-R02 -- Employee contract scoping

- **Status**: PASS
- **Evidence**:
  - EMPLOYEE (saran@nulogic.io): `GET /api/v1/contracts` returned HTTP 200, `totalElements: 1` (own
    contract: "Employment Contract - Saran V")
  - SUPER_ADMIN (fayaz.m@nulogic.io): `GET /api/v1/contracts` returned HTTP 200, `totalElements: 3`
  - Employee sees 1 record vs Super Admin sees 3 -- scoping is correct
- **Regression**: none

## TEST-2: BUG-R03 -- Employee offboarding scoping

- **Status**: FAIL
- **Evidence**:
  - EMPLOYEE (saran@nulogic.io): `GET /api/v1/offboarding` returned HTTP 200, `totalElements: 2` (
    includes own record for Saran V AND Bharath R's record)
  - SUPER_ADMIN (fayaz.m@nulogic.io): `GET /api/v1/offboarding` returned HTTP 200,
    `totalElements: 2`
  - Both roles see the same 2 records -- employee is NOT scoped to own offboarding only
- **Regression**: Data leak -- employee can see other employees' exit processes (Bharath R's
  resignation details, HR SPOC, manager, etc.)

## TEST-3: BUG-R04 -- Employee LMS access

- **Status**: FAIL
- **Evidence**:
  - EMPLOYEE (saran@nulogic.io): `GET /api/v1/lms/courses` returned HTTP 403:
    `"Insufficient permissions. Required any of: [TRAINING:VIEW, LMS:COURSE_VIEW]"`
  - EMPLOYEE (saran@nulogic.io): `GET /api/v1/lms/courses/published` returned HTTP 403
  - Also tested: `/api/v1/lms/my-courses` returned HTTP 403: `"Required any of: [LMS:COURSE_VIEW]"`
  - Employee has `TRAINING:VIEW` permission in JWT claims, but the LMS controller requires
    `LMS:COURSE_VIEW` (code constant `Permission.TRAINING_VIEW = "TRAINING:VIEW"` and
    `Permission.LMS_COURSE_VIEW = "LMS:COURSE_VIEW"`)
  - **Root cause**: Employee role has `TRAINING:VIEW` in DB but the interceptor is not matching it.
    Likely stale running build vs updated source -- OR the `TRAINING:VIEW` permission in the JWT is
    NOT being loaded into SecurityContext correctly.
- **Regression**: Employees cannot access any LMS content

## TEST-4: BUG-033 -- Employee own leave requests

- **Status**: FAIL
- **Evidence**:
  - EMPLOYEE (saran@nulogic.io): `GET /api/v1/leave-requests` returned HTTP 403:
    `"Insufficient permissions. Required any of: [LEAVE:VIEW_ALL, LEAVE:VIEW_TEAM]"`
  - The error message lists only 2 permissions, but the source code annotation at
    `LeaveRequestController.java:160-163` includes 3:
    `{LEAVE:VIEW_ALL, LEAVE:VIEW_TEAM, LEAVE:VIEW_SELF}`
  - The compiled class in `target/classes/` DOES contain all 3 permissions in the annotation
  - **Root cause**: Running server has a stale build -- the `@RequiresPermission` annotation on the
    `getLeaveRequests()` method was updated in source/compiled class to include `LEAVE:VIEW_SELF`,
    but the running JVM has the old class without it
  - Employee has `LEAVE:VIEW_SELF` permission but the running server's interceptor checks against
    the old 2-permission annotation
- **Regression**: Employees cannot view their own leave requests via the list endpoint

## TEST-5: BUG-031 -- CSRF cookie on login

- **Status**: PARTIAL PASS
- **Evidence**:
  - Login responses (POST `/api/v1/auth/login`) do NOT include the `XSRF-TOKEN` Set-Cookie header (
    tested with 3 different users)
  - However, subsequent authenticated requests (e.g., GET `/api/v1/leave-requests`) DO include
    `Set-Cookie: XSRF-TOKEN=...`
  - The `CsrfDoubleSubmitFilter` is registered in the Spring Security chain with
    `addFilterAfter(UsernamePasswordAuthenticationFilter)` -- it runs on all requests except
    webhooks/actuator/SAML
  - The filter's `shouldNotFilter()` does NOT skip auth endpoints (correct per BUG-031 fix)
  - The login endpoint may be short-circuiting the filter chain before the CSRF filter executes, OR
    the response is committed before the cookie is added
  - **Functional impact**: The frontend's first API call after login will receive the XSRF-TOKEN
    cookie, so the double-submit flow works for the 2nd+ request. The login POST itself is excluded
    from CSRF validation (`isValidationExcluded` returns true for `/api/v1/auth/login`), so this is
    acceptable.
- **Regression**: none -- the cookie is available before any state-changing request needs it

## TEST-6: BUG-034 -- Escalation name nesting

- **Status**: PASS
- **Evidence**:
  - File:
    `backend/src/main/java/com/hrms/application/workflow/service/ApprovalEscalationService.java`,
    line 241
  - Code: `.stepName("Escalated: " + step.getStepName().replaceAll("^(Escalated: )+", ""))`
  - The `replaceAll` regex strips any existing "Escalated: " prefixes before adding a single one,
    preventing nested "Escalated: Escalated: Escalated: ..." names
- **Regression**: none

---

## VERIFICATION SUMMARY

| Bug     | Description                  | Status       | Notes                                                                   |
|---------|------------------------------|--------------|-------------------------------------------------------------------------|
| BUG-R02 | Employee contract scoping    | PASS         | Employee sees 1/3 contracts -- correctly scoped                         |
| BUG-R03 | Employee offboarding scoping | FAIL         | Employee sees all 2 offboarding records, not just own                   |
| BUG-R04 | Employee LMS access          | FAIL         | 403 on all LMS endpoints despite TRAINING:VIEW permission               |
| BUG-033 | Employee own leave requests  | FAIL         | Stale build -- source fix correct but running server has old class      |
| BUG-031 | CSRF cookie on login         | PARTIAL PASS | Cookie not on login response but present on first authenticated request |
| BUG-034 | Escalation name nesting      | PASS         | replaceAll fix confirmed in source code                                 |

**Total: 2/6 PASS, 1/6 PARTIAL PASS, 3/6 FAIL**

### Recommended Actions

1. **BUG-R03**: Offboarding controller needs data scoping -- add `DataScopeService` filtering for
   EMPLOYEE role to return only own exit process
2. **BUG-R04**: Verify EMPLOYEE role has `LMS:COURSE_VIEW` permission in the database
   role_permissions table; if not, add it via Flyway migration
3. **BUG-033**: Restart the server with a fresh build (`mvn clean package` then restart) to pick up
   the `LEAVE:VIEW_SELF` annotation fix
4. **BUG-031**: Consider adding the XSRF-TOKEN cookie in the login response handler itself (
   AuthController) as a belt-and-suspenders approach, since the CSRF filter runs after
   authentication completes
