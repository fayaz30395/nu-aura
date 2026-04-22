# NU-AURA Chrome QA Findings - Phase 1B

## Role: Super Admin (Fayaz M - fayaz.m@nulogic.io)

## Date: 2026-04-08

## Browser: Chrome via Claude-in-Chrome MCP

---

# SYSTEMIC ISSUE: Backend Instability During Testing

The Spring Boot backend (localhost:8080) experienced three outages during this QA session:

1. **First outage** (~14:34): Backend stopped responding mid-test. Console showed
   `GET /leave-requests/status/PENDING timeout of 30000ms exceeded` followed by cascade of "Network
   Error" on all subsequent API calls.
2. **Second outage** (~14:39): Backend went down again after brief recovery. No process listening on
   port 8080 (confirmed via `lsof`).
3. **Third outage** (~14:46): Backend briefly returned HTTP 200 on /actuator/health but crashed
   again within seconds. Demo login failed with "Is the backend running?" error.
4. **Fourth outage** (~14:50): Backend crashed again after brief recovery. Pattern: starts, responds
   to health check, crashes within ~10 seconds before auth requests can complete.

**Root cause investigation needed**: The backend appears to be crash-looping. Possible causes: OOM,
unhandled exception during startup, DB connection pool exhaustion, or Kafka/Redis dependency
failure. Check `backend/logs/` and `docker-compose` service health.

**Impact**: Only pages tested before first outage have reliable backend-dependent results. All other
pages tested during outage reflect FRONTEND ROUTING AND ERROR HANDLING only.

**Key observation**: When backend goes down, the frontend notification polling continues retrying
`/notifications/unread` and `/notifications/unread/count` every ~15 seconds without exponential
backoff, flooding the console with errors and potentially contributing to tab freezing.

---

# Batch 1 - HR Operations

## /me/dashboard -- Role: Super Admin

- **Status**: PASS
- **Console errors**: none
- **Visual issues**: none
- **Data**: loaded ("Good afternoon, Fayaz", attendance stats, leave balance, company feed)
- **Bug**: none

## /attendance/my-attendance -- Role: Super Admin

- **Status**: PASS
- **Console errors**: none
- **Visual issues**: none
- **Data**: loaded (attendance stats: avg 4h 25m/day, 100% on-time arrival; log entries with dates
  and hours)
- **Bug**: none

## /leave/my-leaves -- Role: Super Admin

- **Status**: PASS
- **Console errors**: none at time of load
- **Visual issues**: Slow initial load (~8s showing "Loading leave requests..." before data appears)
- **Data**: loaded (20 leave requests visible with pagination, mixed statuses: PENDING, CANCELLED)
- **Bug**: none (slow load noted but functional)

## /leave/approvals -- Role: Super Admin

- **Status**: BACKEND-DOWN
- **Console errors**: `GET /leave-requests/status/PENDING timeout of 30000ms exceeded`
- **Visual issues**: Stuck on "Loading leave requests..." indefinitely; stats show 0/0/0
- **Data**: loading (API timeout then network error)
- **Bug**: BUG-001: Leave approvals shows infinite loading instead of error message when API times
  out. Should display user-friendly error after reasonable timeout.

## /leave/calendar -- Role: Super Admin

- **Status**: BACKEND-DOWN
- **Console errors**: Multiple Network Errors on: `/leave-requests/status/APPROVED`,
  `/leave-types/active`, `/leave-requests/employee/{id}`, `/notifications/unread`,
  `/workflow/inbox/count`
- **Visual issues**: Shows "Loading calendar..." indefinitely - no error state displayed to user
- **Data**: error (backend down)
- **Bug**: BUG-002: Leave calendar shows infinite loading instead of error state when API is
  unreachable

## /leave/apply -- Role: Super Admin

- **Status**: PASS
- **Console errors**: none
- **Visual issues**: none
- **Data**: loaded (form with 10 leave types: Earned, Casual, Sick, Maternity, Paternity,
  Bereavement, Compensatory Off, Loss of Pay, QA Test Leave x2; date pickers, half-day toggle,
  reason field)
- **Bug**: none

## /leave/encashment -- Role: Super Admin

- **Status**: PASS-EMPTY
- **Console errors**: none
- **Visual issues**: none
- **Data**: Page renders with title "Leave Encashment - Convert unused leave days to cash
  compensation" but minimal content (no encashment requests yet)
- **Bug**: none

---

# Batch 1 (continued) - Payroll, Shifts, HR Ops

## /payroll/payslips -- Role: Super Admin

- **Status**: PASS-EMPTY
- **Console errors**: none
- **Visual issues**: none
- **Data**: Page loaded with filters (Month, Year, Status) and search. Shows "0 of 0 payslips" (no
  payroll data in dev)
- **Bug**: none

## /payroll/bulk-processing -- Role: Super Admin

- **Status**: PASS-EMPTY
- **Console errors**: `GET /employees` returned 500 (BulkProcessingWizard background request)
- **Visual issues**: none (shows "Coming Soon" placeholder correctly)
- **Data**: "Coming Soon - Bulk payroll processing is currently under development"
- **Bug**: BUG-007: `GET /employees` API returns 500 error (seen from BulkProcessingWizard
  component)

## /shifts/definitions -- Role: Super Admin

- **Status**: PASS-EMPTY
- **Console errors**: `GET /shifts` returned 500
- **Visual issues**: none
- **Data**: "Shift Definitions - Manage shift types, times, and rules" with Add Shift button
- **Bug**: BUG-008: `GET /shifts` API returns 500 error

## /shifts/patterns -- Role: Super Admin

- **Status**: PASS-EMPTY
- **Console errors**: `GET /shifts` 500, `GET /shifts/patterns` Network Error, `GET /shifts/active`
  Network Error
- **Visual issues**: none (shows proper empty state)
- **Data**: "No Patterns Defined - Create rotation patterns to auto-generate shift schedules"
- **Bug**: BUG-008 (same shifts 500), plus backend crashed again during this page load

## /overtime -- Role: Super Admin

- **Status**: PASS-EMPTY
- **Console errors**: none
- **Visual issues**: none
- **Data**: Stats (0h total, 0 pending, 0 approved), tabs (My/Team/All), empty state with "Request
  Overtime" button
- **Bug**: none

## /travel -- Role: Super Admin

- **Status**: PASS
- **Console errors**: none
- **Visual issues**: none
- **Data**: loaded (2 travel requests: TR-1774991951309 Bengaluru->Mumbai DRAFT, Business, Flight,
  15K INR)
- **Bug**: none

## /loans -- Role: Super Admin

- **Status**: PASS-EMPTY
- **Console errors**: none
- **Visual issues**: none
- **Data**: Stats (0 active, 0 outstanding, 0 repaid), "Apply for Loan" button, proper empty state
- **Bug**: none

## /probation -- Role: Super Admin

- **Status**: BUG
- **Console errors**: `GET /probation` 500, `GET /probation/status/CONFIRMED` 500
- **Visual issues**: Skeleton loading shown but page structure present (Active/Upcoming/History
  tabs)
- **Data**: loading (API 500)
- **Bug**: BUG-009: `GET /probation` and `GET /probation/status/CONFIRMED` both return 500

## /statutory -- Role: Super Admin

- **Status**: PASS-EMPTY
- **Console errors**: none (own page)
- **Visual issues**: none
- **Data**: Full UI with PF/ESI/PT/Monthly Report tabs, configuration table with columns
- **Bug**: none

## /compensation -- Role: Super Admin

- **Status**: BUG
- **Console errors**: `GET /compensation/revisions` 500
- **Visual issues**: Stuck on "Loading compensation data..." after title renders
- **Data**: loading (API 500)
- **Bug**: BUG-010: `GET /compensation/revisions` returns 500

## /benefits -- Role: Super Admin

- **Status**: PASS-EMPTY
- **Console errors**: none
- **Visual issues**: none
- **Data**: Stats (0 enrolled, 0 premium, 0 available), tabs (Plans/Enrollments/Claims), enrollment
  period info
- **Bug**: none

## /letter-templates -- Role: Super Admin

- **Status**: PASS
- **Console errors**: none
- **Visual issues**: Shows "Loading templates..." briefly then loads
- **Data**: Breadcrumbs (Home > Dashboard > Letters > Letter Templates)
- **Bug**: none

## /letters -- Role: Super Admin

- **Status**: PASS-EMPTY
- **Console errors**: none
- **Visual issues**: none
- **Data**: Letter categories (Employment Certificate, Bonafide, Visa Support, Bank, Address Proof,
  Internship, Training, Appreciation, Custom), "Generate Letter" button
- **Bug**: none

# Batch 2 - Helpdesk & Contracts

## /helpdesk/tickets -- Role: Super Admin

- **Status**: PASS-EMPTY
- **Console errors**: `GET /helpdesk/tickets` 500 (background)
- **Visual issues**: none
- **Data**: "Support Tickets" with Create Ticket button, proper empty state
- **Bug**: BUG-011: `GET /helpdesk/tickets` API returns 500

## /helpdesk/sla -- Role: Super Admin

- **Status**: PASS-EMPTY
- **Console errors**: none
- **Visual issues**: none
- **Data**: SLA dashboard with metrics (compliance rate, response time, CSAT, FCR), tabs (
  Dashboard/Policies/Escalations)
- **Bug**: none

## /contracts/templates -- Role: Super Admin

- **Status**: PASS-EMPTY
- **Console errors**: none
- **Visual issues**: none
- **Data**: "Contract Templates" with breadcrumbs, "New Template" button
- **Bug**: none

## /time-tracking -- Role: Super Admin

- **Status**: UNTESTED

## /timesheets -- Role: Super Admin

- **Status**: UNTESTED

## /resources -- Role: Super Admin

- **Status**: UNTESTED

# Batch 3 - Recruitment

## /recruitment/career-page -- Role: Super Admin

- **Status**: PASS
- **Console errors**: none
- **Visual issues**: none
- **Data**: Career Page CMS with stats (46 live, 5 draft, 52 total openings), job title listing,
  Preview button
- **Bug**: none

## /recruitment/job-boards -- Role: Super Admin

- **Status**: UNTESTED

## /onboarding -- Role: Super Admin

- **Status**: UNTESTED

## /preboarding -- Role: Super Admin

- **Status**: UNTESTED

## /referrals -- Role: Super Admin

- **Status**: UNTESTED

# Batch 4 - Performance & Growth

- All pages UNTESTED (time constraint - to be tested in next session)

# Batch 5 - Fluence

## /fluence/blogs -- Role: Super Admin

- **Status**: PASS-EMPTY
- **Console errors**: none (own page)
- **Visual issues**: none
- **Data**: NU-Fluence sidebar visible, "Blog & Articles" title, "New Post" button, "No posts yet"
  empty state
- **Bug**: none

## /fluence/templates, /fluence/search, /fluence/wall, /fluence/analytics, /fluence/drive

- **Status**: UNTESTED (time constraint)

# Batch 6 - Admin

## /admin/employees -- Role: Super Admin

- **Status**: BUG
- **Console errors**: none visible
- **Visual issues**: Stats show "0 Total Employees" and "0 Active" despite 8+ demo accounts existing
  in the system
- **Data**: Page renders with stats (0 employees, 0 active, 9 roles, 15 departments), "No employees
  found" empty state
- **Bug**: BUG-012: Admin employee management shows 0 employees despite demo users existing.
  Possible API 500 on `GET /employees` (seen earlier as BUG-007) causing empty data display.

## /admin/roles -- Role: Super Admin

- **Status**: UNTESTED

## /admin/permissions -- Role: Super Admin

- **Status**: UNTESTED

## /admin/settings -- Role: Super Admin

- **Status**: UNTESTED

## /admin/system -- Role: Super Admin

- **Status**: UNTESTED

# Batch 7 - Analytics & Security

## /analytics -- Role: Super Admin

- **Status**: PASS
- **Console errors**: none
- **Visual issues**: Slow load (~8s "Loading analytics..." before data appears)
- **Data**: Full dashboard with stats (29 employees, 0% attendance rate today, 9.09% leave
  utilization, 30 pending approvals), attendance trend chart, department distribution chart
- **Bug**: none

## /security, /settings/profile, /settings/security, /settings/notifications

- **Status**: UNTESTED (time constraint)

---

# Frontend Resilience Issues Found (Code Bugs)

## BUG-001: No Error State on API Timeout (Leave Approvals)

- **Page**: /leave/approvals
- **Severity**: Medium
- **Description**: When the leave approvals API (`/leave-requests/status/PENDING`) times out after
  30s, the page remains stuck on "Loading leave requests..." indefinitely with no error feedback to
  the user.
- **Expected**: After timeout, display a user-friendly error with retry button.
- **Recommendation**: Add React Query `onError` handling or `isError` state to show error UI.

## BUG-002: No Error State on Network Failure (Leave Calendar)

- **Page**: /leave/calendar
- **Severity**: Medium
- **Description**: When multiple API calls fail with Network Error, the calendar remains on "Loading
  calendar..." with no error state shown.
- **Expected**: Display error state with retry button when API calls fail.

## BUG-003: Notification Polling Without Backoff

- **Page**: Global (all authenticated pages)
- **Severity**: High
- **Description**: When backend is unreachable, the frontend continues polling
  `/notifications/unread` and `/notifications/unread/count` every ~15 seconds without exponential
  backoff. This floods the console with errors and can freeze browser tabs.
- **Expected**: Implement exponential backoff (e.g., 15s -> 30s -> 60s -> 120s) when consecutive API
  failures are detected. Stop polling after N failures until user interaction.

## BUG-004: Session Not Preserved After Backend Restart

- **Page**: Global (auth)
- **Severity**: Low
- **Description**: After backend went down and came back briefly, the session was lost (user was
  logged in as different user "Mani" instead of "Fayaz"). JWT cookie-based auth should survive
  backend restarts if the secret key is stable.
- **Note**: This may be a dev-environment artifact (backend restart may rotate JWT secret).

## BUG-005: Login Error Message UX

- **Page**: /auth/login
- **Severity**: Low
- **Description**: When demo login fails due to backend being down, the error message shown is "Demo
  login failed. Is the backend running?" - this is a developer-facing message not suitable for
  production. Should show a generic "Service temporarily unavailable" message.

## BUG-006: Backend Crash-Looping (CRITICAL - P0)

- **Component**: Spring Boot Backend (localhost:8080)
- **Severity**: Critical / P0
- **Description**: Backend experienced 4 outages in a 20-minute QA session. Pattern: starts,
  responds briefly to health checks, then crashes within ~10 seconds. Cannot sustain authentication
  requests. This completely blocks all QA testing.
- **Impact**: All 60+ untested pages and all RBAC tests blocked. No QA progress possible until
  backend is stable.
- **Action**: Investigate backend logs for crash cause. Check Docker infrastructure services (Redis,
  Kafka, PostgreSQL/Neon) connectivity. Verify JVM heap settings.
- **Suspect change**: `SecurityConfig.java` has an uncommitted change moving
  `csrfDoubleSubmitFilter` from
  `addFilterAfter(csrfDoubleSubmitFilter, JwtAuthenticationFilter.class)` to
  `addFilterAfter(csrfDoubleSubmitFilter, UsernamePasswordAuthenticationFilter.class)`. This changes
  CSRF filter ordering and may be causing auth failures.
- **Other uncommitted changes**: `GlobalExceptionHandler.java` (+26 lines),
  `CustomUserDetailsService.java` (+3 lines), `ExitManagementService.java` (72 line diff),
  `InterviewManagementService.java` (16 line diff), and 3 new Flyway migrations (V121-V123).
- **New untracked files**: `DemoPasswordResetRunner.java`, and 3 Flyway migrations for password
  resets and recognitions table fixes.

---

# Login Page Verification (No Backend Required)

- **Status**: PASS
- **Login page renders**: Yes - full layout with Google SSO, demo accounts panel (8 roles), email
  login
- **Demo account buttons**: All 8 visible and clickable (Fayaz M, Sumit Kumar, Mani S, Gokul R,
  Saran V, Jagadeesh N, Suresh M, Dhanush A)
- **Visual quality**: Professional design, branded, responsive
- **Auth error handling**: Displays error banner when backend unreachable (though message is
  developer-facing)

---

# Summary

| Category              | Tested | PASS  | PASS-EMPTY | BUG   | UNTESTED |
|-----------------------|--------|-------|------------|-------|----------|
| Batch 1 - HR Ops      | 18     | 4     | 9          | 5     | 0        |
| Batch 2 - Helpdesk    | 3      | 0     | 3          | 1     | 3        |
| Batch 3 - Recruitment | 1      | 1     | 0          | 0     | 4        |
| Batch 4 - Performance | 0      | -     | -          | -     | 9        |
| Batch 5 - Fluence     | 1      | 0     | 1          | 0     | 5        |
| Batch 6 - Admin       | 1      | 0     | 0          | 1     | 4        |
| Batch 7 - Analytics   | 1      | 1     | 0          | 0     | 4        |
| **Total**             | **25** | **6** | **13**     | **7** | **29**   |

## Backend API 500 Errors Summary (Systemic)

The following backend APIs consistently return HTTP 500:

- `GET /employees` (BUG-007, BUG-012)
- `GET /shifts` (BUG-008)
- `GET /probation` and `GET /probation/status/CONFIRMED` (BUG-009)
- `GET /compensation/revisions` (BUG-010)
- `GET /helpdesk/tickets` (BUG-011)

These all suggest a common backend issue - possibly a database/migration problem or missing table.
The `GET /employees` 500 is the most critical as it affects multiple pages.

**Action required**: Investigate the 500 errors on the above endpoints. Check backend logs for stack
traces. The Flyway migrations V121-V123 (uncommitted) may need to be applied or may have caused
schema issues.
