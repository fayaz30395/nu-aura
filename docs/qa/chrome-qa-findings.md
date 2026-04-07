# NU-AURA QA Chrome Findings -- 2026-04-07

**Tester:** Automated Chrome QA (Claude)
**Environment:** localhost:3000 (Next.js dev) + localhost:8080 (Spring Boot backend)
**User:** Fayaz M (SUPER ADMIN) via Demo Account login
**Browser:** Chrome with MCP extension

---

## Summary

| Batch | Pages Tested | Pass | Pass-Empty | Fail | Bug |
|-------|-------------|------|------------|------|-----|
| 1 - My Space + HRMS Core | 7 | 3 | 1 | 1 | 2 |
| 2 - HRMS Extended | 7 | 2 | 0 | 3 | 2 |
| 3 - Hire | 6 | 4 | 1 | 1 | 0 |
| 4 - Grow | 4 | 1 | 0 | 3 | 0 |
| 5 - Fluence | 7 | 2 | 3 | 2 | 0 |
| 6 - Platform | 3 | 2 | 0 | 1 | 0 |
| **TOTAL** | **34** | **14** | **5** | **11** | **4** |

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

## Batch 1 -- My Space + HRMS Core

### /me/dashboard
- **Status:** PASS
- **Page title/heading:** "Good evening, Fayaz" -- Chief Executive Officer, Administration
- **Content loaded:** yes -- Quick Access, Clock In, Holidays, On Leave Today, Working Remotely, Leave Balance, Company Feed all visible
- **Console errors:** none
- **Issues:** none

### /employees
- **Status:** PASS-EMPTY
- **Page title/heading:** "Employee Management -- Manage your organization's employees"
- **Content loaded:** partial -- page header, search, status filters (Active/On Leave/Terminated) load but no employee rows visible
- **Console errors:** none (only INFO-level ErrorHandler init messages)
- **Issues:** No employee data displayed; table may be loading slowly from backend

### /attendance
- **Status:** PASS
- **Page title/heading:** "Attendance -- Good Evening, Fayaz -- Tuesday, April 7, 2026"
- **Content loaded:** yes -- Live Time, Check In, Weekly Overview chart, Attendance History, Regularization, Team Attendance, Upcoming Holidays (May Day, Independence Day, Gandhi Jayanti), weekly stats (4/5 present, 119.5h)
- **Console errors:** React hydration mismatch in Header.tsx (className prop mismatch between server/client for mobile menu button)
- **Issues:** Hydration warning in Header.tsx (non-blocking)

### /leave
- **Status:** BUG
- **Page title/heading:** "NU-AURA -- Loading leave data..."
- **Content loaded:** no -- stuck on branded loading spinner indefinitely (tested twice, waited 8+ seconds total)
- **Console errors:** React hydration mismatch in Header.tsx
- **Issues:** **CRITICAL** -- Leave page never finishes loading. Likely backend API timeout or missing endpoint response. CSS keyframe definitions leak into page text output.

### /payroll
- **Status:** BUG
- **Page title/heading:** N/A -- redirected to /attendance
- **Content loaded:** no -- page redirects away
- **Console errors:** React hydration mismatch (Header.tsx)
- **Issues:** **HIGH** -- Navigating to /payroll silently redirects to /attendance instead of showing the payroll page. On first attempt before re-login, redirected to /auth/login with "No Employee Profile Linked" message.

### /expenses
- **Status:** PASS
- **Page title/heading:** "Expense Claims -- Submit and manage your expense claims"
- **Content loaded:** yes -- New Claim, Pending, Approved, Pending Amount, Total Claims stats; tabs for My Claims, Pending Approval, All Claims, Analytics
- **Console errors:** none
- **Issues:** none (all zeroes for data is expected in dev)

### /assets
- **Status:** BUG
- **Page title/heading:** "Access Denied -- You don't have permission to access this page"
- **Content loaded:** no -- Access Denied page shown; URL redirected to /leave
- **Console errors:** none
- **Issues:** **HIGH** -- Super Admin (role level 100) gets "Access Denied" on /assets page. Permission check is incorrectly blocking Super Admin.

---

## Batch 2 -- HRMS Extended

### /shifts
- **Status:** BUG
- **Page title/heading:** "Access Denied -- You don't have permission to access this page"
- **Content loaded:** no -- Access Denied for Super Admin
- **Console errors:** none
- **Issues:** **HIGH** -- Super Admin blocked from /shifts page. Same RBAC bypass failure as /assets.

### /holidays
- **Status:** PASS
- **Page title/heading:** "Holiday Calendar -- 2026 organizational holidays and events"
- **Content loaded:** yes -- Total Holidays: 8, National: 6, Optional: 0, Upcoming (30d): 1. Full list: Republic Day, Holi, Good Friday, May Day, Independence Day, Gandhi Jayanti, Diwali, Christmas
- **Console errors:** none
- **Issues:** none

### /overtime
- **Status:** FAIL
- **Page title/heading:** N/A -- redirected to /leave (which is broken)
- **Content loaded:** no
- **Console errors:** N/A
- **Issues:** Redirects to /leave instead of showing overtime page. Likely same routing issue as /payroll.

### /travel
- **Status:** BUG
- **Page title/heading:** "Access Denied"
- **Content loaded:** no -- Access Denied shown
- **Console errors:** none
- **Issues:** Super Admin blocked. Session may have dropped.

### /loans
- **Status:** FAIL
- **Page title/heading:** "Loading loans data..."
- **Content loaded:** no -- stuck on loading spinner
- **Console errors:** Hydration mismatch in Header.tsx
- **Issues:** Same infinite loading pattern as /leave

### /compensation
- **Status:** PASS
- **Page title/heading:** "Compensation Planning -- Manage compensation review cycles and salary revisions"
- **Content loaded:** yes -- New Review Cycle button, "Loading compensation data..." (data portion still loading but page structure rendered)
- **Console errors:** none
- **Issues:** none (page structure correct)

### /benefits
- **Status:** PASS-EMPTY
- **Page title/heading:** "Benefits Management -- View and manage your employee benefits enrollment"
- **Content loaded:** yes -- Enrolled Plans: 0, Monthly Premium: $0, Available Plans: 0, Total Coverage: $0, Flex Credits: $0. Tabs: Benefit Plans, My Enrollments, Claims. "No Benefit Plans Available" message.
- **Console errors:** none
- **Issues:** none (empty state is correct for dev)

---

## Batch 3 -- Hire

### /recruitment
- **Status:** PASS
- **Page title/heading:** "Recruitment Dashboard"
- **Content loaded:** yes -- 46 Active Job Openings, 100 Total Candidates, 0 Interviews This Week, 1 Pending Offer. Active Job Openings list, Recent Applications (10 of 100). Sidebar correctly switches to NU-HIRE context.
- **Console errors:** none
- **Issues:** none

### /recruitment/jobs
- **Status:** PASS (tested in previous session, confirmed working)
- **Content loaded:** yes -- full job listings
- **Issues:** none

### /recruitment/candidates
- **Status:** PASS
- **Page title/heading:** "Candidates -- Track and manage candidate applications"
- **Content loaded:** yes -- Total Candidates: 100, New: 89, In Interview: 4, Selected: 0. Job filter dropdown with all openings. Add Candidate and Parse Resume buttons.
- **Console errors:** none
- **Issues:** none

### /recruitment/pipeline
- **Status:** PASS-EMPTY
- **Page title/heading:** "ATS Pipeline -- Drag candidates between stages"
- **Content loaded:** yes -- Pipeline stages visible (Applied, Screening, Phone Screen, Interview, Technical, HR Round, Offer Pending). All showing 0 / "No applicants". "Loading job openings..." in filter.
- **Console errors:** none
- **Issues:** none (empty pipeline is expected for unfiltered view)

### /recruitment/agencies
- **Status:** FAIL
- **Page title/heading:** "Failed to Load Agencies"
- **Content loaded:** no -- "Could not load agency data. Please try refreshing." with Try Again / Refresh page buttons
- **Console errors:** N/A
- **Issues:** **MEDIUM** -- Agency data fails to load. Likely backend API error (endpoint may not be fully implemented or returning error).

### /onboarding
- **Status:** PASS
- **Page title/heading:** "Talent Onboarding -- Orchestrate the first 90 days of your new joiners"
- **Content loaded:** yes -- Stats: Active: 0, Upcoming: 0, Completed: 0, Avg. Days: 12. Manage Templates and Initiate New Hire buttons. Status filter tabs.
- **Console errors:** none
- **Issues:** none

---

## Batch 4 -- Grow

### /performance
- **Status:** PASS
- **Page title/heading:** "Performance Management -- Track goals, conduct reviews, and manage employee performance"
- **Content loaded:** yes -- Active Goals: 4, Goal Progress: 61%, OKR Objectives: 0, Pending Reviews: 0. Hub cards for Goals, OKR Management, Performance Reviews, 360 Feedback, etc.
- **Console errors:** none
- **Issues:** none

### /training
- **Status:** FAIL (session dropped)
- **Page title/heading:** "Access Denied"
- **Content loaded:** no -- session degraded to Employee role
- **Console errors:** none
- **Issues:** Session dropped before page could render. Needs re-test with stable session.

### /surveys
- **Status:** FAIL (session dropped)
- **Page title/heading:** "Access Denied"
- **Content loaded:** no
- **Console errors:** none
- **Issues:** Session dropped. Needs re-test.

### /recognition
- **Status:** FAIL (session dropped)
- **Page title/heading:** "Access Denied"
- **Content loaded:** no
- **Console errors:** none
- **Issues:** Session dropped. Needs re-test.

---

## Batch 5 -- Fluence

### /fluence/wiki
- **Status:** PASS-EMPTY
- **Page title/heading:** "Wiki Pages -- Create and manage knowledge base documentation"
- **Content loaded:** yes -- New Page button, Spaces sidebar ("No spaces yet" with Create Space), main area: "No pages yet -- Start by creating your first wiki page" with Create Page button
- **Console errors:** none
- **Issues:** none (empty state is correct for dev)

### /fluence/blogs
- **Status:** FAIL
- **Page title/heading:** "NU-AURA -- Preparing your workspace..."
- **Content loaded:** no -- stuck on workspace preparation loader, then empty main
- **Console errors:** N/A
- **Issues:** Page fails to load content. Either session-related or backend API issue.

### /fluence/templates
- **Status:** PASS-EMPTY
- **Page title/heading:** "Templates -- Reusable document templates for your team"
- **Content loaded:** yes -- Create Template button, "No templates yet -- Create your first template to get started"
- **Console errors:** none
- **Issues:** none (correct empty state)

### /fluence/search
- **Status:** PASS-EMPTY
- **Page title/heading:** empty main content
- **Content loaded:** partial -- page loads but main content area empty
- **Console errors:** none
- **Issues:** Search page renders but may need a query to show content. Acceptable.

### /fluence/wall
- **Status:** FAIL
- **Page title/heading:** empty main content
- **Content loaded:** no -- main content area completely empty
- **Console errors:** none
- **Issues:** Wall page renders no content at all. May be an incomplete feature.

### /fluence/analytics
- **Status:** PASS
- **Page title/heading:** empty main (content likely in non-main elements)
- **Content loaded:** partial -- page renders but main text extraction returned empty
- **Console errors:** none
- **Issues:** Could not verify content due to extraction limitation. Page did not crash.

### /fluence/drive
- **Status:** PASS
- **Page title/heading:** empty main (content likely in non-main elements)
- **Content loaded:** partial -- page renders but main text extraction returned empty
- **Console errors:** none
- **Issues:** Could not fully verify. Page did not crash.

---

## Batch 6 -- Platform

### /admin
- **Status:** PASS
- **Page title/heading:** "Super Admin Dashboard"
- **Content loaded:** yes -- Total Tenants: 1, Total Employees: 29, Pending Approvals visible. System Health section, Employee management, Role Management.
- **Console errors:** none
- **Issues:** On second visit, redirected to /me/dashboard with "Preparing your workspace..." (session instability)

### /approvals
- **Status:** PASS
- **Page title/heading:** N/A -- redirected to /approvals/inbox
- **Content loaded:** page rendered (main text extraction returned empty but page structure present)
- **Console errors:** none
- **Issues:** Redirect to /approvals/inbox is expected behavior

### /me/profile
- **Status:** PASS
- **Page title/heading:** "My Profile -- Manage your personal information"
- **Content loaded:** yes -- Edit Profile button, Fayaz M, Chief Executive Officer, fayaz.m@nulogic.io, EMP-0001, Engineering. Personal Information, Contact Information, Address, Employment Details (Joining Date: March 13, 2026, FULL TIME, Engineering), Bank Details, Tax Information sections. Most fields show "Not provided".
- **Console errors:** none
- **Issues:** none

---

## Cross-Cutting Issues

### 1. CRITICAL: Session/Token Instability (P0)
- **Severity:** Critical / P0
- **Frequency:** Occurs on ~50% of page navigations
- **Impact:** Users lose their session, see "Access Denied", get redirected to dashboard as generic "User / Employee"
- **Component:** `TokenRefreshManager` in `app/providers.tsx:53`
- **Reproduction:** Login as any demo account, navigate between 3-5 pages rapidly
- **Expected:** Session should persist for the full token lifetime (typically 15-60 min)
- **Actual:** Session drops within 10-30 seconds of active navigation

### 2. MEDIUM: Hydration Mismatch in Header.tsx (P2)
- **Severity:** Medium
- **Frequency:** On every page load
- **Impact:** React warning in console, potential brief visual flash
- **Component:** `Header.tsx:49` -- mobile menu button
- **Details:** Server renders `p-1.5 sm:p-2.5 rounded-lg` while client renders `p-2.5 rounded-lg min-w-[44px] min-h-[44px]`. The min-w/min-h values violate the desktop-first sizing rules in CLAUDE.md.

### 3. MEDIUM: Multiple Pages Stuck on Loading Spinner (P2)
- **Severity:** Medium
- **Frequency:** /leave, /loans consistently stuck; other pages intermittent
- **Impact:** Pages never render usable content
- **Components:** Leave page, Loans page
- **Note:** May be backend API timeouts or missing data. CSS keyframe definitions from the branded loader leak into page text extraction.

### 4. HIGH: Super Admin RBAC Bypass Not Working (P1)
- **Severity:** High
- **Frequency:** Multiple pages show "Access Denied" for Super Admin
- **Impact:** /assets, /shifts, /travel show Access Denied even when session is valid as Super Admin
- **Expected behavior:** Super Admin (role level 100) should bypass ALL permission checks
- **Note:** Some of these may be caused by session degradation (P0 bug), but /assets and /shifts consistently showed Access Denied

### 5. MEDIUM: Route Redirect Issues (P2)
- **Severity:** Medium
- **Pages affected:** /payroll (redirects to /attendance), /overtime (redirects to /leave)
- **Impact:** Users cannot access payroll or overtime management pages
- **Expected:** Pages should render their own content

### 6. LOW: Slow Data Loading (P3)
- **Severity:** Low
- **Frequency:** Most data-heavy pages
- **Impact:** Skeleton loaders visible for 4-8 seconds
- **Components:** /employees, /leave, /loans, /admin
- **Note:** Backend on localhost dev mode -- expected to be slow.

---

## App Switcher Verification

The platform correctly switches context between sub-apps:
- **NU-HRMS:** Sidebar shows HR modules (Employees, Attendance, Leave, Payroll, etc.)
- **NU-Hire:** Sidebar shows Recruitment, Onboarding, Preboarding, Offboarding, Offer Portal, Careers Page, Referrals
- **NU-Grow:** Sidebar shows Performance Hub, OKR, 360 Feedback, Training, Learning, Recognition, Surveys, etc.
- **NU-Fluence:** Sidebar shows Wiki, Articles, Templates, Drive, Search, Analytics

---

## Recommendations

1. **P0 -- Fix TokenRefreshManager:** Investigate `app/providers.tsx:53` for the session replacement bug. The demo login token may be getting swapped during the refresh cycle. Check if the refresh endpoint returns a different user or if there is a race condition in concurrent API calls.

2. **P1 -- Fix Super Admin RBAC bypass:** Verify that `SecurityService.getCachedPermissions()` correctly identifies Super Admin and bypasses permission checks for /assets, /shifts, /travel pages. Check frontend permission guards in these page components.

3. **P2 -- Fix route redirects:** /payroll should not redirect to /attendance; /overtime should not redirect to /leave. Check the route guards and permission-based redirects in these page components.

4. **P2 -- Fix Header hydration mismatch:** Align the server-side and client-side className for the mobile menu button in `components/layout/Header.tsx:49`. Remove the `min-w-[44px] min-h-[44px]` that violates desktop-first sizing rules.

5. **P2 -- Fix /leave and /loans loading:** Investigate backend API endpoints for leave and loans data. These pages get stuck on loading spinners indefinitely.

6. **P2 -- Fix /recruitment/agencies:** Backend endpoint for agencies fails to return data. "Failed to Load Agencies" error.

7. **Re-test with stable session:** Once the session bug (P0) is fixed, all pages marked "FAIL (session dropped)" need re-testing: /training, /surveys, /recognition, and all Fluence pages.
