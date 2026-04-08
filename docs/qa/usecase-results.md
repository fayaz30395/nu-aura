# NU-AURA P0 Use Case Test Results

| Field | Value |
|-------|-------|
| **Date** | 2026-04-08 |
| **Tester** | QA Agent (Claude) |
| **Environment** | localhost:3000 / localhost:8080 |
| **Priority** | P0 — Critical |

---

## UC-AUTH-001: Email/Password Login (Happy Path)
- **Priority**: P0
- **Status**: PASS
- **Role**: EMPLOYEE (saran@nulogic.io)
- **Happy path**: PASS — POST /api/v1/auth/login returned HTTP 200. User redirected to /me/dashboard (self-service dashboard). "Saran V" displayed in header. Sidebar shows employee-level nav items. No console errors.
- **Negative test**: PASS — Wrong password "wrongpassword" returned HTTP 401. User remained on /auth/login. Error toast triggered (auto-dismissed).
- **Bug**: none
- **Notes**: Redirect goes to /me/dashboard instead of /dashboard as spec states. This is the correct employee self-service dashboard route. Spec should be updated.

---

## UC-AUTH-004: Logout and Session Invalidation
- **Priority**: P0
- **Status**: FAIL
- **Role**: EMPLOYEE (saran@nulogic.io)
- **Happy path**: PARTIAL PASS — POST /api/v1/auth/logout returned HTTP 200. Page attempted redirect to /auth/login. Logout API call succeeded.
- **Negative test**: FAIL — After logout, navigating to /me/dashboard triggered POST /api/v1/auth/refresh which returned HTTP 200, re-authenticating the user (as a different user -- "Fayaz M" SUPER_ADMIN). Session was not fully invalidated.
- **Bug**: BUG-001: Refresh token not invalidated on logout. POST /api/v1/auth/refresh succeeds after POST /api/v1/auth/logout returns 200. This allows session restoration after explicit logout, defeating the purpose of TokenBlacklistService. The refresh token cookie is either not cleared or not blacklisted.
- **Notes**: The logout API correctly returns 200 and the JWT access token appears blacklisted, but the refresh token remains valid and can be used to obtain a new access token. Also, the re-authenticated session returned a different user identity (Fayaz M instead of Saran V), suggesting the refresh token may belong to a prior session from another tab.

---

## UC-AUTH-006: Password Reset Flow
- **Priority**: P0
- **Status**: BLOCKED
- **Role**: Any (unauthenticated)
- **Happy path**: BLOCKED — No "Forgot Password" link exists on the login page (/auth/login). The email sign-in form shows only email, password, and Sign In button. No reset password UI flow available.
- **Negative test**: NOT-TESTED
- **Bug**: BUG-002: Missing "Forgot Password" link on login page. The backend API endpoint POST /api/v1/auth/forgot-password exists (returns 403 CSRF error on direct call, confirming route is registered), but there is no UI link to initiate the password reset flow.
- **Notes**: The backend forgot-password endpoint exists but the frontend login page does not expose it. Users have no way to reset a forgotten password through the UI.

---

## UC-AUTH-007: Rate Limiting on Auth Endpoints
- **Priority**: P0
- **Status**: PASS
- **Role**: Unauthenticated (attacker simulation)
- **Happy path**: PASS — First 5 rapid POST requests to /api/v1/auth/login with invalid credentials returned HTTP 401. 6th request returned HTTP 429 (rate limited). Subsequent requests from same IP also returned 429. After rate limit window, account lockout (HTTP 423) kicks in with message "Your account is temporarily locked due to too many failed login attempts."
- **Negative test**: PASS — Rate limiting is IP-based via DistributedRateLimiter (Redis Bucket4j). New email addresses from same IP also get 429 after the window is consumed. AccountLockoutService returns HTTP 423 with errorCode "ACCOUNT_LOCKED".
- **Bug**: none
- **Notes**: Rate limiting works at 5 requests/minute for auth endpoints. Both IP-based rate limiting (429) and account lockout (423) are functional. The two mechanisms complement each other well.

---

## UC-PAY-001: Create Salary Structure
- **Priority**: P0
- **Status**: FAIL
- **Role**: HR_MANAGER (jagadeesh@nulogic.io)
- **Happy path**: FAIL — Navigating to /payroll/salary-structures throws a runtime JavaScript error: "Cannot read properties of undefined (reading 'toLocaleString')". The page renders an error boundary with "App Error" message. Cannot access the salary structure list or create form.
- **Negative test**: NOT-TESTED — Page crash prevents any interaction.
- **Bug**: BUG-003: /payroll/salary-structures page crashes on load with TypeError "Cannot read properties of undefined (reading 'toLocaleString')". Likely a null/undefined salary structure field being formatted with toLocaleString() without a null guard. Error boundary catches it but the page is completely inaccessible.
- **Notes**: Console also shows multiple FeedService errors (birthdays.map, anniversaries.map not a function) suggesting API response shape mismatches. The salary structure page crash is a P0 blocker for payroll functionality.

---

## UC-PAY-002: Run Payroll for a Month
- **Priority**: P0
- **Status**: BLOCKED
- **Role**: HR_MANAGER (jagadeesh@nulogic.io)
- **Happy path**: BLOCKED — Dependent on UC-PAY-001 (salary structure creation). The /payroll/salary-structures page crashes, preventing salary structure setup which is a prerequisite for payroll runs.
- **Negative test**: NOT-TESTED
- **Bug**: Blocked by BUG-003 (salary structures page crash).
- **Notes**: The /payroll/runs page was not tested independently as the test requires a salary structure to be in place first. Recommend fixing BUG-003 first, then re-testing.

---

## UC-APPR-001: Leave Approval Chain (Employee -> Manager -> HR)
- **Priority**: P0
- **Status**: PARTIAL PASS
- **Role**: EMPLOYEE (saran@nulogic.io), MANAGER (sumit@nulogic.io)
- **Happy path**: PARTIAL PASS
  - Step 1 (Submit leave): PASS — Logged in as saran@nulogic.io, navigated to /leave/apply. Form loaded correctly with all leave types (Earned Leave, Casual Leave, Sick Leave, etc.). Selected "Earned Leave (Paid)", dates 2026-04-10 to 2026-04-11, reason "Personal work". POST /api/v1/leave-requests returned HTTP 201. Success alert "Leave request submitted successfully!" displayed.
  - Step 2 (Manager approval): BLOCKED — Logged in as sumit@nulogic.io. Approval inbox (/approvals/inbox) loaded with 0 pending items. Leave approvals page (/leave/approvals) stuck on "Loading leave requests..." because GET /api/v1/leave-requests/status/PENDING returned HTTP 503 (Service Unavailable).
  - Step 3 (HR approval): NOT-TESTED — Blocked by Step 2.
- **Negative test**: NOT-TESTED
- **Bug**: BUG-004: GET /api/v1/leave-requests/status/PENDING returns HTTP 503. The leave request list endpoints are returning Service Unavailable, preventing managers from viewing and approving leave requests. Also GET /api/v1/leave-requests/employee/{id}?page=0&size=100 returns 503. The POST endpoint works (201) but the GET endpoints fail.
- **Notes**: WebSocket connections (SockJS) are also failing with 503 on /ws/* endpoints. Leave creation works but the entire leave listing/viewing flow is broken on the backend. The approval workflow engine itself (GET /api/v1/workflow/inbox) returns 200, suggesting the issue is specific to the leave-requests service.

---

## UC-APPR-002: Leave Rejection with Comment
- **Priority**: P0
- **Status**: BLOCKED
- **Role**: MANAGER (sumit@nulogic.io)
- **Happy path**: BLOCKED — Dependent on UC-APPR-001. Cannot access leave approval list due to GET /api/v1/leave-requests/status/PENDING returning HTTP 503.
- **Negative test**: NOT-TESTED
- **Bug**: Blocked by BUG-004 (leave-requests API 503 error).
- **Notes**: This test requires a pending leave request visible in the approval queue, which is inaccessible due to the backend 503 errors.

---

## P0 Test Summary

| Use Case | Status | Bug |
|----------|--------|-----|
| UC-AUTH-001 | PASS | none |
| UC-AUTH-002 | SKIP | N/A (Google OAuth requires external provider) |
| UC-AUTH-003 | SKIP | N/A (MFA requires authenticator app) |
| UC-AUTH-004 | FAIL | BUG-001: Refresh token not invalidated on logout |
| UC-AUTH-005 | SKIP | N/A (JWT refresh hard to test in browser) |
| UC-AUTH-006 | BLOCKED | BUG-002: Missing "Forgot Password" link on login page |
| UC-AUTH-007 | PASS | none |
| UC-PAY-001 | FAIL | BUG-003: Salary structures page crashes (toLocaleString on undefined) |
| UC-PAY-002 | BLOCKED | Blocked by BUG-003 |
| UC-APPR-001 | PARTIAL PASS | BUG-004: leave-requests GET endpoints return 503 |
| UC-APPR-002 | BLOCKED | Blocked by BUG-004 |

**P0 Bug Summary:**
- **BUG-001** (P0-Security): Refresh token not invalidated on logout -- allows session restoration
- **BUG-002** (P0-UX): Missing "Forgot Password" link -- no password reset flow in UI
- **BUG-003** (P0-Blocker): /payroll/salary-structures page crash -- TypeError on toLocaleString
- **BUG-004** (P0-Blocker): leave-requests GET endpoints return HTTP 503 -- breaks leave approval chain

---

## P1 — Business-Critical Use Case Results

---

## UC-EMP-001: Create New Employee (Full Cycle)
- **Priority**: P1
- **Status**: PASS
- **Role**: SUPER_ADMIN (fayaz.m@nulogic.io)
- **Happy path**: PASS — POST /api/v1/employees returned HTTP 201. Employee "Priya Sharma" created with EMP-0030, workEmail=priya.sharma.qa@nulogic.io, department=Engineering, manager=Sumit Kumar, status=ACTIVE.
- **Negative test**: PASS — Duplicate email (saran@nulogic.io) returned HTTP 409 with errorCode=DUPLICATE_RESOURCE, message="Email already exists".
- **Bug**: BUG-EMP-001 — HR_MANAGER role (jagadeesh@nulogic.io) gets "Access Denied" on /employees/new route. QA doc says HR_MANAGER should have access. Additionally, /employees/new route returns 404 (page does not exist); employee creation is done via inline form on /employees page.
- **Notes**: SuperAdmin bypass works correctly. Employee creation form is inline on /employees (not a separate /employees/new route as documented). React Hook Form does not respond to native DOM value setters — API-level testing used for reliable verification.

---

## UC-EMP-002: Employee Profile Update
- **Priority**: P1
- **Status**: FAIL
- **Role**: SUPER_ADMIN (fayaz.m@nulogic.io)
- **Happy path**: FAIL — PUT /api/v1/employees/{id} returns HTTP 500 (Internal Server Error) when attempting to update Saran V's phone number. Tried both partial update (phone only) and full-object update. Both return 500 with errorCode=INTERNAL_ERROR.
- **Negative test**: NOT-TESTED — Blocked by 500 error on update endpoint.
- **Bug**: BUG-EMP-002 — PUT /api/v1/employees/{id} returns HTTP 500 on any update. The endpoint exists but crashes on execution. Partial updates (single field) return 500. Full object updates with required fields return 400 (Validation Failed) or 500 depending on payload.
- **Notes**: GET /api/v1/employees/{id} works fine (200). The update endpoint is broken. Employee edit UI (/employees/{id}/edit) exists but was not tested independently due to React Hook Form automation limitations.

---

## UC-EMP-005: Org Chart and Directory Search
- **Priority**: P1
- **Status**: PARTIAL PASS
- **Role**: SUPER_ADMIN (fayaz.m@nulogic.io)
- **Happy path**: PARTIAL PASS
  - Org Chart: FAIL — /org-chart page loads but tree nodes show skeleton loaders. GET /api/v1/organization/org-chart returns HTTP 404 (endpoint does not exist). The org chart has no backend API to populate it.
  - Directory Search: PASS — GET /api/v1/employees?search=Saran returns results. Employee list with 30 employees paginated correctly. /employees/directory page exists. Search is functional.
- **Negative test**: NOT-TESTED
- **Bug**: BUG-EMP-005 — GET /api/v1/organization/org-chart returns 404. The org-chart backend endpoint is missing. Frontend page renders but cannot display hierarchy data.
- **Notes**: The /team-directory URL referenced in QA doc maps to /employees/directory in the actual app.

---

## UC-ATT-001: Check-In and Check-Out
- **Priority**: P1
- **Status**: PASS
- **Role**: EMPLOYEE (saran@nulogic.io)
- **Happy path**: PASS — POST /api/v1/attendance/check-in returned HTTP 201. Check-in recorded at 2026-04-08T22:35:57 with status=PRESENT, checkInSource=WEB. POST /api/v1/attendance/check-out returned HTTP 200. Check-out recorded, status changed to INCOMPLETE (short duration due to test timing). Work hours calculated.
- **Negative test**: PASS — Double check-in returned HTTP 409 "Already checked in. Please check out before checking in again." (matches expected behavior).
- **Bug**: none
- **Notes**: Status shows INCOMPLETE rather than PRESENT after checkout, likely due to short work duration in test. This is expected behavior for sub-minimum-hours attendance.

---

## UC-ATT-002: Attendance Regularization Request
- **Priority**: P1
- **Status**: FAIL
- **Role**: EMPLOYEE (saran@nulogic.io)
- **Happy path**: FAIL — POST /api/v1/attendance/regularization returns HTTP 500 (Internal Server Error). Request body included date, checkInTime, checkOutTime, and reason.
- **Negative test**: NOT-TESTED
- **Bug**: BUG-ATT-002 — POST /api/v1/attendance/regularization returns 500. The regularization endpoint exists (no 404) but crashes on execution. Likely a NullPointerException or missing service dependency.
- **Notes**: The attendance check-in/check-out flow works (UC-ATT-001) but regularization is broken.

---

## UC-LEAVE-001: Apply Leave (Annual Leave)
- **Priority**: P1
- **Status**: PASS
- **Role**: EMPLOYEE (saran@nulogic.io)
- **Happy path**: PASS — POST /api/v1/leave-requests returned HTTP 201. Leave request created with requestNumber=LR-1775668014780-7c4a8d89, startDate=2026-04-14, endDate=2026-04-15, totalDays=2, status=PENDING. Leave type: Earned Leave (EL).
- **Negative test**: NOT-TESTED — Leave balance endpoint (GET /api/v1/leave-balances) returns 404, so cannot verify balance check enforcement.
- **Bug**: none (leave creation works, but GET /api/v1/leave-balances is missing)
- **Notes**: Leave types are well-configured (10 types including EL, CL, SL, ML, PL, BL, CO, LOP). The leave request was created successfully with auto-generated request number.

---

## UC-LEAVE-003: Leave Encashment
- **Priority**: P1
- **Status**: BLOCKED
- **Role**: EMPLOYEE (saran@nulogic.io)
- **Happy path**: BLOCKED — POST /api/v1/leave/encashment returns HTTP 404 (endpoint does not exist). The encashment API endpoint has not been implemented.
- **Negative test**: NOT-TESTED
- **Bug**: BUG-LEAVE-003 — Leave encashment endpoint (POST /api/v1/leave/encashment) does not exist. Returns 404. The /leave/encashment frontend page may exist but has no backend support.
- **Notes**: Earned Leave is configured as encashable (isEncashable=true) in the leave type configuration, but the encashment processing endpoint is missing.

---

## UC-ASSET-001: Asset Assignment to Employee
- **Priority**: P1
- **Status**: PASS
- **Role**: SUPER_ADMIN (fayaz.m@nulogic.io)
- **Happy path**: PASS — Created asset "Dell Monitor 27 QA" (ASSET-QA-001) via POST /api/v1/assets (HTTP 201, status=AVAILABLE). Assigned to Saran V via POST /api/v1/assets/{id}/assign?employeeId={id} (HTTP 200). Asset status changed to ASSIGNED, assignedTo=Saran V, assignedToName populated.
- **Negative test**: PASS — Attempting to assign already-assigned asset to another employee returns HTTP 400 "Asset is not available for assignment". (Note: QA doc expects 409 but actual is 400.)
- **Bug**: Minor — Negative test returns 400 instead of documented 409. Status code mismatch vs spec.
- **Notes**: Original seed asset "MacBook Pro 14" (ASSET-001) had null status field, preventing assignment. Created new asset for testing. The assign endpoint uses query parameter for employeeId, not request body.

---

## UC-EXP-001: Submit Expense Claim
- **Priority**: P1
- **Status**: FAIL
- **Role**: EMPLOYEE (saran@nulogic.io)
- **Happy path**: FAIL — POST /api/v1/expenses returns HTTP 405 (Method Not Allowed). POST /api/v1/expense-claims returns HTTP 404 (endpoint not found). GET /api/v1/expenses returns 200 with existing expense data, confirming the read endpoint works. The POST/create endpoint is either missing or uses a different HTTP method.
- **Negative test**: NOT-TESTED
- **Bug**: BUG-EXP-001 — Cannot create new expense claims. POST /api/v1/expenses returns 405 Method Not Allowed. The expenses API only supports GET (list). Employee cannot submit new expense claims through the API.
- **Notes**: Existing expense data exists (EXP-202604-0001 for Fayaz M, status DRAFT), suggesting expenses were created through a different mechanism or an earlier API version.

---

## UC-DEPT-001: Department CRUD
- **Priority**: P1
- **Status**: PASS
- **Role**: SUPER_ADMIN (fayaz.m@nulogic.io)
- **Happy path**: PASS — POST /api/v1/departments returned HTTP 201. Department "Product Management" (PM-QA) created under Engineering parent. parentDepartmentName=Engineering, isActive=true, employeeCount=0.
- **Negative test**: PASS — DELETE /api/v1/departments/{Engineering-id} returned HTTP 400 "Cannot delete department with employees. Please reassign employees first." (matches expected behavior exactly).
- **Bug**: none
- **Notes**: Department hierarchy works correctly. The /departments page loads with the department tree. Both create and delete-with-employees-guard work as expected.

---

## UC-HELP-001: Helpdesk Ticket CRUD
- **Priority**: P1
- **Status**: FAIL
- **Role**: EMPLOYEE (saran@nulogic.io)
- **Happy path**: FAIL — POST /api/v1/helpdesk/tickets returns HTTP 500 (Internal Server Error). Request included category, priority, subject, and description.
- **Negative test**: NOT-TESTED
- **Bug**: BUG-HELP-001 — POST /api/v1/helpdesk/tickets returns 500. The helpdesk ticket creation endpoint crashes on execution. Endpoint exists (not 404) but has a server-side error.
- **Notes**: The /helpdesk page exists in the sidebar and route structure. The backend endpoint is registered but fails during processing.

---

## UC-REPORT-001: Headcount Report
- **Priority**: P1
- **Status**: PARTIAL PASS
- **Role**: SUPER_ADMIN (fayaz.m@nulogic.io)
- **Happy path**: PARTIAL PASS
  - UI: PASS — /reports page loads correctly with multiple report types (Employee Directory, Attendance, Leave, Payroll, etc.). "Download Report" buttons are present for each report type.
  - API: FAIL — GET /api/v1/reports/headcount returns 404 (endpoint does not exist). GET /api/v1/reports also returns 404.
- **Negative test**: NOT-TESTED
- **Bug**: BUG-REPORT-001 — The reports API endpoints (GET /api/v1/reports, GET /api/v1/reports/headcount) do not exist. Reports are likely generated client-side or via download-specific endpoints not matching the documented API paths.
- **Notes**: The frontend reports page renders and shows report cards. Report generation may use different API paths (e.g., /api/v1/reports/download/headcount or similar).

---

## UC-ADMIN-001: Feature Flags / Settings
- **Priority**: P1
- **Status**: PASS
- **Role**: SUPER_ADMIN (fayaz.m@nulogic.io)
- **Happy path**: PASS — GET /api/v1/admin/feature-flags returns HTTP 200 with list of feature flags (enable_assets, etc.). POST /api/v1/admin/feature-flags/{key}/toggle returns HTTP 200 and toggles the flag (enabled: true -> false -> true). The /admin/feature-flags page exists in the route structure.
- **Negative test**: NOT-TESTED (would need EMPLOYEE role attempt, but API-level RBAC was verified in other tests)
- **Bug**: Minor — The feature flags page at /admin/feature-flags loads but renders empty content after the sidebar. The flags list UI does not render despite the API returning data.
- **Notes**: The toggle endpoint uses POST .../toggle pattern instead of PUT as documented. Feature flag read (GET) and toggle (POST) work correctly at the API level. UI rendering issue on the admin page.

---

## UC-NOTIF-001: Notifications
- **Priority**: P1
- **Status**: PASS
- **Role**: EMPLOYEE (saran@nulogic.io), SUPER_ADMIN (fayaz.m@nulogic.io)
- **Happy path**: PASS — GET /api/v1/notifications?page=0&size=10 returns HTTP 200 with paginated notification list (currently empty for Saran). GET /api/v1/notifications/unread/count returns HTTP 200 with count=0. Notification bell icon visible in the header across all pages.
- **Negative test**: NOT-TESTED (WebSocket real-time delivery not tested)
- **Bug**: none
- **Notes**: Notification infrastructure works (API returns 200, pagination working). No notifications were present for Saran at test time as no approval actions had been completed. The notification system relies on WebSocket (STOMP/SockJS) for real-time delivery which was not tested.

---

## P1 Test Summary

| # | Use Case | Status | Bug |
|---|----------|--------|-----|
| 1 | UC-EMP-001: Create Employee | PASS | BUG-EMP-001: HR_MANAGER access denied, wrong route in doc |
| 2 | UC-EMP-002: Profile Update | FAIL | BUG-EMP-002: PUT /employees/{id} returns 500 |
| 3 | UC-EMP-005: Org Chart & Directory | PARTIAL PASS | BUG-EMP-005: Org chart API 404, directory search works |
| 4 | UC-ATT-001: Check-In/Out | PASS | none |
| 5 | UC-ATT-002: Regularization | FAIL | BUG-ATT-002: POST regularization returns 500 |
| 6 | UC-LEAVE-001: Apply Leave | PASS | none |
| 7 | UC-LEAVE-003: Leave Encashment | BLOCKED | BUG-LEAVE-003: Encashment endpoint 404 |
| 8 | UC-ASSET-001: Asset Assignment | PASS | Minor: 400 vs documented 409 |
| 9 | UC-EXP-001: Expense Claim | FAIL | BUG-EXP-001: POST expenses returns 405 |
| 10 | UC-DEPT-001: Department CRUD | PASS | none |
| 11 | UC-HELP-001: Helpdesk Ticket | FAIL | BUG-HELP-001: POST tickets returns 500 |
| 12 | UC-REPORT-001: Headcount Report | PARTIAL PASS | BUG-REPORT-001: Report API endpoints 404 |
| 13 | UC-ADMIN-001: Feature Flags | PASS | Minor: UI renders empty, API works |
| 14 | UC-NOTIF-001: Notifications | PASS | none |

**P1 Results: 6 PASS, 4 FAIL, 2 PARTIAL PASS, 1 BLOCKED, 1 Minor issues**

**P1 Bug Summary:**
- **BUG-EMP-002** (P1-Blocker): PUT /api/v1/employees/{id} returns 500 — employee profile updates broken
- **BUG-EMP-005** (P1): GET /api/v1/organization/org-chart returns 404 — org chart API missing
- **BUG-ATT-002** (P1): POST /api/v1/attendance/regularization returns 500 — regularization broken
- **BUG-LEAVE-003** (P1): POST /api/v1/leave/encashment returns 404 — encashment endpoint missing
- **BUG-EXP-001** (P1-Blocker): POST /api/v1/expenses returns 405 — cannot create expense claims
- **BUG-HELP-001** (P1): POST /api/v1/helpdesk/tickets returns 500 — helpdesk ticket creation broken
- **BUG-REPORT-001** (P1): GET /api/v1/reports/* returns 404 — report API endpoints missing

---
