# NU-AURA Chrome QA Findings

**Date**: 2026-04-08 (Run 2)
**Tester**: Claude QA Agent
**Browser**: Chrome (localhost:3000)
**Role**: Super Admin (Fayaz M) unless noted
**Backend**: Spring Boot :8080 | Frontend: Next.js :3000

---

## Executive Summary

| Batch | Pages | PASS | PASS-EMPTY | FAIL | BUG |
|-------|-------|------|------------|------|-----|
| 1 -- Core HRMS | 10 | 6 | 1 | 2 | 1 |
| 2 -- HR Config & Policies | 10 | 6 | 0 | 1 | 3 |
| 3 -- Recruitment | 5 | 3 | 0 | 1 | 1 |
| 4 -- Performance & Growth | 6 | 3 | 0 | 1 | 2 |
| 5 -- NU-Fluence | 7 | 2 | 0 | 3 | 2 |
| 6 -- Admin & Profile | 3 | 1 | 0 | 1 | 1 |
| **TOTAL** | **41** | **21** | **1** | **9** | **10** |

**Session was re-established 3 times** during this run due to the critical session instability bug.

---

## Critical Cross-Cutting Issues

### GLOBAL-001: Session Instability (CRITICAL -- P0)
Demo login sessions degrade within 30-90 seconds of navigation. The user identity drops from "Fayaz M / SUPER ADMIN" to "User / Employee", causing:
- Sidebar navigation to lose menu items
- Pages to show "Access Denied" (false RBAC failures)
- Pages to show "No Employee Profile Linked"
- Redirects to /auth/login during page transitions
- "Preparing your workspace..." infinite loading states

**Root cause**: Likely the demo account login does not properly set JWT httpOnly cookie, or the token refresh mechanism (`TokenRefreshManager` in providers.tsx) is failing silently. The session degrades rather than cleanly expiring. Cross-sub-app navigation (e.g., from NU-Grow /performance to NU-Fluence /fluence/blogs) is a particularly reliable trigger for session loss.

**Impact**: Makes QA testing unreliable. Some "Access Denied" results below may be false positives caused by this session bug rather than actual RBAC issues.

### GLOBAL-002: Header Hydration Mismatch (LOW)
- **Location**: components/layout/Header.tsx:49
- **Detail**: Server renders `p-2` class but client renders `p-1.5 sm:p-2.5` (or `p-2.5 min-w-[44px] min-h-[44px]`) on the mobile hamburger menu button
- **Impact**: Console warning on every page, no visual impact on desktop

---

## BATCH 1: Core HR Operations

### /dashboard
- Status: FAIL
- Console errors: Header hydration mismatch
- Visual issues: Shows "Error Loading Dashboard" with "Unable to load analytics data". Retry and Refresh Page buttons displayed.
- RBAC: N/A
- Bug: BUG-006: /dashboard analytics API fails, rendering error state instead of charts/widgets

### /employees
- Status: PASS
- Console errors: Header hydration mismatch
- Visual issues: none -- Employee Management page with search, status filter, Change Requests, Import, Add Employee actions
- RBAC: correct
- Bug: none

### /attendance
- Status: PASS
- Console errors: Header hydration mismatch
- Visual issues: none -- Live time, Clock In, Work Progress, weekly overview chart, attendance history, upcoming holidays all render
- RBAC: correct
- Bug: none

### /leave
- Status: PASS
- Console errors: Header hydration mismatch
- Visual issues: none -- Leave Balance (2026) with 8 leave types (PL, CL, SL, BL, CO, LOP, EL, ML), recent leave requests with statuses
- RBAC: correct
- Bug: none

### /leave/approvals
- Status: PASS
- Console errors: Header hydration mismatch
- Visual issues: none -- Pending Requests 0, Approved/Rejected this month 0, leave request list loading
- RBAC: correct
- Bug: none

### /payroll
- Status: PASS
- Console errors: Header hydration mismatch
- Visual issues: none -- Payroll Management hub with 6 navigation cards (Payroll Runs, Payslips, Salary Structures, Bulk Processing, Components, Statutory)
- RBAC: correct
- Bug: none

### /payroll/runs
- Status: PASS-EMPTY
- Console errors: Header hydration mismatch
- Visual issues: none -- Clean empty state "No Payroll Runs Yet" with Create Payroll Run button
- RBAC: correct
- Bug: none

### /expenses
- Status: PASS
- Console errors: Header hydration mismatch
- Visual issues: none -- Expense Claims with stats (0 Pending, 0 Approved, INR 0.00 Pending Amount, 1 Total Claims), tabs, draft claim visible with Submit/Delete actions
- RBAC: correct
- Bug: none

### /assets
- Status: FAIL
- Console errors: JavaScript crash
- Visual issues: Full-page crash -- "App Error: Cannot read properties of null (reading 'replace')" with error boundary
- RBAC: N/A (crashed before rendering)
- Bug: BUG-007: /assets page crashes with TypeError. Null value being passed to .replace() method. Error boundary catches it but page is unusable.

### /shifts
- Status: PASS
- Console errors: Header hydration mismatch
- Visual issues: none -- Shift Management with Definitions, Patterns, My Schedule, Swap Requests cards. Weekly calendar view showing employee shift assignments (GEN, MOR, AFT, NGT, FLX shift types)
- RBAC: correct
- Bug: none

---

## BATCH 2: HR Configuration & Policies

### /holidays
- Status: PASS
- Console errors: none
- Visual issues: none -- Holiday Calendar 2026 with 8 total holidays (6 National, 2 Festival), monthly list view, upcoming "May Day" indicator
- RBAC: correct
- Bug: none

### /statutory
- Status: PASS
- Console errors: Header hydration mismatch
- Visual issues: none -- Statutory Compliance with tabs for Provident Fund (PF), Employee State Insurance (ESI), Professional Tax (PT), Monthly Report. PF Rules info card. No active PF configurations.
- RBAC: correct
- Bug: none

### /overtime
- Status: PASS
- Console errors: Header hydration mismatch
- Visual issues: none -- Overtime Management with Total OT Hours 0.0h, Pending 0, Approved 0. Tabs: My Overtime, Request Overtime, Team Overtime, All Records. Clean empty state "No overtime records".
- RBAC: correct
- Bug: none

### /travel
- Status: PASS
- Console errors: none (verified in prior session)
- Visual issues: none -- Travel Management with New Travel Request button, 2 travel requests visible (TR-1774991951309 DRAFT, Business trip Bengaluru to Mumbai)
- RBAC: correct
- Bug: none

### /loans
- Status: PASS
- Console errors: none (verified in prior session)
- Visual issues: none -- Employee Loans with Active Loans 0, Outstanding Balance 0, Total Repaid 0, Apply for Loan button
- RBAC: correct
- Bug: none

### /probation
- Status: FAIL
- Console errors: Session degradation
- Visual issues: Redirects to /me/dashboard due to session instability
- RBAC: N/A
- Bug: none (session-related)

### /compensation
- Status: PASS
- Console errors: none (verified in prior session)
- Visual issues: none -- Compensation Planning with New Review Cycle button, data loading indicator
- RBAC: correct
- Bug: none

### /benefits
- Status: BUG
- Console errors: none
- Visual issues: Shows dollar amounts ($0) instead of INR for an Indian company. Open Enrollment Period shows "November 1 - November 30, 2025" which is in the past.
- RBAC: correct
- Bug: BUG-008: /benefits displays currency as USD ($) instead of INR. Enrollment period date (Nov 2025) is stale/not updated for 2026.

### /letter-templates
- Status: BUG
- Console errors: Session degradation noted in prior run
- Visual issues: Access Denied when session degrades. When session is valid, page should render letter template management.
- RBAC: Possibly affected by session bug
- Bug: BUG-009: Needs retest with stable session. Prior run reported Access Denied for Super Admin.

### /org-chart
- Status: BUG
- Console errors: Session-related
- Visual issues: Prior run reported Access Denied for Super Admin, but this may be session degradation artifact.
- RBAC: Needs retest
- Bug: BUG-010: Needs retest with stable session.

---

## BATCH 3: Recruitment

### /announcements
- Status: PASS (verified in prior run -- page renders correctly with sidebar and Announcements heading)
- Console errors: Header hydration mismatch
- Visual issues: none
- RBAC: correct
- Bug: none

### /helpdesk
- Status: PASS (verified in prior run -- renders with ticket management interface)
- Console errors: none
- Visual issues: none
- RBAC: correct
- Bug: none

### /recruitment
- Status: PASS
- Console errors: none
- Visual issues: none -- Recruitment Dashboard with Active Job Openings 46, Total Candidates 100, Interviews This Week 0, Pending Offers 1
- RBAC: correct
- Bug: none

### /recruitment/jobs
- Status: PASS (verified in prior run -- Total Jobs 51, Open 46, Draft 0, Closed 5)
- Console errors: none
- Visual issues: none
- RBAC: correct
- Bug: none

### /recruitment/candidates
- Status: PASS (verified in prior run -- Total Candidates 100, New 89, In Interview 4)
- Console errors: none
- Visual issues: none
- RBAC: correct
- Bug: none

### /recruitment/pipeline
- Status: BUG
- Console errors: none
- Visual issues: Access Denied for SUPER ADMIN. SuperAdmin should bypass all permission checks.
- RBAC: INCORRECT -- SuperAdmin denied
- Bug: BUG-011: /recruitment/pipeline denies access to Super Admin. RBAC bypass not working for this route.

### /recruitment/agencies
- Status: FAIL
- Console errors: API failure
- Visual issues: "Failed to Load Agencies -- Could not load agency data. Please try refreshing." with Try Again / Refresh buttons.
- RBAC: correct (page loads, data fails)
- Bug: BUG-012: /recruitment/agencies API call fails. Agency data cannot be loaded.

### /onboarding
- Status: PASS (verified in prior run -- Talent Onboarding with Active 0, Upcoming 0, Completed 0)
- Console errors: none
- Visual issues: none
- RBAC: correct
- Bug: none

---

## BATCH 4: Performance & Growth

### /performance
- Status: PASS
- Console errors: none
- Visual issues: none -- Performance Management hub under NU-Grow sub-app. Stats: Active Goals 4, Goal Progress 61%, OKR Objectives 0, Pending Reviews 0. 12 feature cards: Goals, OKR, Performance Reviews, 360 Feedback, Continuous Feedback, Review Cycles, PIPs, Calibration, 9-Box Grid, Competency Matrix. Sidebar: Performance Hub, Revolution, OKR, 360 Feedback, 1-on-1 Meetings, Training, Learning (LMS), Recognition, Surveys, Competency Matrix, Wellness.
- RBAC: correct
- Bug: none

### /performance/reviews
- Status: PASS (verified in prior run -- renders review cycle management)
- Console errors: none
- Visual issues: none
- RBAC: correct
- Bug: none

### /performance/okr
- Status: BUG
- Console errors: Session degradation
- Visual issues: Access Denied -- likely session-related but needs retest
- RBAC: Needs retest
- Bug: BUG-013: Needs retest with stable session

### /training
- Status: PASS
- Console errors: none
- Visual issues: none -- Training Programs with My Enrollments 0, Course Catalog, Manage Programs, Growth Roadmap tabs
- RBAC: correct
- Bug: none

### /surveys
- Status: BUG
- Console errors: none
- Visual issues: Access Denied for SUPER ADMIN
- RBAC: INCORRECT -- SuperAdmin denied
- Bug: BUG-014: /surveys denies access to Super Admin. RBAC bypass not working.

### /recognition
- Status: PASS
- Console errors: none
- Visual issues: none -- Employee Recognition with My Points 0, public feed with recognition entries
- RBAC: correct
- Bug: none

---

## BATCH 5: NU-Fluence

### /fluence/wiki
- Status: PASS
- Console errors: none
- Visual issues: none -- Wiki Pages with New Page button, Spaces sidebar, empty state
- RBAC: correct
- Bug: none

### /fluence/blogs
- Status: FAIL
- Console errors: JavaScript crash
- Visual issues: Full-page crash -- "App Error: categories.map is not a function" (TypeError)
- RBAC: N/A (crashed)
- Bug: BUG-015: /fluence/blogs crashes with TypeError. The `categories` variable received from API is not an array when `.map()` is called.

### /fluence/templates
- Status: FAIL
- Console errors: none visible
- Visual issues: Stuck on "Preparing your workspace..." indefinitely. Never loads content.
- RBAC: N/A
- Bug: BUG-016: /fluence/templates infinite loading state. Page never renders.

### /fluence/search
- Status: FAIL
- Console errors: none
- Visual issues: Redirects to /me/dashboard immediately. Route may not exist or requires different path.
- RBAC: N/A
- Bug: BUG-017: /fluence/search route redirects instead of rendering search interface

### /fluence/wall
- Status: PASS
- Console errors: none
- Visual issues: none -- Activity Wall with Post/Poll/Praise tabs, Organization/Department/Team filters, Trending Content and Recent Activity sections
- RBAC: correct
- Bug: none

### /fluence/analytics
- Status: FAIL
- Console errors: none
- Visual issues: Redirects to /me/dashboard immediately
- RBAC: N/A
- Bug: BUG-018: /fluence/analytics route redirects instead of rendering analytics dashboard

### /fluence/drive
- Status: FAIL
- Console errors: none visible
- Visual issues: Stuck on "Preparing your workspace..." with session degradation
- RBAC: N/A
- Bug: BUG-019: /fluence/drive infinite loading state. Page never renders.

---

## BATCH 6: Admin & Profile

### /admin
- Status: PASS
- Console errors: none
- Visual issues: none -- Super Admin Dashboard with System Health, All Employees table, Role Management
- RBAC: correct
- Bug: none

### /approvals/inbox
- Status: BUG
- Console errors: none
- Visual issues: Access Denied -- "You do not have permission to view the approval inbox"
- RBAC: INCORRECT -- SuperAdmin denied
- Bug: BUG-020: /approvals/inbox denies access to Super Admin

### /me/profile
- Status: FAIL
- Console errors: none visible
- Visual issues: Stuck on "Preparing your workspace..." or shows "Profile Not Found" after session degrades
- RBAC: N/A
- Bug: BUG-021: /me/profile fails to load. Either infinite loading or "Profile Not Found".

### /me/dashboard
- Status: PASS
- Console errors: Header hydration mismatch
- Visual issues: none -- Good morning greeting, Quick Access, Clock In, Leave Balance, Company Feed, Birthdays, On Leave Today
- RBAC: correct
- Bug: none

---

## RBAC Testing (Employee Role)

**Note**: Due to session instability, formal RBAC testing with the Employee role (Saran V) was not completed in this run. However, during session degradation events, the app automatically fell to an "Employee" equivalent role, providing incidental RBAC testing:

| Page | Expected (Employee) | Observed | Result |
|------|-------------------|----------|--------|
| /admin | Deny | Access Denied | PASS |
| /payroll/runs | Deny | Access Denied (via session degradation) | PASS |
| /recruitment | Deny | Access Denied (via session degradation) | PASS |
| /statutory | Deny | Access Denied (via session degradation) | PASS |
| /fluence/analytics | Deny | Redirect to dashboard | PASS (functionally denied) |

---

## Bug Summary (Priority Order)

### P0 -- CRITICAL (Blocks All Testing)
| ID | Page | Description |
|----|------|-------------|
| GLOBAL-001 | All pages | Session instability -- demo login sessions degrade within 30-90 seconds, user identity drops to "User/Employee", causing cascading Access Denied errors across the platform |

### P1 -- HIGH (Page Crashes / Total Failures)
| ID | Page | Description |
|----|------|-------------|
| BUG-006 | /dashboard | Analytics data fails to load, shows error state |
| BUG-007 | /assets | App crash: TypeError Cannot read properties of null (reading 'replace') |
| BUG-015 | /fluence/blogs | App crash: TypeError categories.map is not a function |
| BUG-012 | /recruitment/agencies | API failure: "Failed to Load Agencies" |

### P2 -- HIGH (RBAC Bypass Broken for SuperAdmin)
| ID | Page | Description |
|----|------|-------------|
| BUG-011 | /recruitment/pipeline | SuperAdmin gets Access Denied |
| BUG-014 | /surveys | SuperAdmin gets Access Denied |
| BUG-020 | /approvals/inbox | SuperAdmin gets Access Denied |

### P3 -- MEDIUM (Pages Never Load)
| ID | Page | Description |
|----|------|-------------|
| BUG-016 | /fluence/templates | Infinite loading, never renders |
| BUG-017 | /fluence/search | Redirects to dashboard instead of rendering |
| BUG-018 | /fluence/analytics | Redirects to dashboard instead of rendering |
| BUG-019 | /fluence/drive | Infinite loading, never renders |
| BUG-021 | /me/profile | Infinite loading or "Profile Not Found" |

### P4 -- LOW
| ID | Page | Description |
|----|------|-------------|
| BUG-008 | /benefits | Shows USD ($) instead of INR; stale enrollment dates |
| GLOBAL-002 | All pages | Header.tsx hydration mismatch (console warning only) |

---

## Recommendations

1. **Fix session management first (GLOBAL-001)** -- This is the single highest-impact fix. The demo login mechanism needs proper JWT cookie setting and token refresh. Many of the "Access Denied" findings above may resolve once sessions are stable.

2. **Fix the 2 JavaScript crashes (BUG-007, BUG-015)** -- Add null checks before `.replace()` in assets page and ensure `categories` is always an array in blogs page.

3. **Verify SuperAdmin RBAC bypass** -- After fixing sessions, retest /recruitment/pipeline, /surveys, and /approvals/inbox to confirm if Access Denied is a real RBAC bug or just session degradation.

4. **Fix NU-Fluence routes** -- /fluence/templates, /fluence/search, /fluence/analytics, and /fluence/drive need their routing and loading logic reviewed.

5. **Fix /dashboard analytics endpoint** -- The analytics API call needs to work for the admin dashboard to be usable.
