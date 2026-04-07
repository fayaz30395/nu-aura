# NU-AURA Chrome QA Findings — 2026-04-07

## Summary
| Batch | Pages | Pass | Pass-Empty | Fail | Bug |
|-------|-------|------|------------|------|-----|
| 1 — My Space + HRMS Core | 7 | 3 | 1 | 1 | 2 |

## Batch 1 — My Space + HRMS Core

### /me/dashboard
- **Status:** PASS
- **Page title/heading:** "Good evening, Fayaz" — Chief Executive Officer, Administration
- **Content loaded:** yes — Quick Access, Clock In, Holidays, On Leave Today, Working Remotely, Leave Balance, Company Feed all visible
- **Console errors:** none
- **Issues:** none

### /employees
- **Status:** PASS-EMPTY
- **Page title/heading:** "Employee Management — Manage your organization's employees"
- **Content loaded:** partial — page header, search, status filters (Active/On Leave/Terminated) load but no employee rows visible
- **Console errors:** none (only INFO-level ErrorHandler init messages)
- **Issues:** No employee data displayed; may be expected if no employees exist in dev DB, but Super Admin should see at least the logged-in user

### /attendance
- **Status:** PASS
- **Page title/heading:** "Attendance — Good Evening, Fayaz · Tuesday, April 7, 2026"
- **Content loaded:** yes — Live Time, Check In, Weekly Overview chart, Attendance History, Regularization, Team Attendance, Upcoming Holidays, weekly stats
- **Console errors:** React hydration mismatch in Header.tsx (className prop mismatch between server/client for mobile menu button — p-1.5 vs p-2.5, missing min-w-[44px] min-h-[44px])
- **Issues:** Hydration warning in Header.tsx (non-blocking but should be fixed)

### /leave
- **Status:** BUG
- **Page title/heading:** "NU-AURA — Loading leave data..."
- **Content loaded:** no — stuck on branded loading spinner indefinitely (tested twice, waited 8+ seconds total)
- **Console errors:** React hydration mismatch in Header.tsx (same as /attendance)
- **Issues:** **CRITICAL** — Leave page never finishes loading. Likely backend API timeout or missing endpoint response. The loading animation CSS is rendered as visible text (CSS keyframe definitions leaked into page text).

### /payroll
- **Status:** BUG
- **Page title/heading:** N/A — redirected to /attendance
- **Content loaded:** no — page redirects away
- **Console errors:** React hydration mismatch (same Header.tsx issue)
- **Issues:** **HIGH** — Navigating to /payroll silently redirects to /attendance instead of showing the payroll page. On first attempt before re-login, it redirected to /auth/login then /me/dashboard with "No Employee Profile Linked" message.

### /expenses
- **Status:** PASS
- **Page title/heading:** "Expense Claims — Submit and manage your expense claims"
- **Content loaded:** yes — New Claim, Pending, Approved, Pending Amount, Total Claims stats; tabs for My Claims, Pending Approval, All Claims, Analytics
- **Console errors:** none
- **Issues:** none (all zeroes for data is expected in dev)

### /assets
- **Status:** BUG
- **Page title/heading:** "Access Denied — You don't have permission to access this page"
- **Content loaded:** no — Access Denied page shown; URL redirected to /leave
- **Console errors:** none
- **Issues:** **HIGH** — Super Admin (role level 100) gets "Access Denied" on /assets page. Additionally, the redirect target is /leave (which itself is broken). Permission check is incorrectly blocking Super Admin.

---

## Global Issues (Batch 1)

### React Hydration Mismatch in Header.tsx
- **Severity:** LOW
- **Component:** `components/layout/Header.tsx:49`
- **Description:** Server renders mobile menu button with `p-1.5 sm:p-2.5` but client renders with `p-2.5 min-w-[44px] min-h-[44px]`. This causes a React hydration warning on every page load. The min-w/min-h values appear to be mobile touch-target sizing that should not be applied per the desktop-first design system rules.
