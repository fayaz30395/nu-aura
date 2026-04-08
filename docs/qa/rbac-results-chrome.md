# RBAC Visual Tests (Chrome)

**Date**: 2026-04-08
**Browser**: Chrome (via Claude-in-Chrome MCP)
**Base URL**: http://localhost:3000

---

## Role: EMPLOYEE (saran@nulogic.io / Saran V)

### Sidebar Items Visible
- **Home**: Home, Dashboard
- **My Space**: My Dashboard, My Profile, My Payslips, My Attendance, My Leaves, My Documents
- **People**: Departments, Approvals
- **HR Operations**: Attendance, Shift Management, Leave Management, Contracts
- **Pay & Finance**: Expenses
- **Projects & Work**: Calendar
- **Admin**: Section header visible (no sub-items expanded)
- **Workflows**: Section header visible

### Page Access Tests

| Page | URL | Result | Expected | RBAC |
|------|-----|--------|----------|------|
| Dashboard | /dashboard | Loaded (empty main area, sidebar + header only) | MY SPACE only | **REVIEW** - sidebar shows HR Operations, Admin sections |
| Admin | /admin | Redirected to /me/dashboard | Deny | **CORRECT** |
| Payroll Runs | /payroll/runs | Redirected to /me/dashboard | Deny | **CORRECT** |
| My Profile | /me/profile | Loaded with profile data (Saran V, saran@nulogic.io, EMP-0003) | Pass | **CORRECT** |
| Fluence Wiki | /fluence/wiki | Loaded wiki pages with "New Page" button, Spaces view | Pass (read access) | **CORRECT** |

### RBAC Observations
- **URL-level access control**: Working correctly. /admin and /payroll/runs both redirect to /me/dashboard.
- **Sidebar visibility concern**: Employee can see section headers for "Admin", "HR Operations" (Attendance, Shift Mgmt, Leave Mgmt, Contracts), and "Pay & Finance" (Expenses). While these sections may be read-only or filtered at the API level, showing them in the sidebar could be confusing for employees. Consider hiding sections the user has no permission to access.
- **Fluence Wiki**: Employee has full access including "New Page" button — verify if employees should have create permission or read-only.

---

## Role: TEAM LEAD (mani@nulogic.io / Mani S)

### Sidebar Items Visible
- **Home**: Home, Dashboard
- **My Space**: My Dashboard, My Profile, My Payslips, My Attendance, My Leaves, My Documents
- **People**: Departments, Approvals
- **HR Operations**: Attendance, Shift Management, Leave Management (no Contracts — differs from Employee)
- **Pay & Finance**: Expenses
- **Projects & Work**: Calendar
- **Reports & Insights**: Reports (new section not visible to Employee)
- **Admin**: Section header visible (no sub-items expanded)
- **Workflows**: Section header visible

### Page Access Tests

| Page | URL | Result | Expected | RBAC |
|------|-----|--------|----------|------|
| Dashboard | /dashboard | Loaded (empty main area) | Should show team data | **REVIEW** - main content empty |
| Leave Approvals | /leave/approvals | Loaded with approval stats (Pending: 0, Approved: 0, Rejected: 0) | Pass (team approvals) | **CORRECT** |
| Admin | /admin | Redirected to /me/dashboard | Deny | **CORRECT** |
| Payroll Runs | /payroll/runs | Redirected to /me/dashboard | Deny | **CORRECT** |

### RBAC Observations
- **URL-level access control**: Working correctly. /admin and /payroll/runs redirect to /me/dashboard.
- **Leave Approvals**: Accessible as expected for Team Lead — shows approval dashboard with stats.
- **Reports section**: Team Lead gets "Reports & Insights" section that Employee does not see — correct escalation.
- **Contracts**: Not visible to Team Lead (was visible to Employee) — inconsistency worth reviewing.
- **Admin section header**: Still visible in sidebar for Team Lead, same as Employee.
- **Dashboard empty**: The /dashboard page loads but shows no content in the main area — may need team-level widgets.

---

## Role: HR MANAGER (jagadeesh@nulogic.io / Jagadeesh N)

### Sidebar Items Visible
- **Home**: Home, Dashboard
- **My Space**: My Dashboard, My Profile, My Payslips, My Attendance, My Leaves, My Documents
- **People**: Employees, Departments, Team Directory, Approvals (3 pending)
- **HR Operations**: Attendance, Shift Management, Leave Management, Overtime, Probation, Assets, Contracts
- **Pay & Finance**: Payroll, Benefits, Expenses, Statutory
- **Projects & Work**: Projects, Calendar
- **Reports & Insights**: Reports
- **Admin**: Section header visible
- **Workflows**: Section header visible

### Page Access Tests

| Page | URL | Result | Expected | RBAC |
|------|-----|--------|----------|------|
| My Dashboard | /me/dashboard | Full dashboard with greeting, clock-in, leave balance, company feed | Pass | **CORRECT** |
| Employees | /employees | Full Employee Management page with 30 employees listed, search, filters | Pass (full access) | **CORRECT** |
| Recruitment | /recruitment | Loaded NU-Hire sub-app with Jobs, Candidates, Onboarding nav | Pass | **CORRECT** |
| Admin | /admin | URL stayed at /admin, page rendered completely blank (no content, no redirect) | Deny | **PARTIAL** - content blocked but no redirect or "Access Denied" message |

### RBAC Observations
- **Sidebar escalation**: HR Manager correctly sees significantly more items than Employee/Team Lead: Employees, Team Directory, Overtime, Probation, Assets, Payroll, Benefits, Statutory, Projects.
- **Approvals badge**: Shows "3" pending approvals in sidebar — correct for HR Manager.
- **Employee list access**: Full access to all 30 employees with View action — correct for HR Manager.
- **Recruitment access**: Full access to NU-Hire sub-app — correct for HR Manager.
- **Admin page behavior**: The /admin URL does NOT redirect — it stays at /admin with a completely blank page. This is a UX issue: users see a blank screen instead of a redirect or "Access Denied" message. Employee and Team Lead roles get properly redirected to /me/dashboard, but HR Manager does not.
- **Role display inconsistency**: During one /admin access attempt, the role briefly displayed as "SKIP LEVEL MANAGER" instead of "HR MANAGER" in the header. This may be a rendering artifact from the admin layout.

---

## Summary of Findings

### RBAC URL-Level Access Control

| Route | Employee (40) | Team Lead (50) | HR Manager (80) | Expected |
|-------|:---:|:---:|:---:|----------|
| /admin | Redirect | Redirect | Blank page | Deny all < Super Admin |
| /payroll/runs | Redirect | Redirect | Not tested (session expired) | Deny all < HR Admin |
| /me/profile | Pass | Not tested | Not tested | Pass for all |
| /employees | Not tested | Not tested | Pass | Pass for HR+ |
| /recruitment | Not tested | Not tested | Pass | Pass for HR+ |
| /leave/approvals | Not tested | Pass | Not tested | Pass for TL+ |
| /fluence/wiki | Pass | Not tested | Not tested | Pass for all |

### Issues Found

**ISSUE-001: Sidebar shows sections for unauthorized roles (LOW)**
- Employee and Team Lead see "Admin", "HR Operations", and "Pay & Finance" section headers in the sidebar even though they cannot access the underlying pages. These should be hidden when the user lacks relevant permissions.

**ISSUE-002: /admin renders blank page for HR Manager instead of redirecting (MEDIUM)**
- Employee and Team Lead are properly redirected to /me/dashboard when accessing /admin. HR Manager stays on /admin with a completely blank page — no sidebar, no content, no error message. Should either redirect or show "Access Denied".

**ISSUE-003: Contracts visibility inconsistency (LOW)**
- Employee sees "Contracts" in HR Operations sidebar, but Team Lead does not. This seems backwards — a higher role should have at least the same visibility as a lower role.

**ISSUE-004: /dashboard empty main content for Employee and Team Lead (LOW)**
- The /dashboard page loads with sidebar and header but no main content for Employee and Team Lead roles. Either redirect to /me/dashboard or show role-appropriate content.

**ISSUE-005: Fluence Wiki "New Page" button visible to Employee (LOW)**
- Employee role can see and presumably use the "New Page" button on /fluence/wiki. Verify if employees should have create-page permission or read-only access.
