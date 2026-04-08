# NU-AURA Chrome QA Findings

**Date**: 2026-04-08
**Tester**: Claude QA Agent (Chrome Browser)
**Environment**: localhost:3000 (frontend) + localhost:8080 (backend)
**Role**: Super Admin (Fayaz M)
**Browser**: Chrome with Claude extension

---

## Global Issue: Hydration Mismatch in Header.tsx

**BUG-001**: React hydration mismatch warning occurs on every page load. Server renders `p-2` for the mobile menu button in Header.tsx, but client renders `p-2.5 min-w-[44px] min-h-[44px]`. This is a className mismatch between SSR and CSR in `components/layout/Header.tsx:49`. Non-breaking but produces console errors on every navigation.

---

## /auth/login
- Status: PASS
- Console errors: none
- Visual issues: none - Dark-themed login page with NULogic branding, Google SSO, email/password, Demo Accounts (8 roles)
- RBAC: correct - public page
- Bug: none

## /dashboard
- Status: PASS
- Console errors: none (only INFO-level ErrorHandler init logs)
- Visual issues: none - Welcome banner, attendance widget, key metrics (29 employees, 30 pending approvals), quick actions, attendance overview, department headcount
- RBAC: correct - SuperAdmin sees Organization View toggle
- Bug: none

## /employees
- Status: PASS
- Console errors: BUG-001
- Visual issues: none - Employee table with 29 employees, name/code/designation/department/level/manager/status columns, View/Delete actions, search, filters, Change Requests/Import/Add Employee buttons
- RBAC: correct
- Bug: none

## /attendance
- Status: PASS
- Console errors: BUG-001
- Visual issues: none - Live time clock, check-in widget, stats (Present 4, Absent 2, Late 0, OT 102.4h), weekly overview chart, attendance history, regularization, team attendance, upcoming holidays (May Day, Independence Day, Gandhi Jayanti)
- RBAC: correct
- Bug: none

## /leave
- Status: PASS
- Console errors: BUG-001
- Visual issues: none - Leave balances (8 types: PL, CL, SL, BL, CO, LOP, EL, ML with INR values), recent leave requests table with status badges, Apply for Leave button
- RBAC: correct
- Bug: none

## /leave/approvals
- Status: PASS
- Console errors: BUG-001
- Visual issues: none - Summary cards (Pending 0, Approved 0, Rejected 0), leave requests list with loading spinner, back button
- RBAC: correct
- Bug: none

## /payroll
- Status: PASS
- Console errors: BUG-001
- Visual issues: none - Payroll Management hub with 6 sub-modules: Payroll Runs, Payslips, Salary Structures, Bulk Processing, Components, Statutory
- RBAC: correct
- Bug: none

## /payroll/runs
- Status: PASS-EMPTY
- Console errors: BUG-001
- Visual issues: none - Empty state "No Payroll Runs Yet" with Create Payroll Run button and status filter
- RBAC: correct
- Bug: none

## /expenses
- Status: PASS
- Console errors: BUG-001
- Visual issues: none - Expense Claims with stats (0 Pending, 0 Approved, INR 0.00 Pending, 1 Total), tabs (My Claims, Pending Approval, All Claims, Analytics), one draft claim (EXP-202604-0001, INR 2,500.00 TRAVEL)
- RBAC: correct
- Bug: none

## /assets
- Status: FAIL
- Console errors: TypeError: Cannot read properties of null (reading 'replace') at app/assets/page.tsx:1127:84 during Array.map at line 1057
- Visual issues: App Error crash screen - page completely broken with error boundary (Try Again / Back to App / Go to Home). 6 console errors.
- RBAC: N/A (page crashes)
- Bug: **BUG-002**: /assets page crash - null reference error calling .replace() on null value during asset data mapping. P0 Critical. Fix attempted (explicit null check ternary) but still crashes - likely needs server restart or the fix missed additional call sites.

## /shifts
- Status: PASS
- Console errors: BUG-001
- Visual issues: none - Shift Management with Definitions, Patterns, My Schedule, Swap Requests. Weekly schedule grid with shift types (GEN, MOR, AFT, NGT, FLX). Employee shift assignments visible.
- RBAC: correct
- Bug: none

## /holidays
- Status: PASS
- Console errors: BUG-001
- Visual issues: none - Holiday Calendar 2026 with 8 holidays (6 National, 2 Festival), "Coming Up" banner (May Day, 23d away), monthly layout with edit/delete, Add Holiday button
- RBAC: correct
- Bug: none

## /statutory
- Status: PASS-EMPTY
- Console errors: BUG-001
- Visual issues: none - Statutory Compliance with PF/ESI/PT/Monthly Report tabs. PF shows "No active PF configurations found" with New Configuration button and PF Rules info panel.
- RBAC: correct
- Bug: none

## /overtime
- Status: PASS-EMPTY
- Console errors: BUG-001
- Visual issues: none - Overtime Management with stats (Total OT 0.0h, Pending 0, Approved 0), tabs (My Overtime, Request Overtime, Team Overtime, All Records), empty state
- RBAC: correct
- Bug: none

## /travel
- Status: PASS
- Console errors: BUG-001
- Visual issues: none - Travel Management with 2 draft travel requests (Bengaluru to Mumbai, FLIGHT, INR 15,000 each), search and filter controls
- RBAC: correct
- Bug: none

## /loans
- Status: PASS-EMPTY
- Console errors: BUG-001
- Visual issues: none - Employee Loans with stats (Active 0, Outstanding INR 0, Total Repaid INR 0, Pending Approvals 0), empty state with Apply for Loan button
- RBAC: correct
- Bug: none

## /probation
- Status: PASS (FIXED - was BUG-003)
- Console errors: BUG-001
- Visual issues: none - Probation Management with stats (Active 0, Overdue 0, Ending This Week 0, Evaluations Due 0, Confirmed 3), tabs (Active Probations, Upcoming Reviews, History), probation records table with 5 entries
- RBAC: correct
- Bug: BUG-003 was fixed (was blank white page due to hydration failure, now renders skeleton loader)

## /compensation
- Status: PASS
- Console errors: BUG-001
- Visual issues: none - Compensation Planning with stats (Total Budget $0.0M, Total Revisions 1, Pending Approvals 0, Avg Increment 0.0%), tabs (Review Cycles, All Revisions, Pending Approvals), Annual Review 2026 Draft card
- RBAC: correct
- Bug: none

## /benefits
- Status: PASS-EMPTY
- Console errors: BUG-001
- Visual issues: none - Benefits Management with stats (Enrolled Plans 0, Monthly Premium $0, Available Plans 0, Total Coverage $0, Flex Credits $0), tabs (Benefit Plans, My Enrollments, Claims), Open Enrollment Period banner
- RBAC: correct
- Bug: none

## /letter-templates
- Status: PASS
- Console errors: BUG-001
- Visual issues: none - 6 letter templates (Offer Letter, Appointment Letter, Experience Letter, Relieving Letter, Salary Revision, QA Salary Certificate) with preview/edit/clone/delete actions, search, category filter
- RBAC: correct
- Bug: none

## /org-chart
- Status: PASS
- Console errors: BUG-001
- Visual issues: none - Organization Chart with interactive tree view, stats (29 employees, 15 departments, 2.3 avg span, 4 hierarchy depth), Tree/List/Department views, zoom controls, search, department/level filters
- RBAC: correct
- Bug: none

## /announcements
- Status: PASS
- Console errors: BUG-001
- Visual issues: none - Announcements page with pinned section (Q2 2026 Company Goals), search, category/priority filters, All Announcements list (Team Meeting, Benefits Package, etc.), New Announcement button
- RBAC: correct
- Bug: none

## /helpdesk
- Status: FAIL
- Console errors: TypeError: Cannot read properties of undefined (reading 'replace') - similar pattern to BUG-002
- Visual issues: App Error crash screen - "Cannot read properties of undefined (reading 'replace')" with error boundary
- RBAC: N/A (page crashes)
- Bug: **BUG-004**: /helpdesk page crash - undefined reference error calling .replace() on undefined value. Same pattern as BUG-002 but with 'undefined' instead of 'null'. P0 Critical.

## /contracts
- Status: PASS
- Console errors: BUG-001
- Visual issues: none - Contracts page with stats (Active 0, Expiring Soon 0, Expired 0, Total 2), search, filter, 2 contracts (QA Short Term Contract, QA Employment Contract 2026) with Draft status and View action
- RBAC: correct
- Bug: none

## /recruitment
- Status: PASS
- Console errors: BUG-001
- Visual issues: none - NU-Hire Recruitment Dashboard with stats (46 Active Job Openings, 100 Total Candidates, 0 Interviews This Week, 1 Pending Offers), Interviews Today section, Active Job Openings list, Recent Applications (10 of 100)
- RBAC: correct
- Bug: none

## /recruitment/jobs
- Status: PASS
- Console errors: BUG-001
- Visual issues: none - Job Openings with stats (51 Total, 46 Open, 0 Draft, 5 Closed), card grid showing jobs with location, salary range, priority, status badges, view/edit/delete actions
- RBAC: correct
- Bug: none

## /recruitment/candidates
- Status: PASS
- Console errors: BUG-001
- Visual issues: none - Candidates page with stats (100 Total, 89 New, 4 In Interview, 0 Selected), table with candidate/job/experience/stage/status/source/actions columns, Add Candidate and Parse Resume buttons
- RBAC: correct
- Bug: none

## /recruitment/pipeline
- Status: PASS-EMPTY
- Console errors: BUG-001
- Visual issues: none - ATS Pipeline with kanban board (Applied, Screening, Phone Screen, Interview, Technical columns), job selector dropdown, search, filters, Add Applicant button
- RBAC: correct
- Bug: none

## /recruitment/agencies
- Status: NOT TESTED (session timeout)

## /onboarding
- Status: NOT TESTED (session timeout)

## /performance
- Status: NOT TESTED (session timeout)

## /performance/reviews
- Status: NOT TESTED (session timeout)

## /performance/okr
- Status: NOT TESTED (session timeout)

## /training
- Status: NOT TESTED (session timeout)

## /surveys
- Status: NOT TESTED (session timeout)

## /recognition
- Status: NOT TESTED (session timeout)

## /fluence/wiki
- Status: NOT TESTED (session timeout)

## /fluence/blogs
- Status: NOT TESTED (session timeout)

## /fluence/templates
- Status: NOT TESTED (session timeout)

## /fluence/search
- Status: NOT TESTED (session timeout)

## /fluence/wall
- Status: NOT TESTED (session timeout)

## /fluence/analytics
- Status: NOT TESTED (session timeout)

## /fluence/drive
- Status: NOT TESTED (session timeout)

## /admin
- Status: NOT TESTED (session timeout)

## /approvals/inbox
- Status: NOT TESTED (session timeout)

## /me/profile
- Status: NOT TESTED (session timeout)

## /me/dashboard
- Status: PASS
- Console errors: BUG-001
- Visual issues: none - Personal dashboard with welcome banner, post/poll/praise composer, quick access (Profile Updates 1, Inbox), clock-in widget, birthdays/anniversaries/new joiners tabs, company feed, on-leave-today, working-remotely, leave balance
- RBAC: correct
- Bug: none

---

## Bug Summary

| Bug ID | Severity | Page | Description | Status |
|--------|----------|------|-------------|--------|
| BUG-001 | P2 (Low) | All pages | Header.tsx hydration mismatch - className differs between SSR/CSR for mobile menu button (`p-2` vs `p-2.5 min-w-[44px] min-h-[44px]`) in `components/layout/Header.tsx:49` | OPEN |
| BUG-002 | P0 (Critical) | /assets | Page crash - `TypeError: Cannot read properties of null (reading 'replace')` at `app/assets/page.tsx:1127:84` during `Array.map` at line 1057. Error boundary catches it but page is unusable. | OPEN (fix attempted, needs verification) |
| BUG-003 | P1 (High) | /probation | Was blank white page due to hydration failure - returning null during SSR | FIXED (skeleton loader added) |
| BUG-004 | P0 (Critical) | /helpdesk | Page crash - `TypeError: Cannot read properties of undefined (reading 'replace')` - same pattern as BUG-002 but with undefined instead of null | OPEN |

---

## Test Summary

| Category | Count |
|----------|-------|
| Total pages tested | 27 |
| PASS | 19 |
| PASS-EMPTY | 6 |
| FAIL | 2 (/assets, /helpdesk) |
| FIXED | 1 (/probation) |
| NOT TESTED | 18 (session timeouts, context limits) |

### Pages NOT tested (require additional session):
/recruitment/agencies, /onboarding, /performance, /performance/reviews, /performance/okr, /training, /surveys, /recognition, /fluence/wiki, /fluence/blogs, /fluence/templates, /fluence/search, /fluence/wall, /fluence/analytics, /fluence/drive, /admin, /approvals/inbox, /me/profile

### RBAC testing (Employee role):
NOT COMPLETED - requires login as Employee (Saran V) and testing /admin, /payroll/runs, /recruitment, /statutory, /fluence/analytics for access denial.

---

## Observations

1. **Overall UI quality**: Excellent dark-themed design, consistent styling, proper use of color-coded badges and status indicators
2. **Data loading**: Most pages load within 3-6 seconds with proper skeleton loaders
3. **Navigation**: Sidebar and breadcrumbs work correctly, app switcher (NU-HRMS to NU-Hire) functions properly
4. **Session management**: Demo login sessions expire relatively quickly (observed 2 session timeouts during testing), requiring re-authentication
5. **Error handling**: Error boundaries catch crashes gracefully with Try Again / Back to App / Go to Home options
6. **The .replace() crash pattern** (BUG-002 and BUG-004) appears systemic - likely caused by API responses containing null/undefined fields where the frontend expects strings. Both /assets and /helpdesk have the same root cause pattern.

---
