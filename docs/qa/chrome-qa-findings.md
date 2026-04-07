# NU-AURA Chrome QA — 2026-04-08 (Fresh Run)

## Summary
| Batch | Pages | Pass | Pass-Empty | Fail | Bug |
|-------|-------|------|------------|------|-----|
| 1 — Core HRMS | 7 | 5 | 0 | 0 | 2 |
| 2 — HR Ops & Finance | 7 | 4 | 0 | 0 | 3 |
| 3 — Recruitment | 6 | 4 | 0 | 1 | 1 |
| 4 — Performance & Growth | 4 | 3 | 0 | 0 | 1 |
| 5 — NU-Fluence | 7 | 2 | 0 | 3 | 2 |
| 6 — Admin & Profile | 3 | 1 | 0 | 1 | 1 |
| **TOTAL** | **34** | **19** | **0** | **5** | **10** |

## Critical Cross-Cutting Issues

### 1. Session Instability (CRITICAL)
Demo login sessions expire within ~30-60 seconds of navigation. The "Preparing your workspace..." loading screen appears during sub-app transitions and frequently results in session expiration + redirect to /auth/login. This made testing unreliable and required re-login 8+ times during this QA run. Multiple pages could not be tested with a valid session due to this issue.

### 2. User Identity Degradation (HIGH)
After session partial expiry, the sidebar shows "User" / "Employee" instead of "Fayaz M" / "SUPER ADMIN". The sidebar also loses menu items (showing only a subset of the full navigation). In this degraded state, many pages show "Access Denied" even though the URL loads.

### 3. Hydration Mismatch in Header.tsx:49 (LOW)
Server renders `p-2 rounded-lg` but client renders `p-2.5 rounded-lg ... min-w-[44px] min-h-[44px]` on mobile menu button. This is a React hydration warning (not a crash) appearing on every page. Filed once here, not repeated per page.

### 4. AssetManagementPage setState During Render (MEDIUM)
Console error: "Cannot update a component (HotReload) while rendering a different component (AssetManagementPage)" at assets/page.tsx:206. This is a React anti-pattern.

## Login
- **Method:** Demo account button (Fayaz M / SUPER ADMIN)
- **Result:** PASS — clicked demo account, auto-filled credentials, redirected to /me/dashboard
- **Console:** No errors on login page
- **Note:** Login works reliably but sessions expire very quickly

---

## Batch 1 — Core HRMS

### /me/dashboard
- **Status:** PASS
- **Page heading:** Good morning, Fayaz (dynamic greeting)
- **Content loaded:** yes — Quick Access, Clock In widget, Leave Balance (Paternity 15d, Casual 7d, Sick 12d), Company Feed, Birthdays, Anniversaries
- **Console errors:** Hydration mismatch (Header.tsx — global issue)
- **Issues:** none

### /employees
- **Status:** PASS
- **Page heading:** Employee Management
- **Content loaded:** yes — "Manage your organization's employees", Change Requests, Import, + Add Employee, Search, status filters (All/Active/On Leave/Terminated)
- **Console errors:** Hydration mismatch (Header.tsx — global issue)
- **Issues:** none

### /attendance
- **Status:** PASS
- **Page heading:** Attendance
- **Content loaded:** yes — Live Time, Clock In button, Avg In 11:49, Avg Hrs 40.3, Attendance History, Regularization, Team Attendance, Upcoming Holidays
- **Console errors:** Hydration mismatch (Header.tsx — global issue)
- **Issues:** none

### /leave
- **Status:** PASS
- **Page heading:** Leave Management
- **Content loaded:** yes — Leave balances for 8+ leave types (PL, CL, SL, BL, CO, LOP, EL, ML), Apply for Leave button
- **Console errors:** Hydration mismatch (Header.tsx — global issue)
- **Issues:** none

### /payroll
- **Status:** PASS
- **Page heading:** Payroll Management
- **Content loaded:** yes — Payroll Runs, Payslips, Salary Structures, Bulk Processing, Components sections
- **Console errors:** none (beyond global issue)
- **Issues:** none

### /expenses
- **Status:** BUG
- **Page heading:** Access Denied
- **Content loaded:** no — "You don't have permission to access this page" with lock icon
- **Console errors:** none
- **Issues:** SUPER ADMIN (Fayaz M) gets Access Denied. SuperAdmin should bypass all permission checks per RBAC rules.

### /assets
- **Status:** BUG
- **Page heading:** Access Denied
- **Content loaded:** no — "You don't have permission to access this page" with lock icon
- **Console errors:** setState during render in AssetManagementPage
- **Issues:** SUPER ADMIN (Fayaz M) gets Access Denied. SuperAdmin should bypass all permission checks per RBAC rules.

---

## Batch 2 — HR Ops & Finance

### /shifts
- **Status:** BUG
- **Page heading:** Access Denied
- **Content loaded:** no — "You don't have permission to access this page" with lock icon
- **Console errors:** none
- **Issues:** SUPER ADMIN gets Access Denied. SuperAdmin should bypass all permission checks.

### /holidays
- **Status:** PASS
- **Page heading:** Holiday Calendar
- **Content loaded:** yes — Holiday list with dates (Christmas Dec 25, etc.), NATIONAL category labels
- **Console errors:** none
- **Issues:** none

### /overtime
- **Status:** PASS
- **Page heading:** Overtime Management
- **Content loaded:** yes — "Track and manage overtime hours and approvals", Request Overtime button, My Overtime / Team Overtime / All Records tabs, loading records
- **Console errors:** none
- **Issues:** none

### /travel
- **Status:** PASS
- **Page heading:** Travel Management
- **Content loaded:** yes — New Travel Request button, 2 travel requests visible (TR-1774991951309 DRAFT, Business, Bengaluru to Mumbai), status filters (Draft, Submitted, Approved, etc.)
- **Console errors:** none
- **Issues:** none

### /loans
- **Status:** PASS
- **Page heading:** Employee Loans
- **Content loaded:** yes — Active Loans 0, Outstanding Balance 0, Total Repaid 0, Apply for Loan button, My Loans tab
- **Console errors:** none
- **Issues:** none

### /compensation
- **Status:** PASS
- **Page heading:** Compensation Planning
- **Content loaded:** partial — "Manage compensation review cycles and salary revisions", New Review Cycle button, "Loading compensation data..."
- **Console errors:** none
- **Issues:** Data still loading but page structure renders correctly

### /benefits
- **Status:** BUG
- **Page heading:** Benefits Management
- **Content loaded:** yes — Enrolled Plans 0, Monthly Premium $0, Available Plans 0, Benefit Plans / My Enrollments / Claims tabs
- **Console errors:** none
- **Issues:** Shows dollar amounts ($0) instead of INR for an Indian company. Open Enrollment Period shows "November 1 - November 30, 2025" which is in the past (current date is April 2026).

---

## Batch 3 — Recruitment

### /recruitment
- **Status:** PASS
- **Page heading:** Recruitment Dashboard
- **Content loaded:** yes — Active Job Openings 46, Total Candidates 100, Interviews This Week 0, Pending Offers 1, active job listing cards
- **Console errors:** none
- **Issues:** none

### /recruitment/jobs
- **Status:** PASS
- **Page heading:** Job Openings
- **Content loaded:** yes — Total Jobs 51, Open 46, Draft 0, Closed 5, job cards with salary ranges and status filters
- **Console errors:** none
- **Issues:** none

### /recruitment/candidates
- **Status:** PASS
- **Page heading:** Candidates
- **Content loaded:** yes — Total Candidates 100, New 89, In Interview 4, Selected 0, Add Candidate / Parse Resume buttons
- **Console errors:** none
- **Issues:** none

### /recruitment/pipeline
- **Status:** BUG
- **Page heading:** Access Denied
- **Content loaded:** no — "You don't have permission to access this page"
- **Console errors:** none
- **Issues:** SUPER ADMIN gets Access Denied. SuperAdmin should bypass all permission checks.

### /recruitment/agencies
- **Status:** FAIL
- **Page heading:** Failed to Load Agencies
- **Content loaded:** no — "Could not load agency data. Please try refreshing." with Try again / Refresh page buttons
- **Console errors:** none visible
- **Issues:** API call to load agencies fails. Data loading error.

### /onboarding
- **Status:** PASS
- **Page heading:** Talent Onboarding
- **Content loaded:** yes — "Orchestrate the first 90 days", Active 0, Upcoming 0, Completed 0, Avg Days 12, status filters
- **Console errors:** none
- **Issues:** none

---

## Batch 4 — Performance & Growth

### /performance
- **Status:** PASS
- **Page heading:** Performance Management
- **Content loaded:** yes — Goals, OKR Management, Performance Reviews, 360 Feedback, Continuous Feedback sections
- **Console errors:** none
- **Issues:** none

### /training
- **Status:** PASS
- **Page heading:** Training Programs
- **Content loaded:** yes — My Enrollments 0, In Progress 0, Completed 0, Available Programs 0, My Trainings / Course Catalog / Manage Programs / Growth Roadmap tabs
- **Console errors:** none
- **Issues:** none

### /surveys
- **Status:** BUG
- **Page heading:** Access Denied
- **Content loaded:** no — "You don't have permission to access this page"
- **Console errors:** none
- **Issues:** SUPER ADMIN gets Access Denied. SuperAdmin should bypass all permission checks.

### /recognition
- **Status:** PASS
- **Page heading:** Employee Recognition
- **Content loaded:** yes — My Points 0, Received 0, Given 0, Total Activity 5, Public Feed with recognition entries ("Outstanding Engineering Leadership in Q1!")
- **Console errors:** none
- **Issues:** none

---

## Batch 5 — NU-Fluence

### /fluence/wiki
- **Status:** PASS
- **Page heading:** Wiki Pages
- **Content loaded:** yes — "Create and manage knowledge base documentation", New Page button, Spaces sidebar, empty state "No pages yet"
- **Console errors:** none
- **Issues:** Shows "User" / "Employee" instead of "Fayaz M" / "SUPER ADMIN" in sidebar (identity degradation)

### /fluence/blogs
- **Status:** BUG
- **Page heading:** App Error
- **Content loaded:** no — JavaScript crash: "categories.map is not a function"
- **Console errors:** Runtime error
- **Issues:** Page crashes with TypeError. The `categories` variable is not an array when `.map()` is called on it. Likely an API response returning null/undefined instead of an array.

### /fluence/templates
- **Status:** FAIL
- **Page heading:** NU-AURA (loading)
- **Content loaded:** no — Stuck on "Preparing your workspace..." indefinitely, then session expires
- **Console errors:** none visible
- **Issues:** Page never finishes loading. Infinite loading state before session expiry.

### /fluence/search
- **Status:** FAIL
- **Page heading:** (none — redirects)
- **Content loaded:** no — Redirects to /me/dashboard or /auth/login
- **Console errors:** none visible
- **Issues:** Page fails to load, redirects away. Possibly missing route or broken auth check.

### /fluence/wall
- **Status:** PASS
- **Page heading:** Activity Wall
- **Content loaded:** yes — "See what is happening across your knowledge base", Post/Poll/Praise tabs, Organization/Department/Team filters, Trending Content, Recent Activity sections (both empty)
- **Console errors:** none
- **Issues:** none

### /fluence/analytics
- **Status:** FAIL
- **Page heading:** (none — redirects)
- **Content loaded:** no — Redirects to /me/dashboard
- **Console errors:** none visible
- **Issues:** Page fails to load, redirects to dashboard. Possibly missing route or broken auth.

### /fluence/drive
- **Status:** BUG
- **Page heading:** NU-AURA (loading)
- **Content loaded:** no — Stuck on "Preparing your workspace..." with degraded user identity ("User" / "Employee"), eventually session expires
- **Console errors:** none visible
- **Issues:** Page never finishes loading. Shows "Home" and "Drive" in sidebar but content area never renders.

---

## Batch 6 — Admin & Profile

### /admin
- **Status:** PASS
- **Page heading:** Super Admin Dashboard
- **Content loaded:** yes — System Health (Checking...), All Employees table (Loading users...), Role Management section
- **Console errors:** none
- **Issues:** Data sections show loading state but page structure is correct

### /approvals
- **Status:** BUG
- **Page heading:** Access denied
- **Content loaded:** no — Redirects to /approvals/inbox, shows "You do not have permission to view the approval inbox"
- **Console errors:** none
- **Issues:** SUPER ADMIN gets Access Denied on approval inbox. Also sidebar shows reduced menu items and "User" / "Employee" identity (session degradation).

### /me/profile
- **Status:** FAIL
- **Page heading:** Profile Not Found / Preparing your workspace...
- **Content loaded:** no — Stuck on "Preparing your workspace..." indefinitely, then shows "Profile Not Found" if session degrades
- **Console errors:** none visible
- **Issues:** Profile page never loads properly. With fresh session shows infinite loading, with degraded session shows "Profile Not Found".

---

## Bug Summary (Priority Order)

### CRITICAL
1. **Session instability** — Demo login sessions expire within ~30-60 seconds, causing "Preparing your workspace..." infinite loading and redirects to /auth/login. Affected nearly every page transition.
2. **User identity degradation** — After partial session expiry, user shows as "User" / "Employee" instead of actual name/role, causing cascading Access Denied errors.

### HIGH — SuperAdmin Access Denied (RBAC Bypass Broken)
3. **/expenses** — Access Denied for SUPER ADMIN
4. **/assets** — Access Denied for SUPER ADMIN
5. **/shifts** — Access Denied for SUPER ADMIN
6. **/recruitment/pipeline** — Access Denied for SUPER ADMIN
7. **/surveys** — Access Denied for SUPER ADMIN
8. **/approvals** — Access Denied for SUPER ADMIN

### HIGH — Page Crashes / Data Failures
9. **/fluence/blogs** — App crash: "categories.map is not a function" (TypeError)
10. **/recruitment/agencies** — "Failed to Load Agencies" — API data loading error

### MEDIUM — Pages That Never Load
11. **/me/profile** — Stuck on "Preparing your workspace..." indefinitely
12. **/fluence/templates** — Stuck on "Preparing your workspace..." indefinitely
13. **/fluence/drive** — Stuck on "Preparing your workspace..." indefinitely
14. **/fluence/search** — Redirects to dashboard (route possibly missing)
15. **/fluence/analytics** — Redirects to dashboard (route possibly missing)

### LOW
16. **/benefits** — Shows dollar amounts ($0) instead of INR; enrollment period (Nov 2025) is in the past
17. **Header.tsx:49 hydration mismatch** — Server/client className mismatch on mobile menu button (all pages)
18. **AssetManagementPage** — setState during render (React anti-pattern)
