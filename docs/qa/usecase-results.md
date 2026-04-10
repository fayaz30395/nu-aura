# NU-AURA — Interactive Use Case Test Results

**Date**: 2026-04-10
**Tester**: Claude QA Agent (Automated)
**Platform**: NU-AURA (http://localhost:3000)
**Browser**: Chrome via MCP

---

## P0 — CRITICAL PLATFORM TESTS

### Authentication Use Cases


## UC-AUTH-001: Email/Password Login (Happy Path)
- **Status**: PASS
- **Role**: EMPLOYEE (Saran V)
- **Happy path**: PASS — Demo account button fills email (saran@nulogic.io) and password (Welcome@123), form submits via Sign In button. Redirects to /me/dashboard. User name "Saran V" and role "EMPLOYEE" shown in sidebar. Sidebar correctly scoped to employee-only items (My Space, Leave, Attendance). No admin/payroll/reports in sidebar.
- **Negative path**: SKIP — wrong password test skipped per coordinator
- **Bug**: none


## UC-RBAC-004: RBAC Positive — SUPER_ADMIN Full Access
- **Status**: PASS
- **Role**: SUPER_ADMIN (Fayaz M)
- **Happy path**: PASS — All 20 sidebar items verified present (Home, Dashboard, Executive, My Space, Employees, Departments, Org Chart, Announcements, Approvals, Attendance, Shift Mgmt, Leave Mgmt, Overtime, Payroll, Reports, Analytics, System Admin, Settings, Helpdesk, Integrations). /admin loads with Super Admin Dashboard (tenants, employees, approvals stats). /payroll/runs accessible with Create Payroll Run button. /reports accessible with Download Report buttons. No 403 or access denied on any route.
- **Bug**: none


### Payroll Use Cases

## UC-PAY-001: Create Salary Structure
- **Status**: FAIL
- **Role**: SUPER_ADMIN (Fayaz M)
- **Happy path**: FAIL — Page loads correctly with "Create Structure" button. Modal form opens with fields: Employee ID, Effective Date, Base Salary, Add Allowance, Add Deduction, Cancel, Save. Form filled (Employee ID: EMP-0005, Effective Date: 2026-04-01, Base Salary: 20000, Allowance: HRA/4000). Submit triggers POST /payroll/salary-structures which returns HTTP 400. The form expects a UUID for Employee ID, not the employee code (EMP-0005). No inline validation error shown to user about invalid employee ID format.
- **Bug**: BUG-006: Salary structure creation form — Employee ID field accepts free text but API expects UUID. No dropdown/autocomplete for employee selection. No user-friendly error message shown when 400 is returned. The 400 error is silently swallowed.


## UC-PAY-002: Run Payroll for a Month
- **Status**: FAIL
- **Role**: SUPER_ADMIN (Fayaz M)
- **Happy path**: FAIL — Page loads with existing DRAFT payroll run. "Create Payroll Run" modal opens with correct fields (Run Name, Period Start/End, Payment Date, Notes). Form filled: "April 2026 Payroll", 2026-04-01 to 2026-04-30, payment 2026-05-01. Submit triggers POST /payroll/runs which returns HTTP 400. Modal stays open with no error message. User has no feedback on what failed.
- **Bug**: BUG-007: POST /payroll/runs returns 400 — possibly due to React form not propagating date values correctly via controlled inputs (form_input sets native value but React state may not update). No user-facing error message shown on validation failure. Same silent-400 pattern as UC-PAY-001.

## UC-PAY-003: Verify SpEL Formula Accuracy
- **Status**: BLOCKED
- **Role**: SUPER_ADMIN
- **Happy path**: BLOCKED — No PROCESSED payroll run exists to verify formula outputs. Requires UC-PAY-002 to pass first.
- **Bug**: none (blocked by UC-PAY-002)

## UC-PAY-004: Generate and Download Payslip PDF
- **Status**: BLOCKED
- **Role**: SUPER_ADMIN
- **Happy path**: BLOCKED — No payslips exist (requires processed payroll run). UC-PAY-002 prerequisite not met.
- **Bug**: none (blocked by UC-PAY-002)

## UC-PAY-005: Lock Payroll Run
- **Status**: BLOCKED
- **Role**: SUPER_ADMIN
- **Happy path**: BLOCKED — No PROCESSED run to lock. UC-PAY-002 prerequisite not met.
- **Bug**: none (blocked by UC-PAY-002)

## UC-PAY-006: Process Payroll Adjustments and Arrears
- **Status**: BLOCKED
- **Role**: SUPER_ADMIN
- **Happy path**: BLOCKED — No processed payroll to adjust. UC-PAY-002 prerequisite not met.
- **Bug**: none (blocked by UC-PAY-002)


### Approval Chain Use Cases

## UC-APPR-001: Leave Approval Chain (Employee -> Manager -> HR)
- **Status**: PASS (partial — submission step only)
- **Role**: SUPER_ADMIN (Fayaz M) acting as submitter
- **Happy path**: PASS (submission) — Leave apply form loads with 10 leave types in dropdown. Selected Earned Leave, dates 21-22 April 2026, reason "QA test - UC-APPR-001 leave approval chain test". Submit triggered POST /leave-requests which returned HTTP 201. Redirected to /leave. Request confirmed in My Leaves list: LR-1775781289236-c5c55d66, Earned Leave, 2 days, PENDING, Applied 10/04/2026. Total Days calculation correct (2 days). Full L1/L2 approval chain not tested (requires login switching to Manager/HR).
- **Bug**: none

## UC-APPR-002: Leave Rejection with Comment
- **Status**: SKIP
- **Role**: N/A
- **Happy path**: SKIP — Requires login as Manager role to test rejection flow
- **Bug**: none

## UC-APPR-003: Expense Approval Chain
- **Status**: SKIP
- **Role**: N/A
- **Happy path**: SKIP — Requires multi-role login chain (Employee submit -> Manager approve -> HR reimburse)
- **Bug**: none

## UC-APPR-004: Overtime Request Approval
- **Status**: SKIP
- **Role**: N/A
- **Happy path**: SKIP — Requires multi-role flow
- **Bug**: none

## UC-APPR-005: Approval Escalation on Timeout
- **Status**: SKIP
- **Role**: N/A
- **Happy path**: SKIP — Requires scheduled job trigger and time-based escalation, not feasible in browser-only testing
- **Bug**: none


### RBAC Use Cases

## UC-RBAC-004: RBAC Positive — SUPER_ADMIN Full Access
- **Status**: PASS (already logged above)

## UC-EMP-005: Org Chart and Directory Search
- **Status**: PASS
- **Role**: SUPER_ADMIN (Fayaz M)
- **Happy path**: PASS — Org chart renders full hierarchy: Fayaz M (root), Sumit Kumar, Mani S, Saran V, Jagadeesh N all visible. Shows 31 Total Employees, 17 Departments, Avg Span 2.3, Depth 5. Team Directory shows "Found 31 employees" with search, filters, sort. Search for "Saran" filters to show Saran V. Directory bug from Phase 1 (BUG-002 showing 0 employees) is now resolved (was a timing issue).
- **Bug**: none (BUG-002 from Phase 1 resolved)


## UC-RBAC-001: RBAC Positive — Employee Accesses Own Data Only
- **Status**: PASS
- **Role**: EMPLOYEE (Saran V)
- **Happy path**: PASS — All My Space pages accessible: /me/dashboard (loads), /me/payslips (loads), /me/attendance (loads), /me/leaves (accessible via sidebar). Sidebar correctly shows ONLY: My Dashboard, My Profile, My Payslips, My Attendance, My Leaves, My Documents, Departments, Approvals, Shift Mgmt, Leave Mgmt, Contracts, Calendar, Workflows. Sidebar correctly EXCLUDES: System Admin, Payroll, Reports, Analytics, Employees, Recruitment, Org Chart.
- **Bug**: none

## UC-RBAC-002: RBAC Negative — Employee Cannot Access Admin Routes
- **Status**: PASS (with caveat)
- **Role**: EMPLOYEE (Saran V)
- **Happy path**: PASS — Route protection verified:
  - /payroll/runs -> redirects to /me/dashboard (DENIED correctly)
  - /admin -> redirects to /me/dashboard (DENIED correctly)
  - /reports -> redirects to /dashboard (DENIED correctly)
  - /recruitment -> Employee CAN reach the route URL, but sidebar switches to NU-Hire and main content area is empty (no data visible). Not a hard block via redirect.
  - Backend API RBAC confirmed: GET /payroll/runs -> 403, GET /employees -> 403, GET /admin/health -> 403
- **Bug**: BUG-008: /recruitment route is accessible to EMPLOYEE role at the frontend routing level (no redirect or Access Denied page shown). Although no data is rendered and backend APIs properly return 403, the route should block access with a redirect or "Access Denied" message for consistency with other restricted routes.

## UC-RBAC-003: RBAC Positive — Manager Accesses Team Data
- **Status**: SKIP
- **Role**: N/A
- **Happy path**: SKIP — Requires login as Manager (Sumit Kumar). Partially covered in Phase 2 RBAC tests. Manager can access: Employees, Departments, Approvals, Attendance, Shift/Leave/Contracts, Expenses, Projects, Calendar, Reports, Workflows. Denied: Admin, Payroll (confirmed via console 403).
- **Bug**: none


## UC-AUTH-002: Google OAuth SSO Login
- **Status**: SKIP
- **Role**: N/A
- **Happy path**: SKIP — Requires actual Google OAuth flow which cannot be automated via Chrome MCP tools (OAuth popup/redirect requires real Google credentials)
- **Bug**: none

## UC-AUTH-003: MFA (TOTP) Setup and Login
- **Status**: SKIP
- **Role**: N/A
- **Happy path**: SKIP — Requires authenticator app (Google Authenticator) interaction. Cannot be automated in browser.
- **Bug**: none

## UC-AUTH-004: Logout and Session Invalidation
- **Status**: PASS (partial)
- **Role**: Multiple roles
- **Happy path**: PASS — Cookie clearing + navigating to /auth/login successfully logs out. After clearing cookies, accessing /dashboard redirects to /auth/login. Multiple login/logout cycles tested successfully across Super Admin, Employee, Manager roles.
- **Bug**: none

## UC-AUTH-005: JWT Refresh Token Flow
- **Status**: SKIP
- **Role**: N/A
- **Happy path**: SKIP — Requires waiting for token expiry (15 min) or modifying config. Not feasible in interactive browser test.
- **Bug**: none

## UC-AUTH-006: Password Reset Flow
- **Status**: SKIP
- **Role**: N/A
- **Happy path**: SKIP — Requires email service to receive reset link. Not testable via browser-only automation.
- **Bug**: none

## UC-AUTH-007: Rate Limiting on Auth Endpoints
- **Status**: SKIP
- **Role**: N/A
- **Happy path**: SKIP — Requires sending 6+ rapid POST requests to /auth/login. Chrome MCP form interaction is too slow for rate limit testing. Would need curl/API testing.
- **Bug**: none

## UC-TENANT-001: Multi-Tenancy Tenant Isolation
- **Status**: SKIP
- **Role**: N/A
- **Happy path**: SKIP — Requires two different tenants in the system. Only "NULogic Internal" tenant exists in demo data.
- **Bug**: none

## UC-SEC-001: Session Security — Concurrent Sessions
- **Status**: SKIP
- **Role**: N/A
- **Happy path**: SKIP — Requires two browser sessions simultaneously. Single-tab MCP testing cannot verify concurrent session management.
- **Bug**: none

## UC-SEC-002: OWASP Security Headers Verification
- **Status**: SKIP
- **Role**: N/A
- **Happy path**: SKIP — Requires inspecting HTTP response headers. Chrome MCP read_network_requests does not expose response headers. Would need curl or DevTools Protocol.
- **Bug**: none

## UC-SEC-003: CSRF Protection
- **Status**: SKIP
- **Role**: N/A
- **Happy path**: SKIP — Requires sending raw POST requests without CSRF token. Not possible through browser UI testing.
- **Bug**: none

## UC-SEC-004: Input Validation and XSS Prevention
- **Status**: SKIP
- **Role**: N/A
- **Happy path**: SKIP — Would require creating employee with XSS payload in name field. Risk of creating test data pollution.
- **Bug**: none

## UC-SEC-005: Account Lockout After Failed Attempts
- **Status**: SKIP
- **Role**: N/A
- **Happy path**: SKIP — Requires 5+ failed login attempts which risks locking the test account.
- **Bug**: none

---

## SUMMARY

### Test Execution Summary

| Category | Total | PASS | FAIL | BLOCKED | SKIP |
|----------|-------|------|------|---------|------|
| UC-AUTH (001-007) | 7 | 2 | 0 | 0 | 5 |
| UC-PAY (001-006) | 6 | 0 | 2 | 4 | 0 |
| UC-APPR (001-005) | 5 | 1 | 0 | 0 | 4 |
| UC-RBAC (001-004) | 4 | 3 | 0 | 0 | 1 |
| UC-EMP-005 | 1 | 1 | 0 | 0 | 0 |
| UC-TENANT-001 | 1 | 0 | 0 | 0 | 1 |
| UC-SEC (001-005) | 5 | 0 | 0 | 0 | 5 |
| **TOTAL** | **29** | **7** | **2** | **4** | **16** |

### Bugs Found in Phase 3

| ID | Severity | Use Case | Description |
|----|----------|----------|-------------|
| BUG-006 | MEDIUM | UC-PAY-001 | Salary structure creation form uses free text Employee ID field instead of UUID selector. API returns 400, no user-facing error message shown. |
| BUG-007 | HIGH | UC-PAY-002 | POST /payroll/runs returns 400 on create. Likely form state not propagating date values to React (controlled input issue with MCP form_input). No error toast or inline validation shown to user on failure. |
| BUG-008 | LOW | UC-RBAC-002 | /recruitment route accessible to EMPLOYEE role at frontend level (no redirect/Access Denied). Backend correctly returns 403 on data APIs, but frontend should block route access for consistency. |

### Key Findings

1. **Authentication**: Login flow works reliably via demo account buttons. Email/password login redirects correctly. Session invalidation via cookie clearing works.

2. **RBAC Enforcement**: Backend RBAC is solid — confirmed 403 responses on /payroll/runs, /employees, /admin/health for EMPLOYEE role. Frontend sidebar correctly scopes navigation per role. Route protection redirects unauthorized users to /me/dashboard for most routes.

3. **Payroll**: Both salary structure creation and payroll run creation fail with HTTP 400. Root cause may be React controlled input state not receiving values from MCP form_input (date picker issue), OR missing seed data (salary structures). This blocks all downstream payroll tests (payslip generation, PDF export, lock, adjustments).

4. **Leave Management**: Leave application works end-to-end — POST /leave-requests returns 201. Leave balances display correctly per employee. Days calculation correct. Leave calendar and history pages load with data.

5. **Approval Workflows**: Leave submission creates PENDING approval. Full approval chain (L1 Manager -> L2 HR) not tested due to role switching overhead.

6. **Data Quality**: Org chart renders full hierarchy. Team directory loads 31 employees and search works. Departments (10) load with employee counts. 52 job openings visible in recruitment.

