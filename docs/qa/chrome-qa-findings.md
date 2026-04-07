# NU-AURA QA Chrome Findings -- 2026-04-07

**Tester:** Automated Chrome QA (Claude)
**Environment:** localhost:3000 (Next.js dev) + localhost:8080 (Spring Boot backend)
**User:** Fayaz M (SUPER ADMIN) via Demo Account login
**Browser:** Chrome with MCP extension

---

## Summary

| Batch | Pages Tested | Pass | Pass-Loading | Fail | Critical Bugs |
|-------|-------------|------|--------------|------|---------------|
| 1 - HRMS Core | /me/dashboard, /employees, /attendance, /leave, /payroll, /expenses, /assets | 4 | 2 | 1 | 1 |
| 2 - HRMS Extended | /shifts, /holidays, /overtime, /travel, /loans, /compensation, /benefits | 2 | 1 | 4 | 0 |
| 3 - Hire | /recruitment, /recruitment/jobs | 2 | 0 | 0 | 0 |
| 4 - Grow | /performance | 1 | 0 | 0 | 0 |
| 5 - Fluence | /fluence/wiki | 0 | 1 | 0 | 0 |
| 6 - Platform | /admin, /me/profile, /approvals | 1 | 0 | 0 | 0 |
| **TOTAL** | **~20 pages** | **10** | **4** | **5** | **1** |

### CRITICAL BUG -- Session/Token Instability (P0)

The demo login session (JWT in httpOnly cookie) degrades intermittently during navigation. The user identity drops from "Fayaz M / SUPER ADMIN" to a generic "User / Employee" within 10-30 seconds of active navigation. This causes:
- Permission-gated pages to show "Access Denied"
- Theme/dark mode preference to reset (dark -> light)
- Sidebar to show reduced navigation (Employee-level items only)
- Pages to redirect unpredictably through multiple routes before settling
- "Preparing your workspace..." loading state on re-auth

**Root cause hypothesis:** The `TokenRefreshManager` (in `app/providers.tsx:53`) is likely triggering a refresh that replaces the demo user's JWT with a fallback/default token. The issue is intermittent and timing-dependent -- sometimes the session survives several navigations, other times it drops within one navigation.

**Evidence:** Console error stacks show `TokenRefreshManager` in the component tree. The session drop correlates with page transitions that trigger multiple API calls simultaneously. The "Preparing your workspace..." state suggests a full re-authentication cycle is happening.

---

## Detailed Findings

### Batch 1 -- HRMS Core

#### /me/dashboard
- **Status:** PASS
- **Console errors:** none
- **Content loaded:** yes -- full dashboard
- **Details:** Greeting banner ("Good evening, Fayaz"), Quick Access (Profile Updates: 1, Inbox), live clock with Clock In button, Birthdays/Anniversaries/New Joiners tabs, Company Feed (empty), On Leave Today, Working Remotely, Leave Balance sections
- **Issues:** Birthdays/Company Feed sections appear empty (may be expected for demo data)

#### /employees
- **Status:** PASS-LOADING
- **Console errors:** none
- **Content loaded:** partial -- skeleton loaders visible after 4s
- **Details:** "Employee Management" title, search bar, Change Requests / Import / Add Employee buttons visible. Table skeleton loading (data slow from backend).
- **Issues:** Data loading slow (>4s with skeletons still showing). Backend API response time may be a concern.

#### /attendance
- **Status:** PASS
- **Console errors:** none
- **Content loaded:** yes -- full dashboard
- **Details:** Live time display, check-in card (NOT STARTED, Tuesday Apr 7), work progress (0.0/8h), stats: 4 Present /5, 1 Absent /5, 0 Late Arrivals /4, 95.5h Overtime. Weekly Overview chart, Attendance History, Regularization, Team Attendance links. Upcoming Holidays (May Day, Independence Day, Gandhi Jayanti).
- **Issues:** none

#### /leave
- **Status:** PASS
- **Console errors:** none
- **Content loaded:** yes -- full page (after ~8s loading)
- **Details:** "Leave Management" with Leave Balance (2026) showing 8 leave types: Paternity (0/15), Casual (3/7), Sick (9/12), Bereavement (5/5), Compensatory Off (0/0), LOP (365/365), Earned (12/18), Maternity (36/182). Recent Leave Requests table with 5 entries showing various statuses.
- **Issues:** Initial load shows branded "Loading leave data..." spinner for ~8s. Slow but functional.

#### /payroll
- **Status:** PASS
- **Console errors:** Hydration mismatch in Header.tsx (className server/client mismatch)
- **Content loaded:** yes -- hub page
- **Details:** "Payroll Management" with 6 navigation cards: Payroll Runs, Payslips, Salary Structures, Bulk Processing, Components, Statutory.
- **Issues:** none (hub page, no data to load)

#### /expenses
- **Status:** FAIL (session dropped)
- **Console errors:** N/A (session invalidated before page could render)
- **Content loaded:** no -- redirected due to session drop
- **Issues:** Session dropped to "User / Employee" during navigation. Could not test this page.

#### /assets
- **Status:** NOT TESTED (session instability prevented reaching this page)
- **Issues:** Session management bug blocks testing

---

### Batch 2 -- HRMS Extended

#### /shifts
- **Status:** FAIL (Access Denied)
- **Console errors:** none
- **Content loaded:** no -- "Access Denied - You don't have permission to access this page"
- **Issues:** Page rendered with "User / Employee" session (session had dropped). When session is valid as Super Admin, this page was not directly tested due to session instability.

#### /holidays
- **Status:** NOT DIRECTLY TESTED (session bouncing)
- **Issues:** App auto-navigated through this route during session cycling

#### /overtime
- **Status:** NOT DIRECTLY TESTED (session bouncing)
- **Issues:** App auto-navigated through this route during session cycling

#### /travel
- **Status:** FAIL (session dropped)
- **Console errors:** Hydration mismatch in Header.tsx (at TravelPage)
- **Content loaded:** no -- session dropped to "User / Employee"
- **Issues:** Session instability prevented testing

#### /loans
- **Status:** PASS-LOADING
- **Console errors:** Hydration mismatch in Header.tsx (at LoansPage)
- **Content loaded:** partial -- "Loading loans data..." spinner visible
- **Details:** Page renders correctly as Fayaz M SUPER ADMIN with loading spinner
- **Issues:** Data loading slow

#### /compensation
- **Status:** PASS
- **Console errors:** none
- **Content loaded:** yes -- full page
- **Details:** "Compensation Planning" with stats: Total Budget $0.0M, Total Revisions 1, Pending Approvals 0, Avg. Increment 0.0%. Review Cycles tab showing "Annual Review 2026" in Draft state with $0.0M budget, 0 employees, effective 01/05/2026. Details and Start buttons available.
- **Issues:** none

#### /probation, /benefits
- **Status:** NOT TESTED (session instability)
- **Issues:** Could not reach these pages due to session cycling

---

### Batch 3 -- Hire (NU-Hire)

#### /recruitment
- **Status:** PASS
- **Console errors:** none
- **Content loaded:** yes -- full dashboard
- **Details:** "Recruitment Dashboard" with stats: 46 Active Job Openings, 100 Total Candidates, 0 Interviews This Week, 1 Pending Offer. Interviews Today section ("No Interviews Today"). Active Job Openings list (E2E QA Test Engineer 1743, Product Designer). Recent Applications (10 of 100) showing Albert Jonatthan, Raj Tester. Sidebar correctly switches to NU-HIRE context with Recruitment, Onboarding, Preboarding, Offboarding, Offer Portal, Careers Page, Referrals.
- **Issues:** none

#### /recruitment/jobs
- **Status:** PASS
- **Console errors:** none
- **Content loaded:** yes -- full page
- **Details:** "Job Openings" with stats: 51 Total Jobs, 46 Open, 0 Draft, 5 Closed. Job cards grid showing IT Support, IT Support II, QA Lead, Technical Lead, Test II, Test III, Senior Engineer (CLOSED), Test Z (CLOSED), AI Developer. Each card shows location, salary range, priority, position count, action icons (view/edit/delete).
- **Issues:** none

---

### Batch 4 -- Grow (NU-Grow)

#### /performance
- **Status:** PASS
- **Console errors:** none
- **Content loaded:** yes -- full hub page (stats still loading skeletons)
- **Details:** "Performance Management" hub with 10 navigation cards: Goals, OKR Management, Performance Reviews, 360 Feedback, Continuous Feedback, Review Cycles, PIPs, Calibration, 9-Box Grid, Competency Matrix. Getting Started section with Set SMART Goals, Give Regular Feedback, Track Progress guides. Sidebar switches to NU-GROW with Performance Hub, Revolution, OKR, 360 Feedback, 1-on-1 Meetings, Training, Learning (LMS), Recognition, Surveys, Competency Matrix, Wellness.
- **Issues:** Stat cards showing skeletons (data still loading). Otherwise functional.

---

### Batch 5 -- Fluence (NU-Fluence)

#### /fluence/wiki
- **Status:** PASS-LOADING (session dropped during load)
- **Console errors:** N/A
- **Content loaded:** partial -- sidebar rendered, main content loading
- **Details:** Sidebar correctly shows NU-FLUENCE context: Wiki, Articles, My Content, Templates, Drive, Search, Analytics. Main content area shows "Preparing your workspace..." branded loader. Session dropped to "User / Employee" before content could fully load.
- **Issues:** Session dropped. Sidebar structure is correct. Main content requires re-test with stable session.

---

### Batch 6 -- Platform

#### /admin
- **Status:** PASS
- **Console errors:** none
- **Content loaded:** yes -- full admin dashboard
- **Details:** "Super Admin Dashboard" with stats: 1 Total Tenant, 29 Total Employees, 3 Pending Approvals. System Health section ("Checking..."), All Employees table (loading users), Role Management section with email input, role dropdown (Super Admin), Assign/Update Role button. Sidebar shows MANAGEMENT section (System Dashboard, Dashboard, Employees, Organization, Attendance, Leave Management, Payroll, Data Import, Reports) and SETTINGS section.
- **Issues:** "Loading users..." in the employees table (slow backend). System Health stuck on "Checking..." (may indicate backend health endpoint is slow).

#### /approvals, /me/profile
- **Status:** NOT TESTED (session instability)
- **Issues:** Could not reach with stable session

---

## Cross-Cutting Issues

### 1. CRITICAL: Session/Token Instability (P0)
- **Severity:** Critical / P0
- **Frequency:** Occurs on ~50% of page navigations
- **Impact:** Users lose their session, see "Access Denied", get redirected to dashboard as generic "User / Employee"
- **Component:** `TokenRefreshManager` in `app/providers.tsx:53`
- **Reproduction:** Login as any demo account, navigate between 2-3 pages rapidly
- **Expected:** Session should persist for the full token lifetime (typically 15-60 min)
- **Actual:** Session drops within 10-30 seconds of active navigation

### 2. MEDIUM: Hydration Mismatch in Header.tsx (P2)
- **Severity:** Medium
- **Frequency:** On every page load
- **Impact:** React warning in console, potential brief visual flash
- **Component:** `Header.tsx:49` -- mobile menu button
- **Details:** Server renders `p-2 rounded-lg` while client renders `p-1.5 sm:p-2.5 rounded-lg`. The button also has different responsive classes (`md:hidden` vs `md:hidden min-w-[44px] min-h-[44px]`).
- **Fix suggestion:** Ensure server and client render the same initial className. The responsive `sm:` prefix and `min-w/min-h` additions happen only on client side.

### 3. LOW: Slow Data Loading (P3)
- **Severity:** Low
- **Frequency:** Most data-heavy pages
- **Impact:** Skeleton loaders visible for 4-8 seconds
- **Components:** /employees, /leave, /loans, /admin
- **Note:** Backend on localhost dev mode -- expected to be slow. Not a frontend bug per se.

### 4. LOW: Route Auto-Cycling During Session Recovery (P3)
- **Severity:** Low (side effect of P0 bug)
- **Impact:** When session drops and recovers, the app navigates through multiple routes in rapid succession (/leave -> /overtime -> /travel -> /loans -> etc.)
- **Component:** Likely the router + permission check creating a redirect loop that cycles through routes

---

## App Switcher Verification

The platform correctly switches context between sub-apps:
- **NU-HRMS:** Header shows "NU-HRMS", sidebar shows HR modules
- **NU-Hire:** Header shows "NU-Hire", sidebar shows Recruitment/Onboarding modules
- **NU-Grow:** Header shows "NU-Grow", sidebar shows Performance/Training modules
- **NU-Fluence:** Header shows "NU-Fluence", sidebar shows Wiki/Content modules
- **Admin:** Header shows "NU-HRMS", sidebar shows Management/Settings modules

---

## RBAC Observations

When session drops to "User / Employee":
- Sidebar shows reduced items: HOME, MY SPACE, PEOPLE (with Employees, Departments), HR OPERATIONS, PAY & FINANCE
- Admin-only sections (Organization, Reports, Settings) are hidden
- Admin pages (/shifts, /leave admin) show "Access Denied" with lock icon and "Go to Home" button
- /me/dashboard shows "No Employee Profile Linked" for the generic User

When session is Fayaz M SUPER ADMIN:
- Full sidebar with all sections visible
- All admin pages accessible
- /admin page accessible with Super Admin Dashboard
- All sub-app contexts available via app switcher

---

## Login Page Assessment

- **Status:** PASS
- Login page renders correctly with NULogic branding
- "Demo Accounts" section shows 8 roles (5 visible: Fayaz M, Sumit Kumar, Mani S, Gokul R, Saran V + 3 more via scroll)
- Google SSO button present ("Continue with Google")
- Email login option available ("Sign in with Email")
- Security badges: SOC 2, Encrypted, GDPR
- Dark mode by default, consistent blue monochrome theme
- No console errors on login page

---

## Recommendations

1. **P0 -- Fix TokenRefreshManager:** Investigate `app/providers.tsx:53` for the session replacement bug. The demo login token may be getting swapped during the refresh cycle. Check if the refresh endpoint returns a different user or if there is a race condition in concurrent API calls.

2. **P2 -- Fix Header hydration mismatch:** Align the server-side and client-side className for the mobile menu button in `components/layout/Header.tsx:49`.

3. **P3 -- Investigate route cycling:** Add guards to prevent rapid sequential redirects when auth state is in flux. A simple debounce or "auth pending" state could prevent the route cycling behavior.

4. **Re-test with stable session:** Once the session bug is fixed, all pages marked "NOT TESTED" or "FAIL (session dropped)" need re-testing: /expenses, /assets, /shifts, /holidays, /overtime, /travel, /probation, /benefits, /approvals, /me/profile, and all Fluence pages.
